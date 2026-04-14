"use client";

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Store, FileText, Upload, CircleCheck as CheckCircle, ArrowRight, ArrowLeft } from 'lucide-react';

export default function VendorOnboardingPage() {
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

  return (
    <div className="min-h-screen bg-black py-12">
      <div className="container mx-auto px-4 max-w-4xl">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">
            Get Listed on GreenZone
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
            { num: 3, label: 'License', icon: FileText },
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
                    <Label htmlFor="licenseNumber" className="text-gray-300">License Number *</Label>
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
                    once your listing is approved and live on GreenZone.
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
                  <h3 className="text-white font-semibold mb-3">License Information</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-400">License Number:</span>
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
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                <CheckCircle className="h-4 w-4 mr-2" />
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
