'use client';

import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import type { User } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/client';

export interface DbProfile {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  phoneVerified: boolean;
  /** A real, confirmed email address (from Supabase). */
  emailVerified?: boolean;
  avatarUrl: string | null;
  city: string | null;
  address: string | null;
  role: 'USER' | 'ADMIN' | 'SUPER_ADMIN';
  status: 'ACTIVE' | 'SUSPENDED' | 'BANNED';
  roleMetadata?: { permissions?: Record<string, boolean> };
  createdAt: string;
  updatedAt: string;
}

/** Whether the account may post listings and contact owners. */
export function isAccountVerified(profile: DbProfile | null): boolean {
  return !!profile && (profile.emailVerified === true || profile.phoneVerified);
}

export type EmailCodePurpose = 'login' | 'signup' | 'recovery';

interface AuthResult {
  error: { message: string; code?: string } | null;
}

interface AuthContextType {
  user: User | null;
  profile: DbProfile | null;
  loading: boolean;
  signInWithGoogle: (redirectPath?: string) => Promise<AuthResult>;
  signInWithPassword: (email: string, password: string) => Promise<AuthResult>;
  signUpWithPassword: (name: string, email: string, password: string, redirectPath?: string) => Promise<AuthResult & { needsConfirmation: boolean }>;
  sendEmailCode: (email: string, purpose: EmailCodePurpose, options?: { name?: string; redirectPath?: string }) => Promise<AuthResult & { message?: string }>;
  verifyEmailCode: (email: string, code: string, purpose: EmailCodePurpose) => Promise<AuthResult>;
  signInWithPhoneToken: (idToken: string, phone?: string) => Promise<AuthResult>;
  updatePassword: (password: string) => Promise<AuthResult>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

export const MIN_PASSWORD_LENGTH = 8;

const SUSPENDED_MESSAGE = 'Your account has been suspended. Please contact support.';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

/** Plain-language versions of Supabase auth errors. */
function friendlyError(error: { message?: string; code?: string; status?: number } | null | undefined): AuthResult['error'] {
  if (!error) return null;
  const msg = error.message || '';
  if (/invalid login credentials/i.test(msg)) return { message: 'Email or password is incorrect.', code: 'invalid_credentials' };
  if (/email not confirmed/i.test(msg)) return { message: 'Please confirm your email first. We can send you a new code.', code: 'email_not_confirmed' };
  if (/expired|invalid.*(otp|token)|token.*(expired|invalid)/i.test(msg)) return { message: 'That code is wrong or has expired. Request a new one.', code: 'invalid_code' };
  if (/banned/i.test(msg)) return { message: SUSPENDED_MESSAGE, code: 'suspended' };
  if (/password should be|weak password/i.test(msg)) return { message: `Use at least ${MIN_PASSWORD_LENGTH} characters, mixing letters and numbers.`, code: 'weak_password' };
  if (/rate limit|too many|security purposes/i.test(msg) || error.status === 429) return { message: 'Too many attempts. Please wait a minute and try again.', code: 'rate_limited' };
  return { message: msg || 'Something went wrong. Please try again.', code: error.code };
}

async function postJson(url: string, body: unknown) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<DbProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = useMemo(() => createClient(), []);

  /**
   * Loads the profile from the server, the only source of role and status.
   * A suspended account is signed out on the spot.
   */
  const loadProfile = useCallback(async (): Promise<{ suspended: boolean }> => {
    try {
      const res = await fetch('/api/auth/me', { cache: 'no-store' });
      if (!res.ok) return { suspended: false };
      const data = await res.json();
      if (data.authenticated && data.profile) {
        setProfile(data.profile);
        // Local development mock sessions have no Supabase user.
        setUser((current) => current ?? ({ id: data.profile.id, email: data.profile.email } as User));
        return { suspended: false };
      }
      if (data.suspended) {
        await supabase.auth.signOut({ scope: 'local' });
        setUser(null);
        setProfile(null);
        if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
          window.location.href = '/login?error=suspended';
        }
        return { suspended: true };
      }
      setProfile(null);
      return { suspended: false };
    } catch (err) {
      console.warn('[AuthContext] Profile load failed:', err);
      return { suspended: false };
    }
  }, [supabase]);

  const refreshProfile = useCallback(async () => {
    await loadProfile();
  }, [loadProfile]);

  useEffect(() => {
    let active = true;

    const init = async () => {
      const { data: { user: sessionUser } } = await supabase.auth.getUser();
      if (!active) return;
      setUser(sessionUser ?? null);
      await loadProfile();
      if (active) setLoading(false);
    };
    init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        setUser(null);
        setProfile(null);
        return;
      }
      if (session?.user && (event === 'SIGNED_IN' || event === 'USER_UPDATED')) {
        setUser(session.user);
        // Defer: calling other Supabase methods inside this callback can deadlock.
        setTimeout(() => { loadProfile(); }, 0);
      }
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [supabase, loadProfile]);

  const afterSignIn = useCallback(async (): Promise<AuthResult> => {
    const { data: { user: sessionUser } } = await supabase.auth.getUser();
    setUser(sessionUser ?? null);
    const { suspended } = await loadProfile();
    return suspended ? { error: { message: SUSPENDED_MESSAGE, code: 'suspended' } } : { error: null };
  }, [supabase, loadProfile]);

  const signInWithGoogle = async (redirectPath?: string): Promise<AuthResult> => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/callback?redirect=${encodeURIComponent(redirectPath || '/dashboard')}`,
        queryParams: { prompt: 'select_account' },
      },
    });
    return { error: friendlyError(error) };
  };

  const signInWithPassword = async (email: string, password: string): Promise<AuthResult> => {
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password });
    if (error) return { error: friendlyError(error) };
    return afterSignIn();
  };

  const signUpWithPassword = async (name: string, email: string, password: string, redirectPath?: string) => {
    const { data, error } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(),
      password,
      options: {
        data: { name: name.trim() },
        emailRedirectTo: `${window.location.origin}/callback?redirect=${encodeURIComponent(redirectPath || '/dashboard')}`,
      },
    });
    if (error) return { error: friendlyError(error), needsConfirmation: false };
    if (data.session) {
      const result = await afterSignIn();
      return { ...result, needsConfirmation: false };
    }
    return { error: null, needsConfirmation: true };
  };

  const sendEmailCode = async (email: string, purpose: EmailCodePurpose, options?: { name?: string; redirectPath?: string }) => {
    try {
      const { ok, data } = await postJson('/api/auth/email-code', {
        email,
        purpose,
        name: options?.name,
        redirect: options?.redirectPath,
      });
      if (!ok) return { error: { message: data.message || 'Could not send the code. Please try again.' } };
      return { error: null, message: data.message as string | undefined };
    } catch {
      return { error: { message: 'Network error. Check your connection and try again.' } };
    }
  };

  const verifyEmailCode = async (email: string, code: string, purpose: EmailCodePurpose): Promise<AuthResult> => {
    const { error } = await supabase.auth.verifyOtp({
      email: email.trim().toLowerCase(),
      token: code,
      type: purpose === 'recovery' ? 'recovery' : 'email',
    });
    if (error) return { error: friendlyError(error) };
    return afterSignIn();
  };

  const signInWithPhoneToken = async (idToken: string, phone?: string): Promise<AuthResult> => {
    try {
      const { ok, data } = await postJson('/api/auth/firebase-login', { idToken, phone });
      if (!ok) return { error: { message: data.message || 'Phone sign-in failed.', code: data.code } };
      return afterSignIn();
    } catch {
      return { error: { message: 'Network error. Check your connection and try again.' } };
    }
  };

  const updatePassword = async (password: string): Promise<AuthResult> => {
    const { error } = await supabase.auth.updateUser({ password });
    if (error) return { error: friendlyError(error) };
    // Sign out every other device that knew the old password.
    await supabase.auth.signOut({ scope: 'others' });
    return { error: null };
  };

  const signOut = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch {
      // Best effort; the local sign-out below still clears this browser.
    }
    await supabase.auth.signOut({ scope: 'local' }).catch(() => {});
    setUser(null);
    setProfile(null);
    window.location.href = '/login';
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,
        signInWithGoogle,
        signInWithPassword,
        signUpWithPassword,
        sendEmailCode,
        verifyEmailCode,
        signInWithPhoneToken,
        updatePassword,
        signOut,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
