import { Hero } from '@/components/home/Hero';
import { FeaturedServices } from '@/components/home/FeaturedServices';
import { HowItWorks } from '@/components/home/HowItWorks';

export default function Home() {
  return (
    <div>
      <Hero />
      <FeaturedServices />
      <HowItWorks />
    </div>
  );
}
