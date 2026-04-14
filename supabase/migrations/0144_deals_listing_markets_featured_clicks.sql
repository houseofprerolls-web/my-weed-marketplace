-- Deals: scope by approved listing_markets (slugs), marketplace featured slots, click ranking.

alter table public.deals
  add column if not exists listing_market_slugs text[] not null default '{}'::text[];

alter table public.deals
  add column if not exists deal_click_count int not null default 0;

alter table public.deals
  add column if not exists marketplace_featured_rank int null;

comment on column public.deals.listing_market_slugs is
  'Listing market slugs (listing_markets.slug) where this deal runs; empty before trigger = expand to all vendor-approved markets. Legacy rows may use {} with region_keys only.';

comment on column public.deals.deal_click_count is
  'Approximate marketplace deal card clicks (increment via increment_deal_marketplace_click).';

comment on column public.deals.marketplace_featured_rank is
  'Admin-curated featured order on /deals (lower = earlier). Null = not pinned.';

create index if not exists deals_marketplace_featured_rank_idx
  on public.deals (marketplace_featured_rank)
  where marketplace_featured_rank is not null;

create index if not exists deals_deal_click_count_idx
  on public.deals (deal_click_count desc);

-- ---------------------------------------------------------------------------
-- Approved listing areas for a vendor (Smokers Club / vendor_market_operations).
-- ---------------------------------------------------------------------------
create or replace function public.vendor_approved_listing_market_slugs(p_vendor_id uuid)
returns text[]
language sql
stable
security definer
set search_path = public
set row_security = off
as $$
  select coalesce(
    (
      select array_agg(lm.slug order by lm.slug)
      from public.vendor_market_operations vmo
      join public.listing_markets lm on lm.id = vmo.market_id
      where vmo.vendor_id = p_vendor_id
        and vmo.approved = true
    ),
    '{}'::text[]
  );
$$;

revoke all on function public.vendor_approved_listing_market_slugs(uuid) from public;
grant execute on function public.vendor_approved_listing_market_slugs(uuid) to anon, authenticated, service_role;

create or replace function public.vendor_approved_listing_markets(p_vendor_id uuid)
returns table(slug text, name text, region_key text)
language sql
stable
security definer
set search_path = public
set row_security = off
as $$
  select lm.slug, lm.name, lm.region_key::text
  from public.vendor_market_operations vmo
  join public.listing_markets lm on lm.id = vmo.market_id
  where vmo.vendor_id = p_vendor_id
    and vmo.approved = true
  order by lm.sort_order nulls last, lm.name;
$$;

revoke all on function public.vendor_approved_listing_markets(uuid) from public;
grant execute on function public.vendor_approved_listing_markets(uuid) to anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Replace deal region enforcement: prefer approved listing markets when present.
-- ---------------------------------------------------------------------------
create or replace function public.deals_enforce_region_keys_and_times()
returns trigger
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
declare
  allowed text[];
  allowed_slugs text[];
  rk text;
  normalized text;
  s text;
  synced_keys text[];
begin
  if public.auth_is_profile_admin() then
    if NEW.starts_at is not null then
      NEW.start_date := (NEW.starts_at at time zone 'America/Los_Angeles')::date;
    end if;
    if NEW.ends_at is not null then
      NEW.end_date := (NEW.ends_at at time zone 'America/Los_Angeles')::date;
    end if;
    return NEW;
  end if;

  if NEW.ends_at < NEW.starts_at then
    raise exception
      using errcode = 'P0001',
      message = 'Deal end time must be after start time.';
  end if;

  NEW.start_date := (NEW.starts_at at time zone 'America/Los_Angeles')::date;
  NEW.end_date := (NEW.ends_at at time zone 'America/Los_Angeles')::date;

  allowed_slugs := public.vendor_approved_listing_market_slugs(NEW.vendor_id);

  if allowed_slugs is not null and cardinality(allowed_slugs) > 0 then
    if NEW.listing_market_slugs is null or cardinality(NEW.listing_market_slugs) = 0 then
      NEW.listing_market_slugs := allowed_slugs;
    else
      foreach s in array NEW.listing_market_slugs
      loop
        if not (trim(both from coalesce(s, '')) = any (allowed_slugs)) then
          raise exception
            using errcode = 'P0001',
            message = format(
              'Market "%s" is not an approved listing area for this store. Turn it on under admin market approvals first.',
              s
            );
        end if;
      end loop;
    end if;

    select coalesce(
      array_agg(distinct upper(left(trim(lm.region_key), 2)) order by upper(left(trim(lm.region_key), 2))),
      '{}'::text[]
    )
    into synced_keys
    from public.listing_markets lm
    where lm.slug = any (NEW.listing_market_slugs)
      and lm.region_key is not null
      and length(trim(lm.region_key)) >= 2
      and upper(left(trim(lm.region_key), 2)) ~ '^[A-Z]{2}$';

    NEW.region_keys := synced_keys;
  else
    allowed := public.vendor_deal_allowed_region_keys(NEW.vendor_id);

    if allowed is null or cardinality(allowed) = 0 then
      raise exception
        using errcode = 'P0001',
        message = 'Set your shop state (vendor profile) or add a regional menu, and get at least one marketplace area approved by admin before creating deals.';
    end if;

    NEW.listing_market_slugs := '{}'::text[];

    if NEW.region_keys is null or cardinality(NEW.region_keys) = 0 then
      NEW.region_keys := allowed;
    else
      foreach rk in array NEW.region_keys
      loop
        normalized := upper(left(trim(both from coalesce(rk, '')), 2));
        if not (normalized = any (allowed)) then
          raise exception
            using errcode = 'P0001',
            message = format(
              'Region %s is not allowed for this store. Allowed: %s.',
              normalized,
              array_to_string(allowed, ', ')
            );
        end if;
      end loop;
    end if;
  end if;

  return NEW;
end;
$$;

drop trigger if exists deals_enforce_regions_ins_upd on public.deals;
create trigger deals_enforce_regions_ins_upd
  before insert or update of region_keys, listing_market_slugs, vendor_id, starts_at, ends_at on public.deals
  for each row
  execute function public.deals_enforce_region_keys_and_times();

-- ---------------------------------------------------------------------------
-- Public click counter (best-effort; no auth required).
-- ---------------------------------------------------------------------------
create or replace function public.increment_deal_marketplace_click(p_deal_id uuid)
returns void
language sql
security definer
set search_path = public
set row_security = off
as $$
  update public.deals d
  set deal_click_count = d.deal_click_count + 1
  where d.id = p_deal_id
    and public.vendor_is_publicly_visible(d.vendor_id);
$$;

revoke all on function public.increment_deal_marketplace_click(uuid) from public;
grant execute on function public.increment_deal_marketplace_click(uuid) to anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Admin: pin deal in marketplace carousel (1 = first; null = unpinned).
-- ---------------------------------------------------------------------------
create or replace function public.admin_set_deal_marketplace_featured_rank(
  p_deal_id uuid,
  p_rank int
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

  if p_rank is not null and (p_rank < 1 or p_rank > 99) then
    raise exception 'featured rank must be between 1 and 99 or null';
  end if;

  update public.deals
  set marketplace_featured_rank = p_rank
  where id = p_deal_id;

  if not found then
    raise exception 'deal not found';
  end if;
end;
$$;

revoke all on function public.admin_set_deal_marketplace_featured_rank(uuid, int) from public;
grant execute on function public.admin_set_deal_marketplace_featured_rank(uuid, int) to authenticated, service_role;

-- Backfill: give existing deals all approved listing markets when vendor has approvals.
update public.deals d
set listing_market_slugs = public.vendor_approved_listing_market_slugs(d.vendor_id)
where cardinality(public.vendor_approved_listing_market_slugs(d.vendor_id)) > 0;

-- Sync region_keys from markets for backfilled rows
update public.deals d
set region_keys = (
  select coalesce(
    array_agg(distinct upper(left(trim(lm.region_key), 2)) order by upper(left(trim(lm.region_key), 2))),
    '{}'::text[]
  )
  from unnest(d.listing_market_slugs) as u(slug)
  join public.listing_markets lm on lm.slug = u.slug
  where lm.region_key is not null
    and length(trim(lm.region_key)) >= 2
    and upper(left(trim(lm.region_key), 2)) ~ '^[A-Z]{2}$'
)
where cardinality(d.listing_market_slugs) > 0;
