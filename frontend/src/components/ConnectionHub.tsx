'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { duoApi } from '@/lib/api';
import { PairingSession } from '@/types';
import { supabase } from '@/lib/supabase';
import {
  Copy,
  Check,
  CheckCircle2,
  RefreshCw,
  AlertCircle,
  QrCode,
  KeyRound,
  ArrowRight,
} from 'lucide-react';

export const ConnectionHub: React.FC = () => {
  const { profile, refreshProfile } = useAuth();
  const { toast } = useToast();

  const [mode, setMode] = useState<'qr' | 'code'>('qr');
  const [session, setSession] = useState<PairingSession | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isPaired, setIsPaired] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number>(600);
  const [isExpired, setIsExpired] = useState(false);

  // Manual code entry state
  const [manualCode, setManualCode] = useState('');
  const [isJoiningWithCode, setIsJoiningWithCode] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);

  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const createSession = useCallback(async () => {
    setIsLoading(true);
    setIsPaired(false);
    setIsExpired(false);
    try {
      const res = await duoApi.createPairingSession();
      if (res.success && res.session) {
        setSession(res.session);
        const expiresAt = new Date(res.session.expires_at).getTime();
        const diffSec = Math.max(0, Math.floor((expiresAt - Date.now()) / 1000));
        setTimeLeft(diffSec || 600);
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to generate pairing session.', 'Error');
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    if (mode === 'qr') {
      createSession();
    }
  }, [mode, createSession]);

  // Expiration countdown timer
  useEffect(() => {
    if (mode !== 'qr' || !session || isPaired || isExpired) return;

    timerIntervalRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          setIsExpired(true);
          if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, [mode, session, isPaired, isExpired]);

  // Realtime pairing sync & polling fallback
  useEffect(() => {
    if (mode !== 'qr' || !session?.token || isPaired || isExpired) return;

    const channel = supabase.channel(`pairing:${session.token}`);
    channel
      .on('broadcast', { event: 'claimed' }, async () => {
        setIsPaired(true);
        await refreshProfile();
        toast.love("You're paired! Welcome to Duo.", 'Connected');
      })
      .subscribe();

    pollIntervalRef.current = setInterval(async () => {
      try {
        const checkRes = await duoApi.getCurrent();
        if (checkRes.has_active_duo && checkRes.partner) {
          setIsPaired(true);
          await refreshProfile();
          toast.love("You're paired! Welcome to Duo.", 'Connected');
          if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
        }
      } catch {}
    }, 2500);

    return () => {
      supabase.removeChannel(channel);
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, [mode, session?.token, isPaired, isExpired, refreshProfile, toast]);

  const handleCopyCode = () => {
    if (!session?.code) return;
    navigator.clipboard.writeText(session.code);
    setCopied(true);
    toast.love('Pairing code copied', 'Copied');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleJoinByCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualCode.trim()) return;

    setIsJoiningWithCode(true);
    setJoinError(null);

    try {
      const res = await duoApi.claimPairingSession({ code: manualCode.trim().toUpperCase() });
      if (res.success) {
        toast.love('Successfully paired with partner!', 'Connected');
        await refreshProfile();
      }
    } catch (err: any) {
      setJoinError(err.message || 'Invalid or expired pairing code.');
      toast.error(err.message || 'Invalid or expired pairing code.', 'Pairing Error');
    } finally {
      setIsJoiningWithCode(false);
    }
  };

  const pairingUrl = typeof window !== 'undefined' && session?.token
    ? `${window.location.origin}/join?token=${session.token}`
    : '';

  const formatCountdown = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="w-full flex-1 flex flex-col items-center justify-center px-4 py-8 sm:py-12">
      {/* Mode Switcher */}
      <div className="flex items-center space-x-1.5 p-1 rounded-full bg-theme-input border border-theme mb-6">
        <button
          type="button"
          onClick={() => setMode('qr')}
          className={`flex items-center space-x-2 rounded-full px-4 py-1.5 text-xs font-medium transition-all ${
            mode === 'qr'
              ? 'bg-[#125CB9] text-white shadow-xs font-semibold'
              : 'text-theme-secondary hover:text-theme-primary'
          }`}
        >
          <QrCode className="h-3.5 w-3.5" />
          <span>Create a Duo</span>
        </button>

        <button
          type="button"
          onClick={() => setMode('code')}
          className={`flex items-center space-x-2 rounded-full px-4 py-1.5 text-xs font-medium transition-all ${
            mode === 'code'
              ? 'bg-[#125CB9] text-white shadow-xs font-semibold'
              : 'text-theme-secondary hover:text-theme-primary'
          }`}
        >
          <KeyRound className="h-3.5 w-3.5" />
          <span>Enter Code to Join</span>
        </button>
      </div>

      {/* Main Centered Product Card */}
      <div className="relative w-full max-w-[460px] overflow-hidden rounded-3xl border border-theme bg-theme-card p-6 sm:p-8 shadow-sm text-center select-none">
        {isPaired ? (
          /* Realtime Pairing Success State */
          <div className="py-8 space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#00D26A]/10 text-[#00D26A] mx-auto ring-8 ring-[#00D26A]/10 shadow-sm">
              <CheckCircle2 className="h-8 w-8" />
            </div>

            <div>
              <h3 className="font-serif text-2xl font-bold text-theme-primary">
                Phone connected
              </h3>
              <p className="text-xs text-theme-secondary mt-1">
                Entering your shared Duo room...
              </p>
            </div>
          </div>
        ) : mode === 'code' ? (
          /* Enter Code to Join View */
          <form onSubmit={handleJoinByCode} className="space-y-4">
            <div className="space-y-1">
              <h2 className="font-serif text-2xl font-bold text-theme-primary">
                Enter Pairing Code
              </h2>
              <p className="text-xs sm:text-sm text-theme-secondary max-w-sm mx-auto leading-relaxed">
                Enter the 6-character code shown on your other device.
              </p>
            </div>

            <div className="py-3">
              <input
                type="text"
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value.toUpperCase())}
                placeholder="e.g. 7K4P2M"
                maxLength={8}
                autoFocus
                className="w-full max-w-xs mx-auto text-center font-mono text-2xl font-bold tracking-widest uppercase rounded-2xl border-2 border-theme bg-theme-input p-3.5 text-theme-primary placeholder:text-theme-muted focus:border-[#125CB9] focus:bg-theme-card focus:outline-none transition-all"
              />
            </div>

            {joinError && (
              <div className="rounded-xl border border-[#F43F5E]/30 bg-[#F43F5E]/10 p-3 text-xs text-[#F43F5E]">
                {joinError}
              </div>
            )}

            <button
              type="submit"
              disabled={!manualCode.trim() || isJoiningWithCode}
              className="w-full flex items-center justify-center space-x-2 rounded-full bg-[#125CB9] py-3 text-xs sm:text-sm font-semibold text-white hover:bg-[#0E4B99] disabled:opacity-40 transition-colors shadow-xs"
            >
              {isJoiningWithCode ? (
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
          </form>
        ) : isExpired ? (
          /* Expired State */
          <div className="py-6 space-y-4 text-center animate-in fade-in duration-200">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-neutral-500/10 text-neutral-400 mx-auto">
              <AlertCircle className="h-7 w-7" />
            </div>
            <div>
              <h3 className="font-serif text-xl font-bold text-theme-primary">
                QR expired
              </h3>
              <p className="text-xs text-theme-secondary mt-1">
                This pairing session has expired for security.
              </p>
            </div>
            <div className="pt-2 flex justify-center">
              <button
                type="button"
                onClick={createSession}
                className="inline-flex items-center justify-center space-x-2 rounded-full bg-[#125CB9] px-6 py-2.5 text-xs font-semibold text-white hover:bg-[#0E4B99] transition-colors shadow-xs"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                <span>Generate a new QR</span>
              </button>
            </div>
          </div>
        ) : (
          /* Native Product Centered QR Pairing Layout */
          <div className="space-y-4">
            {/* Heading & Subtitle */}
            <div className="space-y-1">
              <h2 className="font-serif text-2xl font-bold text-theme-primary">
                Connect another device
              </h2>
              <p className="text-xs sm:text-sm text-theme-secondary max-w-sm mx-auto leading-relaxed">
                Scan this QR code with your phone to join this Duo.
              </p>
            </div>

            {/* Centered QR Code Box */}
            <div className="flex flex-col items-center justify-center py-2">
              <div className="relative rounded-2xl border border-neutral-200 dark:border-neutral-700 bg-white p-4 shadow-sm">
                {isLoading || !session ? (
                  <div className="flex h-56 w-56 sm:h-60 sm:w-60 items-center justify-center">
                    <RefreshCw className="h-6 w-6 text-theme-muted animate-spin" />
                  </div>
                ) : (
                  <QRCodeSVG
                    value={pairingUrl}
                    size={220}
                    level="M"
                    includeMargin={false}
                    className="rounded-lg"
                  />
                )}
              </div>
            </div>

            {/* Fallback 6-Character Code */}
            {session?.code && (
              <div className="flex flex-col items-center space-y-1">
                <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-xl bg-theme-input border border-theme">
                  <span className="font-mono text-base sm:text-lg font-bold tracking-widest text-theme-primary">
                    {session.code}
                  </span>
                  <button
                    type="button"
                    onClick={handleCopyCode}
                    className="p-1 text-theme-muted hover:text-theme-primary transition-colors"
                    title="Copy code"
                  >
                    {copied ? (
                      <Check className="h-3.5 w-3.5 text-[#00D26A]" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* Expiration Countdown */}
            <div className="text-xs font-mono text-theme-muted">
              <span>Expires in {formatCountdown(timeLeft)}</span>
            </div>

            {/* Waiting State Indicator */}
            <div className="flex items-center justify-center space-x-2 text-xs text-theme-secondary font-mono pt-1">
              <span className="h-2 w-2 rounded-full bg-[#00D26A] animate-pulse" />
              <span>Waiting for your phone to connect...</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
