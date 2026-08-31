'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { duoApi } from '@/lib/api';
import { ConnectionRequest } from '@/types';
import { Copy, Check, RefreshCw, ArrowRight, CheckCircle2, AlertCircle } from 'lucide-react';

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
          <div className="rounded-2xl border border-[#E8E4DB] bg-[#FFFFFF] p-6 sm:p-8 shadow-[0_2px_12px_rgba(28,25,23,0.03)]">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
              <div>
                <div className="inline-flex items-center space-x-2 rounded-full bg-[#F4F1EA] px-3.5 py-1 text-xs font-mono text-[#78716C] mb-3">
                  <span className="h-2 w-2 rounded-full bg-[#059669]" />
                  <span>Room Connected</span>
                </div>
                <h2 className="font-serif text-2xl sm:text-3xl lg:text-4xl font-normal text-[#1C1917]">
                  {profile?.name} <span className="text-[#8C857B] font-light">&</span> {partner.name}
                </h2>
                <p className="mt-2 text-xs sm:text-sm text-[#78716C] max-w-lg leading-relaxed">
                  Your private room is active. All chats, drawings, and daily reflections are shared exclusively between the two of you.
                </p>
              </div>

              <button
                onClick={handleLeaveDuo}
                className="rounded-xl border border-[#E8E4DB] bg-[#FBFAF7] px-4 py-2.5 text-xs sm:text-sm text-[#78716C] hover:border-[#D4CEC2] hover:text-[#C2410C] transition-all shrink-0"
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
                ? 'border-[#A7F3D0] bg-[#ECFDF5] text-[#065F46]'
                : 'border-[#FCA5A5] bg-[#FEF2F2] text-[#991B1B]'
            }`}
          >
            {message.type === 'success' ? (
              <CheckCircle2 className="h-4 w-4 shrink-0 text-[#059669]" />
            ) : (
              <AlertCircle className="h-4 w-4 shrink-0 text-[#DC2626]" />
            )}
            <span>{message.text}</span>
          </div>
        )}

        {/* Incoming Requests Banner */}
        {incomingRequests.length > 0 && (
          <div className="rounded-2xl border border-[#EDD5C8] bg-[#FDF8F5] p-6 shadow-[0_2px_8px_rgba(194,65,12,0.04)]">
            <div className="flex items-center space-x-2 mb-1.5">
              <span className="h-2 w-2 rounded-full bg-[#C2410C]" />
              <h3 className="font-serif text-lg font-medium text-[#1C1917]">
                Incoming Connection Request
              </h3>
            </div>
            <p className="text-xs sm:text-sm text-[#78716C]">
              Someone is requesting to link keys and create a private room with you.
            </p>

            <div className="mt-4 space-y-3">
              {incomingRequests.map((req) => (
                <div
                  key={req.id}
                  className="flex flex-col sm:flex-row items-start sm:items-center justify-between rounded-xl border border-[#E8E4DB] bg-[#FFFFFF] p-4 gap-3"
                >
                  <div>
                    <h4 className="text-xs sm:text-sm font-semibold text-[#1C1917]">{req.sender.name}</h4>
                    <p className="text-xs text-[#78716C] font-mono">{req.sender.email}</p>
                  </div>

                  <div className="flex items-center space-x-2 w-full sm:w-auto justify-end">
                    <button
                      onClick={() => handleAccept(req.id)}
                      disabled={isSubmitting}
                      className="rounded-xl bg-[#1C1917] px-4 py-2 text-xs font-medium text-white hover:bg-[#2E2A27] transition-all disabled:opacity-50 min-h-[38px]"
                    >
                      Accept & Link
                    </button>
                    <button
                      onClick={() => handleDecline(req.id)}
                      className="rounded-xl border border-[#E8E4DB] px-3.5 py-2 text-xs text-[#78716C] hover:text-[#1C1917] min-h-[38px]"
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
          <div className="rounded-2xl border border-[#E8E4DB] bg-[#FFFFFF] p-6 sm:p-7 shadow-[0_2px_8px_rgba(28,25,23,0.03)] flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono uppercase tracking-widest text-[#8C857B]">
                  Your Duo Key
                </span>
                <button
                  onClick={handleRegenerateCode}
                  title="Regenerate key"
                  className="text-[#8C857B] hover:text-[#1C1917] p-1.5 transition-colors rounded-lg hover:bg-[#F5F2EB]"
                >
                  <RefreshCw className="h-4 w-4" />
                </button>
              </div>

              <h3 className="mt-3.5 font-serif text-xl font-normal text-[#1C1917]">
                Share with partner
              </h3>
              <p className="mt-1 text-xs sm:text-sm text-[#78716C] leading-relaxed">
                Give this key to your partner so they can connect directly to your room.
              </p>

              <div className="mt-6 rounded-2xl border border-[#E8E4DB] bg-[#F5F2EB] p-5 text-center shadow-inner">
                <span className="font-mono text-2xl sm:text-3xl font-medium tracking-widest text-[#1C1917]">
                  {profile?.duo_code || 'DUO-......'}
                </span>
              </div>
            </div>

            <div className="mt-6">
              <button
                onClick={handleCopyCode}
                className="w-full flex items-center justify-center space-x-2 rounded-xl border border-[#D4CEC2] bg-[#FBFAF7] py-3 text-xs sm:text-sm font-medium text-[#1C1917] hover:bg-[#F5F2EB] transition-all min-h-[42px]"
              >
                {copied ? <Check className="h-4 w-4 text-[#059669]" /> : <Copy className="h-4 w-4 text-[#78716C]" />}
                <span>{copied ? 'Key copied to clipboard' : 'Copy Duo Key'}</span>
              </button>
            </div>
          </div>

          {/* Card 2: Connect with Partner Key */}
          <div className="rounded-2xl border border-[#E8E4DB] bg-[#FFFFFF] p-6 sm:p-7 shadow-[0_2px_8px_rgba(28,25,23,0.03)] flex flex-col justify-between">
            <div>
              <span className="text-[11px] font-mono uppercase tracking-widest text-[#8C857B]">
                Enter Partner's Key
              </span>

              <h3 className="mt-3.5 font-serif text-xl font-normal text-[#1C1917]">
                Join partner's room
              </h3>
              <p className="mt-1 text-xs sm:text-sm text-[#78716C] leading-relaxed">
                Enter the code your partner gave you to link your accounts.
              </p>

              <form onSubmit={handleConnect} className="mt-6 space-y-4">
                <div>
                  <input
                    type="text"
                    value={partnerCode}
                    onChange={(e) => setPartnerCode(e.target.value.toUpperCase())}
                    placeholder="e.g. DUO-7K4P2M"
                    maxLength={15}
                    disabled={hasActiveDuo}
                    className="w-full rounded-xl border border-[#D4CEC2] bg-[#FFFFFF] px-4 py-3 text-center font-mono text-lg font-medium tracking-widest text-[#1C1917] uppercase placeholder-[#A8A29E] focus:border-[#C2410C] focus:outline-none focus:ring-1 focus:ring-[#C2410C] disabled:bg-[#F5F2EB] disabled:text-[#8C857B]"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting || !partnerCode.trim() || hasActiveDuo}
                  className="flex w-full items-center justify-center space-x-2 rounded-xl bg-[#1C1917] py-3 text-xs sm:text-sm font-medium text-white hover:bg-[#2E2A27] transition-all disabled:opacity-40 min-h-[42px] shadow-sm"
                >
                  <span>{isSubmitting ? 'Linking...' : 'Send Connection Request'}</span>
                  <ArrowRight className="h-4 w-4" />
                </button>
              </form>
            </div>

            {outgoingRequests.length > 0 && (
              <div className="mt-6 pt-4 border-t border-[#E8E4DB]">
                <span className="text-xs font-mono text-[#8C857B]">Outgoing Request:</span>
                {outgoingRequests.map((req) => (
                  <div key={req.id} className="mt-2 flex items-center justify-between rounded-xl bg-[#F5F2EB] p-3 text-xs">
                    <span className="text-[#57534E]">Sent to <strong className="text-[#1C1917]">{req.receiver.name}</strong></span>
                    <button
                      onClick={() => handleCancel(req.id)}
                      className="text-xs text-[#C2410C] hover:underline font-mono"
                    >
                      Cancel
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
