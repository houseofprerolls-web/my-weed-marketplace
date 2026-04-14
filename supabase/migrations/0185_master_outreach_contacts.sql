-- Master-admin cold outreach: contacts + send log. Access only via service role (API routes).

create table if not exists public.outreach_contacts (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  person_name text,
  company_name text,
  status text not null default 'imported'
    check (
      status in (
        'imported',
        'queued',
        'sent',
        'replied',
        'bounced',
        'unsubscribed',
        'archived',
        'no_send'
      )
    ),
  notes text,
  last_sent_at timestamptz,
  replied_at timestamptz,
  import_batch_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Application must store lower(trim(email)); uniqueness is on the stored value.
create unique index if not exists outreach_contacts_email_unique on public.outreach_contacts (email);

create index if not exists outreach_contacts_status_idx on public.outreach_contacts (status);
create index if not exists outreach_contacts_created_at_idx on public.outreach_contacts (created_at desc);
create index if not exists outreach_contacts_import_batch_idx on public.outreach_contacts (import_batch_id);

create table if not exists public.outreach_sends (
  id uuid primary key default gen_random_uuid(),
  contact_id uuid not null references public.outreach_contacts (id) on delete cascade,
  provider_message_id text,
  outbound_token uuid not null default gen_random_uuid() unique,
  template_key text not null default 'onboarding_v1',
  subject_snapshot text,
  sent_at timestamptz not null default now(),
  sent_by_user_id uuid,
  error text
);

create index if not exists outreach_sends_contact_id_idx on public.outreach_sends (contact_id);
create index if not exists outreach_sends_provider_message_id_idx on public.outreach_sends (provider_message_id);

create or replace function public.outreach_contacts_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists outreach_contacts_updated_at on public.outreach_contacts;
create trigger outreach_contacts_updated_at
  before update on public.outreach_contacts
  for each row execute function public.outreach_contacts_set_updated_at();

alter table public.outreach_contacts enable row level security;
alter table public.outreach_sends enable row level security;

-- Intentionally no policies: anon/authenticated cannot read/write; service role bypasses RLS.

comment on table public.outreach_contacts is 'Cold outreach leads; use service role from master-gated API only.';
comment on table public.outreach_sends is 'Outreach send audit log; match inbound replies via provider_message_id or outbound_token.';

-- Bulk import: insert new as imported; on email conflict only refresh name fields + batch id (never reset status).
create or replace function public.outreach_bulk_import(p_batch uuid, p_rows jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  el jsonb;
  processed int := 0;
  skipped int := 0;
begin
  for el in select * from jsonb_array_elements(coalesce(p_rows, '[]'::jsonb))
  loop
    if lower(trim(coalesce(el->>'email', ''))) !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then
      skipped := skipped + 1;
      continue;
    end if;
    insert into public.outreach_contacts (email, person_name, company_name, import_batch_id, status)
    values (
      lower(trim(el->>'email')),
      nullif(trim(el->>'person_name'), ''),
      nullif(trim(el->>'company_name'), ''),
      p_batch,
      'imported'
    )
    on conflict (email) do update set
      person_name = coalesce(excluded.person_name, outreach_contacts.person_name),
      company_name = coalesce(excluded.company_name, outreach_contacts.company_name),
      import_batch_id = excluded.import_batch_id;
    processed := processed + 1;
  end loop;
  return jsonb_build_object('processed', processed, 'skipped_invalid_email', skipped);
end;
$$;

revoke all on function public.outreach_bulk_import(uuid, jsonb) from public;
grant execute on function public.outreach_bulk_import(uuid, jsonb) to service_role;
