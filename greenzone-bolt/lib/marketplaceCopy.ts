/**
 * Shared UI copy: every vendor is either a delivery service or a storefront (pickup).
 * Use these strings so the product stays consistent across home, directory, and admin.
 */
export const marketplaceCopy = {
  /** Legacy hero copy (home uses spotlight carousel + Smokers Club instead). */
  heroHeadline: 'Da Treehouse — standout shops near you',
  heroSubline:
    'Use the ZIP bar under the main menu (or Near me) to surface licensed delivery and storefronts near you. Trophies call out spotlight picks — easy to scan, hard to miss.',

  deliveryService: 'Delivery service',
  deliveryServices: 'Delivery services',
  storefront: 'Storefront',
  storefronts: 'Storefronts',
  vendor: 'Vendor',
  vendors: 'Vendors',

  smokersClubEmptyZipBody:
    'Set your ZIP in the bar under the main menu (or use Near me) so we can load the right regional tree. Up to seven shops: admin can pin slots; open spots fill by ZIP proximity and shuffle daily. Trophies mark three spotlight picks near you. Vendors need delivery and/or storefront enabled and market approval to appear.',

  smokersClubTreehouseTitle: 'Delivery & storefront',
  smokersClubTreehouseBlurb:
    'One treehouse — delivery services and pickup storefronts share seven rungs from the crown down.',

  /** Under Smokers Club logo */
  siteTaglineLegal: 'Your home for legal cannabis',

  smokersClubDeliveryTitle: 'Delivery services',
  smokersClubDeliveryBlurb:
    'Licensed vendors that deliver — premium rope order from the crown down.',
  smokersClubStorefrontTitle: 'Storefronts',
  smokersClubStorefrontBlurb:
    'Pickup-first vendors (no delivery) — their own seven-rung ladder on the tree.',

  featuredVendorsTitle: 'Live vendors near you',
  featuredVendorsSubtitle:
    "Delivery services and storefronts — sorted by ZIP when you've saved a location.",
  featuredEmptyBody:
    'No live approved vendors yet, or set your ZIP in the bar under the main menu so we can rank by proximity.',

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
    'One seven-slot treehouse per market. Feature slots pin vendors from the picker; open slots are filled by a daily composite score (ZIP, orders, tree engagement, listing quality, rotation). Use the Daily ranking tab to see point breakdowns. Approve vendors under Areas and enable Smokers Club on the vendor card for backfill eligibility.',

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
