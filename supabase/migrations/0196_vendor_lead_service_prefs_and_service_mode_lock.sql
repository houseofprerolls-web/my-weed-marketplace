-- Lead intake: requested public lanes. Vendors: lock public service mode after establishment (incl. auto).

-- ---------------------------------------------------------------------------
-- vendor_lead_applications: applicant-selected lanes (at least one)
-- ---------------------------------------------------------------------------

alter table public.vendor_lead_applications
  add column if not exists requested_delivery boolean not null default true;

alter table public.vendor_lead_applications
  add column if not exists requested_storefront boolean not null default false;

comment on column public.vendor_lead_applications.requested_delivery is
  'Applicant wants to be listed for delivery when approved.';

comment on column public.vendor_lead_applications.requested_storefront is
  'Applicant wants to be listed for storefront / pickup when approved.';

alter table public.vendor_lead_applications
  drop constraint if exists vendor_lead_applications_requested_lanes_check;

alter table public.vendor_lead_applications
  add constraint vendor_lead_applications_requested_lanes_check
  check (requested_delivery = true or requested_storefront = true);

-- ---------------------------------------------------------------------------
-- vendors.service_mode_locked — after true, trigger preserves offers_* unless admin override paths fire
-- ---------------------------------------------------------------------------

alter table public.vendors
  add column if not exists service_mode_locked boolean not null default false;

comment on column public.vendors.service_mode_locked is
  'When true, public delivery/storefront flags are frozen unless admin_service_mode forces a lane or allow_both is set.';

update public.vendors
set service_mode_locked = true
where coalesce(service_mode_locked, false) = false;

-- ---------------------------------------------------------------------------
-- Trigger: admin force → allow_both dual lane → locked preserve → explicit locked insert → auto lane → establish lock
-- ---------------------------------------------------------------------------

create or replace function public.vendors_enforce_service_mode_from_address()
returns trigger
language plpgsql
as $$
begin
  -- Admin single-lane overrides always win
  if coalesce(new.admin_service_mode, 'auto') = 'force_delivery' then
    new.allow_both_storefront_and_delivery := false;
    new.offers_delivery := true;
    new.offers_storefront := false;
    return new;
  end if;

  if coalesce(new.admin_service_mode, 'auto') = 'force_storefront' then
    new.allow_both_storefront_and_delivery := false;
    new.offers_delivery := false;
    new.offers_storefront := true;
    return new;
  end if;

  -- Dual-lane (admin or lead approval)
  if coalesce(new.allow_both_storefront_and_delivery, false) then
    new.offers_delivery := true;
    new.offers_storefront := true;
    return new;
  end if;

  -- Frozen row: keep public lanes unless admin changes override columns
  if tg_op = 'UPDATE'
     and coalesce(old.service_mode_locked, false)
     and coalesce(new.service_mode_locked, false)
     and new.admin_service_mode is not distinct from old.admin_service_mode
     and new.allow_both_storefront_and_delivery is not distinct from old.allow_both_storefront_and_delivery then
    new.offers_delivery := old.offers_delivery;
    new.offers_storefront := old.offers_storefront;
    new.allow_both_storefront_and_delivery := old.allow_both_storefront_and_delivery;
    return new;
  end if;

  -- Insert with lock already true (e.g. lead approval): trust incoming booleans
  if tg_op = 'INSERT' and coalesce(new.service_mode_locked, false) then
    return new;
  end if;

  -- Auto single-lane from full street address
  new.allow_both_storefront_and_delivery := false;
  if coalesce(btrim(new.address), '') = ''
     or coalesce(btrim(new.city), '') = ''
     or coalesce(btrim(new.state), '') = '' then
    new.offers_storefront := false;
    new.offers_delivery := true;
  else
    new.offers_storefront := true;
    new.offers_delivery := false;
  end if;

  -- First establishment locks the row (unless admin left it unlocked this statement)
  if not coalesce(new.service_mode_locked, false)
     and (tg_op = 'INSERT' or not coalesce(old.service_mode_locked, false)) then
    new.service_mode_locked := true;
  end if;

  return new;
end;
$$;

comment on function public.vendors_enforce_service_mode_from_address() is
  'force_* → single lane; allow_both → both lanes; locked updates preserve; locked insert trusts; else auto from address then lock.';

-- ---------------------------------------------------------------------------
-- Lead approval: apply requested lanes + lock
-- ---------------------------------------------------------------------------

create or replace function public.admin_approve_vendor_lead(p_lead_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
declare
  lead_row public.vendor_lead_applications%rowtype;
  new_id uuid;
  base_slug text;
  final_slug text;
  zip5 text;
  attempts int := 0;
  want_del boolean;
  want_sf boolean;
  want_both boolean;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;
  if not (public.auth_profiles_role_is_admin() or public.auth_is_profile_admin()) then
    raise exception 'not admin';
  end if;

  select * into lead_row
  from public.vendor_lead_applications
  where id = p_lead_id
  for update;

  if not found then
    raise exception 'lead not found';
  end if;
  if lead_row.status <> 'pending' then
    raise exception 'lead already processed';
  end if;

  zip5 := substring(regexp_replace(coalesce(lead_row.zip, ''), '\D', '', 'g') from 1 for 5);
  if length(zip5) < 5 then
    raise exception 'invalid zip on application';
  end if;

  want_del := coalesce(lead_row.requested_delivery, true);
  want_sf := coalesce(lead_row.requested_storefront, false);
  if not want_del and not want_sf then
    want_del := true;
    want_sf := false;
  end if;
  want_both := want_del and want_sf;

  base_slug := lower(regexp_replace(left(trim(lead_row.business_name), 80), '[^a-zA-Z0-9]+', '-', 'g'));
  if base_slug is null or btrim(base_slug) = '' or base_slug = '-' then
    base_slug := 'store';
  end if;

  loop
    attempts := attempts + 1;
    if attempts > 12 then
      raise exception 'could not allocate unique slug';
    end if;
    final_slug := base_slug || '-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 10);
    begin
      insert into public.vendors (
        user_id,
        name,
        slug,
        zip,
        phone,
        license_number,
        description,
        is_live,
        license_status,
        is_directory_listing,
        offers_delivery,
        offers_storefront,
        allow_both_storefront_and_delivery,
        admin_service_mode,
        service_mode_locked
      ) values (
        null,
        lead_row.business_name,
        final_slug,
        zip5,
        lead_row.contact_phone,
        nullif(btrim(lead_row.license_number), ''),
        format('Applicant contact email: %s', lead_row.contact_email),
        false,
        'pending',
        true,
        want_del,
        want_sf,
        want_both,
        'auto',
        true
      )
      returning id into new_id;
      exit;
    exception
      when unique_violation then
        null;
    end;
  end loop;

  update public.vendor_lead_applications
  set
    status = 'approved',
    reviewed_at = now(),
    reviewed_by = auth.uid(),
    created_vendor_id = new_id
  where id = p_lead_id;

  return new_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- Vendor request RPC: honor dual-lane + reject when already both
-- ---------------------------------------------------------------------------

create or replace function public.vendor_submit_service_mode_request(
  p_vendor_id uuid,
  p_requested_mode text,
  p_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
declare
  v record;
  em text;
  full_addr boolean;
  a text;
  eff_del boolean;
  eff_sf boolean;
begin
  if auth.uid() is null then
    return jsonb_build_object('ok', false, 'error', 'not_authenticated');
  end if;

  if p_requested_mode is null or p_requested_mode not in ('delivery', 'storefront') then
    return jsonb_build_object('ok', false, 'error', 'invalid_mode');
  end if;

  select *
    into v
  from public.vendors
  where id = p_vendor_id
  for share;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'vendor_not_found');
  end if;

  if v.user_id is distinct from auth.uid()
     and not exists (
       select 1 from public.vendor_team_members m
       where m.vendor_id = v.id
         and m.user_id = auth.uid()
     ) then
    return jsonb_build_object('ok', false, 'error', 'forbidden');
  end if;

  a := coalesce(v.admin_service_mode, 'auto');
  full_addr :=
    coalesce(btrim(v.address), '') <> ''
    and coalesce(btrim(v.city), '') <> ''
    and coalesce(btrim(v.state), '') <> '';

  if coalesce(v.allow_both_storefront_and_delivery, false) then
    eff_del := coalesce(v.offers_delivery, true);
    eff_sf := coalesce(v.offers_storefront, true);
  elsif a = 'force_delivery' then
    eff_del := true;
    eff_sf := false;
  elsif a = 'force_storefront' then
    eff_del := false;
    eff_sf := true;
  else
    eff_sf := full_addr;
    eff_del := not full_addr;
  end if;

  if eff_del and eff_sf then
    return jsonb_build_object('ok', false, 'error', 'already_both_lanes');
  end if;

  if p_requested_mode = 'delivery' and eff_del then
    return jsonb_build_object('ok', false, 'error', 'already_delivery');
  end if;

  if p_requested_mode = 'storefront' and eff_sf then
    return jsonb_build_object('ok', false, 'error', 'already_storefront');
  end if;

  select trim(coalesce(u.email, ''))
    into em
  from auth.users as u
  where u.id = auth.uid();

  if em = '' then
    return jsonb_build_object('ok', false, 'error', 'no_email');
  end if;

  delete from public.vendor_service_mode_requests
  where vendor_id = p_vendor_id
    and status = 'pending';

  insert into public.vendor_service_mode_requests (
    vendor_id,
    user_id,
    email,
    requested_mode,
    note
  )
  values (
    p_vendor_id,
    auth.uid(),
    em,
    p_requested_mode,
    nullif(trim(p_note), '')
  );

  return jsonb_build_object('ok', true);
end;
$$;

revoke all on function public.vendor_submit_service_mode_request(uuid, text, text) from public;
grant execute on function public.vendor_submit_service_mode_request(uuid, text, text) to authenticated, service_role;

comment on function public.vendor_submit_service_mode_request(uuid, text, text) is
  'Store owner asks admins to enable the other public lane; replaces prior pending row.';

create or replace function public.admin_apply_vendor_service_mode_request(p_request_id uuid)
returns void
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
declare
  r record;
  next_mode text;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  if not (public.auth_profiles_role_is_admin() or public.auth_is_profile_admin()) then
    raise exception 'forbidden';
  end if;

  select * into r
  from public.vendor_service_mode_requests
  where id = p_request_id
  for update;

  if not found then
    raise exception 'request not found';
  end if;

  if r.status is distinct from 'pending' then
    raise exception 'request is not pending';
  end if;

  next_mode := case r.requested_mode
    when 'delivery' then 'force_delivery'
    else 'force_storefront'
  end;

  update public.vendors
  set
    admin_service_mode = next_mode,
    service_mode_locked = true
  where id = r.vendor_id;

  update public.vendor_service_mode_requests
  set
    status = 'approved',
    reviewed_at = now(),
    reviewed_by = auth.uid()
  where id = p_request_id;
end;
$$;
