-- Buyers may cancel their own order until it is completed (not once fulfilled / closed).

create or replace function public.customer_cancel_order (p_order_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $fn$
declare
  n int;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  update public.orders
  set status = 'cancelled'
  where id = p_order_id
    and consumer_id = auth.uid()
    and status in (
      'pending',
      'accepted',
      'en_route',
      'confirmed',
      'preparing',
      'processing',
      'out_for_delivery',
      'new',
      'received'
    );

  get diagnostics n = row_count;
  if n = 0 then
    raise exception 'Cannot cancel: order not found, not yours, already completed, or already cancelled';
  end if;
end;
$fn$;

comment on function public.customer_cancel_order (uuid) is
  'Buyer cancels own order before completion (pending through en_route / legacy in-flight statuses).';
