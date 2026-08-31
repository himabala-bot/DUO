'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { authApi, messagesApi, duoApi } from '@/lib/api';
import {
  X,
  User,
  Heart,
  MessageSquare,
  Moon,
  Sun,
  Laptop,
  Shield,
  Trash2,
  Copy,
  Check,
  RefreshCw,
  AlertTriangle,
  Lock,
  Calendar,
  Sparkles,
} from 'lucide-react';
import { format, parseISO } from 'date-fns';

interface ProfileSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateTab?: (tab: string) => void;
}

const AVATAR_OPTIONS = [
  '🕊️', '🌿', '☕', '🎨', '🌙', '🧸', '🌸', '✨', '🐾', '🍓', '💖', '🍫'
];

export const ProfileSettingsModal: React.FC<ProfileSettingsModalProps> = ({
  isOpen,
  onClose,
  onNavigateTab,
}) => {
  const { profile, partner, hasActiveDuo, refreshProfile, logout } = useAuth();

  const [activeSection, setActiveSection] = useState<'profile' | 'duo' | 'chat' | 'theme' | 'security'>('profile');

  // Form states
  const [name, setName] = useState(profile?.name || '');
  const [selectedAvatar, setSelectedAvatar] = useState(profile?.avatar_url || '🌸');
  const [customAvatarUrl, setCustomAvatarUrl] = useState('');
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileSaveSuccess, setProfileSaveSuccess] = useState(false);

  // Preference states
  const [enterToSend, setEnterToSend] = useState(profile?.enter_to_send ?? true);
  const [readReceipts, setReadReceipts] = useState(profile?.read_receipts ?? true);
  const [notificationsEnabled, setNotificationsEnabled] = useState(profile?.notifications_enabled ?? true);
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>(profile?.theme || 'system');

  // Copy code feedback
  const [copiedCode, setCopiedCode] = useState(false);

  // Password change state
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordStatus, setPasswordStatus] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  // Confirmation dialogs
  const [confirmLeaveDuo, setConfirmLeaveDuo] = useState(false);
  const [confirmClearChat, setConfirmClearChat] = useState(false);
  const [confirmDeleteAccount, setConfirmDeleteAccount] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  useEffect(() => {
    if (profile) {
      setName(profile.name || '');
      setSelectedAvatar(profile.avatar_url || '🌸');
      setEnterToSend(profile.enter_to_send ?? true);
      setReadReceipts(profile.read_receipts ?? true);
      setNotificationsEnabled(profile.notifications_enabled ?? true);
      setTheme((profile.theme as any) || 'system');
    }
  }, [profile]);

  if (!isOpen) return null;

  const handleSaveProfile = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!name.trim()) return;

    setIsSavingProfile(true);
    setProfileSaveSuccess(false);

    try {
      const avatarToSave = customAvatarUrl.trim() || selectedAvatar;
      await authApi.updateProfile({
        name: name.trim(),
        avatar_url: avatarToSave,
      });
      await refreshProfile();
      setProfileSaveSuccess(true);
      setTimeout(() => setProfileSaveSuccess(false), 3000);
    } catch (err: any) {
      alert(err.message || 'Failed to update profile.');
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleTogglePreference = async (
    key: 'enter_to_send' | 'read_receipts' | 'notifications_enabled',
    value: boolean
  ) => {
    if (key === 'enter_to_send') setEnterToSend(value);
    if (key === 'read_receipts') setReadReceipts(value);
    if (key === 'notifications_enabled') setNotificationsEnabled(value);

    try {
      await authApi.updateProfile({ [key]: value });
      await refreshProfile();
    } catch (err) {
      console.warn('Failed to save preference:', err);
    }
  };

  const handleSelectTheme = async (selected: 'light' | 'dark' | 'system') => {
    setTheme(selected);
    try {
      await authApi.updateProfile({ theme: selected });
      await refreshProfile();
    } catch (err) {
      console.warn('Failed to save theme:', err);
    }
  };

  const handleCopyCode = () => {
    if (!profile?.duo_code) return;
    navigator.clipboard.writeText(profile.duo_code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2500);
  };

  const handleRegenerateCode = async () => {
    if (!confirm('Regenerate your DUO key? Your previous key will no longer work.')) return;
    try {
      await duoApi.regenerateCode();
      await refreshProfile();
    } catch (err: any) {
      alert(err.message || 'Failed to regenerate key.');
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordStatus(null);

    if (newPassword.length < 6) {
      setPasswordStatus({ type: 'error', msg: 'Password must be at least 6 characters.' });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordStatus({ type: 'error', msg: 'Passwords do not match.' });
      return;
    }

    setPasswordLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;

      setPasswordStatus({ type: 'success', msg: 'Password updated successfully! 💕' });
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setPasswordStatus({ type: 'error', msg: err.message || 'Failed to update password.' });
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleLeaveDuo = async () => {
    setActionLoading(true);
    try {
      await duoApi.leave();
      await refreshProfile();
      setConfirmLeaveDuo(false);
      onClose();
      if (onNavigateTab) onNavigateTab('duo');
    } catch (err: any) {
      alert(err.message || 'Failed to disconnect room.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleClearChat = async () => {
    setActionLoading(true);
    try {
      const res = await messagesApi.clearHistory();
      if (profile?.active_duo_id) {
        const channel = supabase.channel(`chat:${profile.active_duo_id}`);
        channel.send({
          type: 'broadcast',
          event: 'messages_cleared',
          payload: {},
        });
      }
      setConfirmClearChat(false);
      setActionMessage({ type: 'success', msg: res.message || 'Chat history cleared.' });
      setTimeout(() => setActionMessage(null), 3500);
    } catch (err: any) {
      alert(err.message || 'Failed to clear chat.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== 'DELETE') return;
    setActionLoading(true);
    try {
      await authApi.deleteAccount();
      await logout();
      onClose();
    } catch (err: any) {
      alert(err.message || 'Failed to delete account.');
      setActionLoading(false);
    }
  };

  const connectedDateFormatted = profile?.connected_since
    ? format(parseISO(profile.connected_since), 'MMMM dd, yyyy')
    : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-3 sm:p-6 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-2xl rounded-3xl border-2 border-[#FCE1E8] bg-[#FFFFFF] shadow-[0_24px_64px_rgba(244,114,182,0.18)] overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Top Header */}
        <div className="flex items-center justify-between border-b border-[#FCE1E8] bg-gradient-to-r from-[#FFF5F7] to-[#FFF8F5] px-6 py-4 shrink-0">
          <div className="flex items-center space-x-2">
            <span className="text-xl">⚙️</span>
            <h2 className="font-serif text-xl sm:text-2xl font-bold text-[#2D2522]">Settings & Profile 💕</h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-2xl p-1.5 text-[#B2A49B] hover:text-[#E11D48] hover:bg-[#FFF0F3] transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Section Navigation Tabs */}
        <div className="flex border-b border-[#FCE1E8] bg-[#FFFDFC] px-4 sm:px-6 overflow-x-auto shrink-0 gap-1.5 scrollbar-none py-2">
          {[
            { id: 'profile', label: 'Identity', emoji: '🌸' },
            { id: 'duo', label: 'Connection', emoji: '💖' },
            { id: 'chat', label: 'Chat', emoji: '💬' },
            { id: 'theme', label: 'Theme', emoji: '🎨' },
            { id: 'security', label: 'Security', emoji: '🔒' },
          ].map((sec) => {
            const isActive = activeSection === sec.id;
            return (
              <button
                key={sec.id}
                onClick={() => setActiveSection(sec.id as any)}
                className={`flex items-center space-x-1.5 py-2 px-3.5 rounded-2xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap ${
                  isActive
                    ? 'bg-[#FFF0F3] text-[#E11D48] border border-[#FCE1E8] shadow-2xs'
                    : 'text-[#6D5E56] hover:bg-[#FFF5F7]'
                }`}
              >
                <span>{sec.emoji}</span>
                <span>{sec.label}</span>
              </button>
            );
          })}
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-7 space-y-6 bg-[#FFFFFF]">
          {/* Action Message Banner */}
          {actionMessage && (
            <div
              className={`flex items-center space-x-2 rounded-2xl p-3.5 text-xs font-bold ${
                actionMessage.type === 'success' ? 'bg-[#DCFCE7] text-[#15803D] border border-[#BBF7D0]' : 'bg-[#FFF0F3] text-[#E11D48] border border-[#FCE1E8]'
              }`}
            >
              <Check className="h-4 w-4" />
              <span>{actionMessage.msg}</span>
            </div>
          )}

          {/* SECTION 1: PROFILE / IDENTITY */}
          {activeSection === 'profile' && (
            <div className="space-y-6">
              {/* Profile Card */}
              <div className="rounded-3xl border-2 border-[#FCE1E8] bg-gradient-to-r from-[#FFF5F7] to-[#FFF9F5] p-5 flex flex-col sm:flex-row items-center gap-5">
                <div className="flex h-16 w-16 items-center justify-center rounded-3xl border-2 border-[#FCE1E8] bg-[#FFFFFF] text-3xl shadow-xs shrink-0">
                  {selectedAvatar.startsWith('http') ? (
                    <img src={selectedAvatar} alt="Avatar" className="h-full w-full object-cover rounded-3xl" />
                  ) : (
                    <span>{selectedAvatar || '🌸'}</span>
                  )}
                </div>

                <div className="flex-1 text-center sm:text-left">
                  <h3 className="font-serif text-xl font-bold text-[#2D2522]">{profile?.name}</h3>
                  <p className="text-xs font-mono text-[#B2A49B]">{profile?.email}</p>
                  <div className="mt-2 inline-flex items-center space-x-1.5 rounded-full bg-[#FFFFFF] border border-[#FCE1E8] px-3.5 py-0.5 text-xs font-mono text-[#E11D48]">
                    <span className={`h-2 w-2 rounded-full ${hasActiveDuo ? 'bg-[#22C55E]' : 'bg-[#D1C2B8]'}`} />
                    <span>{hasActiveDuo ? `Paired with ${partner?.name || 'Partner'} 💕` : 'Unconnected Room'}</span>
                  </div>
                </div>
              </div>

              {/* Avatar Selector */}
              <div>
                <label className="block text-xs font-mono uppercase tracking-widest text-[#B2A49B] font-bold mb-2.5">
                  Choose Cute Avatar Icon 💕
                </label>
                <div className="grid grid-cols-6 sm:grid-cols-12 gap-2">
                  {AVATAR_OPTIONS.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => {
                        setSelectedAvatar(emoji);
                        setCustomAvatarUrl('');
                      }}
                      className={`h-11 w-full rounded-2xl border-2 flex items-center justify-center text-xl transition-all hover:scale-110 ${
                        selectedAvatar === emoji
                          ? 'border-[#FF758C] bg-[#FFF0F3] shadow-xs'
                          : 'border-[#F4EBE6] bg-[#FFFDFC]'
                      }`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>

              {/* Edit Form */}
              <form onSubmit={handleSaveProfile} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-[#6D5E56] mb-1.5">Display Name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Your name"
                    className="w-full rounded-2xl border-2 border-[#FCE1E8] bg-[#FFFDFC] px-4 py-2.5 text-xs sm:text-sm text-[#2D2522] focus:border-[#FF758C] focus:bg-[#FFFFFF] focus:outline-none focus:ring-2 focus:ring-[#FF758C]/20"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#6D5E56] mb-1.5">Custom Photo URL (optional)</label>
                  <input
                    type="url"
                    value={customAvatarUrl}
                    onChange={(e) => setCustomAvatarUrl(e.target.value)}
                    placeholder="https://example.com/cute-photo.jpg"
                    className="w-full rounded-2xl border-2 border-[#FCE1E8] bg-[#FFFDFC] px-4 py-2.5 text-xs text-[#2D2522] focus:border-[#FF758C] focus:bg-[#FFFFFF] focus:outline-none focus:ring-2 focus:ring-[#FF758C]/20"
                  />
                </div>

                <div className="flex items-center justify-between pt-2">
                  {profileSaveSuccess && (
                    <span className="text-xs font-mono text-[#15803D] font-bold flex items-center gap-1">
                      <Check className="h-4 w-4" /> Profile updated with love! 💕
                    </span>
                  )}
                  <button
                    type="submit"
                    disabled={isSavingProfile || !name.trim()}
                    className="ml-auto flex items-center space-x-2 rounded-2xl bg-gradient-to-r from-[#FF758C] to-[#FF7EB3] px-6 py-2.5 text-xs sm:text-sm font-bold text-white hover:scale-102 hover:shadow-[0_4px_16px_rgba(255,117,140,0.35)] disabled:opacity-40 transition-all shadow-sm"
                  >
                    <span>{isSavingProfile ? 'Saving...' : 'Save Profile 💕'}</span>
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* SECTION 2: DUO CONNECTION */}
          {activeSection === 'duo' && (
            <div className="space-y-6">
              {/* Partner Card */}
              {hasActiveDuo && partner ? (
                <div className="rounded-3xl border-2 border-[#FCE1E8] bg-gradient-to-r from-[#FFF5F7] to-[#FFF9F5] p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono uppercase tracking-widest text-[#B2A49B] font-bold">My Favorite Person 💕</span>
                    <span className="text-xs font-mono text-[#15803D] font-bold flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-[#22C55E] animate-ping" />
                      Connected
                    </span>
                  </div>

                  <div className="flex items-center space-x-4">
                    <div className="flex h-14 w-14 items-center justify-center rounded-3xl bg-[#FFFFFF] border-2 border-[#FCE1E8] text-2xl shadow-xs">
                      {partner.avatar_url?.startsWith('http') ? (
                        <img src={partner.avatar_url} alt={partner.name} className="h-full w-full object-cover rounded-3xl" />
                      ) : (
                        <span>{partner.avatar_url || '💖'}</span>
                      )}
                    </div>
                    <div>
                      <h4 className="font-serif text-lg font-bold text-[#2D2522]">{partner.name}</h4>
                      <p className="text-xs font-mono text-[#7A6D65]">{partner.email}</p>
                    </div>
                  </div>

                  {connectedDateFormatted && (
                    <div className="flex items-center space-x-2 text-xs font-mono text-[#E11D48] pt-2 border-t border-[#FCE1E8]">
                      <Calendar className="h-4 w-4" />
                      <span>Connected since {connectedDateFormatted} 💕</span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="rounded-3xl border-2 border-[#FCE1E8] bg-[#FFF5F7] p-6 text-center">
                  <p className="text-xs sm:text-sm text-[#7A6D65]">
                    You are not currently paired in an active room.
                  </p>
                  {onNavigateTab && (
                    <button
                      onClick={() => {
                        onClose();
                        onNavigateTab('duo');
                      }}
                      className="mt-3 inline-flex items-center space-x-2 rounded-2xl bg-gradient-to-r from-[#FF758C] to-[#FF7EB3] px-5 py-2 text-xs font-bold text-white shadow-xs"
                    >
                      <span>Go to Room Key & Pairing 💕</span>
                    </button>
                  )}
                </div>
              )}

              {/* Your Duo Key Card */}
              <div className="rounded-3xl border-2 border-[#FCE1E8] bg-[#FFFFFF] p-5 shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono uppercase tracking-widest text-[#B2A49B] font-bold">Your Room Key 🗝️</span>
                  <button
                    onClick={handleRegenerateCode}
                    title="Regenerate key"
                    className="p-1.5 text-[#B2A49B] hover:text-[#E11D48] rounded-xl hover:bg-[#FFF0F3]"
                  >
                    <RefreshCw className="h-4 w-4" />
                  </button>
                </div>

                <div className="rounded-2xl border-2 border-dashed border-[#FCE1E8] bg-[#FFF5F7] p-4 text-center">
                  <span className="font-mono text-2xl font-bold tracking-widest text-[#E11D48]">
                    {profile?.duo_code}
                  </span>
                </div>

                <button
                  onClick={handleCopyCode}
                  className="w-full flex items-center justify-center space-x-2 rounded-2xl border-2 border-[#FCE1E8] bg-[#FFFDFC] py-2.5 text-xs sm:text-sm font-bold text-[#E11D48] hover:bg-[#FFF0F3] transition-all"
                >
                  {copiedCode ? <Check className="h-4 w-4 text-[#15803D]" /> : <Copy className="h-4 w-4 text-[#E11D48]" />}
                  <span>{copiedCode ? 'Key copied to clipboard! 💕' : 'Copy Room Key'}</span>
                </button>
              </div>

              {/* Disconnect / Leave Duo */}
              {hasActiveDuo && (
                <div className="rounded-3xl border-2 border-[#FCE1E8] bg-[#FFF5F7] p-5 space-y-3">
                  <h4 className="text-xs font-bold text-[#E11D48] uppercase tracking-wider font-mono">
                    Disconnect Room
                  </h4>
                  <p className="text-xs text-[#7A6D65]">
                    Disconnecting will un-pair you and {partner?.name}. You will need to exchange keys to connect again.
                  </p>

                  {!confirmLeaveDuo ? (
                    <button
                      onClick={() => setConfirmLeaveDuo(true)}
                      className="rounded-2xl border border-[#FCE1E8] bg-[#FFFFFF] px-4 py-2 text-xs font-bold text-[#E11D48] hover:bg-[#FFE4E8] transition-all"
                    >
                      Disconnect from Duo
                    </button>
                  ) : (
                    <div className="space-y-2 pt-2">
                      <p className="text-xs font-bold text-[#E11D48]">
                        Are you sure you want to disconnect?
                      </p>
                      <div className="flex gap-2">
                        <button
                          onClick={handleLeaveDuo}
                          disabled={actionLoading}
                          className="rounded-2xl bg-[#E11D48] px-4 py-2 text-xs font-bold text-white hover:bg-[#BE123C] transition-all disabled:opacity-50"
                        >
                          {actionLoading ? 'Disconnecting...' : 'Yes, Disconnect'}
                        </button>
                        <button
                          onClick={() => setConfirmLeaveDuo(false)}
                          className="rounded-2xl border border-[#F4EBE6] bg-[#FFFFFF] px-3 py-2 text-xs text-[#6D5E56]"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* SECTION 3: CHAT PREFERENCES */}
          {activeSection === 'chat' && (
            <div className="space-y-6">
              <div className="space-y-4">
                {/* Enter to Send Toggle */}
                <div className="flex items-center justify-between rounded-3xl border-2 border-[#FCE1E8] bg-[#FFFDFC] p-4">
                  <div>
                    <h4 className="text-xs sm:text-sm font-bold text-[#2D2522]">Press Enter to Send 💕</h4>
                    <p className="text-xs text-[#7A6D65]">
                      When enabled, pressing <kbd className="font-mono bg-[#FFF0F3] px-1.5 py-0.5 rounded border border-[#FCE1E8] text-[10px] text-[#E11D48]">Enter</kbd> sends the note immediately.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleTogglePreference('enter_to_send', !enterToSend)}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      enterToSend ? 'bg-[#E11D48]' : 'bg-[#D1C2B8]'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                        enterToSend ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                {/* Read Receipts Toggle */}
                <div className="flex items-center justify-between rounded-3xl border-2 border-[#FCE1E8] bg-[#FFFDFC] p-4">
                  <div>
                    <h4 className="text-xs sm:text-sm font-bold text-[#2D2522]">Read Receipts 💕</h4>
                    <p className="text-xs text-[#7A6D65]">
                      Show sweet double checks when notes are read by your partner.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleTogglePreference('read_receipts', !readReceipts)}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      readReceipts ? 'bg-[#E11D48]' : 'bg-[#D1C2B8]'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                        readReceipts ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                {/* Message Notifications Toggle */}
                <div className="flex items-center justify-between rounded-3xl border-2 border-[#FCE1E8] bg-[#FFFDFC] p-4">
                  <div>
                    <h4 className="text-xs sm:text-sm font-bold text-[#2D2522]">In-App Popup Alerts 💌</h4>
                    <p className="text-xs text-[#7A6D65]">
                      Display sweet real-time toasts when new doodles and love notes arrive.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleTogglePreference('notifications_enabled', !notificationsEnabled)}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      notificationsEnabled ? 'bg-[#E11D48]' : 'bg-[#D1C2B8]'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                        notificationsEnabled ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              </div>

              {/* Clear Chat History */}
              <div className="rounded-3xl border-2 border-[#FCE1E8] bg-[#FFFFFF] p-5 space-y-3">
                <div className="flex items-center space-x-2">
                  <Trash2 className="h-4 w-4 text-[#E11D48]" />
                  <h4 className="text-xs sm:text-sm font-bold text-[#2D2522]">Clear Whisper Chat History</h4>
                </div>
                <p className="text-xs text-[#7A6D65] leading-relaxed">
                  Permanently remove all messages exchanged in this DUO room.
                </p>

                {!confirmClearChat ? (
                  <button
                    onClick={() => setConfirmClearChat(true)}
                    className="rounded-2xl border border-[#FCE1E8] bg-[#FFF5F7] px-4 py-2 text-xs font-bold text-[#E11D48] hover:bg-[#FFE4E8] transition-all"
                  >
                    Clear All Notes
                  </button>
                ) : (
                  <div className="rounded-2xl border-2 border-[#FCE1E8] bg-[#FFF5F7] p-4 space-y-2.5">
                    <p className="text-xs font-bold text-[#E11D48]">
                      Are you sure? This will delete chat messages for both of you.
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={handleClearChat}
                        disabled={actionLoading}
                        className="rounded-2xl bg-[#E11D48] px-4 py-2 text-xs font-bold text-white hover:bg-[#BE123C] transition-all disabled:opacity-50"
                      >
                        {actionLoading ? 'Clearing...' : 'Yes, Delete Everything'}
                      </button>
                      <button
                        onClick={() => setConfirmClearChat(false)}
                        className="rounded-2xl border border-[#F4EBE6] bg-[#FFFFFF] px-3 py-2 text-xs text-[#6D5E56]"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* SECTION 4: THEME */}
          {activeSection === 'theme' && (
            <div className="space-y-6">
              <div>
                <h3 className="font-serif text-xl font-bold text-[#2D2522]">Theme & Appearance 💕</h3>
                <p className="text-xs text-[#7A6D65] mt-1">
                  Choose how DUO looks on your device.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {[
                  { id: 'light', label: 'Sweet Cream', desc: 'Warm ivory & strawberry blush', icon: Sun },
                  { id: 'dark', label: 'Nocturnal Love', desc: 'Muted slate & cozy warmth', icon: Moon },
                  { id: 'system', label: 'Device Default', desc: 'Syncs with your phone/laptop', icon: Laptop },
                ].map((item) => {
                  const Icon = item.icon;
                  const isSelected = theme === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleSelectTheme(item.id as any)}
                      className={`flex flex-col items-start p-4 rounded-3xl border-2 text-left transition-all ${
                        isSelected
                          ? 'border-[#FF758C] bg-[#FFF0F3] shadow-xs scale-105'
                          : 'border-[#F4EBE6] bg-[#FFFFFF] hover:bg-[#FFF5F7]'
                      }`}
                    >
                      <div className="flex items-center justify-between w-full mb-3">
                        <Icon className={`h-5 w-5 ${isSelected ? 'text-[#E11D48]' : 'text-[#B2A49B]'}`} />
                        {isSelected && <Check className="h-4 w-4 text-[#15803D]" />}
                      </div>
                      <span className="text-xs sm:text-sm font-bold text-[#2D2522]">{item.label}</span>
                      <span className="text-[11px] text-[#7A6D65] mt-1 leading-snug">{item.desc}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* SECTION 5: SECURITY */}
          {activeSection === 'security' && (
            <div className="space-y-6">
              {/* Account Status Card */}
              <div className="rounded-3xl border-2 border-[#FCE1E8] bg-[#FFF5F7] p-5 space-y-3">
                <span className="text-[10px] font-mono uppercase tracking-widest text-[#B2A49B] font-bold">Authentication</span>
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-[#2D2522]">{profile?.email}</span>
                    <p className="text-[11px] text-[#7A6D65] mt-0.5">Encrypted with Supabase Auth</p>
                  </div>
                  <span className="inline-flex items-center gap-1 rounded-full bg-[#DCFCE7] border border-[#BBF7D0] px-3 py-0.5 text-[10px] font-mono text-[#15803D] font-bold">
                    <Check className="h-3 w-3" /> Active
                  </span>
                </div>
              </div>

              {/* Change Password Form */}
              <form onSubmit={handleChangePassword} className="rounded-3xl border-2 border-[#FCE1E8] bg-[#FFFFFF] p-5 space-y-4 shadow-xs">
                <div className="flex items-center space-x-2">
                  <Lock className="h-4 w-4 text-[#E11D48]" />
                  <h4 className="text-xs sm:text-sm font-bold text-[#2D2522]">Change Password</h4>
                </div>

                {passwordStatus && (
                  <div
                    className={`rounded-2xl p-3 text-xs font-bold ${
                      passwordStatus.type === 'success' ? 'bg-[#DCFCE7] text-[#15803D] border border-[#BBF7D0]' : 'bg-[#FFF0F3] text-[#E11D48] border border-[#FCE1E8]'
                    }`}
                  >
                    {passwordStatus.msg}
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-[#6D5E56] mb-1">New Password</label>
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="••••••••"
                      minLength={6}
                      className="w-full rounded-2xl border-2 border-[#FCE1E8] bg-[#FFFDFC] px-3.5 py-2 text-xs text-[#2D2522] focus:border-[#FF758C] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-[#6D5E56] mb-1">Confirm Password</label>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      minLength={6}
                      className="w-full rounded-2xl border-2 border-[#FCE1E8] bg-[#FFFDFC] px-3.5 py-2 text-xs text-[#2D2522] focus:border-[#FF758C] focus:outline-none"
                    />
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={passwordLoading || !newPassword || !confirmPassword}
                    className="rounded-2xl bg-gradient-to-r from-[#FF758C] to-[#FF7EB3] px-5 py-2 text-xs font-bold text-white hover:scale-102 disabled:opacity-40 transition-all shadow-xs"
                  >
                    {passwordLoading ? 'Updating...' : 'Update Password 💕'}
                  </button>
                </div>
              </form>

              {/* Danger Zone */}
              <div className="rounded-3xl border-2 border-[#FCE1E8] bg-[#FFF5F7] p-5 space-y-3">
                <div className="flex items-center space-x-2">
                  <AlertTriangle className="h-4 w-4 text-[#E11D48]" />
                  <h4 className="text-xs sm:text-sm font-bold text-[#E11D48] uppercase tracking-wider font-mono">
                    Danger Zone &mdash; Delete Account
                  </h4>
                </div>
                <p className="text-xs text-[#7A6D65] leading-relaxed">
                  Permanently delete your DUO account, disconnect from your room, and erase all profile records.
                </p>

                {!confirmDeleteAccount ? (
                  <button
                    onClick={() => setConfirmDeleteAccount(true)}
                    className="rounded-2xl bg-[#E11D48] px-4 py-2 text-xs font-bold text-white hover:bg-[#BE123C] transition-all shadow-xs"
                  >
                    Delete Account
                  </button>
                ) : (
                  <div className="rounded-2xl border-2 border-[#FCE1E8] bg-[#FFFFFF] p-4 space-y-3 shadow-xs">
                    <p className="text-xs font-bold text-[#E11D48]">
                      Type <strong>DELETE</strong> to confirm permanent account deletion:
                    </p>
                    <input
                      type="text"
                      value={deleteConfirmText}
                      onChange={(e) => setDeleteConfirmText(e.target.value)}
                      placeholder="Type DELETE"
                      className="w-full rounded-xl border-2 border-[#FCE1E8] px-3.5 py-2 text-xs font-mono text-[#E11D48] focus:outline-none"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={handleDeleteAccount}
                        disabled={deleteConfirmText !== 'DELETE' || actionLoading}
                        className="rounded-xl bg-[#E11D48] px-4 py-2 text-xs font-bold text-white hover:bg-[#BE123C] disabled:opacity-40 transition-all"
                      >
                        {actionLoading ? 'Deleting...' : 'Permanently Delete Account'}
                      </button>
                      <button
                        onClick={() => {
                          setConfirmDeleteAccount(false);
                          setDeleteConfirmText('');
                        }}
                        className="rounded-xl border border-[#F4EBE6] px-3 py-2 text-xs text-[#6D5E56]"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
