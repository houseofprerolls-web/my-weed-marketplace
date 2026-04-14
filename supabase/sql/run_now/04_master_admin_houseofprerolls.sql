/*
  Run after 03.

  - Keeps houseofprerolls@gmail.com as admin whenever their profile is inserted/updated.
  - Upserts a profile row if that user already exists in auth.users but has no profile yet.
*/

create or replace function public.sync_profile_role_from_auth_email()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  user_email text;
begin
  select lower(u.email) into user_email
  from auth.users u
  where u.id = new.id;

  if user_email = lower(trim('houseofprerolls@gmail.com')) then
    new.role := 'admin';
  elsif new.role is null then
    new.role := 'consumer';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_profiles_sync_role_from_email on public.profiles;
create trigger trg_profiles_sync_role_from_email
before insert or update on public.profiles
for each row
execute function public.sync_profile_role_from_auth_email();

-- Backfill: create or promote profile for existing Auth user
insert into public.profiles (id, role, full_name, email)
select
  u.id,
  'admin',
  coalesce(nullif(trim(u.raw_user_meta_data->>'full_name'), ''), 'Admin'),
  u.email
from auth.users u
where lower(trim(u.email)) = lower(trim('houseofprerolls@gmail.com'))
on conflict (id) do update set
  role = 'admin',
  email = coalesce(excluded.email, public.profiles.email),
  full_name = coalesce(nullif(excluded.full_name, ''), public.profiles.full_name);
