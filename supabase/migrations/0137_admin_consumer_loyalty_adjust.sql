-- Admin: read consumer loyalty data + manual balance adjustments (mirror vendor admin_adjust).

drop policy if exists consumer_loyalty_ledger_admin_select on public.consumer_loyalty_ledger;
create policy consumer_loyalty_ledger_admin_select
  on public.consumer_loyalty_ledger for select
  to authenticated
  using (
    public.auth_profiles_role_is_admin()
    or public.auth_is_profile_admin()
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

drop policy if exists consumer_loyalty_balances_admin_select on public.consumer_loyalty_balances;
create policy consumer_loyalty_balances_admin_select
  on public.consumer_loyalty_balances for select
  to authenticated
  using (
    public.auth_profiles_role_is_admin()
    or public.auth_is_profile_admin()
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

create or replace function public.admin_consumer_loyalty_adjust(
  p_consumer_id uuid,
  p_delta bigint,
  p_note text
)
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
  if not (
    public.auth_profiles_role_is_admin()
    or public.auth_is_profile_admin()
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  ) then
    raise exception 'forbidden';
  end if;
  if p_delta = 0 then
    return;
  end if;

  insert into public.consumer_loyalty_ledger (consumer_id, delta, reason, order_id)
  values (
    p_consumer_id,
    p_delta,
    'admin_adjustment',
    null
  );

  insert into public.consumer_loyalty_balances (consumer_id, balance)
  values (p_consumer_id, greatest(p_delta, 0))
  on conflict (consumer_id) do update
    set balance = greatest(public.consumer_loyalty_balances.balance + p_delta, 0),
        updated_at = now();
end;
$$;

revoke all on function public.admin_consumer_loyalty_adjust(uuid, bigint, text) from public;
grant execute on function public.admin_consumer_loyalty_adjust(uuid, bigint, text) to authenticated;
