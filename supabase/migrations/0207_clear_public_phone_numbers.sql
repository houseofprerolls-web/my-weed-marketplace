-- One-time PII cleanup: clear phone numbers from public application tables.
-- Skips tables that do not exist on this instance. Does NOT modify auth.users.

do $clear_phones$
begin
  if to_regclass('public.vendors') is not null then
    execute $sql$update public.vendors set phone = null where phone is not null$sql$;
  end if;

  if to_regclass('public.profiles') is not null then
    execute $sql$update public.profiles set phone = null where phone is not null$sql$;
  end if;

  if to_regclass('public.orders') is not null then
    execute $sql$update public.orders set customer_phone = null where customer_phone is not null$sql$;
  end if;

  if to_regclass('public.outreach_contacts') is not null then
    execute $sql$update public.outreach_contacts set phone = null where phone is not null$sql$;
  end if;

  if to_regclass('public.supply_accounts') is not null then
    execute $sql$update public.supply_accounts set contact_phone = null where contact_phone is not null$sql$;
  end if;

  if to_regclass('public.business_inquiries') is not null then
    execute $sql$update public.business_inquiries set phone = '' where phone is distinct from ''$sql$;
  end if;

  if to_regclass('public.vendor_lead_applications') is not null then
    execute $sql$update public.vendor_lead_applications set contact_phone = '' where contact_phone is distinct from ''$sql$;
  end if;

  if to_regclass('public.vendor_profiles') is not null then
    if exists (
      select 1
      from information_schema.columns
      where table_schema = 'public'
        and table_name = 'vendor_profiles'
        and column_name = 'phone'
    ) then
      execute $sql$update public.vendor_profiles set phone = null where phone is not null$sql$;
    end if;
  end if;
end $clear_phones$;
