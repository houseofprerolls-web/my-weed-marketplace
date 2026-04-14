-- ID upload RPC
-- Prevent failures from recursive RLS policy evaluation on `public.profiles`
-- by updating identity document fields inside a security definer function
-- with row security disabled.

create or replace function public.customer_set_id_document(
  p_id_document_url text,
  p_id_document_type text
)
returns void
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
declare
  updated boolean;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  update public.profiles
  set
    id_document_url = p_id_document_url,
    id_document_type = p_id_document_type,
    id_document_uploaded_at = now(),
    id_verified = false,
    updated_at = now()
  where id = auth.uid();

  updated := found;
  if not updated then
    raise exception 'profile not found';
  end if;
end;
$$;

grant execute on function public.customer_set_id_document(text, text) to authenticated;

