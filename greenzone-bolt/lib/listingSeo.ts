import type { Metadata } from 'next';
import { getSiteUrl } from '@/lib/siteUrl';
import { createSupabaseAnonServer } from '@/lib/supabaseServerAnon';
import { resolveUseVendorsTableForDiscovery } from '@/lib/vendorSchema';
import { publicVendorDisplayName } from '@/lib/vendorDisplayName';
import { SITE_NAME } from '@/lib/brand';
import { isVendorListingUuid } from '@/lib/listingPath';
import { indexingRobotsForPublicPages } from '@/lib/seoIndexing';

export type ListingSeoPayload = {
  name: string;
  description: string;
  city: string;
  state: string;
  streetAddress: string;
  postalCode: string;
  image: string | null;
};

function listingSeoFromVendorRow(row: Record<string, unknown>): ListingSeoPayload {
  const name = publicVendorDisplayName(row.name as string | null | undefined);
  const descRaw = String(row.description ?? row.tagline ?? '').trim();
  const description =
    descRaw.length > 0
      ? descRaw.slice(0, 160) + (descRaw.length > 160 ? '…' : '')
      : `${name} — cannabis dispensary on ${SITE_NAME}.`;
  const img =
    (typeof row.banner_url === 'string' && row.banner_url) ||
    (typeof row.logo_url === 'string' && row.logo_url) ||
    null;
  return {
    name,
    description,
    city: String(row.city ?? ''),
    state: String(row.state ?? ''),
    streetAddress: String(row.address ?? ''),
    postalCode: String(row.zip ?? '').replace(/\D/g, '').slice(0, 5),
    image: img,
  };
}

function listingSeoFromProfileRow(row: Record<string, unknown>): ListingSeoPayload {
  const name = String(row.business_name ?? 'Dispensary').trim() || 'Dispensary';
  const descRaw = String(row.description ?? '').trim();
  const description =
    descRaw.length > 0
      ? descRaw.slice(0, 160) + (descRaw.length > 160 ? '…' : '')
      : `${name} — on ${SITE_NAME}.`;
  const img =
    (typeof row.cover_photo_url === 'string' && row.cover_photo_url) ||
    (typeof row.logo_url === 'string' && row.logo_url) ||
    null;
  return {
    name,
    description,
    city: String(row.city ?? ''),
    state: String(row.state ?? ''),
    streetAddress: String(row.address ?? ''),
    postalCode: String(row.zip_code ?? '').replace(/\D/g, '').slice(0, 5),
    image: img,
  };
}

async function fetchListingSeoPayload(segment: string): Promise<ListingSeoPayload | null> {
  const trimmed = String(segment ?? '').trim();
  if (!trimmed) return null;
  const client = createSupabaseAnonServer();
  if (!client) return null;

  const vendorsMode = resolveUseVendorsTableForDiscovery();
  const byUuid = isVendorListingUuid(trimmed);

  const fetchVendorsLive = async () => {
    const base = client
      .from('vendors')
      .select('id,name,city,state,zip,description,tagline,logo_url,banner_url,address')
      .eq('is_live', true)
      .eq('license_status', 'approved')
      .eq('billing_delinquent', false);
    const { data, error } = byUuid
      ? await base.eq('id', trimmed).maybeSingle()
      : await base.eq('slug', trimmed).maybeSingle();
    if (error || !data) return null;
    return data as Record<string, unknown>;
  };

  const fetchProfileById = async () => {
    if (!byUuid) return null;
    const { data, error } = await client
      .from('vendor_profiles')
      .select('id,business_name,city,state,zip_code,description,logo_url,cover_photo_url,address')
      .eq('id', trimmed)
      .maybeSingle();
    if (error || !data) return null;
    return data as Record<string, unknown>;
  };

  if (vendorsMode) {
    const v = await fetchVendorsLive();
    if (v) return listingSeoFromVendorRow(v);
    const p = await fetchProfileById();
    if (p) return listingSeoFromProfileRow(p);
    return null;
  }

  const pFirst = await fetchProfileById();
  if (pFirst) return listingSeoFromProfileRow(pFirst);
  const vFallback = await fetchVendorsLive();
  if (vFallback) return listingSeoFromVendorRow(vFallback);
  return null;
}

export async function buildListingMetadata(segment: string): Promise<Metadata> {
  const site = getSiteUrl();
  const seg = encodeURIComponent(String(segment ?? '').trim());
  const canonical = `${site}/listing/${seg}`;
  const robots = indexingRobotsForPublicPages();
  const payload = await fetchListingSeoPayload(segment);

  if (!payload) {
    return {
      title: `Listing | ${SITE_NAME}`,
      robots,
      alternates: { canonical },
    };
  }

  const title = `${payload.name}${payload.city ? ` in ${payload.city}` : ''} | ${SITE_NAME}`;
  const ogImages =
    payload.image && /^https?:\/\//i.test(payload.image)
      ? [{ url: payload.image }]
      : [{ url: `${site}/brand/datreehouse-logo.png` }];

  return {
    title,
    description: payload.description,
    alternates: { canonical },
    openGraph: {
      title,
      description: payload.description,
      url: canonical,
      siteName: SITE_NAME,
      images: ogImages,
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description: payload.description,
      images: ogImages.map((i) => i.url),
    },
    robots,
  };
}

export async function buildListingJsonLd(segment: string): Promise<Record<string, unknown> | null> {
  const site = getSiteUrl();
  const payload = await fetchListingSeoPayload(segment);
  if (!payload) return null;

  const seg = encodeURIComponent(String(segment ?? '').trim());
  const url = `${site}/listing/${seg}`;
  const sameAs: string[] = [];
  const ld: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    name: payload.name,
    description: payload.description,
    url,
  };
  if (payload.image && /^https?:\/\//i.test(payload.image)) {
    ld.image = payload.image;
  }
  const addressParts = [payload.streetAddress, payload.city, payload.state, payload.postalCode].filter(Boolean);
  if (addressParts.length) {
    ld.address = {
      '@type': 'PostalAddress',
      streetAddress: payload.streetAddress || undefined,
      addressLocality: payload.city || undefined,
      addressRegion: payload.state || undefined,
      postalCode: payload.postalCode || undefined,
      addressCountry: 'US',
    };
  }
  return ld;
}
