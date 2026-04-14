-- Allow admins to mark sponsored-deal upgrade requests as approved after featuring the deal.

alter table public.vendor_upgrade_requests
  drop constraint if exists vendor_upgrade_requests_status_check;

alter table public.vendor_upgrade_requests
  add constraint vendor_upgrade_requests_status_check
  check (status in ('new', 'seen', 'closed', 'approved'));

comment on column public.vendor_upgrade_requests.status is
  'new = unread; seen = acknowledged; approved = deal was pinned as marketplace featured; closed = dismissed without featuring.';
