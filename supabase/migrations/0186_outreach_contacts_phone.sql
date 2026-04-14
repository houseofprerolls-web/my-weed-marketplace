-- Outreach contacts: phone + import RPC includes phone (owner / DBA / legal from CSV).

alter table public.outreach_contacts
  add column if not exists phone text;

comment on column public.outreach_contacts.phone is 'Business or owner phone from import; optional.';

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
    insert into public.outreach_contacts (email, person_name, company_name, phone, import_batch_id, status)
    values (
      lower(trim(el->>'email')),
      nullif(trim(el->>'person_name'), ''),
      nullif(trim(el->>'company_name'), ''),
      nullif(trim(el->>'phone'), ''),
      p_batch,
      'imported'
    )
    on conflict (email) do update set
      person_name = coalesce(excluded.person_name, outreach_contacts.person_name),
      company_name = coalesce(excluded.company_name, outreach_contacts.company_name),
      phone = coalesce(excluded.phone, outreach_contacts.phone),
      import_batch_id = excluded.import_batch_id;
    processed := processed + 1;
  end loop;
  return jsonb_build_object('processed', processed, 'skipped_invalid_email', skipped);
end;
$$;

revoke all on function public.outreach_bulk_import(uuid, jsonb) from public;
grant execute on function public.outreach_bulk_import(uuid, jsonb) to service_role;
