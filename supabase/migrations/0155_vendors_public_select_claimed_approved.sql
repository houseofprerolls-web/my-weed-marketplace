-- Let anon read approved vendors that are either live OR have a linked owner (claimed),
-- so global search and public clients can resolve linked shops before they go live.

drop policy if exists vendors_public_select on public.vendors;

create policy vendors_public_select
  on public.vendors for select
  using (
    license_status = 'approved'
    and (
      coalesce(is_live, false) = true
      or user_id is not null
    )
  );

comment on policy vendors_public_select on public.vendors is
  'Public: approved + (live or linked owner). Search/listings can show claimed shops pre-live.';
