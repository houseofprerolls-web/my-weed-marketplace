-- Clarify license_number = cannabis LIC (for DBs that already ran 0034 without the comment).
comment on column public.vendor_lead_applications.license_number is
  'Optional state-issued cannabis license number (LIC), not a general business or seller permit.';
