/** Map encyclopedia strain row → vendor product fields (all editable after apply). */

export type EncyclopediaStrain = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  thc_min: number | null;
  thc_max: number | null;
  cbd_min: number | null;
  cbd_max: number | null;
  type: string;
  image_url: string | null;
};

export type ProductPrefillFromStrain = {
  strain_id: string;
  name: string;
  description: string;
  /** Single menu potency % (average of encyclopedia range). */
  potency_thc: string;
  potency_cbd: string;
  /** First image URL to merge into product images if present. */
  hero_image_url: string | null;
};

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

export function prefillProductFromEncyclopediaStrain(strain: EncyclopediaStrain): ProductPrefillFromStrain {
  const tMin = Number(strain.thc_min);
  const tMax = Number(strain.thc_max);
  const hasThc = Number.isFinite(tMin) && Number.isFinite(tMax) && (tMin > 0 || tMax > 0);
  const thcAvg = hasThc ? (tMin + tMax) / 2 : 20;
  const potency_thc = String(round1(hasThc ? thcAvg : 20));

  const cMin = Number(strain.cbd_min);
  const cMax = Number(strain.cbd_max);
  const hasCbd = Number.isFinite(cMin) && Number.isFinite(cMax) && (cMin > 0 || cMax > 0);
  const potency_cbd = hasCbd ? String(round1((cMin + cMax) / 2)) : '';

  return {
    strain_id: strain.id,
    name: strain.name,
    description: (strain.description || '').trim(),
    potency_thc,
    potency_cbd,
    hero_image_url: strain.image_url?.trim() || null,
  };
}
