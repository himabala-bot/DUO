'use client';

import React, { useState, useEffect } from 'react';
import { useRealtime } from '@/context/RealtimeContext';
import { MessageSquare, Palette, Sparkles, Heart, FileText, Bell } from 'lucide-react';
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
  const [isExiting, setIsExiting] = useState<boolean>(false);

  useEffect(() => {
    if (!latestNotification) return;

    // Suppress notification popout if user is already in that active view
    const type = latestNotification.type;
    if (activeTab === 'chat' && type === 'MESSAGE') return;
    if (activeTab === 'canvas' && type === 'DRAWING') return;
    if (activeTab === 'daily' && type === 'DAILY_RESPONSE') return;
    if (activeTab === 'notes' && (type as string) === 'NOTE') return;
    if (activeTab === 'duo' && (type === 'CONNECTION_REQUEST' || type === 'CONNECTION_ACCEPTED')) return;

    setIsExiting(false);
    setVisibleNotif(latestNotification);

    // Instagram-style flash icon popout: pops out, stays for exactly 1.0 second, then smoothly disappears
    const exitTimer = setTimeout(() => {
      setIsExiting(true);
    }, 1000);

    const removeTimer = setTimeout(() => {
      setVisibleNotif(null);
      setIsExiting(false);
    }, 1250);

    return () => {
      clearTimeout(exitTimer);
      clearTimeout(removeTimer);
    };
  }, [latestNotification, activeTab]);

  if (!visibleNotif) return null;

  const handleClick = () => {
    markNotificationAsRead(visibleNotif.id);
    if (visibleNotif.type === 'MESSAGE') onNavigate('chat');
    if (visibleNotif.type === 'DRAWING') onNavigate('canvas');
    if (visibleNotif.type === 'DAILY_RESPONSE') onNavigate('daily');
    if ((visibleNotif.type as string) === 'NOTE') onNavigate('notes');
    if (visibleNotif.type === 'CONNECTION_REQUEST' || visibleNotif.type === 'CONNECTION_ACCEPTED') {
      onNavigate('duo');
    }
    setVisibleNotif(null);
  };

  const getIconInfo = () => {
    switch (visibleNotif.type) {
      case 'MESSAGE':
        return {
          icon: MessageSquare,
          bg: 'bg-[#125CB9]',
          ring: 'ring-[#125CB9]/40',
          shadow: 'shadow-[#125CB9]/30',
          label: 'New message',
        };
      case 'DRAWING':
        return {
          icon: Palette,
          bg: 'bg-[#00D26A]',
          ring: 'ring-[#00D26A]/40',
          shadow: 'shadow-[#00D26A]/30',
          label: 'New doodle',
        };
      case 'DAILY_RESPONSE':
        return {
          icon: Sparkles,
          bg: 'bg-[#FB923C]',
          ring: 'ring-[#FB923C]/40',
          shadow: 'shadow-[#FB923C]/30',
          label: 'Love prompt',
        };
      case 'CONNECTION_REQUEST':
      case 'CONNECTION_ACCEPTED':
        return {
          icon: Heart,
          bg: 'bg-[#F43F5E]',
          ring: 'ring-[#F43F5E]/40',
          shadow: 'shadow-[#F43F5E]/30',
          label: 'Room linked',
        };
      default:
        return {
          icon: ((visibleNotif.type as string) === 'NOTE') ? FileText : Bell,
          bg: ((visibleNotif.type as string) === 'NOTE') ? 'bg-[#8B5CF6]' : 'bg-[#125CB9]',
          ring: ((visibleNotif.type as string) === 'NOTE') ? 'ring-[#8B5CF6]/40' : 'ring-[#125CB9]/40',
          shadow: 'shadow-md',
          label: 'Notification',
        };
    }
  };

  const iconInfo = getIconInfo();
  const Icon = iconInfo.icon;

  return (
    <div
      onClick={handleClick}
      title={iconInfo.label}
      className={`fixed top-4 left-1/2 -translate-x-1/2 sm:top-5 sm:left-auto sm:right-8 lg:top-5 lg:left-72 z-50 cursor-pointer select-none transition-all duration-200 ${
        isExiting
          ? 'opacity-0 scale-50 -translate-y-3 pointer-events-none'
          : 'opacity-100 scale-100 translate-y-0 animate-in zoom-in-50 fade-in slide-in-from-top-4 duration-150'
      }`}
    >
      {/* Instagram-style circular icon orb popping out */}
      <div className={`flex h-11 w-11 items-center justify-center rounded-full ${iconInfo.bg} text-white shadow-xl ${iconInfo.shadow} ring-4 ${iconInfo.ring} hover:scale-110 active:scale-95 transition-transform`}>
        <Icon className="h-5 w-5 fill-current/20" />
      </div>
    </div>
  );
};


