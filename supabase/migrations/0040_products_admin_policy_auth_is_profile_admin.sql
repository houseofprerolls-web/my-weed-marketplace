-- Align products admin policy with shared admin helper (0037).
-- Skips cleanly when `public.products` does not exist (apply 0001_init or your base schema first).

do $products_admin_policy_0040$
begin
  if to_regclass('public.products') is null then
    raise notice
      '0040: public.products does not exist — skipped products_admin_all policy. Apply supabase/migrations/0001_init.sql (or a migration that creates `products`), then run migrations again.';
    return;
  end if;

  drop policy if exists products_admin_all on public.products;

  create policy products_admin_all
    on public.products for all
    using (public.auth_is_profile_admin())
    with check (public.auth_is_profile_admin());
end;
$products_admin_policy_0040$;
