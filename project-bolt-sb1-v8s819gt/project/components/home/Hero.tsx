"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, MapPin, TrendingUp, Award, Shield } from 'lucide-react';

export function Hero() {
  const router = useRouter();
  const [location, setLocation] = useState('');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (location.trim()) {
      router.push(`/directory?location=${encodeURIComponent(location)}`);
    }
  };

  return (
    <div className="relative overflow-hidden bg-gradient-to-br from-black via-gray-900 to-green-950/40 min-h-[85vh] flex items-center">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-green-900/20 via-transparent to-transparent"></div>
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiMxNjUyMmUiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDM0YzAtMi4yMS0xLjc5LTQtNC00cy00IDEuNzktNCA0IDEuNzkgNCA0IDQgNC0xLjc5IDQtNHoiLz48L2c+PC9nPjwvc3ZnPg==')] opacity-60"></div>
      <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent"></div>

      <div className="relative container mx-auto px-4 py-16">
        <div className="max-w-5xl mx-auto">
          <div className="text-center space-y-8 mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-500/10 border border-green-500/20 rounded-full backdrop-blur-sm">
              <Award className="h-4 w-4 text-green-400" />
              <span className="text-sm text-green-400 font-medium">Premium Cannabis Marketplace</span>
            </div>

            <div className="space-y-6">
              <h1 className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-bold text-white leading-[1.1] tracking-tight">
                Find Cannabis
                <span className="block bg-gradient-to-r from-green-400 via-green-500 to-emerald-500 text-transparent bg-clip-text">
                  Near You
                </span>
              </h1>
              <p className="text-xl md:text-2xl text-gray-300 max-w-3xl mx-auto leading-relaxed">
                Discover verified dispensaries, delivery services, and deals. Browse menus, read reviews, and connect with trusted businesses nationwide.
              </p>
            </div>
          </div>

          <form onSubmit={handleSearch} className="max-w-3xl mx-auto mb-10">
            <div className="relative group">
              <div className="absolute -inset-1 bg-gradient-to-r from-green-600 to-emerald-600 rounded-2xl blur opacity-25 group-hover:opacity-40 transition"></div>
              <div className="relative flex flex-col sm:flex-row gap-3 p-3 bg-gray-900/90 backdrop-blur-xl rounded-2xl border border-green-500/20">
                <div className="flex-1 flex items-center gap-3 px-5 py-4 bg-black/50 rounded-xl border border-gray-800/50">
                  <MapPin className="h-5 w-5 text-green-400 flex-shrink-0" />
                  <Input
                    type="text"
                    placeholder="Enter your city or zip code..."
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="flex-1 bg-transparent border-0 text-white placeholder:text-gray-500 focus-visible:ring-0 focus-visible:ring-offset-0 text-lg"
                  />
                </div>
                <Button
                  type="submit"
                  size="lg"
                  className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white px-8 py-6 rounded-xl font-semibold text-lg shadow-lg shadow-green-500/20"
                >
                  <Search className="h-5 w-5 mr-2" />
                  Explore
                </Button>
              </div>
            </div>
          </form>

          <div className="max-w-2xl mx-auto mb-8">
            <div className="bg-gradient-to-r from-green-600/10 via-emerald-600/10 to-green-600/10 border border-green-500/30 rounded-xl p-6 backdrop-blur-sm">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-12 h-12 bg-green-600/20 rounded-full flex items-center justify-center border-2 border-green-500/30">
                  <Shield className="h-6 w-6 text-green-400" />
                </div>
                <div className="flex-1">
                  <h3 className="text-white font-semibold text-lg mb-2">Try Demo Account</h3>
                  <p className="text-gray-300 text-sm mb-4">
                    See the branded vendor dashboard experience - click Sign In and select "Demo Vendor: GreenLeaf Dispensary"
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Badge className="bg-green-600/20 text-green-400 border-green-500/30">
                      Email: greenleaf@greenzone.demo
                    </Badge>
                    <Badge className="bg-green-600/20 text-green-400 border-green-500/30">
                      Password: GreenZone123!
                    </Badge>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap justify-center items-center gap-4 mb-12">
            <span className="text-gray-400 text-sm">Popular Cities:</span>
            {['Los Angeles', 'San Diego', 'San Francisco', 'Sacramento'].map((city) => (
              <Button
                key={city}
                variant="outline"
                size="sm"
                onClick={() => router.push(`/directory?location=${city}`)}
                className="border-green-500/20 bg-green-500/5 hover:bg-green-500/10 text-green-400 hover:text-green-300 rounded-full"
              >
                {city}
              </Button>
            ))}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-4xl mx-auto">
            <div className="relative group">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-green-600 to-emerald-600 rounded-2xl blur opacity-20 group-hover:opacity-30 transition"></div>
              <div className="relative bg-gray-900/50 backdrop-blur-sm border border-green-500/20 rounded-2xl p-6 text-center">
                <Shield className="h-8 w-8 text-green-400 mx-auto mb-3" />
                <div className="text-3xl font-bold text-white mb-1">1,200+</div>
                <div className="text-gray-400 text-sm">Verified Businesses</div>
              </div>
            </div>
            <div className="relative group">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-green-600 to-emerald-600 rounded-2xl blur opacity-20 group-hover:opacity-30 transition"></div>
              <div className="relative bg-gray-900/50 backdrop-blur-sm border border-green-500/20 rounded-2xl p-6 text-center">
                <TrendingUp className="h-8 w-8 text-green-400 mx-auto mb-3" />
                <div className="text-3xl font-bold text-white mb-1">50k+</div>
                <div className="text-gray-400 text-sm">Monthly Visitors</div>
              </div>
            </div>
            <div className="relative group">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-green-600 to-emerald-600 rounded-2xl blur opacity-20 group-hover:opacity-30 transition"></div>
              <div className="relative bg-gray-900/50 backdrop-blur-sm border border-green-500/20 rounded-2xl p-6 text-center">
                <Award className="h-8 w-8 text-green-400 mx-auto mb-3" />
                <div className="text-3xl font-bold text-white mb-1">2M+</div>
                <div className="text-gray-400 text-sm">Customer Reviews</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
