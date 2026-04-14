"use client";

import { useEffect, useMemo, useState } from "react";
import { VendorNav } from "@/components/vendor/VendorNav";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, ExternalLink, RefreshCw } from "lucide-react";
import { useAdminMenuVendorOverride } from "@/hooks/useAdminMenuVendorOverride";
import { useVendorBusiness } from "@/hooks/useVendorBusiness";
import { supabase } from "@/lib/supabase";

type StripeInvoiceRow = {
  id: string;
  number: string | null;
  status: string | null;
  currency: string | null;
  created: string | null;
  period_start: string | null;
  period_end: string | null;
  amount_due: number | null;
  amount_paid: number | null;
  total: number | null;
  hosted_invoice_url: string | null;
  invoice_pdf: string | null;
};

function money(cents: number | null | undefined, currency: string | null | undefined) {
  if (cents == null) return "—";
  const cur = (currency || "usd").toUpperCase();
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: cur }).format(cents / 100);
  } catch {
    return `${(cents / 100).toFixed(2)} ${cur}`;
  }
}

function fmtDate(iso: string | null | undefined) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString();
}

export default function VendorSubscriptionPage() {
  const adminMenuVendorId = useAdminMenuVendorOverride();
  const { vendor } = useVendorBusiness({ adminMenuVendorId });

  const vendorId = vendor?.id || null;
  const [authHeader, setAuthHeader] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [invoices, setInvoices] = useState<StripeInvoiceRow[]>([]);

  async function load() {
    if (!vendorId) return;
    setLoading(true);
    setError(null);
    setNote(null);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) {
        setError("Sign in again, then refresh.");
        setInvoices([]);
        return;
      }
      const hdr = `Bearer ${token}`;
      setAuthHeader(hdr);

      const res = await fetch(`/api/vendor/stripe-invoices?vendor_id=${encodeURIComponent(vendorId)}`, {
        headers: { Authorization: hdr },
      });
      const json = (await res.json()) as any;
      if (!res.ok) throw new Error(String(json?.error || "Failed to load invoices"));
      setInvoices(Array.isArray(json?.invoices) ? json.invoices : []);
      setNote(typeof json?.note === "string" ? json.note : null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load invoices");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vendorId]);

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 md:flex-row">
      <VendorNav />
      <div className="mx-auto w-full min-w-0 max-w-6xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex items-start justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Subscription</h1>
            <p className="text-slate-600 mt-1">Invoice history from Stripe</p>
          </div>
          <Button onClick={load} disabled={!vendorId || !authHeader || loading} variant="outline">
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>

        {error && (
          <Card className="p-4 mb-4 border border-red-200 bg-red-50 text-red-800">
            <div className="font-semibold">Couldn’t load invoices</div>
            <div className="text-sm mt-1">{error}</div>
          </Card>
        )}

        {note && (
          <Card className="p-4 mb-4 border border-amber-200 bg-amber-50 text-amber-900">
            <div className="text-sm">{note}</div>
          </Card>
        )}

        <Card className="p-6">
          {invoices.length === 0 ? (
            <div className="text-slate-600">No invoices found.</div>
          ) : (
            <div className="space-y-3">
              {invoices.map((inv) => (
                <div
                  key={inv.id}
                  className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 p-4 rounded-lg border bg-white"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <div className="font-semibold text-slate-900 truncate">
                        {inv.number ? `Invoice ${inv.number}` : inv.id}
                      </div>
                      {inv.status && <Badge className="bg-slate-100 text-slate-700">{inv.status}</Badge>}
                      {inv.status === "paid" ? <Badge className="bg-emerald-100 text-emerald-700">Paid</Badge> : null}
                    </div>
                    <div className="text-sm text-slate-600 mt-1">
                      <span className="mr-3">
                        <span className="font-medium">Created:</span> {fmtDate(inv.created)}
                      </span>
                      <span className="mr-3">
                        <span className="font-medium">Total:</span> {money(inv.total, inv.currency)}
                      </span>
                      <span>
                        <span className="font-medium">Paid:</span> {money(inv.amount_paid, inv.currency)}
                      </span>
                    </div>
                    <div className="text-xs text-slate-500 mt-1">
                      Period: {fmtDate(inv.period_start)} → {fmtDate(inv.period_end)}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {inv.hosted_invoice_url ? (
                      <Button asChild variant="outline" size="sm">
                        <a href={inv.hosted_invoice_url} target="_blank" rel="noreferrer">
                          <ExternalLink className="w-4 h-4 mr-2" />
                          View
                        </a>
                      </Button>
                    ) : null}
                    {inv.invoice_pdf ? (
                      <Button asChild variant="outline" size="sm">
                        <a href={inv.invoice_pdf} target="_blank" rel="noreferrer">
                          <Download className="w-4 h-4 mr-2" />
                          PDF
                        </a>
                      </Button>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

