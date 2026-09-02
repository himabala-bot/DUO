'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { duoApi } from '@/lib/api';
import { supabase } from '@/lib/supabase';
import {
  RefreshCw,
  Mail,
  Lock,
  User as UserIcon,
  CheckCircle2,
  ArrowRight,
  Heart,
} from 'lucide-react';

function JoinPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { loginWithGoogle, loginWithEmail, registerWithEmail, supabaseUser, refreshProfile, isLoading: authLoading } = useAuth();
  const { toast } = useToast();

  const token = searchParams.get('token') || searchParams.get('pair') || '';
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isPairedDone, setIsPairedDone] = useState(false);

  // Store token in localStorage
  useEffect(() => {
    if (token) {
      localStorage.setItem('pending_pair_token', token);
    }
  }, [token]);

  // If user is already signed in when scanning, complete pairing immediately
  useEffect(() => {
    if (!token || !supabaseUser || isPairedDone) return;

    let isMounted = true;
    const autoClaim = async () => {
      try {
        // Broadcast claim event to creator's active session
        const channel = supabase.channel(`pairing:${token}`);
        await channel.send({
          type: 'broadcast',
          event: 'claimed',
          payload: { user_id: supabaseUser.id },
        });

        try {
          await duoApi.claimPairingSession({ token });
        } catch {}

        if (isMounted) {
          setIsPairedDone(true);
          toast.love('Partner paired successfully! Entering room...', 'Connected');
          await refreshProfile();
          localStorage.removeItem('pending_pair_token');
          setTimeout(() => {
            router.push('/');
          }, 800);
        }
      } catch {
        if (isMounted) {
          router.push('/');
        }
      }
    };

    autoClaim();
    return () => {
      isMounted = false;
    };
  }, [token, supabaseUser, isPairedDone, refreshProfile, router, toast]);

  const handleGoogleAuth = async () => {
    setAuthError(null);
    try {
      if (token) localStorage.setItem('pending_pair_token', token);
      await loginWithGoogle();
    } catch (err: any) {
      setAuthError(err.message || 'Failed to initialize Google login.');
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setIsSubmitting(true);

    try {
      if (token) localStorage.setItem('pending_pair_token', token);

      if (isLogin) {
        await loginWithEmail(email.trim(), password);
      } else {
        if (!name.trim()) throw new Error('Please enter your name.');
        await registerWithEmail(email.trim(), password, name.trim());
      }

      // Broadcast claim event
      if (token) {
        const channel = supabase.channel(`pairing:${token}`);
        await channel.send({
          type: 'broadcast',
          event: 'claimed',
          payload: { email },
        });
      }

      try {
        if (token) await duoApi.claimPairingSession({ token });
      } catch {}

      setIsPairedDone(true);
      toast.love('Partner paired successfully!', 'Connected');
      await refreshProfile();
      localStorage.removeItem('pending_pair_token');
      setTimeout(() => {
        router.push('/');
      }, 800);
    } catch (err: any) {
      setAuthError(err.message || 'Authentication failed. Please check credentials.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (authLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-theme-page text-theme-primary">
        <div className="text-center space-y-3">
          <RefreshCw className="h-8 w-8 text-[#125CB9] animate-spin mx-auto" />
          <p className="text-xs font-mono text-theme-muted">Connecting with your partner...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-theme-page text-theme-primary flex items-center justify-center p-4">
      <div className="relative w-full max-w-[440px] overflow-hidden rounded-[32px] border border-theme bg-theme-card p-6 sm:p-8 shadow-2xl text-center select-none animate-in zoom-in-95 duration-200">
        {isPairedDone ? (
          <div className="py-10 space-y-4 animate-in zoom-in-95 duration-300">
            <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-[#00D26A]/10 text-[#00D26A] mx-auto ring-8 ring-[#00D26A]/10 shadow-lg">
              <CheckCircle2 className="h-9 w-9" />
            </div>
            <div>
              <h3 className="font-serif text-2xl font-bold text-theme-primary">
                Partner paired successfully!
              </h3>
              <p className="text-xs text-theme-secondary mt-1">
                Entering your shared Duo space...
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-5">
            {/* Header Badge & Title */}
            <div>
              <div className="inline-flex items-center space-x-1.5 rounded-full px-3 py-1 text-[11px] font-mono font-medium text-[#125CB9] bg-[#125CB9]/10 border border-[#125CB9]/25 mb-3">
                <Heart className="h-3 w-3 fill-current" />
                <span>QR Scanned &bull; Pairing Device</span>
              </div>
              <h2 className="font-serif text-2xl font-bold text-theme-primary">
                Join Shared Space
              </h2>
              <p className="text-xs text-theme-secondary mt-1">
                Log in with Google or Email to complete pairing and enter your shared Duo room.
              </p>
            </div>

            {/* Google Sign In Button */}
            <button
              type="button"
              onClick={handleGoogleAuth}
              className="w-full flex items-center justify-center space-x-2.5 rounded-full border border-theme bg-theme-input py-2.5 px-4 text-xs font-semibold text-theme-primary hover:bg-theme-page transition-all shadow-xs active:scale-98"
            >
              <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>Continue with Google</span>
            </button>

            <div className="flex items-center space-x-2 text-[11px] font-mono text-theme-muted">
              <div className="flex-1 border-t border-theme-subtle" />
              <span>or email</span>
              <div className="flex-1 border-t border-theme-subtle" />
            </div>

            {authError && (
              <div className="rounded-xl border border-[#F43F5E]/20 bg-[#F43F5E]/10 p-2.5 text-xs text-[#F43F5E] text-left">
                {authError}
              </div>
            )}

            {/* Email Form */}
            <form onSubmit={handleEmailAuth} className="space-y-3 text-left">
              {!isLogin && (
                <div>
                  <label className="text-[11px] font-medium text-theme-secondary block mb-1">Your Name</label>
                  <div className="relative">
                    <UserIcon className="absolute left-3 top-2.5 h-4 w-4 text-theme-muted" />
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Alex"
                      className="w-full rounded-xl border border-theme bg-theme-input py-2 pl-9 pr-3 text-xs text-theme-primary placeholder:text-theme-muted focus:outline-hidden focus:ring-1 focus:ring-[#125CB9]"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="text-[11px] font-medium text-theme-secondary block mb-1">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-2.5 h-4 w-4 text-theme-muted" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full rounded-xl border border-theme bg-theme-input py-2 pl-9 pr-3 text-xs text-theme-primary placeholder:text-theme-muted focus:outline-hidden focus:ring-1 focus:ring-[#125CB9]"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-medium text-theme-secondary block mb-1">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-2.5 h-4 w-4 text-theme-muted" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full rounded-xl border border-theme bg-theme-input py-2 pl-9 pr-3 text-xs text-theme-primary placeholder:text-theme-muted focus:outline-hidden focus:ring-1 focus:ring-[#125CB9]"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full flex items-center justify-center space-x-2 rounded-full bg-[#125CB9] py-2.5 text-xs font-semibold text-white hover:bg-[#0E4B99] disabled:opacity-50 transition-all shadow-md active:scale-98"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    <span>Signing in & pairing...</span>
                  </>
                ) : (
                  <>
                    <span>{isLogin ? 'Sign In & Enter Room' : 'Register & Enter Room'}</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </>
                )}
              </button>
            </form>

            <div className="text-center pt-1">
              <button
                type="button"
                onClick={() => {
                  setIsLogin(!isLogin);
                  setAuthError(null);
                }}
                className="text-xs text-theme-secondary hover:text-theme-primary transition-colors"
              >
                {isLogin ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function JoinPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-screen items-center justify-center bg-theme-page text-theme-primary">
          <RefreshCw className="h-7 w-7 text-[#125CB9] animate-spin" />
        </div>
      }
    >
      <JoinPageContent />
    </Suspense>
  );
}
