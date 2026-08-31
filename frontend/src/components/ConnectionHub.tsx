'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { duoApi } from '@/lib/api';
import { ConnectionRequest } from '@/types';
import { Copy, Check, RefreshCw, ArrowRight, CheckCircle2, AlertCircle, KeyRound, Heart, Sparkles } from 'lucide-react';

export const ConnectionHub: React.FC = () => {
  const { profile, partner, hasActiveDuo, refreshProfile } = useAuth();
  const [partnerCode, setPartnerCode] = useState('');
  const [incomingRequests, setIncomingRequests] = useState<ConnectionRequest[]>([]);
  const [outgoingRequests, setOutgoingRequests] = useState<ConnectionRequest[]>([]);
  const [copied, setCopied] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchRequests = useCallback(async () => {
    try {
      const res = await duoApi.getRequests();
      setIncomingRequests(res.incoming || []);
      setOutgoingRequests(res.outgoing || []);
    } catch (err: any) {
      console.warn('Failed to load connection requests:', err);
    }
  }, []);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const handleCopyCode = () => {
    if (!profile?.duo_code) return;
    navigator.clipboard.writeText(profile.duo_code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleRegenerateCode = async () => {
    if (!confirm('Regenerate your DUO key? Your previous key will no longer work.')) return;
    try {
      await duoApi.regenerateCode();
      await refreshProfile();
      setMessage({ type: 'success', text: 'New DUO key generated! 💌' });
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to regenerate code.' });
    }
  };

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!partnerCode.trim()) return;

    setMessage(null);
    setIsSubmitting(true);
    try {
      const res = await duoApi.connect(partnerCode.trim());
      setMessage({ type: 'success', text: res.message || 'Connection request sent with love! 💕' });
      setPartnerCode('');
      await fetchRequests();
      await refreshProfile();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to send connection request.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAccept = async (reqId: string) => {
    setIsSubmitting(true);
    try {
      const res = await duoApi.acceptRequest(reqId);
      setMessage({ type: 'success', text: res.message || 'You two are officially connected! 💕' });
      await refreshProfile();
      await fetchRequests();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to accept request.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDecline = async (reqId: string) => {
    try {
      await duoApi.declineRequest(reqId);
      await fetchRequests();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to decline request.' });
    }
  };

  const handleCancel = async (reqId: string) => {
    try {
      await duoApi.cancelRequest(reqId);
      await fetchRequests();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to cancel request.' });
    }
  };

  const handleLeaveDuo = async () => {
    if (!confirm('Disconnect from this room? You will need to re-pair to communicate again.')) return;
    try {
      await duoApi.leave();
      await refreshProfile();
      await fetchRequests();
      setMessage({ type: 'success', text: 'Room disconnected.' });
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to leave DUO.' });
    }
  };

  return (
    <div className="w-full flex justify-center px-4 sm:px-6 lg:px-8 py-6 sm:py-8 lg:py-12">
      {/* Centered Connection Room Content */}
      <div className="w-full max-w-[840px] space-y-6 sm:space-y-8">
        {/* Active Connected Room Card */}
        {hasActiveDuo && partner ? (
          <div className="rounded-3xl border-2 border-[#FCE1E8] bg-gradient-to-r from-[#FFF0F3] to-[#FFF9F5] p-6 sm:p-8 shadow-[0_8px_32px_rgba(244,114,182,0.08)]">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
              <div>
                <div className="inline-flex items-center space-x-2 rounded-full bg-[#DCFCE7] border border-[#BBF7D0] px-3.5 py-1 text-xs font-mono text-[#15803D] mb-3 shadow-2xs">
                  <span className="h-2 w-2 rounded-full bg-[#22C55E] animate-ping" />
                  <span>Two Hearts Connected 💕</span>
                </div>
                <h2 className="font-serif text-3xl sm:text-4xl font-bold text-[#2D2522]">
                  {profile?.name} <span className="text-[#E11D48]">💖</span> {partner.name}
                </h2>
                <p className="mt-2 text-xs sm:text-sm text-[#7A6D65] max-w-lg leading-relaxed">
                  Your private room is sealed and active! All notes, drawings, and daily reflections are shared exclusively between the two of you.
                </p>
              </div>

              <button
                onClick={handleLeaveDuo}
                className="rounded-2xl border border-[#FCE1E8] bg-[#FFFFFF] px-4 py-2.5 text-xs sm:text-sm font-semibold text-[#7A6D65] hover:border-[#FF758C] hover:text-[#E11D48] transition-all shrink-0 shadow-2xs"
              >
                Disconnect room
              </button>
            </div>
          </div>
        ) : null}

        {/* Alert Messages */}
        {message && (
          <div
            className={`flex items-center space-x-2.5 rounded-2xl border p-4 text-xs sm:text-sm ${
              message.type === 'success'
                ? 'border-[#BBF7D0] bg-[#DCFCE7] text-[#15803D]'
                : 'border-[#FCE1E8] bg-[#FFF0F3] text-[#E11D48]'
            }`}
          >
            {message.type === 'success' ? (
              <CheckCircle2 className="h-4 w-4 shrink-0 text-[#22C55E]" />
            ) : (
              <AlertCircle className="h-4 w-4 shrink-0 text-[#E11D48]" />
            )}
            <span className="font-medium">{message.text}</span>
          </div>
        )}

        {/* Incoming Requests Banner */}
        {incomingRequests.length > 0 && (
          <div className="rounded-3xl border-2 border-[#FED7AA] bg-[#FFF9F5] p-6 shadow-xs">
            <div className="flex items-center space-x-2 mb-1.5">
              <span className="text-xl">💌</span>
              <h3 className="font-serif text-xl font-bold text-[#2D2522]">
                Someone Wants to Connect! 💕
              </h3>
            </div>
            <p className="text-xs sm:text-sm text-[#7A6D65]">
              A connection request arrived to create a shared private room with you.
            </p>

            <div className="mt-4 space-y-3">
              {incomingRequests.map((req) => (
                <div
                  key={req.id}
                  className="flex flex-col sm:flex-row items-start sm:items-center justify-between rounded-2xl border border-[#FED7AA] bg-[#FFFFFF] p-4 gap-3 shadow-2xs"
                >
                  <div>
                    <h4 className="text-sm font-bold text-[#2D2522]">{req.sender.name}</h4>
                    <p className="text-xs text-[#7A6D65] font-mono">{req.sender.email}</p>
                  </div>

                  <div className="flex items-center space-x-2 w-full sm:w-auto justify-end">
                    <button
                      onClick={() => handleAccept(req.id)}
                      disabled={isSubmitting}
                      className="rounded-2xl bg-gradient-to-r from-[#FF758C] to-[#FF7EB3] px-5 py-2 text-xs font-bold text-white hover:scale-105 transition-all disabled:opacity-50 min-h-[40px] shadow-sm"
                    >
                      Accept & Connect 💕
                    </button>
                    <button
                      onClick={() => handleDecline(req.id)}
                      className="rounded-2xl border border-[#F4EBE6] px-4 py-2 text-xs text-[#7A6D65] hover:text-[#2D2522] min-h-[40px]"
                    >
                      Decline
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Pairing Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {/* Card 1: Your Key */}
          <div className="rounded-3xl border-2 border-[#FCE1E8] bg-[#FFFFFF] p-6 sm:p-7 shadow-[0_8px_24px_rgba(244,114,182,0.06)] flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono uppercase tracking-widest text-[#B2A49B] font-bold">
                  Your Room Key 🗝️
                </span>
                <button
                  onClick={handleRegenerateCode}
                  title="Regenerate key"
                  className="text-[#B2A49B] hover:text-[#E11D48] p-1.5 transition-colors rounded-xl hover:bg-[#FFF0F3]"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                </button>
              </div>

              <div className="mt-4 rounded-2xl border-2 border-dashed border-[#FCE1E8] bg-[#FFF5F7] p-5 text-center shadow-2xs">
                <span className="font-mono text-2xl sm:text-3xl font-bold tracking-widest text-[#E11D48]">
                  {profile?.duo_code}
                </span>
              </div>
              <p className="mt-3 text-xs text-[#7A6D65] leading-relaxed">
                Send this secret key to your favorite person so they can link with your room! 💕
              </p>
            </div>

            <button
              onClick={handleCopyCode}
              className="mt-6 flex items-center justify-center space-x-2 rounded-2xl border-2 border-[#FCE1E8] bg-[#FFFDFC] py-3 text-xs sm:text-sm font-bold text-[#E11D48] hover:bg-[#FFF0F3] hover:border-[#FF758C] transition-all shadow-xs min-h-[46px]"
            >
              {copied ? (
                <>
                  <Check className="h-4 w-4 text-[#15803D]" />
                  <span className="text-[#15803D] font-mono">Key copied to clipboard! 💕</span>
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4 text-[#E11D48]" />
                  <span>Copy My Room Key 💕</span>
                </>
              )}
            </button>
          </div>

          {/* Card 2: Connect with Partner Key */}
          <div className="rounded-3xl border-2 border-[#FCE1E8] bg-[#FFFFFF] p-6 sm:p-7 shadow-[0_8px_24px_rgba(244,114,182,0.06)] flex flex-col justify-between">
            <div>
              <span className="text-[10px] font-mono uppercase tracking-widest text-[#B2A49B] font-bold">
                Pair with Partner 💖
              </span>
              <p className="mt-2 text-xs sm:text-sm text-[#7A6D65] leading-relaxed">
                Have your partner's key? Enter it below to link your private world together.
              </p>

              <form onSubmit={handleConnect} className="mt-4 space-y-3">
                <input
                  type="text"
                  value={partnerCode}
                  onChange={(e) => setPartnerCode(e.target.value.toUpperCase())}
                  placeholder="DUO-XXXXXX"
                  maxLength={10}
                  className="w-full rounded-2xl border-2 border-[#FCE1E8] bg-[#FFFDFC] px-4 py-3 font-mono text-sm font-bold uppercase tracking-wider text-[#2D2522] placeholder-[#B2A49B] focus:border-[#FF758C] focus:bg-[#FFFFFF] focus:outline-none focus:ring-2 focus:ring-[#FF758C]/20 shadow-xs"
                />

                <button
                  type="submit"
                  disabled={!partnerCode.trim() || isSubmitting}
                  className="w-full flex items-center justify-center space-x-2 rounded-2xl bg-gradient-to-r from-[#FF758C] to-[#FF7EB3] py-3 text-xs sm:text-sm font-bold text-white hover:scale-102 hover:shadow-[0_4px_16px_rgba(255,117,140,0.35)] transition-all disabled:opacity-40 shadow-sm min-h-[46px]"
                >
                  <span>{isSubmitting ? 'Linking Hearts...' : 'Send Pairing Request 💕'}</span>
                  <ArrowRight className="h-4 w-4" />
                </button>
              </form>
            </div>
          </div>
        </div>

        {/* Outgoing Pending Requests */}
        {outgoingRequests.length > 0 && (
          <div className="rounded-3xl border-2 border-[#FCE1E8] bg-[#FFFDFC] p-5 sm:p-6 space-y-3">
            <span className="text-[10px] font-mono uppercase tracking-widest text-[#B2A49B] font-bold">
              Pending Requests Sent 💕
            </span>
            <div className="space-y-2.5">
              {outgoingRequests.map((req) => (
                <div
                  key={req.id}
                  className="flex items-center justify-between rounded-2xl border border-[#FCE1E8] bg-[#FFFFFF] p-3.5 text-xs shadow-2xs"
                >
                  <div>
                    <span className="font-bold text-[#2D2522]">To: {req.receiver.name}</span>
                    <span className="text-[#B2A49B] font-mono ml-2">({req.receiver.email})</span>
                  </div>
                  <button
                    onClick={() => handleCancel(req.id)}
                    className="text-[#E11D48] hover:underline font-mono font-medium"
                  >
                    Cancel
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
