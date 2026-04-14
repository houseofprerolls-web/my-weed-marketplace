"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CreditCard, Download, CircleAlert as AlertCircle, CircleCheck as CheckCircle, Clock, RefreshCw, Calendar, DollarSign, FileText, Settings } from "lucide-react";
import { VendorNav } from "@/components/vendor/VendorNav";

interface Subscription {
  id: string;
  status: string;
  billing_interval: string;
  current_period_start: string;
  current_period_end: string;
  auto_renew: boolean;
  subscription_plans: {
    name: string;
    price_monthly: number;
    price_annual: number;
    features: string[];
  };
}

interface PaymentMethod {
  id: string;
  card_brand: string;
  card_last4: string;
  card_exp_month: number;
  card_exp_year: number;
  is_default: boolean;
}

interface Invoice {
  id: string;
  invoice_number: string;
  status: string;
  total: number;
  period_start: string;
  period_end: string;
  due_date: string;
  paid_at: string | null;
  created_at: string;
}

interface BillingNotification {
  id: string;
  type: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

export default function VendorBillingPage() {
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [notifications, setNotifications] = useState<BillingNotification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadBillingData();
  }, []);

  async function loadBillingData() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: vendorData } = await supabase
        .from("vendor_profiles")
        .select("id")
        .eq("user_id", user.id)
        .single();

      if (!vendorData) return;

      const [subResult, pmResult, invResult, notifResult] = await Promise.all([
        supabase
          .from("vendor_subscriptions")
          .select(`
            *,
            subscription_plans(*)
          `)
          .eq("vendor_id", vendorData.id)
          .single(),
        supabase
          .from("payment_methods")
          .select("*")
          .eq("vendor_id", vendorData.id)
          .eq("is_default", true)
          .single(),
        supabase
          .from("invoices")
          .select("*")
          .eq("vendor_id", vendorData.id)
          .order("created_at", { ascending: false })
          .limit(10),
        supabase
          .from("billing_notifications")
          .select("*")
          .eq("vendor_id", vendorData.id)
          .order("created_at", { ascending: false })
          .limit(5),
      ]);

      if (!subResult.error) setSubscription(subResult.data);
      if (!pmResult.error) setPaymentMethod(pmResult.data);
      if (!invResult.error) setInvoices(invResult.data || []);
      if (!notifResult.error) setNotifications(notifResult.data || []);
    } catch (error) {
      console.error("Error loading billing data:", error);
    } finally {
      setLoading(false);
    }
  }

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { color: string; label: string }> = {
      active: { color: "bg-emerald-100 text-emerald-700", label: "Active" },
      trialing: { color: "bg-blue-100 text-blue-700", label: "Trial" },
      past_due: { color: "bg-amber-100 text-amber-700", label: "Past Due" },
      unpaid: { color: "bg-red-100 text-red-700", label: "Unpaid" },
      canceled: { color: "bg-slate-100 text-slate-700", label: "Canceled" },
      paid: { color: "bg-emerald-100 text-emerald-700", label: "Paid" },
      due: { color: "bg-amber-100 text-amber-700", label: "Due" },
      failed: { color: "bg-red-100 text-red-700", label: "Failed" },
    };
    const variant = variants[status] || variants.active;
    return <Badge className={variant.color}>{variant.label}</Badge>;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  const isCardExpiring = () => {
    if (!paymentMethod) return false;
    const now = new Date();
    const expiry = new Date(paymentMethod.card_exp_year, paymentMethod.card_exp_month - 1);
    const monthsUntilExpiry = (expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24 * 30);
    return monthsUntilExpiry <= 2;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50">
        <VendorNav />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="animate-pulse">
            <div className="h-8 bg-slate-200 rounded w-1/4 mb-8"></div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="h-32 bg-slate-200 rounded"></div>
              <div className="h-32 bg-slate-200 rounded"></div>
              <div className="h-32 bg-slate-200 rounded"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const unreadNotifications = notifications.filter((n) => !n.is_read);

  return (
    <div className="min-h-screen bg-slate-50">
      <VendorNav />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Billing & Subscription</h1>
            <p className="text-slate-600 mt-1">Manage your subscription and payment methods</p>
          </div>
        </div>

        {unreadNotifications.length > 0 && (
          <div className="mb-6 space-y-3">
            {unreadNotifications.map((notification) => (
              <Card key={notification.id} className="p-4 border-l-4 border-l-amber-500">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5" />
                  <div className="flex-1">
                    <h3 className="font-semibold text-slate-900">{notification.title}</h3>
                    <p className="text-sm text-slate-600 mt-1">{notification.message}</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-emerald-100 rounded-lg">
                <DollarSign className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm text-slate-600">Current Plan</p>
                <p className="text-xl font-bold text-slate-900">
                  {subscription?.subscription_plans.name || "No Plan"}
                </p>
              </div>
            </div>
            {subscription && getStatusBadge(subscription.status)}
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Calendar className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-slate-600">Next Billing Date</p>
                <p className="text-xl font-bold text-slate-900">
                  {subscription ? formatDate(subscription.current_period_end) : "N/A"}
                </p>
              </div>
            </div>
            <p className="text-sm text-slate-600">
              {subscription?.billing_interval === "annual" ? "Annual" : "Monthly"} billing
            </p>
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-purple-100 rounded-lg">
                <CreditCard className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-slate-600">Payment Method</p>
                <p className="text-xl font-bold text-slate-900">
                  {paymentMethod
                    ? `${paymentMethod.card_brand} •••• ${paymentMethod.card_last4}`
                    : "None"}
                </p>
              </div>
            </div>
            {paymentMethod && (
              <p className="text-sm text-slate-600">
                Expires {paymentMethod.card_exp_month}/{paymentMethod.card_exp_year}
              </p>
            )}
            {isCardExpiring() && (
              <p className="text-sm text-amber-600 mt-2 flex items-center gap-1">
                <AlertCircle className="w-4 h-4" />
                Card expiring soon
              </p>
            )}
          </Card>
        </div>

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="invoices">Invoice History</TabsTrigger>
            <TabsTrigger value="payment">Payment Method</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="p-6">
                <h2 className="text-xl font-semibold text-slate-900 mb-4">
                  Subscription Details
                </h2>
                {subscription ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between py-3 border-b">
                      <span className="text-slate-600">Plan Name</span>
                      <span className="font-semibold text-slate-900">
                        {subscription.subscription_plans.name}
                      </span>
                    </div>
                    <div className="flex items-center justify-between py-3 border-b">
                      <span className="text-slate-600">Billing Amount</span>
                      <span className="font-semibold text-slate-900">
                        {formatCurrency(
                          subscription.billing_interval === "annual"
                            ? subscription.subscription_plans.price_annual
                            : subscription.subscription_plans.price_monthly
                        )}
                      </span>
                    </div>
                    <div className="flex items-center justify-between py-3 border-b">
                      <span className="text-slate-600">Billing Cycle</span>
                      <span className="font-semibold text-slate-900 capitalize">
                        {subscription.billing_interval}
                      </span>
                    </div>
                    <div className="flex items-center justify-between py-3 border-b">
                      <span className="text-slate-600">Current Period</span>
                      <span className="font-semibold text-slate-900">
                        {formatDate(subscription.current_period_start)} -{" "}
                        {formatDate(subscription.current_period_end)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between py-3">
                      <span className="text-slate-600">Auto-Renew</span>
                      <span className="font-semibold text-slate-900">
                        {subscription.auto_renew ? "Enabled" : "Disabled"}
                      </span>
                    </div>

                    <div className="pt-4 space-y-2">
                      <Button className="w-full" variant="outline">
                        <Settings className="w-4 h-4 mr-2" />
                        Change Plan
                      </Button>
                      {subscription.status === "past_due" && (
                        <Button className="w-full bg-emerald-600 hover:bg-emerald-700">
                          <RefreshCw className="w-4 h-4 mr-2" />
                          Retry Payment
                        </Button>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-slate-600 mb-4">No active subscription</p>
                    <Button>Choose a Plan</Button>
                  </div>
                )}
              </Card>

              <Card className="p-6">
                <h2 className="text-xl font-semibold text-slate-900 mb-4">Plan Features</h2>
                {subscription ? (
                  <div className="space-y-3">
                    {subscription.subscription_plans.features.map((feature, idx) => (
                      <div key={idx} className="flex items-start gap-3">
                        <CheckCircle className="w-5 h-5 text-emerald-600 mt-0.5" />
                        <span className="text-slate-700">{feature}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-slate-600">No active plan features</p>
                )}
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="invoices">
            <Card className="p-6">
              <h2 className="text-xl font-semibold text-slate-900 mb-6">Invoice History</h2>
              {invoices.length > 0 ? (
                <div className="space-y-3">
                  {invoices.map((invoice) => (
                    <div
                      key={invoice.id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-slate-50 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div className="p-2 bg-slate-100 rounded">
                          <FileText className="w-5 h-5 text-slate-600" />
                        </div>
                        <div>
                          <p className="font-semibold text-slate-900">
                            {invoice.invoice_number}
                          </p>
                          <p className="text-sm text-slate-600">
                            {formatDate(invoice.created_at)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="font-semibold text-slate-900">
                            {formatCurrency(invoice.total)}
                          </p>
                          {getStatusBadge(invoice.status)}
                        </div>
                        <Button size="sm" variant="ghost">
                          <Download className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-600">No invoices yet</p>
                </div>
              )}
            </Card>
          </TabsContent>

          <TabsContent value="payment">
            <Card className="p-6">
              <h2 className="text-xl font-semibold text-slate-900 mb-6">Payment Method</h2>
              {paymentMethod ? (
                <div className="space-y-6">
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-slate-100 rounded-lg">
                        <CreditCard className="w-6 h-6 text-slate-600" />
                      </div>
                      <div>
                        <p className="font-semibold text-slate-900 capitalize">
                          {paymentMethod.card_brand} •••• {paymentMethod.card_last4}
                        </p>
                        <p className="text-sm text-slate-600">
                          Expires {paymentMethod.card_exp_month}/{paymentMethod.card_exp_year}
                        </p>
                        {isCardExpiring() && (
                          <p className="text-sm text-amber-600 mt-1 flex items-center gap-1">
                            <AlertCircle className="w-4 h-4" />
                            This card is expiring soon
                          </p>
                        )}
                      </div>
                    </div>
                    <Badge>Default</Badge>
                  </div>

                  <div className="flex gap-3">
                    <Button variant="outline" className="flex-1">
                      <CreditCard className="w-4 h-4 mr-2" />
                      Update Card
                    </Button>
                    <Button variant="outline">Add New Card</Button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12">
                  <CreditCard className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-600 mb-4">No payment method on file</p>
                  <Button>
                    <CreditCard className="w-4 h-4 mr-2" />
                    Add Payment Method
                  </Button>
                </div>
              )}
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
