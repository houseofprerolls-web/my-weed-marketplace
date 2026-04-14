-- Sign-up failed with "Database error saving new user" when handle_new_user() INSERT into
-- public.profiles hit RLS (auth.uid() is null inside the auth.users trigger) or profiles
-- expected email/role from the app signup payload.
--
-- Fix: SECURITY DEFINER + SET row_security = off for the insert; persist new.email and
-- validated role from raw_user_meta_data (GreenZone app sends role: customer|vendor|admin).

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, auth
set row_security = off
as $$
declare
  meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  fn text := nullif(trim(coalesce(meta->>'full_name', '')), '');
  bd text := meta->>'birthdate';
  bd_date date;
  ack_ok boolean := (
    coalesce(meta->>'age_verified_ack', '') in ('true', 't', '1')
    or (meta->'age_verified_ack') = to_jsonb(true)
  );
  strict_signup boolean;
  role_raw text := lower(trim(coalesce(meta->>'role', '')));
  role_out text;
begin
  if role_raw in ('consumer', 'customer', 'vendor', 'admin') then
    role_out := role_raw;
  else
    role_out := 'customer';
  end if;

  strict_signup := ack_ok
    and bd is not null
    and bd <> ''
    and bd ~ '^\d{4}-\d{2}-\d{2}$';

  if strict_signup then
    bd_date := bd::date;

    if bd_date > (current_date - interval '21 years')::date then
      raise exception 'You must be at least 21 years old' using errcode = '23514';
    end if;

    insert into public.profiles (
      id,
      email,
      role,
      full_name,
      birthdate,
      age_verified,
      birthdate_confirmed_at
    )
    values (
      new.id,
      new.email,
      role_out,
      fn,
      bd_date,
      true,
      now()
    )
    on conflict (id) do update set
      email = coalesce(excluded.email, public.profiles.email),
      role = coalesce(excluded.role, public.profiles.role),
      full_name = coalesce(excluded.full_name, public.profiles.full_name),
      birthdate = coalesce(excluded.birthdate, public.profiles.birthdate),
      age_verified = public.profiles.age_verified or excluded.age_verified,
      birthdate_confirmed_at = coalesce(
        public.profiles.birthdate_confirmed_at,
        excluded.birthdate_confirmed_at
      );
  else
    insert into public.profiles (id, email, role, full_name)
    values (new.id, new.email, role_out, fn)
    on conflict (id) do update set
      email = coalesce(nullif(excluded.email, ''), public.profiles.email),
      full_name = coalesce(
        nullif(excluded.full_name, ''),
        public.profiles.full_name
      );
  end if;

  return new;
end;
$$;

comment on function public.handle_new_user() is
  'After insert on auth.users: create public.profiles row. row_security=off so RLS does not block; sets email and role from signup metadata.';
