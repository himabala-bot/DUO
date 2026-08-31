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
  LogOut,
  Mail,
  Calendar,
  Sparkles,
  Feather,
  Bookmark,
} from 'lucide-react';
import { format, parseISO } from 'date-fns';

interface ProfileSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateTab?: (tab: string) => void;
}

const AVATAR_PRESETS = [
  { id: 'terracotta', label: 'Terracotta', bg: 'bg-[#FAF2EF]', text: 'text-[#C96A4A]', border: 'border-[#F2DDD7]' },
  { id: 'rose', label: 'Dusty Rose', bg: 'bg-[#FAF0EF]', text: 'text-[#C9827A]', border: 'border-[#F2D9D7]' },
  { id: 'sage', label: 'Sage', bg: 'bg-[#F4F6F2]', text: 'text-[#5E8056]', border: 'border-[#DFE5DA]' },
  { id: 'butter', label: 'Butter', bg: 'bg-[#FAF8EE]', text: 'text-[#8F6B23]', border: 'border-[#ECE4CA]' },
  { id: 'lavender', label: 'Lavender', bg: 'bg-[#F6F4F9]', text: 'text-[#7B6A96]', border: 'border-[#E3DDEB]' },
  { id: 'ink', label: 'Deep Ink', bg: 'bg-[#292522]', text: 'text-[#FAF8F5]', border: 'border-[#292522]' },
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
  const [selectedAvatar, setSelectedAvatar] = useState(profile?.avatar_url || '');
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
      setSelectedAvatar(profile.avatar_url || '');
      setEnterToSend(profile.enter_to_send ?? true);
      setReadReceipts(profile.read_receipts ?? true);
      setNotificationsEnabled(profile.notifications_enabled ?? true);
      setTheme((profile.theme as any) || 'system');
    }
  }, [profile]);

  if (!isOpen) return null;

  const getInitial = (str?: string) => (str ? str.trim().charAt(0).toUpperCase() : 'D');

  // Save Profile
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
    if (!confirm('Regenerate your DUO key? Your previous key will no longer work.')) return;
    try {
      await duoApi.regenerateCode();
      await refreshProfile();
    } catch (err: any) {
      alert(err.message || 'Failed to regenerate key.');
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

      setPasswordStatus({ type: 'success', msg: 'Password updated successfully.' });
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setPasswordStatus({ type: 'error', msg: err.message || 'Failed to update password.' });
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
      if (onNavigateTab) onNavigateTab('duo');
    } catch (err: any) {
      alert(err.message || 'Failed to disconnect room.');
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
      setTimeout(() => setActionMessage(null), 3500);
    } catch (err: any) {
      alert(err.message || 'Failed to clear chat.');
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
      <div className="relative w-full max-w-2xl rounded-3xl border border-[#EBE5DA] bg-[#FFFFFF] shadow-[0_16px_48px_rgba(41,37,34,0.12)] overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Top Header */}
        <div className="flex items-center justify-between border-b border-[#EBE5DA] bg-[#FAF8F5] px-6 py-4 shrink-0">
          <div className="flex items-baseline space-x-2.5">
            <h2 className="font-serif text-xl sm:text-2xl font-normal text-[#292522]">Settings</h2>
            <span className="text-[10px] font-mono uppercase tracking-widest text-[#A89F91]">/ Room & Identity</span>
          </div>
          <button
            onClick={onClose}
            className="rounded-xl p-1.5 text-[#A89F91] hover:text-[#292522] hover:bg-[#F5EFE6] transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Section Navigation Tabs */}
        <div className="flex border-b border-[#EBE5DA] bg-[#FAF8F5] px-4 sm:px-6 overflow-x-auto shrink-0 gap-1 scrollbar-none">
          {[
            { id: 'profile', label: 'Identity', icon: User },
            { id: 'duo', label: 'Connection', icon: Heart },
            { id: 'chat', label: 'Preferences', icon: MessageSquare },
            { id: 'theme', label: 'Theme', icon: Sun },
            { id: 'security', label: 'Security', icon: Shield },
          ].map((sec) => {
            const Icon = sec.icon;
            const isActive = activeSection === sec.id;
            return (
              <button
                key={sec.id}
                onClick={() => setActiveSection(sec.id as any)}
                className={`flex items-center space-x-2 py-3 px-3.5 text-xs sm:text-sm font-medium border-b-2 transition-all whitespace-nowrap ${
                  isActive
                    ? 'border-[#C96A4A] text-[#C96A4A] font-semibold'
                    : 'border-transparent text-[#7A7267] hover:text-[#292522]'
                }`}
              >
                <Icon className={`h-4 w-4 ${isActive ? 'text-[#C96A4A]' : 'text-[#A89F91]'}`} />
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
              className={`flex items-center space-x-2 rounded-xl p-3 text-xs ${
                actionMessage.type === 'success' ? 'bg-[#F2F6F0] text-[#4D6A46] border border-[#D5E2D1]' : 'bg-[#FAF2F0] text-[#C96A4A] border border-[#F4DCD9]'
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
              <div className="rounded-2xl sm:rounded-3xl border border-[#EBE5DA] bg-[#FAF8F5] p-5 flex flex-col sm:flex-row items-center gap-5">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-[#E8DFD3] bg-[#FAF2EF] text-[#C96A4A] font-serif font-medium text-2xl shadow-2xs shrink-0">
                  {selectedAvatar.startsWith('http') ? (
                    <img src={selectedAvatar} alt="Avatar" className="h-full w-full object-cover rounded-2xl" />
                  ) : (
                    <span>{getInitial(name || profile?.name)}</span>
                  )}
                </div>

                <div className="flex-1 text-center sm:text-left">
                  <h3 className="font-serif text-lg font-medium text-[#292522]">{profile?.name}</h3>
                  <p className="text-xs font-mono text-[#A89F91]">{profile?.email}</p>
                  <div className="mt-2 inline-flex items-center space-x-1.5 rounded-full bg-[#FFFFFF] border border-[#EBE5DA] px-3 py-0.5 text-[11px] font-mono text-[#696156]">
                    <span className={`h-1.5 w-1.5 rounded-full ${hasActiveDuo ? 'bg-[#7A9C71]' : 'bg-[#D6CEBF]'}`} />
                    <span>{hasActiveDuo ? `Paired with ${partner?.name || 'Partner'}` : 'Unconnected Room'}</span>
                  </div>
                </div>
              </div>

              {/* Edit Form */}
              <form onSubmit={handleSaveProfile} className="space-y-4">
                <div>
                  <label className="block text-[11px] font-medium text-[#696156] mb-1.5">Display Name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Your name"
                    className="w-full rounded-2xl border border-[#E8DFD3] bg-[#FAF8F5] px-4 py-2.5 text-xs sm:text-sm text-[#292522] focus:border-[#C96A4A] focus:bg-[#FFFFFF] focus:outline-none focus:ring-1 focus:ring-[#C96A4A]"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-[#696156] mb-1.5">Custom Photo URL (optional)</label>
                  <input
                    type="url"
                    value={customAvatarUrl}
                    onChange={(e) => setCustomAvatarUrl(e.target.value)}
                    placeholder="https://example.com/photo.jpg"
                    className="w-full rounded-2xl border border-[#E8DFD3] bg-[#FAF8F5] px-4 py-2.5 text-xs text-[#292522] focus:border-[#C96A4A] focus:bg-[#FFFFFF] focus:outline-none focus:ring-1 focus:ring-[#C96A4A]"
                  />
                </div>

                <div className="flex items-center justify-between pt-2">
                  {profileSaveSuccess && (
                    <span className="text-xs font-mono text-[#5E8056] flex items-center gap-1">
                      <Check className="h-3.5 w-3.5" /> Profile updated
                    </span>
                  )}
                  <button
                    type="submit"
                    disabled={isSavingProfile || !name.trim()}
                    className="ml-auto flex items-center space-x-2 rounded-2xl bg-[#C96A4A] px-5 py-2.5 text-xs sm:text-sm font-medium text-white hover:bg-[#B75C3E] disabled:opacity-40 transition-all shadow-[0_2px_8px_rgba(201,106,74,0.18)]"
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
                <div className="rounded-2xl sm:rounded-3xl border border-[#EBE5DA] bg-[#FAF8F5] p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono uppercase tracking-widest text-[#A89F91]">Active Partner</span>
                    <span className="text-xs font-mono text-[#5E8056] flex items-center gap-1.5">
                      <span className="h-1.5 w-1.5 rounded-full bg-[#7A9C71]" />
                      Connected
                    </span>
                  </div>

                  <div className="flex items-center space-x-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#FAF2EF] border border-[#F2DDD7] text-[#C96A4A] font-serif font-medium text-lg shadow-2xs">
                      {partner.avatar_url?.startsWith('http') ? (
                        <img src={partner.avatar_url} alt={partner.name} className="h-full w-full object-cover rounded-2xl" />
                      ) : (
                        <span>{getInitial(partner.name)}</span>
                      )}
                    </div>
                    <div>
                      <h4 className="font-serif text-base sm:text-lg font-medium text-[#292522]">{partner.name}</h4>
                      <p className="text-xs font-mono text-[#7A7267]">{partner.email}</p>
                    </div>
                  </div>

                  {connectedDateFormatted && (
                    <div className="flex items-center space-x-2 text-xs font-mono text-[#7A7267] pt-2 border-t border-[#EBE5DA]">
                      <Calendar className="h-3.5 w-3.5 text-[#C96A4A]" />
                      <span>Connected since {connectedDateFormatted}</span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="rounded-2xl sm:rounded-3xl border border-[#EBE5DA] bg-[#FAF8F5] p-6 text-center">
                  <p className="text-xs sm:text-sm text-[#7A7267]">
                    You are not currently paired in an active room.
                  </p>
                  {onNavigateTab && (
                    <button
                      onClick={() => {
                        onClose();
                        onNavigateTab('duo');
                      }}
                      className="mt-3 inline-flex items-center space-x-2 rounded-2xl bg-[#C96A4A] px-4 py-2 text-xs font-medium text-white hover:bg-[#B75C3E] transition-all shadow-xs"
                    >
                      <span>Go to Connection Key</span>
                    </button>
                  )}
                </div>
              )}

              {/* Your Duo Key Card */}
              <div className="rounded-2xl sm:rounded-3xl border border-[#EBE5DA] bg-[#FFFFFF] p-5 shadow-2xs space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono uppercase tracking-widest text-[#A89F91]">Your Connection Key</span>
                  <button
                    onClick={handleRegenerateCode}
                    title="Regenerate key"
                    className="p-1 text-[#A89F91] hover:text-[#C96A4A] rounded-lg hover:bg-[#FAF2EF]"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                  </button>
                </div>

                <div className="rounded-2xl border border-[#E8DFD3] bg-[#FAF8F5] p-4 text-center">
                  <span className="font-mono text-2xl font-medium tracking-widest text-[#292522]">
                    {profile?.duo_code}
                  </span>
                </div>

                <button
                  onClick={handleCopyCode}
                  className="w-full flex items-center justify-center space-x-2 rounded-xl border border-[#E8DFD3] bg-[#FAF5EE] py-2.5 text-xs font-medium text-[#292522] hover:bg-[#FAF1EC] hover:text-[#C96A4A] transition-all"
                >
                  {copiedCode ? <Check className="h-4 w-4 text-[#5E8056]" /> : <Copy className="h-4 w-4 text-[#A89F91]" />}
                  <span>{copiedCode ? 'Key copied to clipboard' : 'Copy Connection Key'}</span>
                </button>
              </div>

              {/* Disconnect / Leave Duo */}
              {hasActiveDuo && (
                <div className="rounded-2xl sm:rounded-3xl border border-[#F4DCD9] bg-[#FAF2F0] p-5 space-y-3">
                  <h4 className="text-[10px] font-semibold text-[#C96A4A] uppercase tracking-wider font-mono">
                    Disconnect Room
                  </h4>
                  <p className="text-xs text-[#7A7267]">
                    Disconnecting will un-pair you and {partner?.name}. You will need to exchange keys to connect again.
                  </p>

                  {!confirmLeaveDuo ? (
                    <button
                      onClick={() => setConfirmLeaveDuo(true)}
                      className="rounded-xl border border-[#F0DDD4] bg-[#FFFFFF] px-4 py-2 text-xs font-medium text-[#C96A4A] hover:bg-[#FAF0ED] transition-all"
                    >
                      Disconnect from Duo
                    </button>
                  ) : (
                    <div className="space-y-2 pt-2">
                      <p className="text-xs font-semibold text-[#C96A4A]">
                        Are you sure you want to disconnect?
                      </p>
                      <div className="flex gap-2">
                        <button
                          onClick={handleLeaveDuo}
                          disabled={actionLoading}
                          className="rounded-xl bg-[#C96A4A] px-4 py-2 text-xs font-medium text-white hover:bg-[#B75C3E] transition-all disabled:opacity-50"
                        >
                          {actionLoading ? 'Disconnecting...' : 'Yes, Disconnect'}
                        </button>
                        <button
                          onClick={() => setConfirmLeaveDuo(false)}
                          className="rounded-xl border border-[#EBE5DA] bg-[#FFFFFF] px-3 py-2 text-xs text-[#696156]"
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
                <div className="flex items-center justify-between rounded-2xl border border-[#EBE5DA] bg-[#FAF8F5] p-4">
                  <div>
                    <h4 className="text-xs sm:text-sm font-medium text-[#292522]">Press Enter to Send</h4>
                    <p className="text-xs text-[#7A7267]">
                      When enabled, pressing <kbd className="font-mono bg-[#FFFFFF] px-1.5 py-0.5 rounded border border-[#E8DFD3] text-[10px]">Enter</kbd> sends the note immediately. Shift+Enter creates a new line.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleTogglePreference('enter_to_send', !enterToSend)}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      enterToSend ? 'bg-[#C96A4A]' : 'bg-[#D6CEBF]'
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
                <div className="flex items-center justify-between rounded-2xl border border-[#EBE5DA] bg-[#FAF8F5] p-4">
                  <div>
                    <h4 className="text-xs sm:text-sm font-medium text-[#292522]">Read Receipts</h4>
                    <p className="text-xs text-[#7A7267]">
                      Show double-check icons when messages have been viewed by your partner.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleTogglePreference('read_receipts', !readReceipts)}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      readReceipts ? 'bg-[#C96A4A]' : 'bg-[#D6CEBF]'
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
                <div className="flex items-center justify-between rounded-2xl border border-[#EBE5DA] bg-[#FAF8F5] p-4">
                  <div>
                    <h4 className="text-xs sm:text-sm font-medium text-[#292522]">In-App Notifications</h4>
                    <p className="text-xs text-[#7A7267]">
                      Display real-time popup toasts when new drawings and messages arrive.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleTogglePreference('notifications_enabled', !notificationsEnabled)}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      notificationsEnabled ? 'bg-[#C96A4A]' : 'bg-[#D6CEBF]'
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
              <div className="rounded-2xl sm:rounded-3xl border border-[#EBE5DA] bg-[#FFFFFF] p-5 space-y-3">
                <div className="flex items-center space-x-2">
                  <Trash2 className="h-4 w-4 text-[#C96A4A]" />
                  <h4 className="text-xs sm:text-sm font-medium text-[#292522]">Clear Conversation History</h4>
                </div>
                <p className="text-xs text-[#7A7267] leading-relaxed">
                  Permanently remove all messages exchanged in this DUO room.
                </p>

                {!confirmClearChat ? (
                  <button
                    onClick={() => setConfirmClearChat(true)}
                    className="rounded-xl border border-[#EBE5DA] bg-[#FAF8F5] px-4 py-2 text-xs font-medium text-[#C96A4A] hover:bg-[#FAF0ED] transition-all"
                  >
                    Clear All Messages
                  </button>
                ) : (
                  <div className="rounded-xl border border-[#F4DCD9] bg-[#FAF2F0] p-4 space-y-2.5">
                    <p className="text-xs font-semibold text-[#C96A4A]">
                      Are you sure? This will delete conversation history for both partners.
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={handleClearChat}
                        disabled={actionLoading}
                        className="rounded-xl bg-[#C96A4A] px-4 py-2 text-xs font-medium text-white hover:bg-[#B75C3E] transition-all disabled:opacity-50"
                      >
                        {actionLoading ? 'Clearing...' : 'Yes, Delete Everything'}
                      </button>
                      <button
                        onClick={() => setConfirmClearChat(false)}
                        className="rounded-xl border border-[#E8DFD3] bg-[#FFFFFF] px-3 py-2 text-xs text-[#696156]"
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
                <h3 className="font-serif text-lg font-medium text-[#292522]">Theme & Appearance</h3>
                <p className="text-xs text-[#7A7267] mt-1">
                  Choose how DUO looks on your device.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {[
                  { id: 'light', label: 'Light Ivory', desc: 'Editorial warm paper & deep ink', icon: Sun },
                  { id: 'dark', label: 'Dark Studio', desc: 'Muted slate & nocturnal warmth', icon: Moon },
                  { id: 'system', label: 'System Default', desc: 'Syncs with device appearance', icon: Laptop },
                ].map((item) => {
                  const Icon = item.icon;
                  const isSelected = theme === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleSelectTheme(item.id as any)}
                      className={`flex flex-col items-start p-4 rounded-2xl border text-left transition-all ${
                        isSelected
                          ? 'border-[#C96A4A] bg-[#FAF1EC] ring-1 ring-[#C96A4A]/30 shadow-xs'
                          : 'border-[#EBE5DA] bg-[#FFFFFF] hover:bg-[#FAF8F5]'
                      }`}
                    >
                      <div className="flex items-center justify-between w-full mb-3">
                        <Icon className={`h-5 w-5 ${isSelected ? 'text-[#C96A4A]' : 'text-[#A89F91]'}`} />
                        {isSelected && <Check className="h-4 w-4 text-[#5E8056]" />}
                      </div>
                      <span className="text-xs sm:text-sm font-semibold text-[#292522]">{item.label}</span>
                      <span className="text-[11px] text-[#7A7267] mt-1 leading-snug">{item.desc}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* SECTION 5: SECURITY & DANGER ZONE */}
          {activeSection === 'security' && (
            <div className="space-y-6">
              {/* Account Status Card */}
              <div className="rounded-2xl sm:rounded-3xl border border-[#EBE5DA] bg-[#FAF8F5] p-5 space-y-3">
                <span className="text-[10px] font-mono uppercase tracking-widest text-[#A89F91]">Authentication</span>
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-medium text-[#292522]">{profile?.email}</span>
                    <p className="text-[11px] text-[#7A7267] mt-0.5">Encrypted with Supabase Auth</p>
                  </div>
                  <span className="inline-flex items-center gap-1 rounded-full bg-[#F2F6F0] border border-[#D5E2D1] px-2.5 py-0.5 text-[10px] font-mono text-[#4D6A46]">
                    <Check className="h-3 w-3" /> Active
                  </span>
                </div>
              </div>

              {/* Change Password Form */}
              <form onSubmit={handleChangePassword} className="rounded-2xl sm:rounded-3xl border border-[#EBE5DA] bg-[#FFFFFF] p-5 space-y-4 shadow-2xs">
                <div className="flex items-center space-x-2">
                  <Lock className="h-4 w-4 text-[#C96A4A]" />
                  <h4 className="text-xs sm:text-sm font-medium text-[#292522]">Change Password</h4>
                </div>

                {passwordStatus && (
                  <div
                    className={`rounded-xl p-3 text-xs ${
                      passwordStatus.type === 'success' ? 'bg-[#F2F6F0] text-[#4D6A46] border border-[#D5E2D1]' : 'bg-[#FAF2F0] text-[#C96A4A] border border-[#F4DCD9]'
                    }`}
                  >
                    {passwordStatus.msg}
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-medium text-[#696156] mb-1">New Password</label>
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="••••••••"
                      minLength={6}
                      className="w-full rounded-2xl border border-[#E8DFD3] bg-[#FAF8F5] px-3.5 py-2 text-xs text-[#292522] focus:border-[#C96A4A] focus:outline-none focus:ring-1 focus:ring-[#C96A4A]"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-[#696156] mb-1">Confirm Password</label>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      minLength={6}
                      className="w-full rounded-2xl border border-[#E8DFD3] bg-[#FAF8F5] px-3.5 py-2 text-xs text-[#292522] focus:border-[#C96A4A] focus:outline-none focus:ring-1 focus:ring-[#C96A4A]"
                    />
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={passwordLoading || !newPassword || !confirmPassword}
                    className="rounded-2xl bg-[#C96A4A] px-4 py-2 text-xs font-medium text-white hover:bg-[#B75C3E] disabled:opacity-40 transition-all shadow-xs"
                  >
                    {passwordLoading ? 'Updating...' : 'Update Password'}
                  </button>
                </div>
              </form>

              {/* Danger Zone */}
              <div className="rounded-2xl sm:rounded-3xl border border-[#F4DCD9] bg-[#FAF2F0] p-5 space-y-3">
                <div className="flex items-center space-x-2">
                  <AlertTriangle className="h-4 w-4 text-[#C96A4A]" />
                  <h4 className="text-xs sm:text-sm font-semibold text-[#C96A4A] uppercase tracking-wider font-mono">
                    Danger Zone &mdash; Delete Account
                  </h4>
                </div>
                <p className="text-xs text-[#7A7267] leading-relaxed">
                  Permanently delete your DUO account, disconnect from your room, and erase your profile records.
                </p>

                {!confirmDeleteAccount ? (
                  <button
                    onClick={() => setConfirmDeleteAccount(true)}
                    className="rounded-2xl bg-[#C96A4A] px-4 py-2 text-xs font-medium text-white hover:bg-[#B75C3E] transition-all shadow-xs"
                  >
                    Delete Account
                  </button>
                ) : (
                  <div className="rounded-2xl border border-[#F4DCD9] bg-[#FFFFFF] p-4 space-y-3 shadow-2xs">
                    <p className="text-xs font-semibold text-[#C96A4A]">
                      Type <strong>DELETE</strong> to confirm permanent account deletion:
                    </p>
                    <input
                      type="text"
                      value={deleteConfirmText}
                      onChange={(e) => setDeleteConfirmText(e.target.value)}
                      placeholder="Type DELETE"
                      className="w-full rounded-xl border border-[#F4DCD9] px-3.5 py-2 text-xs font-mono text-[#C96A4A] focus:outline-none focus:ring-1 focus:ring-[#C96A4A]"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={handleDeleteAccount}
                        disabled={deleteConfirmText !== 'DELETE' || actionLoading}
                        className="rounded-xl bg-[#C96A4A] px-4 py-2 text-xs font-medium text-white hover:bg-[#B75C3E] disabled:opacity-40 transition-all"
                      >
                        {actionLoading ? 'Deleting...' : 'Permanently Delete Account'}
                      </button>
                      <button
                        onClick={() => {
                          setConfirmDeleteAccount(false);
                          setDeleteConfirmText('');
                        }}
                        className="rounded-xl border border-[#EBE5DA] px-3 py-2 text-xs text-[#696156]"
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
