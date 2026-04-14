"use client";

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Store, FileText, Upload, CircleCheck as CheckCircle, ArrowRight, ArrowLeft, Loader2 } from 'lucide-react';
import { useAuth, type UserRole } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { extractZip5 } from '@/lib/zipUtils';
import { AuthModal } from '@/components/auth/AuthModal';

function rpcErrorMessage(raw: string): string {
  const m = raw.toLowerCase();
  if (m.includes('not_authenticated')) return 'Please sign in to submit your application.';
  if (m.includes('business_name_required')) return 'Enter your business name.';
  if (m.includes('valid_zip_required')) return 'Enter a valid 5-digit ZIP code.';
  if (m.includes('license_number_required')) return 'Enter your cannabis license number (LIC).';
  if (m.includes('shop_already_live')) return 'Your shop is already live. Use the vendor dashboard to update details.';
  if (m.includes('slug_collision')) return 'Could not save — try a slightly different business name and submit again.';
  return raw || 'Something went wrong. Please try again.';
}

export default function VendorOnboardingPage() {
  const searchParams = useSearchParams();
  const inviteVendorSignup = searchParams.get('signup') === '1';
  const authModalSignupDefaults = useMemo(
    () =>
      inviteVendorSignup ? { tab: 'signup' as const, role: 'vendor' as UserRole } : undefined,
    [inviteVendorSignup]
  );

  const { user } = useAuth();
  const { toast } = useToast();
  const [authOpen, setAuthOpen] = useState(false);

  useEffect(() => {
    if (!user && inviteVendorSignup) {
      setAuthOpen(true);
    }
  }, [user, inviteVendorSignup]);
  const [submitting, setSubmitting] = useState(false);
  const [submittedVendorId, setSubmittedVendorId] = useState<string | null>(null);

  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 4;

  const [formData, setFormData] = useState({
    businessName: '',
    businessType: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    phone: '',
    email: '',
    website: '',
    description: '',
    licenseNumber: '',
    licenseAuthority: '',
    licenseIssueDate: '',
    licenseExpiryDate: ''
  });

  const progress = (currentStep / totalSteps) * 100;

  const handleNext = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  function validateForSubmit(): string | null {
    if (!formData.businessName.trim()) return 'Business name is required.';
    if (!formData.businessType) return 'Select a business type.';
    if (!formData.phone.trim()) return 'Phone is required.';
    if (!formData.email.trim()) return 'Business email is required.';
    if (!formData.address.trim()) return 'Street address is required.';
    if (!formData.city.trim()) return 'City is required.';
    if (!formData.state) return 'State is required.';
    if (!extractZip5(formData.zipCode)) return 'Enter a valid 5-digit ZIP code.';
    if (!formData.licenseNumber.trim()) return 'Cannabis license number (LIC) is required.';
    if (!formData.licenseAuthority.trim()) return 'Issuing authority is required.';
    if (!formData.licenseIssueDate) return 'License issue date is required.';
    if (!formData.licenseExpiryDate) return 'License expiry date is required.';
    return null;
  }

  async function handleSubmitApplication() {
    const v = validateForSubmit();
    if (v) {
      toast({ title: 'Complete the form', description: v, variant: 'destructive' });
      return;
    }
    if (!user) {
      setAuthOpen(true);
      toast({ title: 'Sign in required', description: 'Create an account or sign in to submit for approval.', variant: 'destructive' });
      return;
    }
    if (!isSupabaseConfigured) {
      toast({
        title: 'Not connected',
        description: 'Supabase is not configured on this deployment.',
        variant: 'destructive',
      });
      return;
    }

    const zip5 = extractZip5(formData.zipCode);
    if (!zip5) {
      toast({ title: 'Invalid ZIP', description: 'Enter a valid 5-digit ZIP code.', variant: 'destructive' });
      return;
    }

    setSubmitting(true);
    try {
      const { data, error } = await supabase.rpc('submit_vendor_onboarding_application', {
        p_business_name: formData.businessName.trim(),
        p_business_type: formData.businessType,
        p_description: formData.description.trim() || null,
        p_phone: formData.phone.trim(),
        p_business_email: formData.email.trim(),
        p_website: formData.website.trim() || null,
        p_address: formData.address.trim(),
        p_city: formData.city.trim(),
        p_state: formData.state,
        p_zip: zip5,
        p_license_number: formData.licenseNumber.trim(),
        p_license_authority: formData.licenseAuthority.trim(),
        p_license_issue_date: formData.licenseIssueDate || null,
        p_license_expiry_date: formData.licenseExpiryDate || null,
      });

      if (error) {
        toast({
          title: 'Could not submit',
          description: rpcErrorMessage(error.message),
          variant: 'destructive',
        });
        return;
      }

      if (data != null) setSubmittedVendorId(String(data));
      toast({
        title: 'Application submitted',
        description:
          'Your dispensary is pending review. Our team will verify your license; you will see status in Vendor management (admin) as license pending.',
      });
    } catch (e) {
      toast({
        title: 'Could not submit',
        description: rpcErrorMessage(e instanceof Error ? e.message : String(e)),
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  }

  if (submittedVendorId) {
    return (
      <div className="min-h-screen bg-background py-12">
        <div className="container mx-auto max-w-lg px-4 text-center">
          <Card className="border-green-900/30 bg-gradient-to-br from-gray-900 to-black p-8">
            <CheckCircle className="mx-auto mb-4 h-14 w-14 text-green-500" />
            <h1 className="text-2xl font-bold text-white">You&apos;re on the list for review</h1>
            <p className="mt-3 text-gray-400">
              Your application was received. An admin will review your license and listing in{' '}
              <strong className="text-gray-200">Vendor management</strong> (license status: pending). We&apos;ll follow up
              at the email you provided.
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
              <Button asChild className="bg-green-600 hover:bg-green-700">
                <Link href="/">Back to home</Link>
              </Button>
              <Button asChild variant="outline" className="border-green-800 text-white">
                <Link href="/vendor/dashboard">Vendor dashboard</Link>
              </Button>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-12">
      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} signupDefaults={authModalSignupDefaults} />
      <div className="container mx-auto px-4 max-w-4xl">
        {!user && (
          <Card className="mb-6 border-amber-900/30 bg-amber-950/20 p-4">
            <p className="text-sm text-amber-100/90">
              <strong className="text-white">Sign in required to submit.</strong> Create a free account or sign in — your
              application will be tied to your login so you can access the vendor dashboard after approval.
            </p>
            <Button type="button" className="mt-3 bg-brand-lime text-black hover:bg-brand-lime-soft" onClick={() => setAuthOpen(true)}>
              Sign in or sign up
            </Button>
          </Card>
        )}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">
            Get Listed on DaTreehouse
          </h1>
          <p className="text-gray-400 text-lg">
            Join 1,200+ verified businesses connecting with customers
          </p>
        </div>

        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-400 text-sm">Step {currentStep} of {totalSteps}</span>
            <span className="text-green-500 text-sm font-semibold">{Math.round(progress)}% Complete</span>
          </div>
          <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-green-600 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Step Indicators */}
        <div className="flex items-center justify-between mb-8">
          {[
            { num: 1, label: 'Business Info', icon: Store },
            { num: 2, label: 'Location', icon: Store },
            { num: 3, label: 'Cannabis license (LIC)', icon: FileText },
            { num: 4, label: 'Review', icon: CheckCircle }
          ].map((step) => (
            <div key={step.num} className="flex flex-col items-center flex-1">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center border-2 mb-2 transition ${
                currentStep >= step.num
                  ? 'bg-green-600 border-green-600 text-white'
                  : 'bg-gray-900 border-gray-700 text-gray-500'
              }`}>
                {currentStep > step.num ? (
                  <CheckCircle className="h-6 w-6" />
                ) : (
                  <step.icon className="h-6 w-6" />
                )}
              </div>
              <span className={`text-xs text-center ${
                currentStep >= step.num ? 'text-white' : 'text-gray-500'
              }`}>
                {step.label}
              </span>
            </div>
          ))}
        </div>

        <Card className="bg-gradient-to-br from-gray-900 to-black border-green-900/20 p-8">
          {/* Step 1: Business Information */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-white mb-2">Business Information</h2>
                <p className="text-gray-400">Tell us about your cannabis business</p>
              </div>

              <div className="space-y-4">
                <div>
                  <Label htmlFor="businessName" className="text-gray-300">Business Name *</Label>
                  <Input
                    id="businessName"
                    placeholder="Green Valley Dispensary"
                    value={formData.businessName}
                    onChange={(e) => setFormData({...formData, businessName: e.target.value})}
                    className="bg-gray-800 border-green-900/20 text-white mt-2"
                  />
                </div>

                <div>
                  <Label htmlFor="businessType" className="text-gray-300">Business Type *</Label>
                  <Select
                    value={formData.businessType}
                    onValueChange={(value) => setFormData({...formData, businessType: value})}
                  >
                    <SelectTrigger className="bg-gray-800 border-green-900/20 text-white mt-2">
                      <SelectValue placeholder="Select business type" />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-900 border-green-900/20">
                      <SelectItem value="dispensary">Dispensary</SelectItem>
                      <SelectItem value="delivery">Delivery Service</SelectItem>
                      <SelectItem value="brand">Brand/Manufacturer</SelectItem>
                      <SelectItem value="cultivator">Cultivator</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="description" className="text-gray-300">Business Description</Label>
                  <Textarea
                    id="description"
                    placeholder="Tell customers what makes your business special..."
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    className="bg-gray-800 border-green-900/20 text-white mt-2 min-h-32"
                    maxLength={500}
                  />
                  <p className="text-gray-500 text-sm mt-1">{formData.description.length}/500 characters</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="phone" className="text-gray-300">Phone Number *</Label>
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="(555) 123-4567"
                      value={formData.phone}
                      onChange={(e) => setFormData({...formData, phone: e.target.value})}
                      className="bg-gray-800 border-green-900/20 text-white mt-2"
                    />
                  </div>

                  <div>
                    <Label htmlFor="email" className="text-gray-300">Business Email *</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="info@yourbusiness.com"
                      value={formData.email}
                      onChange={(e) => setFormData({...formData, email: e.target.value})}
                      className="bg-gray-800 border-green-900/20 text-white mt-2"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="website" className="text-gray-300">Website (Optional)</Label>
                  <Input
                    id="website"
                    type="url"
                    placeholder="https://yourbusiness.com"
                    value={formData.website}
                    onChange={(e) => setFormData({...formData, website: e.target.value})}
                    className="bg-gray-800 border-green-900/20 text-white mt-2"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Location */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-white mb-2">Business Location</h2>
                <p className="text-gray-400">Where can customers find you?</p>
              </div>

              <div className="space-y-4">
                <div>
                  <Label htmlFor="address" className="text-gray-300">Street Address *</Label>
                  <Input
                    id="address"
                    placeholder="1234 Main Street"
                    value={formData.address}
                    onChange={(e) => setFormData({...formData, address: e.target.value})}
                    className="bg-gray-800 border-green-900/20 text-white mt-2"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="city" className="text-gray-300">City *</Label>
                    <Input
                      id="city"
                      placeholder="Los Angeles"
                      value={formData.city}
                      onChange={(e) => setFormData({...formData, city: e.target.value})}
                      className="bg-gray-800 border-green-900/20 text-white mt-2"
                    />
                  </div>

                  <div>
                    <Label htmlFor="state" className="text-gray-300">State *</Label>
                    <Select
                      value={formData.state}
                      onValueChange={(value) => setFormData({...formData, state: value})}
                    >
                      <SelectTrigger className="bg-gray-800 border-green-900/20 text-white mt-2">
                        <SelectValue placeholder="Select state" />
                      </SelectTrigger>
                      <SelectContent className="bg-gray-900 border-green-900/20">
                        <SelectItem value="CA">California</SelectItem>
                        <SelectItem value="CO">Colorado</SelectItem>
                        <SelectItem value="WA">Washington</SelectItem>
                        <SelectItem value="OR">Oregon</SelectItem>
                        <SelectItem value="NV">Nevada</SelectItem>
                        <SelectItem value="MI">Michigan</SelectItem>
                        <SelectItem value="MA">Massachusetts</SelectItem>
                        <SelectItem value="IL">Illinois</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="zipCode" className="text-gray-300">ZIP Code *</Label>
                    <Input
                      id="zipCode"
                      placeholder="90001"
                      value={formData.zipCode}
                      onChange={(e) => setFormData({...formData, zipCode: e.target.value})}
                      className="bg-gray-800 border-green-900/20 text-white mt-2"
                    />
                  </div>
                </div>

                <div className="bg-blue-600/10 border border-blue-600/20 rounded-lg p-4 mt-6">
                  <h4 className="text-blue-400 font-semibold mb-2">Why we need your location</h4>
                  <p className="text-gray-300 text-sm">
                    Your address helps customers find you on the map and in location-based searches.
                    This information will be publicly visible on your listing.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Step 3: License Verification */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-white mb-2">License Verification</h2>
                <p className="text-gray-400">Upload your cannabis business license for verification</p>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="licenseNumber" className="text-gray-300">Cannabis license number (LIC) *</Label>
                    <Input
                      id="licenseNumber"
                      placeholder="C10-0000000-LIC"
                      value={formData.licenseNumber}
                      onChange={(e) => setFormData({...formData, licenseNumber: e.target.value})}
                      className="bg-gray-800 border-green-900/20 text-white mt-2"
                    />
                  </div>

                  <div>
                    <Label htmlFor="licenseAuthority" className="text-gray-300">Issuing Authority *</Label>
                    <Input
                      id="licenseAuthority"
                      placeholder="California DCC"
                      value={formData.licenseAuthority}
                      onChange={(e) => setFormData({...formData, licenseAuthority: e.target.value})}
                      className="bg-gray-800 border-green-900/20 text-white mt-2"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="licenseIssueDate" className="text-gray-300">Issue Date *</Label>
                    <Input
                      id="licenseIssueDate"
                      type="date"
                      value={formData.licenseIssueDate}
                      onChange={(e) => setFormData({...formData, licenseIssueDate: e.target.value})}
                      className="bg-gray-800 border-green-900/20 text-white mt-2"
                    />
                  </div>

                  <div>
                    <Label htmlFor="licenseExpiryDate" className="text-gray-300">Expiry Date *</Label>
                    <Input
                      id="licenseExpiryDate"
                      type="date"
                      value={formData.licenseExpiryDate}
                      onChange={(e) => setFormData({...formData, licenseExpiryDate: e.target.value})}
                      className="bg-gray-800 border-green-900/20 text-white mt-2"
                    />
                  </div>
                </div>

                <div className="mt-6">
                  <Label className="text-gray-300">Upload License Document *</Label>
                  <div className="mt-2 border-2 border-dashed border-green-900/20 rounded-lg p-8 text-center hover:border-green-600/50 transition cursor-pointer bg-gray-800/50">
                    <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-white font-semibold mb-2">Click to upload or drag and drop</p>
                    <p className="text-gray-400 text-sm">PDF, JPG, or PNG (Max 10MB)</p>
                  </div>
                </div>

                <div className="bg-yellow-600/10 border border-yellow-600/20 rounded-lg p-4 mt-6">
                  <h4 className="text-yellow-400 font-semibold mb-2">Verification Process</h4>
                  <p className="text-gray-300 text-sm">
                    Our team will verify your license within 24-48 hours. You'll receive an email
                    once your listing is approved and live on DaTreehouse.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Review & Submit */}
          {currentStep === 4 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-white mb-2">Review Your Information</h2>
                <p className="text-gray-400">Make sure everything looks correct before submitting</p>
              </div>

              <div className="space-y-4">
                <Card className="bg-gray-800/50 border-green-900/20 p-4">
                  <h3 className="text-white font-semibold mb-3">Business Information</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Business Name:</span>
                      <span className="text-white">{formData.businessName || '-'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Type:</span>
                      <span className="text-white capitalize">{formData.businessType || '-'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Phone:</span>
                      <span className="text-white">{formData.phone || '-'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Email:</span>
                      <span className="text-white">{formData.email || '-'}</span>
                    </div>
                  </div>
                </Card>

                <Card className="bg-gray-800/50 border-green-900/20 p-4">
                  <h3 className="text-white font-semibold mb-3">Location</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Address:</span>
                      <span className="text-white">{formData.address || '-'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">City, State ZIP:</span>
                      <span className="text-white">
                        {formData.city || '-'}, {formData.state || '-'} {formData.zipCode || '-'}
                      </span>
                    </div>
                  </div>
                </Card>

                <Card className="bg-gray-800/50 border-green-900/20 p-4">
                  <h3 className="text-white font-semibold mb-3">Cannabis license (LIC)</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Cannabis license (LIC):</span>
                      <span className="text-white">{formData.licenseNumber || '-'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Authority:</span>
                      <span className="text-white">{formData.licenseAuthority || '-'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Valid Until:</span>
                      <span className="text-white">{formData.licenseExpiryDate || '-'}</span>
                    </div>
                  </div>
                </Card>

                <div className="bg-green-600/10 border border-green-600/20 rounded-lg p-4 mt-6">
                  <h4 className="text-green-400 font-semibold mb-2">What happens next?</h4>
                  <ul className="text-gray-300 text-sm space-y-2">
                    <li>✓ Your listing will be reviewed by our team</li>
                    <li>✓ We'll verify your business license</li>
                    <li>✓ You'll receive approval within 24-48 hours</li>
                    <li>✓ Once approved, your listing goes live immediately</li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex items-center justify-between mt-8 pt-8 border-t border-green-900/20">
            <Button
              variant="outline"
              onClick={handleBack}
              disabled={currentStep === 1}
              className="border-green-900/20 text-white hover:bg-green-500/10"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>

            {currentStep < totalSteps ? (
              <Button
                onClick={handleNext}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                Continue
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            ) : (
              <Button
                type="button"
                className="bg-green-600 hover:bg-green-700 text-white"
                disabled={submitting}
                onClick={() => void handleSubmitApplication()}
              >
                {submitting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle className="h-4 w-4 mr-2" />
                )}
                Submit for Approval
              </Button>
            )}
          </div>
        </Card>

        <div className="text-center mt-8">
          <p className="text-gray-400 text-sm">
            Have questions? <a href="/contact" className="text-green-500 hover:text-green-400">Contact our support team</a>
          </p>
        </div>
      </div>
    </div>
  );
}
