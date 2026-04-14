// Demo data for GreenZone platform

export const demoBusinesses = [
  {
    id: '1',
    name: 'Green Valley Dispensary',
    slug: 'green-valley-dispensary',
    type: 'Dispensary',
    rating: 4.8,
    reviewCount: 342,
    address: '1234 Main St',
    city: 'Los Angeles',
    state: 'CA',
    zipCode: '90001',
    phone: '(555) 123-4567',
    website: 'https://greenvalley.com',
    description: 'Premium cannabis dispensary offering top-shelf flower, edibles, and concentrates. Licensed and locally owned.',
    isOpen: true,
    closingTime: '9:00 PM',
    hasDeals: true,
    isVerified: true,
    isFeatured: true,
    plan: 'Premium',
    licenseNumber: 'C10-0000001-LIC',
    coordinates: { lat: 34.0522, lng: -118.2437 }
  },
  {
    id: '2',
    name: 'Sunset Cannabis Co',
    slug: 'sunset-cannabis',
    type: 'Dispensary',
    rating: 4.6,
    reviewCount: 189,
    address: '567 Ocean Ave',
    city: 'Los Angeles',
    state: 'CA',
    zipCode: '90245',
    phone: '(555) 234-5678',
    website: 'https://sunsetcannabis.com',
    description: 'Beachside dispensary with a laid-back vibe. Specializing in organic flower and artisan edibles.',
    isOpen: true,
    closingTime: '10:00 PM',
    hasDeals: true,
    isVerified: true,
    isFeatured: false,
    plan: 'Growth',
    licenseNumber: 'C10-0000002-LIC',
    coordinates: { lat: 34.0195, lng: -118.4912 }
  },
  {
    id: '3',
    name: 'Highway 420 Collective',
    slug: 'highway-420',
    type: 'Dispensary',
    rating: 4.7,
    reviewCount: 276,
    address: '890 Broadway',
    city: 'Los Angeles',
    state: 'CA',
    zipCode: '90015',
    phone: '(555) 345-6789',
    website: 'https://highway420.com',
    description: 'Your destination for quality cannabis. Wide selection of strains and knowledgeable budtenders.',
    isOpen: false,
    closingTime: 'Opens 9:00 AM',
    hasDeals: false,
    isVerified: true,
    isFeatured: false,
    plan: 'Starter',
    licenseNumber: 'C10-0000003-LIC',
    coordinates: { lat: 34.0407, lng: -118.2468 }
  },
  {
    id: '4',
    name: 'Pacific Green Wellness',
    slug: 'pacific-green',
    type: 'Dispensary',
    rating: 4.9,
    reviewCount: 456,
    address: '2345 Venice Blvd',
    city: 'Los Angeles',
    state: 'CA',
    zipCode: '90006',
    phone: '(555) 456-7890',
    website: 'https://pacificgreen.com',
    description: 'Medical and recreational cannabis dispensary focused on wellness and education.',
    isOpen: true,
    closingTime: '8:00 PM',
    hasDeals: true,
    isVerified: true,
    isFeatured: true,
    plan: 'Premium',
    licenseNumber: 'C10-0000004-LIC',
    coordinates: { lat: 34.0195, lng: -118.3090 }
  }
];

export const demoDeals = [
  {
    id: '1',
    businessId: '1',
    businessName: 'Green Valley Dispensary',
    title: '20% Off All Edibles',
    description: 'Get 20% off our entire selection of premium edibles. Valid all day!',
    category: 'Edibles',
    expiresAt: '2026-03-15',
    views: 2341,
    clicks: 456,
    image: '/deals/edibles-sale.jpg',
    isActive: true
  },
  {
    id: '2',
    businessId: '1',
    businessName: 'Green Valley Dispensary',
    title: 'BOGO House Flower',
    description: 'Buy one get one free on all house flower strains. While supplies last.',
    category: 'Flower',
    expiresAt: '2026-03-20',
    views: 1876,
    clicks: 387,
    image: '/deals/bogo-flower.jpg',
    isActive: true
  },
  {
    id: '3',
    businessId: '2',
    businessName: 'Sunset Cannabis Co',
    title: '$25 Eighths Today Only',
    description: 'Select strains available for just $25 per eighth. Premium quality at unbeatable prices.',
    category: 'Flower',
    expiresAt: '2026-03-10',
    views: 3456,
    clicks: 892,
    image: '/deals/25-eighths.jpg',
    isActive: true
  },
  {
    id: '4',
    businessId: '2',
    businessName: 'Sunset Cannabis Co',
    title: '30% Off Vape Cartridges',
    description: 'Huge savings on all vape cartridges and pens. Top brands included.',
    category: 'Vapes',
    expiresAt: '2026-03-18',
    views: 1654,
    clicks: 312,
    image: '/deals/vape-sale.jpg',
    isActive: true
  },
  {
    id: '5',
    businessId: '4',
    businessName: 'Pacific Green Wellness',
    title: 'Happy Hour 4-6pm Daily',
    description: '15% off everything during happy hour. Every single day!',
    category: 'All Products',
    expiresAt: '2026-03-31',
    views: 4123,
    clicks: 987,
    image: '/deals/happy-hour.jpg',
    isActive: true
  }
];

export const demoReviews = [
  {
    id: '1',
    businessId: '1',
    businessName: 'Green Valley Dispensary',
    author: 'Michael R.',
    rating: 5,
    comment: 'Best dispensary in LA! Great selection and knowledgeable staff. The budtenders really know their stuff and helped me find the perfect strain.',
    date: '2026-03-06',
    verified: true,
    helpful: 23
  },
  {
    id: '2',
    businessId: '1',
    businessName: 'Green Valley Dispensary',
    author: 'Sarah K.',
    rating: 4,
    comment: 'Good quality products but can get busy on weekends. Still worth the wait though!',
    date: '2026-03-05',
    verified: true,
    helpful: 12
  },
  {
    id: '3',
    businessId: '2',
    businessName: 'Sunset Cannabis Co',
    author: 'James T.',
    rating: 5,
    comment: 'Amazing deals and friendly service. The beachside location is a bonus. Highly recommend!',
    date: '2026-03-04',
    verified: true,
    helpful: 18
  },
  {
    id: '4',
    businessId: '4',
    businessName: 'Pacific Green Wellness',
    rating: 5,
    author: 'Lisa M.',
    comment: 'Very professional and clean. Staff is incredibly knowledgeable about medical cannabis. They took time to answer all my questions.',
    date: '2026-03-03',
    verified: true,
    helpful: 31
  }
];

export const demoStrains = [
  {
    id: '1',
    name: 'Blue Dream',
    slug: 'blue-dream',
    type: 'Sativa Hybrid',
    thc: '18-24%',
    cbd: '0.1-0.2%',
    effects: ['Creative', 'Euphoric', 'Relaxing', 'Happy'],
    flavors: ['Berry', 'Sweet', 'Blueberry'],
    description: 'Blue Dream is a legendary West Coast strain that balances full-body relaxation with gentle cerebral invigoration. A cross between Blueberry and Haze, Blue Dream has earned its status as one of the most popular strains in the world.',
    medicalBenefits: ['Pain Relief', 'Depression', 'Nausea'],
    availableAt: ['Green Valley Dispensary', 'Highway 420 Collective']
  },
  {
    id: '2',
    name: 'OG Kush',
    slug: 'og-kush',
    type: 'Indica Hybrid',
    thc: '20-25%',
    cbd: '0.1-0.3%',
    effects: ['Relaxed', 'Happy', 'Euphoric', 'Uplifted'],
    flavors: ['Earthy', 'Pine', 'Woody'],
    description: 'OG Kush is a legendary strain with a mysterious origin story. This California staple has been popular since the 1990s and is known for its potent, long-lasting effects and distinctive aroma.',
    medicalBenefits: ['Stress', 'Anxiety', 'Pain Relief'],
    availableAt: ['Green Valley Dispensary', 'Pacific Green Wellness', 'Sunset Cannabis Co']
  },
  {
    id: '3',
    name: 'Gelato',
    slug: 'gelato',
    type: 'Indica Hybrid',
    thc: '20-25%',
    cbd: '0.1%',
    effects: ['Relaxed', 'Happy', 'Creative', 'Euphoric'],
    flavors: ['Sweet', 'Citrus', 'Berry'],
    description: 'Gelato is a cross between Sunset Sherbet and Thin Mint Girl Scout Cookies. This Bay Area favorite is known for its dessert-like aroma and balanced effects.',
    medicalBenefits: ['Pain', 'Inflammation', 'Muscle Spasms'],
    availableAt: ['Pacific Green Wellness', 'Sunset Cannabis Co']
  }
];

export const subscriptionPlans = [
  {
    id: 'starter',
    name: 'Starter Plan',
    price: 99,
    period: 'month',
    features: [
      'Basic business listing',
      'Business hours & contact info',
      'Upload up to 10 photos',
      'Customer reviews',
      'Basic analytics',
      'Post up to 2 deals per month',
      'Email support'
    ],
    recommended: false
  },
  {
    id: 'growth',
    name: 'Growth Plan',
    price: 299,
    period: 'month',
    features: [
      'Everything in Starter',
      'Verified business badge',
      'Unlimited photos & videos',
      'Priority listing in search',
      'Advanced analytics',
      'Unlimited deals',
      'Respond to reviews',
      'Social media integration',
      'Priority support'
    ],
    recommended: true
  },
  {
    id: 'premium',
    name: 'Premium Plan',
    price: 599,
    period: 'month',
    features: [
      'Everything in Growth',
      'Featured placement included',
      'Homepage visibility',
      'Dedicated account manager',
      'Custom branding options',
      'API access',
      'Competitor insights',
      'Multi-location support',
      'White-glove onboarding',
      '24/7 priority support'
    ],
    recommended: false
  }
];

export const placementOptions = [
  {
    id: 'homepage-featured',
    name: 'Homepage Featured',
    description: 'Get maximum visibility with premium placement on the homepage',
    price: 500,
    period: 'month',
    impressions: '50,000+',
    avgCTR: '7-8%',
    features: [
      'Featured on homepage hero section',
      '50,000+ monthly impressions',
      'Priority listing badge',
      'Detailed performance analytics',
      'Placement guarantee'
    ]
  },
  {
    id: 'city-featured',
    name: 'City Featured',
    description: 'Dominate your local market with city page placement',
    price: 300,
    period: 'month',
    impressions: '20,000+',
    avgCTR: '9-10%',
    features: [
      'Featured on city search pages',
      '20,000+ monthly impressions',
      'Local targeting',
      'Higher conversion rates',
      'Performance tracking'
    ]
  },
  {
    id: 'category-featured',
    name: 'Category Featured',
    description: 'Stand out in specific product categories',
    price: 200,
    period: 'month',
    impressions: '10,000+',
    avgCTR: '8-9%',
    features: [
      'Featured in category pages',
      '10,000+ monthly impressions',
      'Targeted audience',
      'Niche visibility',
      'Analytics dashboard'
    ]
  },
  {
    id: 'sponsored-deal',
    name: 'Sponsored Deal',
    description: 'Promote your best deals to thousands of customers',
    price: 150,
    period: 'deal',
    impressions: '15,000+',
    avgCTR: '12-15%',
    features: [
      'Featured in deals section',
      '15,000+ impressions per deal',
      'Homepage deal carousel',
      'High engagement rates',
      'Deal performance metrics'
    ]
  }
];

export const demoCities = [
  { name: 'Los Angeles', state: 'CA', businessCount: 342, slug: 'los-angeles-ca' },
  { name: 'San Francisco', state: 'CA', businessCount: 198, slug: 'san-francisco-ca' },
  { name: 'San Diego', state: 'CA', businessCount: 167, slug: 'san-diego-ca' },
  { name: 'Sacramento', state: 'CA', businessCount: 89, slug: 'sacramento-ca' },
  { name: 'Denver', state: 'CO', businessCount: 234, slug: 'denver-co' },
  { name: 'Seattle', state: 'WA', businessCount: 156, slug: 'seattle-wa' },
  { name: 'Portland', state: 'OR', businessCount: 143, slug: 'portland-or' },
  { name: 'Las Vegas', state: 'NV', businessCount: 98, slug: 'las-vegas-nv' }
];
