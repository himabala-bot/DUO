'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
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
  Mail,
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
  '🌸', '🍓', '🧸', '💌', '✨', '☕', '🕊️', '🐱', '🥑', '🌙', '🎨', '🐾'
];

export const ProfileSettingsModal: React.FC<ProfileSettingsModalProps> = ({
  isOpen,
  onClose,
  onNavigateTab,
}) => {
  const { profile, partner, hasActiveDuo, refreshProfile, logout } = useAuth();
  const { toast, confirm: confirmModal } = useToast();

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

  // Save Profile (Name & Avatar)
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
      toast.love('Profile updated with love 💕', 'Profile Saved');
      setTimeout(() => setProfileSaveSuccess(false), 3000);
    } catch (err: any) {
      toast.error(err.message || 'Failed to update profile.', 'Error');
    } finally {
      setIsSavingProfile(false);
    }
  };

  // Toggle Preference
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

  // Switch Theme
  const handleSelectTheme = async (selected: 'light' | 'dark' | 'system') => {
    setTheme(selected);
    try {
      await authApi.updateProfile({ theme: selected });
      await refreshProfile();
    } catch (err) {
      console.warn('Failed to save theme:', err);
    }
  };

  // Copy Duo Key
  const handleCopyCode = () => {
    if (!profile?.duo_code) return;
    navigator.clipboard.writeText(profile.duo_code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2500);
  };

  // Regenerate Duo Key
  const handleRegenerateCode = async () => {
    const ok = await confirmModal({
      title: 'Regenerate Secret Key?',
      message: 'Your previous key will no longer work. You will get a fresh key to share.',
      confirmText: 'Generate New Key',
      cancelText: 'Keep Current',
      type: 'warning',
    });
    if (!ok) return;

    try {
      await duoApi.regenerateCode();
      await refreshProfile();
      toast.love('New secret key generated ✨', 'Key Updated');
    } catch (err: any) {
      toast.error(err.message || 'Failed to regenerate key.', 'Error');
    }
  };

  // Change Password
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

      setPasswordStatus({ type: 'success', msg: 'Password updated successfully ✨' });
      toast.love('Password updated successfully ✨', 'Security');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setPasswordStatus({ type: 'error', msg: err.message || 'Failed to update password.' });
      toast.error(err.message || 'Failed to update password.', 'Error');
    } finally {
      setPasswordLoading(false);
    }
  };

  // Leave Duo Room
  const handleLeaveDuo = async () => {
    setActionLoading(true);
    try {
      await duoApi.leave();
      await refreshProfile();
      setConfirmLeaveDuo(false);
      onClose();
      toast.love('Room disconnected.', 'Room Status');
      if (onNavigateTab) onNavigateTab('duo');
    } catch (err: any) {
      toast.error(err.message || 'Failed to disconnect room.', 'Error');
    } finally {
      setActionLoading(false);
    }
  };

  // Clear Chat History
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
      toast.love('Chat history cleared for both partners.', 'Chat Cleared');
      setTimeout(() => setActionMessage(null), 3500);
    } catch (err: any) {
      toast.error(err.message || 'Failed to clear chat.', 'Error');
    } finally {
      setActionLoading(false);
    }
  };

  // Delete Account
  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== 'DELETE') return;
    setActionLoading(true);
    try {
      await authApi.deleteAccount();
      await logout();
      onClose();
      toast.love('Account deleted successfully.', 'Goodbye');
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete account.', 'Error');
      setActionLoading(false);
    }
  };

  const connectedDateFormatted = profile?.connected_since
    ? format(parseISO(profile.connected_since), 'MMMM dd, yyyy')
    : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-3 sm:p-6 backdrop-blur-[3px] overflow-y-auto">
      <div className="relative w-full max-w-2xl rounded-3xl border border-[#EFE8DC] bg-[#FFFFFF] shadow-[0_16px_48px_rgba(66,47,14,0.12)] overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Top Header */}
        <div className="flex items-center justify-between border-b border-[#EFE8DC] bg-[#FAF7F2] px-6 py-4 shrink-0">
          <div className="flex items-center space-x-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#FCC4C0] text-[#EA5E86]">
              <Heart className="h-3.5 w-3.5 fill-current" />
            </span>
            <h2 className="font-serif text-xl sm:text-2xl font-normal text-[#422F0E]">Room Settings</h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-1.5 text-[#A89F91] hover:text-[#422F0E] hover:bg-[#F2ECE1] transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Section Navigation Tabs */}
        <div className="flex border-b border-[#EFE8DC] bg-[#FAF7F2] px-4 sm:px-6 overflow-x-auto shrink-0 gap-1.5 scrollbar-none py-2">
          {[
            { id: 'profile', label: 'Profile', icon: User },
            { id: 'duo', label: 'Our Space', icon: Heart },
            { id: 'chat', label: 'Chat', icon: MessageSquare },
            { id: 'theme', label: 'Theme', icon: Sun },
            { id: 'security', label: 'Security', icon: Shield },
          ].map((sec) => {
            const Icon = sec.icon;
            const isActive = activeSection === sec.id;
            return (
              <button
                key={sec.id}
                onClick={() => setActiveSection(sec.id as any)}
                className={`flex items-center space-x-2 py-2 px-3.5 text-xs sm:text-sm font-medium rounded-full transition-all whitespace-nowrap ${
                  isActive
                    ? 'bg-[#422F0E] text-[#FAF7F2] font-semibold shadow-sm'
                    : 'text-[#6B5E4E] hover:bg-[#F2ECE1]'
                }`}
              >
                <Icon className={`h-3.5 w-3.5 ${isActive ? 'text-[#FCC4C0]' : 'text-[#A89F91]'}`} />
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
              className={`flex items-center space-x-2 rounded-2xl p-3.5 text-xs ${
                actionMessage.type === 'success' ? 'bg-[#F5FBEF] text-[#037F71] border border-[#DDF2B8]' : 'bg-[#FFF5F5] text-[#EA5E86] border border-[#FCC4C0]'
              }`}
            >
              <Check className="h-4 w-4" />
              <span>{actionMessage.msg}</span>
            </div>
          )}

          {/* SECTION 1: PROFILE */}
          {activeSection === 'profile' && (
            <div className="space-y-6">
              {/* Profile Card & Avatar */}
              <div className="rounded-3xl border border-[#EFE8DC] bg-[#FAF7F2] p-5 flex flex-col sm:flex-row items-center gap-5">
                <div className="flex h-16 w-16 items-center justify-center rounded-3xl border border-[#E5DAC9] bg-[#FFFFFF] text-3xl shadow-sm shrink-0">
                  {selectedAvatar.startsWith('http') || selectedAvatar.startsWith('data:') ? (
                    <img src={selectedAvatar} alt="Avatar" className="h-full w-full object-cover rounded-3xl" />
                  ) : (
                    <span>{selectedAvatar || '🌸'}</span>
                  )}
                </div>

                <div className="flex-1 text-center sm:text-left">
                  <h3 className="font-serif text-lg font-medium text-[#422F0E]">{profile?.name}</h3>
                  <p className="text-xs font-mono text-[#A89F91]">{profile?.email}</p>
                  <div className="mt-2 inline-flex items-center space-x-1.5 rounded-full bg-[#FFFFFF] border border-[#EFE8DC] px-3 py-0.5 text-[11px] font-mono text-[#6B5E4E]">
                    <span className={`h-1.5 w-1.5 rounded-full ${hasActiveDuo ? 'bg-[#037F71]' : 'bg-[#D4C3AD]'}`} />
                    <span>{hasActiveDuo ? `Paired with ${partner?.name || 'Partner'}` : 'Unconnected Room'}</span>
                  </div>
                </div>
              </div>

              {/* Avatar Selector */}
              <div>
                <label className="block text-[10px] font-mono uppercase tracking-widest text-[#A89F91] mb-2.5">
                  Pick a Cute Avatar
                </label>
                <div className="grid grid-cols-6 gap-2">
                  {AVATAR_OPTIONS.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => {
                        setSelectedAvatar(emoji);
                        setCustomAvatarUrl('');
                      }}
                      className={`h-11 w-full rounded-2xl border flex items-center justify-center text-xl transition-all hover:scale-105 ${
                        selectedAvatar === emoji
                          ? 'border-[#422F0E] bg-[#FFF8FA] ring-2 ring-[#FCC4C0] shadow-sm'
                          : 'border-[#EFE8DC] bg-[#FAF7F2]'
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
                  <label className="block text-xs font-medium text-[#6B5E4E] mb-1.5">Display Name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Your sweet name"
                    className="w-full rounded-full border border-[#EFE8DC] bg-[#FAF7F2] px-5 py-2.5 text-xs sm:text-sm text-[#422F0E] focus:border-[#EA5E86] focus:bg-[#FFFFFF] focus:outline-none focus:ring-2 focus:ring-[#FCC4C0]/40"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#6B5E4E] mb-1.5">Custom Photo URL (optional)</label>
                  <input
                    type="url"
                    value={customAvatarUrl}
                    onChange={(e) => setCustomAvatarUrl(e.target.value)}
                    placeholder="https://example.com/avatar.jpg"
                    className="w-full rounded-full border border-[#EFE8DC] bg-[#FAF7F2] px-5 py-2.5 text-xs text-[#422F0E] focus:border-[#EA5E86] focus:bg-[#FFFFFF] focus:outline-none focus:ring-2 focus:ring-[#FCC4C0]/40"
                  />
                </div>

                <div className="flex items-center justify-between pt-2">
                  {profileSaveSuccess && (
                    <span className="text-xs font-mono text-[#037F71] flex items-center gap-1">
                      <Check className="h-3.5 w-3.5" /> Profile updated 💕
                    </span>
                  )}
                  <button
                    type="submit"
                    disabled={isSavingProfile || !name.trim()}
                    className="ml-auto flex items-center space-x-2 rounded-full bg-[#422F0E] px-6 py-2.5 text-xs sm:text-sm font-medium text-[#FAF7F2] hover:bg-[#EA5E86] disabled:opacity-40 transition-all shadow-sm"
                  >
                    <span>{isSavingProfile ? 'Saving...' : 'Save Profile'}</span>
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
                <div className="rounded-3xl border border-[#EFE8DC] bg-[#FAF7F2] p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono uppercase tracking-widest text-[#A89F91]">Connected Partner</span>
                    <span className="text-xs font-mono text-[#037F71] flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-[#037F71]" />
                      Paired
                    </span>
                  </div>

                  <div className="flex items-center space-x-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#FFFFFF] border border-[#EFE8DC] text-2xl shadow-sm">
                      {partner.avatar_url?.startsWith('http') ? (
                        <img src={partner.avatar_url} alt={partner.name} className="h-full w-full object-cover rounded-2xl" />
                      ) : (
                        <span>{partner.avatar_url || '🌸'}</span>
                      )}
                    </div>
                    <div>
                      <h4 className="font-serif text-base sm:text-lg font-medium text-[#422F0E]">{partner.name}</h4>
                      <p className="text-xs font-mono text-[#A89F91]">{partner.email}</p>
                    </div>
                  </div>

                  {connectedDateFormatted && (
                    <div className="flex items-center space-x-2 text-xs font-mono text-[#6B5E4E] pt-2 border-t border-[#EFE8DC]">
                      <Calendar className="h-3.5 w-3.5 text-[#EA5E86]" />
                      <span>Paired since {connectedDateFormatted} 💕</span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="rounded-3xl border border-[#EFE8DC] bg-[#FAF7F2] p-6 text-center">
                  <p className="text-xs sm:text-sm text-[#6B5E4E]">
                    You are not currently paired in an active room.
                  </p>
                  {onNavigateTab && (
                    <button
                      onClick={() => {
                        onClose();
                        onNavigateTab('duo');
                      }}
                      className="mt-3 inline-flex items-center space-x-2 rounded-full bg-[#422F0E] px-5 py-2 text-xs font-medium text-white hover:bg-[#EA5E86] transition-all"
                    >
                      <span>Pair Secret Keys</span>
                    </button>
                  )}
                </div>
              )}

              {/* Your Duo Key Card */}
              <div className="rounded-3xl border border-[#EFE8DC] bg-[#FFFFFF] p-5 shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono uppercase tracking-widest text-[#A89F91]">Your Secret Key</span>
                  <button
                    onClick={handleRegenerateCode}
                    title="Regenerate key"
                    className="p-1 text-[#A89F91] hover:text-[#422F0E] rounded-full hover:bg-[#F2ECE1]"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                  </button>
                </div>

                <div className="rounded-2xl border border-[#EFE8DC] bg-[#FAF7F2] p-4 text-center">
                  <span className="font-mono text-2xl font-medium tracking-widest text-[#422F0E]">
                    {profile?.duo_code}
                  </span>
                </div>

                <button
                  onClick={handleCopyCode}
                  className="w-full flex items-center justify-center space-x-2 rounded-full border border-[#EFE8DC] bg-[#FAF7F2] py-2.5 text-xs font-medium text-[#422F0E] hover:bg-[#F2ECE1] hover:border-[#FCC4C0] transition-all"
                >
                  {copiedCode ? <Check className="h-4 w-4 text-[#037F71]" /> : <Copy className="h-4 w-4 text-[#A89F91]" />}
                  <span>{copiedCode ? 'Key copied to clipboard 💕' : 'Copy Secret Key'}</span>
                </button>
              </div>

              {/* Disconnect / Leave Duo */}
              {hasActiveDuo && (
                <div className="rounded-3xl border border-[#FCC4C0] bg-[#FFF5F5] p-5 space-y-3">
                  <h4 className="text-xs font-semibold text-[#EA5E86] uppercase tracking-wider font-mono">
                    Disconnect Room
                  </h4>
                  <p className="text-xs text-[#6B5E4E]">
                    Disconnecting will un-pair you and {partner?.name}. You will need to exchange keys to connect again.
                  </p>

                  {!confirmLeaveDuo ? (
                    <button
                      onClick={() => setConfirmLeaveDuo(true)}
                      className="rounded-full border border-[#FCC4C0] bg-[#FFFFFF] px-5 py-2 text-xs font-medium text-[#EA5E86] hover:bg-[#FFF8FA] transition-all"
                    >
                      Disconnect from Duo
                    </button>
                  ) : (
                    <div className="space-y-2 pt-2">
                      <p className="text-xs font-semibold text-[#EA5E86]">
                        Are you sure you want to disconnect?
                      </p>
                      <div className="flex gap-2">
                        <button
                          onClick={handleLeaveDuo}
                          disabled={actionLoading}
                          className="rounded-full bg-[#EA5E86] px-5 py-2 text-xs font-medium text-white hover:bg-[#D94E76] transition-all disabled:opacity-50"
                        >
                          {actionLoading ? 'Disconnecting...' : 'Yes, Disconnect'}
                        </button>
                        <button
                          onClick={() => setConfirmLeaveDuo(false)}
                          className="rounded-full border border-[#EFE8DC] bg-[#FFFFFF] px-4 py-2 text-xs text-[#6B5E4E]"
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
                <div className="flex items-center justify-between rounded-3xl border border-[#EFE8DC] bg-[#FAF7F2] p-4">
                  <div>
                    <h4 className="text-xs sm:text-sm font-medium text-[#422F0E]">Press Enter to Send</h4>
                    <p className="text-xs text-[#6B5E4E]">
                      When enabled, pressing <kbd className="font-mono bg-[#FFFFFF] px-1.5 py-0.5 rounded-full border border-[#EFE8DC] text-[10px]">Enter</kbd> sends immediately. Shift+Enter creates a new line.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleTogglePreference('enter_to_send', !enterToSend)}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      enterToSend ? 'bg-[#422F0E]' : 'bg-[#D4C3AD]'
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
                <div className="flex items-center justify-between rounded-3xl border border-[#EFE8DC] bg-[#FAF7F2] p-4">
                  <div>
                    <h4 className="text-xs sm:text-sm font-medium text-[#422F0E]">Read Receipts</h4>
                    <p className="text-xs text-[#6B5E4E]">
                      Show double-check icons when messages have been seen by your partner.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleTogglePreference('read_receipts', !readReceipts)}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      readReceipts ? 'bg-[#422F0E]' : 'bg-[#D4C3AD]'
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
                <div className="flex items-center justify-between rounded-3xl border border-[#EFE8DC] bg-[#FAF7F2] p-4">
                  <div>
                    <h4 className="text-xs sm:text-sm font-medium text-[#422F0E]">Message Notifications</h4>
                    <p className="text-xs text-[#6B5E4E]">
                      Display sweet Instagram-style popout alerts when new drawings and messages arrive.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleTogglePreference('notifications_enabled', !notificationsEnabled)}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      notificationsEnabled ? 'bg-[#422F0E]' : 'bg-[#D4C3AD]'
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
              <div className="rounded-3xl border border-[#EFE8DC] bg-[#FFFFFF] p-5 space-y-3">
                <div className="flex items-center space-x-2">
                  <Trash2 className="h-4 w-4 text-[#EA5E86]" />
                  <h4 className="text-xs sm:text-sm font-medium text-[#422F0E]">Clear Chat History</h4>
                </div>
                <p className="text-xs text-[#6B5E4E] leading-relaxed">
                  Permanently wipe all messages exchanged in this room.
                </p>

                {!confirmClearChat ? (
                  <button
                    onClick={() => setConfirmClearChat(true)}
                    className="rounded-full border border-[#EFE8DC] bg-[#FAF7F2] px-5 py-2 text-xs font-medium text-[#EA5E86] hover:bg-[#FFF5F5] transition-all"
                  >
                    Clear All Messages
                  </button>
                ) : (
                  <div className="rounded-2xl border border-[#FCC4C0] bg-[#FFF5F5] p-4 space-y-2.5">
                    <p className="text-xs font-semibold text-[#EA5E86]">
                      Are you sure? This will delete all chat history for both of you.
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={handleClearChat}
                        disabled={actionLoading}
                        className="rounded-full bg-[#EA5E86] px-5 py-2 text-xs font-medium text-white hover:bg-[#D94E76] transition-all disabled:opacity-50"
                      >
                        {actionLoading ? 'Clearing...' : 'Yes, Delete Everything'}
                      </button>
                      <button
                        onClick={() => setConfirmClearChat(false)}
                        className="rounded-full border border-[#EFE8DC] bg-[#FFFFFF] px-4 py-2 text-xs text-[#6B5E4E]"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* SECTION 4: PERSONALIZATION & THEME */}
          {activeSection === 'theme' && (
            <div className="space-y-6">
              <div>
                <h3 className="font-serif text-lg font-medium text-[#422F0E]">Theme & Appearance</h3>
                <p className="text-xs text-[#6B5E4E] mt-1">
                  Choose how your shared space looks.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {[
                  { id: 'light', label: 'Warm Cream', desc: 'Cozy paper, soft blush & pastel ink', icon: Sun },
                  { id: 'dark', label: 'Night Owl', desc: 'Muted nocturnal warmth & soft glow', icon: Moon },
                  { id: 'system', label: 'System Default', desc: 'Syncs with device appearance', icon: Laptop },
                ].map((item) => {
                  const Icon = item.icon;
                  const isSelected = theme === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleSelectTheme(item.id as any)}
                      className={`flex flex-col items-start p-4 rounded-3xl border text-left transition-all ${
                        isSelected
                          ? 'border-[#422F0E] bg-[#FFF8FA] ring-2 ring-[#FCC4C0] shadow-sm'
                          : 'border-[#EFE8DC] bg-[#FFFFFF] hover:bg-[#FAF7F2]'
                      }`}
                    >
                      <div className="flex items-center justify-between w-full mb-3">
                        <Icon className={`h-5 w-5 ${isSelected ? 'text-[#EA5E86]' : 'text-[#A89F91]'}`} />
                        {isSelected && <Check className="h-4 w-4 text-[#037F71]" />}
                      </div>
                      <span className="text-xs sm:text-sm font-semibold text-[#422F0E]">{item.label}</span>
                      <span className="text-[11px] text-[#6B5E4E] mt-1 leading-snug">{item.desc}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* SECTION 5: SECURITY & PRIVACY */}
          {activeSection === 'security' && (
            <div className="space-y-6">
              {/* Account Status Card */}
              <div className="rounded-3xl border border-[#EFE8DC] bg-[#FAF7F2] p-5 space-y-3">
                <span className="text-[10px] font-mono uppercase tracking-widest text-[#A89F91]">Authentication</span>
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-medium text-[#422F0E]">{profile?.email}</span>
                    <p className="text-[11px] text-[#6B5E4E] mt-0.5">Encrypted with Supabase Auth</p>
                  </div>
                  <span className="inline-flex items-center gap-1 rounded-full bg-[#DDF2B8] px-3 py-0.5 text-[10px] font-mono text-[#037F71]">
                    <Check className="h-3 w-3" /> Active
                  </span>
                </div>
              </div>

              {/* Change Password Form */}
              <form onSubmit={handleChangePassword} className="rounded-3xl border border-[#EFE8DC] bg-[#FFFFFF] p-5 space-y-4 shadow-sm">
                <div className="flex items-center space-x-2">
                  <Lock className="h-4 w-4 text-[#EA5E86]" />
                  <h4 className="text-xs sm:text-sm font-medium text-[#422F0E]">Change Password</h4>
                </div>

                {passwordStatus && (
                  <div
                    className={`rounded-2xl p-3 text-xs ${
                      passwordStatus.type === 'success' ? 'bg-[#F5FBEF] text-[#037F71] border border-[#DDF2B8]' : 'bg-[#FFF5F5] text-[#EA5E86] border border-[#FCC4C0]'
                    }`}
                  >
                    {passwordStatus.msg}
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-medium text-[#6B5E4E] mb-1">New Password</label>
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="••••••••"
                      minLength={6}
                      className="w-full rounded-full border border-[#EFE8DC] bg-[#FAF7F2] px-4 py-2 text-xs text-[#422F0E] focus:border-[#EA5E86] focus:outline-none focus:ring-2 focus:ring-[#FCC4C0]/40"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-[#6B5E4E] mb-1">Confirm Password</label>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      minLength={6}
                      className="w-full rounded-full border border-[#EFE8DC] bg-[#FAF7F2] px-4 py-2 text-xs text-[#422F0E] focus:border-[#EA5E86] focus:outline-none focus:ring-2 focus:ring-[#FCC4C0]/40"
                    />
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={passwordLoading || !newPassword || !confirmPassword}
                    className="rounded-full bg-[#422F0E] px-5 py-2 text-xs font-medium text-[#FAF7F2] hover:bg-[#EA5E86] disabled:opacity-40 transition-all"
                  >
                    {passwordLoading ? 'Updating...' : 'Update Password'}
                  </button>
                </div>
              </form>

              {/* Danger Zone: Delete Account */}
              <div className="rounded-3xl border border-[#FCC4C0] bg-[#FFF5F5] p-5 space-y-3">
                <div className="flex items-center space-x-2">
                  <AlertTriangle className="h-4 w-4 text-[#EA5E86]" />
                  <h4 className="text-xs sm:text-sm font-semibold text-[#EA5E86] uppercase tracking-wider font-mono">
                    Danger Zone &mdash; Delete Account
                  </h4>
                </div>
                <p className="text-xs text-[#6B5E4E] leading-relaxed">
                  Permanently delete your DUO account, disconnect from your room, and erase your profile records.
                </p>

                {!confirmDeleteAccount ? (
                  <button
                    onClick={() => setConfirmDeleteAccount(true)}
                    className="rounded-full bg-[#EA5E86] px-5 py-2 text-xs font-medium text-white hover:bg-[#D94E76] transition-all"
                  >
                    Delete Account
                  </button>
                ) : (
                  <div className="rounded-2xl border border-[#FCC4C0] bg-[#FFFFFF] p-4 space-y-3">
                    <p className="text-xs font-semibold text-[#EA5E86]">
                      Type <strong>DELETE</strong> to confirm permanent account deletion:
                    </p>
                    <input
                      type="text"
                      value={deleteConfirmText}
                      onChange={(e) => setDeleteConfirmText(e.target.value)}
                      placeholder="Type DELETE"
                      className="w-full rounded-full border border-[#FCC4C0] px-4 py-2 text-xs font-mono text-[#EA5E86] focus:outline-none focus:ring-2 focus:ring-[#EA5E86]/40"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={handleDeleteAccount}
                        disabled={deleteConfirmText !== 'DELETE' || actionLoading}
                        className="rounded-full bg-[#EA5E86] px-5 py-2 text-xs font-medium text-white hover:bg-[#D94E76] disabled:opacity-40 transition-all"
                      >
                        {actionLoading ? 'Deleting...' : 'Permanently Delete Account'}
                      </button>
                      <button
                        onClick={() => {
                          setConfirmDeleteAccount(false);
                          setDeleteConfirmText('');
                        }}
                        className="rounded-full border border-[#EFE8DC] px-4 py-2 text-xs text-[#6B5E4E]"
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
