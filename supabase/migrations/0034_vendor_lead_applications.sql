-- Public vendor intake + admin approval creates a directory vendor (not live) in their ZIP.

create extension if not exists pgcrypto;

create table if not exists public.vendor_lead_applications (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  business_name text not null,
  contact_email text not null,
  contact_phone text not null,
  zip text not null,
  license_number text, -- state cannabis regulatory license number (LIC), not a generic business license
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected')),
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users (id) on delete set null,
  created_vendor_id uuid references public.vendors (id) on delete set null,
  admin_notes text
);

create index if not exists vendor_lead_applications_status_idx
  on public.vendor_lead_applications (status, created_at desc);

alter table public.vendor_lead_applications enable row level security;

drop policy if exists vendor_lead_applications_insert_public on public.vendor_lead_applications;
create policy vendor_lead_applications_insert_public
  on public.vendor_lead_applications for insert
  to anon, authenticated
  with check (true);

drop policy if exists vendor_lead_applications_admin_select on public.vendor_lead_applications;
create policy vendor_lead_applications_admin_select
  on public.vendor_lead_applications for select
  using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

drop policy if exists vendor_lead_applications_admin_update on public.vendor_lead_applications;
create policy vendor_lead_applications_admin_update
  on public.vendor_lead_applications for update
  using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  )
  with check (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

-- Approve: create vendors row (not live, directory listing) tied to applicant ZIP; link lead -> vendor.
create or replace function public.admin_approve_vendor_lead(p_lead_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  lead_row public.vendor_lead_applications%rowtype;
  new_id uuid;
  base_slug text;
  final_slug text;
  zip5 text;
  attempts int := 0;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;
  if not exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin') then
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
        offers_storefront
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
        true,
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

create or replace function public.admin_reject_vendor_lead(p_lead_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;
  if not exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin') then
    raise exception 'not admin';
  end if;

  update public.vendor_lead_applications
  set
    status = 'rejected',
    reviewed_at = now(),
    reviewed_by = auth.uid()
  where id = p_lead_id
    and status = 'pending';

  if not found then
    raise exception 'lead not found or not pending';
  end if;
end;
$$;

grant execute on function public.admin_approve_vendor_lead(uuid) to authenticated;
grant execute on function public.admin_reject_vendor_lead(uuid) to authenticated;

comment on table public.vendor_lead_applications is
  'Public submissions to list a business; admin approval creates a non-live directory vendor.';

comment on column public.vendor_lead_applications.license_number is
  'Optional state-issued cannabis license number (LIC), not a general business or seller permit.';
