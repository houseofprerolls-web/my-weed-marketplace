-- Promote bballer2k74@gmail.com to admin (profiles.role + trigger parity with master admin).

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

  if user_email in (
    'houseofprerolls@gmail.com',
    'bballer2k74@gmail.com'
  ) then
    new.role := 'admin';
  elsif new.role is null then
    new.role := 'consumer';
  end if;

  return new;
end;
$$;

update public.profiles p
set role = 'admin'
from auth.users u
where u.id = p.id
  and lower(u.email) = 'bballer2k74@gmail.com';
