-- One bestseller product per Smokers Club vendor by total units ordered (from orders.items), per category set.

create or replace function public.smokers_club_category_bestsellers(p_categories text[])
returns table (vendor_id uuid, product_id uuid, units_ordered bigint)
language sql
stable
security definer
set search_path = public
as $$
  with line_items as (
    select
      o.vendor_id,
      (elem ->> 'product_id')::uuid as product_id,
      coalesce(
        case
          when trim(coalesce(elem ->> 'quantity', '')) ~ '^[0-9]+$'
            then trim(elem ->> 'quantity')::int
        end,
        case
          when trim(coalesce(elem ->> 'qty', '')) ~ '^[0-9]+$'
            then trim(elem ->> 'qty')::int
        end,
        1
      ) as qty
    from public.orders o,
         lateral jsonb_array_elements(coalesce(o.items, '[]'::jsonb)) as elem
    where o.status is distinct from 'cancelled'
      and coalesce(trim(elem ->> 'product_id'), '') <> ''
      and (elem ->> 'product_id')
        ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
  ),
  product_units as (
    select
      li.vendor_id,
      li.product_id,
      sum(li.qty)::bigint as units
    from line_items li
    join public.products p on p.id = li.product_id
    join public.vendors v on v.id = li.vendor_id
    where p.category = any(p_categories)
      and cardinality(p_categories) > 0
      and v.smokers_club_eligible is true
      and v.is_live is true
      and v.license_status = 'approved'
      and p.in_stock is true
    group by li.vendor_id, li.product_id
  ),
  ranked as (
    select
      pu.vendor_id,
      pu.product_id,
      pu.units,
      row_number() over (
        partition by pu.vendor_id
        order by pu.units desc, pu.product_id
      ) as rn
    from product_units pu
  )
  select r.vendor_id, r.product_id, r.units as units_ordered
  from ranked r
  where r.rn = 1;
$$;

comment on function public.smokers_club_category_bestsellers(text[]) is
  'Top-ordered in-stock product per Smokers Club vendor for given product categories; SECURITY DEFINER.';

grant execute on function public.smokers_club_category_bestsellers(text[]) to anon;
grant execute on function public.smokers_club_category_bestsellers(text[]) to authenticated;
grant execute on function public.smokers_club_category_bestsellers(text[]) to service_role;
