'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { useTheme } from '@/context/ThemeContext';
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
import { Avatar, AVATAR_OPTIONS, DEFAULT_AVATAR } from './Avatar';

interface ProfileSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateTab?: (tab: string) => void;
}

export const ProfileSettingsModal: React.FC<ProfileSettingsModalProps> = ({
  isOpen,
  onClose,
  onNavigateTab,
}) => {
  const { profile, partner, hasActiveDuo, refreshProfile, logout } = useAuth();
  const { toast, confirm: confirmModal } = useToast();
  const { theme: currentTheme, setTheme: setGlobalTheme } = useTheme();

  const [activeSection, setActiveSection] = useState<'profile' | 'duo' | 'chat' | 'theme' | 'security'>('profile');

  // Form states
  const [name, setName] = useState(profile?.name || '');
  const [selectedAvatar, setSelectedAvatar] = useState(profile?.avatar_url || DEFAULT_AVATAR);
  const [customAvatarUrl, setCustomAvatarUrl] = useState('');
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileSaveSuccess, setProfileSaveSuccess] = useState(false);

  // Preference states
  const [enterToSend, setEnterToSend] = useState(profile?.enter_to_send ?? true);
  const [readReceipts, setReadReceipts] = useState(profile?.read_receipts ?? true);
  const [notificationsEnabled, setNotificationsEnabled] = useState(profile?.notifications_enabled ?? true);
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>(currentTheme || 'system');

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
      setSelectedAvatar(profile.avatar_url || DEFAULT_AVATAR);
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
      toast.love('Profile updated', 'Profile Saved');
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
      toast.love('Setting updated', 'Saved');
    } catch (err: any) {
      toast.error('Failed to update setting.', 'Error');
    }
  };

  // Change Theme
  const handleThemeChange = async (newTheme: 'light' | 'dark' | 'system') => {
    setTheme(newTheme);
    setGlobalTheme(newTheme);
    try {
      await authApi.updateProfile({ theme: newTheme });
      await refreshProfile();
      toast.love(`Theme set to ${newTheme}`, 'Theme Updated');
    } catch (err: any) {
      toast.error('Failed to update theme.', 'Error');
    }
  };

  // Copy Duo Code
  const handleCopyCode = () => {
    if (!profile?.duo_code) return;
    navigator.clipboard.writeText(profile.duo_code);
    setCopiedCode(true);
    toast.love('Secret key copied to clipboard', 'Copied');
    setTimeout(() => setCopiedCode(false), 2500);
  };

  // Regenerate Secret Key
  const handleRegenerateCode = async () => {
    const ok = await confirmModal({
      title: 'Generate New Key?',
      message: 'Generating a new secret key will replace your existing unpaired room code.',
      confirmText: 'Generate New Key',
      type: 'warning',
    });
    if (!ok) return;

    try {
      await duoApi.regenerateCode();
      await refreshProfile();
      toast.love('New secret key generated', 'Key Updated');
    } catch (err: any) {
      toast.error('Failed to generate key.', 'Error');
    }
  };

  // Change Password
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || newPassword !== confirmPassword) {
      setPasswordStatus({ type: 'error', msg: 'Passwords do not match.' });
      return;
    }
    if (newPassword.length < 6) {
      setPasswordStatus({ type: 'error', msg: 'Password must be at least 6 characters.' });
      return;
    }

    setPasswordLoading(true);
    setPasswordStatus(null);

    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;

      setNewPassword('');
      setConfirmPassword('');
      setPasswordStatus({ type: 'success', msg: 'Password updated successfully' });
      toast.love('Password updated successfully', 'Security');
    } catch (err: any) {
      setPasswordStatus({ type: 'error', msg: err.message || 'Failed to update password.' });
    } finally {
      setPasswordLoading(false);
    }
  };

  // Clear Chat History
  const handleClearChat = async () => {
    setActionLoading(true);
    try {
      const res = await messagesApi.clearHistory();
      if (profile?.active_duo_id) {
        const channel = supabase.channel(`chat:${profile.active_duo_id}`);
        if (typeof (channel as any).httpSend === 'function') {
          (channel as any).httpSend('messages_cleared', {}).catch(() => {});
        }
      }
      setConfirmClearChat(false);
      toast.love('Chat history cleared for both partners.', 'Chat Cleared');
      setActionMessage({ type: 'success', msg: res.message || 'Chat history cleared.' });
      setTimeout(() => setActionMessage(null), 3000);
    } catch (err: any) {
      toast.error(err.message || 'Failed to clear chat.', 'Error');
    } finally {
      setActionLoading(false);
    }
  };

  // Leave Duo
  const handleLeaveDuo = async () => {
    setActionLoading(true);
    try {
      await duoApi.leave();
      await refreshProfile();
      setConfirmLeaveDuo(false);
      toast.love('Left room connection.', 'Room Disconnected');
      if (onNavigateTab) onNavigateTab('duo');
      onClose();
    } catch (err: any) {
      toast.error(err.message || 'Failed to leave room.', 'Error');
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3 sm:p-6 backdrop-blur-[4px] overflow-y-auto animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl rounded-[35px] border border-theme bg-theme-card shadow-2xl overflow-hidden flex flex-col max-h-[88vh] transition-colors">
        {/* Modal Top Header */}
        <div className="flex items-center justify-between border-b border-theme bg-theme-page px-6 py-4 shrink-0">
          <div className="flex items-center space-x-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-2xl bg-[#125CB9] text-white">
              <Heart className="h-4 w-4 fill-current" />
            </span>
            <h2 className="font-serif text-base sm:text-lg font-bold text-theme-primary">Room Settings</h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-1.5 text-theme-secondary hover:text-theme-primary hover:bg-theme-card transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Section Navigation Tabs */}
        <div className="flex border-b border-theme bg-theme-page px-4 sm:px-5 overflow-x-auto shrink-0 gap-1.5 scrollbar-none py-2">
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
                className={`flex items-center space-x-1.5 py-1.5 px-3.5 text-xs font-medium rounded-full transition-all whitespace-nowrap ${
                  isActive
                    ? 'bg-[#125CB9] text-white font-semibold shadow-xs'
                    : 'text-theme-secondary hover:bg-theme-card hover:text-theme-primary'
                }`}
              >
                <Icon className={`h-3.5 w-3.5 ${isActive ? 'text-white' : 'text-theme-muted'}`} />
                <span>{sec.label}</span>
              </button>
            );
          })}
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 bg-theme-card">
          {/* Action Message Banner */}
          {actionMessage && (
            <div
              className={`flex items-center space-x-2 rounded-xl p-3 text-xs ${
                actionMessage.type === 'success' ? 'bg-[#00D26A]/10 text-[#00D26A] border border-[#00D26A]/25' : 'bg-[#F43F5E]/10 text-[#F43F5E] border border-[#F43F5E]/25'
              }`}
            >
              <Check className="h-3.5 w-3.5" />
              <span>{actionMessage.msg}</span>
            </div>
          )}

          {/* SECTION 1: PROFILE */}
          {activeSection === 'profile' && (
            <div className="space-y-4">
              {/* Profile Card & Avatar */}
              <div className="rounded-2xl border border-theme bg-theme-input p-4 flex flex-col sm:flex-row items-center gap-4">
                <Avatar src={selectedAvatar} name={name} size="md" />

                <div className="flex-1 text-center sm:text-left">
                  <h3 className="font-serif text-sm font-bold text-theme-primary">{profile?.name}</h3>
                  <p className="text-xs font-mono text-theme-muted">{profile?.email}</p>
                  <div className="mt-1.5 inline-flex items-center space-x-1.5 rounded-full bg-theme-card border border-theme px-3 py-0.5 text-[10px] font-mono text-theme-secondary">
                    <span className={`h-1.5 w-1.5 rounded-full ${hasActiveDuo ? 'bg-[#00D26A]' : 'bg-theme-muted'}`} />
                    <span>{hasActiveDuo ? `Paired with ${partner?.name || 'Partner'}` : 'Unconnected Room'}</span>
                  </div>
                </div>
              </div>

              {/* Avatar Selector */}
              <div>
                <label className="block text-[10px] font-mono uppercase tracking-wider text-theme-muted mb-2 font-medium">
                  Choose Your Monster Avatar
                </label>
                <div className="grid grid-cols-4 sm:grid-cols-6 gap-2.5">
                  {AVATAR_OPTIONS.map((avatarPath, index) => (
                    <button
                      key={avatarPath}
                      type="button"
                      onClick={() => {
                        setSelectedAvatar(avatarPath);
                        setCustomAvatarUrl('');
                      }}
                      className={`relative aspect-square rounded-full p-0.5 border-2 transition-all hover:scale-105 ${
                        selectedAvatar === avatarPath
                          ? 'border-[#125CB9] ring-2 ring-[#125CB9]/40 shadow-xs scale-105'
                          : 'border-theme bg-theme-input hover:border-[#125CB9]'
                      }`}
                    >
                      <img
                        src={avatarPath}
                        alt={`Avatar ${index + 1}`}
                        className="w-full h-full object-cover rounded-full select-none"
                      />
                    </button>
                  ))}
                </div>
              </div>

              {/* Edit Form */}
              <form onSubmit={handleSaveProfile} className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-theme-secondary mb-1">Display Name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Your name"
                    className="w-full rounded-xl border border-theme bg-theme-input px-3.5 py-2 text-xs sm:text-sm text-theme-primary placeholder-theme-muted focus:border-[#125CB9] focus:bg-theme-card focus:outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-theme-secondary mb-1">Custom Photo URL (optional)</label>
                  <input
                    type="url"
                    value={customAvatarUrl}
                    onChange={(e) => setCustomAvatarUrl(e.target.value)}
                    placeholder="https://example.com/avatar.jpg"
                    className="w-full rounded-xl border border-theme bg-theme-input px-3.5 py-2 text-xs text-theme-primary placeholder-theme-muted focus:border-[#125CB9] focus:bg-theme-card focus:outline-none"
                  />
                </div>

                <div className="flex items-center justify-between pt-1">
                  {profileSaveSuccess && (
                    <span className="text-xs font-mono text-[#00D26A] flex items-center gap-1">
                      <Check className="h-3 w-3" /> Profile updated
                    </span>
                  )}
                  <button
                    type="submit"
                    disabled={isSavingProfile || !name.trim()}
                    className="ml-auto flex items-center space-x-1.5 rounded-full bg-[#125CB9] px-4 py-2 text-xs font-medium text-white hover:bg-[#0E4B99] disabled:opacity-40 transition-colors shadow-xs"
                  >
                    <span>{isSavingProfile ? 'Saving...' : 'Save Profile'}</span>
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* SECTION 2: DUO CONNECTION */}
          {activeSection === 'duo' && (
            <div className="space-y-4">
              {/* Partner Card */}
              {hasActiveDuo && partner ? (
                <div className="rounded-2xl border border-theme bg-theme-input p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-theme-muted font-medium">Connected Partner</span>
                    <span className="text-[11px] font-mono text-[#00D26A] flex items-center gap-1">
                      <span className="h-1.5 w-1.5 rounded-full bg-[#00D26A]" />
                      Paired
                    </span>
                  </div>

                  <div className="flex items-center space-x-3">
                    <Avatar src={partner.avatar_url} name={partner.name} size="sm" />
                    <div>
                      <h4 className="font-serif text-sm font-bold text-theme-primary">{partner.name}</h4>
                      <p className="text-xs font-mono text-theme-muted">{partner.email}</p>
                    </div>
                  </div>

                  {connectedDateFormatted && (
                    <div className="flex items-center space-x-1.5 text-[11px] font-mono text-theme-secondary pt-2 border-t border-theme">
                      <Calendar className="h-3 w-3 text-[#125CB9]" />
                      <span>Paired since {connectedDateFormatted}</span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="rounded-2xl border border-theme bg-theme-input p-5 text-center">
                  <p className="text-xs text-theme-secondary">
                    You are not currently paired in an active room.
                  </p>
                  {onNavigateTab && (
                    <button
                      onClick={() => {
                        onClose();
                        onNavigateTab('duo');
                      }}
                      className="mt-2.5 inline-flex items-center space-x-1.5 rounded-full bg-[#125CB9] px-4 py-2 text-xs font-medium text-white hover:bg-[#0E4B99] transition-colors shadow-xs"
                    >
                      <span>Pair Secret Keys</span>
                    </button>
                  )}
                </div>
              )}

              {/* Your Duo Key Card */}
              <div className="rounded-2xl border border-theme bg-theme-card p-4 shadow-xs space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-theme-muted font-medium">Your Secret Key</span>
                  <button
                    onClick={handleRegenerateCode}
                    title="Regenerate key"
                    className="p-1.5 text-theme-muted hover:text-theme-primary rounded-full hover:bg-theme-input transition-colors"
                  >
                    <RefreshCw className="h-3 w-3" />
                  </button>
                </div>

                <div className="rounded-xl border border-theme bg-theme-input p-3 text-center">
                  <span className="font-mono text-xl font-bold tracking-widest text-theme-primary">
                    {profile?.duo_code}
                  </span>
                </div>

                <button
                  onClick={handleCopyCode}
                  className="w-full flex items-center justify-center space-x-1.5 rounded-full border border-theme bg-theme-input py-2 text-xs font-medium text-theme-primary hover:bg-theme-card transition-colors"
                >
                  {copiedCode ? <Check className="h-3.5 w-3.5 text-[#00D26A]" /> : <Copy className="h-3.5 w-3.5 text-theme-muted" />}
                  <span>{copiedCode ? 'Key copied to clipboard' : 'Copy Secret Key'}</span>
                </button>
              </div>

              {/* Disconnect / Leave Duo */}
              {hasActiveDuo && (
                <div className="rounded-2xl border border-[#F43F5E]/25 bg-[#F43F5E]/10 p-4 space-y-2.5">
                  <h4 className="text-xs font-semibold text-[#F43F5E] uppercase tracking-wider font-mono">
                    Disconnect Room
                  </h4>
                  <p className="text-xs text-theme-secondary">
                    Disconnecting will un-pair you and {partner?.name}. You will need to exchange keys to connect again.
                  </p>

                  {!confirmLeaveDuo ? (
                    <button
                      onClick={() => setConfirmLeaveDuo(true)}
                      className="rounded-full border border-[#F43F5E]/30 bg-theme-card px-4 py-1.5 text-xs font-medium text-[#F43F5E] hover:bg-[#F43F5E]/10 transition-colors"
                    >
                      Disconnect from Duo
                    </button>
                  ) : (
                    <div className="space-y-2 pt-1">
                      <p className="text-xs font-semibold text-[#F43F5E]">
                        Are you sure you want to disconnect?
                      </p>
                      <div className="flex gap-2">
                        <button
                          onClick={handleLeaveDuo}
                          disabled={actionLoading}
                          className="rounded-full bg-[#F43F5E] px-4 py-1.5 text-xs font-medium text-white hover:bg-[#E11D48] transition-colors disabled:opacity-50"
                        >
                          {actionLoading ? 'Disconnecting...' : 'Yes, Disconnect'}
                        </button>
                        <button
                          onClick={() => setConfirmLeaveDuo(false)}
                          className="rounded-full border border-theme bg-theme-card px-4 py-1.5 text-xs text-theme-secondary"
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
            <div className="space-y-4">
              <div className="space-y-3">
                {/* Enter to Send Toggle */}
                <div className="flex items-center justify-between rounded-2xl border border-theme bg-theme-input p-3.5">
                  <div>
                    <h4 className="text-xs sm:text-sm font-medium text-theme-primary">Press Enter to Send</h4>
                    <p className="text-xs text-theme-secondary">
                      When enabled, pressing <kbd className="font-mono bg-theme-card px-1.5 py-0.2 rounded border border-theme text-[10px]">Enter</kbd> sends immediately. Shift+Enter creates a new line.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleTogglePreference('enter_to_send', !enterToSend)}
                    className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      enterToSend ? 'bg-[#125CB9]' : 'bg-theme-muted'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-xs transition duration-200 ease-in-out ${
                        enterToSend ? 'translate-x-4' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                {/* Read Receipts Toggle */}
                <div className="flex items-center justify-between rounded-2xl border border-theme bg-theme-input p-3.5">
                  <div>
                    <h4 className="text-xs sm:text-sm font-medium text-theme-primary">Read Receipts</h4>
                    <p className="text-xs text-theme-secondary">
                      Show double-check icons when messages have been seen by your partner.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleTogglePreference('read_receipts', !readReceipts)}
                    className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      readReceipts ? 'bg-[#125CB9]' : 'bg-theme-muted'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-xs transition duration-200 ease-in-out ${
                        readReceipts ? 'translate-x-4' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                {/* Message Notifications Toggle */}
                <div className="flex items-center justify-between rounded-2xl border border-theme bg-theme-input p-3.5">
                  <div>
                    <h4 className="text-xs sm:text-sm font-medium text-theme-primary">Message Notifications</h4>
                    <p className="text-xs text-theme-secondary">
                      Display toast popout alerts when new drawings and messages arrive.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleTogglePreference('notifications_enabled', !notificationsEnabled)}
                    className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      notificationsEnabled ? 'bg-[#125CB9]' : 'bg-theme-muted'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-xs transition duration-200 ease-in-out ${
                        notificationsEnabled ? 'translate-x-4' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              </div>

              {/* Clear Chat History */}
              <div className="rounded-2xl border border-theme bg-theme-card p-4 space-y-2.5 shadow-xs">
                <div className="flex items-center space-x-1.5">
                  <Trash2 className="h-3.5 w-3.5 text-[#F43F5E]" />
                  <h4 className="text-xs font-medium text-theme-primary">Clear Chat History</h4>
                </div>
                <p className="text-xs text-theme-secondary leading-relaxed">
                  Permanently wipe all messages exchanged in this room.
                </p>

                {!confirmClearChat ? (
                  <button
                    onClick={() => setConfirmClearChat(true)}
                    className="rounded-full border border-theme bg-theme-input px-4 py-1.5 text-xs font-medium text-[#F43F5E] hover:bg-[#F43F5E]/10 transition-colors"
                  >
                    Clear All Messages
                  </button>
                ) : (
                  <div className="rounded-xl border border-[#F43F5E]/25 bg-[#F43F5E]/10 p-3 space-y-2">
                    <p className="text-xs font-semibold text-[#F43F5E]">
                      Are you sure? This will delete all chat history for both of you.
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={handleClearChat}
                        disabled={actionLoading}
                        className="rounded-full bg-[#F43F5E] px-4 py-1.5 text-xs font-medium text-white hover:bg-[#E11D48] transition-colors disabled:opacity-50"
                      >
                        {actionLoading ? 'Clearing...' : 'Yes, Delete Everything'}
                      </button>
                      <button
                        onClick={() => setConfirmClearChat(false)}
                        className="rounded-full border border-theme bg-theme-card px-4 py-1.5 text-xs text-theme-secondary"
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
            <div className="space-y-4">
              <div>
                <h3 className="font-serif text-sm font-bold text-theme-primary">Appearances: Dark & Light Mode</h3>
                <p className="text-xs text-theme-secondary mt-0.5">
                  Select your preferred color theme for the entire workspace.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  {
                    id: 'light',
                    label: 'Light Mode',
                    desc: 'Warm aesthetic beige, cream cards & blue buttons',
                    icon: Sun,
                    previewBg: 'bg-[#F5EFEB] text-[#1C1917] border-[#E3DACE]',
                  },
                  {
                    id: 'dark',
                    label: 'Dark Mode',
                    desc: 'Deep midnight slate, clean borders & elevated cards',
                    icon: Moon,
                    previewBg: 'bg-[#161822] text-[#FFFFFF] border-[#2C3042]',
                  },
                  {
                    id: 'system',
                    label: 'System Sync',
                    desc: 'Automatically matches your device settings',
                    icon: Laptop,
                    previewBg: 'bg-theme-input text-theme-primary border-theme',
                  },
                ].map((item) => {
                  const Icon = item.icon;
                  const isSelected = theme === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleThemeChange(item.id as any)}
                      className={`flex flex-col items-start p-3.5 rounded-2xl border text-left transition-all relative overflow-hidden ${
                        isSelected
                          ? 'border-[#125CB9] bg-[#125CB9]/10 ring-2 ring-[#125CB9]/40 shadow-xs'
                          : 'border-theme bg-theme-input hover:bg-theme-card'
                      }`}
                    >
                      <div className="flex items-center justify-between w-full mb-2.5">
                        <div className={`p-2 rounded-xl ${item.previewBg} border shadow-xs`}>
                          <Icon className="h-4 w-4 text-[#125CB9]" />
                        </div>
                        {isSelected && (
                          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#125CB9] text-white">
                            <Check className="h-3 w-3" />
                          </span>
                        )}
                      </div>
                      <span className="text-xs font-bold text-theme-primary">{item.label}</span>
                      <span className="text-[11px] text-theme-secondary mt-0.5 leading-snug">{item.desc}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* SECTION 5: SECURITY & PRIVACY */}
          {activeSection === 'security' && (
            <div className="space-y-4">
              {/* Account Status Card */}
              <div className="rounded-2xl border border-theme bg-theme-input p-4 space-y-2">
                <span className="text-[10px] font-mono uppercase tracking-wider text-theme-muted font-medium">Authentication</span>
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-medium text-theme-primary">{profile?.email}</span>
                    <p className="text-[11px] text-theme-muted mt-0.5">Encrypted with Supabase Auth</p>
                  </div>
                  <span className="inline-flex items-center gap-1 rounded-full bg-[#00D26A]/10 px-2.5 py-0.5 text-[10px] font-mono text-[#00D26A] border border-[#00D26A]/25">
                    <Check className="h-2.5 w-2.5" /> Active
                  </span>
                </div>
              </div>

              {/* Change Password Form */}
              <form onSubmit={handleChangePassword} className="rounded-2xl border border-theme bg-theme-card p-4 space-y-3 shadow-xs">
                <div className="flex items-center space-x-1.5">
                  <Lock className="h-3.5 w-3.5 text-[#125CB9]" />
                  <h4 className="text-xs font-medium text-theme-primary">Change Password</h4>
                </div>

                {passwordStatus && (
                  <div
                    className={`rounded-xl p-2.5 text-xs ${
                      passwordStatus.type === 'success' ? 'bg-[#00D26A]/10 text-[#00D26A] border border-[#00D26A]/25' : 'bg-[#F43F5E]/10 text-[#F43F5E] border border-[#F43F5E]/25'
                    }`}
                  >
                    {passwordStatus.msg}
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[11px] font-medium text-theme-secondary mb-1">New Password</label>
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="••••••••"
                      minLength={6}
                      className="w-full rounded-xl border border-theme bg-theme-input px-3.5 py-2 text-xs text-theme-primary focus:border-[#125CB9] focus:bg-theme-card focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-theme-secondary mb-1">Confirm Password</label>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      minLength={6}
                      className="w-full rounded-xl border border-theme bg-theme-input px-3.5 py-2 text-xs text-theme-primary focus:border-[#125CB9] focus:bg-theme-card focus:outline-none"
                    />
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={passwordLoading || !newPassword || !confirmPassword}
                    className="rounded-full bg-[#125CB9] px-4 py-2 text-xs font-medium text-white hover:bg-[#0E4B99] disabled:opacity-40 transition-colors shadow-xs"
                  >
                    {passwordLoading ? 'Updating...' : 'Update Password'}
                  </button>
                </div>
              </form>

              {/* Danger Zone: Delete Account */}
              <div className="rounded-2xl border border-[#F43F5E]/25 bg-[#F43F5E]/10 p-4 space-y-2.5">
                <div className="flex items-center space-x-1.5">
                  <AlertTriangle className="h-3.5 w-3.5 text-[#F43F5E]" />
                  <h4 className="text-xs font-semibold text-[#F43F5E] uppercase tracking-wider font-mono">
                    Danger Zone &mdash; Delete Account
                  </h4>
                </div>
                <p className="text-xs text-theme-secondary leading-relaxed">
                  Permanently delete your DUO account, disconnect from your room, and erase your profile records.
                </p>

                {!confirmDeleteAccount ? (
                  <button
                    onClick={() => setConfirmDeleteAccount(true)}
                    className="rounded-full bg-[#F43F5E] px-4 py-1.5 text-xs font-medium text-white hover:bg-[#E11D48] transition-colors"
                  >
                    Delete Account
                  </button>
                ) : (
                  <div className="rounded-xl border border-[#F43F5E]/25 bg-theme-card p-3 space-y-2.5">
                    <p className="text-xs font-semibold text-[#F43F5E]">
                      Type <strong>DELETE</strong> to confirm permanent account deletion:
                    </p>
                    <input
                      type="text"
                      value={deleteConfirmText}
                      onChange={(e) => setDeleteConfirmText(e.target.value)}
                      placeholder="Type DELETE"
                      className="w-full rounded-xl border border-[#F43F5E]/30 bg-theme-input px-3.5 py-2 text-xs font-mono text-[#F43F5E] focus:outline-none"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={handleDeleteAccount}
                        disabled={deleteConfirmText !== 'DELETE' || actionLoading}
                        className="rounded-full bg-[#F43F5E] px-4 py-1.5 text-xs font-medium text-white hover:bg-[#E11D48] disabled:opacity-40 transition-colors"
                      >
                        {actionLoading ? 'Deleting...' : 'Permanently Delete Account'}
                      </button>
                      <button
                        onClick={() => {
                          setConfirmDeleteAccount(false);
                          setDeleteConfirmText('');
                        }}
                        className="rounded-full border border-theme px-4 py-1.5 text-xs text-theme-secondary"
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
