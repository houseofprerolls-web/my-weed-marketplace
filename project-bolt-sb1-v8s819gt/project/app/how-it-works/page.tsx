import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Search, ShoppingCart, Truck, CircleCheck as CheckCircle, Shield, Clock, Star } from 'lucide-react';

const steps = [
  {
    icon: Search,
    title: 'Find Services',
    description: 'Search for cannabis delivery services in your area. Browse menus, compare prices, and read reviews from other customers.',
  },
  {
    icon: ShoppingCart,
    title: 'Add to Cart',
    description: 'Select your favorite products and add them to your cart. Choose from flower, edibles, vapes, pre-rolls, concentrates, and CBD products.',
  },
  {
    icon: Truck,
    title: 'Fast Delivery',
    description: 'Your order is prepared and delivered to your door within 30-60 minutes. Track your order in real-time.',
  },
  {
    icon: CheckCircle,
    title: 'Enjoy',
    description: 'Receive your premium cannabis products and enjoy responsibly. Rate your experience and help others find great services.',
  },
];

const benefits = [
  {
    icon: Shield,
    title: 'Licensed & Verified',
    description: 'All delivery services are licensed and verified for your safety and peace of mind.',
  },
  {
    icon: Clock,
    title: 'Fast Delivery',
    description: 'Most orders arrive within 30-60 minutes, getting you what you need quickly.',
  },
  {
    icon: Star,
    title: 'Quality Products',
    description: 'Access premium cannabis products from trusted dispensaries in your area.',
  },
];

export default function HowItWorksPage() {
  return (
    <div className="min-h-screen bg-black">
      <div className="bg-gradient-to-b from-green-950/30 to-black py-16">
        <div className="container mx-auto px-4 max-w-4xl text-center">
          <h1 className="text-4xl md:text-6xl font-bold text-white mb-6">
            How It Works
          </h1>
          <p className="text-xl text-gray-300">
            Get cannabis delivered to your door in 4 simple steps
          </p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12 max-w-6xl">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          {steps.map((step, index) => {
            const Icon = step.icon;
            return (
              <Card key={index} className="relative bg-gradient-to-br from-gray-900 to-black border-green-900/20 p-8 text-center">
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 w-8 h-8 bg-green-600 rounded-full flex items-center justify-center text-white font-bold">
                  {index + 1}
                </div>

                <div className="flex justify-center mb-4">
                  <div className="p-4 bg-green-600/20 rounded-2xl">
                    <Icon className="h-8 w-8 text-green-500" />
                  </div>
                </div>

                <h3 className="text-white font-semibold text-xl mb-2">{step.title}</h3>
                <p className="text-gray-400">{step.description}</p>
              </Card>
            );
          })}
        </div>

        <div className="mb-16">
          <h2 className="text-3xl font-bold text-white text-center mb-12">
            Why Choose GreenFinder?
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {benefits.map((benefit, index) => {
              const Icon = benefit.icon;
              return (
                <Card key={index} className="bg-gradient-to-br from-gray-900 to-black border-green-900/20 p-8 text-center">
                  <div className="flex justify-center mb-4">
                    <div className="p-4 bg-green-600/20 rounded-2xl">
                      <Icon className="h-10 w-10 text-green-500" />
                    </div>
                  </div>
                  <h3 className="text-white font-semibold text-xl mb-2">{benefit.title}</h3>
                  <p className="text-gray-400">{benefit.description}</p>
                </Card>
              );
            })}
          </div>
        </div>

        <Card className="bg-gray-900 border-green-900/20 p-8 mb-12">
          <h2 className="text-2xl font-bold text-white mb-6 text-center">
            Frequently Asked Questions
          </h2>
          <div className="space-y-6 max-w-3xl mx-auto">
            <div>
              <h3 className="text-lg font-semibold text-white mb-2">
                Do I need to be 21 or older?
              </h3>
              <p className="text-gray-300">
                Yes, you must be 21+ years old with a valid government-issued ID to order cannabis products. ID verification is required at the time of delivery.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white mb-2">
                How long does delivery take?
              </h3>
              <p className="text-gray-300">
                Most deliveries arrive within 30-60 minutes. Delivery times may vary based on your location, order volume, and traffic conditions.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white mb-2">
                What payment methods are accepted?
              </h3>
              <p className="text-gray-300">
                Payment methods vary by delivery service but typically include cash, debit cards, and sometimes credit cards. Check with the specific service for their accepted payment methods.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white mb-2">
                Is my order discreet?
              </h3>
              <p className="text-gray-300">
                Yes, all deliveries are discreet and professional. Products are delivered in unmarked packaging to protect your privacy.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white mb-2">
                What if I have an issue with my order?
              </h3>
              <p className="text-gray-300">
                Contact the delivery service directly through your order page. Most services have customer support to help resolve any issues.
              </p>
            </div>
          </div>
        </Card>

        <div className="text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            Ready to Get Started?
          </h2>
          <p className="text-gray-300 mb-8 text-lg">
            Browse delivery services in your area and place your first order today
          </p>
          <Link href="/directory">
            <Button size="lg" className="bg-green-600 hover:bg-green-700 text-white px-8 py-6 text-lg">
              Browse Services
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
