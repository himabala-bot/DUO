'use client';

import React, { useState, useEffect } from 'react';
import { useRealtime } from '@/context/RealtimeContext';
import { MessageSquare, Palette, Sparkles, KeyRound, Bell, X } from 'lucide-react';
import { NotificationItem } from '@/types';

interface NotificationPopoutProps {
  activeTab: string;
  onNavigate: (tab: string) => void;
}

export const NotificationPopout: React.FC<NotificationPopoutProps> = ({
  activeTab,
  onNavigate,
}) => {
  const { latestNotification, markNotificationAsRead } = useRealtime();
  const [visibleNotif, setVisibleNotif] = useState<NotificationItem | null>(null);

  useEffect(() => {
    if (!latestNotification) return;

    // Suppress notification popout if user is already in that active view
    const type = latestNotification.type;
    if (activeTab === 'chat' && type === 'MESSAGE') return;
    if (activeTab === 'canvas' && type === 'DRAWING') return;
    if (activeTab === 'daily' && type === 'DAILY_RESPONSE') return;
    if (activeTab === 'duo' && (type === 'CONNECTION_REQUEST' || type === 'CONNECTION_ACCEPTED')) return;

    setVisibleNotif(latestNotification);

    // Instagram-style micro popout: pops out, stays for 2.8s, then smoothly disappears
    const timer = setTimeout(() => {
      setVisibleNotif(null);
    }, 2800);

    return () => clearTimeout(timer);
  }, [latestNotification, activeTab]);

  if (!visibleNotif) return null;

  const handleClick = () => {
    markNotificationAsRead(visibleNotif.id);
    if (visibleNotif.type === 'MESSAGE') onNavigate('chat');
    if (visibleNotif.type === 'DRAWING') onNavigate('canvas');
    if (visibleNotif.type === 'DAILY_RESPONSE') onNavigate('daily');
    if (visibleNotif.type === 'CONNECTION_REQUEST' || visibleNotif.type === 'CONNECTION_ACCEPTED') {
      onNavigate('duo');
    }
    setVisibleNotif(null);
  };

  const getIcon = () => {
    switch (visibleNotif.type) {
      case 'MESSAGE':
        return {
          icon: MessageSquare,
          bg: 'bg-[#125CB9]',
          label: 'New Message',
        };
      case 'DRAWING':
        return {
          icon: Palette,
          bg: 'bg-[#00D26A]',
          label: 'New Drawing',
        };
      case 'DAILY_RESPONSE':
        return {
          icon: Sparkles,
          bg: 'bg-[#FB923C]',
          label: 'Daily Answer',
        };
      case 'CONNECTION_REQUEST':
      case 'CONNECTION_ACCEPTED':
        return {
          icon: KeyRound,
          bg: 'bg-[#125CB9]',
          label: 'Room Update',
        };
      default:
        return {
          icon: Bell,
          bg: 'bg-theme-primary',
          label: 'Notification',
        };
    }
  };

  const iconInfo = getIcon();
  const Icon = iconInfo.icon;

  return (
    <div
      onClick={handleClick}
      className="fixed top-14 right-4 sm:top-16 sm:right-6 lg:top-5 lg:left-72 z-50 cursor-pointer animate-in fade-in zoom-in-95 slide-in-from-top-2 duration-150 select-none"
    >
      <div className="flex items-center space-x-2.5 rounded-full border border-theme bg-theme-card px-3.5 py-2 shadow-lg hover:border-[#125CB9] transition-all">
        <div className={`flex h-6 w-6 items-center justify-center rounded-full ${iconInfo.bg} text-white shadow-xs shrink-0`}>
          <Icon className="h-3.5 w-3.5" />
        </div>

        <div className="flex flex-col pr-1">
          <span className="text-[11px] font-mono font-semibold text-theme-primary tracking-tight">
            {iconInfo.label}
          </span>
          <span className="text-xs text-theme-secondary truncate max-w-[160px] sm:max-w-[220px]">
            {visibleNotif.body}
          </span>
        </div>

        <button
          onClick={(e) => {
            e.stopPropagation();
            markNotificationAsRead(visibleNotif.id);
            setVisibleNotif(null);
          }}
          className="text-theme-muted hover:text-theme-primary p-1 rounded-full"
        >
          <X className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
};
