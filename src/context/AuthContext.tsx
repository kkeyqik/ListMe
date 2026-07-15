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
  signUp: (name: string, phone: string, email: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  loginMockUser: (userId: string, profileData: DbProfile) => void;
}

interface PendingSignup {
  name: string;
  phone: string;
  email: string;
}

const PENDING_SIGNUP_KEY = 'listme_pending_signup';
const formatIndiaPhone = (phone: string) => (phone.startsWith('+') ? phone : `+91${phone}`);

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<DbProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  const fetchProfile = useCallback(async (userId: string) => {
    console.log('[AuthContext] fetchProfile triggered for:', userId);
    try {
      const response = await fetch(`/api/users/${userId}`);
      console.log('[AuthContext] fetchProfile API response status:', response.status);
      if (response.ok) {
        const data = await response.json();
        console.log('[AuthContext] fetchProfile successfully loaded profile role:', data.profile?.role);
        setProfile(data.profile);
      } else {
        console.warn('[AuthContext] fetchProfile failed, status not ok:', response.status);
        setProfile(null);
      }
    } catch (err) {
      console.error('[AuthContext] Error fetching user profile:', err);
      setProfile(null);
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
      console.log('[AuthContext] Initializing auth...');
      let activeUser: User | null = null;

      try {
        // First try standard Supabase session
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          activeUser = session.user;
          console.log('[AuthContext] Found active Supabase session user:', activeUser.id);
        }
      } catch (err) {
        console.warn('[AuthContext] Supabase getSession error:', err);
      }

      // Fallback: Check if mock session cookie is set
      if (!activeUser && typeof window !== 'undefined') {
        const isPlaceholder = 
          process.env.NEXT_PUBLIC_SUPABASE_URL?.includes('placeholder') ||
          process.env.NEXT_PUBLIC_SUPABASE_URL === undefined ||
          process.env.NEXT_PUBLIC_SUPABASE_URL === '';

        console.log('[AuthContext] Mock mode check:', { isPlaceholder, hostname: window.location.hostname });
        if (isPlaceholder) {
          const match = document.cookie.match(/sb-mock-user-id=([^;]+)/);
          let mockId = match ? match[1] : null;
          console.log('[AuthContext] Match from cookie sb-mock-user-id:', mockId);
          if (!mockId) {
            mockId = localStorage.getItem('listme_mock_user_id');
            console.log('[AuthContext] Fallback match from localStorage listme_mock_user_id:', mockId);
            if (mockId) {
              // Ensure cookie is in sync
              document.cookie = `sb-mock-user-id=${mockId}; path=/; max-age=31536000;`;
            }
          }
          if (mockId) {
            activeUser = {
              id: mockId,
              email: mockId === 'a1a2a3a4-b5b6-c7c8-d9e0-f1f2f3f4f5f6' ? 'admin@test.com' : 'user@test.com',
            } as any;
          }
        } else {
          // Clean up mock credentials if they exist
          if (localStorage.getItem('listme_mock_user_id') || document.cookie.includes('sb-mock-user-id')) {
            console.log('[AuthContext] Cleaning up legacy mock credentials...');
            localStorage.removeItem('listme_mock_user_id');
            document.cookie = 'sb-mock-user-id=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;';
          }
        }
      }

      console.log('[AuthContext] Resolved activeUser:', activeUser?.id || 'null');
      if (activeUser) {
        setUser(activeUser);
        await fetchProfile(activeUser.id);
      }
      setLoading(false);
      console.log('[AuthContext] Auth initialization complete.');
    };

    initializeAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session) {
        setUser(session.user);
        await fetchProfile(session.user.id);
        setLoading(false);
      } else {
        // Only clear if not in mock mode
        const isPlaceholder = process.env.NEXT_PUBLIC_SUPABASE_URL?.includes('placeholder');
        const hasMockSession = typeof window !== 'undefined' && !!localStorage.getItem('listme_mock_user_id');
        
        if (!isPlaceholder || !hasMockSession) {
          setUser(null);
          setProfile(null);
          setLoading(false);
        }
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase.auth, fetchProfile]);

  // Sign In with Phone OTP
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

  // Verify Phone OTP
  const verifyOtp = async (phone: string, token: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.verifyOtp({
        phone: formatIndiaPhone(phone),
        token,
        type: 'sms',
      });

      if (error) {
        return { error };
      }
      
      if (data?.user) {
        const pendingSignupRaw = window.localStorage.getItem(PENDING_SIGNUP_KEY);
        const pendingSignup = pendingSignupRaw
          ? (JSON.parse(pendingSignupRaw) as PendingSignup)
          : null;

        if (pendingSignup && formatIndiaPhone(pendingSignup.phone) === formatIndiaPhone(phone)) {
          const profileResponse = await fetch('/api/users/profile', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(pendingSignup),
          });

          if (!profileResponse.ok) {
            const errorData = await profileResponse.json();
            throw new Error(errorData.message || 'Failed to create user profile');
          }

          window.localStorage.removeItem(PENDING_SIGNUP_KEY);
        }

        setUser(data.user);
        await fetchProfile(data.user.id);
      }
      
      return { error: null };
    } catch (err: any) {
      return { error: err };
    } finally {
      setLoading(false);
    }
  };

  // Verify Email OTP
  const verifyEmailOtp = async (email: string, token: string) => {
    setLoading(true);
    try {
      const isPlaceholder = 
        process.env.NEXT_PUBLIC_SUPABASE_URL?.includes('placeholder') ||
        process.env.NEXT_PUBLIC_SUPABASE_URL === undefined ||
        process.env.NEXT_PUBLIC_SUPABASE_URL === '';

      if (isPlaceholder) {
        if (token === '123456') {
          // Resolve deterministic user ID
          const mockId = 'd9e87fb4-9c02-4217-ba5d-' + email.split('@')[0].padEnd(12, '0').slice(-12);
          const mockProfile: DbProfile = {
            id: mockId,
            name: email.split('@')[0],
            email,
            phone: null,
            phoneVerified: false,
            avatarUrl: null,
            address: null,
            role: 'USER',
            status: 'ACTIVE',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          loginMockUser(mockId, mockProfile);
          return { error: null };
        } else {
          return { error: new Error('Incorrect simulated OTP. Use 123456.') };
        }
      }

      const { data, error } = await supabase.auth.verifyOtp({
        email,
        token,
        type: 'email',
      });

      if (error) {
        return { error };
      }

      if (data?.user) {
        setUser(data.user);
        await fetchProfile(data.user.id);
      }
      return { error: null };
    } catch (err: any) {
      return { error: err };
    } finally {
      setLoading(false);
    }
  };

  // Sign Up (Pre-registers user in database profile as well)
  const signUp = async (name: string, phone: string, email: string) => {
    setLoading(true);
    try {
      // Step 1: Pre-register / check in API
      const regResponse = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, phone, email }),
      });

      if (!regResponse.ok) {
        const errorData = await regResponse.json();
        throw new Error(errorData.message || 'Registration failed');
      }

      window.localStorage.setItem(
        PENDING_SIGNUP_KEY,
        JSON.stringify({ name, phone, email } satisfies PendingSignup)
      );

      // Step 2: Request OTP from Supabase to complete auth
      const { error } = await supabase.auth.signInWithOtp({
        phone: formatIndiaPhone(phone),
      });

      if (error) {
        window.localStorage.removeItem(PENDING_SIGNUP_KEY);
      }

      return { error };
    } catch (err: any) {
      return { error: err.message || err };
    } finally {
      setLoading(false);
    }
  };

  // Sign In with Google OAuth
  const signInWithGoogle = async (redirectPath?: string) => {
    try {
      const redirectTo = `${window.location.origin}${redirectPath || '/dashboard'}`;
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo },
      });
      return { error };
    } catch (err: any) {
      return { error: err };
    }
  };

  // Sign In with Email Magic Link
  const signInWithEmail = async (email: string) => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/dashboard`,
        },
      });
      return { error };
    } catch (err: any) {
      return { error: err };
    } finally {
      setLoading(false);
    }
  };

  // Sign Out
  const signOut = async () => {
    setLoading(true);
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.warn('Supabase signOut error:', err);
    }
    
    // Clear mock session cookie and local storage
    if (typeof window !== 'undefined') {
      localStorage.removeItem('listme_mock_user_id');
      document.cookie = 'sb-mock-user-id=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;';
    }

    setUser(null);
    setProfile(null);
    setLoading(false);
    window.location.href = '/';
  };

  const loginMockUser = useCallback((userId: string, profileData: DbProfile) => {
    setLoading(true);
    setUser({
      id: userId,
      email: profileData.email || 'user@test.com',
      phone: profileData.phone || '',
    } as any);
    setProfile(profileData);
    if (typeof window !== 'undefined') {
      localStorage.setItem('listme_mock_user_id', userId);
      document.cookie = `sb-mock-user-id=${userId}; path=/; max-age=31536000;`;
    }
    // Defer setting loading to false to allow route transition to mount target layout
    setTimeout(() => {
      setLoading(false);
    }, 150);
  }, []);

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
        loginMockUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
