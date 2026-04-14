import { Card } from "@/components/ui/card";
import { Leaf, MapPin, Users, Shield } from "lucide-react";

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50 via-white to-white">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-slate-900 mb-4">About GreenZone</h1>
          <p className="text-xl text-slate-600">
            Your trusted cannabis discovery platform
          </p>
        </div>

        <Card className="p-8 mb-8">
          <p className="text-lg text-slate-700 leading-relaxed mb-6">
            GreenZone is a cannabis discovery platform that helps people find trusted dispensaries,
            delivery services, and quality cannabis products near them.
          </p>

          <p className="text-lg text-slate-700 leading-relaxed mb-6">
            Users can explore vendors, browse menus, discover deals, and learn about different
            cannabis strains all in one convenient location.
          </p>

          <p className="text-lg text-slate-700 leading-relaxed">
            Our mission is to make cannabis discovery simple, transparent, and community-driven.
          </p>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <Leaf className="w-8 h-8 text-emerald-600" />
              <h2 className="text-xl font-semibold text-slate-900">Quality Products</h2>
            </div>
            <p className="text-slate-600">
              Connect with verified dispensaries offering premium cannabis products.
            </p>
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <MapPin className="w-8 h-8 text-emerald-600" />
              <h2 className="text-xl font-semibold text-slate-900">Local Discovery</h2>
            </div>
            <p className="text-slate-600">
              Find dispensaries and delivery services in your area quickly and easily.
            </p>
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <Users className="w-8 h-8 text-emerald-600" />
              <h2 className="text-xl font-semibold text-slate-900">Community Driven</h2>
            </div>
            <p className="text-slate-600">
              Real reviews and ratings from our trusted community of cannabis users.
            </p>
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <Shield className="w-8 h-8 text-emerald-600" />
              <h2 className="text-xl font-semibold text-slate-900">Safe & Secure</h2>
            </div>
            <p className="text-slate-600">
              Your information is protected with industry-standard security practices.
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
}
