import type { Metadata } from 'next';

interface SEOParams {
  title: string;
  description: string;
  keywords?: string[];
  image?: string;
  url?: string;
  type?: 'website' | 'article';
}

export function generateMetadata({
  title,
  description,
  keywords = [],
  image = '/og-image.png',
  url = '',
  type = 'website'
}: SEOParams): Metadata {
  const siteName = 'GreenZone';
  const fullTitle = `${title} | ${siteName}`;

  return {
    title: fullTitle,
    description,
    keywords: [...keywords, 'cannabis', 'marijuana', 'dispensary', 'weed delivery'].join(', '),
    openGraph: {
      title: fullTitle,
      description,
      url,
      siteName,
      images: [
        {
          url: image,
          width: 1200,
          height: 630,
          alt: title
        }
      ],
      type
    },
    twitter: {
      card: 'summary_large_image',
      title: fullTitle,
      description,
      images: [image]
    },
    alternates: {
      canonical: url
    }
  };
}

export function generateCityPageMetadata(city: string, state: string) {
  return generateMetadata({
    title: `${city} Cannabis Dispensaries & Weed Delivery`,
    description: `Find the best cannabis dispensaries and weed delivery services in ${city}, ${state}. Browse verified dispensaries, read reviews, and discover deals.`,
    keywords: [
      `${city} dispensaries`,
      `${city} weed delivery`,
      `cannabis ${city}`,
      `${city} marijuana`,
      `${state} dispensaries`
    ],
    url: `/dispensaries/${city.toLowerCase()}-${state.toLowerCase()}`
  });
}

export function generateBusinessListingMetadata(
  businessName: string,
  city: string,
  state: string,
  description: string
) {
  return generateMetadata({
    title: `${businessName} - ${city} Cannabis Dispensary`,
    description: description || `Visit ${businessName} in ${city}, ${state}. Quality cannabis products, verified dispensary, read reviews and view deals.`,
    keywords: [
      businessName,
      `${businessName} ${city}`,
      `${city} dispensary`,
      `cannabis ${city}`
    ]
  });
}

export function generateStrainPageMetadata(
  strainName: string,
  strainType: string,
  description: string
) {
  return generateMetadata({
    title: `${strainName} Strain - ${strainType}`,
    description: description || `Learn about ${strainName}, a ${strainType} strain. Find effects, flavors, THC levels, and nearby dispensaries carrying ${strainName}.`,
    keywords: [
      strainName,
      `${strainName} strain`,
      `${strainType} strain`,
      `${strainName} effects`,
      `${strainName} near me`
    ]
  });
}

export function generateStructuredData(type: 'LocalBusiness' | 'Product' | 'Review', data: any) {
  const baseData = {
    '@context': 'https://schema.org',
    '@type': type
  };

  return {
    ...baseData,
    ...data
  };
}

export function generateBusinessStructuredData(business: {
  name: string;
  description: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  phone?: string;
  website?: string;
  rating?: number;
  reviewCount?: number;
}) {
  return generateStructuredData('LocalBusiness', {
    name: business.name,
    description: business.description,
    address: {
      '@type': 'PostalAddress',
      streetAddress: business.address,
      addressLocality: business.city,
      addressRegion: business.state,
      postalCode: business.zip,
      addressCountry: 'US'
    },
    telephone: business.phone,
    url: business.website,
    aggregateRating: business.rating && business.reviewCount ? {
      '@type': 'AggregateRating',
      ratingValue: business.rating,
      reviewCount: business.reviewCount
    } : undefined
  });
}
