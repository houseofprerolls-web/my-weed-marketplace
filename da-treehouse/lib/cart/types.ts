export type CartLine = {
  productId: string;
  name: string;
  priceCents: number;
  qty: number;
  vendorId: string;
  vendorName: string;
  vendorSlug: string;
};

export const CART_STORAGE_KEY = "cannahub_cart_v1";
