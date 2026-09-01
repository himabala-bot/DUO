'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { duoApi } from '@/lib/api';
import { ConnectionRequest } from '@/types';
import {
  KeyRound,
  Copy,
  Check,
  RefreshCw,
  ArrowRight,
  Heart,
  AlertCircle,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';

export const ConnectionHub: React.FC = () => {
  const { profile, partner, hasActiveDuo, refreshProfile } = useAuth();
  const { toast, confirm: confirmModal } = useToast();
  const [partnerCode, setPartnerCode] = useState('');
  const [copied, setCopied] = useState(false);
  const [incomingRequests, setIncomingRequests] = useState<ConnectionRequest[]>([]);
  const [outgoingRequests, setOutgoingRequests] = useState<ConnectionRequest[]>([]);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchRequests = useCallback(async () => {
    try {
      const res = await duoApi.getRequests();
      setIncomingRequests(res.incoming || []);
      setOutgoingRequests(res.outgoing || []);
    } catch (err) {
      console.warn('Failed to load requests:', err);
    }
  }, []);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const handleCopyCode = () => {
    if (!profile?.duo_code) return;
    navigator.clipboard.writeText(profile.duo_code);
    setCopied(true);
    toast.love('Secret key copied to clipboard', 'Copied');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRegenerateCode = async () => {
    const ok = await confirmModal({
      title: 'Regenerate Secret Key?',
      message: 'Any previous key you shared will no longer work. You will get a fresh key to share.',
      confirmText: 'Generate New Key',
      cancelText: 'Keep Current',
      type: 'warning',
    });
    if (!ok) return;

    try {
      await duoApi.regenerateCode();
      await refreshProfile();
      toast.love('New secret key generated', 'Key Generated');
      setMessage({ type: 'success', text: 'New secret key generated' });
    } catch (err: any) {
      toast.error(err.message || 'Failed to regenerate key.', 'Error');
      setMessage({ type: 'error', text: err.message || 'Failed to regenerate key.' });
    }
  };

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!partnerCode.trim()) return;

    setIsSubmitting(true);
    setMessage(null);

    try {
      const res = await duoApi.connect(partnerCode.trim());
      toast.love(res.message || 'Pairing invite sent', 'Invite Sent');
      setMessage({ type: 'success', text: res.message || 'Pairing invite sent' });
      setPartnerCode('');
      await fetchRequests();
      await refreshProfile();
    } catch (err: any) {
      toast.error(err.message || 'Failed to pair keys.', 'Pairing Error');
      setMessage({ type: 'error', text: err.message || 'Failed to pair keys.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAccept = async (reqId: string) => {
    setIsSubmitting(true);
    try {
      await duoApi.acceptRequest(reqId);
      await refreshProfile();
      await fetchRequests();
      toast.love('Room connected! Welcome to your private space', 'Connected');
      setMessage({ type: 'success', text: 'Room connected! Welcome to your private space' });
    } catch (err: any) {
      toast.error(err.message || 'Failed to accept pairing.', 'Error');
      setMessage({ type: 'error', text: err.message || 'Failed to accept pairing.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDecline = async (reqId: string) => {
    try {
      await duoApi.declineRequest(reqId);
      await fetchRequests();
      toast.info('Connection request declined.', 'Declined');
    } catch (err: any) {
      toast.error(err.message || 'Failed to decline request.', 'Error');
      setMessage({ type: 'error', text: err.message || 'Failed to decline request.' });
    }
  };

  const handleCancel = async (reqId: string) => {
    try {
      await duoApi.cancelRequest(reqId);
      await fetchRequests();
      toast.info('Pairing request cancelled.', 'Cancelled');
    } catch (err: any) {
      toast.error(err.message || 'Failed to cancel request.', 'Error');
      setMessage({ type: 'error', text: err.message || 'Failed to cancel request.' });
    }
  };

  const handleLeaveDuo = async () => {
    const ok = await confirmModal({
      title: 'Disconnect Room?',
      message: 'You will need to exchange secret keys to connect again.',
      confirmText: 'Disconnect',
      cancelText: 'Keep Connected',
      type: 'danger',
    });
    if (!ok) return;

    try {
      await duoApi.leave();
      await refreshProfile();
      await fetchRequests();
      toast.love('Room disconnected.', 'Disconnected');
      setMessage({ type: 'success', text: 'Room disconnected.' });
    } catch (err: any) {
      toast.error(err.message || 'Failed to leave room.', 'Error');
      setMessage({ type: 'error', text: err.message || 'Failed to leave room.' });
    }
  };

  return (
    <div className="w-full flex justify-center px-4 sm:px-6 lg:px-8 py-6 sm:py-8 lg:py-12">
      {/* Centered Connection Room Content (~780–860px) */}
      <div className="w-full max-w-[840px] space-y-6 sm:space-y-8">
        {/* Active Connected Room Card */}
        {hasActiveDuo && partner ? (
          <div className="rounded-3xl border border-theme bg-theme-card p-6 sm:p-8 shadow-sm">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
              <div>
                <div className="inline-flex items-center space-x-2 rounded-full bg-[#00D26A]/10 border border-[#00D26A]/30 px-3.5 py-1 text-xs font-mono text-[#00D26A] mb-3">
                  <span className="h-2 w-2 rounded-full bg-[#00D26A] animate-pulse" />
                  <span>Room Linked & Active</span>
                </div>
                <h2 className="font-serif text-2xl sm:text-3xl lg:text-4xl font-bold text-theme-primary">
                  {profile?.name} <span className="text-[#5B58E6] font-light">&amp;</span> {partner.name}
                </h2>
                <p className="mt-2 text-xs sm:text-sm text-theme-secondary max-w-lg leading-relaxed">
                  Your private world is active. All chats, love notes, drawings, and daily reflections are shared only between the two of you.
                </p>
              </div>

              <button
                onClick={handleLeaveDuo}
                className="rounded-full border border-theme bg-theme-input px-5 py-2.5 text-xs sm:text-sm text-theme-secondary hover:border-[#F43F5E] hover:text-[#F43F5E] transition-all shrink-0"
              >
                Disconnect room
              </button>
            </div>
          </div>
        ) : null}

        {/* Alert Messages */}
        {message && (
          <div
            className={`flex items-center space-x-2.5 rounded-3xl border p-4 text-xs sm:text-sm ${
              message.type === 'success'
                ? 'border-[#00D26A]/30 bg-[#00D26A]/10 text-[#00D26A]'
                : 'border-[#F43F5E]/30 bg-[#F43F5E]/10 text-[#F43F5E]'
            }`}
          >
            {message.type === 'success' ? (
              <CheckCircle2 className="h-4 w-4 shrink-0 text-[#00D26A]" />
            ) : (
              <AlertCircle className="h-4 w-4 shrink-0 text-[#F43F5E]" />
            )}
            <span>{message.text}</span>
          </div>
        )}

        {/* Incoming Requests Banner */}
        {incomingRequests.length > 0 && (
          <div className="rounded-3xl border border-[#5B58E6]/30 bg-[#5B58E6]/10 p-6 shadow-sm">
            <div className="flex items-center space-x-2 mb-1.5">
              <Heart className="h-4 w-4 text-[#5B58E6] fill-current" />
              <h3 className="font-serif text-lg font-bold text-theme-primary">
                Incoming Pairing Request
              </h3>
            </div>
            <p className="text-xs sm:text-sm text-theme-secondary">
              Someone wants to link secret keys and create a private room with you.
            </p>

            <div className="mt-4 space-y-3">
              {incomingRequests.map((req) => (
                <div
                  key={req.id}
                  className="flex flex-col sm:flex-row items-start sm:items-center justify-between rounded-2xl border border-theme bg-theme-card p-4 gap-3 shadow-sm"
                >
                  <div>
                    <h4 className="text-xs sm:text-sm font-bold text-theme-primary">{req.sender.name}</h4>
                    <p className="text-xs text-theme-muted font-mono">{req.sender.email}</p>
                  </div>

                  <div className="flex items-center space-x-2 w-full sm:w-auto justify-end">
                    <button
                      onClick={() => handleAccept(req.id)}
                      disabled={isSubmitting}
                      className="rounded-full bg-[#5B58E6] px-5 py-2 text-xs font-medium text-white hover:bg-[#4A46DC] transition-all disabled:opacity-50 min-h-[38px] shadow-sm shadow-[#5B58E6]/25"
                    >
                      Accept & Link
                    </button>
                    <button
                      onClick={() => handleDecline(req.id)}
                      className="rounded-full border border-theme px-4 py-2 text-xs text-theme-muted hover:text-theme-primary min-h-[38px]"
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
          <div className="rounded-3xl border border-theme bg-theme-card p-6 sm:p-7 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono uppercase tracking-widest text-theme-muted">
                  Your Secret Key
                </span>
                <button
                  onClick={handleRegenerateCode}
                  title="Regenerate key"
                  className="text-theme-muted hover:text-theme-primary p-1.5 transition-colors rounded-full hover:bg-theme-input"
                >
                  <RefreshCw className="h-4 w-4" />
                </button>
              </div>

              <h3 className="mt-3.5 font-serif text-xl font-bold text-theme-primary">
                Share with your favorite
              </h3>
              <p className="mt-1 text-xs sm:text-sm text-theme-secondary leading-relaxed">
                Send this secret code to your partner so they can link directly to your space.
              </p>

              <div className="mt-6 rounded-3xl border border-theme bg-theme-input p-5 text-center shadow-inner">
                <span className="font-mono text-2xl sm:text-3xl font-bold tracking-widest text-theme-primary">
                  {profile?.duo_code || 'DUO-......'}
                </span>
              </div>
            </div>

            <div className="mt-6">
              <button
                onClick={handleCopyCode}
                className="w-full flex items-center justify-center space-x-2 rounded-full border border-theme bg-theme-input py-3 text-xs sm:text-sm font-medium text-theme-primary hover:bg-theme-card transition-all min-h-[42px]"
              >
                {copied ? <Check className="h-4 w-4 text-[#00D26A]" /> : <Copy className="h-4 w-4 text-theme-muted" />}
                <span>{copied ? 'Copied to clipboard' : 'Copy Secret Key'}</span>
              </button>
            </div>
          </div>

          {/* Card 2: Connect with Partner Key */}
          <div className="rounded-3xl border border-theme bg-theme-card p-6 sm:p-7 shadow-sm flex flex-col justify-between">
            <div>
              <span className="text-[10px] font-mono uppercase tracking-widest text-theme-muted">
                Enter Partner's Key
              </span>

              <h3 className="mt-3.5 font-serif text-xl font-bold text-theme-primary">
                Join partner's room
              </h3>
              <p className="mt-1 text-xs sm:text-sm text-theme-secondary leading-relaxed">
                Paste the secret key your partner shared with you to connect.
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
                    className="w-full rounded-full border border-theme bg-theme-input px-5 py-3 text-center font-mono text-lg font-bold tracking-widest text-theme-primary uppercase placeholder-theme-muted focus:border-[#5B58E6] focus:bg-theme-card focus:outline-none focus:ring-2 focus:ring-[#5B58E6]/20 disabled:opacity-40"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting || !partnerCode.trim() || hasActiveDuo}
                  className="flex w-full items-center justify-center space-x-2 rounded-full bg-[#5B58E6] py-3 text-xs sm:text-sm font-medium text-white hover:bg-[#4A46DC] transition-all disabled:opacity-40 min-h-[42px] shadow-sm shadow-[#5B58E6]/25"
                >
                  <span>{isSubmitting ? 'Linking...' : 'Send Pairing Request'}</span>
                  <ArrowRight className="h-4 w-4" />
                </button>
              </form>
            </div>

            {outgoingRequests.length > 0 && (
              <div className="mt-6 pt-4 border-t border-theme">
                <span className="text-xs font-mono text-theme-muted">Sent Request:</span>
                {outgoingRequests.map((req) => (
                  <div key={req.id} className="mt-2 flex items-center justify-between rounded-full bg-theme-input border border-theme px-4 py-2 text-xs">
                    <span className="text-theme-secondary">Sent to <strong className="text-theme-primary">{req.receiver.name}</strong></span>
                    <button
                      onClick={() => handleCancel(req.id)}
                      className="text-xs text-[#F43F5E] hover:underline font-mono"
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
