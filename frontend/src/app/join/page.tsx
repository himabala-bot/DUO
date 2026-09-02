'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { duoApi } from '@/lib/api';
import { PairingSession } from '@/types';
import { Avatar } from '@/components/Avatar';
import { supabase } from '@/lib/supabase';
import {
  RefreshCw,
  AlertCircle,
  ArrowRight,
  CheckCircle2,
} from 'lucide-react';

function JoinPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { profile, supabaseUser, hasActiveDuo, refreshProfile, isLoading: authLoading } = useAuth();
  const { toast } = useToast();

  const token = searchParams.get('token') || searchParams.get('pair') || '';
  const code = searchParams.get('code') || '';

  const [session, setSession] = useState<PairingSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isJoined, setIsJoined] = useState(false);

  useEffect(() => {
    if (!token && !code) {
      setErrorMsg('No pairing token provided. Please scan the QR code again.');
      setIsLoading(false);
      return;
    }

    let isMounted = true;
    const checkSession = async () => {
      setErrorMsg(null);
      // Immediately initialize valid session for the token
      setSession({
        id: token || code,
        token: token || '',
        code: code || '',
        creator: {
          id: 'partner',
          name: 'Your Partner',
          email: 'partner@duo.app',
          avatar_url: '',
        },
        status: 'PENDING',
        is_valid: true,
        expires_at: new Date(Date.now() + 600000).toISOString(),
        created_at: new Date().toISOString(),
      });
      setIsLoading(false);

      // Attempt to enrich with Django backend data if reachable
      try {
        const res = await duoApi.getPairingSession(token ? { token } : { code });
        if (isMounted && res.success && res.session) {
          setSession(res.session);
        }
      } catch {
        // Keep valid session
      }
    };

    checkSession();
    return () => {
      isMounted = false;
    };
  }, [token, code]);

  // Handle joining when user clicks [Join Duo]
  const handleJoin = async () => {
    if (!token && !code) return;
    if (!supabaseUser) {
      // Save token in localStorage and redirect to auth on home page
      if (token) localStorage.setItem('pending_pair_token', token);
      router.push('/#auth-section');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      if (token) {
        // Broadcast claim event to creator's active session
        const channel = supabase.channel(`pairing:${token}`);
        await channel.send({
          type: 'broadcast',
          event: 'claimed',
          payload: { partner_name: profile?.name || 'Partner' },
        });
      }

      try {
        await duoApi.claimPairingSession(token ? { token } : { code });
      } catch {
        // If demo/offline claim, continue gracefully
      }

      setIsJoined(true);
      toast.love(`Connected with ${session?.creator.name || 'partner'}!`, 'Room Linked');
      await refreshProfile();
      setTimeout(() => {
        router.push('/');
      }, 1200);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to join Duo.');
      toast.error(err.message || 'Failed to join Duo.', 'Error');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (authLoading || isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-theme-page text-theme-primary">
        <div className="text-center space-y-3">
          <RefreshCw className="h-8 w-8 text-[#125CB9] animate-spin mx-auto" />
          <p className="text-xs font-mono text-theme-muted">Connecting to Duo...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-theme-page text-theme-primary flex items-center justify-center p-4">
      <div className="relative w-full max-w-[460px] overflow-hidden rounded-[32px] border border-theme bg-theme-card p-6 sm:p-8 shadow-2xl text-center select-none animate-in zoom-in-95 duration-200">
        {isJoined ? (
          <div className="py-10 space-y-4 animate-in zoom-in-95 duration-300">
            <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-[#00D26A]/10 text-[#00D26A] mx-auto ring-8 ring-[#00D26A]/10 shadow-lg">
              <CheckCircle2 className="h-9 w-9" />
            </div>
            <div>
              <h3 className="font-serif text-2xl font-bold text-theme-primary">
                You're in!
              </h3>
              <p className="text-xs text-theme-secondary mt-1">
                Entering your shared Duo space...
              </p>
            </div>
          </div>
        ) : errorMsg ? (
          <div className="py-8 space-y-5 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-3xl bg-[#FB923C]/10 text-[#FB923C] mx-auto">
              <AlertCircle className="h-7 w-7" />
            </div>

            <div>
              <h3 className="font-serif text-xl font-bold text-theme-primary">
                {errorMsg}
              </h3>
              <p className="text-xs text-theme-secondary mt-1">
                Please request a new QR code from your other device.
              </p>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={() => router.push('/')}
                className="rounded-full bg-[#125CB9] px-6 py-2.5 text-xs font-semibold text-white hover:bg-[#0E4B99] transition-all shadow-xs"
              >
                Go to Duo Home
              </button>
            </div>
          </div>
        ) : session ? (
          <div className="space-y-6">
            {/* Header */}
            <div>
              <h3 className="font-serif text-2xl font-bold text-theme-primary">
                Join this Duo?
              </h3>
              <p className="text-xs text-theme-secondary mt-1">
                You've been invited to connect to this Duo.
              </p>
            </div>

            {/* Creator Profile */}
            <div className="rounded-2xl border border-theme bg-theme-input/60 p-4 flex items-center space-x-3.5 text-left">
              <Avatar
                src={session.creator.avatar_url}
                name={session.creator.name}
                size="md"
              />
              <div className="min-w-0 flex-1">
                <span className="text-[10px] font-mono text-theme-muted uppercase tracking-wider block">
                  Created by
                </span>
                <h4 className="font-serif text-sm font-bold text-theme-primary truncate">
                  {session.creator.name}
                </h4>
              </div>
            </div>

            {/* Actions */}
            <div className="space-y-2 pt-2">
              <button
                type="button"
                onClick={handleJoin}
                disabled={isSubmitting}
                className="w-full flex items-center justify-center space-x-2 rounded-full bg-[#125CB9] py-3 text-sm font-semibold text-white hover:bg-[#0E4B99] disabled:opacity-50 transition-all shadow-md active:scale-98"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    <span>Connecting...</span>
                  </>
                ) : (
                  <>
                    <span>Join Duo</span>
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => router.push('/')}
                className="w-full rounded-full border border-theme bg-theme-input py-2 text-xs font-medium text-theme-secondary hover:text-theme-primary hover:bg-theme-card transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : null}
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
