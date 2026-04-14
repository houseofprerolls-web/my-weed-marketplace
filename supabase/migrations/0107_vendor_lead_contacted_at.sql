-- Track outbound sales contact without changing approval workflow (status stays pending/approved/rejected).

alter table public.vendor_lead_applications
  add column if not exists contacted_at timestamptz;

comment on column public.vendor_lead_applications.contacted_at is
  'When an admin marked the lead as contacted (outreach logged); independent of approve/reject.';

create index if not exists vendor_lead_applications_contacted_pending_idx
  on public.vendor_lead_applications (created_at desc)
  where status = 'pending' and contacted_at is null;
