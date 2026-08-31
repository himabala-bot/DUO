'use client';

import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRealtime } from '@/context/RealtimeContext';
import {
  Bell,
  LogOut,
  User,
  CheckCheck,
  MessageSquare,
  Palette,
  BookOpen,
  Archive,
  KeyRound,
  Settings,
  Sparkles,
  Heart,
  Smile,
} from 'lucide-react';
import { ProfileSettingsModal } from './ProfileSettingsModal';
import { NotificationPopout } from './NotificationPopout';

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

const NAV_TABS = [
  { id: 'daily', label: 'Daily Notes', shortLabel: 'Notes', icon: BookOpen, emoji: '🌸', accent: 'bg-[#FFF0F3] text-[#E11D48] border-[#FCE1E8]' },
  { id: 'chat', label: 'Sweet Chat', shortLabel: 'Chat', icon: MessageSquare, emoji: '💬', accent: 'bg-[#FFF4ED] text-[#EA580C] border-[#FED7AA]' },
  { id: 'canvas', label: 'Doodle Pad', shortLabel: 'Doodle', icon: Palette, emoji: '🎨', accent: 'bg-[#F0FDF4] text-[#16A34A] border-[#BBF7D0]' },
  { id: 'history', label: 'Memories', shortLabel: 'Memories', icon: Archive, emoji: '📸', accent: 'bg-[#FAF5FF] text-[#9333EA] border-[#E9D5FF]' },
  { id: 'duo', label: 'Our Key', shortLabel: 'Key', icon: KeyRound, emoji: '🗝️', accent: 'bg-[#FEFCE8] text-[#CA8A04] border-[#FEF08A]' },
];

export const Navbar: React.FC<NavbarProps> = ({ activeTab, setActiveTab }) => {
  const { profile, partner, hasActiveDuo, logout } = useAuth();
  const { notifications, unreadCount, markNotificationAsRead, markAllNotificationsAsRead, partnerOnline } = useRealtime();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  const getInitial = (name?: string) => (name ? name.trim().charAt(0).toUpperCase() : 'U');

  return (
    <>
      {/* ─────────────────────────────────────────────────────────────
          1. LAPTOP & DESKTOP SIDEBAR (≥1024px)
      ───────────────────────────────────────────────────────────── */}
      <aside className="hidden lg:flex flex-col justify-between w-68 h-screen border-r border-[#F4EBE6] bg-[#FFFDFC] p-5 shrink-0 select-none">
        {/* Top: Brand & Cute Couple Presence */}
        <div className="space-y-5">
          <button
            onClick={() => setActiveTab('daily')}
            className="flex items-center space-x-2.5 text-left group focus:outline-none"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-gradient-to-tr from-[#FF758C] to-[#FF7EB3] text-white shadow-[0_4px_12px_rgba(255,117,140,0.35)] group-hover:scale-105 transition-transform">
              <Heart className="h-5 w-5 fill-white" />
            </div>
            <div>
              <span className="font-serif text-2xl font-normal tracking-tight text-[#2D2522] group-hover:text-[#E11D48] transition-colors">
                Duo
              </span>
              <span className="block text-[10px] font-mono tracking-wider text-[#B2A49B]">
                our little world 💕
              </span>
            </div>
          </button>

          {/* Partner Status Card */}
          {hasActiveDuo && partner ? (
            <div className="rounded-3xl border border-[#FCE1E8] bg-gradient-to-b from-[#FFF5F7] to-[#FFFFFF] p-4 shadow-[0_4px_16px_rgba(244,114,182,0.08)] space-y-2.5 transition-all">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono uppercase tracking-wider text-[#E11D48] font-semibold flex items-center gap-1">
                  <Sparkles className="h-3 w-3" />
                  My Favorite Person
                </span>
                <span
                  className={`inline-flex items-center gap-1.5 text-[10px] font-mono px-2 py-0.5 rounded-full ${
                    partnerOnline ? 'bg-[#DCFCE7] text-[#15803D]' : 'bg-[#F5EBE6] text-[#A89A90]'
                  }`}
                >
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${
                      partnerOnline ? 'bg-[#22C55E] animate-ping' : 'bg-[#D1C2B8]'
                    }`}
                  />
                  {partnerOnline ? 'with you 💕' : 'away'}
                </span>
              </div>

              <div className="flex items-center space-x-3 pt-0.5">
                <div className="relative">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-[#FFE4E6] to-[#FED7AA] text-[#E11D48] font-serif font-bold text-base border-2 border-white shadow-sm shrink-0">
                    {partner.avatar_url && partner.avatar_url.startsWith('http') ? (
                      <img src={partner.avatar_url} alt={partner.name} className="h-full w-full object-cover rounded-2xl" />
                    ) : (
                      <span>{getInitial(partner.name)}</span>
                    )}
                  </div>
                  <span className="absolute -bottom-1 -right-1 text-xs">💖</span>
                </div>
                <div className="truncate flex-1">
                  <h4 className="font-serif text-sm font-semibold text-[#2D2522] truncate">{partner.name}</h4>
                  <p className="text-[10px] font-mono text-[#A89A90] truncate">{partner.email}</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-3xl border border-[#FDE4D8] bg-[#FFF7F2] p-4 text-center">
              <span className="text-xl block mb-1">💌</span>
              <p className="text-xs text-[#EA580C] font-serif font-medium">Waiting for your partner</p>
              <p className="text-[10px] text-[#A89A90] mt-0.5">Share your room key to connect!</p>
            </div>
          )}

          {/* Structured Navigation Links */}
          {hasActiveDuo && (
            <nav className="space-y-1.5 pt-1">
              <span className="block text-[10px] font-mono uppercase tracking-widest text-[#B2A49B] px-3 mb-2">
                Our Space
              </span>
              {NAV_TABS.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center space-x-3 rounded-2xl px-3.5 py-2.5 text-xs sm:text-[13px] font-medium transition-all ${
                      isActive
                        ? `${tab.accent} shadow-sm font-semibold border scale-[1.02]`
                        : 'text-[#6D5E56] hover:bg-[#FFF5F2] hover:text-[#E11D48]'
                    }`}
                  >
                    <span className="text-sm">{tab.emoji}</span>
                    <span className="flex-1 text-left">{tab.label}</span>
                    {isActive && (
                      <span className="h-2 w-2 rounded-full bg-[#E11D48] animate-heart-pulse" />
                    )}
                  </button>
                );
              })}
            </nav>
          )}
        </div>

        {/* Bottom Utility Controls */}
        <div className="pt-4 border-t border-[#F4EBE6] space-y-3">
          <div className="flex items-center justify-between px-1">
            {/* Notification Bell */}
            <div className="relative">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative rounded-2xl p-2.5 text-[#6D5E56] hover:bg-[#FFF0F3] hover:text-[#E11D48] transition-all"
                title="Notifications"
              >
                <Bell className="h-4.5 w-4.5" />
                {unreadCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 flex h-2.5 w-2.5 rounded-full bg-[#E11D48] animate-bounce" />
                )}
              </button>

              {/* Notifications Dropdown */}
              {showNotifications && (
                <div className="absolute left-0 bottom-12 w-80 rounded-3xl border border-[#FCE1E8] bg-[#FFFFFF] p-4 shadow-[0_16px_36px_rgba(225,29,72,0.12)] z-50">
                  <div className="flex items-center justify-between pb-3 border-b border-[#FCE1E8]">
                    <span className="text-sm font-serif font-semibold text-[#2D2522] flex items-center gap-1.5">
                      <span>💌</span> Our Updates
                    </span>
                    {unreadCount > 0 && (
                      <button
                        onClick={markAllNotificationsAsRead}
                        className="text-[11px] text-[#E11D48] hover:underline flex items-center gap-1 font-mono font-medium"
                      >
                        <CheckCheck className="h-3 w-3" /> Read all
                      </button>
                    )}
                  </div>
                  <div className="mt-3 max-h-72 overflow-y-auto space-y-2 pr-1">
                    {notifications.length === 0 ? (
                      <div className="py-6 text-center text-xs text-[#B2A49B] font-serif italic">
                        All caught up! No new notes. 💕
                      </div>
                    ) : (
                      notifications.map((notif) => (
                        <div
                          key={notif.id}
                          onClick={() => {
                            if (!notif.is_read) markNotificationAsRead(notif.id);
                            if (notif.type === 'MESSAGE') setActiveTab('chat');
                            if (notif.type === 'DRAWING') setActiveTab('canvas');
                            if (notif.type === 'DAILY_RESPONSE') setActiveTab('daily');
                            if (notif.type === 'CONNECTION_REQUEST' || notif.type === 'CONNECTION_ACCEPTED') {
                              setActiveTab('duo');
                            }
                            setShowNotifications(false);
                          }}
                          className={`cursor-pointer rounded-2xl p-3 text-left transition-all ${
                            notif.is_read
                              ? 'bg-[#FFFDF9] text-[#7A6D65] hover:bg-[#FFF5F2]'
                              : 'bg-[#FFF0F3] border border-[#FCE1E8] text-[#2D2522] hover:bg-[#FFE4E8]'
                          }`}
                        >
                          <span className="text-xs font-semibold text-[#2D2522] block">{notif.title}</span>
                          <p className="mt-0.5 text-xs text-[#6D5E56] line-clamp-2">{notif.body}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Settings */}
            <button
              onClick={() => setShowSettingsModal(true)}
              className="rounded-2xl p-2.5 text-[#6D5E56] hover:bg-[#FFF5F2] hover:text-[#E11D48] transition-all"
              title="Settings"
            >
              <Settings className="h-4.5 w-4.5" />
            </button>

            {/* Profile Avatar */}
            <button
              onClick={() => setShowSettingsModal(true)}
              className="flex h-9 w-9 items-center justify-center rounded-2xl border-2 border-[#FCE1E8] bg-gradient-to-tr from-[#FFF0F3] to-[#FED7AA] text-[#E11D48] text-xs font-serif font-bold hover:scale-110 transition-transform shadow-xs"
              title="My Profile"
            >
              {profile?.avatar_url && profile.avatar_url.startsWith('http') ? (
                <img src={profile.avatar_url} alt="Profile" className="h-full w-full object-cover rounded-2xl" />
              ) : (
                <span>{getInitial(profile?.name)}</span>
              )}
            </button>

            {/* Sign Out */}
            <button
              onClick={logout}
              title="Sign Out"
              className="rounded-2xl p-2.5 text-[#B2A49B] hover:bg-[#FFF0F3] hover:text-[#E11D48] transition-colors"
            >
              <LogOut className="h-4.5 w-4.5" />
            </button>
          </div>
        </div>
      </aside>

      {/* ─────────────────────────────────────────────────────────────
          2. MOBILE & TABLET TOP HEADER & PILL NAVBAR (<1024px)
      ───────────────────────────────────────────────────────────── */}
      <header className="lg:hidden sticky top-0 z-40 w-full border-b border-[#F4EBE6] bg-[#FFFDFC]/95 backdrop-blur-md shrink-0">
        <div className="flex h-14 items-center justify-between px-4 sm:px-6">
          {/* Logo & Partner Status */}
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setActiveTab('daily')}
              className="flex items-center space-x-1.5 text-left group focus:outline-none"
            >
              <Heart className="h-4.5 w-4.5 text-[#E11D48] fill-[#E11D48] animate-heart-pulse" />
              <span className="font-serif text-xl font-bold tracking-tight text-[#2D2522]">
                Duo
              </span>
            </button>

            {hasActiveDuo && partner && (
              <div className="flex items-center space-x-1.5 border-l border-[#F4EBE6] pl-2 text-xs">
                <span
                  className={`h-1.5 w-1.5 rounded-full ${
                    partnerOnline ? 'bg-[#22C55E]' : 'bg-[#D1C2B8]'
                  }`}
                />
                <span className="font-serif italic font-medium text-[#2D2522] truncate max-w-[100px] sm:max-w-[150px]">
                  {partner.name} 💕
                </span>
              </div>
            )}
          </div>

          {/* Tablet Middle Pill Navigation (640px to 1023px) */}
          {hasActiveDuo && (
            <nav className="hidden sm:flex md:flex items-center space-x-1 border border-[#FCE1E8] rounded-full bg-[#FFF5F7] p-1 shadow-xs">
              {NAV_TABS.map((tab) => {
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center space-x-1.5 rounded-full px-3 py-1 text-xs font-medium transition-all ${
                      isActive
                        ? 'bg-[#FFFFFF] text-[#E11D48] shadow-xs font-semibold'
                        : 'text-[#6D5E56] hover:text-[#E11D48]'
                    }`}
                  >
                    <span>{tab.emoji}</span>
                    <span>{tab.shortLabel}</span>
                  </button>
                );
              })}
            </nav>
          )}

          {/* Top Utility Controls */}
          <div className="flex items-center space-x-1 sm:space-x-1.5">
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative rounded-2xl p-2 text-[#6D5E56] hover:bg-[#FFF0F3]"
              aria-label="Notifications"
            >
              <Bell className="h-4 w-4" />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 flex h-2 w-2 rounded-full bg-[#E11D48]" />
              )}
            </button>

            <button
              onClick={() => setShowSettingsModal(true)}
              className="rounded-2xl p-2 text-[#6D5E56] hover:bg-[#FFF0F3]"
              title="Settings"
            >
              <Settings className="h-4 w-4" />
            </button>

            <button
              onClick={() => setShowSettingsModal(true)}
              className="flex h-8 w-8 items-center justify-center rounded-2xl border-2 border-[#FCE1E8] bg-gradient-to-br from-[#FFF0F3] to-[#FED7AA] text-[#E11D48] text-xs font-serif font-bold shadow-xs"
              title="Profile"
            >
              {profile?.avatar_url && profile.avatar_url.startsWith('http') ? (
                <img src={profile.avatar_url} alt="Profile" className="h-full w-full object-cover rounded-2xl" />
              ) : (
                <span>{getInitial(profile?.name)}</span>
              )}
            </button>

            <button
              onClick={logout}
              title="Sign Out"
              className="rounded-2xl p-2 text-[#B2A49B] hover:text-[#E11D48]"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Fixed Bottom Pill Navbar (<640px) */}
      {hasActiveDuo && (
        <nav className="fixed bottom-3 left-3 right-3 z-40 sm:hidden flex justify-center">
          <div className="flex items-center justify-around w-full max-w-sm rounded-full border-2 border-[#FCE1E8] bg-[#FFFDFC]/95 backdrop-blur-md px-3 py-2 shadow-[0_8px_28px_rgba(244,114,182,0.15)]">
            {NAV_TABS.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-full transition-all min-w-[50px] min-h-[44px] ${
                    isActive
                      ? 'text-[#E11D48] scale-110 font-bold'
                      : 'text-[#7A6D65] hover:text-[#E11D48]'
                  }`}
                >
                  <span className="text-base leading-none">{tab.emoji}</span>
                  <span className={`text-[9px] mt-1 ${isActive ? 'font-bold text-[#E11D48]' : 'font-medium'}`}>
                    {tab.shortLabel}
                  </span>
                </button>
              );
            })}
          </div>
        </nav>
      )}

      {/* Notification Popout */}
      <NotificationPopout activeTab={activeTab} onNavigate={setActiveTab} />

      {/* Profile & Settings Modal */}
      <ProfileSettingsModal
        isOpen={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
        onNavigateTab={setActiveTab}
      />
    </>
  );
};
