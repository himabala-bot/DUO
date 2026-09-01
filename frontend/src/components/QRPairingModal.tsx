'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { duoApi } from '@/lib/api';
import { PairingSession } from '@/types';
import { supabase } from '@/lib/supabase';
import {
  QrCode,
  Copy,
  Check,
  X,
  Heart,
  Sparkles,
  Smartphone,
  CheckCircle2,
  RefreshCw,
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
  const [partnerName, setPartnerName] = useState<string>('');
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const createSession = useCallback(async () => {
    setIsLoading(true);
    setIsPaired(false);
    try {
      const res = await duoApi.createPairingSession();
      if (res.success && res.session) {
        setSession(res.session);
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
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    }
  }, [isOpen, createSession]);

  // Realtime pairing sync & polling fallback
  useEffect(() => {
    if (!isOpen || !session?.token || isPaired) return;

    // 1. Supabase Broadcast Channel for instant device pairing notification
    const channel = supabase.channel(`pairing:${session.token}`);
    channel
      .on('broadcast', { event: 'claimed' }, async (payload) => {
        setIsPaired(true);
        if (payload.payload?.partner_name) {
          setPartnerName(payload.payload.partner_name);
        }
        await refreshProfile();
        toast.love("You're paired! Welcome to Duo.", 'Connected');
        setTimeout(() => {
          onPaired?.();
          onClose();
        }, 1800);
      })
      .subscribe();

    // 2. Lightweight polling fallback every 2.5s to verify status
    pollIntervalRef.current = setInterval(async () => {
      try {
        const checkRes = await duoApi.getCurrent();
        if (checkRes.has_active_duo && checkRes.partner) {
          setIsPaired(true);
          setPartnerName(checkRes.partner.name);
          await refreshProfile();
          toast.love("You're paired! Welcome to Duo.", 'Connected');
          if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
          setTimeout(() => {
            onPaired?.();
            onClose();
          }, 1800);
        }
      } catch {
        // Ignore background polling errors
      }
    }, 2500);

    return () => {
      supabase.removeChannel(channel);
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, [isOpen, session?.token, isPaired, refreshProfile, toast, onPaired, onClose]);

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
    ? `${window.location.origin}/?pair=${session.token}`
    : '';

  return (
    <div
      onClick={handleCancel}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-md overflow-hidden rounded-[32px] border border-theme bg-theme-card p-6 sm:p-8 shadow-2xl text-center select-none animate-in zoom-in-95 duration-200"
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
          /* Success Screen */
          <div className="py-8 space-y-4 animate-in zoom-in-95 duration-300">
            <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-[#00D26A]/10 text-[#00D26A] mx-auto ring-8 ring-[#00D26A]/10 shadow-lg">
              <CheckCircle2 className="h-9 w-9" />
            </div>

            <div>
              <h3 className="font-serif text-2xl font-bold text-theme-primary">
                You're paired.
              </h3>
              <p className="text-xs text-theme-secondary mt-1.5 leading-relaxed">
                {partnerName ? `Connected with ${partnerName}.` : 'Your device is connected.'} Entering your private space now...
              </p>
            </div>
          </div>
        ) : (
          /* QR Code Pairing Screen */
          <div className="space-y-5">
            {/* Header */}
            <div>
              <div className="flex items-center justify-center space-x-2 text-xs font-mono text-[#125CB9] font-semibold mb-1">
                <Smartphone className="h-4 w-4" />
                <span>Pair with your other device</span>
              </div>
              <h3 className="font-serif text-2xl font-bold text-theme-primary">
                Scan with your phone
              </h3>
              <p className="text-xs text-theme-secondary mt-1 max-w-xs mx-auto leading-relaxed">
                Open your phone's camera to scan and immediately enter the same Duo room.
              </p>
            </div>

            {/* QR Code Container */}
            <div className="flex flex-col items-center justify-center py-2">
              <div className="relative rounded-3xl border-2 border-theme bg-white p-4.5 shadow-md">
                {isLoading || !session ? (
                  <div className="flex h-48 w-48 items-center justify-center">
                    <RefreshCw className="h-6 w-6 text-theme-muted animate-spin" />
                  </div>
                ) : (
                  <QRCodeSVG
                    value={pairingUrl}
                    size={192}
                    level="M"
                    includeMargin={false}
                    className="rounded-xl"
                  />
                )}
              </div>
            </div>

            {/* Fallback 6-Character Code */}
            {session?.code && (
              <div className="space-y-1.5">
                <span className="text-[11px] font-mono text-theme-muted uppercase tracking-wider">
                  Or enter 6-digit code on second device
                </span>
                <div className="flex items-center justify-center space-x-2">
                  <div className="inline-flex items-center space-x-2 rounded-2xl border border-theme bg-theme-input px-4 py-2 text-base font-mono font-bold tracking-widest text-theme-primary">
                    <span>{session.code}</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleCopyCode}
                    className="flex h-10 w-10 items-center justify-center rounded-2xl border border-theme bg-theme-input text-theme-secondary hover:text-theme-primary hover:bg-theme-card transition-colors shadow-xs"
                    title="Copy code"
                  >
                    {copied ? <Check className="h-4 w-4 text-[#00D26A]" /> : <Copy className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            )}

            {/* Live Waiting Status */}
            <div className="flex items-center justify-center space-x-2 rounded-full border border-theme bg-theme-input/60 px-4 py-2 text-xs font-mono text-theme-secondary">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00D26A] opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#00D26A]" />
              </span>
              <span>Waiting for your other device...</span>
            </div>

            {/* Footer */}
            <div className="pt-2 border-t border-theme-subtle flex items-center justify-between text-xs text-theme-muted font-mono">
              <span>Expires in 10 minutes</span>
              <button
                type="button"
                onClick={handleCancel}
                className="hover:text-theme-primary transition-colors underline"
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
