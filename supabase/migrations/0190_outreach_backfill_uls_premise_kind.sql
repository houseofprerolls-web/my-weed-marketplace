-- Backfill uls_premise_kind from Notes when it was never set (older imports / classifier).

update public.outreach_contacts
set uls_premise_kind = 'delivery'
where coalesce(nullif(trim(uls_premise_kind), ''), '') = ''
  and notes is not null
  and (
    lower(notes) like '%non-storefront%'
    or lower(notes) like '%non storefront%'
  );

update public.outreach_contacts
set uls_premise_kind = 'storefront'
where coalesce(nullif(trim(uls_premise_kind), ''), '') = ''
  and notes is not null
  and lower(notes) like '%type:%'
  and lower(notes) not like '%non-storefront%'
  and lower(notes) not like '%non storefront%';
