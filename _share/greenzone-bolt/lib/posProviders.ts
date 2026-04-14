export const POS_PROVIDER_OPTIONS = [
  { id: 'blaze', label: 'Blaze', docsUrl: 'https://www.blaze.me/' },
  { id: 'dutchie', label: 'Dutchie', docsUrl: 'https://business.dutchie.com/' },
  { id: 'treez', label: 'Treez', docsUrl: 'https://treez.io/' },
  { id: 'jane', label: 'Jane', docsUrl: 'https://www.iheartjane.com/' },
  { id: 'leaflogix', label: 'LeafLogix', docsUrl: 'https://leaflogix.com/' },
  { id: 'flowhub', label: 'Flowhub', docsUrl: 'https://flowhub.com/' },
  { id: 'other', label: 'Other / custom API', docsUrl: '' },
] as const;

export type PosProviderId = (typeof POS_PROVIDER_OPTIONS)[number]['id'];
