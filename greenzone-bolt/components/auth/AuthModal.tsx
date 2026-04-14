"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  useAuth,
  UserRole,
  VENDOR_POST_SIGNUP_PATH,
  POST_SIGNUP_REDIRECT_KEY,
} from '@/contexts/AuthContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useToast } from '@/hooks/use-toast';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import { SITE_NAME } from '@/lib/brand';
import { BrandLogo } from '@/components/brand/BrandLogo';
import { SignInCredentialsForm } from '@/components/auth/SignInCredentialsForm';
import { isValidUsername, normalizeUsernameInput } from '@/lib/username';
import { authErrorToastContent } from '@/lib/authUserFacingError';
import { cn } from '@/lib/utils';
import {
  treehouseAuthInputClass,
  treehouseAuthLogoFrameClass,
  treehouseAuthPrimaryButtonClass,
} from '@/lib/treehouseAuthPortal';

type AuthModalProps = {
  open: boolean;
  onClose: () => void;
  /** When opening (e.g. from List your business), land on Sign Up with this account type pre-selected. */
  signupDefaults?: { tab: 'signup'; role: UserRole };
};

export function AuthModal({ open, onClose, signupDefaults }: AuthModalProps) {
  const router = useRouter();
  const { signUp } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [authTab, setAuthTab] = useState<'signin' | 'signup'>('signin');
  const [signInEmailPreset, setSignInEmailPreset] = useState<string | undefined>(undefined);
  const [signUpData, setSignUpData] = useState({
    email: '',
    password: '',
    fullName: '',
    username: '',
    role: 'customer' as UserRole,
  });

  useEffect(() => {
    if (!open) {
      setAuthTab('signin');
      setSignInEmailPreset(undefined);
      setSignUpData({ email: '', password: '', fullName: '', username: '', role: 'customer' });
      return;
    }
    if (signupDefaults?.tab === 'signup') {
      setAuthTab('signup');
      setSignUpData((prev) => ({ ...prev, role: signupDefaults.role }));
    }
  }, [open, signupDefaults]);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSupabaseConfigured) {
      toast({
        title: 'Sign-up unavailable',
        description: 'Supabase is not configured. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY, then redeploy.',
        variant: 'destructive',
      });
      return;
    }
    setLoading(true);

    try {
      const role = signUpData.role;
      const username = normalizeUsernameInput(signUpData.username);
      if (!isValidUsername(username)) {
        toast({
          title: 'Choose a username',
          description: 'Use 3–30 characters: lowercase letters, numbers, or underscore only.',
          variant: 'destructive',
        });
        setLoading(false);
        return;
      }
      let { session } = await signUp(
        signUpData.email,
        signUpData.password,
        signUpData.fullName,
        username,
        role
      );
      // Session can arrive a tick later via persistence; avoids false "no session" right after signUp.
      if (!session && typeof window !== 'undefined') {
        await new Promise((r) => setTimeout(r, 150));
        const { data: snap } = await supabase.auth.getSession();
        session = snap.session ?? null;
      }

      if (role === 'vendor') {
        if (session) {
          toast({
            title: 'Account created!',
            description: 'Taking you to List your business.',
          });
          onClose();
          router.push(VENDOR_POST_SIGNUP_PATH);
        } else {
          sessionStorage.setItem(POST_SIGNUP_REDIRECT_KEY, VENDOR_POST_SIGNUP_PATH);
          toast({
            title: 'Check your email',
            description:
              'Confirm your address to finish sign-up. After you verify, we will open List your business.',
          });
          onClose();
        }
      } else if (session) {
        toast({
          title: 'Account created!',
          description: `Welcome to ${SITE_NAME}. You are signed in.`,
        });
        onClose();
      } else {
        const email = signUpData.email.trim();
        setSignUpData({ email: '', password: '', fullName: '', username: '', role: 'customer' });
        setSignInEmailPreset(email);
        setAuthTab('signin');
        toast({
          title: 'Confirm your email',
          description:
            'We sent you a link. After you tap it, return here and sign in with the same email and password.',
        });
      }
    } catch (error: unknown) {
      const { title, description } = authErrorToastContent(error);
      toast({ title, description, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        // Radix calls onOpenChange(true) when opening; onClose() must only run when closing
        // or the dialog will immediately reset to closed in controlled mode.
        if (!nextOpen) onClose();
      }}
    >
      <DialogContent
        className={cn(
          'sm:max-w-md border-2 border-brand-red/40 bg-zinc-950/98 p-6 text-white shadow-2xl ring-1 ring-brand-lime/30'
        )}
        onInteractOutside={(e) => {
          // Safari/iOS Passwords and "Use Strong Password" UI mount outside this DOM subtree;
          // without this, Radix treats it as an outside dismiss and closes the modal.
          e.preventDefault();
        }}
        onPointerDownOutside={(e) => {
          e.preventDefault();
        }}
      >
        <DialogHeader className="space-y-3 sm:text-center">
          <div className="flex justify-center pt-1">
            <div className={treehouseAuthLogoFrameClass}>
              <BrandLogo priority />
            </div>
          </div>
          <DialogTitle className="text-2xl text-white">Welcome to {SITE_NAME}</DialogTitle>
          <p className="text-sm font-normal text-zinc-400">Sign in or create an account to continue.</p>
        </DialogHeader>

        <Tabs value={authTab} onValueChange={(v) => setAuthTab(v as 'signin' | 'signup')} className="w-full">
          <TabsList className="grid w-full grid-cols-2 border border-brand-lime/20 bg-black/50 p-1">
            <TabsTrigger
              value="signin"
              className="text-zinc-400 data-[state=active]:bg-brand-red data-[state=active]:text-white data-[state=active]:shadow-md"
            >
              Sign In
            </TabsTrigger>
            <TabsTrigger
              value="signup"
              className="text-zinc-400 data-[state=active]:bg-brand-red data-[state=active]:text-white data-[state=active]:shadow-md"
            >
              Sign Up
            </TabsTrigger>
          </TabsList>

          <TabsContent value="signin" className="mt-4">
            <SignInCredentialsForm
              key={`${open}-${signInEmailPreset ?? ''}`}
              initialEmail={signInEmailPreset}
              onSuccess={onClose}
              className="space-y-4"
            />
          </TabsContent>

          <TabsContent value="signup">
            <form onSubmit={handleSignUp} className="space-y-4 mt-4">
              <div>
                <Label htmlFor="signup-name" className="text-zinc-300">
                  Full Name
                </Label>
                <Input
                  id="signup-name"
                  type="text"
                  autoComplete="name"
                  value={signUpData.fullName}
                  onChange={(e) => setSignUpData({ ...signUpData, fullName: e.target.value })}
                  required
                  className={cn(treehouseAuthInputClass, 'mt-1')}
                />
              </div>
              <div>
                <Label htmlFor="signup-username" className="text-zinc-300">
                  Username
                </Label>
                <Input
                  id="signup-username"
                  type="text"
                  autoComplete="off"
                  placeholder="letters, numbers, underscore (3–30)"
                  value={signUpData.username}
                  onChange={(e) =>
                    setSignUpData({ ...signUpData, username: normalizeUsernameInput(e.target.value) })
                  }
                  required
                  minLength={3}
                  maxLength={30}
                  className={cn(treehouseAuthInputClass, 'mt-1')}
                />
                <p className="mt-1 text-[11px] text-zinc-500">
                  Shown on the feed, reviews, and your public profile link.
                </p>
              </div>
              <div>
                <Label htmlFor="signup-email" className="text-zinc-300">
                  Email
                </Label>
                <Input
                  id="signup-email"
                  type="email"
                  value={signUpData.email}
                  onChange={(e) => setSignUpData({ ...signUpData, email: e.target.value })}
                  required
                  className={cn(treehouseAuthInputClass, 'mt-1')}
                />
              </div>
              <div>
                <Label htmlFor="signup-password" className="text-zinc-300">
                  Password
                </Label>
                <Input
                  id="signup-password"
                  type="password"
                  autoComplete="new-password"
                  value={signUpData.password}
                  onChange={(e) => setSignUpData({ ...signUpData, password: e.target.value })}
                  required
                  className={cn(treehouseAuthInputClass, 'mt-1')}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-zinc-300">Account type</Label>
                <RadioGroup
                  value={signUpData.role}
                  onValueChange={(value: UserRole) => setSignUpData({ ...signUpData, role: value })}
                  className="grid gap-3"
                >
                  <label
                    htmlFor="acct-customer"
                    className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors ${
                      signUpData.role === 'customer'
                        ? 'border-brand-lime/50 bg-brand-lime/10'
                        : 'border-brand-lime/15 bg-black/30 hover:border-brand-lime/35'
                    }`}
                  >
                    <RadioGroupItem value="customer" id="acct-customer" className="mt-0.5 border-brand-lime/60" />
                    <span className="text-left text-sm">
                      <span className="font-medium text-white">Consumer</span>
                      <span className="mt-0.5 block text-xs text-zinc-400">Browse shops, order, deals, community feed</span>
                    </span>
                  </label>
                  <label
                    htmlFor="acct-vendor"
                    className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors ${
                      signUpData.role === 'vendor'
                        ? 'border-brand-lime/50 bg-brand-lime/10'
                        : 'border-brand-lime/15 bg-black/30 hover:border-brand-lime/35'
                    }`}
                  >
                    <RadioGroupItem value="vendor" id="acct-vendor" className="mt-0.5 border-brand-lime/60" />
                    <span className="text-left text-sm">
                      <span className="font-medium text-white">Vendor / operator</span>
                      <span className="mt-0.5 block text-xs text-zinc-400">
                        Licensed retail or delivery — after sign-up we open List your business so you can apply
                      </span>
                    </span>
                  </label>
                </RadioGroup>
              </div>
              <Button type="submit" disabled={loading} className={treehouseAuthPrimaryButtonClass}>
                {loading ? 'Creating Account...' : 'Create Account'}
              </Button>
            </form>
          </TabsContent>
        </Tabs>

        <p className="mt-4 text-center text-xs text-zinc-500">
          By signing up, you confirm you are 21+ years old and agree to our Terms of Service.
        </p>
      </DialogContent>
    </Dialog>
  );
}
