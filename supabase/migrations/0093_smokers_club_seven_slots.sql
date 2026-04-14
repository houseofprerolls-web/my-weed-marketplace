-- Smokers Club: seven tree slots (was 10). Remove legacy ranks 8–10, then tighten check.

delete from public.vendor_market_listings
where slot_rank > 7;

alter table public.vendor_market_listings
  drop constraint if exists vendor_market_listings_slot_rank_check;

alter table public.vendor_market_listings
  add constraint vendor_market_listings_slot_rank_check
  check (slot_rank >= 1 and slot_rank <= 7);
