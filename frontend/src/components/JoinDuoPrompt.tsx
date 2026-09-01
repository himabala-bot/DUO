'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { duoApi } from '@/lib/api';
import { PairingSession } from '@/types';
import { supabase } from '@/lib/supabase';
import { Avatar } from './Avatar';
import {
  Heart,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  ArrowRight,
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
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    const loadSession = async () => {
      setIsLoading(true);
      setErrorMsg(null);
      try {
        const res = await duoApi.getPairingSession({ token });
        if (isMounted) {
          if (res.success && res.session) {
            setSession(res.session);
            if (!res.is_valid) {
              setErrorMsg('This pairing session has expired or was already claimed.');
            }
          }
        }
      } catch (err: any) {
        if (isMounted) {
          setErrorMsg(err.message || 'Could not find pairing session. It may have expired.');
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

        toast.love(`Connected with ${session?.creator.name || 'partner'}!`, 'Room Linked');
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-md overflow-hidden rounded-[32px] border border-theme bg-theme-card p-6 sm:p-8 shadow-2xl text-center select-none animate-in zoom-in-95 duration-200">
        <button
          onClick={onDismiss}
          className="absolute top-5 right-5 rounded-full p-1.5 text-theme-muted hover:text-theme-primary hover:bg-theme-input transition-colors"
          title="Dismiss"
        >
          <X className="h-4 w-4" />
        </button>

        {isLoading ? (
          <div className="py-12 flex flex-col items-center justify-center space-y-3">
            <RefreshCw className="h-7 w-7 text-[#125CB9] animate-spin" />
            <p className="text-xs font-mono text-theme-muted">Finding Duo room...</p>
          </div>
        ) : errorMsg ? (
          <div className="py-6 space-y-4 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-3xl bg-[#F43F5E]/10 text-[#F43F5E] mx-auto">
              <AlertCircle className="h-7 w-7" />
            </div>
            <div>
              <h3 className="font-serif text-xl font-bold text-theme-primary">
                Unable to Join Duo
              </h3>
              <p className="text-xs text-theme-secondary mt-1.5 leading-relaxed">
                {errorMsg}
              </p>
            </div>
            <button
              onClick={onDismiss}
              className="mt-2 rounded-full border border-theme bg-theme-input px-6 py-2 text-xs font-medium text-theme-primary hover:bg-theme-card transition-colors"
            >
              Back to Home
            </button>
          </div>
        ) : session ? (
          <div className="space-y-6">
            {/* Header / Brand */}
            <div className="space-y-1">
              <div className="flex items-center justify-center space-x-1.5 text-xs font-mono text-[#125CB9] font-semibold">
                <Sparkles className="h-3.5 w-3.5" />
                <span>Device Pairing Invite</span>
              </div>
              <h3 className="font-serif text-2xl font-bold text-theme-primary">
                Join this Duo?
              </h3>
              <p className="text-xs text-theme-secondary">
                Connect your device to share a private room together.
              </p>
            </div>

            {/* Creator Profile Display */}
            <div className="rounded-3xl border border-theme bg-theme-input/60 p-5 flex items-center space-x-4 text-left">
              <Avatar
                src={session.creator.avatar_url}
                name={session.creator.name}
                size="lg"
              />
              <div className="min-w-0 flex-1">
                <span className="text-[10px] font-mono text-theme-muted uppercase tracking-wider block">
                  Created by
                </span>
                <h4 className="font-serif text-base font-bold text-theme-primary truncate">
                  {session.creator.name}
                </h4>
                <p className="text-xs text-theme-muted font-mono truncate">
                  {session.creator.email}
                </p>
              </div>
            </div>

            {/* Information Bullets */}
            <p className="text-xs text-theme-secondary leading-relaxed px-2">
              Chats, notes, doodles, and daily questions will be synced between both devices in real time.
            </p>

            {/* Action CTA */}
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
                onClick={onDismiss}
                className="text-xs text-theme-muted hover:text-theme-primary font-mono transition-colors pt-1"
              >
                Decline & Close
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
};
