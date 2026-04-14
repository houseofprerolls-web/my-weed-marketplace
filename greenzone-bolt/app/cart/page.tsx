"use client";

import {
  useCart,
  vendorsCartLineKey,
  type CartItem,
  type LegacyCartLine,
  type VendorsCartLine,
} from '@/contexts/CartContext';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Minus, Plus, Trash2, ShoppingBag, Store, TicketPercent } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import { useVendorsSchema } from '@/contexts/VendorsSchemaContext';
import { vendorRowPublicMenuEnabled } from '@/lib/vendorOnlineMenuPolicy';
import { formatSupabaseError } from '@/lib/formatSupabaseError';
import { ProductThumbnailBrandTab } from '@/components/product/ProductThumbnailBrandTab';
import { resolveMenuBrandLabel } from '@/lib/productBrandLabel';
import { readShopperGeo, readShopperZip5 } from '@/lib/shopperLocation';
import { mapApproxCenterForShopperZip5 } from '@/lib/mapCoordinates';
import { getMarketForSmokersClub } from '@/lib/marketFromZip';
import {
  fetchApprovedVendorIdsForMarket,
  fetchVendorCoordsById,
  fetchVendorExtraLocationCoordsByVendorId,
  fetchVendorIdsServingZip5,
} from '@/lib/discoverMarketData';
import { vendorPassesShopperMarketGate } from '@/lib/vendorShopperArea';
import { CHECKOUT_MERCHANDISE_TAX_RATE, totalsFromSubtotalAndDeliveryCents } from '@/lib/orderCheckoutTotals';
import { isStorefrontOnlyVendor } from '@/lib/vendorStorefrontDelivery';
import { extractZip5 } from '@/lib/zipUtils';

type VendorHourRow = {
  day_of_week: number;
  open_time: string | null;
  close_time: string | null;
  is_closed: boolean;
};

function hhmmToMinutes(hhmmss: string | null): number | null {
  if (!hhmmss) return null;
  const hhmm = String(hhmmss).slice(0, 5);
  const [h, m] = hhmm.split(':').map((x) => Number(x));
  if (!Number.isFinite(h) || !Number.isFinite(m)) return null;
  return h * 60 + m;
}

function dateToMinutesLocal(d: Date): number {
  return d.getHours() * 60 + d.getMinutes();
}

function isWithinHours(d: Date, rows: VendorHourRow[]): boolean {
  const dow = d.getDay();
  const row = rows.find((r) => r.day_of_week === dow);
  if (!row || row.is_closed) return false;
  const openMin = hhmmToMinutes(row.open_time);
  const closeMin = hhmmToMinutes(row.close_time);
  if (openMin == null || closeMin == null) return false;
  const nowMin = dateToMinutesLocal(d);
  return nowMin >= openMin && nowMin <= closeMin;
}

function hasAnyOpenDay(rows: VendorHourRow[]): boolean {
  return rows.some((r) => !r.is_closed && hhmmToMinutes(r.open_time) != null && hhmmToMinutes(r.close_time) != null);
}

function lineUnitPrice(item: CartItem): number {
  return item.kind === 'vendors' ? item.priceCents / 100 : item.price;
}

function lineLabel(item: CartItem): string {
  return item.kind === 'vendors' ? item.name : item.name;
}

const DEFAULT_LEGACY_DELIVERY_FEE = 5.99;

function vendorDeliveryFeeFromRow(row: Record<string, unknown> | null | undefined): number {
  if (!row) return 0;
  const raw = row.delivery_fee;
  const n = typeof raw === 'string' ? parseFloat(raw) : Number(raw);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.min(n, 999);
}

export default function CartPage() {
  const router = useRouter();
  const { items, updateQuantity, removeItem, clearCart, subtotal, cartKind } = useCart();
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const vendorsSchema = useVendorsSchema();
  const [loading, setLoading] = useState(false);
  const [fulfillment, setFulfillment] = useState<'pickup' | 'delivery' | 'curbside'>('delivery');
  const [deliveryInfo, setDeliveryInfo] = useState({
    address: '',
    city: '',
    zipCode: '',
    phone: '',
    notes: '',
  });
  const [whenType, setWhenType] = useState<'now' | 'scheduled'>('now');
  const [scheduledForLocal, setScheduledForLocal] = useState('');
  const [promoInput, setPromoInput] = useState('');
  const [appliedPromo, setAppliedPromo] = useState<{
    promoId: string;
    code: string;
    discountCents: number;
  } | null>(null);
  const [promoBusy, setPromoBusy] = useState(false);

  const vendorsCheckout =
    vendorsSchema && cartKind === 'vendors' && items.length > 0 && items[0].kind === 'vendors';

  const vendorsCartVendorId =
    vendorsCheckout && items[0].kind === 'vendors' ? items[0].vendorId : null;

  /** `undefined` = still loading vendor row for vendors cart */
  const [vendorDeliveryFeeDollars, setVendorDeliveryFeeDollars] = useState<number | undefined>(undefined);
  /** Set when vendors cart loads — storefront-only shops use pickup + scheduled time only (no ID/address). */
  const [storefrontOnlyCheckout, setStorefrontOnlyCheckout] = useState(false);

  useEffect(() => {
    if (!vendorsCartVendorId || !vendorsSchema) {
      setVendorDeliveryFeeDollars(undefined);
      setStorefrontOnlyCheckout(false);
      return;
    }
    let cancelled = false;
    setVendorDeliveryFeeDollars(undefined);
    setStorefrontOnlyCheckout(false);
    (async () => {
      const { data, error } = await supabase
        .from('vendors')
        .select('*')
        .eq('id', vendorsCartVendorId)
        .maybeSingle();
      if (cancelled) return;
      if (error || !data) {
        setVendorDeliveryFeeDollars(0);
        return;
      }
      const row = data as Record<string, unknown>;
      if (!vendorRowPublicMenuEnabled(row)) {
        clearCart();
        toast({
          title: 'Cart cleared',
          description: 'This shop is not accepting online orders right now.',
          variant: 'destructive',
        });
        setVendorDeliveryFeeDollars(0);
        return;
      }
      setVendorDeliveryFeeDollars(vendorDeliveryFeeFromRow(row));
      setStorefrontOnlyCheckout(
        isStorefrontOnlyVendor({
          address: row.address as string | null | undefined,
          city: row.city as string | null | undefined,
          state: row.state as string | null | undefined,
          zip: row.zip as string | null | undefined,
          offers_delivery: row.offers_delivery as boolean | null | undefined,
          offers_storefront: row.offers_storefront as boolean | null | undefined,
          allow_both_storefront_and_delivery: row.allow_both_storefront_and_delivery as boolean | null | undefined,
          admin_service_mode: row.admin_service_mode as string | null | undefined,
        })
      );
    })();
    return () => {
      cancelled = true;
    };
  }, [vendorsCartVendorId, clearCart, toast, vendorsSchema]);

  useEffect(() => {
    if (!storefrontOnlyCheckout) return;
    setFulfillment('pickup');
    setWhenType('scheduled');
  }, [storefrontOnlyCheckout]);

  const deliveryFee = useMemo(() => {
    if (!vendorsCheckout) return DEFAULT_LEGACY_DELIVERY_FEE;
    if (fulfillment === 'pickup') return 0;
    if (vendorDeliveryFeeDollars === undefined) return DEFAULT_LEGACY_DELIVERY_FEE;
    return vendorDeliveryFeeDollars;
  }, [vendorsCheckout, fulfillment, vendorDeliveryFeeDollars]);

  const lineMerchSubtotalCents = useMemo(() => Math.round(subtotal * 100), [subtotal]);
  const promoDiscountCents = vendorsCheckout ? appliedPromo?.discountCents ?? 0 : 0;
  const merchandiseAfterPromoCents = Math.max(0, lineMerchSubtotalCents - promoDiscountCents);
  const deliveryFeeCentsPreview = Math.round(deliveryFee * 100);
  const taxPreviewCents = totalsFromSubtotalAndDeliveryCents(
    merchandiseAfterPromoCents,
    deliveryFeeCentsPreview
  ).taxCents;
  const tax = taxPreviewCents / 100;
  const total = merchandiseAfterPromoCents / 100 + deliveryFee + tax;

  useEffect(() => {
    setAppliedPromo(null);
    setPromoInput('');
  }, [vendorsCartVendorId]);

  useEffect(() => {
    if (items.length === 0) {
      setAppliedPromo(null);
      setPromoInput('');
    }
  }, [items.length]);

  async function applyStorePromo() {
    if (!vendorsCheckout || !vendorsCartVendorId) return;
    if (!user) {
      toast({
        title: 'Sign in required',
        description: 'Sign in to apply a store promo code.',
        variant: 'destructive',
      });
      return;
    }
    const code = promoInput.trim();
    if (!code) {
      toast({ title: 'Enter a code', description: 'Type the code from the shop.', variant: 'destructive' });
      return;
    }
    setPromoBusy(true);
    try {
      const { data, error } = await supabase.rpc('preview_vendor_promo_code', {
        p_vendor_id: vendorsCartVendorId,
        p_code: code,
        p_subtotal_cents: lineMerchSubtotalCents,
      });
      if (error) throw error;
      const row = data as {
        ok?: boolean;
        promo_id?: string;
        code?: string;
        discount_cents?: number;
        message?: string;
      };
      if (!row?.ok || !row.promo_id) {
        toast({
          title: 'Code not applied',
          description: row?.message || 'Try a different code.',
          variant: 'destructive',
        });
        return;
      }
      const dc = Math.max(0, Math.round(Number(row.discount_cents) || 0));
      setAppliedPromo({
        promoId: String(row.promo_id),
        code: String(row.code ?? code),
        discountCents: dc,
      });
      toast({
        title: 'Promo applied',
        description: `−$${(dc / 100).toFixed(2)} on merchandise for this order.`,
      });
    } catch (e: unknown) {
      toast({
        title: 'Could not apply code',
        description: formatSupabaseError(e),
        variant: 'destructive',
      });
    } finally {
      setPromoBusy(false);
    }
  }

  const handleCheckout = async () => {
    if (!user) {
      toast({
        title: 'Please sign in',
        description: 'You need to be signed in to place an order',
        variant: 'destructive',
      });
      return;
    }

    if (items.length === 0) {
      toast({
        title: 'Cart is empty',
        description: 'Add some products to your cart first',
        variant: 'destructive',
      });
      return;
    }

    const needsAddress = fulfillment === 'delivery' || fulfillment === 'curbside';
    if (needsAddress) {
      if (!deliveryInfo.address || !deliveryInfo.city || !deliveryInfo.zipCode || !deliveryInfo.phone) {
        toast({
          title: 'Missing information',
          description: 'Please fill in address, city, zip, and phone for this fulfillment type',
          variant: 'destructive',
        });
        return;
      }
    } else if (!deliveryInfo.phone) {
      toast({
        title: 'Missing phone',
        description: 'Please add a phone number so the shop can reach you',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);

    try {
      if (vendorsCheckout) {
        const vendorLines = items as VendorsCartLine[];
        const { data: vendorRow, error: vendorRowErr } = await supabase
          .from('vendors')
          .select('*')
          .eq('id', vendorLines[0].vendorId)
          .maybeSingle();
        if (vendorRowErr || !vendorRow || !vendorRowPublicMenuEnabled(vendorRow as Record<string, unknown>)) {
          toast({
            title: 'Checkout unavailable',
            description: 'This shop is not accepting online orders. Your cart was cleared.',
            variant: 'destructive',
          });
          clearCart();
          setLoading(false);
          return;
        }
        const vr = vendorRow as Record<string, unknown>;
        const storefrontOnlyOrder = isStorefrontOnlyVendor({
          address: vr.address as string | null | undefined,
          city: vr.city as string | null | undefined,
          state: vr.state as string | null | undefined,
          zip: vr.zip as string | null | undefined,
          offers_delivery: vr.offers_delivery as boolean | null | undefined,
          offers_storefront: vr.offers_storefront as boolean | null | undefined,
          allow_both_storefront_and_delivery: vr.allow_both_storefront_and_delivery as boolean | null | undefined,
          admin_service_mode: vr.admin_service_mode as string | null | undefined,
        });
        const skipIdAndAddress = storefrontOnlyOrder && fulfillment === 'pickup';
        if (storefrontOnlyOrder && fulfillment !== 'pickup') {
          toast({
            title: 'Pickup only',
            description: 'This shop only accepts scheduled in-store pickup.',
            variant: 'destructive',
          });
          setLoading(false);
          return;
        }
        const { data: hoursData, error: hoursErr } = await supabase
          .from('vendor_hours')
          .select('day_of_week,open_time,close_time,is_closed')
          .eq('vendor_id', vendorLines[0].vendorId);
        if (hoursErr) throw hoursErr;
        const hourRows = ((hoursData || []) as VendorHourRow[]).sort((a, b) => a.day_of_week - b.day_of_week);
        if (!hasAnyOpenDay(hourRows)) {
          toast({
            title: 'Store is currently closed',
            description: 'This store has no active open hours set. Orders are unavailable right now.',
            variant: 'destructive',
          });
          setLoading(false);
          return;
        }

        const now = new Date();
        const vendorOpenNow = isWithinHours(now, hourRows);
        let scheduledForIso: string | null = null;
        let isScheduled = false;
        if (whenType === 'scheduled' || storefrontOnlyOrder) {
          if (!scheduledForLocal) {
            toast({
              title: 'Pick a pickup time',
              description: storefrontOnlyOrder
                ? 'This shop needs a scheduled pickup window during their open hours.'
                : 'Choose a date and time during vendor open hours.',
              variant: 'destructive',
            });
            setLoading(false);
            return;
          }
          const scheduledDate = new Date(scheduledForLocal);
          if (!Number.isFinite(scheduledDate.getTime()) || scheduledDate.getTime() <= Date.now()) {
            toast({
              title: 'Invalid scheduled time',
              description: 'Scheduled time must be in the future.',
              variant: 'destructive',
            });
            setLoading(false);
            return;
          }
          if (!isWithinHours(scheduledDate, hourRows)) {
            toast({
              title: 'Outside vendor hours',
              description: 'Pick a scheduled time when this vendor is open.',
              variant: 'destructive',
            });
            setLoading(false);
            return;
          }
          isScheduled = true;
          scheduledForIso = scheduledDate.toISOString();
        } else if (!vendorOpenNow) {
          toast({
            title: 'Store is closed right now',
            description: 'Please place this as a pre-order for a time when the vendor is open.',
            variant: 'destructive',
          });
          setLoading(false);
          return;
        }

        // Enforce shopper area gate for delivery / curbside (address-based). Pickup at a storefront-only
        // shop skips this gate — the customer is not submitting a delivery address.
        if (!skipIdAndAddress) {
          const shopperZipRaw = readShopperZip5();
          const shopperZip5 =
            shopperZipRaw && shopperZipRaw.length === 5 ? shopperZipRaw : '';
          const zipFromForm = (deliveryInfo.zipCode || '').trim();
          let zip5 = zipFromForm.length === 5 ? zipFromForm : shopperZip5;
          if (zip5.length !== 5) {
            zip5 = extractZip5(String(vr.zip ?? '')) ?? '';
          }
          const market = await getMarketForSmokersClub(zip5 && zip5.length === 5 ? zip5 : null);
          const [approved, vendorIdsServingShopperZip, coordsMap, extrasMap] = await Promise.all([
            market ? fetchApprovedVendorIdsForMarket(market.id) : Promise.resolve(new Set<string>()),
            zip5.length === 5 ? fetchVendorIdsServingZip5(zip5) : Promise.resolve(new Set<string>()),
            fetchVendorCoordsById(),
            fetchVendorExtraLocationCoordsByVendorId(),
          ]);
          const geo = readShopperGeo();
          const approx = zip5.length === 5 ? mapApproxCenterForShopperZip5(zip5) : null;
          const rankLat = geo?.lat ?? approx?.lat ?? null;
          const rankLng = geo?.lng ?? approx?.lng ?? null;
          const vid = String(vr.id ?? '');
          const c = coordsMap.get(vid);
          const ex = extrasMap.get(vid);
          const strictNonCa =
            market != null && market.region_key != null && String(market.region_key) !== 'ca';
          const gateVendor = {
            id: vid,
            zip: (vr.zip as string | null | undefined) ?? null,
            smokers_club_eligible: vr.smokers_club_eligible as boolean | null | undefined,
            is_live: vr.is_live as boolean | null | undefined,
            license_status: String(vr.license_status ?? ''),
            billing_delinquent: vr.billing_delinquent === true,
            geo_lat: c?.geo_lat ?? null,
            geo_lng: c?.geo_lng ?? null,
            map_geo_extra_points:
              ex && ex.length > 0 ? ex.map((e) => ({ lat: e.lat, lng: e.lng })) : undefined,
          };
          const allowed = vendorPassesShopperMarketGate(
            gateVendor,
            approved,
            false,
            {
              shopperZip5: zip5.length === 5 ? zip5 : null,
              vendorIdsServingShopperZip,
              shopperMapLat: rankLat,
              shopperMapLng: rankLng,
            },
            { requireOpsOrTreehouse: strictNonCa }
          );
          if (!allowed) {
            toast({
              title: 'Outside delivery area',
              description: 'This shop is not available for your address / area. Choose a different shop.',
              variant: 'destructive',
            });
            setLoading(false);
            return;
          }
        }

        // Delivery / curbside: ID on file is copied into `order_documents`. Storefront-only scheduled pickup skips ID.
        if (!skipIdAndAddress && !profile?.id_document_url) {
          toast({
            title: 'Upload ID required',
            description: 'Please upload your photo ID in your profile before placing an order.',
            variant: 'destructive',
          });
          setLoading(false);
          router.push('/account/profile');
          return;
        }

        const subtotalCents = Math.round(subtotal * 100);

        let checkoutPromoId: string | null = null;
        let checkoutPromoDiscount = 0;
        if (appliedPromo) {
          const { data: pv, error: pvErr } = await supabase.rpc('preview_vendor_promo_code', {
            p_vendor_id: vendorLines[0].vendorId,
            p_code: appliedPromo.code,
            p_subtotal_cents: subtotalCents,
          });
          if (pvErr) throw pvErr;
          const pvObj = pv as { ok?: boolean; promo_id?: string; discount_cents?: number; message?: string };
          if (!pvObj?.ok) {
            toast({
              title: 'Promo code no longer valid',
              description: pvObj?.message || 'Remove the code and try again.',
              variant: 'destructive',
            });
            setLoading(false);
            return;
          }
          checkoutPromoId = String(pvObj.promo_id ?? '');
          checkoutPromoDiscount = Math.max(0, Math.round(Number(pvObj.discount_cents) || 0));
        }

        const merchandiseNetCents = Math.max(0, subtotalCents - checkoutPromoDiscount);
        const feeDollars =
          fulfillment === 'pickup' ? 0 : vendorDeliveryFeeFromRow(vendorRow as Record<string, unknown>);
        const deliveryFeeCents = Math.round(feeDollars * 100);
        const { taxCents, salesTaxCents, exciseTaxCents, totalCents } = totalsFromSubtotalAndDeliveryCents(
          merchandiseNetCents,
          deliveryFeeCents
        );

        const itemsJson = vendorLines.map((i) => ({
          product_id: i.productId,
          name: i.name,
          quantity: i.quantity,
          unit_price_cents: i.priceCents,
          image: i.image,
          tier_id: i.tierId?.trim() || null,
          quantity_label: i.quantityLabel?.trim() || null,
        }));

        const { data: orderRow, error: orderError } = await supabase
          .from('orders')
          .insert({
            user_id: user.id,
            consumer_id: user.id,
            vendor_id: vendorLines[0].vendorId,
            items: itemsJson,
            total_cents: totalCents,
            subtotal_cents: subtotalCents,
            delivery_fee_cents: deliveryFeeCents,
            tax_cents: taxCents,
            sales_tax_cents: salesTaxCents,
            excise_tax_cents: exciseTaxCents,
            promo_code_id: checkoutPromoId,
            promo_discount_cents: checkoutPromoDiscount,
            status: 'pending',
            pickup_or_delivery: fulfillment,
            delivery_address: needsAddress ? deliveryInfo.address : null,
            delivery_city: needsAddress ? deliveryInfo.city : null,
            delivery_zip: needsAddress ? deliveryInfo.zipCode : null,
            customer_phone: deliveryInfo.phone,
            fulfillment_notes: deliveryInfo.notes || null,
            is_scheduled: isScheduled,
            scheduled_for: scheduledForIso,
          })
          .select('id, order_number')
          .maybeSingle();

        if (orderError) throw orderError;
        if (!orderRow?.id) {
          throw new Error('Order was not created. Check that migrations include order columns and RLS allows insert.');
        }
        const orderNumber = orderRow.order_number?.trim() || orderRow.id.slice(0, 8);

        const { data: sess } = await supabase.auth.getSession();
        const accessToken = sess.session?.access_token;
        if (accessToken) {
          try {
            await fetch('/api/orders/vendor-new-order-notify', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${accessToken}`,
              },
              body: JSON.stringify({ orderId: orderRow.id }),
            });
          } catch {
            /* non-fatal: vendor emails still work if customer retries notify from support */
          }
        }

        if (!skipIdAndAddress && profile?.id_document_url) {
          const docType = profile.id_document_type ?? 'government_id';
          const verifiedStatus = profile.id_verified ? 'verified' : 'not_verified';
          const { error: docErr } = await supabase
            .from('order_documents')
            .insert({
              order_id: orderRow.id,
              uploaded_by: user.id,
              document_type: docType,
              file_url: profile.id_document_url,
              verified_status: verifiedStatus,
            });
          if (docErr) throw docErr;
        }

        if (checkoutPromoId && checkoutPromoDiscount > 0) {
          const { data: fin, error: finErr } = await supabase.rpc('finalize_vendor_promo_redemption', {
            p_order_id: orderRow.id,
            p_promo_id: checkoutPromoId,
            p_discount_cents: checkoutPromoDiscount,
          });
          if (finErr) {
            console.warn('finalize_vendor_promo_redemption', finErr);
          } else {
            const fo = fin as { ok?: boolean; message?: string };
            if (fo && fo.ok === false) {
              console.warn('finalize_vendor_promo_redemption', fo.message);
            }
          }
        }

        clearCart();

        toast({
          title: 'Order placed',
          description: `We sent order ${orderNumber} to the shop. You can track it under My orders.`,
        });

        router.push(`/account/orders/${orderRow.id}`);
        return;
      }

      // Legacy schema: order + order_items
      const legacyItems = items.filter((i): i is LegacyCartLine => i.kind === 'legacy');
      if (legacyItems.length !== items.length || legacyItems.length === 0) {
        toast({
          title: 'Unsupported cart',
          description: 'Clear your cart and try again from a shop page.',
          variant: 'destructive',
        });
        return;
      }

      const serviceId = legacyItems[0].serviceId;
      const orderNumber = `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          order_number: orderNumber,
          user_id: user.id,
          service_id: serviceId,
          status: 'pending',
          subtotal,
          delivery_fee: deliveryFee,
          tax,
          total,
          delivery_address: deliveryInfo.address,
          delivery_city: deliveryInfo.city,
          delivery_zip: deliveryInfo.zipCode,
          phone: deliveryInfo.phone,
          notes: deliveryInfo.notes,
            is_scheduled: false,
            scheduled_for: null,
        })
        .select()
        .single();

      if (orderError) throw orderError;

      const orderItems = legacyItems.map((item) => ({
        order_id: order.id,
        product_id: item.productId,
        quantity: item.quantity,
        price: item.price,
      }));

      const { error: itemsError } = await supabase.from('order_items').insert(orderItems);

      if (itemsError) throw itemsError;

      clearCart();

      toast({
        title: 'Order placed successfully!',
        description: `Your order ${orderNumber} has been received`,
      });

      router.push(`/account/orders/${order.id}`);
    } catch (error: unknown) {
      console.error('Checkout error:', error);
      toast({
        title: 'Checkout failed',
        description: formatSupabaseError(error),
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="bg-gray-900 border-green-900/20 p-12 text-center max-w-md">
          <ShoppingBag className="h-16 w-16 text-gray-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">Your cart is empty</h2>
          <p className="text-gray-400 mb-6">Add some products to get started</p>
          <Button onClick={() => router.push('/dispensaries')} className="bg-green-600 hover:bg-green-700">
            Browse shops
          </Button>
        </Card>
      </div>
    );
  }

  const storeLabel =
    cartKind === 'vendors' && items[0].kind === 'vendors'
      ? items[0].vendorName
      : cartKind === 'legacy' && items[0].kind === 'legacy'
        ? items[0].serviceName
        : 'Your cart';

  return (
    <div className="min-h-screen bg-background py-12">
      <div className="container mx-auto px-4 max-w-6xl">
        <h1 className="text-4xl font-bold text-white mb-2">Shopping cart</h1>
        <p className="mb-8 flex items-center gap-2 text-gray-400">
          <Store className="h-4 w-4 text-green-500" />
          <span>
            One store per cart: <span className="text-white">{storeLabel}</span>
          </span>
        </p>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-4">
            {items.map((item) => (
              <Card
                key={
                  item.kind === 'vendors'
                    ? vendorsCartLineKey(item.productId, item.tierId)
                    : item.productId
                }
                className="bg-gray-900 border-green-900/20 p-6"
              >
                <div className="flex gap-4">
                  <div className="relative h-24 w-24 flex-shrink-0 overflow-hidden rounded-lg bg-green-900/10">
                    {item.image ? (
                      <img
                        src={item.image}
                        alt={lineLabel(item)}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-3xl">🌿</div>
                    )}
                    {item.kind === 'vendors' ? (
                      <ProductThumbnailBrandTab
                        label={resolveMenuBrandLabel({
                          linkedBrandName: item.brandLabel,
                          brandDisplayName: null,
                          storeName: item.vendorName,
                        })}
                      />
                    ) : null}
                  </div>

                  <div className="flex-1">
                    <h3 className="text-white font-semibold text-lg mb-1">{lineLabel(item)}</h3>
                    {item.kind === 'vendors' && item.quantityLabel ? (
                      <p className="text-sm text-green-400/90 mb-1">{item.quantityLabel}</p>
                    ) : null}
                    <div className="flex gap-2 mb-2">
                      {item.kind === 'vendors' ? (
                        <>
                          {item.thc != null && (
                            <span className="text-sm text-gray-400">THC {item.thc}%</span>
                          )}
                          {item.cbd != null && (
                            <span className="text-sm text-gray-400">CBD {item.cbd}%</span>
                          )}
                        </>
                      ) : (
                        <>
                          {item.thc != null && (
                            <span className="text-sm text-gray-400">THC {item.thc}%</span>
                          )}
                          {item.weight && (
                            <span className="text-sm text-gray-400">{item.weight}</span>
                          )}
                        </>
                      )}
                    </div>
                    <p className="text-green-500 font-bold text-xl">
                      ${lineUnitPrice(item).toFixed(2)}
                    </p>
                  </div>

                  <div className="flex flex-col items-end justify-between">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() =>
                        removeItem(item.productId, item.kind === 'vendors' ? item.tierId : undefined)
                      }
                      className="text-red-500 hover:text-red-400 hover:bg-red-500/10"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>

                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() =>
                          updateQuantity(
                            item.productId,
                            item.quantity - 1,
                            item.kind === 'vendors' ? item.tierId : undefined
                          )
                        }
                        className="h-8 w-8 border-green-900/20"
                      >
                        <Minus className="h-3 w-3" />
                      </Button>
                      <span className="text-white font-semibold w-8 text-center">
                        {item.quantity}
                      </span>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() =>
                          updateQuantity(
                            item.productId,
                            item.quantity + 1,
                            item.kind === 'vendors' ? item.tierId : undefined
                          )
                        }
                        className="h-8 w-8 border-green-900/20"
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          <div className="space-y-6">
            <Card className="bg-gray-900 border-green-900/20 p-6">
              <h2 className="text-xl font-bold text-white mb-4">Order summary</h2>
              <div className="space-y-3">
                <div className="flex justify-between text-gray-300">
                  <span>Subtotal</span>
                  <span>${subtotal.toFixed(2)}</span>
                </div>
                {vendorsCheckout && promoDiscountCents > 0 ? (
                  <div className="flex justify-between text-amber-200/90">
                    <span>Store promo ({appliedPromo?.code})</span>
                    <span>−${(promoDiscountCents / 100).toFixed(2)}</span>
                  </div>
                ) : null}
                <div className="flex justify-between text-gray-300">
                  <span>
                    {vendorsCheckout && fulfillment === 'pickup'
                      ? 'Delivery fee'
                      : vendorsCheckout
                        ? 'Delivery / curbside fee'
                        : 'Delivery fee'}
                  </span>
                  <span>
                    {vendorsCheckout && fulfillment === 'pickup'
                      ? '$0.00'
                      : `$${deliveryFee.toFixed(2)}`}
                  </span>
                </div>
                <div className="flex justify-between text-gray-300">
                  <span>Tax ({Math.round(CHECKOUT_MERCHANDISE_TAX_RATE * 100)}%)</span>
                  <span>${tax.toFixed(2)}</span>
                </div>
                <Separator className="bg-green-900/20" />
                <div className="flex justify-between text-white font-bold text-xl">
                  <span>Total</span>
                  <span>${total.toFixed(2)}</span>
                </div>
              </div>
            </Card>

            {vendorsCheckout && vendorsCartVendorId ? (
              <Card className="border-green-900/20 bg-gray-900 p-6">
                <h2 className="mb-3 flex items-center gap-2 text-xl font-bold text-white">
                  <TicketPercent className="h-5 w-5 text-amber-400" aria-hidden />
                  Store promo
                </h2>
                <p className="mb-3 text-xs text-gray-500">
                  Codes are created by the shop. Discount applies to merchandise subtotal before tax.
                </p>
                {appliedPromo ? (
                  <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-amber-800/40 bg-amber-950/20 px-3 py-2 text-sm text-amber-100">
                    <span>
                      <span className="font-mono text-white">{appliedPromo.code}</span>
                      <span className="ml-2 text-amber-200/90">−${(appliedPromo.discountCents / 100).toFixed(2)}</span>
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-amber-200 hover:bg-amber-900/30 hover:text-white"
                      onClick={() => {
                        setAppliedPromo(null);
                        setPromoInput('');
                      }}
                    >
                      Remove
                    </Button>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <Input
                      value={promoInput}
                      onChange={(e) => setPromoInput(e.target.value)}
                      placeholder="e.g. SPRING20"
                      className="border-green-900/30 bg-background text-white sm:flex-1"
                      disabled={!user}
                    />
                    <Button
                      type="button"
                      variant="secondary"
                      className="bg-amber-700 text-white hover:bg-amber-600"
                      disabled={!user || promoBusy}
                      onClick={() => void applyStorePromo()}
                    >
                      {promoBusy ? 'Checking…' : 'Apply'}
                    </Button>
                  </div>
                )}
                {!user ? (
                  <p className="mt-2 text-xs text-gray-500">Sign in to use a promo code at checkout.</p>
                ) : null}
              </Card>
            ) : null}

            {vendorsCheckout && (
              <Card className="bg-gray-900 border-green-900/20 p-6">
                <h2 className="text-xl font-bold text-white mb-4">Fulfillment</h2>
                {storefrontOnlyCheckout ? (
                  <p className="text-sm text-gray-300">
                    This shop is <span className="text-white font-medium">storefront / pickup only</span>. Orders are
                    in-store pickup — choose a pickup time below (no delivery to your address).
                  </p>
                ) : (
                  <>
                    <Label className="text-gray-300 mb-2 block">How would you like to receive this order?</Label>
                    <Select
                      value={fulfillment}
                      onValueChange={(v) => setFulfillment(v as typeof fulfillment)}
                    >
                      <SelectTrigger className="border-green-900/30 bg-background text-foreground">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="border-green-900/30 bg-gray-950 text-white">
                        <SelectItem value="delivery">Delivery</SelectItem>
                        <SelectItem value="pickup">In-store pickup</SelectItem>
                        <SelectItem value="curbside">Curbside</SelectItem>
                      </SelectContent>
                    </Select>
                  </>
                )}
                <div className="mt-4 space-y-3">
                  <Label className="text-gray-300">When</Label>
                  {storefrontOnlyCheckout ? (
                    <p className="text-xs text-gray-500">
                      Pick a date and time during the store&apos;s open hours. You&apos;ll pick up at the dispensary — no
                      delivery address or ID upload required for this order type.
                    </p>
                  ) : (
                    <Select value={whenType} onValueChange={(v) => setWhenType(v as 'now' | 'scheduled')}>
                      <SelectTrigger className="border-green-900/30 bg-background text-foreground">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="border-green-900/30 bg-gray-950 text-white">
                        <SelectItem value="now">As soon as possible (if open)</SelectItem>
                        <SelectItem value="scheduled">Pre-order for a scheduled time</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                  {whenType === 'scheduled' || storefrontOnlyCheckout ? (
                    <div>
                      <Label htmlFor="scheduledFor" className="text-gray-300">
                        {storefrontOnlyCheckout ? 'Pickup time' : 'Scheduled time (must be during vendor open hours)'}
                      </Label>
                      <Input
                        id="scheduledFor"
                        type="datetime-local"
                        value={scheduledForLocal}
                        onChange={(e) => setScheduledForLocal(e.target.value)}
                        className="bg-background border-green-900/20 text-white"
                      />
                    </div>
                  ) : null}
                </div>
              </Card>
            )}

            <Card className="bg-gray-900 border-green-900/20 p-6">
              <h2 className="text-xl font-bold text-white mb-4">
                {storefrontOnlyCheckout
                  ? 'Contact & pickup notes'
                  : fulfillment === 'pickup'
                    ? 'Contact & notes'
                    : 'Delivery information'}
              </h2>
              <div className="space-y-4">
                {(fulfillment === 'delivery' || fulfillment === 'curbside' || !vendorsCheckout) && (
                  <>
                    <div>
                      <Label htmlFor="address" className="text-gray-300">
                        Address
                      </Label>
                      <Input
                        id="address"
                        value={deliveryInfo.address}
                        onChange={(e) => setDeliveryInfo({ ...deliveryInfo, address: e.target.value })}
                        placeholder="123 Main St"
                        className="bg-background border-green-900/20 text-white"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="city" className="text-gray-300">
                          City
                        </Label>
                        <Input
                          id="city"
                          value={deliveryInfo.city}
                          onChange={(e) => setDeliveryInfo({ ...deliveryInfo, city: e.target.value })}
                          placeholder="Los Angeles"
                          className="bg-background border-green-900/20 text-white"
                        />
                      </div>
                      <div>
                        <Label htmlFor="zip" className="text-gray-300">
                          Zip code
                        </Label>
                        <Input
                          id="zip"
                          value={deliveryInfo.zipCode}
                          onChange={(e) => setDeliveryInfo({ ...deliveryInfo, zipCode: e.target.value })}
                          placeholder="90001"
                          className="bg-background border-green-900/20 text-white"
                        />
                      </div>
                    </div>
                  </>
                )}
                <div>
                  <Label htmlFor="phone" className="text-gray-300">
                    Phone
                  </Label>
                  <Input
                    id="phone"
                    value={deliveryInfo.phone}
                    onChange={(e) => setDeliveryInfo({ ...deliveryInfo, phone: e.target.value })}
                    placeholder="(555) 123-4567"
                    className="bg-background border-green-900/20 text-white"
                  />
                </div>
                <div>
                  <Label htmlFor="notes" className="text-gray-300">
                    Notes (optional)
                  </Label>
                  <Textarea
                    id="notes"
                    value={deliveryInfo.notes}
                    onChange={(e) => setDeliveryInfo({ ...deliveryInfo, notes: e.target.value })}
                    placeholder="Gate code, vehicle color, special instructions…"
                    className="bg-background border-green-900/20 text-white"
                  />
                </div>
              </div>
            </Card>

            <Button
              onClick={handleCheckout}
              disabled={loading}
              className="w-full bg-green-600 hover:bg-green-700 text-white h-12 text-lg"
            >
              {loading ? 'Processing…' : 'Place order'}
            </Button>

            <p className="text-xs text-gray-500 text-center">
              By placing an order, you agree to our terms and confirm you are 21+ where required.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
