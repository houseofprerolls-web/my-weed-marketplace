"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ShieldCheck, Upload, ShoppingCart, Truck, CreditCard, CircleCheck as CheckCircle, CircleAlert as AlertCircle, FileText, Lock } from 'lucide-react';

export default function CheckoutPage() {
  const router = useRouter();
  const [idFile, setIdFile] = useState<File | null>(null);
  const [formData, setFormData] = useState({
    fullName: '',
    phone: '',
    address: '',
    apartment: '',
    city: '',
    zipCode: '',
    deliveryNotes: '',
    preferredTime: '',
  });
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Mock cart data
  const cartItems = [
    {
      id: '1',
      name: 'Blue Dream 3.5g',
      brand: 'Premium Flowers',
      price: 45.00,
      quantity: 1,
      image: 'https://images.pexels.com/photos/7148942/pexels-photo-7148942.jpeg?auto=compress&cs=tinysrgb&w=200',
    },
    {
      id: '2',
      name: 'Sour Diesel Pre-Roll',
      brand: 'Quick Puffs',
      price: 12.00,
      quantity: 2,
      image: 'https://images.pexels.com/photos/7195950/pexels-photo-7195950.jpeg?auto=compress&cs=tinysrgb&w=200',
    },
  ];

  const subtotal = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const deliveryFee = 10.00;
  const tax = subtotal * 0.08;
  const total = subtotal + deliveryFee + tax;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        setError('File size must be less than 10MB');
        return;
      }
      setIdFile(file);
      setError('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!idFile) {
      setError('Please upload a valid identification document before placing your order.');
      return;
    }

    if (!agreedToTerms) {
      setError('Please confirm that the information provided is accurate.');
      return;
    }

    const missingFields = [];
    if (!formData.fullName) missingFields.push('Full Name');
    if (!formData.phone) missingFields.push('Phone Number');
    if (!formData.address) missingFields.push('Delivery Address');
    if (!formData.city) missingFields.push('City');
    if (!formData.zipCode) missingFields.push('Zip Code');

    if (missingFields.length > 0) {
      setError(`Please fill in: ${missingFields.join(', ')}`);
      return;
    }

    setIsSubmitting(true);

    setTimeout(() => {
      const orderNumber = `GZ${Date.now().toString().slice(-8)}`;
      router.push(`/checkout/confirmation?order=${orderNumber}`);
    }, 2000);
  };

  return (
    <div className="min-h-screen bg-black text-white py-8 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Secure Checkout</h1>
          <p className="text-gray-400">Complete your order safely and securely</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Checkout Form */}
          <div className="lg:col-span-2 space-y-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Contact Information */}
              <Card className="bg-gray-900/50 border-green-900/20 p-6">
                <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                  <ShoppingCart className="h-5 w-5 text-green-400" />
                  Contact Information
                </h2>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="fullName" className="text-gray-300">Full Name *</Label>
                    <Input
                      id="fullName"
                      value={formData.fullName}
                      onChange={(e) => setFormData({...formData, fullName: e.target.value})}
                      className="bg-gray-800/50 border-green-900/20 text-white mt-1"
                      placeholder="John Doe"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="phone" className="text-gray-300">Phone Number *</Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({...formData, phone: e.target.value})}
                      className="bg-gray-800/50 border-green-900/20 text-white mt-1"
                      placeholder="(555) 123-4567"
                      required
                    />
                  </div>
                </div>
              </Card>

              {/* Delivery Address */}
              <Card className="bg-gray-900/50 border-green-900/20 p-6">
                <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                  <Truck className="h-5 w-5 text-green-400" />
                  Delivery Address
                </h2>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="address" className="text-gray-300">Street Address *</Label>
                    <Input
                      id="address"
                      value={formData.address}
                      onChange={(e) => setFormData({...formData, address: e.target.value})}
                      className="bg-gray-800/50 border-green-900/20 text-white mt-1"
                      placeholder="123 Main Street"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="apartment" className="text-gray-300">Apartment / Unit (optional)</Label>
                    <Input
                      id="apartment"
                      value={formData.apartment}
                      onChange={(e) => setFormData({...formData, apartment: e.target.value})}
                      className="bg-gray-800/50 border-green-900/20 text-white mt-1"
                      placeholder="Apt 4B"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="city" className="text-gray-300">City *</Label>
                      <Input
                        id="city"
                        value={formData.city}
                        onChange={(e) => setFormData({...formData, city: e.target.value})}
                        className="bg-gray-800/50 border-green-900/20 text-white mt-1"
                        placeholder="Los Angeles"
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="zipCode" className="text-gray-300">Zip Code *</Label>
                      <Input
                        id="zipCode"
                        value={formData.zipCode}
                        onChange={(e) => setFormData({...formData, zipCode: e.target.value})}
                        className="bg-gray-800/50 border-green-900/20 text-white mt-1"
                        placeholder="90001"
                        required
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="deliveryNotes" className="text-gray-300">Delivery Notes (optional)</Label>
                    <Textarea
                      id="deliveryNotes"
                      value={formData.deliveryNotes}
                      onChange={(e) => setFormData({...formData, deliveryNotes: e.target.value})}
                      className="bg-gray-800/50 border-green-900/20 text-white mt-1"
                      placeholder="Please ring doorbell..."
                      rows={3}
                    />
                  </div>
                  <div>
                    <Label htmlFor="preferredTime" className="text-gray-300">Preferred Delivery Time (optional)</Label>
                    <Input
                      id="preferredTime"
                      type="time"
                      value={formData.preferredTime}
                      onChange={(e) => setFormData({...formData, preferredTime: e.target.value})}
                      className="bg-gray-800/50 border-green-900/20 text-white mt-1"
                    />
                  </div>
                </div>
              </Card>

              {/* ID Verification */}
              <Card className="bg-gradient-to-br from-green-900/20 to-blue-900/20 border-green-600/30 p-6">
                <div className="flex items-start gap-4 mb-4">
                  <ShieldCheck className="h-6 w-6 text-green-400 flex-shrink-0 mt-1" />
                  <div className="flex-1">
                    <h2 className="text-xl font-semibold mb-2">Identity Verification Required</h2>
                    <p className="text-gray-300 text-sm mb-4">
                      Please upload a valid photo ID or passport before placing your order. Your document is securely attached to your order and only visible to the vendor handling your order and GreenZone admins.
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <Label htmlFor="idUpload" className="text-gray-300 flex items-center gap-2">
                      <Lock className="h-4 w-4" />
                      Upload Identification *
                    </Label>
                    <div className="mt-2">
                      <label
                        htmlFor="idUpload"
                        className="flex flex-col items-center justify-center w-full h-32 border-2 border-green-600/30 border-dashed rounded-lg cursor-pointer bg-gray-800/30 hover:bg-gray-800/50 transition"
                      >
                        {idFile ? (
                          <div className="flex flex-col items-center justify-center text-center p-4">
                            <FileText className="h-8 w-8 text-green-400 mb-2" />
                            <p className="text-sm text-green-400 font-medium">{idFile.name}</p>
                            <p className="text-xs text-gray-400 mt-1">
                              {(idFile.size / 1024).toFixed(0)} KB
                            </p>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center justify-center pt-5 pb-6">
                            <Upload className="h-8 w-8 text-gray-400 mb-2" />
                            <p className="text-sm text-gray-300 mb-1">
                              <span className="font-semibold">Click to upload</span> or drag and drop
                            </p>
                            <p className="text-xs text-gray-400">Government ID, Passport, or Photo ID (Max 10MB)</p>
                          </div>
                        )}
                        <input
                          id="idUpload"
                          type="file"
                          className="hidden"
                          accept="image/*,.pdf"
                          onChange={handleFileChange}
                          required
                        />
                      </label>
                    </div>
                  </div>

                  <div className="bg-blue-600/10 border border-blue-600/30 rounded-lg p-4">
                    <div className="flex gap-3">
                      <Lock className="h-5 w-5 text-blue-400 flex-shrink-0 mt-0.5" />
                      <div className="text-sm">
                        <p className="text-blue-200 font-medium mb-1">Your Privacy is Protected</p>
                        <p className="text-gray-300">
                          Your ID is encrypted, securely stored, and only accessed for order verification purposes.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>

              {/* Confirmation */}
              <Card className="bg-gray-900/50 border-green-900/20 p-6">
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    id="terms"
                    checked={agreedToTerms}
                    onChange={(e) => setAgreedToTerms(e.target.checked)}
                    className="mt-1"
                    required
                  />
                  <Label htmlFor="terms" className="text-gray-300 text-sm cursor-pointer">
                    I confirm that the information provided is accurate and I am 21+ years of age.
                  </Label>
                </div>
              </Card>

              {/* Error Message */}
              {error && (
                <Card className="bg-red-900/20 border-red-600/30 p-4">
                  <div className="flex gap-3">
                    <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0" />
                    <p className="text-red-200 text-sm">{error}</p>
                  </div>
                </Card>
              )}

              {/* Submit Button */}
              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-green-600 hover:bg-green-700 text-white py-6 text-lg font-semibold"
              >
                {isSubmitting ? (
                  <span className="flex items-center gap-2">
                    <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full" />
                    Processing Order...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <CreditCard className="h-5 w-5" />
                    Place Order - ${total.toFixed(2)}
                  </span>
                )}
              </Button>
            </form>
          </div>

          {/* Right Column - Order Summary */}
          <div className="lg:col-span-1">
            <Card className="bg-gray-900/50 border-green-900/20 p-6 sticky top-8">
              <h2 className="text-xl font-semibold mb-4">Order Summary</h2>

              {/* Cart Items */}
              <div className="space-y-4 mb-6">
                {cartItems.map((item) => (
                  <div key={item.id} className="flex gap-3">
                    <img
                      src={item.image}
                      alt={item.name}
                      className="w-16 h-16 object-cover rounded-lg"
                    />
                    <div className="flex-1">
                      <h3 className="font-medium text-sm">{item.name}</h3>
                      <p className="text-xs text-gray-400">{item.brand}</p>
                      <div className="flex items-center justify-between mt-1">
                        <span className="text-xs text-gray-400">Qty: {item.quantity}</span>
                        <span className="text-sm font-semibold">${(item.price * item.quantity).toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Price Breakdown */}
              <div className="space-y-3 pt-4 border-t border-gray-800">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Subtotal</span>
                  <span>${subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Delivery Fee</span>
                  <span>${deliveryFee.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Tax (8%)</span>
                  <span>${tax.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-lg font-bold pt-3 border-t border-gray-800">
                  <span>Total</span>
                  <span className="text-green-400">${total.toFixed(2)}</span>
                </div>
              </div>

              {/* Trust Badges */}
              <div className="mt-6 pt-6 border-t border-gray-800 space-y-3">
                <div className="flex items-center gap-2 text-sm text-gray-400">
                  <ShieldCheck className="h-4 w-4 text-green-400" />
                  <span>Secure & Encrypted</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-400">
                  <CheckCircle className="h-4 w-4 text-green-400" />
                  <span>ID Verified Orders</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-400">
                  <Truck className="h-4 w-4 text-green-400" />
                  <span>Fast & Discreet Delivery</span>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
