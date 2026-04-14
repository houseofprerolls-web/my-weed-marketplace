-- Admin / jr-admin activity log (append-only events + comments for coordination).

create table if not exists public.admin_audit_events (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  action_key text not null,
  summary text not null,
  resource_type text,
  resource_id text,
  metadata jsonb not null default '{}'::jsonb
);

create index if not exists admin_audit_events_created_at_idx
  on public.admin_audit_events (created_at desc);

create index if not exists admin_audit_events_actor_created_idx
  on public.admin_audit_events (actor_id, created_at desc);

create index if not exists admin_audit_events_resource_idx
  on public.admin_audit_events (resource_type, resource_id)
  where resource_type is not null;

create table if not exists public.admin_audit_event_comments (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.admin_audit_events (id) on delete cascade,
  author_id uuid not null references public.profiles (id) on delete cascade,
  body text not null check (char_length(trim(body)) > 0),
  created_at timestamptz not null default now()
);

create index if not exists admin_audit_event_comments_event_idx
  on public.admin_audit_event_comments (event_id, created_at asc);

alter table public.admin_audit_events enable row level security;
alter table public.admin_audit_event_comments enable row level security;

drop policy if exists admin_audit_events_select on public.admin_audit_events;
create policy admin_audit_events_select
  on public.admin_audit_events for select
  to authenticated
  using (
    public.auth_profiles_role_is_admin()
    or public.auth_is_profile_admin()
  );

drop policy if exists admin_audit_events_insert on public.admin_audit_events;
create policy admin_audit_events_insert
  on public.admin_audit_events for insert
  to authenticated
  with check (
    (
      public.auth_profiles_role_is_admin()
      or public.auth_is_profile_admin()
    )
    and actor_id = auth.uid()
  );

drop policy if exists admin_audit_event_comments_select on public.admin_audit_event_comments;
create policy admin_audit_event_comments_select
  on public.admin_audit_event_comments for select
  to authenticated
  using (
    public.auth_profiles_role_is_admin()
    or public.auth_is_profile_admin()
  );

drop policy if exists admin_audit_event_comments_insert on public.admin_audit_event_comments;
create policy admin_audit_event_comments_insert
  on public.admin_audit_event_comments for insert
  to authenticated
  with check (
    (
      public.auth_profiles_role_is_admin()
      or public.auth_is_profile_admin()
    )
    and author_id = auth.uid()
  );

comment on table public.admin_audit_events is
  'Append-only log of admin/jr-admin mutations (actor_id must match JWT).';

comment on table public.admin_audit_event_comments is
  'Notes/reasoning threaded under each admin_audit_events row.';
