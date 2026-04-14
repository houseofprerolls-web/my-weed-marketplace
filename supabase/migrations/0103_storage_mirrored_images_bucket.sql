-- Public CDN bucket for PNGs mirrored from remote URLs (strains encyclopedia, brands, catalog CSV).
-- Uploads are intended to use the service role (bypasses RLS); anon/authenticated get read-only access.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'mirrored-images',
  'mirrored-images',
  true,
  15728640,
  array['image/png']::text[]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists mirrored_images_public_read on storage.objects;
create policy mirrored_images_public_read
  on storage.objects for select
  using (bucket_id = 'mirrored-images');
