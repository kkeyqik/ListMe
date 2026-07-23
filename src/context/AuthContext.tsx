'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { User } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/client';

export interface DbProfile {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  phoneVerified: boolean;
  avatarUrl: string | null;
  city: string | null;
  address: string | null;
  role: 'USER' | 'ADMIN' | 'SUPER_ADMIN';
  status: 'ACTIVE' | 'SUSPENDED' | 'BANNED';
  createdAt: string;
  updatedAt: string;
}

interface AuthContextType {
  user: User | null;
  profile: DbProfile | null;
  loading: boolean;
  signInWithOtp: (phone: string) => Promise<{ error: any }>;
  verifyOtp: (phone: string, token: string) => Promise<{ error: any }>;
  verifyEmailOtp: (email: string, token: string) => Promise<{ error: any }>;
  signInWithGoogle: (redirectPath?: string) => Promise<{ error: any }>;
  signInWithEmail: (email: string) => Promise<{ error: any }>;
  signUp: (name: string, phone: string, email: string, city?: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const PENDING_SIGNUP_KEY = 'listme_pending_signup';
const formatIndiaPhone = (phone: string) => (phone.startsWith('+') ? phone : `+91${phone}`);

// Check if mock auth is enabled (build-time flag)
const IS_MOCK_AUTH_ENABLED = process.env.NEXT_PUBLIC_ENABLE_MOCK_AUTH === 'true';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Generate deterministic fallback profile from Supabase user object
function createFallbackProfile(user: User): DbProfile {
  const userRole = user.app_metadata?.role || user.user_metadata?.role || 'USER';
  const isAdmin = userRole === 'ADMIN' || userRole === 'SUPER_ADMIN';

  return {
    id: user.id,
    name: user.user_metadata?.name || user.user_metadata?.full_name || 'User',
    email: user.email || null,
    phone: user.phone || null,
    phoneVerified: true,
    avatarUrl: user.user_metadata?.avatar_url || null,
    city: user.user_metadata?.city || null,
    address: null,
    role: isAdmin ? (userRole as 'ADMIN' | 'SUPER_ADMIN') : 'USER',
    status: 'ACTIVE',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<DbProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  const fetchProfile = useCallback(async (userId: string) => {
    try {
      const response = await fetch(`/api/users/${userId}`);
      if (response.ok) {
        const data = await response.json();
        if (data.profile) {
          setProfile(data.profile);
        }
      }
    } catch (err) {
      console.warn('[AuthContext] Background profile sync warning:', err);
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    if (user) {
      await fetchProfile(user.id);
    }
  }, [user, fetchProfile]);

  // Handle active session on mount
  useEffect(() => {
    const initializeAuth = async () => {
      let activeUser: User | null = null;

      // 1. Check Supabase session first (real auth)
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          activeUser = session.user;
        }
      } catch (err) {
        console.warn('[AuthContext] Supabase getSession error:', err);
      }

      // 2. Check server-side session via /api/auth/me (covers signed cookie sessions)
      if (!activeUser) {
        try {
          const res = await fetch('/api/auth/me');
          if (res.ok) {
            const data = await res.json();
            if (data.authenticated && data.profile) {
              // Create a minimal user object from the profile
              activeUser = {
                id: data.profile.id,
                email: data.profile.email,
                phone: data.profile.phone,
                user_metadata: {
                  name: data.profile.name,
                  role: data.profile.role,
                },
                app_metadata: {
                  role: data.profile.role,
                },
              } as any;

              // Set profile directly since we already have it
              setUser(activeUser);
              setProfile(data.profile);
              setLoading(false);
              return; // Skip the rest, we have the full profile
            }
          }
        } catch {
          // No server session
        }
      }

      // 3. Dev-only: Check mock session cookie (gated behind build-time flag)
      if (!activeUser && IS_MOCK_AUTH_ENABLED && typeof window !== 'undefined') {
        const match = document.cookie.match(/sb-mock-user-id=([^;]+)/);
        const mockId = match ? match[1] : null;
        if (mockId) {
          // Use /api/auth/me to resolve the mock user server-side
          // (The server's createClient will handle mock resolution)
          try {
            const res = await fetch(`/api/users/${mockId}`);
            if (res.ok) {
              const data = await res.json();
              if (data.profile) {
                activeUser = {
                  id: data.profile.id,
                  email: data.profile.email,
                  phone: data.profile.phone,
                  user_metadata: { name: data.profile.name, role: data.profile.role },
                  app_metadata: { role: data.profile.role },
                } as any;

                setUser(activeUser);
                setProfile(data.profile);
                setLoading(false);
                return;
              }
            }
          } catch {
            // Mock user not found
          }
        }
      }

      if (activeUser) {
        setUser(activeUser);
        setProfile(createFallbackProfile(activeUser));
        setLoading(false);
        fetchProfile(activeUser.id);
      } else {
        setUser(null);
        setProfile(null);
        setLoading(false);
      }
    };

    initializeAuth();

    // Listen for auth changes (Supabase real-time)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        setUser(session.user);
        setProfile(createFallbackProfile(session.user));
        setLoading(false);
        fetchProfile(session.user.id);
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        setProfile(null);
        setLoading(false);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase.auth, fetchProfile]);

  // Sign In with Phone OTP (sends OTP via Firebase/Supabase)
  const signInWithOtp = async (phone: string) => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        phone: formatIndiaPhone(phone),
      });
      return { error };
    } catch (err: any) {
      return { error: err };
    } finally {
      setLoading(false);
    }
  };

  // Verify Phone OTP — server-side verification via firebase-login route
  const verifyOtp = async (phone: string, token: string) => {
    setLoading(true);
    try {
      // Dev-only: Mock OTP bypass for test accounts
      if (IS_MOCK_AUTH_ENABLED) {
        const cleanNum = phone.replace(/\D/g, '').slice(-10);
        if ((cleanNum === '7777777777' || cleanNum === '9999999999' || cleanNum === '8888888888') && token === '123456') {
          // Use the firebase-login route which handles mock auth gating server-side
          const res = await fetch('/api/auth/firebase-login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ phone: formatIndiaPhone(phone) }),
          });

          if (res.ok) {
            const data = await res.json();
            if (data.success && data.profile) {
              const mockUser = {
                id: data.profile.id,
                phone: data.profile.phone,
                email: data.profile.email,
                user_metadata: { name: data.profile.name, role: data.profile.role },
                app_metadata: { role: data.profile.role },
              } as any;

              setUser(mockUser);
              setProfile(data.profile);
              setLoading(false);
              return { error: null };
            }
          }

          return { error: new Error('Mock login failed') };
        }
      }

      // Production: Verify OTP via Supabase
      const { data, error } = await supabase.auth.verifyOtp({
        phone: formatIndiaPhone(phone),
        token,
        type: 'sms',
      });

      if (error) {
        return { error };
      }

      if (data?.user) {
        // Sync with our DB via firebase-login route (creates profile + session)
        try {
          const res = await fetch('/api/auth/firebase-login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              phone: formatIndiaPhone(phone),
              name: data.user.user_metadata?.name,
              email: data.user.email,
            }),
          });

          if (res.ok) {
            const loginData = await res.json();
            if (loginData.profile) {
              setProfile(loginData.profile);
            }
          }
        } catch (syncErr) {
          console.warn('[AuthContext] Profile sync after OTP verify:', syncErr);
        }

        setUser(data.user);
        if (!profile) {
          setProfile(createFallbackProfile(data.user));
        }
        setLoading(false);
        fetchProfile(data.user.id);
      }

      return { error: null };
    } catch (err: any) {
      return { error: err };
    } finally {
      setLoading(false);
    }
  };

  // Verify Email OTP — via Supabase (no mock bypass in production)
  const verifyEmailOtp = async (email: string, token: string) => {
    setLoading(true);
    try {
      // Dev-only: Mock email OTP bypass
      if (IS_MOCK_AUTH_ENABLED && token === '123456') {
        const res = await fetch('/api/auth/firebase-login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phone: '+910000000000', email, name: email.split('@')[0] }),
        });

        if (res.ok) {
          const data = await res.json();
          if (data.success && data.profile) {
            const mockUser = {
              id: data.profile.id,
              email: data.profile.email,
              phone: data.profile.phone,
              user_metadata: { name: data.profile.name, role: data.profile.role },
              app_metadata: { role: data.profile.role },
            } as any;

            setUser(mockUser);
            setProfile(data.profile);
            setLoading(false);
            return { error: null };
          }
        }

        return { error: new Error('Mock email login failed') };
      }

      // Production: Verify via Supabase
      const { data, error } = await supabase.auth.verifyOtp({
        email,
        token,
        type: 'email',
      });

      if (error) return { error };

      if (data?.user) {
        setUser(data.user);
        setProfile(createFallbackProfile(data.user));
        setLoading(false);
        fetchProfile(data.user.id);
      }

      return { error: null };
    } catch (err: any) {
      return { error: err };
    } finally {
      setLoading(false);
    }
  };

  // Sign In with Google
  const signInWithGoogle = async (redirectPath?: string) => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback?redirect=${redirectPath || '/dashboard'}`,
        },
      });
      return { error };
    } catch (err: any) {
      return { error: err };
    } finally {
      setLoading(false);
    }
  };

  // Sign In with Email Magic Link
  const signInWithEmail = async (email: string) => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
      });
      return { error };
    } catch (err: any) {
      return { error: err };
    } finally {
      setLoading(false);
    }
  };

  // Sign Up
  const signUp = async (name: string, phone: string, email: string, city?: string) => {
    setLoading(true);
    try {
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(
          PENDING_SIGNUP_KEY,
          JSON.stringify({ name, phone, email, city })
        );
      }

      const { error } = await supabase.auth.signInWithOtp({
        phone: formatIndiaPhone(phone),
      });

      return { error };
    } catch (err: any) {
      return { error: err };
    } finally {
      setLoading(false);
    }
  };

  // Sign Out — server-side session destruction
  const signOut = async () => {
    setLoading(true);
    try {
      // Sign out from Supabase
      await supabase.auth.signOut();

      // Destroy server-side session
      try {
        await fetch('/api/auth/logout', { method: 'POST' });
      } catch {
        // Best-effort cleanup
      }

      // Clean up client-side storage
      if (typeof window !== 'undefined') {
        localStorage.removeItem(PENDING_SIGNUP_KEY);
        // Clean up any remaining mock cookies (dev cleanup)
        if (IS_MOCK_AUTH_ENABLED) {
          localStorage.removeItem('listme_mock_user_id');
          document.cookie = 'sb-mock-user-id=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT; SameSite=Lax;';
        }
      }

      setUser(null);
      setProfile(null);
    } catch (err) {
      console.error('[AuthContext] SignOut error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,
        signInWithOtp,
        verifyOtp,
        verifyEmailOtp,
        signInWithGoogle,
        signInWithEmail,
        signUp,
        signOut,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
