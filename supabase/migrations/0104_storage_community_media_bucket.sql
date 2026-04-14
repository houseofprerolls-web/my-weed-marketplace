-- Public CDN bucket for community feed + chat uploads (photos + short videos).
-- Uploads are intended to be performed by authenticated users via signed upload URLs.
-- We allow public read so media can render without auth in public contexts.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'community-media',
  'community-media',
  true,
  26214400, -- 25MB
  array[
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'video/mp4',
    'video/webm',
    'video/quicktime'
  ]::text[]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Public read
drop policy if exists community_media_public_read on storage.objects;
create policy community_media_public_read
  on storage.objects for select
  using (bucket_id = 'community-media');

-- Authenticated users can upload objects they own
drop policy if exists community_media_owner_insert on storage.objects;
create policy community_media_owner_insert
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'community-media' and owner = auth.uid());

drop policy if exists community_media_owner_update on storage.objects;
create policy community_media_owner_update
  on storage.objects for update
  to authenticated
  using (bucket_id = 'community-media' and owner = auth.uid())
  with check (bucket_id = 'community-media' and owner = auth.uid());

drop policy if exists community_media_owner_delete on storage.objects;
create policy community_media_owner_delete
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'community-media' and owner = auth.uid());

