'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { duoApi } from '@/lib/api';
import { ConnectionRequest } from '@/types';
import { QRPairingModal } from './QRPairingModal';
import {
  KeyRound,
  QrCode,
  Copy,
  Check,
  RefreshCw,
  ArrowRight,
  Heart,
  AlertCircle,
  CheckCircle2,
  Sparkles,
  Smartphone,
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
  const [showQRModal, setShowQRModal] = useState(false);

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
    <div className="w-full flex justify-center px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
      {/* Centered Connection Room Content (~780–840px) */}
      <div className="w-full max-w-3xl space-y-5">
        {/* Active Connected Room Card */}
        {hasActiveDuo && partner ? (
          <div className="rounded-2xl border border-theme bg-theme-card p-5 sm:p-6 shadow-xs">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <div className="inline-flex items-center space-x-1.5 rounded-full px-3 py-0.5 text-[11px] font-mono text-[#00D26A] bg-[#00D26A]/10 border border-[#00D26A]/25 mb-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#00D26A]" />
                  <span>Room Linked & Active</span>
                </div>
                <h2 className="font-serif text-xl sm:text-2xl font-bold text-theme-primary">
                  {profile?.name} <span className="text-[#125CB9] font-normal">&amp;</span> {partner.name}
                </h2>
                <p className="mt-1 text-xs text-theme-secondary max-w-lg leading-relaxed">
                  Your private world is active. All chats, love notes, drawings, and daily reflections are shared only between the two of you.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowQRModal(true)}
                  className="flex items-center space-x-1.5 rounded-full border border-theme bg-theme-input px-3.5 py-1.5 text-xs text-theme-primary hover:bg-theme-card transition-colors shrink-0 shadow-xs"
                  title="Generate QR code to pair another device"
                >
                  <QrCode className="h-3.5 w-3.5 text-[#125CB9]" />
                  <span>Pair device (QR)</span>
                </button>

                <button
                  onClick={handleLeaveDuo}
                  className="rounded-full border border-theme bg-theme-input px-4 py-1.5 text-xs text-theme-secondary hover:border-[#F43F5E] hover:text-[#F43F5E] transition-colors shrink-0"
                >
                  Disconnect room
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* Unpaired Hero Card: Native Pairing Entry */
          <div className="rounded-3xl border border-theme bg-theme-card p-6 sm:p-8 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="text-center sm:text-left space-y-1.5 max-w-md">
              <h2 className="font-serif text-2xl sm:text-3xl font-bold text-theme-primary">
                Connect your Duo
              </h2>
              <p className="text-xs sm:text-sm text-theme-secondary leading-relaxed">
                Pair with your partner or link your phone by scanning a QR code.
              </p>
            </div>

            <div className="shrink-0 flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
              <button
                type="button"
                onClick={() => setShowQRModal(true)}
                className="flex items-center justify-center space-x-2 rounded-full bg-[#125CB9] px-6 py-3 text-xs sm:text-sm font-semibold text-white hover:bg-[#0E4B99] transition-all shadow-xs active:scale-98"
              >
                <QrCode className="h-4 w-4" />
                <span>Create a Duo</span>
              </button>
            </div>
          </div>
        )}

        {/* Alert Messages */}
        {message && (
          <div
            className={`flex items-center space-x-2 rounded-2xl border p-3.5 text-xs ${
              message.type === 'success'
                ? 'border-[#00D26A]/25 bg-[#00D26A]/10 text-[#00D26A]'
                : 'border-[#F43F5E]/25 bg-[#F43F5E]/10 text-[#F43F5E]'
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
          <div className="rounded-2xl border border-[#125CB9]/25 bg-[#125CB9]/10 p-4 sm:p-5 shadow-xs">
            <div className="flex items-center space-x-2 mb-1">
              <Heart className="h-3.5 w-3.5 text-[#125CB9] fill-current" />
              <h3 className="font-serif text-sm font-bold text-theme-primary">
                Incoming Pairing Request
              </h3>
            </div>
            <p className="text-xs text-theme-secondary">
              Someone wants to link secret keys and create a private room with you.
            </p>

            <div className="mt-3 space-y-2">
              {incomingRequests.map((req) => (
                <div
                  key={req.id}
                  className="flex flex-col sm:flex-row items-start sm:items-center justify-between rounded-xl border border-theme bg-theme-card p-3.5 gap-2.5 shadow-xs"
                >
                  <div>
                    <h4 className="text-xs font-bold text-theme-primary">{req.sender.name}</h4>
                    <p className="text-[11px] text-theme-muted font-mono">{req.sender.email}</p>
                  </div>

                  <div className="flex items-center space-x-2 w-full sm:w-auto justify-end">
                    <button
                      onClick={() => handleAccept(req.id)}
                      disabled={isSubmitting}
                      className="rounded-full bg-[#125CB9] px-4 py-1.5 text-xs font-medium text-white hover:bg-[#0E4B99] transition-colors disabled:opacity-50 shadow-xs"
                    >
                      Accept & Link
                    </button>
                    <button
                      onClick={() => handleDecline(req.id)}
                      className="rounded-full border border-theme px-3.5 py-1.5 text-xs text-theme-muted hover:text-theme-primary"
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
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Card 1: Your Key */}
          <div className="rounded-2xl border border-theme bg-theme-card p-5 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono uppercase tracking-wider text-theme-muted font-medium">
                  Your Secret Key
                </span>
                <button
                  onClick={handleRegenerateCode}
                  title="Regenerate key"
                  className="text-theme-muted hover:text-theme-primary p-1.5 transition-colors rounded-full hover:bg-theme-input"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                </button>
              </div>

              <h3 className="mt-2 font-serif text-base font-bold text-theme-primary">
                Share with your favorite
              </h3>
              <p className="mt-0.5 text-xs text-theme-secondary leading-relaxed">
                Send this secret code to your partner so they can link directly to your space.
              </p>

              <div className="mt-4 rounded-xl border border-theme bg-theme-input p-3 text-center">
                <span className="font-mono text-xl sm:text-2xl font-bold tracking-widest text-theme-primary">
                  {profile?.duo_code || 'DUO-......'}
                </span>
              </div>
            </div>

            <div className="mt-4">
              <button
                onClick={handleCopyCode}
                className="w-full flex items-center justify-center space-x-1.5 rounded-full border border-theme bg-theme-input py-2 text-xs font-medium text-theme-primary hover:bg-theme-card transition-colors"
              >
                {copied ? <Check className="h-3.5 w-3.5 text-[#00D26A]" /> : <Copy className="h-3.5 w-3.5 text-theme-muted" />}
                <span>{copied ? 'Copied to clipboard' : 'Copy Secret Key'}</span>
              </button>
            </div>
          </div>

          {/* Card 2: Connect with Partner Key */}
          <div className="rounded-2xl border border-theme bg-theme-card p-5 shadow-xs flex flex-col justify-between">
            <div>
              <span className="text-[10px] font-mono uppercase tracking-wider text-theme-muted font-medium">
                Enter Partner's Key
              </span>

              <h3 className="mt-2 font-serif text-base font-bold text-theme-primary">
                Join partner's room
              </h3>
              <p className="mt-0.5 text-xs text-theme-secondary leading-relaxed">
                Paste the secret key or 6-digit pairing code from your second device.
              </p>

              <form onSubmit={handleConnect} className="mt-4 space-y-3">
                <div>
                  <input
                    type="text"
                    value={partnerCode}
                    onChange={(e) => setPartnerCode(e.target.value.toUpperCase())}
                    placeholder="e.g. DUO-7K4P2M or 7K4P2M"
                    maxLength={15}
                    disabled={hasActiveDuo}
                    className="w-full rounded-xl border border-theme bg-theme-input px-3 py-2 text-center font-mono text-base font-bold tracking-widest text-theme-primary uppercase placeholder-theme-muted focus:border-[#125CB9] focus:bg-theme-card focus:outline-none disabled:opacity-40"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting || !partnerCode.trim() || hasActiveDuo}
                  className="flex w-full items-center justify-center space-x-1.5 rounded-full bg-[#125CB9] py-2.5 text-xs font-medium text-white hover:bg-[#0E4B99] transition-colors disabled:opacity-40 shadow-xs"
                >
                  <span>{isSubmitting ? 'Linking...' : 'Send Pairing Request'}</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </form>
            </div>

            {outgoingRequests.length > 0 && (
              <div className="mt-4 pt-3 border-t border-theme">
                <span className="text-[10px] font-mono text-theme-muted">Sent Request:</span>
                {outgoingRequests.map((req) => (
                  <div key={req.id} className="mt-1.5 flex items-center justify-between rounded-xl bg-theme-input border border-theme px-3 py-1.5 text-xs">
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

      {/* QR Pairing Modal */}
      <QRPairingModal
        isOpen={showQRModal}
        onClose={() => setShowQRModal(false)}
        onPaired={() => refreshProfile()}
      />
    </div>
  );
};
