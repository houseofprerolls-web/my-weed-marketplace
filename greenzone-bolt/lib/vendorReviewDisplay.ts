/**
 * Listing + vendor tools: normalize how we show review authors and which rows are valid to show.
 */

/** ISO timestamps clearly in the future (bad seed data) are excluded from shopper-facing lists. */
export function filterReviewsCreatedNotInFuture<T extends { created_at: string }>(rows: T[]): T[] {
  const now = Date.now();
  return rows.filter((r) => {
    const t = new Date(r.created_at).getTime();
    return Number.isFinite(t) && t <= now;
  });
}

export type ReviewAuthorProfileBits = {
  /** `profiles.username` */
  profileUsername: string | null;
  /** `user_profiles.username` when profiles row has no username */
  secondaryUsername: string | null;
  /** `profiles.full_name` */
  profileFullName: string | null;
  /** `reviews.reviewer_display_handle` (guest / seeded) */
  guestHandle: string | null;
};

/**
 * Values for listing `Review.profiles`: `username` drives @profile link when set; otherwise UI shows `full_name`.
 */
export function publicReviewProfilesFromAuthorBits(bits: ReviewAuthorProfileBits): {
  username: string | null;
  full_name: string;
} {
  const u =
    [bits.profileUsername, bits.secondaryUsername]
      .map((s) => String(s ?? '').trim())
      .find((s) => s.length > 0) || null;
  if (u) {
    return { username: u, full_name: u };
  }
  const guest = String(bits.guestHandle ?? '').trim();
  if (guest) {
    return { username: null, full_name: guest };
  }
  const fn = String(bits.profileFullName ?? '').trim();
  if (fn && fn.toLowerCase() !== 'customer') {
    return { username: null, full_name: fn };
  }
  return { username: null, full_name: 'Member' };
}

/** Single-line label for vendor dashboard (no link). */
export function vendorDashboardReviewerLabel(bits: ReviewAuthorProfileBits): string {
  const { username, full_name } = publicReviewProfilesFromAuthorBits(bits);
  if (username) return `@${username}`;
  return full_name;
}
