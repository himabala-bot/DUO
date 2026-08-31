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
    if (!confirm('Regenerate your DUO key? Your previous key will be invalidated.')) return;
    try {
      await duoApi.regenerateCode();
      await refreshProfile();
      setMessage({ type: 'success', text: 'New DUO key generated.' });
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
      setMessage({ type: 'success', text: res.message });
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
      setMessage({ type: 'success', text: res.message });
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
    if (!confirm('Disconnect from this DUO room? You will need to re-pair to communicate again.')) return;
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
      {/* Centered Connection Room Content (~780–860px) */}
      <div className="w-full max-w-[840px] space-y-6 sm:space-y-8">
        {/* Active Connected Room Card */}
        {hasActiveDuo && partner ? (
          <div className="rounded-2xl sm:rounded-3xl border border-[#EBE5DA] bg-[#FFFFFF] p-6 sm:p-8 shadow-[0_2px_12px_rgba(41,37,34,0.03)]">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
              <div>
                <div className="inline-flex items-center space-x-2 rounded-full bg-[#F2F6F0] border border-[#D5E2D1] px-3 py-1 text-xs font-mono text-[#4D6A46] mb-3">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#7A9C71]" />
                  <span>Private Room Active</span>
                </div>
                <h2 className="font-serif text-2xl sm:text-3xl lg:text-4xl font-normal text-[#292522]">
                  {profile?.name} <span className="text-[#C96A4A] font-light">&</span> {partner.name}
                </h2>
                <p className="mt-2 text-xs sm:text-sm text-[#7A7267] max-w-lg leading-relaxed">
                  Your private room is active. All chats, drawings, and daily reflections are shared exclusively between the two of you.
                </p>
              </div>

              <button
                onClick={handleLeaveDuo}
                className="rounded-xl border border-[#E8DFD3] bg-[#FAF8F5] px-4 py-2.5 text-xs sm:text-sm text-[#7A7267] hover:border-[#F0DDD4] hover:bg-[#FAF0ED] hover:text-[#C96A4A] transition-all shrink-0"
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
                ? 'border-[#D5E2D1] bg-[#F2F6F0] text-[#4D6A46]'
                : 'border-[#F4DCD9] bg-[#FAF2F0] text-[#C96A4A]'
            }`}
          >
            {message.type === 'success' ? (
              <CheckCircle2 className="h-4 w-4 shrink-0 text-[#5E8056]" />
            ) : (
              <AlertCircle className="h-4 w-4 shrink-0 text-[#C96A4A]" />
            )}
            <span>{message.text}</span>
          </div>
        )}

        {/* Incoming Requests Banner */}
        {incomingRequests.length > 0 && (
          <div className="rounded-2xl sm:rounded-3xl border border-[#F0DDD4] bg-[#FAF2EE] p-6 shadow-2xs">
            <div className="flex items-center space-x-2 mb-1.5">
              <span className="h-2 w-2 rounded-full bg-[#C96A4A]" />
              <h3 className="font-serif text-lg font-medium text-[#292522]">
                Incoming Connection Request
              </h3>
            </div>
            <p className="text-xs sm:text-sm text-[#7A7267]">
              Someone is requesting to link keys and create a private room with you.
            </p>

            <div className="mt-4 space-y-3">
              {incomingRequests.map((req) => (
                <div
                  key={req.id}
                  className="flex flex-col sm:flex-row items-start sm:items-center justify-between rounded-xl border border-[#EBE5DA] bg-[#FFFFFF] p-4 gap-3 shadow-2xs"
                >
                  <div>
                    <h4 className="text-xs sm:text-sm font-semibold text-[#292522]">{req.sender.name}</h4>
                    <p className="text-xs text-[#7A7267] font-mono">{req.sender.email}</p>
                  </div>

                  <div className="flex items-center space-x-2 w-full sm:w-auto justify-end">
                    <button
                      onClick={() => handleAccept(req.id)}
                      disabled={isSubmitting}
                      className="rounded-xl bg-[#C96A4A] px-4 py-2 text-xs font-medium text-white hover:bg-[#B75C3E] transition-all disabled:opacity-50 min-h-[38px] shadow-[0_2px_8px_rgba(201,106,74,0.18)]"
                    >
                      Accept & Link
                    </button>
                    <button
                      onClick={() => handleDecline(req.id)}
                      className="rounded-xl border border-[#E8DFD3] px-3.5 py-2 text-xs text-[#7A7267] hover:text-[#292522] min-h-[38px]"
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
          <div className="rounded-2xl sm:rounded-3xl border border-[#EBE5DA] bg-[#FFFFFF] p-6 sm:p-7 shadow-[0_2px_12px_rgba(41,37,34,0.03)] flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono uppercase tracking-widest text-[#A89F91]">
                  Your Connection Key
                </span>
                <button
                  onClick={handleRegenerateCode}
                  title="Regenerate key"
                  className="text-[#A89F91] hover:text-[#C96A4A] p-1.5 transition-colors rounded-lg hover:bg-[#FAF2EF]"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                </button>
              </div>

              <div className="mt-4 rounded-2xl border border-[#E8DFD3] bg-[#FAF8F5] p-5 text-center shadow-2xs">
                <span className="font-mono text-2xl sm:text-3xl font-medium tracking-widest text-[#292522]">
                  {profile?.duo_code}
                </span>
              </div>
              <p className="mt-3 text-xs text-[#7A7267] leading-relaxed">
                Share this unique key with your partner so they can connect with you.
              </p>
            </div>

            <button
              onClick={handleCopyCode}
              className="mt-6 flex items-center justify-center space-x-2 rounded-xl border border-[#E8DFD3] bg-[#FAF5EE] py-3 text-xs sm:text-sm font-medium text-[#292522] hover:bg-[#FAF1EC] hover:text-[#C96A4A] hover:border-[#F0DDD4] transition-all shadow-2xs min-h-[44px]"
            >
              {copied ? (
                <>
                  <Check className="h-4 w-4 text-[#5E8056]" />
                  <span className="text-[#5E8056] font-mono">Key copied to clipboard</span>
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4 text-[#A89F91]" />
                  <span>Copy Connection Key</span>
                </>
              )}
            </button>
          </div>

          {/* Card 2: Connect with Partner Key */}
          <div className="rounded-2xl sm:rounded-3xl border border-[#EBE5DA] bg-[#FFFFFF] p-6 sm:p-7 shadow-[0_2px_12px_rgba(41,37,34,0.03)] flex flex-col justify-between">
            <div>
              <span className="text-[10px] font-mono uppercase tracking-widest text-[#A89F91]">
                Pair with Partner
              </span>
              <p className="mt-2 text-xs sm:text-sm text-[#7A7267] leading-relaxed">
                Enter your partner's key below to link your private room.
              </p>

              <form onSubmit={handleConnect} className="mt-4 space-y-3">
                <input
                  type="text"
                  value={partnerCode}
                  onChange={(e) => setPartnerCode(e.target.value.toUpperCase())}
                  placeholder="DUO-XXXXXX"
                  maxLength={10}
                  className="w-full rounded-2xl border border-[#E8DFD3] bg-[#FAF8F5] px-4 py-3 font-mono text-sm uppercase tracking-wider text-[#292522] placeholder-[#A89F91] focus:border-[#C96A4A] focus:bg-[#FFFFFF] focus:outline-none focus:ring-1 focus:ring-[#C96A4A] shadow-2xs"
                />

                <button
                  type="submit"
                  disabled={!partnerCode.trim() || isSubmitting}
                  className="w-full flex items-center justify-center space-x-2 rounded-xl bg-[#C96A4A] py-3 text-xs sm:text-sm font-medium text-white hover:bg-[#B75C3E] transition-all disabled:opacity-40 shadow-[0_2px_8px_rgba(201,106,74,0.18)] min-h-[44px]"
                >
                  <span>{isSubmitting ? 'Sending Request...' : 'Send Connection Request'}</span>
                  <ArrowRight className="h-4 w-4" />
                </button>
              </form>
            </div>
          </div>
        </div>

        {/* Outgoing Pending Requests */}
        {outgoingRequests.length > 0 && (
          <div className="rounded-2xl sm:rounded-3xl border border-[#EBE5DA] bg-[#FAF8F5] p-5 sm:p-6 space-y-3">
            <span className="text-[10px] font-mono uppercase tracking-widest text-[#A89F91]">
              Pending Sent Requests
            </span>
            <div className="space-y-2.5">
              {outgoingRequests.map((req) => (
                <div
                  key={req.id}
                  className="flex items-center justify-between rounded-xl border border-[#EBE5DA] bg-[#FFFFFF] p-3.5 text-xs shadow-2xs"
                >
                  <div>
                    <span className="font-medium text-[#292522]">To: {req.receiver.name}</span>
                    <span className="text-[#A89F91] font-mono ml-2">({req.receiver.email})</span>
                  </div>
                  <button
                    onClick={() => handleCancel(req.id)}
                    className="text-[#A89F91] hover:text-[#C96A4A] transition-colors font-mono"
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
