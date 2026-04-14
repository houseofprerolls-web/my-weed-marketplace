import type { Metadata } from 'next';
import { SITE_NAME } from '@/lib/brand';

export const metadata: Metadata = {
  title: `Loyalty rewards & points store — ${SITE_NAME}`,
  description:
    'Da Treehouse monthly giveaway, leaderboard, and loyalty points store — earn points on orders and redeem rewards.',
};

export default function LoyaltyStoreLayout({ children }: { children: React.ReactNode }) {
  return children;
}
