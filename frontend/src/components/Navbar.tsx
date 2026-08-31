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
  Feather,
} from 'lucide-react';
import { ProfileSettingsModal } from './ProfileSettingsModal';
import { NotificationPopout } from './NotificationPopout';

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

const NAV_TABS = [
  { id: 'daily', label: 'Daily Reflections', shortLabel: 'Daily', icon: BookOpen, accent: 'text-[#C96A4A]' },
  { id: 'chat', label: 'Private Chat', shortLabel: 'Chat', icon: MessageSquare, accent: 'text-[#C9827A]' },
  { id: 'canvas', label: 'Shared Sketchbook', shortLabel: 'Canvas', icon: Palette, accent: 'text-[#A8B5A0]' },
  { id: 'history', label: 'Memory Archive', shortLabel: 'Memories', icon: Archive, accent: 'text-[#C9BDD8]' },
  { id: 'duo', label: 'Connection Key', shortLabel: 'Room', icon: KeyRound, accent: 'text-[#E8D99B]' },
];

export const Navbar: React.FC<NavbarProps> = ({ activeTab, setActiveTab }) => {
  const { profile, partner, hasActiveDuo, logout } = useAuth();
  const { notifications, unreadCount, markNotificationAsRead, markAllNotificationsAsRead, partnerOnline } = useRealtime();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  // Helper for clean initial letter avatar
  const getInitial = (name?: string) => (name ? name.trim().charAt(0).toUpperCase() : 'D');

  return (
    <>
      {/* ─────────────────────────────────────────────────────────────
          1. LAPTOP & DESKTOP SIDEBAR (≥1024px)
      ───────────────────────────────────────────────────────────── */}
      <aside className="hidden lg:flex flex-col justify-between w-64 h-screen border-r border-[#EBE5DA] bg-[#FAF8F5] p-5 shrink-0 select-none">
        {/* Top: Brand & Partner Presence */}
        <div className="space-y-5">
          <button
            onClick={() => setActiveTab('daily')}
            className="flex items-baseline space-x-2.5 text-left group focus:outline-none"
          >
            <span className="font-serif text-2xl font-normal tracking-tight text-[#292522] group-hover:text-[#C96A4A] transition-colors">
              Duo
            </span>
            <span className="text-[10px] font-mono uppercase tracking-widest text-[#9E9589] border-b border-[#E8DFD3] pb-0.5">
              space for two
            </span>
          </button>

          {/* Partner Status Card */}
          {hasActiveDuo && partner ? (
            <div className="rounded-2xl border border-[#ECE3D7] bg-[#FFFFFF] p-3.5 shadow-[0_2px_8px_rgba(41,37,34,0.03)] space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono uppercase tracking-wider text-[#A89F91]">Partner</span>
                <span
                  className={`inline-flex items-center gap-1.5 text-[10px] font-mono ${
                    partnerOnline ? 'text-[#5E8056]' : 'text-[#A89F91]'
                  }`}
                >
                  <span
                    className={`h-1.5 w-1.5 rounded-full transition-colors ${
                      partnerOnline ? 'bg-[#7A9C71] animate-pulse' : 'bg-[#D6CEBF]'
                    }`}
                  />
                  {partnerOnline ? 'connected' : 'away'}
                </span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#FAF2EF] text-[#C96A4A] font-serif font-medium text-sm border border-[#F2DDD7] shrink-0">
                  {partner.avatar_url && partner.avatar_url.startsWith('http') ? (
                    <img src={partner.avatar_url} alt={partner.name} className="h-full w-full object-cover rounded-xl" />
                  ) : (
                    <span>{getInitial(partner.name)}</span>
                  )}
                </div>
                <div className="truncate flex-1">
                  <h4 className="font-serif text-sm font-medium text-[#292522] truncate">{partner.name}</h4>
                  <p className="text-[10px] font-mono text-[#A89F91] truncate">{partner.email}</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-[#ECE3D7] bg-[#FAF5EE] p-3 text-center">
              <p className="text-xs text-[#8C8375] font-serif italic">Awaiting connection...</p>
            </div>
          )}

          {/* Structured Navigation Links */}
          {hasActiveDuo && (
            <nav className="space-y-1 pt-2">
              <span className="block text-[10px] font-mono uppercase tracking-widest text-[#A89F91] px-3 mb-2">
                Journal & Space
              </span>
              {NAV_TABS.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center space-x-3 rounded-xl px-3.5 py-2.5 text-xs sm:text-[13px] font-medium transition-all ${
                      isActive
                        ? 'bg-[#FAF1EC] text-[#C96A4A] border border-[#F0DDD4] font-semibold shadow-xs'
                        : 'text-[#696156] hover:bg-[#F5EFE6] hover:text-[#292522]'
                    }`}
                  >
                    <Icon className={`h-4 w-4 ${isActive ? 'text-[#C96A4A]' : 'text-[#9E9589]'}`} />
                    <span>{tab.label}</span>
                    {isActive && (
                      <span className="ml-auto h-1.5 w-1.5 rounded-full bg-[#C96A4A]" />
                    )}
                  </button>
                );
              })}
            </nav>
          )}
        </div>

        {/* Bottom Utility Controls */}
        <div className="pt-4 border-t border-[#EBE5DA] space-y-3">
          <div className="flex items-center justify-between px-1">
            {/* Notification Bell */}
            <div className="relative">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative rounded-xl p-2 text-[#696156] hover:bg-[#F5EFE6] hover:text-[#292522] transition-colors"
                title="Notifications"
              >
                <Bell className="h-4.5 w-4.5" />
                {unreadCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 flex h-2 w-2 rounded-full bg-[#C96A4A]" />
                )}
              </button>

              {/* Notifications Dropdown */}
              {showNotifications && (
                <div className="absolute left-0 bottom-12 w-80 rounded-2xl border border-[#E8DFD3] bg-[#FFFFFF] p-4 shadow-[0_12px_32px_rgba(41,37,34,0.08)] z-50">
                  <div className="flex items-center justify-between pb-3 border-b border-[#EBE5DA]">
                    <span className="text-sm font-serif font-medium text-[#292522]">Activity</span>
                    {unreadCount > 0 && (
                      <button
                        onClick={markAllNotificationsAsRead}
                        className="text-[11px] text-[#C96A4A] hover:underline flex items-center gap-1 font-mono"
                      >
                        <CheckCheck className="h-3 w-3" /> Mark all read
                      </button>
                    )}
                  </div>
                  <div className="mt-3 max-h-72 overflow-y-auto space-y-2 pr-1">
                    {notifications.length === 0 ? (
                      <div className="py-6 text-center text-xs text-[#9E9589] font-serif italic">
                        No recent updates in your room.
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
                              ? 'bg-[#FAF8F5] text-[#7A7267] hover:bg-[#F5EFE6]'
                              : 'bg-[#FAF1EC] border border-[#F3DFD6] text-[#292522] hover:bg-[#F6E9E2]'
                          }`}
                        >
                          <span className="text-xs font-medium text-[#292522] block">{notif.title}</span>
                          <p className="mt-0.5 text-xs text-[#696156] line-clamp-2">{notif.body}</p>
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
              className="rounded-xl p-2 text-[#696156] hover:bg-[#F5EFE6] hover:text-[#292522] transition-colors"
              title="Settings"
            >
              <Settings className="h-4.5 w-4.5" />
            </button>

            {/* Separate Profile Icon Button (Icon Only) */}
            <button
              onClick={() => setShowSettingsModal(true)}
              className="flex h-8 w-8 items-center justify-center rounded-xl border border-[#E8DFD3] bg-[#FAF5EE] text-[#C96A4A] text-xs font-serif font-medium hover:border-[#C96A4A] hover:bg-[#FAF1EC] transition-all shadow-2xs"
              title="Profile"
            >
              {profile?.avatar_url && profile.avatar_url.startsWith('http') ? (
                <img src={profile.avatar_url} alt="Profile" className="h-full w-full object-cover rounded-xl" />
              ) : (
                <span>{getInitial(profile?.name)}</span>
              )}
            </button>

            {/* Sign Out */}
            <button
              onClick={logout}
              title="Sign Out"
              className="rounded-xl p-2 text-[#A89F91] hover:bg-[#FAF0ED] hover:text-[#C96A4A] transition-colors"
            >
              <LogOut className="h-4.5 w-4.5" />
            </button>
          </div>
        </div>
      </aside>

      {/* ─────────────────────────────────────────────────────────────
          2. MOBILE & TABLET TOP HEADER & PILL NAVBAR (<1024px)
      ───────────────────────────────────────────────────────────── */}
      <header className="lg:hidden sticky top-0 z-40 w-full border-b border-[#EBE5DA] bg-[#FAF8F5]/95 backdrop-blur-md shrink-0">
        <div className="flex h-14 items-center justify-between px-4 sm:px-6">
          {/* Logo & Partner Status */}
          <div className="flex items-center space-x-2.5">
            <button
              onClick={() => setActiveTab('daily')}
              className="flex items-baseline space-x-1.5 text-left group focus:outline-none"
            >
              <span className="font-serif text-xl font-normal tracking-tight text-[#292522]">
                Duo
              </span>
            </button>

            {hasActiveDuo && partner && (
              <div className="flex items-center space-x-1.5 border-l border-[#EBE5DA] pl-2.5 text-xs">
                <span
                  className={`h-1.5 w-1.5 rounded-full ${
                    partnerOnline ? 'bg-[#7A9C71]' : 'bg-[#D6CEBF]'
                  }`}
                />
                <span className="font-serif italic text-[#292522] truncate max-w-[100px] sm:max-w-[160px]">
                  {partner.name}
                </span>
              </div>
            )}
          </div>

          {/* Tablet Middle Pill Navigation (640px to 1023px) */}
          {hasActiveDuo && (
            <nav className="hidden sm:flex md:flex items-center space-x-1 border border-[#E8DFD3] rounded-full bg-[#FAF5EE] p-1 shadow-2xs">
              {NAV_TABS.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center space-x-1.5 rounded-full px-3 py-1 text-xs font-medium transition-all ${
                      isActive
                        ? 'bg-[#FFFFFF] text-[#C96A4A] shadow-xs font-semibold'
                        : 'text-[#696156] hover:text-[#292522]'
                    }`}
                  >
                    <Icon className={`h-3.5 w-3.5 ${isActive ? 'text-[#C96A4A]' : 'text-[#9E9589]'}`} />
                    <span>{tab.shortLabel}</span>
                  </button>
                );
              })}
            </nav>
          )}

          {/* Top Utility Controls */}
          <div className="flex items-center space-x-1 sm:space-x-1.5">
            {/* Notification Bell */}
            <div className="relative">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative rounded-xl p-2 text-[#696156] hover:bg-[#F5EFE6]"
                aria-label="Notifications"
              >
                <Bell className="h-4 w-4" />
                {unreadCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 flex h-2 w-2 rounded-full bg-[#C96A4A]" />
                )}
              </button>

              {/* Mobile Notifications Dropdown */}
              {showNotifications && (
                <div className="absolute right-0 mt-2 w-72 rounded-2xl border border-[#E8DFD3] bg-[#FFFFFF] p-3.5 shadow-[0_12px_32px_rgba(41,37,34,0.08)] z-50">
                  <div className="flex items-center justify-between pb-2.5 border-b border-[#EBE5DA]">
                    <span className="text-xs font-serif font-medium text-[#292522]">Activity</span>
                    {unreadCount > 0 && (
                      <button
                        onClick={markAllNotificationsAsRead}
                        className="text-[10px] text-[#C96A4A] hover:underline font-mono"
                      >
                        Mark all read
                      </button>
                    )}
                  </div>
                  <div className="mt-2.5 max-h-60 overflow-y-auto space-y-1.5">
                    {notifications.length === 0 ? (
                      <div className="py-4 text-center text-xs text-[#9E9589] font-serif italic">No updates</div>
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
                          className="rounded-xl p-2 text-xs bg-[#FAF8F5] hover:bg-[#F5EFE6] cursor-pointer"
                        >
                          <span className="font-medium text-[#292522] block">{notif.title}</span>
                          <p className="text-[#7A7267] mt-0.5">{notif.body}</p>
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
              className="rounded-xl p-2 text-[#696156] hover:bg-[#F5EFE6]"
              title="Settings"
            >
              <Settings className="h-4 w-4" />
            </button>

            {/* Separate Profile Icon Button */}
            <button
              onClick={() => setShowSettingsModal(true)}
              className="flex h-7.5 w-7.5 items-center justify-center rounded-xl border border-[#E8DFD3] bg-[#FAF5EE] text-[#C96A4A] text-xs font-serif font-medium shadow-2xs"
              title="Profile"
            >
              {profile?.avatar_url && profile.avatar_url.startsWith('http') ? (
                <img src={profile.avatar_url} alt="Profile" className="h-full w-full object-cover rounded-xl" />
              ) : (
                <span>{getInitial(profile?.name)}</span>
              )}
            </button>

            {/* Sign Out */}
            <button
              onClick={logout}
              title="Sign Out"
              className="rounded-xl p-2 text-[#A89F91] hover:text-[#C96A4A]"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Fixed Bottom Pill Navbar (<640px) */}
      {hasActiveDuo && (
        <nav className="fixed bottom-3 left-3 right-3 z-40 sm:hidden flex justify-center">
          <div className="flex items-center justify-around w-full max-w-sm rounded-full border border-[#E8DFD3] bg-[#FAF8F5]/95 backdrop-blur-md px-3 py-1.5 shadow-[0_4px_20px_rgba(41,37,34,0.06)]">
            {NAV_TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-full transition-all min-w-[50px] min-h-[44px] ${
                    isActive ? 'text-[#C96A4A]' : 'text-[#7A7267] hover:text-[#292522]'
                  }`}
                >
                  <Icon className={`h-4.5 w-4.5 ${isActive ? 'stroke-[2.2]' : 'stroke-[1.8]'}`} />
                  <span className={`text-[9px] mt-0.5 ${isActive ? 'font-semibold' : 'font-normal'}`}>
                    {tab.shortLabel}
                  </span>
                </button>
              );
            })}
          </div>
        </nav>
      )}

      {/* Dynamic Micro Notification Popout */}
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
