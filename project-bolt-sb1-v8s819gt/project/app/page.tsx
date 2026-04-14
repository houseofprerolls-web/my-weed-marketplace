import { Hero } from '@/components/home/Hero';
import { Categories } from '@/components/home/Categories';
import { TrendingProducts } from '@/components/home/TrendingProducts';
import { FeaturedServices } from '@/components/home/FeaturedServices';
import { HowItWorks } from '@/components/home/HowItWorks';

export default function Home() {
  return (
    <div>
      <Hero />
      <Categories />
      <TrendingProducts />
      <FeaturedServices />
      <HowItWorks />
    </div>
  );
}
