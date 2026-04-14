-- Usernames at sign-up, sync to user_profiles for feed/reviews, and email lookup for password login.

-- Case-insensitive unique usernames (replaces simple unique(username) when present).
alter table public.user_profiles drop constraint if exists user_profiles_username_unique;

create unique index if not exists user_profiles_username_lower_uidx
  on public.user_profiles (lower(trim(username)))
  where length(trim(username)) > 0;

create unique index if not exists profiles_username_lower_uidx
  on public.profiles (lower(trim(username)))
  where username is not null and length(trim(username)) > 0;

-- Resolve auth email for Supabase signInWithPassword (identifier = email or username).
create or replace function public.lookup_email_for_login(p_identifier text)
returns text
language plpgsql
security definer
set search_path = public, auth
set row_security = off
as $$
declare
  v text := trim(coalesce(p_identifier, ''));
  out_email text;
begin
  if v = '' then
    return null;
  end if;
  if position('@' in v) > 0 then
    select u.email::text into out_email
    from auth.users u
    where lower(trim(u.email)) = lower(v)
    limit 1;
  else
    select u.email::text into out_email
    from auth.users u
    inner join public.profiles p on p.id = u.id
    where lower(trim(p.username)) = lower(v)
    limit 1;
  end if;
  return out_email;
end;
$$;

revoke all on function public.lookup_email_for_login(text) from public;
grant execute on function public.lookup_email_for_login(text) to anon, authenticated;

comment on function public.lookup_email_for_login(text) is
  'Public: map email or profiles.username to auth.users.email for client password sign-in.';

-- Sign-up: persist username in profiles + user_profiles (feed / reviews embeds).
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
  login_username text;
  meta_user text := nullif(trim(lower(coalesce(meta->>'username', ''))), '');
begin
  if role_raw in ('consumer', 'customer', 'vendor', 'admin') then
    role_out := role_raw;
  else
    role_out := 'customer';
  end if;

  if meta_user is not null and meta_user <> '' then
    if meta_user !~ '^[a-z0-9_]{3,30}$' then
      raise exception 'Username must be 3–30 characters (lowercase letters, numbers, underscore only).' using errcode = '23514';
    end if;
    login_username := meta_user;
  else
    login_username := 'member_' || substring(replace(new.id::text, '-', ''), 1, 12);
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
      username,
      birthdate,
      age_verified,
      birthdate_confirmed_at
    )
    values (
      new.id,
      new.email,
      role_out,
      fn,
      login_username,
      bd_date,
      true,
      now()
    )
    on conflict (id) do update set
      email = coalesce(excluded.email, public.profiles.email),
      role = coalesce(excluded.role, public.profiles.role),
      full_name = coalesce(excluded.full_name, public.profiles.full_name),
      username = coalesce(nullif(excluded.username, ''), public.profiles.username),
      birthdate = coalesce(excluded.birthdate, public.profiles.birthdate),
      age_verified = public.profiles.age_verified or excluded.age_verified,
      birthdate_confirmed_at = coalesce(
        public.profiles.birthdate_confirmed_at,
        excluded.birthdate_confirmed_at
      );
  else
    insert into public.profiles (id, email, role, full_name, username)
    values (new.id, new.email, role_out, fn, login_username)
    on conflict (id) do update set
      email = coalesce(nullif(excluded.email, ''), public.profiles.email),
      full_name = coalesce(
        nullif(excluded.full_name, ''),
        public.profiles.full_name
      ),
      username = coalesce(nullif(excluded.username, ''), public.profiles.username);
  end if;

  insert into public.user_profiles (id, username)
  values (new.id, login_username)
  on conflict (id) do update set
    username = excluded.username,
    updated_at = now();

  return new;
end;
$$;

comment on function public.handle_new_user() is
  'After insert on auth.users: profiles + user_profiles; username from raw_user_meta_data.username or member_* fallback.';
