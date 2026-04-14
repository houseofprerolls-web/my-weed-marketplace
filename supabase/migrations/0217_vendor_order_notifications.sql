-- Vendor order alerts: configurable outbound emails + per-staff "seen" state for in-app banners.

do $vendors$
begin
  if to_regclass('public.vendors') is null then
    raise notice '0217: public.vendors missing — skipped order_notification_emails';
    return;
  end if;

  alter table public.vendors
    add column if not exists order_notification_emails text[] not null default '{}'::text[];

  comment on column public.vendors.order_notification_emails is
    'Outbound addresses for new-order alert emails (shop-configured). Empty = no automatic emails.';
end;
$vendors$;

do $orders_col$
begin
  if to_regclass('public.orders') is null then
    raise notice '0217: public.orders missing — skipped vendor_new_order_notified_at';
    return;
  end if;

  alter table public.orders
    add column if not exists vendor_new_order_notified_at timestamptz null;

  comment on column public.orders.vendor_new_order_notified_at is
    'Set once by server after consumer checkout triggers vendor email pipeline (idempotency).';
end;
$orders_col$;

do $reads$
begin
  if to_regclass('public.orders') is null then
    raise notice '0217: public.orders missing — skipped vendor_order_reads';
    return;
  end if;

  create table if not exists public.vendor_order_reads (
    order_id uuid not null references public.orders (id) on delete cascade,
    user_id uuid not null references auth.users (id) on delete cascade,
    read_at timestamptz not null default now(),
    primary key (order_id, user_id)
  );

  create index if not exists vendor_order_reads_user_idx
    on public.vendor_order_reads (user_id);

  comment on table public.vendor_order_reads is
    'Vendor staff opened an order detail; drives unseen new-order UI.';

  alter table public.vendor_order_reads enable row level security;

  drop policy if exists vendor_order_reads_select_own on public.vendor_order_reads;
  create policy vendor_order_reads_select_own
    on public.vendor_order_reads for select
    to authenticated
    using (user_id = auth.uid());

  drop policy if exists vendor_order_reads_insert_staff on public.vendor_order_reads;
  create policy vendor_order_reads_insert_staff
    on public.vendor_order_reads for insert
    to authenticated
    with check (
      user_id = auth.uid()
      and (
        public.auth_is_profile_admin()
        or exists (
          select 1
          from public.orders o
          where o.id = order_id
            and public.vendor_staff_may_manage(o.vendor_id)
        )
      )
    );

  drop policy if exists vendor_order_reads_update_own on public.vendor_order_reads;
  create policy vendor_order_reads_update_own
    on public.vendor_order_reads for update
    to authenticated
    using (user_id = auth.uid())
    with check (user_id = auth.uid());

  grant select, insert, update on public.vendor_order_reads to authenticated;
  grant all on public.vendor_order_reads to service_role;
end;
$reads$;
