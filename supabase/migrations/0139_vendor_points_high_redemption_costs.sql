-- Raise vendor redemption prices so free placements/boosts require sustained order volume (vendor share),
-- not a handful of orders. Admins can tune further in Admin → Loyalty program → catalog.
--
-- Rough reference at default settings (5 pts/$ subtotal, 30% vendor share): ~$50 subtotal order
-- earns ~75 vendor points. At that pace, 25k pts ≈ 330+ such orders’ worth of vendor share.

-- Homepage top banner (canonical points-unlock row from 0138)
update public.vendor_points_redemption_catalog
set cost_points = 25000, updated_at = now()
where id = 'e7b2c8f4-9a1d-4f3e-b7c2-0d1e2f3a4b5c'::uuid;

-- Any other active banner unlock rows (should be none after 0138, but safe)
update public.vendor_points_redemption_catalog
set cost_points = 25000, updated_at = now()
where kind = 'banner_placement_unlock'
  and active = true
  and id <> 'e7b2c8f4-9a1d-4f3e-b7c2-0d1e2f3a4b5c'::uuid;

update public.vendor_points_redemption_catalog
set cost_points = 30000, updated_at = now()
where kind = 'marker_boost_month' and active = true;

update public.vendor_points_redemption_catalog
set cost_points = 15000, updated_at = now()
where kind = 'discover_boost_week' and active = true;
