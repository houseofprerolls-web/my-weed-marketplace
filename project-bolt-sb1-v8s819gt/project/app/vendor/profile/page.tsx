"use client";

import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import VendorNav from '@/components/vendor/VendorNav';
import { Store, Upload, Clock, Phone, Globe, MapPin } from 'lucide-react';

export default function VendorProfilePage() {
  return (
    <div className="min-h-screen bg-black">
      <div className="bg-gradient-to-b from-green-950/30 to-black border-b border-green-900/20">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-3xl font-bold text-white">Business Profile</h1>
            <Badge className="bg-green-600/20 text-green-500 border-green-600/30">
              Verified
            </Badge>
          </div>
          <p className="text-gray-400">Manage your business information and listing details</p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-1">
            <VendorNav />
          </div>

          <div className="lg:col-span-3 space-y-6">
            {/* Basic Information */}
            <Card className="bg-gradient-to-br from-gray-900 to-black border-green-900/20 p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="bg-green-600/20 p-3 rounded-lg">
                  <Store className="h-6 w-6 text-green-500" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white">Basic Information</h2>
                  <p className="text-gray-400 text-sm">Update your business details</p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-white font-semibold mb-2 block">Business Name</label>
                  <Input
                    defaultValue="Green Valley Dispensary"
                    className="bg-gray-800 border-green-900/20 text-white"
                  />
                </div>

                <div>
                  <label className="text-white font-semibold mb-2 block">Business Description</label>
                  <Textarea
                    defaultValue="Premium cannabis dispensary offering top-shelf flower, edibles, and concentrates. Licensed and locally owned."
                    rows={4}
                    className="bg-gray-800 border-green-900/20 text-white"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-white font-semibold mb-2 block">Business Type</label>
                    <Input
                      defaultValue="Dispensary"
                      className="bg-gray-800 border-green-900/20 text-white"
                    />
                  </div>
                  <div>
                    <label className="text-white font-semibold mb-2 block">License Number</label>
                    <Input
                      defaultValue="C10-0000001-LIC"
                      className="bg-gray-800 border-green-900/20 text-white"
                      disabled
                    />
                  </div>
                </div>
              </div>
            </Card>

            {/* Contact Information */}
            <Card className="bg-gradient-to-br from-gray-900 to-black border-green-900/20 p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="bg-green-600/20 p-3 rounded-lg">
                  <Phone className="h-6 w-6 text-green-500" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white">Contact Information</h2>
                  <p className="text-gray-400 text-sm">How customers can reach you</p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-white font-semibold mb-2 block">Phone Number</label>
                  <Input
                    defaultValue="(555) 123-4567"
                    className="bg-gray-800 border-green-900/20 text-white"
                  />
                </div>

                <div>
                  <label className="text-white font-semibold mb-2 block">Website</label>
                  <Input
                    defaultValue="https://greenvalley.com"
                    className="bg-gray-800 border-green-900/20 text-white"
                  />
                </div>

                <div>
                  <label className="text-white font-semibold mb-2 block">Email</label>
                  <Input
                    defaultValue="info@greenvalley.com"
                    type="email"
                    className="bg-gray-800 border-green-900/20 text-white"
                  />
                </div>
              </div>
            </Card>

            {/* Location */}
            <Card className="bg-gradient-to-br from-gray-900 to-black border-green-900/20 p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="bg-green-600/20 p-3 rounded-lg">
                  <MapPin className="h-6 w-6 text-green-500" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white">Location</h2>
                  <p className="text-gray-400 text-sm">Your business address</p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-white font-semibold mb-2 block">Street Address</label>
                  <Input
                    defaultValue="1234 Main St"
                    className="bg-gray-800 border-green-900/20 text-white"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="text-white font-semibold mb-2 block">City</label>
                    <Input
                      defaultValue="Los Angeles"
                      className="bg-gray-800 border-green-900/20 text-white"
                    />
                  </div>
                  <div>
                    <label className="text-white font-semibold mb-2 block">State</label>
                    <Input
                      defaultValue="CA"
                      className="bg-gray-800 border-green-900/20 text-white"
                    />
                  </div>
                  <div>
                    <label className="text-white font-semibold mb-2 block">ZIP Code</label>
                    <Input
                      defaultValue="90001"
                      className="bg-gray-800 border-green-900/20 text-white"
                    />
                  </div>
                </div>
              </div>
            </Card>

            {/* Hours of Operation */}
            <Card className="bg-gradient-to-br from-gray-900 to-black border-green-900/20 p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="bg-green-600/20 p-3 rounded-lg">
                  <Clock className="h-6 w-6 text-green-500" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white">Hours of Operation</h2>
                  <p className="text-gray-400 text-sm">Set your business hours</p>
                </div>
              </div>

              <div className="space-y-3">
                {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map((day) => (
                  <div key={day} className="grid grid-cols-3 gap-4 items-center">
                    <span className="text-white font-semibold">{day}</span>
                    <Input
                      defaultValue="9:00 AM"
                      className="bg-gray-800 border-green-900/20 text-white"
                    />
                    <Input
                      defaultValue="9:00 PM"
                      className="bg-gray-800 border-green-900/20 text-white"
                    />
                  </div>
                ))}
              </div>
            </Card>

            {/* Media */}
            <Card className="bg-gradient-to-br from-gray-900 to-black border-green-900/20 p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="bg-green-600/20 p-3 rounded-lg">
                  <Upload className="h-6 w-6 text-green-500" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white">Photos & Videos</h2>
                  <p className="text-gray-400 text-sm">Upload media to showcase your business</p>
                </div>
              </div>

              <div className="border-2 border-dashed border-green-900/20 rounded-lg p-8 text-center">
                <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-white font-semibold mb-2">Upload Photos or Videos</p>
                <p className="text-gray-400 text-sm mb-4">Drag and drop or click to browse</p>
                <Button className="bg-green-600 hover:bg-green-700 text-white">
                  Choose Files
                </Button>
              </div>
            </Card>

            {/* Save Changes */}
            <div className="flex justify-end gap-3">
              <Button variant="outline" className="border-green-900/20 text-white hover:bg-green-500/10">
                Cancel
              </Button>
              <Button className="bg-green-600 hover:bg-green-700 text-white">
                Save Changes
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
