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
          bg: 'bg-[#C2410C]',
          label: 'New Message',
        };
      case 'DRAWING':
        return {
          icon: Palette,
          bg: 'bg-[#059669]',
          label: 'New Drawing',
        };
      case 'DAILY_RESPONSE':
        return {
          icon: Sparkles,
          bg: 'bg-[#D97706]',
          label: 'Daily Answer',
        };
      case 'CONNECTION_REQUEST':
      case 'CONNECTION_ACCEPTED':
        return {
          icon: KeyRound,
          bg: 'bg-[#4F46E5]',
          label: 'Room Update',
        };
      default:
        return {
          icon: Bell,
          bg: 'bg-[#1C1917]',
          label: 'Notification',
        };
    }
  };

  const iconInfo = getIcon();
  const Icon = iconInfo.icon;

  return (
    <div
      onClick={handleClick}
      className="fixed top-16 right-4 sm:top-20 sm:right-6 lg:top-6 lg:left-68 z-50 cursor-pointer animate-in fade-in zoom-in-95 slide-in-from-top-3 duration-200 select-none"
    >
      <div className="flex items-center space-x-2.5 rounded-full border border-[#E8E4DB] bg-[#FFFFFF] px-3.5 py-2 shadow-[0_8px_24px_rgba(28,25,23,0.12)] hover:scale-105 transition-transform">
        {/* Instagram-style dynamic popping icon badge */}
        <div className={`flex h-7 w-7 items-center justify-center rounded-full ${iconInfo.bg} text-white shadow-sm shrink-0 animate-pulse`}>
          <Icon className="h-3.5 w-3.5" />
        </div>

        <div className="flex flex-col pr-1">
          <span className="text-[11px] font-mono font-semibold text-[#1C1917] tracking-tight">
            {iconInfo.label}
          </span>
          <span className="text-[11px] text-[#78716C] truncate max-w-[160px] sm:max-w-[220px]">
            {visibleNotif.body}
          </span>
        </div>

        <button
          onClick={(e) => {
            e.stopPropagation();
            markNotificationAsRead(visibleNotif.id);
            setVisibleNotif(null);
          }}
          className="text-[#A8A29E] hover:text-[#1C1917] p-0.5 rounded-full"
        >
          <X className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
};
