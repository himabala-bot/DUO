'use client';

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { authApi, isDemoSession, getDemoRole } from '@/lib/api';
import { getDemoUser } from '@/lib/demoStore';
import { UserProfile, PartnerProfile } from '@/types';

interface AuthContextType {
  supabaseUser: User | null;
  session: Session | null;
  profile: UserProfile | null;
  partner: PartnerProfile | null;
  hasActiveDuo: boolean;
  isLoading: boolean;
  isConfigured: boolean;
  loginWithEmail: (email: string, pass: string) => Promise<void>;
  registerWithEmail: (email: string, pass: string, name: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [supabaseUser, setSupabaseUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);

  // Instant local cache hydration for zero-delay page refresh
  const [profile, setProfile] = useState<UserProfile | null>(() => {
    if (typeof window !== 'undefined') {
      if (isDemoSession()) {
        return getDemoUser(getDemoRole());
      }
      try {
        const cached = localStorage.getItem('duo_cached_profile');
        if (cached) return JSON.parse(cached);
      } catch {}
    }
    return null;
  });

  const [partner, setPartner] = useState<PartnerProfile | null>(() => {
    if (typeof window !== 'undefined') {
      if (isDemoSession()) {
        return getDemoUser(getDemoRole()).partner || null;
      }
      try {
        const cached = localStorage.getItem('duo_cached_profile');
        if (cached) {
          const parsed = JSON.parse(cached);
          return parsed.partner || null;
        }
      } catch {}
    }
    return null;
  });

  // If cached profile or demo exists, start with isLoading = false for instant snappy screen rendering
  const [isLoading, setIsLoading] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      if (isDemoSession()) return false;
      const cached = localStorage.getItem('duo_cached_profile');
      if (cached) return false;
    }
    return true;
  });

  const isConfigured = isSupabaseConfigured();
  const syncingRef = useRef(false);

  const syncDjangoProfile = useCallback(async () => {
    if (syncingRef.current) return;
    syncingRef.current = true;
    try {
      const syncRes = await authApi.sync();
      if (syncRes.success && syncRes.profile) {
        setProfile(syncRes.profile);
        setPartner(syncRes.profile.partner || null);
        if (typeof window !== 'undefined') {
          localStorage.setItem('duo_cached_profile', JSON.stringify(syncRes.profile));
        }
      }
    } catch (err) {
      console.warn('Django profile sync error:', err);
    } finally {
      syncingRef.current = false;
      setIsLoading(false);
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    try {
      const profileData = await authApi.getProfile();
      setProfile(profileData);
      setPartner(profileData.partner || null);
      if (typeof window !== 'undefined') {
        localStorage.setItem('duo_cached_profile', JSON.stringify(profileData));
      }
    } catch (err) {
      console.warn('Failed to refresh profile:', err);
    }
  }, []);

  useEffect(() => {
    if (!isConfigured) {
      setIsLoading(false);
      return;
    }

    // 1. Get initial session fast
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setSupabaseUser(session?.user ?? null);
      if (session) {
        syncDjangoProfile();
      } else if (isDemoSession()) {
        const demoUser = getDemoUser(getDemoRole());
        setProfile(demoUser);
        setPartner(demoUser.partner);
        setIsLoading(false);
      } else {
        if (typeof window !== 'undefined') {
          localStorage.removeItem('duo_cached_profile');
        }
        setProfile(null);
        setPartner(null);
        setIsLoading(false);
      }
    });

    // 2. Listen to auth state changes (avoid duplicate initial sync)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      if (event === 'INITIAL_SESSION') return;

      setSession(newSession);
      setSupabaseUser(newSession?.user ?? null);

      if (newSession) {
        await syncDjangoProfile();
      } else if (isDemoSession()) {
        const demoUser = getDemoUser(getDemoRole());
        setProfile(demoUser);
        setPartner(demoUser.partner);
        setIsLoading(false);
      } else if (!newSession) {
        if (typeof window !== 'undefined') {
          localStorage.removeItem('duo_cached_profile');
        }
        setProfile(null);
        setPartner(null);
        setIsLoading(false);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [isConfigured, syncDjangoProfile]);

  const loginWithEmail = async (email: string, pass: string) => {
    setIsLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password: pass,
    });
    if (error) {
      setIsLoading(false);
      throw error;
    }
    await syncDjangoProfile();
  };

  const registerWithEmail = async (email: string, pass: string, name: string) => {
    setIsLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email,
      password: pass,
      options: {
        data: {
          name: name.trim(),
          full_name: name.trim(),
        },
      },
    });
    if (error) {
      setIsLoading(false);
      throw error;
    }
    if (data.session) {
      await syncDjangoProfile();
    } else {
      setIsLoading(false);
    }
  };

  const loginWithGoogle = async () => {
    const origin = typeof window !== 'undefined' && window.location.origin
      ? window.location.origin
      : (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000');
    const redirectTo = `${origin}/auth/callback`;

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo,
      },
    });

    if (error) {
      throw error;
    }
  };

  const logout = async () => {
    setIsLoading(true);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('duo_cached_profile');
      localStorage.removeItem('duo_active_tab');
    }
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.warn('Supabase sign out error:', err);
    } finally {
      setSession(null);
      setSupabaseUser(null);
      setProfile(null);
      setPartner(null);
      setIsLoading(false);
    }
  };

  const hasActiveDuo = Boolean(isDemoSession() || (profile?.has_active_duo && profile?.active_duo_id));

  return (
    <AuthContext.Provider
      value={{
        supabaseUser,
        session,
        profile,
        partner,
        hasActiveDuo,
        isLoading,
        isConfigured,
        loginWithEmail,
        registerWithEmail,
        loginWithGoogle,
        logout,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
