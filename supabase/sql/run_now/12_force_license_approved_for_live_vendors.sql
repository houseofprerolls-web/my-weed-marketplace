-- Make every currently-live vendor show up as license_status = 'approved'.
-- This unblocks directory and Smokers Club pickers that filter on approved license status.

update public.vendors
set license_status = 'approved'
where is_live = true
  and license_status is distinct from 'approved';

