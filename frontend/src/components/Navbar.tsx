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
  { id: 'daily', label: 'Prompts', shortLabel: 'Prompts', icon: BookOpen, accent: 'text-[#EA5E86]' },
  { id: 'chat', label: 'Chat', shortLabel: 'Chat', icon: MessageSquare, accent: 'text-[#00D0FF]' },
  { id: 'canvas', label: 'Doodles', shortLabel: 'Doodles', icon: Palette, accent: 'text-[#00D26A]' },
  { id: 'notes', label: 'Notes', shortLabel: 'Notes', icon: StickyNote, accent: 'text-[#C084FC]' },
  { id: 'todo', label: 'Lists', shortLabel: 'Lists', icon: ListTodo, accent: 'text-[#FB923C]' },
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
      <aside className="hidden lg:flex flex-col justify-between w-64 h-screen border-r border-theme bg-theme-page p-4 shrink-0 select-none transition-colors duration-200">
        {/* Top: Brand & Partner Presence */}
        <div className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <button
              onClick={() => setActiveTab('daily')}
              className="flex items-center space-x-2.5 text-left group focus:outline-none"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-[#125CB9] text-white shadow-xs group-hover:bg-[#0E4B99] transition-colors">
                <Heart className="h-4.5 w-4.5 fill-current" />
              </div>
              <div className="flex flex-col">
                <span className="font-serif text-lg font-bold tracking-tight text-theme-primary leading-none">
                  Duo
                </span>
                <span className="text-[10px] font-mono text-theme-muted mt-0.5">shared space</span>
              </div>
            </button>

            {/* Quick Theme Toggle Button */}
            <button
              onClick={toggleTheme}
              className="flex h-8 w-8 items-center justify-center rounded-full border border-theme bg-theme-card text-theme-secondary hover:text-theme-primary hover:bg-theme-card-hover transition-colors shadow-xs"
              title={`Switch to ${resolvedTheme === 'dark' ? 'Light' : 'Dark'} Mode`}
            >
              {resolvedTheme === 'dark' ? (
                <Sun className="h-4 w-4 text-[#FB923C]" />
              ) : (
                <Moon className="h-4 w-4 text-[#125CB9]" />
              )}
            </button>
          </div>

          {/* Partner Status Card */}
          {hasActiveDuo && partner ? (
            <div className="rounded-2xl border border-theme bg-theme-card p-3 shadow-xs space-y-2 transition-colors duration-200">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono uppercase tracking-wider text-theme-muted font-medium">Partner</span>
                <span
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-medium ${
                    partnerOnline
                      ? 'bg-[#00D26A]/10 text-[#00D26A] border border-[#00D26A]/20'
                      : 'bg-theme-input text-theme-muted border border-theme'
                  }`}
                >
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${
                      partnerOnline ? 'bg-[#00D26A]' : 'bg-theme-muted'
                    }`}
                  />
                  {partnerOnline ? 'online' : 'away'}
                </span>
              </div>
              <div className="flex items-center space-x-2.5">
                <Avatar src={partner.avatar_url} name={partner.name} size="sm" />
                <div className="truncate">
                  <h4 className="font-serif text-xs font-semibold text-theme-primary truncate">{partner.name}</h4>
                  <p className="text-[10px] font-mono text-theme-muted truncate">{partner.email}</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-theme bg-theme-card p-3 text-center transition-colors">
              <p className="text-xs text-theme-muted">Waiting to pair</p>
            </div>
          )}

          {/* Structured Navigation Links */}
          {hasActiveDuo && (
            <nav className="space-y-1.5 pt-1">
              <span className="block text-[10px] font-mono uppercase tracking-wider text-theme-muted px-2.5 mb-1.5 font-medium">
                Spaces
              </span>
              {NAV_TABS.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center space-x-2.5 rounded-xl px-3 py-2 text-xs font-medium transition-all ${
                      isActive
                        ? 'bg-[#125CB9] text-white font-semibold shadow-xs'
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

        {/* Bottom User Profile Section (Slack/Discord style) */}
        <div className="pt-3 border-t border-theme">
          <div className="flex items-center justify-between p-1 rounded-2xl hover:bg-theme-card/60 transition-colors">
            <button
              onClick={() => setShowSettingsModal(true)}
              className="flex items-center space-x-2.5 truncate text-left focus:outline-none flex-1 min-w-0"
              title="Open Profile Settings"
            >
              <Avatar src={profile?.avatar_url} name={profile?.name} size="sm" />
              <div className="truncate min-w-0">
                <span className="text-xs font-semibold text-theme-primary truncate block">{profile?.name}</span>
                <span className="text-[10px] font-mono text-theme-muted truncate block">Settings & Profile</span>
              </div>
            </button>

            <div className="flex items-center space-x-1 shrink-0">
              {/* Notification Popover Trigger */}
              <div className="relative">
                <button
                  onClick={() => setShowNotifications(!showNotifications)}
                  className="rounded-full p-1.5 text-theme-muted hover:text-theme-primary hover:bg-theme-card relative transition-colors"
                  title="Notifications"
                >
                  <Bell className="h-4 w-4" />
                  {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 flex h-2 w-2 rounded-full bg-[#F43F5E] ring-2 ring-theme-page" />
                  )}
                </button>

                {showNotifications && (
                  <div className="absolute right-0 bottom-full mb-2 w-72 rounded-2xl border border-theme bg-theme-card p-3.5 shadow-xl z-50 animate-in zoom-in-95 duration-150">
                    <div className="flex items-center justify-between border-b border-theme pb-2">
                      <span className="font-serif text-xs font-bold text-theme-primary">Notifications</span>
                      {unreadCount > 0 && (
                        <button
                          onClick={markAllNotificationsAsRead}
                          className="text-[10px] font-mono text-[#125CB9] hover:underline"
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
                              setShowNotifications(false);
                            }}
                            className={`cursor-pointer rounded-xl p-2 text-left text-xs ${
                              notif.is_read ? 'bg-theme-input text-theme-secondary' : 'bg-[#125CB9]/10 border border-[#125CB9]/25 text-theme-primary'
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

              {/* Settings Gear */}
              <button
                onClick={() => setShowSettingsModal(true)}
                className="rounded-full p-1.5 text-theme-muted hover:text-theme-primary hover:bg-theme-card transition-colors"
                title="Profile Settings"
              >
                <Settings className="h-4 w-4" />
              </button>

              {/* Logout Button */}
              <button
                onClick={logout}
                className="rounded-full p-1.5 text-theme-muted hover:text-[#F43F5E] hover:bg-[#F43F5E]/10 transition-colors"
                title="Sign out"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* ─────────────────────────────────────────────────────────────
          2. MOBILE TOP BAR (<1024px)
      ───────────────────────────────────────────────────────────── */}
      <header className="lg:hidden flex items-center justify-between border-b border-theme bg-theme-page px-4 py-2.5 shrink-0 transition-colors">
        <button
          onClick={() => setActiveTab('daily')}
          className="flex items-center space-x-2 text-left group focus:outline-none"
        >
          <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-[#125CB9] text-white shadow-xs">
            <Heart className="h-3.5 w-3.5 fill-current" />
          </div>
          <span className="font-serif text-lg font-bold tracking-tight text-theme-primary">
            Duo
          </span>
        </button>

        <div className="flex items-center space-x-2">
          {hasActiveDuo && partner && (
            <div className="flex items-center space-x-1.5 rounded-full border border-theme bg-theme-card px-2.5 py-0.5 shadow-xs">
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  partnerOnline ? 'bg-[#00D26A]' : 'bg-theme-muted'
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
              className="rounded-full p-1.5 text-theme-secondary hover:bg-theme-card transition-colors"
              title="Toggle theme"
            >
              {resolvedTheme === 'dark' ? (
                <Sun className="h-4 w-4 text-[#FB923C]" />
              ) : (
                <Moon className="h-4 w-4 text-[#125CB9]" />
              )}
            </button>

            {/* Notification Bell */}
            <div className="relative">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative rounded-full p-1.5 text-theme-secondary hover:bg-theme-card transition-colors"
                title="Notifications"
              >
                <Bell className="h-4 w-4" />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 flex h-2 w-2 rounded-full bg-[#F43F5E] ring-2 ring-theme-page" />
                )}
              </button>

              {showNotifications && (
                <div className="absolute right-0 top-full mt-2 w-72 rounded-2xl border border-theme bg-theme-card p-3.5 shadow-lg z-50 animate-in zoom-in-95 duration-150">
                  <div className="flex items-center justify-between border-b border-theme pb-2">
                    <span className="font-serif text-xs font-bold text-theme-primary">Notifications</span>
                    {unreadCount > 0 && (
                      <button
                        onClick={markAllNotificationsAsRead}
                        className="text-[10px] font-mono text-[#125CB9] hover:underline"
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
                            setShowNotifications(false);
                          }}
                          className={`cursor-pointer rounded-xl p-2 text-left text-xs ${
                            notif.is_read ? 'bg-theme-input text-theme-secondary' : 'bg-[#125CB9]/10 border border-[#125CB9]/25 text-theme-primary'
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

            {/* Settings */}
            <button
              onClick={() => setShowSettingsModal(true)}
              className="rounded-full p-1.5 text-theme-secondary hover:bg-theme-card"
              title="Settings"
            >
              <Settings className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Fixed Bottom Pill Navbar (<640px) */}
      {hasActiveDuo && (
        <nav className="fixed bottom-3 left-3 right-3 z-40 sm:hidden flex justify-center">
          <div className="flex items-center justify-around w-full max-w-sm rounded-full border border-theme bg-theme-card/95 backdrop-blur-md px-2 py-1 shadow-lg">
            {NAV_TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex flex-col items-center justify-center py-1 px-2 rounded-full transition-all min-w-[48px] min-h-[42px] ${
                    isActive ? 'text-[#125CB9] font-semibold bg-[#125CB9]/10' : 'text-theme-muted hover:text-theme-primary'
                  }`}
                >
                  <Icon className={`h-4 w-4 ${isActive ? 'stroke-[2.2]' : 'stroke-[1.8]'}`} />
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
