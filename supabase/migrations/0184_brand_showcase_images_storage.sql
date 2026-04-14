-- Public images for brand showcase (logo + hero); managers and admins may upload under {brand_id}/.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'brand-showcase-images',
  'brand-showcase-images',
  true,
  8388608,
  array['image/png', 'image/jpeg', 'image/webp']::text[]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists brand_showcase_images_public_read on storage.objects;
create policy brand_showcase_images_public_read
  on storage.objects for select
  using (bucket_id = 'brand-showcase-images');

drop policy if exists brand_showcase_images_authed_insert on storage.objects;
create policy brand_showcase_images_authed_insert
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'brand-showcase-images'
    and (
      public.auth_profiles_role_is_admin()
      or public.auth_is_profile_admin()
      or exists (
        select 1
        from public.brand_page_managers m
        where m.user_id = auth.uid()
          and m.brand_id::text = (storage.foldername(name))[1]
      )
    )
  );

drop policy if exists brand_showcase_images_authed_update on storage.objects;
create policy brand_showcase_images_authed_update
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'brand-showcase-images'
    and (
      public.auth_profiles_role_is_admin()
      or public.auth_is_profile_admin()
      or exists (
        select 1
        from public.brand_page_managers m
        where m.user_id = auth.uid()
          and m.brand_id::text = (storage.foldername(name))[1]
      )
    )
  )
  with check (
    bucket_id = 'brand-showcase-images'
    and (
      public.auth_profiles_role_is_admin()
      or public.auth_is_profile_admin()
      or exists (
        select 1
        from public.brand_page_managers m
        where m.user_id = auth.uid()
          and m.brand_id::text = (storage.foldername(name))[1]
      )
    )
  );

drop policy if exists brand_showcase_images_authed_delete on storage.objects;
create policy brand_showcase_images_authed_delete
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'brand-showcase-images'
    and (
      public.auth_profiles_role_is_admin()
      or public.auth_is_profile_admin()
      or exists (
        select 1
        from public.brand_page_managers m
        where m.user_id = auth.uid()
          and m.brand_id::text = (storage.foldername(name))[1]
      )
    )
  );
