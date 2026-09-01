'use client';

import React, { useState, useEffect } from 'react';
import { useRealtime } from '@/context/RealtimeContext';
import { MessageSquare, Palette, Sparkles, KeyRound, Bell, Heart, FileText } from 'lucide-react';
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

    // Instagram-style flash popout: pops out, stays for exactly 1.0 second, then smoothly disappears
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

  const getIcon = () => {
    switch (visibleNotif.type) {
      case 'MESSAGE':
        return {
          icon: MessageSquare,
          bg: 'bg-[#125CB9]',
          border: 'border-[#125CB9]/30',
          label: 'New Message',
        };
      case 'DRAWING':
        return {
          icon: Palette,
          bg: 'bg-[#00D26A]',
          border: 'border-[#00D26A]/30',
          label: 'New Doodle',
        };
      case 'DAILY_RESPONSE':
        return {
          icon: Sparkles,
          bg: 'bg-[#FB923C]',
          border: 'border-[#FB923C]/30',
          label: 'Love Prompt',
        };
      case 'CONNECTION_REQUEST':
      case 'CONNECTION_ACCEPTED':
        return {
          icon: Heart,
          bg: 'bg-[#F43F5E]',
          border: 'border-[#F43F5E]/30',
          label: 'Room Link',
        };
      default:
        return {
          icon: Bell,
          bg: 'bg-[#125CB9]',
          border: 'border-[#125CB9]/30',
          label: 'New Update',
        };
    }
  };

  const iconInfo = getIcon();
  const Icon = iconInfo.icon;

  return (
    <div
      onClick={handleClick}
      className={`fixed top-4 left-1/2 -translate-x-1/2 sm:top-5 sm:left-auto sm:right-6 lg:top-5 lg:left-72 z-50 cursor-pointer select-none transition-all duration-200 ${
        isExiting
          ? 'opacity-0 scale-90 -translate-y-2 pointer-events-none'
          : 'opacity-100 scale-100 translate-y-0 animate-in zoom-in-75 fade-in slide-in-from-top-3'
      }`}
    >
      <div className={`flex items-center space-x-2.5 rounded-full border ${iconInfo.border} bg-theme-card/95 backdrop-blur-md px-3.5 py-2 shadow-2xl hover:scale-105 transition-transform ring-1 ring-black/5`}>
        <div className={`flex h-6 w-6 items-center justify-center rounded-full ${iconInfo.bg} text-white shadow-xs shrink-0 animate-pulse`}>
          <Icon className="h-3.5 w-3.5" />
        </div>

        <div className="flex flex-col pr-1">
          <span className="text-[11px] font-mono font-bold text-theme-primary tracking-tight">
            {iconInfo.label}
          </span>
          <span className="text-xs text-theme-secondary truncate max-w-[180px] sm:max-w-[240px]">
            {visibleNotif.body}
          </span>
        </div>
      </div>
    </div>
  );
};

