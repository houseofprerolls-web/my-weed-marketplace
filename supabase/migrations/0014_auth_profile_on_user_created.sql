-- Create/update public.profiles when a new auth user is created.
-- Reads signup metadata (user_metadata) set from the app: full_name, birthdate, age_verified_ack.
-- Enforces 21+ using birthdate (server-side).
--
-- NOTE: This version required metadata for every signup and breaks Dashboard-created users.
-- Apply 0016_fix_handle_new_user_non_app_signups.sql after this migration.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  fn text := nullif(trim(coalesce(meta->>'full_name', '')), '');
  bd text := meta->>'birthdate';
  bd_date date;
begin
  if not (
    coalesce(meta->>'age_verified_ack', '') in ('true', 't', '1')
    or (meta->'age_verified_ack') = to_jsonb(true)
  ) then
    raise exception 'Age confirmation is required' using errcode = '23514';
  end if;

  if bd is null or bd !~ '^\d{4}-\d{2}-\d{2}$' then
    raise exception 'A valid birthdate is required' using errcode = '23514';
  end if;

  bd_date := bd::date;

  if bd_date > (current_date - interval '21 years')::date then
    raise exception 'You must be at least 21 years old' using errcode = '23514';
  end if;

  insert into public.profiles (
    id,
    full_name,
    birthdate,
    age_verified,
    birthdate_confirmed_at
  )
  values (
    new.id,
    fn,
    bd_date,
    true,
    now()
  )
  on conflict (id) do update set
    full_name = coalesce(excluded.full_name, public.profiles.full_name),
    birthdate = coalesce(excluded.birthdate, public.profiles.birthdate),
    age_verified = public.profiles.age_verified or excluded.age_verified,
    birthdate_confirmed_at = coalesce(
      public.profiles.birthdate_confirmed_at,
      excluded.birthdate_confirmed_at
    );

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();
