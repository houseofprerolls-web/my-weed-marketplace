"use client";

import { useState } from 'react';
import { useAuth, UserRole } from '@/contexts/AuthContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';

type AuthModalProps = {
  open: boolean;
  onClose: () => void;
};

export function AuthModal({ open, onClose }: AuthModalProps) {
  const { signIn, signUp } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const [signInData, setSignInData] = useState({ email: '', password: '' });
  const [signUpData, setSignUpData] = useState({
    email: '',
    password: '',
    fullName: '',
    role: 'customer' as UserRole,
  });

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await signIn(signInData.email, signInData.password);
      toast({
        title: 'Welcome back!',
        description: 'You have successfully signed in.',
      });
      onClose();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to sign in',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await signUp(signUpData.email, signUpData.password, signUpData.fullName, signUpData.role);
      toast({
        title: 'Account created!',
        description: 'Welcome to GreenFinder.',
      });
      onClose();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create account',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md bg-black border-green-900/20">
        <DialogHeader>
          <DialogTitle className="text-white text-2xl">Welcome to GreenFinder</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="signin" className="w-full">
          <TabsList className="grid w-full grid-cols-2 bg-green-900/20">
            <TabsTrigger value="signin" className="data-[state=active]:bg-green-600">
              Sign In
            </TabsTrigger>
            <TabsTrigger value="signup" className="data-[state=active]:bg-green-600">
              Sign Up
            </TabsTrigger>
          </TabsList>

          <TabsContent value="signin">
            <form onSubmit={handleSignIn} className="space-y-4 mt-4">
              <div>
                <Label htmlFor="signin-email" className="text-gray-300">Email</Label>
                <Input
                  id="signin-email"
                  type="email"
                  value={signInData.email}
                  onChange={(e) => setSignInData({ ...signInData, email: e.target.value })}
                  required
                  className="bg-gray-900 border-green-900/20 text-white"
                />
              </div>
              <div>
                <Label htmlFor="signin-password" className="text-gray-300">Password</Label>
                <Input
                  id="signin-password"
                  type="password"
                  value={signInData.password}
                  onChange={(e) => setSignInData({ ...signInData, password: e.target.value })}
                  required
                  className="bg-gray-900 border-green-900/20 text-white"
                />
              </div>
              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-green-600 hover:bg-green-700"
              >
                {loading ? 'Signing In...' : 'Sign In'}
              </Button>

              <div className="relative my-4">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-green-900/20" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-black px-2 text-gray-400">Demo Accounts</span>
                </div>
              </div>

              <div className="space-y-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setSignInData({
                      email: 'greenleaf@greenzone.demo',
                      password: 'GreenZone123!'
                    });
                  }}
                  className="w-full border-green-600/30 text-green-400 hover:bg-green-600/10"
                >
                  Demo Vendor: GreenLeaf Dispensary
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setSignInData({
                      email: 'customer@greenzone.demo',
                      password: 'GreenZone123!'
                    });
                  }}
                  className="w-full border-green-600/30 text-green-400 hover:bg-green-600/10"
                >
                  Demo Customer: Jamie Carter
                </Button>
              </div>
            </form>
          </TabsContent>

          <TabsContent value="signup">
            <form onSubmit={handleSignUp} className="space-y-4 mt-4">
              <div>
                <Label htmlFor="signup-name" className="text-gray-300">Full Name</Label>
                <Input
                  id="signup-name"
                  type="text"
                  value={signUpData.fullName}
                  onChange={(e) => setSignUpData({ ...signUpData, fullName: e.target.value })}
                  required
                  className="bg-gray-900 border-green-900/20 text-white"
                />
              </div>
              <div>
                <Label htmlFor="signup-email" className="text-gray-300">Email</Label>
                <Input
                  id="signup-email"
                  type="email"
                  value={signUpData.email}
                  onChange={(e) => setSignUpData({ ...signUpData, email: e.target.value })}
                  required
                  className="bg-gray-900 border-green-900/20 text-white"
                />
              </div>
              <div>
                <Label htmlFor="signup-password" className="text-gray-300">Password</Label>
                <Input
                  id="signup-password"
                  type="password"
                  value={signUpData.password}
                  onChange={(e) => setSignUpData({ ...signUpData, password: e.target.value })}
                  required
                  className="bg-gray-900 border-green-900/20 text-white"
                />
              </div>
              <div>
                <Label htmlFor="signup-role" className="text-gray-300">Account Type</Label>
                <Select
                  value={signUpData.role}
                  onValueChange={(value: UserRole) => setSignUpData({ ...signUpData, role: value })}
                >
                  <SelectTrigger className="bg-gray-900 border-green-900/20 text-white">
                    <SelectValue placeholder="Select account type" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-900 border-green-900/20">
                    <SelectItem value="customer" className="text-white hover:bg-green-600/20">
                      Customer - Browse and order
                    </SelectItem>
                    <SelectItem value="vendor" className="text-white hover:bg-green-600/20">
                      Vendor - Sell products
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-green-600 hover:bg-green-700"
              >
                {loading ? 'Creating Account...' : 'Create Account'}
              </Button>
            </form>
          </TabsContent>
        </Tabs>

        <p className="text-xs text-gray-400 text-center mt-4">
          By signing up, you confirm you are 21+ years old and agree to our Terms of Service.
        </p>
      </DialogContent>
    </Dialog>
  );
}
