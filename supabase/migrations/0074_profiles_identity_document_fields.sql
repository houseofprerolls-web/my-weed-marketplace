-- Customers upload ID once to their profile; the photo is copied into each order's
-- `order_documents` record for vendor review.

alter table public.profiles
  add column if not exists id_document_url text,
  add column if not exists id_document_type text,
  add column if not exists id_document_uploaded_at timestamptz;

-- Keep the document type constrained if provided.
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'profiles_id_document_type_check'
  ) then
    alter table public.profiles
      add constraint profiles_id_document_type_check
      check (id_document_type is null or id_document_type in ('government_id', 'passport', 'photo_id'));
  end if;
end $$;

