-- One-time loyalty bonus for adding the web app to the home screen (mobile shoppers).

alter table public.profiles
  add column if not exists pwa_homescreen_loyalty_claimed_at timestamptz,
  add column if not exists pwa_homescreen_loyalty_dismissed_at timestamptz;

comment on column public.profiles.pwa_homescreen_loyalty_claimed_at is
  'Set when the user claimed the one-time PWA install loyalty bonus (50 pts).';
comment on column public.profiles.pwa_homescreen_loyalty_dismissed_at is
  'Set when the user declined the PWA install prompt (no points).';

create or replace function public.datreehouse_dismiss_pwa_homescreen_loyalty()
returns void
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'not authenticated';
  end if;

  update public.profiles
  set
    pwa_homescreen_loyalty_dismissed_at = now(),
    updated_at = now()
  where id = uid
    and pwa_homescreen_loyalty_claimed_at is null
    and pwa_homescreen_loyalty_dismissed_at is null;
end;
$$;

revoke all on function public.datreehouse_dismiss_pwa_homescreen_loyalty() from public;
grant execute on function public.datreehouse_dismiss_pwa_homescreen_loyalty() to authenticated;

create or replace function public.datreehouse_claim_pwa_homescreen_loyalty()
returns jsonb
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
declare
  uid uuid := auth.uid();
  created_ts timestamptz;
  bonus_points constant bigint := 50;
begin
  if uid is null then
    return jsonb_build_object('ok', false, 'reason', 'not_authenticated');
  end if;

  perform pg_advisory_xact_lock(hashtext('datreehouse_pwa_homescreen_loyalty:' || uid::text));

  select p.created_at into created_ts
  from public.profiles p
  where p.id = uid;

  if not found then
    return jsonb_build_object('ok', false, 'reason', 'no_profile');
  end if;

  if not exists (
    select 1 from public.profiles p2
    where p2.id = uid and p2.role = 'customer'
  ) then
    return jsonb_build_object('ok', false, 'reason', 'customers_only');
  end if;

  if created_ts < (now() - interval '90 days') then
    return jsonb_build_object('ok', false, 'reason', 'signup_window_closed');
  end if;

  if exists (
    select 1 from public.profiles p3
    where p3.id = uid and p3.pwa_homescreen_loyalty_claimed_at is not null
  ) then
    return jsonb_build_object('ok', false, 'reason', 'already_claimed');
  end if;

  insert into public.datreehouse_loyalty_ledger (consumer_id, points, order_id)
  values (uid, bonus_points, null);

  update public.profiles
  set
    pwa_homescreen_loyalty_claimed_at = now(),
    updated_at = now()
  where id = uid;

  return jsonb_build_object('ok', true, 'points', bonus_points);
end;
$$;

revoke all on function public.datreehouse_claim_pwa_homescreen_loyalty() from public;
grant execute on function public.datreehouse_claim_pwa_homescreen_loyalty() to authenticated;
