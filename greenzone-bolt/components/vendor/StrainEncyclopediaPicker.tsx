'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { BookOpen, Loader2 } from 'lucide-react';
import type { EncyclopediaStrain } from '@/lib/strainProductPrefill';
import { cn } from '@/lib/utils';

type Props = {
  onPick: (strain: EncyclopediaStrain) => void;
  disabled?: boolean;
  className?: string;
};

export function StrainEncyclopediaPicker({ onPick, disabled, className }: Props) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<EncyclopediaStrain[]>([]);
  const [query, setQuery] = useState('');
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const search = useCallback(async (q: string) => {
    const term = q.trim();
    setLoading(true);
    try {
      let query = supabase
        .from('strains')
        .select(
          'id,name,slug,description,thc_min,thc_max,cbd_min,cbd_max,type,image_url'
        )
        .order('name', { ascending: true })
        .limit(40);

      if (term.length >= 1) {
        const safe = term.replace(/%/g, '');
        query = query.or(`name.ilike.%${safe}%,slug.ilike.%${safe}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      setRows((data || []) as EncyclopediaStrain[]);
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    const t = window.setTimeout(() => {
      setQuery('');
      void search('');
    }, 0);
    return () => window.clearTimeout(t);
  }, [open, search]);

  useEffect(() => {
    return () => {
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    };
  }, []);

  return (
    <div className={cn('space-y-2', className)}>
      <Label className="text-gray-300">Strain encyclopedia</Label>
      <p className="text-xs text-gray-500">
        Search our directory and prefill name, description, THC/CBD, and product photos using the same image logic as
        public strain pages (stored photo, then slug-based fallbacks). You can edit everything before saving.
      </p>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            disabled={disabled}
            className="border-green-800/50 bg-gray-900 text-white hover:bg-gray-800"
          >
            <BookOpen className="mr-2 h-4 w-4 text-brand-lime" />
            Browse / search strains…
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="w-[min(100vw-2rem,22rem)] border-green-900/40 bg-gray-950 p-0 text-white"
          align="start"
        >
          <Command className="bg-gray-950 text-white" shouldFilter={false}>
            <CommandInput
              placeholder="Search by name or slug…"
              className="text-white placeholder:text-gray-500"
              value={query}
              onValueChange={(v) => {
                setQuery(v);
                if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
                searchDebounceRef.current = setTimeout(() => {
                  searchDebounceRef.current = null;
                  void search(v);
                }, 280);
              }}
            />
            <CommandList>
              {loading ? (
                <div className="flex items-center justify-center gap-2 py-8 text-sm text-gray-400">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading…
                </div>
              ) : (
                <>
                  <CommandEmpty className="py-6 text-gray-500">No strains match.</CommandEmpty>
                  <CommandGroup heading="Strains" className="text-gray-400">
                    {rows.map((s) => (
                      <CommandItem
                        key={s.id}
                        value={`${s.name} ${s.slug}`}
                        className="cursor-pointer text-white aria-selected:bg-green-900/40"
                        onSelect={() => {
                          onPick(s);
                          setQuery(s.name);
                          setOpen(false);
                        }}
                      >
                        <div className="flex flex-col gap-0.5">
                          <span className="font-medium">{s.name}</span>
                          <span className="text-xs text-gray-500 capitalize">
                            {s.type}
                            {s.thc_min != null && s.thc_max != null
                              ? ` · THC ${s.thc_min}%–${s.thc_max}%`
                              : ''}
                          </span>
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}
