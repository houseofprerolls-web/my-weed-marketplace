/*
  Run after 01 + 02.

  1) Adds columns the Next.js app expects on public.profiles (safe if already present).
  2) Allows role = 'customer' (app sends it; core schema only had consumer/vendor/admin).
  3) Creates handle_new_user on auth.users so new signups get a profile row without strict 21+ metadata.
*/

-- App-facing columns (greenzone-bolt AuthContext)
alter table public.profiles add column if not exists email text;
alter table public.profiles add column if not exists username text;
alter table public.profiles add column if not exists phone text;
alter table public.profiles add column if not exists city text;
alter table public.profiles add column if not exists zip_code text;
alter table public.profiles add column if not exists id_verified boolean not null default false;
alter table public.profiles add column if not exists updated_at timestamptz not null default now();

-- Let the app use role 'customer' as well as 'consumer'
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles add constraint profiles_role_check
  check (role in ('consumer', 'customer', 'vendor', 'admin'));

-- Relaxed new-user handler (from migration 0016)
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
  ack_ok boolean := (
    coalesce(meta->>'age_verified_ack', '') in ('true', 't', '1')
    or (meta->'age_verified_ack') = to_jsonb(true)
  );
  strict_signup boolean;
begin
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
  else
    insert into public.profiles (id, full_name, email)
    values (new.id, fn, new.email)
    on conflict (id) do update set
      full_name = coalesce(
        nullif(excluded.full_name, ''),
        public.profiles.full_name
      ),
      email = coalesce(excluded.email, public.profiles.email);
  end if;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();
