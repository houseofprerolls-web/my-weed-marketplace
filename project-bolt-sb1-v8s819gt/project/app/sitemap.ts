import { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://greenzone.com';

  const staticPages = [
    '',
    '/directory',
    '/map',
    '/feed',
    '/strains',
    '/deals',
    '/how-it-works',
    '/pricing',
    '/business'
  ].map(route => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: 'daily' as const,
    priority: route === '' ? 1 : 0.8
  }));

  return staticPages;
}
