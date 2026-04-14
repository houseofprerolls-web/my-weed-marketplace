import { supabase } from '@/lib/supabase';
import { SMOKERS_CLUB_SLOT_RANK_MAX, SMOKERS_CLUB_TREEHOUSE_LANE } from '@/lib/smokersClub';

export const HOMEPAGE_BANNER_PRESETS = [
  { value: 'wide_banner', label: 'Wide cinematic', hint: '21:9 feel — hero width' },
  { value: 'hero_strip', label: 'Hero strip', hint: '3:1 — slim headline bar' },
  { value: 'square_tile', label: 'Square tile', hint: '1:1 — card style' },
  { value: 'tall_sidebar', label: 'Tall spotlight', hint: '3:5 — vertical poster' },
  { value: 'leaderboard', label: 'Leaderboard', hint: '4:1 — compact strip' },
] as const;

export type HomepageBannerPreset = (typeof HOMEPAGE_BANNER_PRESETS)[number]['value'];

export type HomepageBannerKind = 'vendor' | 'admin';

export type HomepageBannerRow = {
  id: string;
  vendor_id: string | null;
  /** Curated homepage-only rows have no vendor (migration 0059). */
  banner_kind?: HomepageBannerKind;
  image_url: string;
  link_url: string | null;
  slot_preset: HomepageBannerPreset;
  status: 'pending' | 'approved' | 'rejected' | 'archived';
  admin_note: string | null;
  created_at: string;
};

/** Treat admin / platform banners like a strong tree slot for rotation time. */
export const ADMIN_HOMEPAGE_BANNER_SLOT_RANK = 2;

export function bannerKind(row: Pick<HomepageBannerRow, 'banner_kind' | 'vendor_id'>): HomepageBannerKind {
  if (row.banner_kind === 'admin' || row.vendor_id == null) return 'admin';
  return 'vendor';
}

export function slotRankForHomepageBanner(
  row: HomepageBannerRow,
  rankByVendor: Map<string, number>
): number {
  if (bannerKind(row) === 'admin') return ADMIN_HOMEPAGE_BANNER_SLOT_RANK;
  if (!row.vendor_id) return SMOKERS_CLUB_SLOT_RANK_MAX;
  return rankByVendor.get(row.vendor_id) ?? SMOKERS_CLUB_SLOT_RANK_MAX;
}

/** Tailwind classes per preset — compact so the homepage stays treehouse-first. */
export function homepageBannerPresetClass(preset: string): string {
  switch (preset) {
    case 'wide_banner':
      return 'aspect-[21/9] max-h-[min(22vw,112px)] w-full max-w-2xl sm:max-h-[min(18vw,120px)] sm:max-w-3xl';
    case 'hero_strip':
      return 'aspect-[3/1] max-h-[min(16vw,72px)] w-full max-w-xl sm:max-h-[min(14vw,80px)] sm:max-w-2xl';
    case 'square_tile':
      return 'aspect-square max-h-[min(36vw,132px)] w-full max-w-[132px] sm:max-h-[min(28vw,144px)] sm:max-w-[144px]';
    case 'tall_sidebar':
      return 'aspect-[3/5] max-h-[min(40vw,168px)] w-full max-w-[104px] sm:max-h-[min(32vw,180px)] sm:max-w-[112px]';
    case 'leaderboard':
      return 'aspect-[4/1] max-h-[min(14vw,56px)] w-full max-w-xl sm:max-h-[min(12vw,64px)] sm:max-w-2xl';
    default:
      return 'aspect-[21/9] max-h-[min(22vw,112px)] w-full max-w-2xl sm:max-h-[min(18vw,120px)] sm:max-w-3xl';
  }
}

/**
 * Best (lowest) treehouse slot across all markets for each vendor — higher visibility = more dwell time in carousel.
 */
export async function fetchBestTreehouseSlotByVendor(
  vendorIds: string[]
): Promise<Map<string, number>> {
  const map = new Map<string, number>();
  if (!vendorIds.length) return map;
  const { data, error } = await supabase
    .from('vendor_market_listings')
    .select('vendor_id, slot_rank')
    .in('vendor_id', vendorIds)
    .eq('club_lane', SMOKERS_CLUB_TREEHOUSE_LANE)
    .eq('active', true)
    .gte('slot_rank', 1)
    .lte('slot_rank', SMOKERS_CLUB_SLOT_RANK_MAX);
  if (error || !data) return map;
  for (const row of data as { vendor_id: string; slot_rank: number }[]) {
    const prev = map.get(row.vendor_id);
    if (prev == null || row.slot_rank < prev) map.set(row.vendor_id, row.slot_rank);
  }
  return map;
}

/** Dwell time ms: slot #1 gets the most screen time, #10 the least. */
export function homepageBannerDwellMsForSlot(slotRank: number): number {
  const r = Math.min(Math.max(slotRank, 1), SMOKERS_CLUB_SLOT_RANK_MAX);
  const base = 3200;
  const step = 650;
  return base + (SMOKERS_CLUB_SLOT_RANK_MAX + 1 - r) * step;
}

export async function fetchApprovedHomepageBanners(): Promise<HomepageBannerRow[]> {
  const { data, error } = await supabase
    .from('smokers_club_homepage_banners')
    .select('id,vendor_id,banner_kind,image_url,link_url,slot_preset,status,admin_note,created_at')
    .eq('status', 'approved')
    .order('created_at', { ascending: false });
  if (error) {
    console.warn('homepage banners:', error.message);
    return [];
  }
  return (data || []) as HomepageBannerRow[];
}
