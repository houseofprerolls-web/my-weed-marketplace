-- Master admin account mapping by auth email.
-- Ensures houseofprerolls@gmail.com is always admin in public.profiles.

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

  if user_email = 'houseofprerolls@gmail.com' then
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

-- One-time backfill for existing user rows.
update public.profiles p
set role = 'admin'
from auth.users u
where u.id = p.id
  and lower(u.email) = 'houseofprerolls@gmail.com';

