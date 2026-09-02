'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { duoApi } from '@/lib/api';
import { PairingSession } from '@/types';
import { supabase } from '@/lib/supabase';
import { Avatar } from './Avatar';
import {
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  X,
} from 'lucide-react';

interface JoinDuoPromptProps {
  token: string;
  onJoined: () => void;
  onDismiss: () => void;
}

export const JoinDuoPrompt: React.FC<JoinDuoPromptProps> = ({
  token,
  onJoined,
  onDismiss,
}) => {
  const { profile, refreshProfile } = useAuth();
  const { toast } = useToast();
  const [session, setSession] = useState<PairingSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isExpired, setIsExpired] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    const loadSession = async () => {
      setIsLoading(true);
      setErrorMsg(null);
      setIsExpired(false);
      try {
        const res = await duoApi.getPairingSession({ token });
        if (isMounted) {
          if (res.success && res.session) {
            setSession(res.session);
            if (!res.is_valid) {
              setIsExpired(true);
            }
          }
        }
      } catch (err: any) {
        if (isMounted) {
          setIsExpired(true);
          setErrorMsg(err.message || 'This QR code has expired or was already used.');
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    if (token) {
      loadSession();
    }
    return () => {
      isMounted = false;
    };
  }, [token]);

  const handleJoin = async () => {
    if (!token) return;
    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const res = await duoApi.claimPairingSession({ token });
      if (res.success) {
        // Broadcast instant notification to creator's desktop channel
        const channel = supabase.channel(`pairing:${token}`);
        await channel.send({
          type: 'broadcast',
          event: 'claimed',
          payload: { partner_name: profile?.name || 'Partner' },
        });

        toast.love(`Connected with ${session?.creator.name || 'partner'}!`, 'Connected');
        await refreshProfile();
        onJoined();
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to join Duo.');
      toast.error(err.message || 'Failed to join Duo.', 'Error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="relative w-full max-w-[440px] overflow-hidden rounded-3xl border border-theme bg-theme-card p-6 sm:p-8 shadow-xl text-center select-none animate-in zoom-in-95 duration-150">
        <button
          onClick={onDismiss}
          className="absolute top-4 right-4 rounded-full p-2 text-theme-muted hover:text-theme-primary hover:bg-theme-input transition-colors"
          title="Dismiss"
        >
          <X className="h-4 w-4" />
        </button>

        {isLoading ? (
          <div className="py-12 flex flex-col items-center justify-center space-y-3">
            <RefreshCw className="h-6 w-6 text-[#125CB9] animate-spin" />
            <p className="text-xs font-mono text-theme-muted">Verifying invite...</p>
          </div>
        ) : isExpired ? (
          <div className="py-6 space-y-4 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-neutral-500/10 text-neutral-400 mx-auto">
              <AlertCircle className="h-7 w-7" />
            </div>
            <div>
              <h3 className="font-serif text-xl font-bold text-theme-primary">
                This QR code has expired.
              </h3>
              <p className="text-xs text-theme-secondary mt-1">
                Please ask your partner to generate a new QR code.
              </p>
            </div>
            <div className="pt-2 flex justify-center">
              <button
                onClick={onDismiss}
                className="rounded-full bg-[#125CB9] px-6 py-2.5 text-xs font-semibold text-white hover:bg-[#0E4B99] transition-colors shadow-xs"
              >
                Back to Home
              </button>
            </div>
          </div>
        ) : session ? (
          <div className="space-y-5">
            {/* Header */}
            <div className="space-y-1">
              <h2 className="font-serif text-2xl font-bold text-theme-primary">
                Join this Duo?
              </h2>
              <p className="text-xs sm:text-sm text-theme-secondary">
                You've been invited to connect to this Duo.
              </p>
            </div>

            {/* Creator Profile Display */}
            <div className="rounded-2xl border border-theme bg-theme-input/60 p-4 flex items-center space-x-3.5 text-left">
              <Avatar
                src={session.creator.avatar_url}
                name={session.creator.name}
                size="md"
              />
              <div className="min-w-0 flex-1">
                <span className="text-[10px] font-mono text-theme-muted uppercase tracking-wider block">
                  Invited by
                </span>
                <h4 className="font-serif text-sm font-semibold text-theme-primary truncate">
                  {session.creator.name}
                </h4>
                <p className="text-[11px] font-mono text-theme-muted truncate">
                  {session.creator.email}
                </p>
              </div>
            </div>

            {errorMsg && (
              <div className="rounded-xl border border-[#F43F5E]/30 bg-[#F43F5E]/10 p-3 text-xs text-[#F43F5E]">
                {errorMsg}
              </div>
            )}

            {/* Actions */}
            <div className="pt-2 flex flex-col sm:flex-row gap-2.5">
              <button
                type="button"
                onClick={handleJoin}
                disabled={isSubmitting}
                className="flex-1 flex items-center justify-center space-x-2 rounded-full bg-[#125CB9] px-5 py-3 text-xs sm:text-sm font-semibold text-white hover:bg-[#0E4B99] disabled:opacity-40 transition-colors shadow-xs"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    <span>Connecting...</span>
                  </>
                ) : (
                  <span>Join Duo</span>
                )}
              </button>
              <button
                type="button"
                onClick={onDismiss}
                disabled={isSubmitting}
                className="rounded-full border border-theme bg-theme-input px-5 py-3 text-xs sm:text-sm font-medium text-theme-secondary hover:text-theme-primary transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
};
