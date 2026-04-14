-- Fix: handle_new_user() must not block users created in the Dashboard, invites,
-- or OAuth when raw_user_meta_data has no CannaHub signup fields.
--
-- Strict 21+ + birthdate path ONLY when the app sent both age_verified_ack and birthdate.
-- Otherwise insert a minimal profile (age_verified stays false until they complete profile / use app signup).

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
    -- Dashboard, magic link, OAuth, etc.: no age gate in metadata
    insert into public.profiles (id, full_name)
    values (new.id, fn)
    on conflict (id) do update set
      full_name = coalesce(
        nullif(excluded.full_name, ''),
        public.profiles.full_name
      );
  end if;

  return new;
end;
$$;
