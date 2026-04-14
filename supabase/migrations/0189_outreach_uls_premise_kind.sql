-- ULS licenseType → storefront vs delivery (decipher Non-Storefront vs Storefront retailer exports).

alter table public.outreach_contacts
  add column if not exists uls_premise_kind text;

comment on column public.outreach_contacts.uls_premise_kind is 'Derived from ULS licenseType: storefront | delivery | unknown';

create index if not exists outreach_contacts_uls_premise_kind_idx on public.outreach_contacts (uls_premise_kind);

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
  kind text;
begin
  for el in select * from jsonb_array_elements(coalesce(p_rows, '[]'::jsonb))
  loop
    if lower(trim(coalesce(el->>'email', ''))) !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then
      skipped := skipped + 1;
      continue;
    end if;
    kind := nullif(lower(trim(coalesce(el->>'uls_premise_kind', ''))), '');
    if kind is not null and kind not in ('storefront', 'delivery', 'unknown') then
      kind := 'unknown';
    end if;
    insert into public.outreach_contacts (
      email,
      person_name,
      company_name,
      phone,
      notes,
      uls_premise_kind,
      import_batch_id,
      status
    )
    values (
      lower(trim(el->>'email')),
      nullif(trim(el->>'person_name'), ''),
      nullif(trim(el->>'company_name'), ''),
      nullif(trim(el->>'phone'), ''),
      nullif(trim(el->>'notes'), ''),
      kind,
      p_batch,
      'imported'
    )
    on conflict (email) do update set
      person_name = coalesce(excluded.person_name, outreach_contacts.person_name),
      company_name = coalesce(excluded.company_name, outreach_contacts.company_name),
      phone = coalesce(excluded.phone, outreach_contacts.phone),
      notes = coalesce(nullif(trim(excluded.notes), ''), outreach_contacts.notes),
      uls_premise_kind = coalesce(excluded.uls_premise_kind, outreach_contacts.uls_premise_kind),
      import_batch_id = excluded.import_batch_id;
    processed := processed + 1;
  end loop;
  return jsonb_build_object('processed', processed, 'skipped_invalid_email', skipped);
end;
$$;

revoke all on function public.outreach_bulk_import(uuid, jsonb) from public;
grant execute on function public.outreach_bulk_import(uuid, jsonb) to service_role;
