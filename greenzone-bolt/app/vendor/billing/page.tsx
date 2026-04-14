'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { VendorNav } from '@/components/vendor/VendorNav';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/lib/supabase';
import { useVendorBusiness } from '@/hooks/useVendorBusiness';
import { useAdminMenuVendorOverride } from '@/hooks/useAdminMenuVendorOverride';
import { withAdminVendorQuery } from '@/lib/adminVendorPortalQuery';
import { useVendorsSchema } from '@/contexts/VendorsSchemaContext';
import { CircleAlert as AlertCircle, FileText, ExternalLink } from 'lucide-react';

type Notice = Record<string, unknown> | null;

export default function VendorBillingPage() {
  const adminMenuVendorId = useAdminMenuVendorOverride();
  const { vendor, loading: vLoading } = useVendorBusiness({ adminMenuVendorId });
  const vendorsMode = useVendorsSchema();
  const vLink = (path: string) => withAdminVendorQuery(path, adminMenuVendorId);

  const [notice, setNotice] = useState<Notice>(null);
  const [signedInvoiceUrl, setSignedInvoiceUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!vendor?.id) {
      setNotice(null);
      setSignedInvoiceUrl(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase.rpc('vendor_platform_billing_notice', { p_vendor_id: vendor.id });
    if (error || !data || typeof data !== 'object' || Array.isArray(data)) {
      setNotice(null);
      setSignedInvoiceUrl(null);
      setLoading(false);
      return;
    }
    const n = data as Record<string, unknown>;
    setNotice(n);

    const path = typeof n.invoice_storage_path === 'string' ? n.invoice_storage_path.trim() : '';
    if (path) {
      const { data: signed } = await supabase.storage
        .from('platform-billing-invoices')
        .createSignedUrl(path, 3600);
      setSignedInvoiceUrl(signed?.signedUrl ?? null);
    } else {
      setSignedInvoiceUrl(null);
    }
    setLoading(false);
  }, [vendor?.id]);

  useEffect(() => {
    void load();
  }, [load]);

  if (!vendorsMode) {
    return (
      <div className="flex min-h-screen flex-col bg-slate-50 md:flex-row">
        <VendorNav />
        <div className="mx-auto w-full min-w-0 max-w-lg flex-1 px-4 py-16">
          <Card className="p-6 text-center text-slate-600">
            Platform billing is available when the directory uses the vendors table (
            <code className="text-slate-800">NEXT_PUBLIC_USE_VENDORS_TABLE=1</code>).
          </Card>
        </div>
      </div>
    );
  }

  if (vLoading || loading) {
    return (
      <div className="flex min-h-screen flex-col bg-slate-50 md:flex-row">
        <VendorNav />
        <div className="mx-auto w-full min-w-0 max-w-3xl flex-1 px-4 py-12 text-slate-500">Loading billing…</div>
      </div>
    );
  }

  if (!vendor) {
    return (
      <div className="flex min-h-screen flex-col bg-slate-50 md:flex-row">
        <VendorNav />
        <div className="mx-auto w-full min-w-0 max-w-lg flex-1 px-4 py-16">
          <Card className="p-6 text-center text-slate-600">Link a dispensary to your account to see billing.</Card>
        </div>
      </div>
    );
  }

  const kind = notice?.notice_kind;
  const overdue = kind === 'overdue' || notice?.billing_suspended === true;
  const dueSoon = kind === 'due_soon';
  const extUrl =
    typeof notice?.invoice_document_url === 'string' && notice.invoice_document_url.trim()
      ? notice.invoice_document_url.trim()
      : null;

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 md:flex-row">
      <VendorNav />
      <div className="mx-auto w-full min-w-0 max-w-3xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold text-slate-900">Platform billing</h1>
        <p className="mt-1 text-slate-600">Invoices and due dates managed by GreenZone admin.</p>

        {!notice || kind === 'none' ? (
          <Card className="mt-8 p-6">
            <p className="text-slate-700">
              There is no platform billing account on file for this store, or your current period is paid.
            </p>
            <p className="mt-3 text-sm text-slate-500">
              For plan or payment questions, contact support through Help & Support in the vendor menu.
            </p>
          </Card>
        ) : (
          <Card
            className={`mt-8 p-6 ${overdue ? 'border-red-200 bg-red-50/80' : 'border-amber-200 bg-amber-50/80'}`}
          >
            <div className="flex flex-wrap items-start gap-3">
              <AlertCircle className={`mt-0.5 h-6 w-6 shrink-0 ${overdue ? 'text-red-600' : 'text-amber-600'}`} />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-xl font-semibold text-slate-900">
                    {overdue ? 'Platform invoice overdue' : 'Platform invoice due soon'}
                  </h2>
                  {overdue ? (
                    <Badge variant="destructive">
                      {notice?.billing_suspended === true ? 'Storefront hidden' : 'At risk — pay now'}
                    </Badge>
                  ) : (
                    <Badge className="border-amber-300 bg-amber-100 text-amber-900">Due within 7 days</Badge>
                  )}
                </div>
                <p className="mt-2 text-slate-700">
                  {overdue ? (
                    notice?.billing_suspended === true ? (
                      <>
                        Your public menu and listing are hidden from shoppers until our team marks your platform invoice
                        paid. Unpaid billing means your page can stay disconnected from discovery — reach out if you
                        already paid.
                      </>
                    ) : (
                      <>
                        Your invoice is past due. Your store may be at risk of being disconnected from public discovery
                        and the menu until payment is received.
                      </>
                    )
                  ) : (
                    <>
                      Please remit payment before the due date below so your storefront stays connected to public
                      discovery.
                    </>
                  )}
                </p>
                {typeof notice?.due_date === 'string' ? (
                  <p className="mt-3 text-sm text-slate-600">
                    <span className="font-medium">Due:</span> {notice.due_date}
                    {typeof notice?.amount_cents === 'number'
                      ? ` · ${(notice.amount_cents / 100).toLocaleString('en-US', { style: 'currency', currency: 'USD' })}`
                      : ''}
                    {dueSoon && typeof notice?.days_until === 'number' ? (
                      <span className="text-slate-500"> ({notice.days_until} day(s) left)</span>
                    ) : null}
                  </p>
                ) : null}
                <div className="mt-4 flex flex-wrap gap-2">
                  {signedInvoiceUrl ? (
                    <Button asChild variant="default" className="bg-slate-900 hover:bg-slate-800">
                      <a href={signedInvoiceUrl} target="_blank" rel="noreferrer">
                        <FileText className="mr-2 h-4 w-4" />
                        Open invoice (PDF/image)
                      </a>
                    </Button>
                  ) : null}
                  {extUrl ? (
                    <Button asChild variant="outline">
                      <a href={extUrl} target="_blank" rel="noreferrer">
                        <ExternalLink className="mr-2 h-4 w-4" />
                        External invoice link
                      </a>
                    </Button>
                  ) : null}
                </div>
              </div>
            </div>
          </Card>
        )}

        <p className="mt-8 text-center text-sm text-slate-500">
          Questions? Use{' '}
          <Link href={vLink('/vendor/help')} className="text-emerald-700 underline">
            Help &amp; Support
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
