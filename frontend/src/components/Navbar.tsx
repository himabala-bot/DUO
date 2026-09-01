'use client';

import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRealtime } from '@/context/RealtimeContext';
import { useTheme } from '@/context/ThemeContext';
import {
  Bell,
  LogOut,
  CheckCheck,
  MessageSquare,
  Palette,
  BookOpen,
  StickyNote,
  ListTodo,
  KeyRound,
  Settings,
  Heart,
  Sun,
  Moon,
} from 'lucide-react';
import { ProfileSettingsModal } from './ProfileSettingsModal';
import { NotificationPopout } from './NotificationPopout';
import { Avatar } from './Avatar';

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

const NAV_TABS = [
  { id: 'daily', label: 'Daily Love Prompts', shortLabel: 'Daily', icon: BookOpen, accent: 'text-[#EA5E86]' },
  { id: 'chat', label: 'Cozy Chat', shortLabel: 'Chat', icon: MessageSquare, accent: 'text-[#00D0FF]' },
  { id: 'canvas', label: 'Doodle Studio', shortLabel: 'Doodle', icon: Palette, accent: 'text-[#00D26A]' },
  { id: 'notes', label: 'Little Notes', shortLabel: 'Notes', icon: StickyNote, accent: 'text-[#C084FC]' },
  { id: 'todo', label: 'Our Lists', shortLabel: 'Lists', icon: ListTodo, accent: 'text-[#FB923C]' },
  { id: 'duo', label: 'Secret Room Key', shortLabel: 'Key', icon: KeyRound, accent: 'text-[#5B58E6]' },
];

export const Navbar: React.FC<NavbarProps> = ({ activeTab, setActiveTab }) => {
  const { profile, partner, hasActiveDuo, logout } = useAuth();
  const { notifications, unreadCount, markNotificationAsRead, markAllNotificationsAsRead, partnerOnline } = useRealtime();
  const { resolvedTheme, toggleTheme } = useTheme();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  return (
    <>
      {/* ─────────────────────────────────────────────────────────────
          1. LAPTOP & DESKTOP SIDEBAR (≥1024px)
      ───────────────────────────────────────────────────────────── */}
      <aside className="hidden lg:flex flex-col justify-between w-64 h-screen border-r border-theme bg-theme-page p-5 shrink-0 select-none transition-colors duration-200">
        {/* Top: Brand & Partner Presence */}
        <div className="space-y-5">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setActiveTab('daily')}
              className="flex items-center space-x-2.5 text-left group focus:outline-none"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-[#5B58E6] text-white shadow-md shadow-[#5B58E6]/25 group-hover:scale-105 transition-transform">
                <Heart className="h-5 w-5 fill-current" />
              </div>
              <span className="font-serif text-2xl font-bold tracking-tight text-theme-primary group-hover:text-[#5B58E6] transition-colors">
                Duo
              </span>
            </button>

            {/* Quick Theme Toggle Button */}
            <button
              onClick={toggleTheme}
              className="flex h-8 w-8 items-center justify-center rounded-full border border-theme bg-theme-card text-theme-secondary hover:text-theme-primary hover:bg-theme-card-hover transition-colors shadow-sm"
              title={`Switch to ${resolvedTheme === 'dark' ? 'Light' : 'Dark'} Mode`}
            >
              {resolvedTheme === 'dark' ? (
                <Sun className="h-4 w-4 text-[#FB923C]" />
              ) : (
                <Moon className="h-4 w-4 text-[#5B58E6]" />
              )}
            </button>
          </div>

          {/* Partner Status Card */}
          {hasActiveDuo && partner ? (
            <div className="rounded-3xl border border-theme bg-theme-card p-3.5 shadow-sm space-y-2 transition-colors duration-200">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono uppercase tracking-widest text-theme-muted">With My Favorite</span>
                <span
                  className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-mono font-medium ${
                    partnerOnline
                      ? 'bg-[#00D26A]/15 text-[#00D26A] border border-[#00D26A]/30'
                      : 'bg-theme-input text-theme-muted border border-theme'
                  }`}
                >
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${
                      partnerOnline ? 'bg-[#00D26A] animate-pulse' : 'bg-theme-muted'
                    }`}
                  />
                  {partnerOnline ? 'here now' : 'away'}
                </span>
              </div>
              <div className="flex items-center space-x-2.5">
                <Avatar src={partner.avatar_url} name={partner.name} size="sm" />
                <div className="truncate">
                  <h4 className="font-serif text-sm font-semibold text-theme-primary truncate">{partner.name}</h4>
                  <p className="text-[10px] font-mono text-theme-muted truncate">{partner.email}</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-3xl border border-theme bg-theme-card p-3.5 text-center transition-colors">
              <p className="text-xs text-theme-muted">Waiting to pair keys</p>
            </div>
          )}

          {/* Structured Navigation Links */}
          {hasActiveDuo && (
            <nav className="space-y-1.5 pt-1">
              <span className="block text-[10px] font-mono uppercase tracking-widest text-theme-muted px-3 mb-2">
                Spaces
              </span>
              {NAV_TABS.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center space-x-3 rounded-2xl px-3.5 py-2.5 text-xs sm:text-sm font-medium transition-all ${
                      isActive
                        ? 'bg-[#5B58E6] text-white font-semibold shadow-md shadow-[#5B58E6]/25'
                        : 'text-theme-secondary hover:bg-theme-card hover:text-theme-primary'
                    }`}
                  >
                    <Icon className={`h-4 w-4 ${isActive ? 'text-white' : tab.accent}`} />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </nav>
          )}
        </div>

        {/* Bottom Utility Controls: Notifications, Settings, Profile, Logout */}
        <div className="pt-4 border-t border-theme space-y-3">
          <div className="flex items-center justify-between px-1">
            {/* Notification Bell */}
            <div className="relative">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative rounded-full p-2.5 text-theme-secondary hover:bg-theme-card hover:text-theme-primary transition-colors"
                title="Notifications"
              >
                <Bell className="h-4.5 w-4.5" />
                {unreadCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 flex h-2.5 w-2.5 rounded-full bg-[#F43F5E] ring-2 ring-theme-page" />
                )}
              </button>

              {/* Notifications Dropdown */}
              {showNotifications && (
                <div className="absolute left-0 bottom-12 w-80 rounded-3xl border border-theme bg-theme-card p-4 shadow-xl z-50 animate-in zoom-in-95 duration-150">
                  <div className="flex items-center justify-between pb-3 border-b border-theme">
                    <span className="text-sm font-serif font-medium text-theme-primary">Little Updates</span>
                    {unreadCount > 0 && (
                      <button
                        onClick={markAllNotificationsAsRead}
                        className="text-[11px] text-[#5B58E6] hover:underline flex items-center gap-1 font-mono"
                      >
                        <CheckCheck className="h-3 w-3" /> All read
                      </button>
                    )}
                  </div>
                  <div className="mt-3 max-h-72 overflow-y-auto space-y-2 pr-1">
                    {notifications.length === 0 ? (
                      <div className="py-6 text-center text-xs text-theme-muted font-mono">
                        No new updates yet
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
                          className={`cursor-pointer rounded-2xl p-2.5 text-left transition-all ${
                            notif.is_read
                              ? 'bg-theme-input text-theme-secondary hover:bg-theme-card-hover'
                              : 'bg-[#5B58E6]/10 border border-[#5B58E6]/30 text-theme-primary hover:bg-[#5B58E6]/15'
                          }`}
                        >
                          <span className="text-xs font-medium text-theme-primary block">{notif.title}</span>
                          <p className="mt-0.5 text-xs text-theme-secondary line-clamp-2">{notif.body}</p>
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
              className="rounded-full p-2.5 text-theme-secondary hover:bg-theme-card hover:text-theme-primary transition-colors"
              title="Settings"
            >
              <Settings className="h-4.5 w-4.5" />
            </button>

            {/* Separate Profile Icon Button */}
            <button
              onClick={() => setShowSettingsModal(true)}
              className="rounded-full hover:scale-105 transition-all focus:outline-none"
              title="My Profile"
            >
              <Avatar src={profile?.avatar_url} name={profile?.name} size="sm" />
            </button>

            {/* Sign Out */}
            <button
              onClick={logout}
              title="Sign Out"
              className="rounded-full p-2.5 text-theme-muted hover:bg-theme-card hover:text-[#F43F5E] transition-colors"
            >
              <LogOut className="h-4.5 w-4.5" />
            </button>
          </div>
        </div>
      </aside>

      {/* ─────────────────────────────────────────────────────────────
          2. MOBILE & TABLET TOP HEADER & PILL NAVBAR (<1024px)
      ───────────────────────────────────────────────────────────── */}
      <header className="lg:hidden flex items-center justify-between border-b border-theme bg-theme-page px-4 py-3 shrink-0 transition-colors">
        <button
          onClick={() => setActiveTab('daily')}
          className="flex items-center space-x-2 text-left group focus:outline-none"
        >
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#5B58E6] text-white shadow-sm">
            <Heart className="h-4 w-4 fill-current" />
          </div>
          <span className="font-serif text-xl font-bold tracking-tight text-theme-primary">
            Duo
          </span>
        </button>

        {/* Right Header Controls: Partner Status Badge + Theme Toggle + Notifications + Settings + Profile */}
        <div className="flex items-center space-x-2">
          {hasActiveDuo && partner && (
            <div className="flex items-center space-x-1.5 rounded-full border border-theme bg-theme-card px-2.5 py-1 shadow-sm">
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  partnerOnline ? 'bg-[#00D26A] animate-pulse' : 'bg-theme-muted'
                }`}
              />
              <span className="text-[10px] font-mono text-theme-secondary truncate max-w-[80px] sm:max-w-[120px]">
                {partner.name}
              </span>
            </div>
          )}

          <div className="flex items-center space-x-1">
            {/* Theme Toggle Button */}
            <button
              onClick={toggleTheme}
              className="rounded-full p-2 text-theme-secondary hover:bg-theme-card transition-colors"
              title="Toggle theme"
            >
              {resolvedTheme === 'dark' ? (
                <Sun className="h-4 w-4 text-[#FB923C]" />
              ) : (
                <Moon className="h-4 w-4 text-[#5B58E6]" />
              )}
            </button>

            {/* Notification Bell */}
            <div className="relative">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative rounded-full p-2 text-theme-secondary hover:bg-theme-card transition-colors"
                title="Notifications"
              >
                <Bell className="h-4 w-4" />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 flex h-2 w-2 rounded-full bg-[#F43F5E] ring-2 ring-theme-page" />
                )}
              </button>

              {showNotifications && (
                <div className="absolute right-0 top-full mt-2 w-72 rounded-3xl border border-theme bg-theme-card p-4 shadow-xl z-50 animate-in zoom-in-95 duration-150">
                  <div className="flex items-center justify-between border-b border-theme pb-2">
                    <span className="font-serif text-sm font-semibold text-theme-primary">Notifications</span>
                    {unreadCount > 0 && (
                      <button
                        onClick={markAllNotificationsAsRead}
                        className="text-[10px] font-mono text-[#5B58E6] hover:underline"
                      >
                        All read
                      </button>
                    )}
                  </div>
                  <div className="mt-2 max-h-60 overflow-y-auto space-y-1.5 pr-1">
                    {notifications.length === 0 ? (
                      <div className="py-6 text-center text-xs text-theme-muted font-mono">No updates yet</div>
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
                          className={`cursor-pointer rounded-2xl p-2 text-left text-xs ${
                            notif.is_read ? 'bg-theme-input text-theme-secondary' : 'bg-[#5B58E6]/10 border border-[#5B58E6]/30 text-theme-primary'
                          }`}
                        >
                          <span className="font-medium block">{notif.title}</span>
                          <p className="text-[11px] text-theme-secondary line-clamp-1">{notif.body}</p>
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
              className="rounded-full p-2 text-theme-secondary hover:bg-theme-card"
              title="Settings"
            >
              <Settings className="h-4 w-4" />
            </button>

            {/* Separate Profile Icon Button */}
            <button
              onClick={() => setShowSettingsModal(true)}
              className="rounded-full hover:scale-105 transition-all focus:outline-none"
              title="Profile"
            >
              <Avatar src={profile?.avatar_url} name={profile?.name} size="xs" />
            </button>

            {/* Sign Out */}
            <button
              onClick={logout}
              title="Sign Out"
              className="rounded-full p-2 text-theme-muted hover:text-[#F43F5E]"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Fixed Bottom Pill Navbar (<640px) */}
      {hasActiveDuo && (
        <nav className="fixed bottom-3 left-3 right-3 z-40 sm:hidden flex justify-center">
          <div className="flex items-center justify-around w-full max-w-sm rounded-full border border-theme bg-theme-card/95 backdrop-blur-md px-3 py-1.5 shadow-xl">
            {NAV_TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-full transition-all min-w-[50px] min-h-[44px] ${
                    isActive ? 'text-[#5B58E6] font-semibold' : 'text-theme-muted hover:text-theme-primary'
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
