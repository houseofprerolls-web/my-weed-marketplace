-- Vendor Hub: consumers can apply (one pending vendor per user).
-- Replace narrow vendor-only SELECT with "owner can always read own row".
-- Draft vendor_locations for applicants (consumer role, non-live vendor).
-- Admin RPCs to approve / reject / flag needs_review (updates vendor + profile on approve).

-- ---------------------------------------------------------------------------
-- vendors SELECT: any authenticated owner can read their row (application status)
-- ---------------------------------------------------------------------------
drop policy if exists vendors_vendor_select_own on public.vendors;

create policy vendors_select_if_owner
  on public.vendors for select
  using (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- consumers: submit one application
-- ---------------------------------------------------------------------------
drop policy if exists vendors_consumer_insert_application on public.vendors;
create policy vendors_consumer_insert_application
  on public.vendors for insert
  with check (
    auth.uid() is not null
    and user_id = auth.uid()
    and license_status = 'pending'
    and is_live = false
    and verified = false
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'consumer'
    )
    and not exists (
      select 1 from public.vendors v2 where v2.user_id = auth.uid()
    )
  );

drop policy if exists vendors_consumer_update_application on public.vendors;
create policy vendors_consumer_update_application
  on public.vendors for update
  using (
    user_id = auth.uid()
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'consumer'
    )
    and license_status in ('pending', 'needs_review', 'rejected')
    and is_live = false
  )
  with check (
    user_id = auth.uid()
    and license_status in ('pending', 'needs_review', 'rejected')
    and is_live = false
    and verified = false
  );

-- ---------------------------------------------------------------------------
-- vendor_locations: owner can always SELECT their locations (draft + live)
-- ---------------------------------------------------------------------------
drop policy if exists vendor_locations_owner_select on public.vendor_locations;
create policy vendor_locations_owner_select
  on public.vendor_locations for select
  using (
    exists (
      select 1 from public.vendors v
      where v.id = vendor_id and v.user_id = auth.uid()
    )
  );

-- Applicants (consumers) can manage locations while application is not live
drop policy if exists vendor_locations_applicant_write on public.vendor_locations;
create policy vendor_locations_applicant_write
  on public.vendor_locations for insert
  with check (
    exists (
      select 1 from public.vendors v
      where v.id = vendor_id
        and v.user_id = auth.uid()
        and v.license_status in ('pending', 'needs_review', 'rejected')
        and v.is_live = false
    )
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'consumer'
    )
  );

drop policy if exists vendor_locations_applicant_update on public.vendor_locations;
create policy vendor_locations_applicant_update
  on public.vendor_locations for update
  using (
    exists (
      select 1 from public.vendors v
      where v.id = vendor_id
        and v.user_id = auth.uid()
        and v.license_status in ('pending', 'needs_review', 'rejected')
        and v.is_live = false
    )
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'consumer'
    )
  )
  with check (
    exists (
      select 1 from public.vendors v
      where v.id = vendor_id
        and v.user_id = auth.uid()
        and v.license_status in ('pending', 'needs_review', 'rejected')
        and v.is_live = false
    )
  );

drop policy if exists vendor_locations_applicant_delete on public.vendor_locations;
create policy vendor_locations_applicant_delete
  on public.vendor_locations for delete
  using (
    exists (
      select 1 from public.vendors v
      where v.id = vendor_id
        and v.user_id = auth.uid()
        and v.license_status in ('pending', 'needs_review', 'rejected')
        and v.is_live = false
    )
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'consumer'
    )
  );

-- ---------------------------------------------------------------------------
-- Admin RPCs (security definer; gate on profiles.role = admin)
-- ---------------------------------------------------------------------------
create or replace function public.admin_approve_vendor(p_vendor_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  owner_id uuid;
begin
  if uid is null then
    raise exception 'not authenticated';
  end if;

  if not exists (
    select 1 from public.profiles p where p.id = uid and p.role = 'admin'
  ) then
    raise exception 'forbidden';
  end if;

  select v.user_id into owner_id
  from public.vendors v
  where v.id = p_vendor_id;

  if owner_id is null then
    raise exception 'vendor not found';
  end if;

  update public.vendors
  set
    license_status = 'approved',
    is_live = true,
    verified = true
  where id = p_vendor_id;

  update public.profiles
  set role = 'vendor'
  where id = owner_id;
end;
$$;

create or replace function public.admin_reject_vendor(p_vendor_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'not authenticated';
  end if;

  if not exists (
    select 1 from public.profiles p where p.id = uid and p.role = 'admin'
  ) then
    raise exception 'forbidden';
  end if;

  update public.vendors
  set
    license_status = 'rejected',
    is_live = false,
    verified = false
  where id = p_vendor_id;
end;
$$;

create or replace function public.admin_vendor_needs_review(p_vendor_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'not authenticated';
  end if;

  if not exists (
    select 1 from public.profiles p where p.id = uid and p.role = 'admin'
  ) then
    raise exception 'forbidden';
  end if;

  update public.vendors
  set
    license_status = 'needs_review',
    is_live = false
  where id = p_vendor_id;
end;
$$;

grant execute on function public.admin_approve_vendor(uuid) to authenticated;
grant execute on function public.admin_reject_vendor(uuid) to authenticated;
grant execute on function public.admin_vendor_needs_review(uuid) to authenticated;
