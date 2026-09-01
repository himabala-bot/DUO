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
      <aside className="hidden lg:flex flex-col justify-between w-64 h-screen border-r border-theme bg-theme-page p-4 shrink-0 select-none transition-colors duration-200">
        {/* Top: Brand & Partner Presence */}
        <div className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <button
              onClick={() => setActiveTab('daily')}
              className="flex items-center space-x-2.5 text-left group focus:outline-none"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#5B58E6] text-white shadow-xs group-hover:bg-[#4A46DC] transition-colors">
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
              className="flex h-7 w-7 items-center justify-center rounded-md border border-theme bg-theme-card text-theme-secondary hover:text-theme-primary hover:bg-theme-card-hover transition-colors shadow-xs"
              title={`Switch to ${resolvedTheme === 'dark' ? 'Light' : 'Dark'} Mode`}
            >
              {resolvedTheme === 'dark' ? (
                <Sun className="h-3.5 w-3.5 text-[#FB923C]" />
              ) : (
                <Moon className="h-3.5 w-3.5 text-[#5B58E6]" />
              )}
            </button>
          </div>

          {/* Partner Status Card */}
          {hasActiveDuo && partner ? (
            <div className="rounded-lg border border-theme bg-theme-card p-3 shadow-xs space-y-2 transition-colors duration-200">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono uppercase tracking-wider text-theme-muted font-medium">Partner</span>
                <span
                  className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono font-medium ${
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
            <div className="rounded-lg border border-theme bg-theme-card p-3 text-center transition-colors">
              <p className="text-xs text-theme-muted">Waiting to pair keys</p>
            </div>
          )}

          {/* Structured Navigation Links */}
          {hasActiveDuo && (
            <nav className="space-y-1 pt-1">
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
                    className={`w-full flex items-center space-x-2.5 rounded-lg px-2.5 py-2 text-xs font-medium transition-all ${
                      isActive
                        ? 'bg-[#5B58E6] text-white font-semibold shadow-xs'
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
          <div className="flex items-center justify-between p-1 rounded-lg hover:bg-theme-card/60 transition-colors">
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

            <div className="flex items-center space-x-0.5 shrink-0 ml-1">
              {/* Notification Bell */}
              <div className="relative">
                <button
                  onClick={() => setShowNotifications(!showNotifications)}
                  className="rounded-md p-1.5 text-theme-secondary hover:bg-theme-card hover:text-theme-primary transition-colors relative"
                  title="Notifications"
                >
                  <Bell className="h-4 w-4" />
                  {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 flex h-2 w-2 rounded-full bg-[#F43F5E] ring-2 ring-theme-page" />
                  )}
                </button>

                {/* Notifications Dropdown */}
                {showNotifications && (
                  <div className="absolute left-0 bottom-10 w-80 rounded-xl border border-theme bg-theme-card p-3.5 shadow-lg z-50 animate-in zoom-in-95 duration-150">
                    <div className="flex items-center justify-between pb-2.5 border-b border-theme">
                      <span className="text-xs font-serif font-bold text-theme-primary">Notifications</span>
                      {unreadCount > 0 && (
                        <button
                          onClick={markAllNotificationsAsRead}
                          className="text-[10px] text-[#5B58E6] hover:underline flex items-center gap-1 font-mono"
                        >
                          <CheckCheck className="h-3 w-3" /> Mark all read
                        </button>
                      )}
                    </div>
                    <div className="mt-2.5 max-h-72 overflow-y-auto space-y-1.5 pr-1">
                      {notifications.length === 0 ? (
                        <div className="py-6 text-center text-xs text-theme-muted font-mono">
                          No new notifications
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
                            className={`cursor-pointer rounded-lg p-2 text-left transition-all ${
                              notif.is_read
                                ? 'bg-theme-input text-theme-secondary hover:bg-theme-card-hover'
                                : 'bg-[#5B58E6]/10 border border-[#5B58E6]/25 text-theme-primary hover:bg-[#5B58E6]/15'
                            }`}
                          >
                            <span className="text-xs font-semibold text-theme-primary block">{notif.title}</span>
                            <p className="mt-0.5 text-xs text-theme-secondary line-clamp-2">{notif.body}</p>
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
                className="rounded-md p-1.5 text-theme-secondary hover:bg-theme-card hover:text-theme-primary transition-colors"
                title="Settings"
              >
                <Settings className="h-4 w-4" />
              </button>

              {/* Sign Out */}
              <button
                onClick={logout}
                title="Sign Out"
                className="rounded-md p-1.5 text-theme-muted hover:bg-theme-card hover:text-[#F43F5E] transition-colors"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* ─────────────────────────────────────────────────────────────
          2. MOBILE & TABLET TOP HEADER & PILL NAVBAR (<1024px)
      ───────────────────────────────────────────────────────────── */}
      <header className="lg:hidden flex items-center justify-between border-b border-theme bg-theme-page px-4 py-2.5 shrink-0 transition-colors">
        <button
          onClick={() => setActiveTab('daily')}
          className="flex items-center space-x-2 text-left group focus:outline-none"
        >
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#5B58E6] text-white shadow-xs">
            <Heart className="h-3.5 w-3.5 fill-current" />
          </div>
          <span className="font-serif text-lg font-bold tracking-tight text-theme-primary">
            Duo
          </span>
        </button>

        {/* Right Header Controls: Partner Status Badge + Theme Toggle + Notifications + Settings */}
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
              className="rounded-md p-1.5 text-theme-secondary hover:bg-theme-card transition-colors"
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
                className="relative rounded-md p-1.5 text-theme-secondary hover:bg-theme-card transition-colors"
                title="Notifications"
              >
                <Bell className="h-4 w-4" />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 flex h-2 w-2 rounded-full bg-[#F43F5E] ring-2 ring-theme-page" />
                )}
              </button>

              {showNotifications && (
                <div className="absolute right-0 top-full mt-2 w-72 rounded-xl border border-theme bg-theme-card p-3.5 shadow-lg z-50 animate-in zoom-in-95 duration-150">
                  <div className="flex items-center justify-between border-b border-theme pb-2">
                    <span className="font-serif text-xs font-bold text-theme-primary">Notifications</span>
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
                          className={`cursor-pointer rounded-lg p-2 text-left text-xs ${
                            notif.is_read ? 'bg-theme-input text-theme-secondary' : 'bg-[#5B58E6]/10 border border-[#5B58E6]/25 text-theme-primary'
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
              className="rounded-md p-1.5 text-theme-secondary hover:bg-theme-card"
              title="Settings"
            >
              <Settings className="h-4 w-4" />
            </button>

            {/* Profile Avatar */}
            <button
              onClick={() => setShowSettingsModal(true)}
              className="rounded-full hover:scale-105 transition-all focus:outline-none ml-0.5"
              title="Profile"
            >
              <Avatar src={profile?.avatar_url} name={profile?.name} size="xs" />
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Fixed Bottom Pill Navbar (<640px) */}
      {hasActiveDuo && (
        <nav className="fixed bottom-3 left-3 right-3 z-40 sm:hidden flex justify-center">
          <div className="flex items-center justify-around w-full max-w-sm rounded-xl border border-theme bg-theme-card/95 backdrop-blur-md px-2 py-1 shadow-lg">
            {NAV_TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex flex-col items-center justify-center py-1 px-2 rounded-lg transition-all min-w-[48px] min-h-[42px] ${
                    isActive ? 'text-[#5B58E6] font-semibold bg-[#5B58E6]/10' : 'text-theme-muted hover:text-theme-primary'
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
