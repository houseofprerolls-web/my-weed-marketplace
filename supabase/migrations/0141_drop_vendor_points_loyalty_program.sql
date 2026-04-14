-- Remove vendor points program, shopper loyalty ledgers, vendor loyalty menu, and related RPCs.
-- Restores order fulfillment, map marker quota, and Smokers Club banner insert policy to pre-0135 behavior.

-- ---------------------------------------------------------------------------
-- Order fulfillment (no finalize_order_loyalty)
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
end;
$fn$;

-- ---------------------------------------------------------------------------
-- Map marker quota: quota table only (no points-based extra markers)
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

  select coalesce(
    (
      select q.max_markers
      from public.vendor_market_marker_quotas q
      where q.vendor_id = NEW.vendor_id
        and q.market_id = eff_market_id
    ),
    1
  )
  into mx;

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
-- Smokers Club banners: insert only via Smokers Club eligibility (0120)
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
      and public.vendor_smokers_club_banner_submit_ok(vendor_id)
    );
end
$scb$;

-- ---------------------------------------------------------------------------
-- Drop RPCs (before tables they reference)
-- ---------------------------------------------------------------------------
drop function if exists public.finalize_order_loyalty(uuid);
drop function if exists public._apply_loyalty_reward_on_order_complete(uuid);
drop function if exists public.consumer_redeem_loyalty_reward_points_only(uuid);
drop function if exists public.consumer_attach_loyalty_reward_to_order(uuid, uuid);
drop function if exists public.vendor_points_program_globally_enabled();
drop function if exists public.vendor_effective_max_markers(uuid, uuid);
drop function if exists public.vendor_points_banner_submit_ok(uuid, text);
drop function if exists public.redeem_vendor_points_banner_unlock(uuid, uuid, text);
drop function if exists public.redeem_vendor_points_marker_boost_month(uuid, uuid, uuid);
drop function if exists public.redeem_vendor_points_discover_boost(uuid, uuid);
drop function if exists public.admin_vendor_points_adjust(uuid, bigint, text);
drop function if exists public.admin_update_vendor_points_settings(int, int, int, int, int);
drop function if exists public.admin_upsert_vendor_points_catalog_item(uuid, text, text, bigint, jsonb, boolean, int);
drop function if exists public.admin_consumer_loyalty_adjust(uuid, bigint, text);

-- ---------------------------------------------------------------------------
-- Orders: loyalty reward FK
-- ---------------------------------------------------------------------------
alter table public.orders drop constraint if exists orders_loyalty_reward_id_fkey;
alter table public.orders drop column if exists loyalty_reward_id;

-- ---------------------------------------------------------------------------
-- Vendors: points columns
-- ---------------------------------------------------------------------------
alter table public.vendors drop column if exists vendor_points_opt_in;
alter table public.vendors drop column if exists discover_boost_until;

-- ---------------------------------------------------------------------------
-- Tables (children first)
-- ---------------------------------------------------------------------------
drop table if exists public.vendor_loyalty_redemptions cascade;
drop table if exists public.vendor_loyalty_rewards cascade;
drop table if exists public.banner_placement_unlocks cascade;
drop table if exists public.vendor_market_marker_boosts cascade;
drop table if exists public.vendor_points_redemptions cascade;
drop table if exists public.vendor_points_redemption_catalog cascade;
drop table if exists public.vendor_points_ledger cascade;
drop table if exists public.vendor_points_balances cascade;
drop table if exists public.consumer_loyalty_ledger cascade;
drop table if exists public.consumer_loyalty_balances cascade;
drop table if exists public.vendor_points_settings cascade;

-- ---------------------------------------------------------------------------
-- Feature flag row (keep feature_flags table)
-- ---------------------------------------------------------------------------
delete from public.feature_flags where key = 'vendor_points_program';
