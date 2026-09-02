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
  X,
  CheckCircle2,
  RefreshCw,
  AlertCircle,
} from 'lucide-react';

interface QRPairingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPaired?: () => void;
}

export const QRPairingModal: React.FC<QRPairingModalProps> = ({
  isOpen,
  onClose,
  onPaired,
}) => {
  const { refreshProfile } = useAuth();
  const { toast } = useToast();
  const [session, setSession] = useState<PairingSession | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isPaired, setIsPaired] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number>(600); // 10 minutes (600s)
  const [isExpired, setIsExpired] = useState(false);
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
        // Calculate remaining seconds from expires_at
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
    if (isOpen) {
      createSession();
    } else {
      setSession(null);
      setIsPaired(false);
      setIsExpired(false);
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    }
  }, [isOpen, createSession]);

  // Expiration countdown timer (updates every second)
  useEffect(() => {
    if (!isOpen || !session || isPaired) return;

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
  }, [isOpen, session, isPaired]);

  // Realtime pairing sync & polling fallback
  useEffect(() => {
    if (!isOpen || !session?.token || isPaired || isExpired) return;

    // 1. Supabase Broadcast Channel for instant device pairing notification
    const channel = supabase.channel(`pairing:${session.token}`);
    channel
      .on('broadcast', { event: 'claimed' }, async () => {
        setIsPaired(true);
        await refreshProfile();
        toast.love("You're paired! Welcome to Duo.", 'Connected');
        setTimeout(() => {
          onPaired?.();
          onClose();
        }, 1200);
      })
      .subscribe();

    // 2. Lightweight polling fallback
    pollIntervalRef.current = setInterval(async () => {
      try {
        const checkRes = await duoApi.getCurrent();
        if (checkRes.has_active_duo && checkRes.partner) {
          setIsPaired(true);
          await refreshProfile();
          toast.love("You're paired! Welcome to Duo.", 'Connected');
          if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
          setTimeout(() => {
            onPaired?.();
            onClose();
          }, 1200);
        }
      } catch {
        // Ignore background polling errors
      }
    }, 2500);

    return () => {
      supabase.removeChannel(channel);
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, [isOpen, session?.token, isPaired, isExpired, refreshProfile, toast, onPaired, onClose]);

  const handleCopyCode = () => {
    if (!session?.code) return;
    navigator.clipboard.writeText(session.code);
    setCopied(true);
    toast.love('Pairing code copied', 'Copied');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCancel = async () => {
    if (session?.token) {
      try {
        await duoApi.cancelPairingSession(session.token);
      } catch {
        // Ignore cancellation error
      }
    }
    onClose();
  };

  if (!isOpen) return null;

  const pairingUrl = typeof window !== 'undefined' && session?.token
    ? `${window.location.origin}/join?token=${session.token}`
    : '';

  const formatCountdown = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div
      onClick={handleCancel}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-[460px] overflow-hidden rounded-3xl border border-theme bg-theme-card p-6 sm:p-8 shadow-xl text-center select-none animate-in zoom-in-95 duration-150"
      >
        {/* Close Button */}
        <button
          onClick={handleCancel}
          className="absolute top-4 right-4 rounded-full p-2 text-theme-muted hover:text-theme-primary hover:bg-theme-input transition-colors"
          title="Close"
        >
          <X className="h-4 w-4" />
        </button>

        {isPaired ? (
          /* Success Screen */
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
            <div className="pt-2 flex flex-col sm:flex-row gap-2 justify-center">
              <button
                type="button"
                onClick={createSession}
                className="inline-flex items-center justify-center space-x-2 rounded-full bg-[#125CB9] px-6 py-2.5 text-xs font-semibold text-white hover:bg-[#0E4B99] transition-colors shadow-xs"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                <span>Generate a new QR</span>
              </button>
              <button
                type="button"
                onClick={handleCancel}
                className="rounded-full border border-theme bg-theme-input px-5 py-2.5 text-xs font-medium text-theme-secondary hover:text-theme-primary transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          /* Native Product Pairing Dialog */
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

            {/* Cancel Action */}
            <div className="pt-2 border-t border-theme-subtle">
              <button
                type="button"
                onClick={handleCancel}
                className="text-xs font-medium text-theme-secondary hover:text-theme-primary transition-colors py-1 px-3"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
