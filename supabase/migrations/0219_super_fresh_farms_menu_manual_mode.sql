-- Super Fresh Farms: public menu uses `vendor_menu_settings.menu_source_mode`.
-- In `pos` mode only POS-linked rows (pos_provider + pos_external_id) show — manual CSV imports would be hidden.
-- Force `manual` so seeded / hand-edited `products` appear on the storefront.

do $body$
declare
  v_id uuid;
begin
  if to_regclass('public.vendor_menu_settings') is null then
    raise notice '0219: public.vendor_menu_settings missing — skipped';
    return;
  end if;

  select v.id into v_id
  from public.vendors v
  where lower(v.slug) in ('super-fresh-farms', 'superfresh-farms', 'super-fresh')
     or lower(v.name) like '%super%fresh%farm%'
  order by case when lower(v.slug) = 'super-fresh-farms' then 0 when lower(v.slug) = 'superfresh-farms' then 1 else 2 end
  limit 1;

  if v_id is null then
    raise notice '0219: No vendor matched for Super Fresh Farms — skipped';
    return;
  end if;

  insert into public.vendor_menu_settings (vendor_id, menu_source_mode)
  values (v_id, 'manual')
  on conflict (vendor_id) do update
    set menu_source_mode = excluded.menu_source_mode,
        updated_at = now();
end;
$body$;
