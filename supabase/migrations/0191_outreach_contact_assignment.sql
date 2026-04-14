-- Claim / assign outreach contacts to a master admin (self-only via API).

alter table public.outreach_contacts
  add column if not exists assigned_to_user_id uuid references auth.users (id) on delete set null,
  add column if not exists assigned_at timestamptz;

comment on column public.outreach_contacts.assigned_to_user_id is 'Master admin who claimed this lead for follow-up; cleared on unclaim.';
comment on column public.outreach_contacts.assigned_at is 'When assigned_to_user_id was set.';

create index if not exists outreach_contacts_assigned_to_user_id_idx
  on public.outreach_contacts (assigned_to_user_id);

create index if not exists outreach_contacts_unassigned_created_idx
  on public.outreach_contacts (created_at desc)
  where assigned_to_user_id is null;
