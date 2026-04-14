"use client";

import { useState } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { Store, ArrowLeft } from 'lucide-react';

const schema = z.object({
  businessName: z.string().trim().min(1, 'Business name is required'),
  contactEmail: z.string().trim().email('Enter a valid email'),
  contactPhone: z
    .string()
    .trim()
    .min(1, 'Phone is required')
    .refine((v) => v.replace(/\D/g, '').length >= 10, 'Enter a valid phone number (at least 10 digits)'),
  zip: z
    .string()
    .trim()
    .min(1, 'ZIP code is required')
    .refine((v) => {
      const d = v.replace(/\D/g, '');
      return d.length >= 5;
    }, 'Enter a valid ZIP (at least 5 digits)'),
  licenseNumber: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

export default function ListYourBusinessPage() {
  const { toast } = useToast();
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { licenseNumber: '' },
  });

  async function onSubmit(values: FormValues) {
    if (!isSupabaseConfigured) {
      toast({
        title: 'Configuration error',
        description: 'This form is not connected yet. Please try again later.',
        variant: 'destructive',
      });
      return;
    }

    setSubmitting(true);
    const zipDigits = values.zip.replace(/\D/g, '').slice(0, 5);
    const license = values.licenseNumber?.trim();

    const { error } = await supabase.from('vendor_lead_applications').insert({
      business_name: values.businessName.trim(),
      contact_email: values.contactEmail.trim(),
      contact_phone: values.contactPhone.trim(),
      zip: zipDigits,
      license_number: license && license.length > 0 ? license : null,
    });

    setSubmitting(false);

    if (error) {
      toast({
        title: 'Could not submit',
        description: error.message,
        variant: 'destructive',
      });
      return;
    }

    setSubmitted(true);
    toast({
      title: 'Application received',
      description: 'We will contact you at the email you provided.',
    });
  }

  return (
    <div className="min-h-screen bg-black">
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
                Tell us how to reach you. After we review your application, we can set up your store profile.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto max-w-2xl px-4 py-10">
        {submitted ? (
          <Card className="border-green-900/30 bg-gradient-to-br from-gray-900 to-black p-8 text-center">
            <h2 className="text-xl font-semibold text-white">Thanks for applying</h2>
            <p className="mt-3 text-gray-400">
              Our team will review your details and follow up by email. You can close this page or continue browsing
              the directory.
            </p>
            <Button asChild className="mt-6 bg-brand-red text-white hover:bg-brand-red-deep">
              <Link href="/discover">Browse vendors</Link>
            </Button>
          </Card>
        ) : (
          <Card className="border-green-900/30 bg-gradient-to-br from-gray-900 to-black p-6 md:p-8">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="businessName" className="text-gray-200">
                  Business name <span className="text-red-400">*</span>
                </Label>
                <Input
                  id="businessName"
                  className="border-green-900/40 bg-black/50 text-white"
                  placeholder="Your dispensary or brand name"
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
                {errors.contactPhone && (
                  <p className="text-sm text-red-400">{errors.contactPhone.message}</p>
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
        )}
      </div>
    </div>
  );
}
