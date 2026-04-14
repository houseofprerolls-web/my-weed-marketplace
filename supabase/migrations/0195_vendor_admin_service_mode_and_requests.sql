-- Admin override for public service lane + vendor requests for the other lane.
-- admin_service_mode: auto (derive from address), force_delivery, force_storefront.

alter table public.vendors
  add column if not exists admin_service_mode text not null default 'auto';

alter table public.vendors
  drop constraint if exists vendors_admin_service_mode_check;

alter table public.vendors
  add constraint vendors_admin_service_mode_check
  check (admin_service_mode in ('auto', 'force_delivery', 'force_storefront'));

comment on column public.vendors.admin_service_mode is
  'auto = delivery vs storefront from street+city+state; force_* = admin override for public listings.';

-- ---------------------------------------------------------------------------
-- Trigger: apply admin override first, else address-based single lane.
-- ---------------------------------------------------------------------------

create or replace function public.vendors_enforce_service_mode_from_address()
returns trigger
language plpgsql
as $$
begin
  new.allow_both_storefront_and_delivery := false;

  if coalesce(new.admin_service_mode, 'auto') = 'force_delivery' then
    new.offers_delivery := true;
    new.offers_storefront := false;
    return new;
  end if;

  if coalesce(new.admin_service_mode, 'auto') = 'force_storefront' then
    new.offers_delivery := false;
    new.offers_storefront := true;
    return new;
  end if;

  if coalesce(btrim(new.address), '') = ''
     or coalesce(btrim(new.city), '') = ''
     or coalesce(btrim(new.state), '') = '' then
    new.offers_storefront := false;
    new.offers_delivery := true;
  else
    new.offers_storefront := true;
    new.offers_delivery := false;
  end if;

  return new;
end;
$$;

comment on function public.vendors_enforce_service_mode_from_address() is
  'Sets offers_* from admin_service_mode override, else auto from full address; clears allow_both.';

-- ---------------------------------------------------------------------------
-- vendor_service_mode_requests
-- ---------------------------------------------------------------------------

create table if not exists public.vendor_service_mode_requests (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  vendor_id uuid not null references public.vendors (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  email text not null,
  requested_mode text not null check (requested_mode in ('delivery', 'storefront')),
  note text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users (id) on delete set null
);

create index if not exists vendor_service_mode_requests_vendor_idx
  on public.vendor_service_mode_requests (vendor_id, status desc, created_at desc);

alter table public.vendor_service_mode_requests enable row level security;

drop policy if exists vendor_service_mode_requests_vendor_select on public.vendor_service_mode_requests;
create policy vendor_service_mode_requests_vendor_select
  on public.vendor_service_mode_requests for select
  to authenticated
  using (
    user_id = auth.uid()
    or public.auth_profiles_role_is_admin()
    or public.auth_is_profile_admin()
  );

drop policy if exists vendor_service_mode_requests_vendor_insert on public.vendor_service_mode_requests;
create policy vendor_service_mode_requests_vendor_insert
  on public.vendor_service_mode_requests for insert
  to authenticated
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.vendors v
      where v.id = vendor_id
        and (
          v.user_id = auth.uid()
          or exists (
            select 1 from public.vendor_team_members m
            where m.vendor_id = v.id
              and m.user_id = auth.uid()
          )
        )
    )
  );

drop policy if exists vendor_service_mode_requests_admin_update on public.vendor_service_mode_requests;
create policy vendor_service_mode_requests_admin_update
  on public.vendor_service_mode_requests for update
  to authenticated
  using (public.auth_profiles_role_is_admin() or public.auth_is_profile_admin())
  with check (public.auth_profiles_role_is_admin() or public.auth_is_profile_admin());

-- ---------------------------------------------------------------------------
-- RPC: vendor submits a request (validates + replaces pending row for vendor)
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

  if a = 'force_delivery' then
    eff_del := true;
    eff_sf := false;
  elsif a = 'force_storefront' then
    eff_del := false;
    eff_sf := true;
  else
    eff_sf := full_addr;
    eff_del := not full_addr;
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
  'Store owner asks admins to enable the other public service lane; replaces prior pending row.';

-- ---------------------------------------------------------------------------
-- RPC: admin approves → sets admin_service_mode + marks request approved
-- ---------------------------------------------------------------------------

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
  set admin_service_mode = next_mode
  where id = r.vendor_id;

  update public.vendor_service_mode_requests
  set
    status = 'approved',
    reviewed_at = now(),
    reviewed_by = auth.uid()
  where id = p_request_id;
end;
$$;

revoke all on function public.admin_apply_vendor_service_mode_request(uuid) from public;
grant execute on function public.admin_apply_vendor_service_mode_request(uuid) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- RPC: admin rejects pending request
-- ---------------------------------------------------------------------------

create or replace function public.admin_reject_vendor_service_mode_request(p_request_id uuid)
returns void
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  if not (public.auth_profiles_role_is_admin() or public.auth_is_profile_admin()) then
    raise exception 'forbidden';
  end if;

  update public.vendor_service_mode_requests
  set
    status = 'rejected',
    reviewed_at = now(),
    reviewed_by = auth.uid()
  where id = p_request_id
    and status = 'pending';

  if not found then
    raise exception 'pending request not found';
  end if;
end;
$$;

revoke all on function public.admin_reject_vendor_service_mode_request(uuid) from public;
grant execute on function public.admin_reject_vendor_service_mode_request(uuid) to authenticated, service_role;

-- Re-fire trigger so offers_* stay aligned with explicit auto mode.
update public.vendors
set admin_service_mode = admin_service_mode;
