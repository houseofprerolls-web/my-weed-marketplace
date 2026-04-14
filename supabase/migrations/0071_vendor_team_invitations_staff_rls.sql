-- Vendor managers (team members), email-based invitations, admin unlink/reassign owner,
-- and RLS updates so owner OR manager can manage the same vendor resources.

create extension if not exists pgcrypto with schema extensions;

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------
create table if not exists public.vendor_team_members (
  id uuid primary key default gen_random_uuid(),
  vendor_id uuid not null references public.vendors (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role text not null default 'manager' check (role = 'manager'),
  invited_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  unique (vendor_id, user_id)
);

create index if not exists vendor_team_members_user_idx on public.vendor_team_members (user_id);
create index if not exists vendor_team_members_vendor_idx on public.vendor_team_members (vendor_id);

create table if not exists public.vendor_invitations (
  id uuid primary key default gen_random_uuid(),
  vendor_id uuid not null references public.vendors (id) on delete cascade,
  email_normalized text not null,
  token_hash text not null,
  invited_by uuid references public.profiles (id) on delete set null,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'revoked', 'expired')),
  expires_at timestamptz not null,
  accepted_user_id uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  unique (token_hash)
);

create index if not exists vendor_invitations_vendor_idx on public.vendor_invitations (vendor_id);
create unique index if not exists vendor_invitations_one_pending_per_email
  on public.vendor_invitations (vendor_id, email_normalized)
  where status = 'pending';

alter table public.vendor_team_members enable row level security;
alter table public.vendor_invitations enable row level security;

-- Defensive bootstrap for partially-applied environments: ensure team table exists
-- before SQL functions referencing it are compiled.
do $bootstrap_vendor_team$
begin
  if to_regclass('public.vendor_team_members') is not null then
    return;
  end if;
  if to_regclass('public.vendors') is null or to_regclass('public.profiles') is null then
    raise exception 'vendor_team_members bootstrap failed: public.vendors/public.profiles missing';
  end if;

  create table public.vendor_team_members (
    id uuid primary key default gen_random_uuid(),
    vendor_id uuid not null references public.vendors (id) on delete cascade,
    user_id uuid not null references public.profiles (id) on delete cascade,
    role text not null default 'manager' check (role = 'manager'),
    invited_by uuid references public.profiles (id) on delete set null,
    created_at timestamptz not null default now(),
    unique (vendor_id, user_id)
  );

  create index if not exists vendor_team_members_user_idx on public.vendor_team_members (user_id);
  create index if not exists vendor_team_members_vendor_idx on public.vendor_team_members (vendor_id);
  alter table public.vendor_team_members enable row level security;
end;
$bootstrap_vendor_team$;

-- Must exist before policies that call it.
create or replace function public.vendor_staff_may_manage(p_vendor_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    coalesce(
      exists (
        select 1
        from public.vendors v
        where v.id = p_vendor_id
          and v.user_id is not null
          and v.user_id = auth.uid()
      )
      or exists (
        select 1
        from public.vendor_team_members m
        where m.vendor_id = p_vendor_id
          and m.user_id = auth.uid()
      ),
      false
    );
$$;

revoke all on function public.vendor_staff_may_manage(uuid) from public;
grant execute on function public.vendor_staff_may_manage(uuid) to authenticated;

create or replace function public.auth_has_any_vendor_access()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    auth.uid() is not null
    and (
      exists (select 1 from public.vendors v where v.user_id = auth.uid())
      or exists (
        select 1 from public.vendor_team_members m where m.user_id = auth.uid()
      )
    );
$$;

revoke all on function public.auth_has_any_vendor_access() from public;
grant execute on function public.auth_has_any_vendor_access() to authenticated;

drop policy if exists vendor_team_members_staff_select on public.vendor_team_members;
create policy vendor_team_members_staff_select
  on public.vendor_team_members for select
  to authenticated
  using (public.vendor_staff_may_manage(vendor_id));

drop policy if exists vendor_invitations_staff_all on public.vendor_invitations;
create policy vendor_invitations_staff_all
  on public.vendor_invitations for all
  to authenticated
  using (public.vendor_staff_may_manage(vendor_id))
  with check (public.vendor_staff_may_manage(vendor_id));

grant select on public.vendor_team_members to authenticated;
grant select, insert, update, delete on public.vendor_team_members to authenticated;
grant select, insert, update, delete on public.vendor_invitations to authenticated;

-- ---------------------------------------------------------------------------
-- Core helper: owner (vendors.user_id) OR row in vendor_team_members
-- ---------------------------------------------------------------------------
create or replace function public.vendor_staff_may_manage(p_vendor_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    coalesce(
      exists (
        select 1
        from public.vendors v
        where v.id = p_vendor_id
          and v.user_id is not null
          and v.user_id = auth.uid()
      )
      or exists (
        select 1
        from public.vendor_team_members m
        where m.vendor_id = p_vendor_id
          and m.user_id = auth.uid()
      ),
      false
    );
$$;

revoke all on function public.vendor_staff_may_manage(uuid) from public;
grant execute on function public.vendor_staff_may_manage(uuid) to authenticated;

comment on function public.vendor_staff_may_manage(uuid) is
  'True when auth user owns the vendor row or is a manager in vendor_team_members.';

-- ---------------------------------------------------------------------------
-- Route guard / shell: any vendor dashboard access (owner or manager)
-- ---------------------------------------------------------------------------
create or replace function public.auth_has_any_vendor_access()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    auth.uid() is not null
    and (
      exists (select 1 from public.vendors v where v.user_id = auth.uid())
      or exists (
        select 1 from public.vendor_team_members m where m.user_id = auth.uid()
      )
    );
$$;

revoke all on function public.auth_has_any_vendor_access() from public;
grant execute on function public.auth_has_any_vendor_access() to authenticated;

-- ---------------------------------------------------------------------------
-- Prevent managers from changing vendors.user_id (owner or admin only)
-- ---------------------------------------------------------------------------
create or replace function public.vendors_guard_user_id_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.user_id is not distinct from old.user_id then
    return new;
  end if;
  if public.auth_is_profile_admin() then
    return new;
  end if;
  if old.user_id is not null and old.user_id = auth.uid() then
    return new;
  end if;
  raise exception 'only the linked owner or an admin can change store ownership';
end;
$$;

drop trigger if exists trg_vendors_guard_user_id on public.vendors;
create trigger trg_vendors_guard_user_id
  before update on public.vendors
  for each row
  execute function public.vendors_guard_user_id_change();

create or replace function public.vendors_guard_delete_access()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.auth_is_profile_admin() then
    return old;
  end if;
  if old.user_id is not null and old.user_id = auth.uid() then
    return old;
  end if;
  raise exception 'only the store owner or an admin can delete this vendor';
end;
$$;

drop trigger if exists trg_vendors_guard_delete on public.vendors;
create trigger trg_vendors_guard_delete
  before delete on public.vendors
  for each row
  execute function public.vendors_guard_delete_access();

-- ---------------------------------------------------------------------------
-- Admin: unlink / reassign owner
-- ---------------------------------------------------------------------------
create or replace function public.admin_unlink_vendor_user(p_vendor_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  old_uid uuid;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;
  if not public.auth_is_profile_admin() then
    raise exception 'not admin';
  end if;

  select v.user_id into old_uid
  from public.vendors v
  where v.id = p_vendor_id
  for update;

  if not found then
    raise exception 'vendor not found';
  end if;

  update public.vendors
  set user_id = null
  where id = p_vendor_id;

  if old_uid is not null then
    if not exists (select 1 from public.vendors v2 where v2.user_id = old_uid) then
      if not exists (select 1 from public.vendor_team_members m where m.user_id = old_uid) then
        update public.profiles p
        set role = 'customer'
        where p.id = old_uid
          and p.role = 'vendor';
      end if;
    end if;
  end if;
end;
$$;

revoke all on function public.admin_unlink_vendor_user(uuid) from public;
grant execute on function public.admin_unlink_vendor_user(uuid) to authenticated;

create or replace function public.admin_reassign_vendor_user(p_vendor_id uuid, p_new_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  old_uid uuid;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;
  if not public.auth_is_profile_admin() then
    raise exception 'not admin';
  end if;

  if p_new_user_id is null then
    raise exception 'user id required';
  end if;

  if not exists (select 1 from auth.users u where u.id = p_new_user_id) then
    raise exception 'user not found';
  end if;

  select v.user_id into old_uid
  from public.vendors v
  where v.id = p_vendor_id
  for update;

  if not found then
    raise exception 'vendor not found';
  end if;

  if exists (
    select 1 from public.vendors v2
    where v2.user_id = p_new_user_id and v2.id <> p_vendor_id
  ) then
    raise exception 'user already owns another vendor row; unlink or use a different account';
  end if;

  update public.vendors
  set
    user_id = p_new_user_id,
    is_directory_listing = false
  where id = p_vendor_id;

  update public.profiles
  set role = 'vendor'
  where id = p_new_user_id;

  if old_uid is not null and old_uid <> p_new_user_id then
    if not exists (select 1 from public.vendors v2 where v2.user_id = old_uid) then
      if not exists (select 1 from public.vendor_team_members m where m.user_id = old_uid) then
        update public.profiles p
        set role = 'customer'
        where p.id = old_uid
          and p.role = 'vendor';
      end if;
    end if;
  end if;
end;
$$;

revoke all on function public.admin_reassign_vendor_user(uuid, uuid) from public;
grant execute on function public.admin_reassign_vendor_user(uuid, uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Invitations & team RPCs
-- ---------------------------------------------------------------------------
create or replace function public.vendor_invite_manager(p_vendor_id uuid, p_email text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  em text;
  tok text;
  th text;
  owner_em text;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  if not public.vendor_staff_may_manage(p_vendor_id) then
    raise exception 'forbidden';
  end if;

  em := lower(trim(coalesce(p_email, '')));
  if em = '' or position('@' in em) < 2 then
    raise exception 'valid email required';
  end if;

  select lower(trim(coalesce(u.email, ''))) into owner_em
  from public.vendors v
  left join auth.users u on u.id = v.user_id
  where v.id = p_vendor_id;

  if owner_em is not null and owner_em <> '' and owner_em = em then
    raise exception 'cannot invite the store owner email';
  end if;

  if exists (
    select 1
    from public.vendor_team_members m
    join auth.users u on u.id = m.user_id
    where m.vendor_id = p_vendor_id
      and lower(trim(coalesce(u.email, ''))) = em
  ) then
    raise exception 'that user is already a manager';
  end if;

  tok := replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '');
  th := encode(extensions.digest(convert_to(tok, 'UTF8'), 'sha256'), 'hex');

  begin
    insert into public.vendor_invitations (
      vendor_id,
      email_normalized,
      token_hash,
      invited_by,
      status,
      expires_at
    ) values (
      p_vendor_id,
      em,
      th,
      auth.uid(),
      'pending',
      now() + interval '14 days'
    );
  exception
    when unique_violation then
      raise exception 'an invite for this email is already pending';
  end;

  return tok;
end;
$$;

revoke all on function public.vendor_invite_manager(uuid, text) from public;
grant execute on function public.vendor_invite_manager(uuid, text) to authenticated;

create or replace function public.vendor_revoke_manager_invitation(p_invitation_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  vid uuid;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  select i.vendor_id into vid
  from public.vendor_invitations i
  where i.id = p_invitation_id
  for update;

  if not found then
    raise exception 'invitation not found';
  end if;

  if not public.vendor_staff_may_manage(vid) then
    raise exception 'forbidden';
  end if;

  update public.vendor_invitations
  set status = 'revoked'
  where id = p_invitation_id
    and status = 'pending';
end;
$$;

revoke all on function public.vendor_revoke_manager_invitation(uuid) from public;
grant execute on function public.vendor_revoke_manager_invitation(uuid) to authenticated;

create or replace function public.vendor_remove_team_member(p_vendor_id uuid, p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  if not exists (
    select 1 from public.vendors v where v.id = p_vendor_id and v.user_id = auth.uid()
  ) then
    raise exception 'only the linked owner can remove managers';
  end if;

  if p_user_id = auth.uid() then
    raise exception 'use leave team if you are removing yourself as manager';
  end if;

  delete from public.vendor_team_members m
  where m.vendor_id = p_vendor_id
    and m.user_id = p_user_id;

  if not exists (select 1 from public.vendors v2 where v2.user_id = p_user_id) then
    if not exists (select 1 from public.vendor_team_members m2 where m2.user_id = p_user_id) then
      update public.profiles p
      set role = 'customer'
      where p.id = p_user_id
        and p.role = 'vendor';
    end if;
  end if;
end;
$$;

revoke all on function public.vendor_remove_team_member(uuid, uuid) from public;
grant execute on function public.vendor_remove_team_member(uuid, uuid) to authenticated;

create or replace function public.vendor_accept_manager_invitation(p_token text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  inv public.vendor_invitations%rowtype;
  em text;
  th text;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  th := encode(extensions.digest(convert_to(trim(coalesce(p_token, '')), 'UTF8'), 'sha256'), 'hex');

  select * into inv
  from public.vendor_invitations i
  where i.token_hash = th
    and i.status = 'pending'
    and i.expires_at > now()
  for update;

  if not found then
    raise exception 'invalid or expired invitation';
  end if;

  select lower(trim(coalesce(u.email, ''))) into em
  from auth.users u
  where u.id = auth.uid();

  if em = '' or em <> inv.email_normalized then
    raise exception 'sign in with the invited email address to accept';
  end if;

  insert into public.vendor_team_members (vendor_id, user_id, role, invited_by)
  values (inv.vendor_id, auth.uid(), 'manager', inv.invited_by)
  on conflict (vendor_id, user_id) do nothing;

  update public.vendor_invitations
  set
    status = 'accepted',
    accepted_user_id = auth.uid()
  where id = inv.id;

  update public.profiles p
  set role = 'vendor'
  where p.id = auth.uid()
    and p.role in ('customer', 'consumer');
end;
$$;

revoke all on function public.vendor_accept_manager_invitation(text) from public;
grant execute on function public.vendor_accept_manager_invitation(text) to authenticated;

create or replace function public.vendor_accept_manager_invitation_by_id(p_invitation_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  inv public.vendor_invitations%rowtype;
  em text;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  select * into inv
  from public.vendor_invitations i
  where i.id = p_invitation_id
    and i.status = 'pending'
    and i.expires_at > now()
  for update;

  if not found then
    raise exception 'invalid or expired invitation';
  end if;

  select lower(trim(coalesce(u.email, ''))) into em
  from auth.users u
  where u.id = auth.uid();

  if em = '' or em <> inv.email_normalized then
    raise exception 'sign in with the invited email address to accept';
  end if;

  insert into public.vendor_team_members (vendor_id, user_id, role, invited_by)
  values (inv.vendor_id, auth.uid(), 'manager', inv.invited_by)
  on conflict (vendor_id, user_id) do nothing;

  update public.vendor_invitations
  set
    status = 'accepted',
    accepted_user_id = auth.uid()
  where id = inv.id;

  update public.profiles p
  set role = 'vendor'
  where p.id = auth.uid()
    and p.role in ('customer', 'consumer');
end;
$$;

revoke all on function public.vendor_accept_manager_invitation_by_id(uuid) from public;
grant execute on function public.vendor_accept_manager_invitation_by_id(uuid) to authenticated;

create or replace function public.vendor_list_pending_invitations(p_vendor_id uuid)
returns table (
  id uuid,
  email_normalized text,
  expires_at timestamptz,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;
  if not public.vendor_staff_may_manage(p_vendor_id) then
    raise exception 'forbidden';
  end if;

  return query
  select i.id, i.email_normalized, i.expires_at, i.created_at
  from public.vendor_invitations i
  where i.vendor_id = p_vendor_id
    and i.status = 'pending'
    and i.expires_at > now()
  order by i.created_at desc;
end;
$$;

revoke all on function public.vendor_list_pending_invitations(uuid) from public;
grant execute on function public.vendor_list_pending_invitations(uuid) to authenticated;

create or replace function public.vendor_list_team_members(p_vendor_id uuid)
returns table (
  user_id uuid,
  email text,
  full_name text,
  joined_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;
  if not public.vendor_staff_may_manage(p_vendor_id) then
    raise exception 'forbidden';
  end if;

  return query
  select
    m.user_id,
    coalesce(p.email, u.email, '') as email,
    p.full_name,
    m.created_at as joined_at
  from public.vendor_team_members m
  left join public.profiles p on p.id = m.user_id
  left join auth.users u on u.id = m.user_id
  where m.vendor_id = p_vendor_id
  order by m.created_at asc;
end;
$$;

revoke all on function public.vendor_list_team_members(uuid) from public;
grant execute on function public.vendor_list_team_members(uuid) to authenticated;

create or replace function public.vendor_list_my_pending_invitations()
returns table (
  invitation_id uuid,
  vendor_id uuid,
  vendor_name text,
  expires_at timestamptz,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  em text;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  select lower(trim(coalesce(u.email, ''))) into em
  from auth.users u
  where u.id = auth.uid();

  if em = '' then
    return;
  end if;

  return query
  select i.id, i.vendor_id, v.name, i.expires_at, i.created_at
  from public.vendor_invitations i
  join public.vendors v on v.id = i.vendor_id
  where i.status = 'pending'
    and i.expires_at > now()
    and i.email_normalized = em
  order by i.created_at desc;
end;
$$;

revoke all on function public.vendor_list_my_pending_invitations() from public;
grant execute on function public.vendor_list_my_pending_invitations() to authenticated;

-- ---------------------------------------------------------------------------
-- Security definer RPCs: use staff helper instead of owner-only
-- ---------------------------------------------------------------------------
create or replace function public.vendor_set_review_reply(p_review_id uuid, p_reply text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_entity uuid;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  select r.entity_id
    into v_entity
  from public.reviews r
  where r.id = p_review_id
    and r.entity_type = 'vendor';

  if not found then
    raise exception 'review not found';
  end if;

  if not public.vendor_staff_may_manage(v_entity) then
    raise exception 'forbidden';
  end if;

  update public.reviews
  set
    vendor_reply = nullif(trim(p_reply), ''),
    vendor_reply_at = case
      when nullif(trim(p_reply), '') is null then null
      else now()
    end,
    updated_at = now()
  where id = p_review_id;
end;
$$;

create or replace function public.vendor_request_account_upgrade(p_context text default null)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  vid uuid;
  em text;
  new_id uuid;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  select v.id
    into vid
  from public.vendors v
  where public.vendor_staff_may_manage(v.id)
  order by case when v.user_id = auth.uid() then 0 else 1 end, v.slug asc
  limit 1;

  if vid is null then
    raise exception 'no vendor linked to this account';
  end if;

  select trim(coalesce(u.email, ''))
    into em
  from auth.users as u
  where u.id = auth.uid();

  if em = '' then
    raise exception 'no email on account';
  end if;

  insert into public.vendor_upgrade_requests (vendor_id, user_id, email, context)
  values (vid, auth.uid(), em, nullif(trim(p_context), ''))
  returning id into new_id;

  return new_id;
end;
$$;

create or replace function public.vendor_update_order_fulfillment (
  p_order_id uuid,
  p_new_status text,
  p_message text default null
) returns void
language plpgsql
security definer
set search_path = public
as $fn$
declare
  v_vendor_id uuid;
  v_consumer_id uuid;
  v_current text;
  v_trim text;
  v_body text;
begin
  if p_new_status is null
    or p_new_status not in (
      'pending',
      'accepted',
      'en_route',
      'completed',
      'cancelled'
    )
  then
    raise exception 'invalid status';
  end if;

  select o.vendor_id, o.consumer_id, o.status
    into v_vendor_id, v_consumer_id, v_current
  from public.orders o
  where o.id = p_order_id
  for update;

  if not found then
    raise exception 'order not found';
  end if;

  if not public.vendor_staff_may_manage(v_vendor_id) then
    raise exception 'forbidden';
  end if;

  if v_current in ('completed', 'cancelled') then
    raise exception 'order is closed';
  end if;

  if p_new_status = v_current then
    return;
  end if;

  if not (
    (v_current = 'pending' and p_new_status in ('accepted', 'cancelled'))
    or (v_current = 'accepted' and p_new_status in ('en_route', 'cancelled'))
    or (v_current = 'en_route' and p_new_status in ('completed', 'cancelled'))
  ) then
    raise exception 'invalid status transition from % to %', v_current, p_new_status;
  end if;

  update public.orders
  set status = p_new_status
  where id = p_order_id;

  v_trim := nullif(trim(coalesce(p_message, '')), '');
  v_body := coalesce(
    v_trim,
    case p_new_status
      when 'pending' then 'Order is pending.'
      when 'accepted' then 'Your order was accepted and is being prepared.'
      when 'en_route' then 'Your order is on the way.'
      when 'completed' then 'Your order is completed. Thank you!'
      when 'cancelled' then 'This order was cancelled.'
      else 'Order updated.'
    end
  );

  insert into public.order_fulfillment_updates (
    order_id,
    vendor_id,
    consumer_id,
    status,
    message
  ) values (
    p_order_id,
    v_vendor_id,
    v_consumer_id,
    p_new_status,
    v_body
  );
end;
$fn$;

create or replace function public.vendor_complete_order_now (
  p_order_id uuid,
  p_message text default null
) returns void
language plpgsql
security definer
set search_path = public
as $fn$
declare
  v_vendor_id uuid;
  v_consumer_id uuid;
  v_current text;
  v_trim text;
  v_body text;
begin
  select o.vendor_id, o.consumer_id, o.status
    into v_vendor_id, v_consumer_id, v_current
  from public.orders o
  where o.id = p_order_id
  for update;

  if not found then
    raise exception 'order not found';
  end if;

  if not public.vendor_staff_may_manage(v_vendor_id) then
    raise exception 'forbidden';
  end if;

  if v_current in ('completed', 'cancelled') then
    raise exception 'order is closed';
  end if;

  update public.orders
  set status = 'completed'
  where id = p_order_id;

  v_trim := nullif(trim(coalesce(p_message, '')), '');
  v_body := coalesce(
    v_trim,
    'Your order was completed. Thank you!'
  );

  insert into public.order_fulfillment_updates (
    order_id,
    vendor_id,
    consumer_id,
    status,
    message
  ) values (
    p_order_id,
    v_vendor_id,
    v_consumer_id,
    'completed',
    v_body
  );
end;
$fn$;

-- ---------------------------------------------------------------------------
-- RLS: swap owner-only checks for vendor_staff_may_manage(vendor_id)
-- ---------------------------------------------------------------------------

-- vendors
drop policy if exists vendors_select_if_owner on public.vendors;
create policy vendors_select_if_owner
  on public.vendors for select
  using (
    user_id = auth.uid()
    or public.vendor_staff_may_manage(id)
  );

drop policy if exists vendors_vendor_write on public.vendors;
create policy vendors_vendor_write
  on public.vendors for all
  using (public.vendor_staff_may_manage(id))
  with check (public.vendor_staff_may_manage(id));

-- vendor_locations
drop policy if exists vendor_locations_owner_select on public.vendor_locations;
create policy vendor_locations_owner_select
  on public.vendor_locations for select
  using (public.vendor_staff_may_manage(vendor_id));

drop policy if exists vendor_locations_vendor_write on public.vendor_locations;
create policy vendor_locations_vendor_write
  on public.vendor_locations for all
  using (public.vendor_staff_may_manage(vendor_id))
  with check (public.vendor_staff_may_manage(vendor_id));

-- products
do $p$
begin
  if to_regclass('public.products') is null then
    return;
  end if;
  drop policy if exists products_vendor_write on public.products;
  create policy products_vendor_write
    on public.products for all
    using (public.vendor_staff_may_manage(vendor_id))
    with check (public.vendor_staff_may_manage(vendor_id));
end;
$p$;

-- deals
do $d$
begin
  if to_regclass('public.deals') is null then
    return;
  end if;
  drop policy if exists deals_vendor_write on public.deals;
  create policy deals_vendor_write
    on public.deals for all
    using (public.vendor_staff_may_manage(vendor_id))
    with check (public.vendor_staff_may_manage(vendor_id));
end;
$d$;

-- product_unit_costs
do $c$
begin
  if to_regclass('public.product_unit_costs') is null then
    return;
  end if;
  drop policy if exists product_unit_costs_vendor_all on public.product_unit_costs;
  create policy product_unit_costs_vendor_all
    on public.product_unit_costs for all
    to authenticated
    using (
      exists (
        select 1
        from public.products p
        where p.id = product_unit_costs.product_id
          and public.vendor_staff_may_manage(p.vendor_id)
      )
    )
    with check (
      exists (
        select 1
        from public.products p
        where p.id = product_unit_costs.product_id
          and public.vendor_staff_may_manage(p.vendor_id)
      )
    );
end;
$c$;

-- orders
do $o$
begin
  if to_regclass('public.orders') is null then
    return;
  end if;
  drop policy if exists orders_consumer_select on public.orders;
  create policy orders_consumer_select
    on public.orders for select
    using (
      consumer_id = auth.uid()
      or public.vendor_staff_may_manage(orders.vendor_id)
      or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
    );

  drop policy if exists orders_vendor_update on public.orders;
  create policy orders_vendor_update
    on public.orders for update
    using (public.vendor_staff_may_manage(vendor_id))
    with check (true);
end;
$o$;

-- order_fulfillment_updates
do $ofu$
begin
  if to_regclass('public.order_fulfillment_updates') is null then
    return;
  end if;
  drop policy if exists order_fulfillment_updates_select_parties on public.order_fulfillment_updates;
  create policy order_fulfillment_updates_select_parties
    on public.order_fulfillment_updates for select
    to authenticated
    using (
      consumer_id = auth.uid()
      or exists (
        select 1
        from public.orders o
        where o.id = order_fulfillment_updates.order_id
          and o.consumer_id = auth.uid()
      )
      or exists (
        select 1
        from public.orders o
        where o.id = order_fulfillment_updates.order_id
          and public.vendor_staff_may_manage(o.vendor_id)
      )
    );
end;
$ofu$;

-- vendor_hours & business_licenses
drop policy if exists vendor_hours_owner_all on public.vendor_hours;
create policy vendor_hours_owner_all
  on public.vendor_hours for all
  using (public.vendor_staff_may_manage(vendor_id))
  with check (public.vendor_staff_may_manage(vendor_id));

drop policy if exists business_licenses_owner_select on public.business_licenses;
create policy business_licenses_owner_select
  on public.business_licenses for select
  using (public.vendor_staff_may_manage(vendor_id));

drop policy if exists business_licenses_owner_write on public.business_licenses;
create policy business_licenses_owner_write
  on public.business_licenses for insert
  with check (public.vendor_staff_may_manage(vendor_id));

drop policy if exists business_licenses_owner_update on public.business_licenses;
create policy business_licenses_owner_update
  on public.business_licenses for update
  using (public.vendor_staff_may_manage(vendor_id))
  with check (public.vendor_staff_may_manage(vendor_id));

drop policy if exists business_licenses_owner_delete on public.business_licenses;
create policy business_licenses_owner_delete
  on public.business_licenses for delete
  using (public.vendor_staff_may_manage(vendor_id));

-- vendor_market_operations
drop policy if exists vendor_market_operations_owner_select on public.vendor_market_operations;
create policy vendor_market_operations_owner_select
  on public.vendor_market_operations for select
  using (public.vendor_staff_may_manage(vendor_id));

-- vendor menu / pos (0051)
do $menu$
begin
  if to_regclass('public.vendor_menu_settings') is null then
    return;
  end if;
  drop policy if exists vendor_menu_settings_vendor_all on public.vendor_menu_settings;
  create policy vendor_menu_settings_vendor_all
    on public.vendor_menu_settings for all
    using (public.vendor_staff_may_manage(vendor_id))
    with check (public.vendor_staff_may_manage(vendor_id));

  drop policy if exists vendor_pos_connections_vendor_all on public.vendor_pos_connections;
  create policy vendor_pos_connections_vendor_all
    on public.vendor_pos_connections for all
    using (public.vendor_staff_may_manage(vendor_id))
    with check (public.vendor_staff_may_manage(vendor_id));

  drop policy if exists vendor_menu_profiles_vendor_all on public.vendor_menu_profiles;
  create policy vendor_menu_profiles_vendor_all
    on public.vendor_menu_profiles for all
    using (public.vendor_staff_may_manage(vendor_id))
    with check (public.vendor_staff_may_manage(vendor_id));

  drop policy if exists vendor_menu_hidden_vendor_all on public.vendor_menu_profile_hidden_products;
  create policy vendor_menu_hidden_vendor_all
    on public.vendor_menu_profile_hidden_products for all
    using (
      exists (
        select 1
        from public.vendor_menu_profiles p
        where p.id = profile_id
          and public.vendor_staff_may_manage(p.vendor_id)
      )
    )
    with check (
      exists (
        select 1
        from public.vendor_menu_profiles p
        where p.id = profile_id
          and public.vendor_staff_may_manage(p.vendor_id)
      )
    );
end;
$menu$;

-- vendor_region_marker_quotas (0050)
do $quota$
begin
  if to_regclass('public.vendor_region_marker_quotas') is null then
    return;
  end if;
  if exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'auth_is_profile_admin'
      and p.pronargs = 0
  ) then
    drop policy if exists vendor_region_marker_quotas_vendor_select on public.vendor_region_marker_quotas;
    create policy vendor_region_marker_quotas_vendor_select
      on public.vendor_region_marker_quotas for select
      using (
        public.vendor_staff_may_manage(vendor_id)
        or public.auth_is_profile_admin()
      );
  end if;
end;
$quota$;

-- smokers_club_homepage_banners
drop policy if exists smokers_club_banners_vendor_select_own on public.smokers_club_homepage_banners;
create policy smokers_club_banners_vendor_select_own
  on public.smokers_club_homepage_banners for select
  to authenticated
  using (
    vendor_id is not null
    and public.vendor_staff_may_manage(vendor_id)
  );

drop policy if exists smokers_club_banners_vendor_insert on public.smokers_club_homepage_banners;
create policy smokers_club_banners_vendor_insert
  on public.smokers_club_homepage_banners for insert
  to authenticated
  with check (
    status = 'pending'
    and vendor_id is not null
    and public.vendor_staff_may_manage(vendor_id)
    and exists (
      select 1
      from public.vendors v
      where v.id = vendor_id
        and coalesce(v.smokers_club_eligible, false) = true
    )
  );

drop policy if exists smokers_club_banners_vendor_delete_pending on public.smokers_club_homepage_banners;
create policy smokers_club_banners_vendor_delete_pending
  on public.smokers_club_homepage_banners for delete
  to authenticated
  using (
    status = 'pending'
    and vendor_id is not null
    and public.vendor_staff_may_manage(vendor_id)
  );

-- review_vendor_reports + vendor_upgrade_requests (0039)
do $rvr2$
begin
  if to_regclass('public.review_vendor_reports') is null then
    return;
  end if;
  drop policy if exists review_vendor_reports_vendor_insert on public.review_vendor_reports;
  create policy review_vendor_reports_vendor_insert
    on public.review_vendor_reports for insert
    to authenticated
    with check (
      public.vendor_staff_may_manage(vendor_id)
      and exists (
        select 1
        from public.reviews r
        where r.id = review_id
          and r.entity_type = 'vendor'
          and r.entity_id = vendor_id
      )
    );

  drop policy if exists review_vendor_reports_vendor_select on public.review_vendor_reports;
  create policy review_vendor_reports_vendor_select
    on public.review_vendor_reports for select
    to authenticated
    using (public.vendor_staff_may_manage(vendor_id));
end;
$rvr2$;

drop policy if exists vendor_upgrade_requests_insert_own on public.vendor_upgrade_requests;
create policy vendor_upgrade_requests_insert_own
  on public.vendor_upgrade_requests for insert
  to authenticated
  with check (
    user_id = auth.uid()
    and exists (
      select 1
      from public.vendors v
      where v.id = vendor_id
        and public.vendor_staff_may_manage(v.id)
    )
  );

comment on table public.vendor_team_members is
  'Additional users with manager access to a vendor dashboard (RLS uses vendor_staff_may_manage).';

comment on table public.vendor_invitations is
  'Pending manager invites; token is shown once from vendor_invite_manager; accept matches auth.users email.';
