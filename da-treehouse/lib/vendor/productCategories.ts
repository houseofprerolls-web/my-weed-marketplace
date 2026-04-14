export const PRODUCT_CATEGORIES = [
  "flower",
  "edible",
  "vape",
  "concentrate",
  "topical",
  "preroll",
  "other",
] as const;

export type ProductCategory = (typeof PRODUCT_CATEGORIES)[number];
