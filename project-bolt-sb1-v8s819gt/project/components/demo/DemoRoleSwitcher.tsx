"use client";

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { User, Store, Shield, Loader as Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

const DEMO_ACCOUNTS = {
  customer: {
    email: 'customer@greenzone.demo',
    password: 'GreenZone123!',
    label: 'Customer',
    description: 'Browse, order, and track deliveries',
    icon: User,
    color: 'from-blue-500 to-blue-700',
  },
  vendor: {
    email: 'greenleaf.vendor@greenzone.demo',
    password: 'GreenZone123!',
    label: 'Vendor',
    description: 'Manage menu, orders, and analytics',
    icon: Store,
    color: 'from-green-500 to-green-700',
  },
  admin: {
    email: 'admin@greenzone.demo',
    password: 'GreenZone123!',
    label: 'Admin',
    description: 'Platform management and oversight',
    icon: Shield,
    color: 'from-purple-500 to-pink-600',
  },
};

export function DemoRoleSwitcher() {
  const { user, signOut } = useAuth();
  const [switching, setSwitching] = useState(false);
  const [switchingTo, setSwitchingTo] = useState<string | null>(null);
  const router = useRouter();

  const isDemoAccount = user?.email?.endsWith('@greenzone.demo');

  const handleSwitch = async (role: keyof typeof DEMO_ACCOUNTS) => {
    try {
      setSwitching(true);
      setSwitchingTo(role);

      await signOut();
      await new Promise(resolve => setTimeout(resolve, 500));

      const account = DEMO_ACCOUNTS[role];
      const { error } = await supabase.auth.signInWithPassword({
        email: account.email,
        password: account.password,
      });

      if (error) throw error;

      await new Promise(resolve => setTimeout(resolve, 500));

      if (role === 'vendor') {
        router.push('/vendor/dashboard');
      } else if (role === 'admin') {
        router.push('/admin');
      } else {
        router.push('/');
      }
    } catch (error) {
      console.error('Error switching roles:', error);
    } finally {
      setSwitching(false);
      setSwitchingTo(null);
    }
  };

  if (!isDemoAccount) {
    return null;
  }

  return (
    <Card className="bg-gradient-to-br from-gray-900 to-gray-800 border-gray-700">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-orange-500 animate-pulse"></div>
          Demo Mode
        </CardTitle>
        <CardDescription>
          Switch between different roles to explore the platform
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 gap-3">
          {Object.entries(DEMO_ACCOUNTS).map(([key, account]) => {
            const Icon = account.icon;
            const isCurrentRole = user?.email === account.email;
            const isLoading = switching && switchingTo === key;

            return (
              <Button
                key={key}
                onClick={() => handleSwitch(key as keyof typeof DEMO_ACCOUNTS)}
                disabled={switching || isCurrentRole}
                variant={isCurrentRole ? 'default' : 'outline'}
                className={`justify-start h-auto py-3 ${
                  isCurrentRole
                    ? 'bg-green-600 hover:bg-green-700 border-green-500'
                    : 'bg-gray-800 border-gray-700 hover:bg-gray-700'
                }`}
              >
                <div className="flex items-center gap-3 w-full">
                  <div className={`h-10 w-10 rounded-lg bg-gradient-to-br ${account.color} flex items-center justify-center shrink-0`}>
                    {isLoading ? (
                      <Loader2 className="h-5 w-5 text-white animate-spin" />
                    ) : (
                      <Icon className="h-5 w-5 text-white" />
                    )}
                  </div>
                  <div className="text-left flex-1">
                    <div className="font-semibold text-white flex items-center gap-2">
                      {account.label}
                      {isCurrentRole && (
                        <span className="text-xs bg-green-500 text-white px-2 py-0.5 rounded-full">
                          Active
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-gray-400 mt-0.5">
                      {account.description}
                    </div>
                  </div>
                </div>
              </Button>
            );
          })}
        </div>

        <div className="mt-4 p-3 bg-gray-800 rounded-lg border border-gray-700">
          <p className="text-xs text-gray-400">
            Currently logged in as:{' '}
            <span className="text-green-400 font-medium">{user?.email}</span>
          </p>
          <p className="text-xs text-gray-500 mt-1">
            All demo actions are simulated and do not affect production data
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
