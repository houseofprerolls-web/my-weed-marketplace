-- Customer profile update + fetch RPCs that bypass recursive RLS issues
-- on public.profiles.

create or replace function public.customer_update_profile(
  p_user_id uuid,
  p_full_name text,
  p_phone text,
  p_city text,
  p_zip_code text,
  p_avatar_url text,
  p_bio text
)
returns void
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
begin
  if auth.uid() is null or auth.uid() <> p_user_id then
    raise exception 'not allowed';
  end if;

  update public.profiles
  set
    full_name = p_full_name,
    phone = p_phone,
    city = p_city,
    zip_code = p_zip_code,
    avatar_url = p_avatar_url,
    bio = p_bio,
    updated_at = now()
  where id = p_user_id;

  if not found then
    raise exception 'profile not found';
  end if;
end;
$$;

grant execute on function public.customer_update_profile(
  uuid, text, text, text, text, text, text
) to authenticated;

create or replace function public.customer_get_profile(p_user_id uuid)
returns jsonb
language sql
security definer
set search_path = public
set row_security = off
as $$
  select to_jsonb(p)
  from public.profiles p
  where p.id = p_user_id;
$$;

grant execute on function public.customer_get_profile(uuid) to authenticated;

