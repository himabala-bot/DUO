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
} from 'lucide-react';
import { ProfileSettingsModal } from './ProfileSettingsModal';
import { NotificationPopout } from './NotificationPopout';

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

const NAV_TABS = [
  { id: 'daily', label: 'Daily Questions', shortLabel: 'Daily', icon: BookOpen },
  { id: 'chat', label: 'Chat Stream', shortLabel: 'Chat', icon: MessageSquare },
  { id: 'canvas', label: 'Drawing Studio', shortLabel: 'Canvas', icon: Palette },
  { id: 'history', label: 'Memory Archive', shortLabel: 'Memories', icon: Archive },
  { id: 'duo', label: 'Room Key', shortLabel: 'Room', icon: KeyRound },
];

export const Navbar: React.FC<NavbarProps> = ({ activeTab, setActiveTab }) => {
  const { profile, partner, hasActiveDuo, logout } = useAuth();
  const { notifications, unreadCount, markNotificationAsRead, markAllNotificationsAsRead, partnerOnline } = useRealtime();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  return (
    <>
      {/* ─────────────────────────────────────────────────────────────
          1. LAPTOP & DESKTOP SIDEBAR (≥1024px)
      ───────────────────────────────────────────────────────────── */}
      <aside className="hidden lg:flex flex-col justify-between w-64 h-screen border-r border-[#E8E4DB] bg-[#FBFAF7] p-5 shrink-0 select-none">
        {/* Top: Brand & Partner Presence */}
        <div className="space-y-6">
          <button
            onClick={() => setActiveTab('daily')}
            className="flex items-baseline space-x-2 text-left group focus:outline-none"
          >
            <span className="font-serif text-2xl font-normal tracking-tight text-[#1C1917] group-hover:text-[#C2410C] transition-colors">
              Duo
            </span>
            <span className="text-[10px] font-mono uppercase tracking-widest text-[#8C857B]">
              / private room
            </span>
          </button>

          {/* Partner Status Card */}
          {hasActiveDuo && partner ? (
            <div className="rounded-2xl border border-[#E8E4DB] bg-[#FFFFFF] p-3.5 shadow-sm space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono uppercase tracking-widest text-[#8C857B]">Partner</span>
                <span
                  className={`inline-flex items-center gap-1 text-[10px] font-mono ${
                    partnerOnline ? 'text-[#059669]' : 'text-[#8C857B]'
                  }`}
                >
                  <span
                    className={`h-2 w-2 rounded-full transition-colors ${
                      partnerOnline ? 'bg-[#059669] animate-pulse' : 'bg-[#D4CEC2]'
                    }`}
                  />
                  {partnerOnline ? 'online' : 'offline'}
                </span>
              </div>
              <div className="flex items-center space-x-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#F5F2EB] text-base border border-[#E8E4DB]">
                  {partner.avatar_url && !partner.avatar_url.startsWith('http') ? (
                    <span>{partner.avatar_url}</span>
                  ) : (
                    <span>🕊️</span>
                  )}
                </div>
                <div className="truncate">
                  <h4 className="font-serif text-sm font-medium text-[#1C1917] truncate">{partner.name}</h4>
                  <p className="text-[10px] font-mono text-[#8C857B] truncate">{partner.email}</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-[#E8E4DB] bg-[#F5F2EB] p-3 text-center">
              <p className="text-xs text-[#78716C]">Unconnected room</p>
            </div>
          )}

          {/* Structured Navigation Links */}
          {hasActiveDuo && (
            <nav className="space-y-1.5 pt-2">
              <span className="block text-[10px] font-mono uppercase tracking-widest text-[#8C857B] px-3 mb-2">
                Navigation
              </span>
              {NAV_TABS.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center space-x-3 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm font-medium transition-all ${
                      isActive
                        ? 'bg-[#1C1917] text-white font-semibold shadow-sm'
                        : 'text-[#57534E] hover:bg-[#F5F2EB] hover:text-[#1C1917]'
                    }`}
                  >
                    <Icon className={`h-4 w-4 ${isActive ? 'text-[#FAF8F5]' : 'text-[#8C857B]'}`} />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </nav>
          )}
        </div>

        {/* Bottom Utility Controls: Notifications, Settings, Profile, Logout */}
        <div className="pt-4 border-t border-[#E8E4DB] space-y-3">
          <div className="flex items-center justify-between px-1">
            {/* Notification Bell */}
            <div className="relative">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative rounded-xl p-2.5 text-[#57534E] hover:bg-[#F5F2EB] hover:text-[#1C1917] transition-colors"
                title="Notifications"
              >
                <Bell className="h-4.5 w-4.5" />
                {unreadCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 flex h-2 w-2 rounded-full bg-[#C2410C]" />
                )}
              </button>

              {/* Notifications Dropdown */}
              {showNotifications && (
                <div className="absolute left-0 bottom-12 w-80 rounded-2xl border border-[#E8E4DB] bg-[#FFFFFF] p-4 shadow-[0_12px_32px_rgba(28,25,23,0.12)] z-50">
                  <div className="flex items-center justify-between pb-3 border-b border-[#E8E4DB]">
                    <span className="text-sm font-serif font-medium text-[#1C1917]">Notifications</span>
                    {unreadCount > 0 && (
                      <button
                        onClick={markAllNotificationsAsRead}
                        className="text-[11px] text-[#C2410C] hover:underline flex items-center gap-1 font-mono"
                      >
                        <CheckCheck className="h-3 w-3" /> Mark all read
                      </button>
                    )}
                  </div>
                  <div className="mt-3 max-h-72 overflow-y-auto space-y-2 pr-1">
                    {notifications.length === 0 ? (
                      <div className="py-6 text-center text-xs text-[#8C857B] font-mono">
                        No notifications yet.
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
                          className={`cursor-pointer rounded-xl p-2.5 text-left transition-all ${
                            notif.is_read
                              ? 'bg-[#FBFAF7] text-[#78716C] hover:bg-[#F5F2EB]'
                              : 'bg-[#FAF2ED] border border-[#F0D5C7] text-[#1C1917] hover:bg-[#F5E6DC]'
                          }`}
                        >
                          <span className="text-xs font-medium text-[#1C1917] block">{notif.title}</span>
                          <p className="mt-0.5 text-xs text-[#57534E] line-clamp-2">{notif.body}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Separate Settings Icon Button */}
            <button
              onClick={() => setShowSettingsModal(true)}
              className="rounded-xl p-2.5 text-[#57534E] hover:bg-[#F5F2EB] hover:text-[#1C1917] transition-colors"
              title="Settings"
            >
              <Settings className="h-4.5 w-4.5" />
            </button>

            {/* Separate Profile Icon Button (Icon Only) */}
            <button
              onClick={() => setShowSettingsModal(true)}
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#E8E4DB] bg-[#FFFFFF] text-sm text-[#1C1917] hover:border-[#C2410C] hover:scale-105 transition-all shadow-sm"
              title="Profile"
            >
              {profile?.avatar_url && !profile.avatar_url.startsWith('http') ? (
                <span>{profile.avatar_url}</span>
              ) : (
                <User className="h-4.5 w-4.5 text-[#C2410C]" />
              )}
            </button>

            {/* Sign Out */}
            <button
              onClick={logout}
              title="Sign Out"
              className="rounded-xl p-2.5 text-[#8C857B] hover:bg-[#FEF2F2] hover:text-[#DC2626] transition-colors"
            >
              <LogOut className="h-4.5 w-4.5" />
            </button>
          </div>
        </div>
      </aside>

      {/* ─────────────────────────────────────────────────────────────
          2. MOBILE & TABLET TOP HEADER & PILL NAVBAR (<1024px)
      ───────────────────────────────────────────────────────────── */}
      <header className="lg:hidden sticky top-0 z-40 w-full border-b border-[#E8E4DB] bg-[#FBFAF7]/95 backdrop-blur-md shrink-0">
        <div className="flex h-14 items-center justify-between px-4 sm:px-6">
          {/* Logo & Partner Status */}
          <div className="flex items-center space-x-2.5">
            <button
              onClick={() => setActiveTab('daily')}
              className="flex items-baseline space-x-1.5 text-left group focus:outline-none"
            >
              <span className="font-serif text-xl font-normal tracking-tight text-[#1C1917]">
                Duo
              </span>
            </button>

            {hasActiveDuo && partner && (
              <div className="flex items-center space-x-1.5 border-l border-[#E8E4DB] pl-2.5 text-xs">
                <span
                  className={`h-2 w-2 rounded-full ${
                    partnerOnline ? 'bg-[#059669]' : 'bg-[#D4CEC2]'
                  }`}
                />
                <span className="font-serif italic text-[#1C1917] truncate max-w-[100px] sm:max-w-[160px]">
                  {partner.name}
                </span>
              </div>
            )}
          </div>

          {/* Tablet Middle Pill Navigation (640px to 1023px) */}
          {hasActiveDuo && (
            <nav className="hidden sm:flex md:flex items-center space-x-1 border border-[#E8E4DB] rounded-full bg-[#F5F2EB] p-1 shadow-sm">
              {NAV_TABS.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center space-x-1.5 rounded-full px-3 py-1 text-xs font-medium transition-all ${
                      isActive
                        ? 'bg-[#FFFFFF] text-[#1C1917] shadow-sm font-semibold'
                        : 'text-[#78716C] hover:text-[#1C1917]'
                    }`}
                  >
                    <Icon className={`h-3.5 w-3.5 ${isActive ? 'text-[#C2410C]' : 'text-[#8C857B]'}`} />
                    <span>{tab.shortLabel}</span>
                  </button>
                );
              })}
            </nav>
          )}

          {/* Top Utility Controls */}
          <div className="flex items-center space-x-1 sm:space-x-2">
            {/* Notification Bell */}
            <div className="relative">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative rounded-xl p-2 text-[#57534E] hover:bg-[#F5F2EB]"
                aria-label="Notifications"
              >
                <Bell className="h-4 w-4" />
                {unreadCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 flex h-2 w-2 rounded-full bg-[#C2410C]" />
                )}
              </button>

              {/* Notifications Dropdown for Mobile/Tablet */}
              {showNotifications && (
                <div className="absolute right-0 mt-2 w-80 rounded-2xl border border-[#E8E4DB] bg-[#FFFFFF] p-4 shadow-[0_12px_32px_rgba(28,25,23,0.12)] z-50">
                  <div className="flex items-center justify-between pb-3 border-b border-[#E8E4DB]">
                    <span className="text-xs font-serif font-medium text-[#1C1917]">Notifications</span>
                    {unreadCount > 0 && (
                      <button
                        onClick={markAllNotificationsAsRead}
                        className="text-[10px] text-[#C2410C] hover:underline font-mono"
                      >
                        Mark all read
                      </button>
                    )}
                  </div>
                  <div className="mt-3 max-h-72 overflow-y-auto space-y-2">
                    {notifications.length === 0 ? (
                      <div className="py-6 text-center text-xs text-[#8C857B] font-mono">No notifications</div>
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
                          className="rounded-xl p-2 text-xs bg-[#FBFAF7] hover:bg-[#F5F2EB] cursor-pointer"
                        >
                          <span className="font-medium text-[#1C1917] block">{notif.title}</span>
                          <p className="text-[#78716C] mt-0.5">{notif.body}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Separate Settings Icon Button */}
            <button
              onClick={() => setShowSettingsModal(true)}
              className="rounded-xl p-2 text-[#57534E] hover:bg-[#F5F2EB]"
              title="Settings"
            >
              <Settings className="h-4 w-4" />
            </button>

            {/* Separate Profile Icon Button */}
            <button
              onClick={() => setShowSettingsModal(true)}
              className="flex h-8 w-8 items-center justify-center rounded-xl border border-[#E8E4DB] bg-[#FFFFFF] text-xs shadow-sm"
              title="Profile"
            >
              {profile?.avatar_url && !profile.avatar_url.startsWith('http') ? (
                <span>{profile.avatar_url}</span>
              ) : (
                <User className="h-4 w-4 text-[#C2410C]" />
              )}
            </button>

            {/* Sign Out */}
            <button
              onClick={logout}
              title="Sign Out"
              className="rounded-xl p-2 text-[#8C857B] hover:text-[#DC2626]"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Fixed Bottom Pill Navbar (<640px) */}
      {hasActiveDuo && (
        <nav className="fixed bottom-3 left-3 right-3 z-40 sm:hidden flex justify-center">
          <div className="flex items-center justify-around w-full max-w-sm rounded-full border border-[#E8E4DB] bg-[#FBFAF7]/95 backdrop-blur-md px-3 py-1.5 shadow-[0_4px_20px_rgba(28,25,23,0.08)]">
            {NAV_TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-full transition-all min-w-[50px] min-h-[44px] ${
                    isActive ? 'text-[#C2410C]' : 'text-[#78716C] hover:text-[#1C1917]'
                  }`}
                >
                  <Icon className={`h-4.5 w-4.5 ${isActive ? 'stroke-[2.4]' : 'stroke-[1.8]'}`} />
                  <span className={`text-[9px] mt-0.5 ${isActive ? 'font-semibold' : 'font-normal'}`}>
                    {tab.shortLabel}
                  </span>
                </button>
              );
            })}
          </div>
        </nav>
      )}

      {/* Instagram-style Dynamic Micro Notification Popout */}
      <NotificationPopout activeTab={activeTab} onNavigate={setActiveTab} />

      {/* Profile & Settings Experience Modal */}
      <ProfileSettingsModal
        isOpen={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
        onNavigateTab={setActiveTab}
      />
    </>
  );
};
