-- Platform billing: recurring monthly periods per vendor or internal profile, delinquency hides public storefront.

alter table public.vendors
  add column if not exists billing_delinquent boolean not null default false;

comment on column public.vendors.billing_delinquent is
  'When true, shop is hidden from discovery, map, and public menu (see vendor_is_publicly_visible). Cleared when overdue periods are marked paid.';

-- ---------------------------------------------------------------------------
-- Central public visibility (products, deals, locations, reviews already use this)
-- ---------------------------------------------------------------------------

create or replace function public.vendor_is_publicly_visible(p_vendor_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
set row_security = off
as $$
  select exists (
    select 1
    from public.vendors v
    where v.id = p_vendor_id
      and coalesce(v.is_live, false) = true
      and coalesce(v.license_status, '') = 'approved'
      and coalesce(v.billing_delinquent, false) = false
  );
$$;

comment on function public.vendor_is_publicly_visible(uuid) is
  'True when vendor is live, license approved, and not billing-delinquent; used by catalog RLS.';

-- ---------------------------------------------------------------------------
-- Anon / JWT direct reads on vendors
-- ---------------------------------------------------------------------------

drop policy if exists vendors_public_select on public.vendors;

create policy vendors_public_select
  on public.vendors for select
  using (
    license_status = 'approved'
    and coalesce(billing_delinquent, false) = false
    and (
      coalesce(is_live, false) = true
      or user_id is not null
    )
  );

comment on policy vendors_public_select on public.vendors is
  'Public: approved, not billing-delinquent, and (live or linked owner).';

-- ---------------------------------------------------------------------------
-- Billing accounts (one row per billed party)
-- ---------------------------------------------------------------------------

create table if not exists public.platform_billing_accounts (
  id uuid primary key default gen_random_uuid(),
  party_kind text not null check (party_kind in ('vendor', 'internal_profile')),
  vendor_id uuid references public.vendors (id) on delete cascade,
  profile_id uuid references public.profiles (id) on delete cascade,
  display_label text,
  amount_cents integer not null check (amount_cents >= 0),
  due_day_of_month smallint not null check (due_day_of_month between 1 and 28),
  invoice_document_url text,
  invoice_storage_path text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint platform_billing_accounts_party_chk check (
    (party_kind = 'vendor' and vendor_id is not null and profile_id is null)
    or (party_kind = 'internal_profile' and profile_id is not null and vendor_id is null)
  )
);

create unique index if not exists platform_billing_accounts_vendor_unique
  on public.platform_billing_accounts (vendor_id)
  where vendor_id is not null;

create unique index if not exists platform_billing_accounts_profile_unique
  on public.platform_billing_accounts (profile_id)
  where profile_id is not null;

create index if not exists platform_billing_accounts_party_kind_idx
  on public.platform_billing_accounts (party_kind);

create table if not exists public.platform_billing_periods (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.platform_billing_accounts (id) on delete cascade,
  period_year integer not null,
  period_month integer not null check (period_month between 1 and 12),
  due_date date not null,
  amount_cents integer not null check (amount_cents >= 0),
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  unique (account_id, period_year, period_month)
);

create index if not exists platform_billing_periods_account_due_idx
  on public.platform_billing_periods (account_id, due_date);

create index if not exists platform_billing_periods_unpaid_overdue_idx
  on public.platform_billing_periods (account_id)
  where paid_at is null;

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

create or replace function public.platform_billing_clamped_due_date(
  p_year integer,
  p_month integer,
  p_due_day integer
)
returns date
language sql
immutable
as $$
  select (
    date_trunc('month', make_date(p_year, p_month, 1))::date
    + (
      least(
        p_due_day,
        extract(
          day
          from (
            date_trunc('month', make_date(p_year, p_month, 1))
            + interval '1 month'
            - interval '1 day'
          )
        )::integer
      )
      - 1
    )
  )::date;
$$;

create or replace function public.platform_billing_touch_account_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists platform_billing_accounts_set_updated_at on public.platform_billing_accounts;
create trigger platform_billing_accounts_set_updated_at
  before update on public.platform_billing_accounts
  for each row
  execute function public.platform_billing_touch_account_updated_at();

-- Sync month rows from account creation month through current calendar month.
create or replace function public.platform_billing_sync_periods_for_account(p_account_id uuid)
returns void
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
declare
  acc record;
  y int;
  m int;
  end_y int;
  end_m int;
  iter int := 0;
  max_iter int := 720;
begin
  if auth.uid() is null then
    null;
  elsif public.auth_profiles_role_is_admin() then
    null;
  elsif not exists (
    select 1
    from public.platform_billing_accounts a
    where a.id = p_account_id
      and a.vendor_id is not null
      and public.vendor_staff_may_manage(a.vendor_id)
  ) then
    raise exception 'forbidden';
  end if;

  select * into acc from public.platform_billing_accounts where id = p_account_id;
  if not found then
    return;
  end if;

  end_y := extract(year from (timezone('utc', now())))::int;
  end_m := extract(month from (timezone('utc', now())))::int;
  y := extract(year from (acc.created_at at time zone 'utc'))::int;
  m := extract(month from (acc.created_at at time zone 'utc'))::int;

  while iter < max_iter loop
    iter := iter + 1;
    exit when y > end_y or (y = end_y and m > end_m);

    insert into public.platform_billing_periods (account_id, period_year, period_month, due_date, amount_cents)
    values (
      p_account_id,
      y,
      m,
      public.platform_billing_clamped_due_date(y, m, acc.due_day_of_month),
      acc.amount_cents
    )
    on conflict (account_id, period_year, period_month) do nothing;

    m := m + 1;
    if m > 12 then
      m := 1;
      y := y + 1;
    end if;
  end loop;
end;
$$;

revoke all on function public.platform_billing_sync_periods_for_account(uuid) from public;
grant execute on function public.platform_billing_sync_periods_for_account(uuid) to authenticated, service_role;

create or replace function public.platform_billing_refresh_all_vendor_delinquency()
returns void
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
declare
  today_utc date := (timezone('utc', now()))::date;
begin
  if auth.uid() is not null and not public.auth_profiles_role_is_admin() then
    raise exception 'forbidden';
  end if;

  update public.vendors v
  set billing_delinquent = exists (
    select 1
    from public.platform_billing_accounts a
    join public.platform_billing_periods p on p.account_id = a.id
    where a.vendor_id = v.id
      and a.party_kind = 'vendor'
      and p.paid_at is null
      and p.due_date < today_utc
  );
end;
$$;

revoke all on function public.platform_billing_refresh_all_vendor_delinquency() from public;
grant execute on function public.platform_billing_refresh_all_vendor_delinquency() to service_role;

-- Vendor / staff: billing notice for dashboard (due in 7d or overdue).
create or replace function public.vendor_platform_billing_notice(p_vendor_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
declare
  acc record;
  today_utc date := (timezone('utc', now()))::date;
  overdue record;
  cur record;
  suspended boolean;
begin
  if not (
    public.auth_profiles_role_is_admin()
    or public.vendor_staff_may_manage(p_vendor_id)
  ) then
    raise exception 'forbidden';
  end if;

  select coalesce(v.billing_delinquent, false)
  into suspended
  from public.vendors v
  where v.id = p_vendor_id;

  if not found then
    return jsonb_build_object('notice_kind', 'none');
  end if;

  select * into acc
  from public.platform_billing_accounts
  where vendor_id = p_vendor_id
    and party_kind = 'vendor';

  if not found then
    return jsonb_build_object(
      'notice_kind', 'none',
      'billing_suspended', suspended
    );
  end if;

  perform public.platform_billing_sync_periods_for_account(acc.id);

  select p.*
  into overdue
  from public.platform_billing_periods p
  where p.account_id = acc.id
    and p.paid_at is null
    and p.due_date < today_utc
  order by p.due_date asc
  limit 1;

  if found then
    return jsonb_build_object(
      'notice_kind', 'overdue',
      'due_date', overdue.due_date,
      'amount_cents', overdue.amount_cents,
      'period_year', overdue.period_year,
      'period_month', overdue.period_month,
      'billing_suspended', suspended,
      'invoice_document_url', acc.invoice_document_url,
      'invoice_storage_path', acc.invoice_storage_path
    );
  end if;

  select p.*
  into cur
  from public.platform_billing_periods p
  where p.account_id = acc.id
    and p.period_year = extract(year from today_utc)::int
    and p.period_month = extract(month from today_utc)::int;

  if not found or cur.paid_at is not null then
    return jsonb_build_object(
      'notice_kind', 'none',
      'billing_suspended', suspended,
      'invoice_document_url', acc.invoice_document_url,
      'invoice_storage_path', acc.invoice_storage_path
    );
  end if;

  if cur.due_date <= today_utc + 7 then
    return jsonb_build_object(
      'notice_kind', 'due_soon',
      'due_date', cur.due_date,
      'amount_cents', cur.amount_cents,
      'period_year', cur.period_year,
      'period_month', cur.period_month,
      'days_until', cur.due_date - today_utc,
      'billing_suspended', suspended,
      'invoice_document_url', acc.invoice_document_url,
      'invoice_storage_path', acc.invoice_storage_path
    );
  end if;

  return jsonb_build_object(
    'notice_kind', 'none',
    'billing_suspended', suspended,
    'invoice_document_url', acc.invoice_document_url,
    'invoice_storage_path', acc.invoice_storage_path
  );
end;
$$;

revoke all on function public.vendor_platform_billing_notice(uuid) from public;
grant execute on function public.vendor_platform_billing_notice(uuid) to authenticated, service_role;

-- Admin dashboard badge counts (JWT must be admin).
create or replace function public.admin_platform_billing_dashboard_counts()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
set row_security = off
as $$
declare
  today_utc date := (timezone('utc', now()))::date;
  overdue int;
  due_soon int;
begin
  if not public.auth_profiles_role_is_admin() then
    raise exception 'forbidden';
  end if;

  select count(*)::int into overdue
  from public.platform_billing_periods p
  join public.platform_billing_accounts a on a.id = p.account_id
  where p.paid_at is null
    and p.due_date < today_utc;

  select count(*)::int into due_soon
  from public.platform_billing_periods p
  where p.paid_at is null
    and p.due_date >= today_utc
    and p.due_date <= today_utc + 7;

  return jsonb_build_object('overdue', overdue, 'due_soon', due_soon);
end;
$$;

revoke all on function public.admin_platform_billing_dashboard_counts() from public;
grant execute on function public.admin_platform_billing_dashboard_counts() to authenticated;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.platform_billing_accounts enable row level security;
alter table public.platform_billing_periods enable row level security;

drop policy if exists platform_billing_accounts_admin_all on public.platform_billing_accounts;
create policy platform_billing_accounts_admin_all
  on public.platform_billing_accounts for all
  using (public.auth_profiles_role_is_admin())
  with check (public.auth_profiles_role_is_admin());

drop policy if exists platform_billing_periods_admin_all on public.platform_billing_periods;
create policy platform_billing_periods_admin_all
  on public.platform_billing_periods for all
  using (public.auth_profiles_role_is_admin())
  with check (public.auth_profiles_role_is_admin());

-- ---------------------------------------------------------------------------
-- Private invoice files (path pattern: {account_id}/{filename})
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'platform-billing-invoices',
  'platform-billing-invoices',
  false,
  10485760,
  array[
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/webp'
  ]::text[]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists platform_billing_invoices_admin_select on storage.objects;
create policy platform_billing_invoices_admin_select
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'platform-billing-invoices'
    and public.auth_profiles_role_is_admin()
  );

drop policy if exists platform_billing_invoices_admin_insert on storage.objects;
create policy platform_billing_invoices_admin_insert
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'platform-billing-invoices'
    and public.auth_profiles_role_is_admin()
  );

drop policy if exists platform_billing_invoices_admin_update on storage.objects;
create policy platform_billing_invoices_admin_update
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'platform-billing-invoices'
    and public.auth_profiles_role_is_admin()
  )
  with check (
    bucket_id = 'platform-billing-invoices'
    and public.auth_profiles_role_is_admin()
  );

drop policy if exists platform_billing_invoices_admin_delete on storage.objects;
create policy platform_billing_invoices_admin_delete
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'platform-billing-invoices'
    and public.auth_profiles_role_is_admin()
  );

drop policy if exists platform_billing_invoices_vendor_select_own on storage.objects;
create policy platform_billing_invoices_vendor_select_own
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'platform-billing-invoices'
    and exists (
      select 1
      from public.platform_billing_accounts a
      where a.vendor_id is not null
        and a.id::text = (storage.foldername(name))[1]
        and public.vendor_staff_may_manage(a.vendor_id)
    )
  );
