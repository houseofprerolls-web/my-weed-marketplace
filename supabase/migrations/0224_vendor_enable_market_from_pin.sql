-- Allow vendor staff to approve their own operating area when placing a map pin in that ZIP.
-- Called from the vendor map UI after reverse-geocoding a US ZIP (security definer bypasses RLS).

create or replace function public.vendor_enable_market_from_pin(p_vendor_id uuid, p_postcode text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  z text;
  pref text;
  m_id uuid;
begin
  if not public.vendor_staff_may_manage(p_vendor_id) then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  z := regexp_replace(coalesce(p_postcode, ''), '\D', '', 'g');
  if length(z) < 5 then
    return jsonb_build_object('ok', false, 'reason', 'invalid_zip');
  end if;

  pref := left(z, 3);

  select m.market_id
  into m_id
  from public.market_zip_prefixes m
  where m.prefix = pref
  limit 1;

  if m_id is null then
    select lm.id
    into m_id
    from public.listing_markets lm
    where lm.slug = 'california-other'
    limit 1;
  end if;

  if m_id is null then
    return jsonb_build_object('ok', false, 'reason', 'no_market');
  end if;

  insert into public.vendor_market_operations (vendor_id, market_id, approved, note)
  values (p_vendor_id, m_id, true, 'Enabled from map pin')
  on conflict (vendor_id, market_id) do update
  set
    approved = true,
    note = coalesce(nullif(public.vendor_market_operations.note, ''), excluded.note);

  return jsonb_build_object('ok', true, 'market_id', m_id);
end;
$$;

comment on function public.vendor_enable_market_from_pin(uuid, text) is
  'Vendor staff: upsert vendor_market_operations.approved=true for the listing_market implied by ZIP (prefix map or california-other).';

revoke all on function public.vendor_enable_market_from_pin(uuid, text) from public;
grant execute on function public.vendor_enable_market_from_pin(uuid, text) to authenticated;
