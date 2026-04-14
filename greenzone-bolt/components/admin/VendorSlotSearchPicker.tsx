'use client';

import { useState } from 'react';
import { Check, ChevronsUpDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

export type VendorPickRow = {
  id: string;
  name: string;
  offers_delivery: boolean;
  offers_storefront: boolean;
  smokers_club_eligible: boolean;
  license_status: string;
};

type Props = {
  valueId: string | undefined;
  onChange: (vendorId: string | undefined) => void;
  options: VendorPickRow[];
  approvedVendorIds: Set<string>;
  emptyLabel?: string;
  searchPlaceholder?: string;
  disabled?: boolean;
};

function optionSuffix(v: VendorPickRow, approvedVendorIds: Set<string>): string {
  const suffixParts: string[] = [];
  if (!approvedVendorIds.has(v.id)) suffixParts.push(' · Approve in Areas');
  else if (v.license_status !== 'approved') suffixParts.push(' · License not approved');
  return suffixParts.join('');
}

function optionSuffixTree(v: VendorPickRow, approvedVendorIds: Set<string>): string {
  const base = optionSuffix(v, approvedVendorIds);
  if (base) return base;
  if (!v.smokers_club_eligible) return ' · Smokers Club off (backfill only)';
  return '';
}

export function VendorSlotSearchPicker({
  valueId,
  onChange,
  options,
  approvedVendorIds,
  emptyLabel = 'Open (auto backfill)',
  searchPlaceholder = 'Search dispensaries…',
  disabled,
  variant = 'strip',
}: Props & { variant?: 'tree' | 'strip' }) {
  const [open, setOpen] = useState(false);
  const selected = valueId ? options.find((o) => o.id === valueId) : null;
  const suffixFn = variant === 'tree' ? optionSuffixTree : optionSuffix;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className="h-10 w-full justify-between border-green-900/30 bg-gray-900 font-normal text-gray-100 hover:bg-gray-900/90"
        >
          <span className="truncate text-left">
            {selected ? (
              <>
                {selected.name}
                <span className="text-xs font-normal text-gray-500">{suffixFn(selected, approvedVendorIds)}</span>
              </>
            ) : (
              emptyLabel
            )}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" aria-hidden />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[min(100vw-2rem,420px)] p-0" align="start">
        <Command className="bg-gray-950">
          <CommandInput placeholder={searchPlaceholder} className="h-10" />
          <CommandList className="max-h-64">
            <CommandEmpty>No dispensary matches.</CommandEmpty>
            <CommandGroup heading="Slot">
              <CommandItem
                value="__none__ clear open auto"
                onSelect={() => {
                  onChange(undefined);
                  setOpen(false);
                }}
                className="text-gray-200"
              >
                <Check className={cn('mr-2 h-4 w-4', !valueId ? 'opacity-100' : 'opacity-0')} aria-hidden />
                {emptyLabel}
              </CommandItem>
            </CommandGroup>
            <CommandGroup heading="Dispensaries">
              {options.map((v) => (
                <CommandItem
                  key={v.id}
                  value={`${v.name} ${v.id}`}
                  keywords={[v.name, v.id]}
                  onSelect={() => {
                    onChange(v.id);
                    setOpen(false);
                  }}
                  className="text-gray-200"
                >
                  <Check
                    className={cn('mr-2 h-4 w-4 shrink-0', valueId === v.id ? 'opacity-100' : 'opacity-0')}
                    aria-hidden
                  />
                  <span className="min-w-0 flex-1 truncate">
                    {v.name}
                    <span className="block truncate text-xs text-gray-500">{suffixFn(v, approvedVendorIds) || '—'}</span>
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
