'use client';

import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AssistantPanel } from '@/components/ai/AssistantPanel';
import { Bot, ShoppingBag, Store, Shield, Sparkles, Lock, CircleCheck as CheckCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { getAvailableAssistants } from '@/lib/ai/permissions';

export default function AIAssistantsPage() {
  const { profile, loading } = useAuth();
  const availableAssistants = profile?.role ? getAvailableAssistants([profile.role]) : [];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white py-12">
      <div className="max-w-6xl mx-auto px-4">
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Bot className="h-12 w-12 text-green-600" />
            <h1 className="text-4xl font-bold">AI Assistants</h1>
          </div>
          <p className="text-xl text-gray-600 mb-4">
            Role-aware AI assistants powered by OpenAI
          </p>
          <Badge variant="outline" className="text-lg px-4 py-2">
            <Sparkles className="h-4 w-4 mr-2" />
            Secure & Permission-Protected
          </Badge>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <Card className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-green-100 rounded-full p-3">
                <ShoppingBag className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <h3 className="font-semibold">Customer Assistant</h3>
                <Badge variant="secondary" className="mt-1">For Customers</Badge>
              </div>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              Help customers discover products, understand strains, track orders, and navigate the platform.
            </p>
            <ul className="text-sm space-y-2 mb-4">
              <li className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-green-600 mt-0.5" />
                <span>Product recommendations</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-green-600 mt-0.5" />
                <span>Strain information</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-green-600 mt-0.5" />
                <span>Order status help</span>
              </li>
              <li className="flex items-start gap-2">
                <Lock className="h-4 w-4 text-gray-400 mt-0.5" />
                <span className="text-gray-500">Access to own orders only</span>
              </li>
            </ul>
            {availableAssistants.includes('customer') && (
              <AssistantPanel assistantType="customer" />
            )}
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-blue-100 rounded-full p-3">
                <Store className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <h3 className="font-semibold">Vendor Assistant</h3>
                <Badge variant="secondary" className="mt-1">For Vendors</Badge>
              </div>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              Help vendors write product descriptions, create promotions, and optimize their business.
            </p>
            <ul className="text-sm space-y-2 mb-4">
              <li className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-blue-600 mt-0.5" />
                <span>Product description writing</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-blue-600 mt-0.5" />
                <span>Promotion suggestions</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-blue-600 mt-0.5" />
                <span>Analytics summaries</span>
              </li>
              <li className="flex items-start gap-2">
                <Lock className="h-4 w-4 text-gray-400 mt-0.5" />
                <span className="text-gray-500">Access to own vendor data only</span>
              </li>
            </ul>
            {availableAssistants.includes('vendor') && (
              <AssistantPanel assistantType="vendor" />
            )}
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-purple-100 rounded-full p-3">
                <Shield className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <h3 className="font-semibold">Admin Assistant</h3>
                <Badge variant="secondary" className="mt-1">For Admins</Badge>
              </div>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              Help admins analyze vendor performance, review incidents, and identify opportunities.
            </p>
            <ul className="text-sm space-y-2 mb-4">
              <li className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-purple-600 mt-0.5" />
                <span>Vendor performance analysis</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-purple-600 mt-0.5" />
                <span>Incident summaries</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-purple-600 mt-0.5" />
                <span>Market insights</span>
              </li>
              <li className="flex items-start gap-2">
                <Lock className="h-4 w-4 text-gray-400 mt-0.5" />
                <span className="text-gray-500">Admin-level access only</span>
              </li>
            </ul>
            {availableAssistants.includes('admin') && (
              <AssistantPanel assistantType="admin" />
            )}
          </Card>
        </div>

        <Card className="p-8 bg-gradient-to-r from-green-50 to-blue-50">
          <h2 className="text-2xl font-bold mb-4">Security & Privacy</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-semibold mb-2 flex items-center gap-2">
                <Lock className="h-5 w-5 text-green-600" />
                Role-Based Access Control
              </h3>
              <p className="text-sm text-gray-600">
                Each assistant type has strict permissions. Customers can only access their own data, vendors can only access their business data, and admins have limited operational access.
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-2 flex items-center gap-2">
                <Shield className="h-5 w-5 text-blue-600" />
                Secure Backend Processing
              </h3>
              <p className="text-sm text-gray-600">
                All AI requests are processed through secure backend APIs. OpenAI API keys are never exposed to the frontend. Data is sanitized before being shared with AI.
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-2 flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-purple-600" />
                Context Awareness
              </h3>
              <p className="text-sm text-gray-600">
                Assistants automatically receive relevant context based on your role, making responses more helpful and accurate without exposing sensitive information.
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-2 flex items-center gap-2">
                <Bot className="h-5 w-5 text-green-600" />
                Usage Tracking
              </h3>
              <p className="text-sm text-gray-600">
                All AI interactions are logged for quality, monitoring, and billing purposes. You maintain full control over your conversation history.
              </p>
            </div>
          </div>
        </Card>

        {!profile && (
          <div className="mt-8 text-center">
            <p className="text-gray-600 mb-4">
              Sign in to try the AI assistants based on your role
            </p>
          </div>
        )}

        {profile && availableAssistants.length === 0 && (
          <div className="mt-8 text-center">
            <p className="text-gray-600">
              No assistants available for your current role. Contact support for assistance.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
