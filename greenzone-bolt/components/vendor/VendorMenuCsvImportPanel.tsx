'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import {
  parseMenuCsv,
  rowToVendorProductPayload,
  VENDOR_MENU_CSV_SAMPLE,
} from '@/lib/menuCsvImport';
import { Loader2, Upload, Download } from 'lucide-react';

type OwnedVendor = { id: string; name: string };

type VendorMenuCsvImportPanelProps = {
  /** When multiple stores, user picks target here; when null and multi, panel shows picker only. */
  defaultVendorId: string;
  ownedVendors: OwnedVendor[];
  multiLocation: boolean;
  onImported: () => void;
};

export function VendorMenuCsvImportPanel({
  defaultVendorId,
  ownedVendors,
  multiLocation,
  onImported,
}: VendorMenuCsvImportPanelProps) {
  const { toast } = useToast();
  const [targetVendorId, setTargetVendorId] = useState(defaultVendorId);
  const [preview, setPreview] = useState<ReturnType<typeof parseMenuCsv> | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setTargetVendorId(defaultVendorId);
  }, [defaultVendorId]);

  const effectiveVendorId = targetVendorId || defaultVendorId;

  const parsedRows = preview?.rows ?? [];

  const rowResults = useMemo(() => {
    return parsedRows.map((row, idx) => {
      const r = rowToVendorProductPayload(row, effectiveVendorId);
      return { idx: idx + 2, r };
    });
  }, [parsedRows, effectiveVendorId]);

  const validPayloads = useMemo(() => {
    return rowResults.filter((x) => x.r.ok).map((x) => (x.r as { ok: true; payload: Record<string, unknown> }).payload);
  }, [rowResults]);

  const errors = useMemo(() => {
    return rowResults.filter((x) => !x.r.ok) as { idx: number; r: { ok: false; error: string } }[];
  }, [rowResults]);

  const onFile = useCallback((file: File | null) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result || '');
      const p = parseMenuCsv(text);
      if (p.headers.length === 0 || p.rows.length === 0) {
        toast({ title: 'Empty CSV', description: 'Add a header row and at least one data row.', variant: 'destructive' });
        setPreview(null);
        return;
      }
      setPreview(p);
    };
    reader.readAsText(file);
  }, [toast]);

  const downloadSample = () => {
    const blob = new Blob([VENDOR_MENU_CSV_SAMPLE], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'vendor-menu-sample.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const runImport = async () => {
    if (validPayloads.length === 0) {
      toast({ title: 'Nothing to import', description: 'Fix row errors or choose a different file.', variant: 'destructive' });
      return;
    }
    setBusy(true);
    let inserted = 0;
    const chunkSize = 40;
    try {
      for (let i = 0; i < validPayloads.length; i += chunkSize) {
        const chunk = validPayloads.slice(i, i + chunkSize);
        let { error } = await supabase.from('products').insert(chunk);
        if (
          error &&
          /is_featured|sale_discount_percent|menu_text_color|brand_display_name|column|does not exist/i.test(
            String(error.message || '')
          )
        ) {
          const slim = chunk.map((c) => {
            const row = { ...(c as Record<string, unknown>) };
            delete row.is_featured;
            delete row.sale_discount_percent;
            delete row.menu_text_color;
            delete row.brand_display_name;
            return row;
          });
          const r2 = await supabase.from('products').insert(slim);
          error = r2.error;
        }
        if (error) throw error;
        inserted += chunk.length;
      }
      toast({
        title: 'Import complete',
        description: `Added ${inserted} product(s).${errors.length ? ` ${errors.length} row(s) skipped.` : ''}`,
      });
      setPreview(null);
      onImported();
    } catch (e: unknown) {
      toast({
        title: 'Import failed',
        description: e instanceof Error ? e.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="border-green-900/30 bg-gray-900/40 p-4 md:p-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-white">Import menu from CSV</h2>
          <p className="mt-1 max-w-2xl text-sm text-gray-400">
            Columns: <span className="text-gray-300">name</span>, <span className="text-gray-300">category</span> (
            flower, edible, vape, concentrate, topical, preroll, other), <span className="text-gray-300">price</span> or{' '}
            <span className="text-gray-300">price_cents</span>, optional{' '}
            <span className="text-gray-300">inventory_count</span>, <span className="text-gray-300">in_stock</span>,{' '}
            <span className="text-gray-300">potency_thc</span>, <span className="text-gray-300">potency_cbd</span>,{' '}
            <span className="text-gray-300">description</span>. New rows only (does not update existing SKUs).
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" size="sm" className="border-green-700/50" onClick={downloadSample}>
            <Download className="mr-2 h-4 w-4" />
            Sample CSV
          </Button>
        </div>
      </div>

      {multiLocation && ownedVendors.length > 1 ? (
        <div className="mt-4 max-w-md space-y-2">
          <Label className="text-gray-400">Import into store</Label>
          <Select value={targetVendorId} onValueChange={setTargetVendorId}>
            <SelectTrigger className="border-green-900/40 bg-gray-950 text-white">
              <SelectValue placeholder="Choose store" />
            </SelectTrigger>
            <SelectContent className="border-green-900/30 bg-gray-950 text-white">
              {ownedVendors.map((v) => (
                <SelectItem key={v.id} value={v.id}>
                  {v.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ) : null}

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <Label htmlFor="vendor-menu-csv" className="sr-only">
          CSV file
        </Label>
        <InputFile id="vendor-menu-csv" onFile={onFile} />
        <Button
          type="button"
          disabled={busy || validPayloads.length === 0}
          className="bg-green-700 hover:bg-green-600"
          onClick={() => void runImport()}
        >
          {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
          Import {validPayloads.length > 0 ? `${validPayloads.length} ` : ''}row{validPayloads.length === 1 ? '' : 's'}
        </Button>
      </div>

      {preview && preview.headers.length > 0 ? (
        <div className="mt-4 space-y-2">
          <p className="text-xs text-gray-500">
            {preview.rows.length} data row(s) · delimiter:{' '}
            {preview.delimiter === '\t' ? 'tab' : preview.delimiter === ';' ? 'semicolon' : 'comma'}
          </p>
          {errors.length > 0 ? (
            <div className="rounded-md border border-amber-800/50 bg-amber-950/30 px-3 py-2 text-sm text-amber-100">
              <p className="font-medium">Skipped rows</p>
              <ul className="mt-1 max-h-28 list-inside list-disc overflow-y-auto text-xs">
                {errors.slice(0, 12).map((e) => (
                  <li key={e.idx}>
                    Line {e.idx}: {e.r.error}
                  </li>
                ))}
              </ul>
              {errors.length > 12 ? <p className="mt-1 text-xs text-amber-200/80">…and {errors.length - 12} more</p> : null}
            </div>
          ) : null}
          <div className="max-h-48 overflow-auto rounded border border-green-900/30">
            <table className="w-full min-w-[480px] text-left text-xs text-gray-300">
              <thead className="sticky top-0 bg-gray-950 text-gray-400">
                <tr>
                  <th className="p-2">#</th>
                  <th className="p-2">Status</th>
                  {preview.headers.slice(0, 8).map((h) => (
                    <th key={h} className="p-2">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {parsedRows.slice(0, 15).map((row, i) => {
                  const res = rowResults[i];
                  const ok = res?.r.ok;
                  return (
                    <tr key={i} className="border-t border-green-900/20">
                      <td className="p-2 text-gray-500">{i + 1}</td>
                      <td className="p-2">{ok ? <span className="text-green-400">ok</span> : <span className="text-amber-300">skip</span>}</td>
                      {preview.headers.slice(0, 8).map((h) => (
                        <td key={h} className="max-w-[140px] truncate p-2">
                          {row[h] ?? ''}
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {parsedRows.length > 15 ? (
            <p className="text-xs text-gray-500">Preview shows first 15 rows; import includes all valid rows.</p>
          ) : null}
        </div>
      ) : null}
    </Card>
  );
}

function InputFile({ id, onFile }: { id: string; onFile: (f: File | null) => void }) {
  return (
    <input
      id={id}
      type="file"
      accept=".csv,text/csv"
      className="max-w-xs text-sm text-gray-400 file:mr-3 file:rounded-md file:border-0 file:bg-green-800 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-white hover:file:bg-green-700"
      onChange={(e) => {
        const f = e.target.files?.[0] ?? null;
        onFile(f);
        e.target.value = '';
      }}
    />
  );
}
