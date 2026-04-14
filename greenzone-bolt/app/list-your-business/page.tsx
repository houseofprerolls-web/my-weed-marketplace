"use client";

import { useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { isSupabaseConfigured } from '@/lib/supabasePublicEnv';
import {
  vendorLeadFormSchema,
  type VendorLeadFormValues,
} from '@/lib/vendorLeadFormSchema';
import { useToast } from '@/hooks/use-toast';
import { SITE_NAME } from '@/lib/brand';
import { Store, ArrowLeft, CheckCircle2 } from 'lucide-react';

const defaultFormValues: VendorLeadFormValues = {
  businessName: '',
  contactEmail: '',
  contactPhone: '',
  zip: '',
  licenseNumber: '',
  listAsDelivery: true,
  listAsStorefront: false,
};

export default function ListYourBusinessPage() {
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const intakeSource = (searchParams.get('from') || 'list_your_business').trim() || 'list_your_business';
  const fromVendorSignup = intakeSource === 'vendor_signup';
  const { toast } = useToast();
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<VendorLeadFormValues>({
    resolver: zodResolver(vendorLeadFormSchema),
    defaultValues: defaultFormValues,
  });

  async function onSubmit(values: VendorLeadFormValues) {
    if (!isSupabaseConfigured) {
      toast({
        title: 'Configuration error',
        description: 'This form is not connected yet. Please try again later.',
        variant: 'destructive',
      });
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/vendor-lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string; ok?: boolean };

      if (!res.ok) {
        toast({
          title: 'Could not submit',
          description: data.error || 'Please try again.',
          variant: 'destructive',
        });
        return;
      }

      const zipDigits = values.zip.replace(/\D/g, '').slice(0, 5);
      const { trackEvent } = await import('@/lib/analytics');
      void trackEvent({
        eventType: 'vendor_lead_submitted',
        metadata: {
          zip: zipDigits,
          source: intakeSource,
          listAsDelivery: values.listAsDelivery,
          listAsStorefront: values.listAsStorefront,
        },
      });

      setSubmitted(true);
      toast({
        title: 'Application received',
        description: 'We will contact you at the email you provided.',
      });
    } catch {
      toast({
        title: 'Could not submit',
        description: 'Network error. Check your connection and try again.',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b border-brand-red/20 bg-gradient-to-b from-green-950/30 to-black">
        <div className="container mx-auto max-w-2xl px-4 py-10">
          <Link
            href="/"
            className="mb-6 inline-flex items-center gap-2 text-sm text-gray-400 transition hover:text-brand-lime-soft"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to home
          </Link>
          <div className="flex items-center gap-3">
            <Store className="h-10 w-10 text-brand-lime" />
            <div>
              <h1 className="text-3xl font-bold text-white md:text-4xl">List your business</h1>
              <p className="mt-1 text-gray-400">
                Join {SITE_NAME} to reach local shoppers with menus, deals, and compliant checkout—without rebuilding
                your stack from scratch.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto max-w-2xl px-4 py-10">
        {user && fromVendorSignup ? (
          <Card className="mb-8 border-brand-lime/30 bg-green-950/30 p-5 md:p-6">
            <p className="text-sm font-semibold text-white">Your vendor account is ready</p>
            <p className="mt-2 text-sm text-gray-400">
              Continue to the full application to add your license, address, and listing details for review.
            </p>
            <Button asChild className="mt-4 bg-brand-lime text-black hover:bg-brand-lime-soft">
              <Link href="/vendor/onboarding?from=vendor_signup">Continue to application</Link>
            </Button>
          </Card>
        ) : null}

        {submitted ? (
          <Card className="border-green-900/30 bg-gradient-to-br from-gray-900 to-black p-8 text-center">
            <h2 className="text-xl font-semibold text-white">Thanks for applying</h2>
            <p className="mt-3 text-gray-400">
              Our team typically replies within <span className="text-gray-200">1–2 business days</span> at the email you
              provided. If you don&apos;t see a message, check spam or contact{' '}
              <a href="mailto:support@datreehouse.com" className="text-green-400 hover:underline">
                support@datreehouse.com
              </a>
              .
            </p>
            <ol className="mt-6 space-y-3 text-left text-sm text-gray-300">
              <li className="flex gap-2">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-brand-lime" aria-hidden />
                <span>We review license, ZIP, and contact details for a fit with active markets.</span>
              </li>
              <li className="flex gap-2">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-brand-lime" aria-hidden />
                <span>
                  Next: onboarding, menu import or POS link, and go-live when you&apos;re ready (
                  <Link href="/vendor/onboarding" className="text-green-400 hover:underline">
                    onboarding overview
                  </Link>
                  ).
                </span>
              </li>
            </ol>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
              <Button asChild className="bg-brand-red text-white hover:bg-brand-red-deep">
                <Link href="/discover">Browse the marketplace</Link>
              </Button>
              <Button asChild variant="outline" className="border-green-700/50 text-green-200 hover:bg-green-950/40">
                <Link href="/contact">Contact us</Link>
              </Button>
            </div>
          </Card>
        ) : (
          <>
            <Card className="mb-8 border-green-900/25 bg-gradient-to-br from-gray-900/90 to-black p-6 md:p-8">
              <h2 className="text-lg font-semibold text-white">Why retailers choose {SITE_NAME}</h2>
              <ul className="mt-3 space-y-2 text-sm text-gray-400">
                <li>
                  <span className="text-gray-200">Discovery + map + deals</span> — shoppers find you where they already
                  browse.
                </li>
                <li>
                  <span className="text-gray-200">Menu &amp; orders</span> — publish SKUs, sync sources, and run
                  fulfillment your way.
                </li>
                <li>
                  <span className="text-gray-200">Commercial terms</span> — review our{' '}
                  <Link href="/vendor-agreement" className="text-green-400 hover:underline">
                    vendor agreement
                  </Link>{' '}
                  and{' '}
                  <Link href="/advertising-policy" className="text-green-400 hover:underline">
                    advertising policy
                  </Link>{' '}
                  or <Link href="/contact" className="text-green-400 hover:underline">contact us</Link> for details.
                </li>
              </ul>
              <p className="mt-4 text-xs text-gray-500">
                Not a consumer signup — this form is for licensed operators and brand partners only.
              </p>
            </Card>

            <Card className="mb-8 border-amber-900/20 bg-amber-950/10 p-5 md:p-6">
              <p className="text-sm font-medium text-amber-100/90">Trusted by growing shops</p>
              <p className="mt-2 text-sm text-gray-400">
                Teams use {SITE_NAME} to get in front of local intent—search, map, and community—then convert with live
                menus. Ask us for references in your state when we reply.
              </p>
            </Card>

            <Card className="mb-8 border-green-700/30 bg-green-950/25 p-5 md:p-6">
              <p className="text-sm font-semibold text-white">Apply online with a vendor account</p>
              <p className="mt-2 text-sm text-gray-400">
                Sign up, choose <span className="text-gray-200">Vendor / operator</span>, and we take you straight to the
                full <span className="text-gray-200">List your business</span> application (license, address, and review).
              </p>
              <Button
                asChild
                className="mt-4 bg-brand-lime text-black hover:bg-brand-lime-soft"
              >
                <Link href="/vendor/onboarding?signup=1">Sign up as a vendor</Link>
              </Button>
            </Card>

            <Card className="border-green-900/30 bg-gradient-to-br from-gray-900 to-black p-6 md:p-8">
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
                <div className="space-y-2">
                  <Label htmlFor="businessName" className="text-gray-200">
                    Business name <span className="text-red-400">*</span>
                  </Label>
                  <Input
                    id="businessName"
                    className="border-green-900/40 bg-black/50 text-white"
                    placeholder="Your dispensary or brand name"
                    autoComplete="organization"
                    {...register('businessName')}
                  />
                  {errors.businessName && (
                    <p className="text-sm text-red-400">{errors.businessName.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="contactEmail" className="text-gray-200">
                    Email we can contact you at <span className="text-red-400">*</span>
                  </Label>
                  <Input
                    id="contactEmail"
                    type="email"
                    className="border-green-900/40 bg-black/50 text-white"
                    placeholder="you@example.com"
                    autoComplete="email"
                    {...register('contactEmail')}
                  />
                  {errors.contactEmail && (
                    <p className="text-sm text-red-400">{errors.contactEmail.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="contactPhone" className="text-gray-200">
                    Phone number <span className="text-red-400">*</span>
                  </Label>
                  <Input
                    id="contactPhone"
                    type="tel"
                    className="border-green-900/40 bg-black/50 text-white"
                    placeholder="(555) 123-4567"
                    autoComplete="tel"
                    {...register('contactPhone')}
                  />
                  <p className="text-xs text-gray-500">
                    Used only to reach you about this application—no marketing texts unless you opt in later.
                  </p>
                  {errors.contactPhone && (
                    <p className="text-sm text-red-400">{errors.contactPhone.message}</p>
                  )}
                </div>

                <div className="space-y-3 rounded-lg border border-green-900/30 bg-black/30 p-4">
                  <p className="text-sm font-medium text-gray-200">How should we list you?</p>
                  <p className="text-xs text-gray-500">
                    Choose one or both. When you&apos;re approved, we set your public delivery and storefront flags from
                    this. Changing them later requires a request to our team.
                  </p>
                  <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                    <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-300">
                      <Checkbox
                        id="listAsDelivery"
                        checked={watch('listAsDelivery')}
                        onCheckedChange={(c) =>
                          setValue('listAsDelivery', c === true, { shouldValidate: true, shouldDirty: true })
                        }
                        className="border-green-700 data-[state=checked]:bg-brand-lime data-[state=checked]:text-black"
                      />
                      <span>Delivery</span>
                    </label>
                    <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-300">
                      <Checkbox
                        id="listAsStorefront"
                        checked={watch('listAsStorefront')}
                        onCheckedChange={(c) =>
                          setValue('listAsStorefront', c === true, { shouldValidate: true, shouldDirty: true })
                        }
                        className="border-green-700 data-[state=checked]:bg-brand-lime data-[state=checked]:text-black"
                      />
                      <span>Storefront / pickup</span>
                    </label>
                  </div>
                  {(errors.listAsDelivery || errors.listAsStorefront) && (
                    <p className="text-sm text-red-400">
                      {errors.listAsStorefront?.message || errors.listAsDelivery?.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="zip" className="text-gray-200">
                    ZIP code (service area) <span className="text-red-400">*</span>
                  </Label>
                  <Input
                    id="zip"
                    className="border-green-900/40 bg-black/50 text-white"
                    placeholder="12345"
                    inputMode="numeric"
                    autoComplete="postal-code"
                    {...register('zip')}
                  />
                  {errors.zip && <p className="text-sm text-red-400">{errors.zip.message}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="licenseNumber" className="text-gray-200">
                    Cannabis license number (LIC) <span className="text-gray-500">(optional)</span>
                  </Label>
                  <Input
                    id="licenseNumber"
                    className="border-green-900/40 bg-black/50 text-white"
                    placeholder="e.g. your state cannabis regulatory license / LIC number (not a generic business license)"
                    autoComplete="off"
                    {...register('licenseNumber')}
                  />
                  {errors.licenseNumber && (
                    <p className="text-sm text-red-400">{errors.licenseNumber.message}</p>
                  )}
                </div>

                <p className="text-xs text-gray-500">
                  <span className="text-red-400">*</span> Required fields. Submitting this form does not guarantee
                  listing; we use your information only to follow up about your business.
                </p>

                <Button
                  type="submit"
                  disabled={submitting}
                  className="w-full bg-brand-lime text-black hover:bg-brand-lime-soft md:w-auto"
                >
                  {submitting ? 'Submitting…' : 'Submit application'}
                </Button>
              </form>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}
