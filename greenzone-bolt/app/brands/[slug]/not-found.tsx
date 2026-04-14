import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

export default function BrandNotFound() {
  return (
    <div className="mx-auto w-full max-w-lg px-4 py-20">
      <Card className="border-brand-red/20 bg-zinc-950/80 p-8 text-center">
        <h1 className="text-xl font-semibold text-white">Brand not found</h1>
        <p className="mt-2 text-sm text-zinc-400">
          This brand may be unverified or the link is incorrect.
        </p>
        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
          <Link href="/brands">
            <Button variant="outline" className="w-full border-white/15 bg-transparent text-white sm:w-auto">
              All brands
            </Button>
          </Link>
          <Link href="/discover">
            <Button className="w-full bg-brand-red text-white hover:bg-brand-red-deep sm:w-auto">Discover</Button>
          </Link>
        </div>
      </Card>
    </div>
  );
}
