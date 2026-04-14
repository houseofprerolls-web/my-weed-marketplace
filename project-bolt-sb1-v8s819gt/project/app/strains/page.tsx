"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Star, Search, Sparkles } from 'lucide-react';

type Strain = {
  id: string;
  name: string;
  slug: string;
  type: string;
  thc_min: number;
  thc_max: number;
  description: string | null;
  effects: string[];
  flavors: string[];
  image_url: string | null;
  rating: number;
  review_count: number;
};

export default function StrainsPage() {
  const [strains, setStrains] = useState<Strain[]>([]);
  const [filteredStrains, setFilteredStrains] = useState<Strain[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState('all');

  useEffect(() => {
    loadStrains();
  }, []);

  useEffect(() => {
    filterStrains();
  }, [searchTerm, selectedType, strains]);

  const loadStrains = async () => {
    try {
      const { data, error } = await supabase
        .from('strains')
        .select('*')
        .order('popularity_score', { ascending: false });

      if (error) throw error;
      setStrains(data || []);
    } catch (error) {
      console.error('Error loading strains:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterStrains = () => {
    let filtered = strains;

    if (selectedType !== 'all') {
      filtered = filtered.filter(s => s.type.toLowerCase() === selectedType);
    }

    if (searchTerm) {
      filtered = filtered.filter(s =>
        s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.effects.some(e => e.toLowerCase().includes(searchTerm.toLowerCase())) ||
        s.flavors.some(f => f.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    setFilteredStrains(filtered);
  };

  const getTypeColor = (type: string) => {
    switch (type.toLowerCase()) {
      case 'indica':
        return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
      case 'sativa':
        return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
      case 'hybrid':
        return 'bg-green-500/20 text-green-400 border-green-500/30';
      default:
        return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  return (
    <div className="min-h-screen bg-black">
      <div className="bg-gradient-to-b from-green-950/30 to-black py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center space-y-4">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-500/10 border border-green-500/20 rounded-full backdrop-blur-sm mb-4">
              <Sparkles className="h-4 w-4 text-green-400" />
              <span className="text-sm text-green-400 font-medium">Strain Encyclopedia</span>
            </div>
            <h1 className="text-5xl md:text-6xl font-bold text-white">
              Explore Cannabis Strains
            </h1>
            <p className="text-xl text-gray-300">
              Discover detailed information about popular cannabis strains, their effects, and flavors
            </p>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12">
        <div className="mb-8">
          <div className="relative max-w-2xl mx-auto mb-6">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <Input
              type="text"
              placeholder="Search strains by name, effect, or flavor..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-12 bg-gray-900 border-green-900/20 text-white h-14 text-lg"
            />
          </div>

          <Tabs value={selectedType} onValueChange={setSelectedType} className="w-full">
            <TabsList className="bg-gray-900 border border-green-900/20 w-full md:w-auto">
              <TabsTrigger value="all" className="data-[state=active]:bg-green-600 flex-1 md:flex-none">
                All Strains
              </TabsTrigger>
              <TabsTrigger value="indica" className="data-[state=active]:bg-purple-600 flex-1 md:flex-none">
                Indica
              </TabsTrigger>
              <TabsTrigger value="sativa" className="data-[state=active]:bg-orange-600 flex-1 md:flex-none">
                Sativa
              </TabsTrigger>
              <TabsTrigger value="hybrid" className="data-[state=active]:bg-green-600 flex-1 md:flex-none">
                Hybrid
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Card key={i} className="bg-gray-900 border-green-900/20 h-80 animate-pulse" />
            ))}
          </div>
        ) : filteredStrains.length === 0 ? (
          <Card className="bg-gray-900 border-green-900/20 p-12 text-center">
            <p className="text-gray-400 text-lg">No strains found matching your criteria</p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredStrains.map((strain) => (
              <Card
                key={strain.id}
                className="bg-gradient-to-br from-gray-900 to-black border-green-900/20 hover:border-green-600/50 transition-all overflow-hidden group"
              >
                <div className="aspect-video bg-gradient-to-br from-green-900/20 to-black relative overflow-hidden">
                  {strain.image_url ? (
                    <img src={strain.image_url} alt={strain.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Sparkles className="h-16 w-16 text-green-500/30" />
                    </div>
                  )}
                  <div className="absolute top-3 right-3">
                    <Badge className={getTypeColor(strain.type)}>
                      {strain.type}
                    </Badge>
                  </div>
                </div>

                <div className="p-6 space-y-4">
                  <div>
                    <Link href={`/strains/${strain.slug}`}>
                      <h3 className="text-white font-bold text-xl mb-2 group-hover:text-green-400 transition cursor-pointer">
                        {strain.name}
                      </h3>
                    </Link>
                    <div className="flex items-center gap-2 mb-3">
                      <div className="flex items-center gap-1">
                        <Star className="h-4 w-4 fill-yellow-500 text-yellow-500" />
                        <span className="text-white font-semibold">{strain.rating?.toFixed(1) || '4.5'}</span>
                      </div>
                      <span className="text-gray-400 text-sm">({strain.review_count || 0} reviews)</span>
                    </div>
                    <p className="text-gray-400 text-sm line-clamp-2">{strain.description}</p>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-400">THC</span>
                      <span className="text-green-400 font-semibold">
                        {strain.thc_min}% - {strain.thc_max}%
                      </span>
                    </div>
                  </div>

                  {strain.effects && strain.effects.length > 0 && (
                    <div>
                      <p className="text-gray-400 text-xs mb-2">Effects:</p>
                      <div className="flex flex-wrap gap-1">
                        {strain.effects.slice(0, 3).map((effect, i) => (
                          <Badge key={i} variant="outline" className="text-xs border-green-500/20 text-green-400">
                            {effect}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {strain.flavors && strain.flavors.length > 0 && (
                    <div>
                      <p className="text-gray-400 text-xs mb-2">Flavors:</p>
                      <div className="flex flex-wrap gap-1">
                        {strain.flavors.slice(0, 3).map((flavor, i) => (
                          <Badge key={i} variant="outline" className="text-xs border-gray-500/20 text-gray-400">
                            {flavor}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
