'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { authApi, duoApi } from '@/lib/api';
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
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [partner, setPartner] = useState<PartnerProfile | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const isConfigured = isSupabaseConfigured();

  const syncDjangoProfile = useCallback(async () => {
    try {
      const syncRes = await authApi.sync();
      if (syncRes.success && syncRes.profile) {
        setProfile(syncRes.profile);
        setPartner(syncRes.profile.partner);
      }
    } catch (err) {
      console.warn('Django profile sync error:', err);
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    try {
      const profileData = await authApi.getProfile();
      setProfile(profileData);
      setPartner(profileData.partner);
    } catch (err) {
      console.warn('Failed to refresh profile:', err);
    }
  }, []);

  // Apply Theme
  useEffect(() => {
    const activeTheme = profile?.theme || 'system';
    if (activeTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else if (activeTheme === 'light') {
      document.documentElement.classList.remove('dark');
    } else {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      if (prefersDark) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    }
  }, [profile?.theme]);

  useEffect(() => {
    if (!isConfigured) {
      setIsLoading(false);
      return;
    }

    // 1. Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setSupabaseUser(session?.user ?? null);
      if (session) {
        syncDjangoProfile().finally(() => setIsLoading(false));
      } else {
        setIsLoading(false);
      }
    });

    // 2. Listen to auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      setSession(newSession);
      setSupabaseUser(newSession?.user ?? null);
      if (newSession) {
        await syncDjangoProfile();
      } else {
        setProfile(null);
        setPartner(null);
      }
      setIsLoading(false);
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
    setIsLoading(false);
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
    }
    setIsLoading(false);
  };

  const loginWithGoogle = async () => {
    const origin = typeof window !== 'undefined' && window.location.origin
      ? window.location.origin
      : (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000');
    const redirectTo = `${origin}/auth/callback`;

    const { data, error } = await supabase.auth.signInWithOAuth({
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
    await supabase.auth.signOut();
    setProfile(null);
    setPartner(null);
    setSupabaseUser(null);
    setSession(null);
    setIsLoading(false);
  };

  return (
    <AuthContext.Provider
      value={{
        supabaseUser,
        session,
        profile,
        partner,
        hasActiveDuo: profile?.has_active_duo ?? false,
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

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
