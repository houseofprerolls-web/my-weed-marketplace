-- Vendor public replies on reviews, review abuse reports, account upgrade requests,
-- optional creative deal metadata (jsonb), and security-definer RPCs so vendors cannot edit star ratings.

-- ---------------------------------------------------------------------------
-- reviews: owner reply (public on listing when set)
-- ---------------------------------------------------------------------------
do $r$
begin
  if to_regclass('public.reviews') is not null then
    alter table public.reviews add column if not exists vendor_reply text;
    alter table public.reviews add column if not exists vendor_reply_at timestamptz;
  end if;
end
$r$;

-- ---------------------------------------------------------------------------
-- deals: creative options (badges, copy, accent, etc.) — UI-controlled jsonb
-- ---------------------------------------------------------------------------
do $d$
begin
  if to_regclass('public.deals') is not null then
    alter table public.deals add column if not exists deal_options jsonb not null default '{}'::jsonb;
  end if;
end
$d$;

-- ---------------------------------------------------------------------------
-- vendor_upgrade_requests
-- ---------------------------------------------------------------------------
create table if not exists public.vendor_upgrade_requests (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  vendor_id uuid references public.vendors (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  email text not null,
  context text,
  status text not null default 'new' check (status in ('new', 'seen', 'closed'))
);

create index if not exists vendor_upgrade_requests_status_idx on public.vendor_upgrade_requests (status desc);
create index if not exists vendor_upgrade_requests_created_idx on public.vendor_upgrade_requests (created_at desc);

alter table public.vendor_upgrade_requests enable row level security;

drop policy if exists vendor_upgrade_requests_insert_own on public.vendor_upgrade_requests;
create policy vendor_upgrade_requests_insert_own
  on public.vendor_upgrade_requests for insert
  to authenticated
  with check (
    user_id = auth.uid()
    and exists (
      select 1
      from public.vendors v
      where v.id = vendor_id
        and v.user_id = auth.uid()
    )
  );

drop policy if exists vendor_upgrade_requests_select_own on public.vendor_upgrade_requests;
create policy vendor_upgrade_requests_select_own
  on public.vendor_upgrade_requests for select
  to authenticated
  using (user_id = auth.uid());

drop policy if exists vendor_upgrade_requests_admin_select on public.vendor_upgrade_requests;
create policy vendor_upgrade_requests_admin_select
  on public.vendor_upgrade_requests for select
  to authenticated
  using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

drop policy if exists vendor_upgrade_requests_admin_update on public.vendor_upgrade_requests;
create policy vendor_upgrade_requests_admin_update
  on public.vendor_upgrade_requests for update
  to authenticated
  using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  )
  with check (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

-- ---------------------------------------------------------------------------
-- review_vendor_reports (vendor asks admin to review / remove a review)
-- ---------------------------------------------------------------------------
do $rvr$
begin
  if to_regclass('public.reviews') is not null and to_regclass('public.vendors') is not null then
    create table if not exists public.review_vendor_reports (
      id uuid primary key default gen_random_uuid(),
      created_at timestamptz not null default now(),
      review_id uuid not null references public.reviews (id) on delete cascade,
      vendor_id uuid not null references public.vendors (id) on delete cascade,
      reason text not null,
      status text not null default 'pending' check (status in ('pending', 'reviewed', 'dismissed', 'action_taken'))
    );

    create index if not exists review_vendor_reports_status_idx on public.review_vendor_reports (status);
    alter table public.review_vendor_reports enable row level security;

    drop policy if exists review_vendor_reports_vendor_insert on public.review_vendor_reports;
    create policy review_vendor_reports_vendor_insert
      on public.review_vendor_reports for insert
      to authenticated
      with check (
        vendor_id in (select v.id from public.vendors v where v.user_id = auth.uid())
        and exists (
          select 1
          from public.reviews r
          where r.id = review_id
            and r.entity_type = 'vendor'
            and r.entity_id = vendor_id
        )
      );

    drop policy if exists review_vendor_reports_vendor_select on public.review_vendor_reports;
    create policy review_vendor_reports_vendor_select
      on public.review_vendor_reports for select
      to authenticated
      using (vendor_id in (select v.id from public.vendors v where v.user_id = auth.uid()));

    drop policy if exists review_vendor_reports_admin_select on public.review_vendor_reports;
    create policy review_vendor_reports_admin_select
      on public.review_vendor_reports for select
      to authenticated
      using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

    drop policy if exists review_vendor_reports_admin_update on public.review_vendor_reports;
    create policy review_vendor_reports_admin_update
      on public.review_vendor_reports for update
      to authenticated
      using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'))
      with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));
  end if;
end
$rvr$;

-- ---------------------------------------------------------------------------
-- RPC: set reply only (no rating/title tampering)
-- ---------------------------------------------------------------------------
create or replace function public.vendor_set_review_reply(p_review_id uuid, p_reply text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_entity uuid;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  select r.entity_id
    into v_entity
  from public.reviews r
  where r.id = p_review_id
    and r.entity_type = 'vendor';

  if not found then
    raise exception 'review not found';
  end if;

  if not exists (
    select 1
    from public.vendors v
    where v.id = v_entity
      and v.user_id = auth.uid()
  ) then
    raise exception 'forbidden';
  end if;

  update public.reviews
  set
    vendor_reply = nullif(trim(p_reply), ''),
    vendor_reply_at = case
      when nullif(trim(p_reply), '') is null then null
      else now()
    end,
    updated_at = now()
  where id = p_review_id;
end;
$$;

grant execute on function public.vendor_set_review_reply(uuid, text) to authenticated;

-- ---------------------------------------------------------------------------
-- RPC: submit upgrade interest (email from auth.users)
-- ---------------------------------------------------------------------------
create or replace function public.vendor_request_account_upgrade(p_context text default null)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  vid uuid;
  em text;
  new_id uuid;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  select v.id
    into vid
  from public.vendors v
  where v.user_id = auth.uid()
  limit 1;

  if vid is null then
    raise exception 'no vendor linked to this account';
  end if;

  select trim(coalesce(u.email, ''))
    into em
  from auth.users as u
  where u.id = auth.uid();

  if em = '' then
    raise exception 'no email on account';
  end if;

  insert into public.vendor_upgrade_requests (vendor_id, user_id, email, context)
  values (vid, auth.uid(), em, nullif(trim(p_context), ''))
  returning id into new_id;

  return new_id;
end;
$$;

grant execute on function public.vendor_request_account_upgrade(text) to authenticated;

comment on function public.vendor_request_account_upgrade(text) is
  'Vendor asks admins to discuss upgrading; stores account email and optional context.';
