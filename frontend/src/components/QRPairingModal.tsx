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
  const { profile, refreshProfile } = useAuth();
  const { toast } = useToast();
  const [session, setSession] = useState<PairingSession | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isPaired, setIsPaired] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number>(600); // 10 mins in seconds
  const [isExpired, setIsExpired] = useState(false);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const createSession = useCallback(async () => {
    setIsLoading(true);
    setIsPaired(false);
    setIsExpired(false);
    try {
      const res = await duoApi.createPairingSession();
      if (res.success && res.session) {
        setSession(res.session);
        // Calculate remaining seconds from expires_at
        const expiresMs = new Date(res.session.expires_at).getTime();
        const diffSec = Math.max(0, Math.floor((expiresMs - Date.now()) / 1000));
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
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    }
  }, [isOpen, createSession]);

  // Expiration countdown timer
  useEffect(() => {
    if (!isOpen || !session || isPaired) return;

    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);

    countdownIntervalRef.current = setInterval(() => {
      const expiresMs = new Date(session.expires_at).getTime();
      const remaining = Math.max(0, Math.floor((expiresMs - Date.now()) / 1000));
      setTimeLeft(remaining);

      if (remaining <= 0) {
        setIsExpired(true);
        if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
      }
    }, 1000);

    return () => {
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
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
        toast.love('Phone connected! Entering Duo...', 'Connected');
        setTimeout(() => {
          onPaired?.();
          onClose();
        }, 1500);
      })
      .subscribe();

    // 2. Lightweight polling fallback
    pollIntervalRef.current = setInterval(async () => {
      try {
        const checkRes = await duoApi.getCurrent();
        if (checkRes.has_active_duo && checkRes.partner) {
          setIsPaired(true);
          await refreshProfile();
          toast.love('Phone connected! Entering Duo...', 'Connected');
          if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
          setTimeout(() => {
            onPaired?.();
            onClose();
          }, 1500);
        }
      } catch {}
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
      } catch {}
    }
    onClose();
  };

  const formatCountdown = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
  };

  if (!isOpen) return null;

  const pairingUrl = typeof window !== 'undefined' && session?.token
    ? `${window.location.origin}/join?token=${session.token}`
    : '';

  return (
    <div
      onClick={handleCancel}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-[460px] overflow-hidden rounded-[32px] border border-theme bg-theme-card p-6 sm:p-8 shadow-2xl text-center select-none animate-in zoom-in-95 duration-200"
      >
        {/* Close Button */}
        <button
          onClick={handleCancel}
          className="absolute top-5 right-5 rounded-full p-1.5 text-theme-muted hover:text-theme-primary hover:bg-theme-input transition-colors"
          title="Close"
        >
          <X className="h-4 w-4" />
        </button>

        {isPaired ? (
          /* Success Screen: Phone connected */
          <div className="py-10 space-y-4 animate-in zoom-in-95 duration-300">
            <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-[#00D26A]/10 text-[#00D26A] mx-auto ring-8 ring-[#00D26A]/10 shadow-lg">
              <CheckCircle2 className="h-9 w-9" />
            </div>

            <div>
              <h3 className="font-serif text-2xl font-bold text-theme-primary">
                Phone connected
              </h3>
              <p className="text-xs text-theme-secondary mt-1.5">
                Entering your shared Duo room...
              </p>
            </div>
          </div>
        ) : isExpired ? (
          /* Expired State */
          <div className="py-8 space-y-5 animate-in fade-in duration-200">
            <div className="flex h-14 w-14 items-center justify-center rounded-3xl bg-[#FB923C]/10 text-[#FB923C] mx-auto">
              <AlertCircle className="h-7 w-7" />
            </div>

            <div>
              <h3 className="font-serif text-xl font-bold text-theme-primary">
                QR code has expired
              </h3>
              <p className="text-xs text-theme-secondary mt-1">
                For your security, pairing sessions expire after 10 minutes.
              </p>
            </div>

            <div className="pt-2 flex flex-col items-center gap-2.5">
              <button
                type="button"
                onClick={createSession}
                disabled={isLoading}
                className="flex items-center space-x-2 rounded-full bg-[#125CB9] px-6 py-2.5 text-xs font-semibold text-white hover:bg-[#0E4B99] transition-all shadow-xs active:scale-98"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                <span>Generate a new QR</span>
              </button>
              <button
                type="button"
                onClick={handleCancel}
                className="text-xs text-theme-muted hover:text-theme-primary transition-colors py-1"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          /* Native QR Pairing Screen */
          <div className="space-y-4">
            {/* Header */}
            <div>
              <h3 className="font-serif text-2xl font-bold text-theme-primary">
                Connect another device
              </h3>
              <p className="text-xs text-theme-secondary mt-1 max-w-xs mx-auto leading-relaxed">
                Scan this QR code with your phone to join this Duo.
              </p>
            </div>

            {/* Dynamic QR Code */}
            <div className="flex flex-col items-center justify-center py-1">
              <div className="relative rounded-2xl border border-theme bg-white p-4 shadow-xs">
                {isLoading || !session ? (
                  <div className="flex h-[220px] w-[220px] items-center justify-center">
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

            {/* Expiration Countdown */}
            <div className="text-xs font-mono text-theme-muted">
              <span>Expires in {formatCountdown(timeLeft)}</span>
            </div>

            {/* Waiting State */}
            <div className="flex items-center justify-center space-x-2 py-1 text-xs font-mono text-theme-secondary">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00D26A] opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#00D26A]" />
              </span>
              <span>Waiting for your phone to connect...</span>
            </div>

            {/* Cancel Button */}
            <div className="pt-2 border-t border-theme-subtle">
              <button
                type="button"
                onClick={handleCancel}
                className="w-full rounded-full border border-theme bg-theme-input py-2 text-xs font-medium text-theme-secondary hover:text-theme-primary hover:bg-theme-card transition-colors"
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
