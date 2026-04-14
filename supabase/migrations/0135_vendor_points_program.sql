-- Vendor points program: shopper + vendor ledgers, redemptions (banners, map boosts, discover boost).
-- Requires: vendors, orders, smokers_club_homepage_banners, vendor_market_marker_quotas, vendor_locations trigger.
-- feature_flags: created here if missing (some DBs never applied 0017).

-- ---------------------------------------------------------------------------
-- Feature flags table (idempotent)
-- ---------------------------------------------------------------------------
create table if not exists public.feature_flags (
  key text primary key,
  enabled boolean not null default true,
  label text not null,
  sort_order int not null default 0,
  updated_at timestamptz not null default now()
);

alter table public.feature_flags enable row level security;

drop policy if exists feature_flags_select_all on public.feature_flags;
create policy feature_flags_select_all
  on public.feature_flags for select
  using (true);

drop policy if exists feature_flags_admin_all on public.feature_flags;
create policy feature_flags_admin_all
  on public.feature_flags for all
  to authenticated
  using (
    public.auth_profiles_role_is_admin()
    or public.auth_is_profile_admin()
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  )
  with check (
    public.auth_profiles_role_is_admin()
    or public.auth_is_profile_admin()
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

drop trigger if exists trg_feature_flags_updated on public.feature_flags;
create or replace function public.touch_feature_flags_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_feature_flags_updated
before update on public.feature_flags
for each row execute function public.touch_feature_flags_updated_at();

insert into public.feature_flags (key, enabled, label, sort_order)
values ('vendor_points_program', false, 'Vendor points program (loyalty + redemptions)', 45)
on conflict (key) do nothing;

-- ---------------------------------------------------------------------------
-- Vendor columns
-- ---------------------------------------------------------------------------

alter table public.vendors
  add column if not exists vendor_points_opt_in boolean not null default false;

alter table public.vendors
  add column if not exists discover_boost_until timestamptz;

comment on column public.vendors.vendor_points_opt_in is
  'When true and global vendor_points_program flag is on, shop earns a revenue share of loyalty points from completed orders. Shoppers always earn on completed orders when the program is on.';
comment on column public.vendors.discover_boost_until is
  'Optional discover sort boost until this timestamp (vendor points redemption).';

-- ---------------------------------------------------------------------------
-- Settings (singleton)
-- ---------------------------------------------------------------------------
create table if not exists public.vendor_points_settings (
  id smallint primary key default 1,
  points_per_order_dollar int not null default 5
    check (points_per_order_dollar >= 0),
  min_points_per_order int not null default 10
    check (min_points_per_order >= 0),
  max_points_per_order int not null default 2000
    check (max_points_per_order >= min_points_per_order),
  vendor_share_bps int not null default 3000
    check (vendor_share_bps >= 0 and vendor_share_bps <= 10000),
  min_subtotal_cents int not null default 1
    check (min_subtotal_cents >= 0),
  updated_at timestamptz not null default now(),
  constraint vendor_points_settings_singleton check (id = 1)
);

insert into public.vendor_points_settings (id) values (1)
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- Consumer loyalty
-- ---------------------------------------------------------------------------
create table if not exists public.consumer_loyalty_ledger (
  id uuid primary key default gen_random_uuid(),
  consumer_id uuid not null references auth.users (id) on delete cascade,
  delta bigint not null,
  reason text not null,
  order_id uuid references public.orders (id) on delete set null,
  created_at timestamptz not null default now()
);

create unique index if not exists consumer_loyalty_ledger_order_completed_uidx
  on public.consumer_loyalty_ledger (order_id)
  where order_id is not null and reason = 'order_completed';

create index if not exists consumer_loyalty_ledger_consumer_idx
  on public.consumer_loyalty_ledger (consumer_id, created_at desc);

create table if not exists public.consumer_loyalty_balances (
  consumer_id uuid primary key references auth.users (id) on delete cascade,
  balance bigint not null default 0,
  updated_at timestamptz not null default now(),
  constraint consumer_loyalty_balances_nonneg check (balance >= 0)
);

-- ---------------------------------------------------------------------------
-- Vendor points
-- ---------------------------------------------------------------------------
create table if not exists public.vendor_points_ledger (
  id uuid primary key default gen_random_uuid(),
  vendor_id uuid not null references public.vendors (id) on delete cascade,
  delta bigint not null,
  ref_type text not null,
  ref_id uuid,
  reason text,
  metadata jsonb,
  created_at timestamptz not null default now()
);

create unique index if not exists vendor_points_ledger_order_uidx
  on public.vendor_points_ledger (vendor_id, ref_id)
  where ref_type = 'order' and ref_id is not null;

create index if not exists vendor_points_ledger_vendor_idx
  on public.vendor_points_ledger (vendor_id, created_at desc);

create table if not exists public.vendor_points_balances (
  vendor_id uuid primary key references public.vendors (id) on delete cascade,
  balance bigint not null default 0,
  updated_at timestamptz not null default now(),
  constraint vendor_points_balances_nonneg check (balance >= 0)
);

-- ---------------------------------------------------------------------------
-- Redemption catalog + records + banner unlocks + marker boosts
-- ---------------------------------------------------------------------------
create table if not exists public.vendor_points_redemption_catalog (
  id uuid primary key default gen_random_uuid(),
  kind text not null
    check (kind in ('banner_placement_unlock', 'marker_boost_month', 'discover_boost_week')),
  label text not null,
  cost_points bigint not null check (cost_points > 0),
  metadata jsonb not null default '{}'::jsonb,
  active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.vendor_points_redemptions (
  id uuid primary key default gen_random_uuid(),
  vendor_id uuid not null references public.vendors (id) on delete cascade,
  catalog_id uuid not null references public.vendor_points_redemption_catalog (id) on delete restrict,
  cost_points bigint not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists vendor_points_redemptions_vendor_idx
  on public.vendor_points_redemptions (vendor_id, created_at desc);

create table if not exists public.banner_placement_unlocks (
  id uuid primary key default gen_random_uuid(),
  vendor_id uuid not null references public.vendors (id) on delete cascade,
  placement_key text not null,
  valid_from timestamptz not null default now(),
  valid_until timestamptz not null,
  redemption_id uuid references public.vendor_points_redemptions (id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists banner_placement_unlocks_vendor_placement_idx
  on public.banner_placement_unlocks (vendor_id, placement_key, valid_until desc);

create table if not exists public.vendor_market_marker_boosts (
  id uuid primary key default gen_random_uuid(),
  vendor_id uuid not null references public.vendors (id) on delete cascade,
  market_id uuid not null references public.listing_markets (id) on delete cascade,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  extra_markers int not null default 1 check (extra_markers >= 1 and extra_markers <= 20),
  redemption_id uuid references public.vendor_points_redemptions (id) on delete set null,
  created_at timestamptz not null default now(),
  constraint vendor_market_marker_boosts_range check (ends_at > starts_at)
);

create unique index if not exists vendor_market_marker_boosts_one_calendar_month_uidx
  on public.vendor_market_marker_boosts (vendor_id, market_id, (date_trunc('month', starts_at at time zone 'utc')));

create index if not exists vendor_market_marker_boosts_active_idx
  on public.vendor_market_marker_boosts (vendor_id, market_id, starts_at, ends_at);

do $seed_catalog$
begin
  if not exists (select 1 from public.vendor_points_redemption_catalog limit 1) then
    insert into public.vendor_points_redemption_catalog (kind, label, cost_points, metadata, sort_order)
    values
      ('banner_placement_unlock', 'Banner slot — Discover top', 500, '{"placement_keys":["discover_top"]}'::jsonb, 10),
      ('banner_placement_unlock', 'Banner slot — Deals page', 500, '{"placement_keys":["deals"]}'::jsonb, 20),
      ('banner_placement_unlock', 'Banner slot — Map page', 500, '{"placement_keys":["map"]}'::jsonb, 30),
      ('marker_boost_month', 'Extra map marker (1 month, one market)', 800, '{"extra_markers":1}'::jsonb, 40),
      ('discover_boost_week', 'Discover visibility boost (7 days)', 400, '{"duration_days":7}'::jsonb, 50);
  end if;
end;
$seed_catalog$;

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------
create or replace function public.vendor_points_program_globally_enabled()
returns boolean
language sql
stable
security definer
set search_path = public
set row_security = off
as $$
  select coalesce(
    (select ff.enabled from public.feature_flags ff where ff.key = 'vendor_points_program' limit 1),
    false
  );
$$;

revoke all on function public.vendor_points_program_globally_enabled() from public;
grant execute on function public.vendor_points_program_globally_enabled() to authenticated;
grant execute on function public.vendor_points_program_globally_enabled() to service_role;

create or replace function public.vendor_effective_max_markers(p_vendor_id uuid, p_market_id uuid)
returns int
language sql
stable
security definer
set search_path = public
set row_security = off
as $$
  select
    coalesce(
      (
        select q.max_markers
        from public.vendor_market_marker_quotas q
        where q.vendor_id = p_vendor_id
          and q.market_id = p_market_id
      ),
      1
    )
    + coalesce(
      (
        select sum(b.extra_markers)::int
        from public.vendor_market_marker_boosts b
        where b.vendor_id = p_vendor_id
          and b.market_id = p_market_id
          and b.starts_at <= now()
          and b.ends_at > now()
      ),
      0
    );
$$;

revoke all on function public.vendor_effective_max_markers(uuid, uuid) from public;
grant execute on function public.vendor_effective_max_markers(uuid, uuid) to authenticated;
grant execute on function public.vendor_effective_max_markers(uuid, uuid) to service_role;

create or replace function public.vendor_points_banner_submit_ok(p_vendor_id uuid, p_placement_key text)
returns boolean
language plpgsql
stable
security definer
set search_path = public
set row_security = off
as $$
declare
  pk text := nullif(trim(coalesce(p_placement_key, '')), '');
begin
  if pk is null then
    return false;
  end if;
  if not public.vendor_points_program_globally_enabled() then
    return false;
  end if;
  if not coalesce(
    (select v.vendor_points_opt_in from public.vendors v where v.id = p_vendor_id),
    false
  ) then
    return false;
  end if;
  if not public.vendor_staff_may_manage(p_vendor_id) then
    return false;
  end if;
  return exists (
    select 1
    from public.banner_placement_unlocks u
    where u.vendor_id = p_vendor_id
      and u.placement_key = pk
      and u.valid_from <= now()
      and u.valid_until >= now()
  );
end;
$$;

revoke all on function public.vendor_points_banner_submit_ok(uuid, text) from public;
grant execute on function public.vendor_points_banner_submit_ok(uuid, text) to authenticated;

-- ---------------------------------------------------------------------------
-- finalize_order_loyalty
-- ---------------------------------------------------------------------------
create or replace function public.finalize_order_loyalty(p_order_id uuid)
returns void
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
declare
  o record;
  s record;
  sub_cent bigint;
  pot bigint;
  vp bigint;
  cp bigint;
begin
  perform pg_advisory_xact_lock(5817281, hashtext(p_order_id::text));

  select id, vendor_id, consumer_id, status, coalesce(subtotal_cents, total_cents, 0) as sub_c
    into o
  from public.orders
  where id = p_order_id;

  if not found then
    return;
  end if;

  if o.status is distinct from 'completed' then
    return;
  end if;
  if o.consumer_id is null then
    return;
  end if;
  if not public.vendor_points_program_globally_enabled() then
    return;
  end if;

  select * into s from public.vendor_points_settings where id = 1;
  if not found then
    return;
  end if;

  sub_cent := greatest(coalesce(o.sub_c, 0), 0);

  if not exists (
    select 1
    from public.consumer_loyalty_ledger
    where order_id = p_order_id and reason = 'order_completed'
  ) then
    if sub_cent >= s.min_subtotal_cents then
      pot := (sub_cent / 100) * s.points_per_order_dollar;
      pot := greatest(s.min_points_per_order::bigint, least(s.max_points_per_order::bigint, pot));
      vp := (pot * s.vendor_share_bps) / 10000;
      if not coalesce(
        (select v.vendor_points_opt_in from public.vendors v where v.id = o.vendor_id),
        false
      ) then
        vp := 0;
      end if;
      cp := pot - vp;
      if cp < 0 then
        cp := 0;
      end if;
      if vp < 0 then
        vp := 0;
      end if;

      begin
        insert into public.consumer_loyalty_ledger (consumer_id, delta, reason, order_id)
        values (o.consumer_id, cp, 'order_completed', p_order_id);

        if vp > 0 then
          insert into public.vendor_points_ledger (vendor_id, delta, ref_type, ref_id, reason)
          values (o.vendor_id, vp, 'order', p_order_id, 'order_completed');
        end if;

        insert into public.consumer_loyalty_balances (consumer_id, balance)
        values (o.consumer_id, cp)
        on conflict (consumer_id) do update
          set balance = public.consumer_loyalty_balances.balance + excluded.balance,
              updated_at = now();

        if vp > 0 then
          insert into public.vendor_points_balances (vendor_id, balance)
          values (o.vendor_id, vp)
          on conflict (vendor_id) do update
            set balance = public.vendor_points_balances.balance + excluded.balance,
                updated_at = now();
        end if;
      exception
        when unique_violation then
          null;
      end;
    end if;
  end if;

end;
$$;

revoke all on function public.finalize_order_loyalty(uuid) from public;
grant execute on function public.finalize_order_loyalty(uuid) to service_role;

-- ---------------------------------------------------------------------------
-- Redeem RPCs (vendor staff)
-- ---------------------------------------------------------------------------
create or replace function public.redeem_vendor_points_banner_unlock(
  p_vendor_id uuid,
  p_catalog_id uuid,
  p_placement_key text
)
returns uuid
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
declare
  cat record;
  pk text := nullif(trim(coalesce(p_placement_key, '')), '');
  keys jsonb;
  arr text[];
  ok boolean := false;
  bal bigint;
  rid uuid;
  days int := 90;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;
  if not public.vendor_staff_may_manage(p_vendor_id) then
    raise exception 'forbidden';
  end if;
  if not public.vendor_points_program_globally_enabled() then
    raise exception 'program disabled';
  end if;
  if not coalesce(
    (select v.vendor_points_opt_in from public.vendors v where v.id = p_vendor_id),
    false
  ) then
    raise exception 'vendor not opted in';
  end if;
  if pk is null then
    raise exception 'placement_key required';
  end if;

  select * into cat
  from public.vendor_points_redemption_catalog
  where id = p_catalog_id and active = true and kind = 'banner_placement_unlock';

  if not found then
    raise exception 'invalid catalog item';
  end if;

  keys := cat.metadata -> 'placement_keys';
  if keys is not null and jsonb_typeof(keys) = 'array' and jsonb_array_length(keys) > 0 then
    arr := array(select jsonb_array_elements_text(keys));
    ok := pk = any (arr);
  else
    ok := true;
  end if;
  if not ok then
    raise exception 'placement not allowed for this catalog item';
  end if;

  insert into public.vendor_points_balances (vendor_id, balance)
  values (p_vendor_id, 0)
  on conflict (vendor_id) do nothing;

  select balance into bal from public.vendor_points_balances where vendor_id = p_vendor_id for update;
  if bal is null then
    bal := 0;
  end if;
  if bal < cat.cost_points then
    raise exception 'insufficient points';
  end if;

  update public.vendor_points_balances
  set balance = balance - cat.cost_points, updated_at = now()
  where vendor_id = p_vendor_id;

  insert into public.vendor_points_ledger (vendor_id, delta, ref_type, ref_id, reason, metadata)
  values (
    p_vendor_id,
    -cat.cost_points,
    'redemption',
    p_catalog_id,
    'banner_placement_unlock',
    jsonb_build_object('placement_key', pk)
  );

  insert into public.vendor_points_redemptions (vendor_id, catalog_id, cost_points, payload)
  values (p_vendor_id, p_catalog_id, cat.cost_points, jsonb_build_object('placement_key', pk))
  returning id into rid;

  insert into public.banner_placement_unlocks (vendor_id, placement_key, valid_from, valid_until, redemption_id)
  values (p_vendor_id, pk, now(), now() + (days || ' days')::interval, rid);

  return rid;
end;
$$;

revoke all on function public.redeem_vendor_points_banner_unlock(uuid, uuid, text) from public;
grant execute on function public.redeem_vendor_points_banner_unlock(uuid, uuid, text) to authenticated;

create or replace function public.redeem_vendor_points_marker_boost_month(
  p_vendor_id uuid,
  p_catalog_id uuid,
  p_market_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
declare
  cat record;
  bal bigint;
  rid uuid;
  ex int := 1;
  m_start timestamptz;
  m_end timestamptz;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;
  if not public.vendor_staff_may_manage(p_vendor_id) then
    raise exception 'forbidden';
  end if;
  if not public.vendor_points_program_globally_enabled() then
    raise exception 'program disabled';
  end if;
  if not coalesce(
    (select v.vendor_points_opt_in from public.vendors v where v.id = p_vendor_id),
    false
  ) then
    raise exception 'vendor not opted in';
  end if;

  select * into cat
  from public.vendor_points_redemption_catalog
  where id = p_catalog_id and active = true and kind = 'marker_boost_month';

  if not found then
    raise exception 'invalid catalog item';
  end if;

  ex := coalesce((cat.metadata ->> 'extra_markers')::int, 1);
  if ex < 1 then
    ex := 1;
  end if;

  if not exists (
    select 1
    from public.vendor_market_operations vmo
    where vmo.vendor_id = p_vendor_id
      and vmo.market_id = p_market_id
      and vmo.approved = true
  ) then
    raise exception 'market not approved for this vendor';
  end if;

  m_start := date_trunc('month', now() at time zone 'utc') at time zone 'utc';
  m_end := m_start + interval '1 month';

  if exists (
    select 1
    from public.vendor_market_marker_boosts b
    where b.vendor_id = p_vendor_id
      and b.market_id = p_market_id
      and date_trunc('month', b.starts_at at time zone 'utc') = date_trunc('month', now() at time zone 'utc')
  ) then
    raise exception 'already redeemed marker boost for this market this month';
  end if;

  insert into public.vendor_points_balances (vendor_id, balance)
  values (p_vendor_id, 0)
  on conflict (vendor_id) do nothing;

  select balance into bal from public.vendor_points_balances where vendor_id = p_vendor_id for update;
  if bal is null then
    bal := 0;
  end if;
  if bal < cat.cost_points then
    raise exception 'insufficient points';
  end if;

  update public.vendor_points_balances
  set balance = balance - cat.cost_points, updated_at = now()
  where vendor_id = p_vendor_id;

  insert into public.vendor_points_ledger (vendor_id, delta, ref_type, ref_id, reason, metadata)
  values (
    p_vendor_id,
    -cat.cost_points,
    'redemption',
    p_catalog_id,
    'marker_boost_month',
    jsonb_build_object('market_id', p_market_id)
  );

  insert into public.vendor_points_redemptions (vendor_id, catalog_id, cost_points, payload)
  values (p_vendor_id, p_catalog_id, cat.cost_points, jsonb_build_object('market_id', p_market_id))
  returning id into rid;

  insert into public.vendor_market_marker_boosts (
    vendor_id,
    market_id,
    starts_at,
    ends_at,
    extra_markers,
    redemption_id
  )
  values (p_vendor_id, p_market_id, m_start, m_end, ex, rid);

  return rid;
end;
$$;

revoke all on function public.redeem_vendor_points_marker_boost_month(uuid, uuid, uuid) from public;
grant execute on function public.redeem_vendor_points_marker_boost_month(uuid, uuid, uuid) to authenticated;

create or replace function public.redeem_vendor_points_discover_boost(
  p_vendor_id uuid,
  p_catalog_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
declare
  cat record;
  bal bigint;
  rid uuid;
  days int := 7;
  until_ts timestamptz;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;
  if not public.vendor_staff_may_manage(p_vendor_id) then
    raise exception 'forbidden';
  end if;
  if not public.vendor_points_program_globally_enabled() then
    raise exception 'program disabled';
  end if;
  if not coalesce(
    (select v.vendor_points_opt_in from public.vendors v where v.id = p_vendor_id),
    false
  ) then
    raise exception 'vendor not opted in';
  end if;

  select * into cat
  from public.vendor_points_redemption_catalog
  where id = p_catalog_id and active = true and kind = 'discover_boost_week';

  if not found then
    raise exception 'invalid catalog item';
  end if;

  days := coalesce((cat.metadata ->> 'duration_days')::int, 7);
  if days < 1 then
    days := 7;
  end if;

  insert into public.vendor_points_balances (vendor_id, balance)
  values (p_vendor_id, 0)
  on conflict (vendor_id) do nothing;

  select balance into bal from public.vendor_points_balances where vendor_id = p_vendor_id for update;
  if bal is null then
    bal := 0;
  end if;
  if bal < cat.cost_points then
    raise exception 'insufficient points';
  end if;

  update public.vendor_points_balances
  set balance = balance - cat.cost_points, updated_at = now()
  where vendor_id = p_vendor_id;

  insert into public.vendor_points_ledger (vendor_id, delta, ref_type, ref_id, reason, metadata)
  values (
    p_vendor_id,
    -cat.cost_points,
    'redemption',
    p_catalog_id,
    'discover_boost_week',
    '{}'::jsonb
  );

  insert into public.vendor_points_redemptions (vendor_id, catalog_id, cost_points, payload)
  values (p_vendor_id, p_catalog_id, cat.cost_points, '{}'::jsonb)
  returning id into rid;

  until_ts := greatest(
    coalesce(
      (select v.discover_boost_until from public.vendors v where v.id = p_vendor_id),
      now()
    ),
    now()
  ) + (days || ' days')::interval;

  update public.vendors
  set discover_boost_until = until_ts
  where id = p_vendor_id;

  return rid;
end;
$$;

revoke all on function public.redeem_vendor_points_discover_boost(uuid, uuid) from public;
grant execute on function public.redeem_vendor_points_discover_boost(uuid, uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Admin adjust + settings update
-- ---------------------------------------------------------------------------
create or replace function public.admin_vendor_points_adjust(
  p_vendor_id uuid,
  p_delta bigint,
  p_note text
)
returns void
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;
  if not (public.auth_profiles_role_is_admin() or public.auth_is_profile_admin()) then
    raise exception 'forbidden';
  end if;
  if p_delta = 0 then
    return;
  end if;

  insert into public.vendor_points_ledger (vendor_id, delta, ref_type, ref_id, reason, metadata)
  values (
    p_vendor_id,
    p_delta,
    'admin',
    gen_random_uuid(),
    'admin_adjustment',
    jsonb_build_object('note', left(coalesce(p_note, ''), 2000))
  );

  insert into public.vendor_points_balances (vendor_id, balance)
  values (p_vendor_id, greatest(p_delta, 0))
  on conflict (vendor_id) do update
    set balance = greatest(public.vendor_points_balances.balance + p_delta, 0),
        updated_at = now();
end;
$$;

revoke all on function public.admin_vendor_points_adjust(uuid, bigint, text) from public;
grant execute on function public.admin_vendor_points_adjust(uuid, bigint, text) to authenticated;

create or replace function public.admin_update_vendor_points_settings(
  p_points_per_order_dollar int,
  p_min_points_per_order int,
  p_max_points_per_order int,
  p_vendor_share_bps int,
  p_min_subtotal_cents int
)
returns void
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;
  if not (public.auth_profiles_role_is_admin() or public.auth_is_profile_admin()) then
    raise exception 'forbidden';
  end if;

  update public.vendor_points_settings
  set
    points_per_order_dollar = p_points_per_order_dollar,
    min_points_per_order = p_min_points_per_order,
    max_points_per_order = p_max_points_per_order,
    vendor_share_bps = p_vendor_share_bps,
    min_subtotal_cents = p_min_subtotal_cents,
    updated_at = now()
  where id = 1;
end;
$$;

revoke all on function public.admin_update_vendor_points_settings(int, int, int, int, int) from public;
grant execute on function public.admin_update_vendor_points_settings(int, int, int, int, int) to authenticated;

create or replace function public.admin_upsert_vendor_points_catalog_item(
  p_id uuid,
  p_kind text,
  p_label text,
  p_cost_points bigint,
  p_metadata jsonb,
  p_active boolean,
  p_sort_order int
)
returns void
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;
  if not (public.auth_profiles_role_is_admin() or public.auth_is_profile_admin()) then
    raise exception 'forbidden';
  end if;

  if p_id is null then
    insert into public.vendor_points_redemption_catalog (kind, label, cost_points, metadata, active, sort_order)
    values (p_kind, p_label, p_cost_points, coalesce(p_metadata, '{}'::jsonb), p_active, p_sort_order);
  else
    update public.vendor_points_redemption_catalog
    set
      kind = p_kind,
      label = p_label,
      cost_points = p_cost_points,
      metadata = coalesce(p_metadata, '{}'::jsonb),
      active = p_active,
      sort_order = p_sort_order,
      updated_at = now()
    where id = p_id;
  end if;
end;
$$;

revoke all on function public.admin_upsert_vendor_points_catalog_item(uuid, text, text, bigint, jsonb, boolean, int)
  from public;
grant execute on function public.admin_upsert_vendor_points_catalog_item(uuid, text, text, bigint, jsonb, boolean, int)
  to authenticated;

-- ---------------------------------------------------------------------------
-- Patch order fulfillment RPCs
-- ---------------------------------------------------------------------------
create or replace function public.vendor_update_order_fulfillment (
  p_order_id uuid,
  p_new_status text,
  p_message text default null
) returns void
language plpgsql
security definer
set search_path = public
as $fn$
declare
  v_vendor_id uuid;
  v_consumer_id uuid;
  v_current text;
  v_trim text;
  v_body text;
begin
  if p_new_status is null
    or p_new_status not in (
      'pending',
      'accepted',
      'en_route',
      'completed',
      'cancelled'
    )
  then
    raise exception 'invalid status';
  end if;

  select o.vendor_id, o.consumer_id, o.status
    into v_vendor_id, v_consumer_id, v_current
  from public.orders o
  where o.id = p_order_id
  for update;

  if not found then
    raise exception 'order not found';
  end if;

  if not public.vendor_staff_may_manage(v_vendor_id) then
    raise exception 'forbidden';
  end if;

  if v_current in ('completed', 'cancelled') then
    raise exception 'order is closed';
  end if;

  if p_new_status = v_current then
    return;
  end if;

  if not (
    (v_current = 'pending' and p_new_status in ('accepted', 'cancelled'))
    or (v_current = 'accepted' and p_new_status in ('en_route', 'cancelled'))
    or (v_current = 'en_route' and p_new_status in ('completed', 'cancelled'))
  ) then
    raise exception 'invalid status transition from % to %', v_current, p_new_status;
  end if;

  update public.orders
  set status = p_new_status
  where id = p_order_id;

  v_trim := nullif(trim(coalesce(p_message, '')), '');
  v_body := coalesce(
    v_trim,
    case p_new_status
      when 'pending' then 'Order is pending.'
      when 'accepted' then 'Your order was accepted and is being prepared.'
      when 'en_route' then 'Your order is on the way.'
      when 'completed' then 'Your order is completed. Thank you!'
      when 'cancelled' then 'This order was cancelled.'
      else 'Order updated.'
    end
  );

  insert into public.order_fulfillment_updates (
    order_id,
    vendor_id,
    consumer_id,
    status,
    message
  ) values (
    p_order_id,
    v_vendor_id,
    v_consumer_id,
    p_new_status,
    v_body
  );

  if p_new_status = 'completed' then
    perform public.finalize_order_loyalty(p_order_id);
  end if;
end;
$fn$;

create or replace function public.vendor_complete_order_now (
  p_order_id uuid,
  p_message text default null
) returns void
language plpgsql
security definer
set search_path = public
as $fn$
declare
  v_vendor_id uuid;
  v_consumer_id uuid;
  v_current text;
  v_trim text;
  v_body text;
begin
  select o.vendor_id, o.consumer_id, o.status
    into v_vendor_id, v_consumer_id, v_current
  from public.orders o
  where o.id = p_order_id
  for update;

  if not found then
    raise exception 'order not found';
  end if;

  if not public.vendor_staff_may_manage(v_vendor_id) then
    raise exception 'forbidden';
  end if;

  if v_current in ('completed', 'cancelled') then
    raise exception 'order is closed';
  end if;

  update public.orders
  set status = 'completed'
  where id = p_order_id;

  v_trim := nullif(trim(coalesce(p_message, '')), '');
  v_body := coalesce(
    v_trim,
    'Your order was completed. Thank you!'
  );

  insert into public.order_fulfillment_updates (
    order_id,
    vendor_id,
    consumer_id,
    status,
    message
  ) values (
    p_order_id,
    v_vendor_id,
    v_consumer_id,
    'completed',
    v_body
  );

  perform public.finalize_order_loyalty(p_order_id);
end;
$fn$;

-- ---------------------------------------------------------------------------
-- Marker quota trigger uses effective max
-- ---------------------------------------------------------------------------
create or replace function public.enforce_vendor_location_market_quota()
returns trigger
language plpgsql
as $$
declare
  eff_market_id uuid;
  eff_prefix text;
  mx int;
  cnt int;
begin
  eff_prefix := public._vendor_location_effective_zip_prefix(NEW.zip_prefix);
  NEW.zip_prefix := eff_prefix;

  if NEW.market_id is null then
    return NEW;
  end if;

  eff_market_id := NEW.market_id;

  if not exists (
    select 1
    from public.vendor_market_operations vmo
    where vmo.vendor_id = NEW.vendor_id
      and vmo.market_id = eff_market_id
      and vmo.approved = true
  ) then
    raise exception
      using errcode = 'P0001',
      message = 'This map marker market is not enabled for your store. Ask an administrator to enable the operating area.';
  end if;

  if eff_prefix is not null then
    if not (
      exists (
        select 1
        from public.market_zip_prefixes mzp
        where mzp.prefix = eff_prefix
          and mzp.market_id = eff_market_id
      )
      or exists (
        select 1
        from public.listing_markets lm
        where lm.id = eff_market_id
          and lm.slug = 'california-other'
      )
    ) then
      raise exception
        using errcode = 'P0001',
        message = format('ZIP prefix %s is not part of the selected market.', eff_prefix);
    end if;
  end if;

  mx := public.vendor_effective_max_markers(NEW.vendor_id, eff_market_id);

  select count(*)::int
  into cnt
  from public.vendor_locations vl
  where vl.vendor_id = NEW.vendor_id
    and vl.market_id = eff_market_id
    and (TG_OP = 'insert' or vl.id <> NEW.id);

  if cnt >= mx then
    raise exception
      using
        errcode = 'P0001',
        message = format(
          'Map markers in this market are limited to %s for this store (admin quota). Ask your administrator to raise the cap or remove an existing marker.',
          mx
        );
  end if;

  return NEW;
end;
$$;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.vendor_points_settings enable row level security;
alter table public.consumer_loyalty_ledger enable row level security;
alter table public.consumer_loyalty_balances enable row level security;
alter table public.vendor_points_ledger enable row level security;
alter table public.vendor_points_balances enable row level security;
alter table public.vendor_points_redemption_catalog enable row level security;
alter table public.vendor_points_redemptions enable row level security;
alter table public.banner_placement_unlocks enable row level security;
alter table public.vendor_market_marker_boosts enable row level security;

drop policy if exists vendor_points_settings_select_auth on public.vendor_points_settings;
create policy vendor_points_settings_select_auth
  on public.vendor_points_settings for select
  to authenticated
  using (true);

drop policy if exists vendor_points_settings_admin_all on public.vendor_points_settings;
create policy vendor_points_settings_admin_all
  on public.vendor_points_settings for all
  using (public.auth_profiles_role_is_admin() or public.auth_is_profile_admin())
  with check (public.auth_profiles_role_is_admin() or public.auth_is_profile_admin());

drop policy if exists consumer_loyalty_ledger_own_select on public.consumer_loyalty_ledger;
create policy consumer_loyalty_ledger_own_select
  on public.consumer_loyalty_ledger for select
  to authenticated
  using (consumer_id = auth.uid());

drop policy if exists consumer_loyalty_balances_own_select on public.consumer_loyalty_balances;
create policy consumer_loyalty_balances_own_select
  on public.consumer_loyalty_balances for select
  to authenticated
  using (consumer_id = auth.uid());

drop policy if exists vendor_points_ledger_staff_select on public.vendor_points_ledger;
create policy vendor_points_ledger_staff_select
  on public.vendor_points_ledger for select
  to authenticated
  using (public.vendor_staff_may_manage(vendor_id));

drop policy if exists vendor_points_ledger_admin_select on public.vendor_points_ledger;
create policy vendor_points_ledger_admin_select
  on public.vendor_points_ledger for select
  to authenticated
  using (public.auth_profiles_role_is_admin() or public.auth_is_profile_admin());

drop policy if exists vendor_points_balances_staff_select on public.vendor_points_balances;
create policy vendor_points_balances_staff_select
  on public.vendor_points_balances for select
  to authenticated
  using (public.vendor_staff_may_manage(vendor_id));

drop policy if exists vendor_points_balances_admin_select on public.vendor_points_balances;
create policy vendor_points_balances_admin_select
  on public.vendor_points_balances for select
  to authenticated
  using (public.auth_profiles_role_is_admin() or public.auth_is_profile_admin());

drop policy if exists vendor_points_catalog_select on public.vendor_points_redemption_catalog;
create policy vendor_points_catalog_select
  on public.vendor_points_redemption_catalog for select
  to authenticated
  using (true);

drop policy if exists vendor_points_catalog_admin_all on public.vendor_points_redemption_catalog;
create policy vendor_points_catalog_admin_all
  on public.vendor_points_redemption_catalog for all
  using (public.auth_profiles_role_is_admin() or public.auth_is_profile_admin())
  with check (public.auth_profiles_role_is_admin() or public.auth_is_profile_admin());

drop policy if exists vendor_points_redemptions_staff_select on public.vendor_points_redemptions;
create policy vendor_points_redemptions_staff_select
  on public.vendor_points_redemptions for select
  to authenticated
  using (public.vendor_staff_may_manage(vendor_id));

drop policy if exists vendor_points_redemptions_admin_select on public.vendor_points_redemptions;
create policy vendor_points_redemptions_admin_select
  on public.vendor_points_redemptions for select
  to authenticated
  using (public.auth_profiles_role_is_admin() or public.auth_is_profile_admin());

drop policy if exists banner_unlocks_staff_select on public.banner_placement_unlocks;
create policy banner_unlocks_staff_select
  on public.banner_placement_unlocks for select
  to authenticated
  using (public.vendor_staff_may_manage(vendor_id));

drop policy if exists banner_unlocks_admin_select on public.banner_placement_unlocks;
create policy banner_unlocks_admin_select
  on public.banner_placement_unlocks for select
  to authenticated
  using (public.auth_profiles_role_is_admin() or public.auth_is_profile_admin());

drop policy if exists marker_boosts_staff_select on public.vendor_market_marker_boosts;
create policy marker_boosts_staff_select
  on public.vendor_market_marker_boosts for select
  to authenticated
  using (public.vendor_staff_may_manage(vendor_id));

drop policy if exists marker_boosts_admin_select on public.vendor_market_marker_boosts;
create policy marker_boosts_admin_select
  on public.vendor_market_marker_boosts for select
  to authenticated
  using (public.auth_profiles_role_is_admin() or public.auth_is_profile_admin());

grant select on public.vendor_points_settings to authenticated;
grant select on public.consumer_loyalty_ledger to authenticated;
grant select on public.consumer_loyalty_balances to authenticated;
grant select on public.vendor_points_ledger to authenticated;
grant select on public.vendor_points_balances to authenticated;
grant select on public.vendor_points_redemption_catalog to authenticated;
grant select on public.vendor_points_redemptions to authenticated;
grant select on public.banner_placement_unlocks to authenticated;
grant select on public.vendor_market_marker_boosts to authenticated;

-- ---------------------------------------------------------------------------
-- Smokers Club banner insert: Smokers Club OR vendor points unlock
-- ---------------------------------------------------------------------------
do $scb$
begin
  if to_regclass('public.smokers_club_homepage_banners') is null then
    return;
  end if;

  drop policy if exists smokers_club_banners_vendor_insert on public.smokers_club_homepage_banners;
  create policy smokers_club_banners_vendor_insert
    on public.smokers_club_homepage_banners for insert
    to authenticated
    with check (
      status = 'pending'
      and vendor_id is not null
      and (
        public.vendor_smokers_club_banner_submit_ok(vendor_id)
        or public.vendor_points_banner_submit_ok(vendor_id, placement_key)
      )
    );
end
$scb$;
