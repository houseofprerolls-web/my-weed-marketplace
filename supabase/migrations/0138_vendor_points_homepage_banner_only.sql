-- Vendor points: only unlock homepage top banner with points (not Discover/Deals/Map rails or Smokers Club strip).

-- Canonical catalog row for point-based banner unlocks.
insert into public.vendor_points_redemption_catalog (id, kind, label, cost_points, metadata, sort_order, active)
values (
  'e7b2c8f4-9a1d-4f3e-b7c2-0d1e2f3a4b5c'::uuid,
  'banner_placement_unlock',
  'Homepage top banner',
  500,
  '{"placement_keys":["homepage_hero"]}'::jsonb,
  10,
  true
)
on conflict (id) do update
set
  kind = excluded.kind,
  label = excluded.label,
  cost_points = excluded.cost_points,
  metadata = excluded.metadata,
  sort_order = excluded.sort_order,
  active = excluded.active,
  updated_at = now();

update public.vendor_points_redemption_catalog
set active = false, updated_at = now()
where kind = 'banner_placement_unlock'
  and id <> 'e7b2c8f4-9a1d-4f3e-b7c2-0d1e2f3a4b5c'::uuid;

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

  if pk is distinct from 'homepage_hero' then
    raise exception 'Only the homepage top banner can be unlocked with points';
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
