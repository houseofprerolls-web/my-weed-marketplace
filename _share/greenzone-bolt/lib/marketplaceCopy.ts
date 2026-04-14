/**
 * Shared UI copy: every vendor is either a delivery service or a storefront (pickup).
 * Use these strings so the product stays consistent across home, directory, and admin.
 */
export const marketplaceCopy = {
  /** Main home hero — keep in sync with marketing; avoid stale deploy copy. */
  heroHeadline: 'Da Treehouse — standout shops near you',
  heroSubline:
    'Use the ZIP bar under the main menu (or Near me) to rank licensed delivery and storefronts in your area. Prime rungs go to operators that earn the spotlight — easy to scan, hard to miss.',

  deliveryService: 'Delivery service',
  deliveryServices: 'Delivery services',
  storefront: 'Storefront',
  storefronts: 'Storefronts',
  vendor: 'Vendor',
  vendors: 'Vendors',

  smokersClubEmptyZipBody:
    'Set your ZIP in the bar under the main menu (or use Near me) so we can rank vendors near you and load the right regional ladder. The treehouse is one canopy with ten placements (#1 = prime). Vendors need delivery and/or storefront enabled and market approval to appear.',

  smokersClubTreehouseTitle: 'Delivery & storefront',
  smokersClubTreehouseBlurb:
    'One treehouse — delivery services and pickup storefronts share ten rungs from the crown down.',

  /** Under Smokers Club logo */
  siteTaglineLegal: 'Your home for legal cannabis',

  smokersClubDeliveryTitle: 'Delivery services',
  smokersClubDeliveryBlurb:
    'Licensed vendors that deliver — premium rope order from the crown down.',
  smokersClubStorefrontTitle: 'Storefronts',
  smokersClubStorefrontBlurb:
    'Pickup-first vendors (no delivery) — their own ten-rung ladder on the tree.',

  featuredVendorsTitle: 'Live vendors near you',
  featuredVendorsSubtitle:
    "Delivery services and storefronts — sorted by ZIP when you've saved a location.",
  featuredEmptyBody:
    'No live approved vendors yet, or set your ZIP in the bar under the main menu so we can rank by proximity.',

  trendingProductsSubline:
    'Menu highlights from licensed shops — open a listing for the full menu and checkout.',
  trendingProductsEmpty:
    'No menu items to show yet. Browse live vendors, pick a shop, and check their menu or deals.',

  directoryTitle: 'Vendor directory',
  directorySubtitle: (count: number, zipHint: string | null) =>
    `Browse ${count} live licensed ${count === 1 ? 'vendor' : 'vendors'} — delivery services and pickup storefronts${
      zipHint ? ` · ZIP ${zipHint}` : ''
    }`,
  directoryEmpty: 'No matching live vendors',

  zipBarDesktop:
    'Your ZIP ranks nearby delivery services and storefronts on the treehouse & directory.',
  zipBarMobile: 'ZIP for nearby vendors',

  adminSmokersIntro:
    'One ten-slot treehouse per market. The picker lists live vendors with delivery and/or storefront; approve them under Areas so they can hang on the public tree. Smokers Club on the vendor card controls auto-backfill when slots are open.',

  adminSmokersLaneDelivery: 'Delivery services',
  adminSmokersLaneStorefront: 'Storefronts',
  adminSmokersNoPickerMatches:
    'No live vendors offer delivery or storefront for this list. Set offers_delivery / offers_storefront on /admin/vendors.',

  adminSmokersAreasHint:
    'Vendors marked “Approve in Areas” are in the list but not approved for this market yet — they will not show on the live treehouse until you toggle them on under Areas.',

  adminVendorPageLead:
    'Each vendor is a delivery service or a storefront (pickup). Switch between them, review analytics, toggle Live and Smokers Club on each card, and update photos, licenses, and hours.',

  adminMarketApprovedDescription:
    'This vendor can appear in Smokers Club and regional placements for this zone.',
  adminSmokersEligibleDescription:
    'Vendor can be placed on the treehouse and appears in admin slot pickers.',
  adminSmokersOffDescription: 'Vendor is excluded from Smokers Club until turned on again.',
} as const;
