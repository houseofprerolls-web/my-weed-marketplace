-- Anonymous clients can’t aggregate other vendors’ orders; this RPC powers Smokers Club operational ranking only.

create or replace function public.smokers_club_order_counts_for_vendors(
  p_vendor_ids uuid[],
  p_since timestamptz
)
returns table (vendor_id uuid, cnt bigint)
language sql
stable
security definer
set search_path = public
as $$
  select o.vendor_id, count(*)::bigint as cnt
  from public.orders o
  where o.vendor_id = any(p_vendor_ids)
    and o.created_at >= p_since
    and o.status <> 'cancelled'
  group by o.vendor_id;
$$;

comment on function public.smokers_club_order_counts_for_vendors(uuid[], timestamptz) is
  'Order volume since p_since (excl. cancelled) for Smokers Club daily ops ranking; SECURITY DEFINER.';

grant execute on function public.smokers_club_order_counts_for_vendors(uuid[], timestamptz) to anon;
grant execute on function public.smokers_club_order_counts_for_vendors(uuid[], timestamptz) to authenticated;
grant execute on function public.smokers_club_order_counts_for_vendors(uuid[], timestamptz) to service_role;
