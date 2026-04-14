"use client";

import { createContext, useContext, useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Session, User } from '@supabase/supabase-js';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import { authPublicOriginBase, optionalSupabaseAuthRedirectTo } from '@/lib/authUserFacingError';

/** After vendor sign-up, redirect here once the user has a session (including after email confirmation). */
export const VENDOR_POST_SIGNUP_PATH = "/list-your-business?from=vendor_signup";

export const POST_SIGNUP_REDIRECT_KEY = "gz_post_signup_redirect";

export type UserRole = 'customer' | 'vendor' | 'admin' | 'admin_jr';

export type Profile = {
  id: string;
  email: string;
  full_name: string | null;
  username: string | null;
  avatar_url: string | null;
  bio?: string | null;
  role: UserRole;
  phone: string | null;
  city: string | null;
  zip_code: string | null;
  id_verified: boolean;
  id_document_url?: string | null;
  id_document_type?: 'government_id' | 'passport' | 'photo_id' | null;
  id_document_uploaded_at?: string | null;
  created_at: string;
  updated_at: string;
  /** Set by admin; enforced client-side + Auth ban. */
  site_banned?: boolean;
  /** One-time PWA install loyalty bonus (see `datreehouse_claim_pwa_homescreen_loyalty`). */
  pwa_homescreen_loyalty_claimed_at?: string | null;
  pwa_homescreen_loyalty_dismissed_at?: string | null;
};

type AuthContextType = {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  signUp: (
    email: string,
    password: string,
    fullName: string,
    username: string,
    role?: UserRole
  ) => Promise<{ session: Session | null }>;
  /** `identifier` may be email or profiles.username (case-insensitive). */
  signIn: (identifier: string, password: string) => Promise<void>;
  /** Resend sign-up confirmation when the account exists but email is not verified yet. */
  resendSignupConfirmation: (identifier: string) => Promise<void>;
  requestPasswordReset: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const flushPendingSignupRedirect = useCallback(() => {
    if (typeof window === "undefined") return;
    const pending = sessionStorage.getItem(POST_SIGNUP_REDIRECT_KEY);
    if (pending) {
      sessionStorage.removeItem(POST_SIGNUP_REDIRECT_KEY);
      router.push(pending);
    }
  }, [router]);

  const fetchProfile = async (userId: string) => {
    const { data, error } = await supabase.rpc('customer_get_profile', {
      p_user_id: userId,
    });

    if (error) {
      console.error('Error fetching profile:', error);
      return null;
    }

    const raw = data as Record<string, unknown> | null;
    if (raw && raw.site_banned === true) {
      await supabase.auth.signOut();
      if (typeof window !== 'undefined') {
        window.location.replace('/account-suspended');
      }
      return null;
    }

    return data as Profile;
  };

  const refreshProfile = async () => {
    if (user) {
      const profileData = await fetchProfile(user.id);
      setProfile(profileData);
    }
  };

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }

    supabase.auth
      .getSession()
      .then(async ({ data: { session } }) => {
        setUser(session?.user ?? null);

        if (session?.user) {
          const profileData = await fetchProfile(session.user.id);
          setProfile(profileData);
          flushPendingSignupRedirect();
        }

        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      (async () => {
        setUser(session?.user ?? null);

        if (event === 'SIGNED_IN' && session?.user) {
          const profileData = await fetchProfile(session.user.id);
          setProfile(profileData);

          if (!profileData) {
            await supabase.from('profiles').insert({
              id: session.user.id,
              email: session.user.email!,
              full_name: session.user.user_metadata?.full_name || null,
              role: (session.user.user_metadata?.role as UserRole) || 'customer',
            });

            const newProfile = await fetchProfile(session.user.id);
            setProfile(newProfile);
          }

          flushPendingSignupRedirect();
        } else if (event === 'SIGNED_OUT') {
          setProfile(null);
        }
      })();
    });

    return () => subscription.unsubscribe();
  }, [flushPendingSignupRedirect]);

  const signUp = async (
    email: string,
    password: string,
    fullName: string,
    username: string,
    role: UserRole = 'customer'
  ) => {
    const redirectTo = optionalSupabaseAuthRedirectTo();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        ...(redirectTo ? { emailRedirectTo: redirectTo } : {}),
        data: {
          full_name: fullName,
          role: role,
          username,
        },
      },
    });

    if (error) throw error;
    return { session: data.session ?? null };
  };

  const resolveLoginEmail = async (identifier: string) => {
    const trimmed = identifier.trim();
    if (!trimmed) throw new Error('Enter your email or username.');
    if (trimmed.includes('@')) return trimmed;
    const { data, error } = await supabase.rpc('lookup_email_for_login', {
      p_identifier: trimmed,
    });
    if (error) throw error;
    if (typeof data !== 'string' || !data.trim()) {
      throw new Error('No account found for that username.');
    }
    return data.trim();
  };

  const signIn = async (identifier: string, password: string) => {
    const email = await resolveLoginEmail(identifier);
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;
  };

  const resendSignupConfirmation = async (identifier: string) => {
    const email = await resolveLoginEmail(identifier);
    const redirectTo = optionalSupabaseAuthRedirectTo();
    const { error } = await supabase.auth.resend(
      redirectTo
        ? { type: 'signup', email, options: { emailRedirectTo: redirectTo } }
        : { type: 'signup', email }
    );
    if (error) throw error;
  };

  const requestPasswordReset = async (email: string) => {
    const trimmed = email.trim();
    if (!trimmed) throw new Error('Enter your email address first.');
    const redirectTo = `${authPublicOriginBase()}/auth/reset-password`;
    const { error } = await supabase.auth.resetPasswordForEmail(trimmed, { redirectTo });
    if (error) throw error;
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    setProfile(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,
        signUp,
        signIn,
        resendSignupConfirmation,
        requestPasswordReset,
        signOut,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
