/** Client-side mirror of server 21+ rule (YYYY-MM-DD birthdate). */
export function isAtLeast21Birthdate(isoDate: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) return false;
  const birth = new Date(`${isoDate}T12:00:00Z`);
  if (Number.isNaN(birth.getTime())) return false;
  const cutoff = new Date();
  cutoff.setUTCHours(12, 0, 0, 0);
  cutoff.setUTCFullYear(cutoff.getUTCFullYear() - 21);
  return birth.getTime() <= cutoff.getTime();
}
