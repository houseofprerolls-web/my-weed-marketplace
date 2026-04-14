-- Public /brands directory: sort verified brands by master-catalog product count (desc), then name.
-- Brand page managers: read catalog_products for assigned brands (stats + future tooling).

create or replace function public.brand_directory_list_verified(
  p_search text,
  p_limit int,
  p_offset int
)
returns table (
  id uuid,
  name text,
  slug text,
  logo_url text,
  tagline text,
  hero_image_url text,
  page_theme text,
  catalog_item_count bigint
)
language sql
stable
security definer
set search_path = public
set row_security = off
as $$
  select
    b.id,
    b.name,
    b.slug,
    b.logo_url,
    b.tagline,
    b.hero_image_url,
    b.page_theme,
    coalesce(
      (
        select count(*)::bigint
        from public.catalog_products cp
        where cp.brand_id = b.id
      ),
      0
    ) as catalog_item_count
  from public.brands b
  where b.verified = true
    and (
      coalesce(nullif(trim(p_search), ''), '') = ''
      or b.name ilike (
        '%'
        || replace(replace(trim(p_search), '%', ''), '_', '')
        || '%'
      )
    )
  order by catalog_item_count desc, b.name asc
  limit greatest(1, least(coalesce(p_limit, 12), 100))
  offset greatest(0, coalesce(p_offset, 0));
$$;

comment on function public.brand_directory_list_verified(text, int, int) is
  'Verified brands for /brands directory; ordered by catalog_products count desc, name asc.';

create or replace function public.brand_directory_count_verified(p_search text)
returns bigint
language sql
stable
security definer
set search_path = public
set row_security = off
as $$
  select count(*)::bigint
  from public.brands b
  where b.verified = true
    and (
      coalesce(nullif(trim(p_search), ''), '') = ''
      or b.name ilike (
        '%'
        || replace(replace(trim(p_search), '%', ''), '_', '')
        || '%'
      )
    );
$$;

comment on function public.brand_directory_count_verified(text) is
  'Row count for brand_directory_list_verified with the same p_search filter.';

revoke all on function public.brand_directory_list_verified(text, int, int) from public;
revoke all on function public.brand_directory_count_verified(text) from public;
grant execute on function public.brand_directory_list_verified(text, int, int) to anon, authenticated;
grant execute on function public.brand_directory_count_verified(text) to anon, authenticated;

drop policy if exists catalog_products_brand_page_manager_select on public.catalog_products;
create policy catalog_products_brand_page_manager_select
  on public.catalog_products for select
  to authenticated
  using (
    exists (
      select 1
      from public.brand_page_managers m
      where m.brand_id = catalog_products.brand_id
        and m.user_id = auth.uid()
    )
  );

comment on policy catalog_products_brand_page_manager_select on public.catalog_products is
  'Assigned brand page editors can read master-catalog rows for their brand(s).';
