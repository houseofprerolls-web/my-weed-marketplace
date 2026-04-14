-- Junior admins (profiles.role = admin_jr): same platform powers as admin for RLS paths
-- that use auth_profiles_role_is_admin(). Only master accounts (bootstrap emails) may
-- promote or demote via master_promote_jr_admin.

alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles add constraint profiles_role_check
  check (role in ('consumer', 'customer', 'vendor', 'admin', 'admin_jr'));

create or replace function public.auth_profiles_role_is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
set row_security = off
as $$
  select coalesce(
    auth.uid() is not null
    and exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.role in ('admin', 'admin_jr')
    ),
    false
  );
$$;

comment on function public.auth_profiles_role_is_admin() is
  'True when auth.uid() has profiles.role admin or admin_jr; row_security=off avoids RLS recursion.';

-- Master JWT parity for both bootstrap accounts (used alongside auth_profiles_role_is_admin in policies).
create or replace function public.auth_is_profile_admin()
returns boolean
language sql
stable
security definer
set search_path = public, auth
set row_security = off
as $$
  select exists (
    select 1
    from auth.users u
    where u.id = auth.uid()
      and lower(u.email) in (
        'houseofprerolls@gmail.com',
        'bballer2k74@gmail.com'
      )
  );
$$;

grant execute on function public.auth_is_profile_admin() to authenticated;
grant execute on function public.auth_is_profile_admin() to anon;

create or replace function public.auth_is_master_admin()
returns boolean
language sql
stable
security definer
set search_path = public, auth
set row_security = off
as $$
  select exists (
    select 1
    from auth.users u
    where u.id = auth.uid()
      and lower(u.email) in (
        'houseofprerolls@gmail.com',
        'bballer2k74@gmail.com'
      )
  );
$$;

revoke all on function public.auth_is_master_admin() from public;
grant execute on function public.auth_is_master_admin() to authenticated, service_role;

comment on function public.auth_is_master_admin() is
  'True when auth.uid() is a bootstrap master admin (auth.users email allowlist).';

create or replace function public.master_promote_jr_admin(p_target_user_id uuid, p_promote boolean)
returns void
language plpgsql
security definer
set search_path = public, auth
set row_security = off
as $$
declare
  target_email text;
  n int;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  if not public.auth_is_master_admin() then
    raise exception 'only master admins can assign junior admins';
  end if;

  select lower(u.email) into target_email
  from auth.users u
  where u.id = p_target_user_id;

  if target_email is null then
    raise exception 'user not found';
  end if;

  if target_email in ('houseofprerolls@gmail.com', 'bballer2k74@gmail.com') then
    raise exception 'cannot change master admin role';
  end if;

  if p_promote then
    update public.profiles
    set role = 'admin_jr', updated_at = now()
    where id = p_target_user_id;

    get diagnostics n = row_count;
    if n = 0 then
      raise exception 'profile not found';
    end if;
  else
    update public.profiles
    set role = 'customer', updated_at = now()
    where id = p_target_user_id
      and role = 'admin_jr';

    get diagnostics n = row_count;
    if n = 0 then
      raise exception 'target is not a junior admin';
    end if;
  end if;
end;
$$;

revoke all on function public.master_promote_jr_admin(uuid, boolean) from public;
grant execute on function public.master_promote_jr_admin(uuid, boolean) to authenticated;

comment on function public.master_promote_jr_admin(uuid, boolean) is
  'Master admins only: set profiles.role to admin_jr (promote) or customer (demote from admin_jr).';
