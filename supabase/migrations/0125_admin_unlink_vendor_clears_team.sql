-- When an admin unlinks a shop owner, remove all vendor_team_members for that shop
-- and demote any profile from role vendor -> customer when they no longer own or staff any vendor.

create or replace function public.admin_unlink_vendor_user(p_vendor_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  old_uid uuid;
  team_uids uuid[];
  all_uuids uuid[];
  cand uuid;
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

  select coalesce(array_agg(m.user_id), '{}'::uuid[])
  into team_uids
  from public.vendor_team_members m
  where m.vendor_id = p_vendor_id;

  delete from public.vendor_team_members
  where vendor_id = p_vendor_id;

  update public.vendors
  set user_id = null
  where id = p_vendor_id;

  all_uuids := coalesce(team_uids, '{}'::uuid[]);
  if old_uid is not null then
    all_uuids := array_append(all_uuids, old_uid);
  end if;

  for cand in
    select distinct t.x
    from unnest(all_uuids) as t(x)
  loop
    if cand is null then
      continue;
    end if;
    if not exists (select 1 from public.vendors v2 where v2.user_id = cand) then
      if not exists (select 1 from public.vendor_team_members m2 where m2.user_id = cand) then
        update public.profiles p
        set role = 'customer'
        where p.id = cand
          and p.role = 'vendor';
      end if;
    end if;
  end loop;
end;
$$;
