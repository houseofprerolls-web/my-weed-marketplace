-- Create order_documents table expected by checkout/vendor order pages.
-- This app inserts one document per order, sourced from the customer's profile.

create extension if not exists pgcrypto;

create table if not exists public.order_documents (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  uploaded_by uuid references public.profiles (id) on delete set null,

  document_type text not null
    check (document_type in ('government_id', 'passport', 'photo_id')),

  file_url text not null,
  file_name text,
  file_size integer,

  -- App uses: verified | not_verified
  verified_status text not null default 'not_verified'
    check (verified_status in ('not_verified', 'pending_review', 'verified', 'rejected')),

  created_at timestamptz not null default now(),

  -- Checkout + UI assume at most one doc row per order.
  unique (order_id)
);

create index if not exists idx_order_documents_uploaded_by on public.order_documents(uploaded_by);

alter table public.order_documents enable row level security;

-- Admin can do everything.
drop policy if exists order_documents_admin_all on public.order_documents;
create policy order_documents_admin_all
  on public.order_documents for all
  using (public.auth_is_profile_admin())
  with check (public.auth_is_profile_admin());

-- Customers can insert/select their own documents (via orders.consumer_id).
drop policy if exists order_documents_customer_select on public.order_documents;
create policy order_documents_customer_select
  on public.order_documents for select
  to authenticated
  using (
    exists (
      select 1
      from public.orders o
      where o.id = order_documents.order_id
        and o.consumer_id = auth.uid()
    )
  );

drop policy if exists order_documents_customer_insert on public.order_documents;
create policy order_documents_customer_insert
  on public.order_documents for insert
  to authenticated
  with check (
    uploaded_by = auth.uid()
    and exists (
      select 1
      from public.orders o
      where o.id = order_documents.order_id
        and o.consumer_id = auth.uid()
    )
  );

-- Vendors can select documents for orders tied to their vendor staff access.
drop policy if exists order_documents_vendor_select on public.order_documents;
create policy order_documents_vendor_select
  on public.order_documents for select
  to authenticated
  using (
    exists (
      select 1
      from public.orders o
      where o.id = order_documents.order_id
        and public.vendor_staff_may_manage(o.vendor_id)
    )
  );

grant select, insert, update on public.order_documents to authenticated;
grant all on public.order_documents to service_role;

