'use client';

import React, { useState, useEffect } from 'react';
import { useRealtime } from '@/context/RealtimeContext';
import {
  MessageSquare,
  Mic,
  Palette,
  Sparkles,
  Heart,
  StickyNote,
  ListTodo,
  Bell,
} from 'lucide-react';
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
    if (activeTab === 'chat' && (type === 'MESSAGE' || (type as string) === 'VOICE')) return;
    if (activeTab === 'canvas' && type === 'DRAWING') return;
    if (activeTab === 'daily' && type === 'DAILY_RESPONSE') return;
    if (activeTab === 'notes' && (type as string) === 'NOTE') return;
    if (activeTab === 'todo' && (type as string) === 'TASK') return;
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
    const type = visibleNotif.type as string;
    if (type === 'MESSAGE' || type === 'VOICE') onNavigate('chat');
    else if (type === 'DRAWING') onNavigate('canvas');
    else if (type === 'DAILY_RESPONSE') onNavigate('daily');
    else if (type === 'NOTE') onNavigate('notes');
    else if (type === 'TASK') onNavigate('todo');
    else if (type === 'CONNECTION_REQUEST' || type === 'CONNECTION_ACCEPTED') {
      onNavigate('duo');
    }
    setVisibleNotif(null);
  };

  const getIconInfo = () => {
    const type = visibleNotif.type as string;
    switch (type) {
      case 'MESSAGE':
        return {
          icon: MessageSquare,
          bg: 'bg-gradient-to-tr from-[#0E4B99] to-[#125CB9]',
          ring: 'ring-[#125CB9]/40',
          shadow: 'shadow-[0_4px_16px_rgba(18,92,185,0.4)]',
          label: 'New message',
        };
      case 'VOICE':
        return {
          icon: Mic,
          bg: 'bg-gradient-to-tr from-[#0284C7] to-[#00D0FF]',
          ring: 'ring-[#00D0FF]/40',
          shadow: 'shadow-[0_4px_16px_rgba(0,208,255,0.4)]',
          label: 'Voice note',
        };
      case 'DRAWING':
        return {
          icon: Palette,
          bg: 'bg-gradient-to-tr from-[#059669] to-[#00D26A]',
          ring: 'ring-[#00D26A]/40',
          shadow: 'shadow-[0_4px_16px_rgba(0,210,106,0.4)]',
          label: 'New doodle',
        };
      case 'DAILY_RESPONSE':
        return {
          icon: Sparkles,
          bg: 'bg-gradient-to-tr from-[#EA580C] to-[#FB923C]',
          ring: 'ring-[#FB923C]/40',
          shadow: 'shadow-[0_4px_16px_rgba(251,146,60,0.4)]',
          label: 'Love prompt answered',
        };
      case 'NOTE':
        return {
          icon: StickyNote,
          bg: 'bg-gradient-to-tr from-[#7C3AED] to-[#C084FC]',
          ring: 'ring-[#C084FC]/40',
          shadow: 'shadow-[0_4px_16px_rgba(192,132,252,0.4)]',
          label: 'New note',
        };
      case 'TASK':
        return {
          icon: ListTodo,
          bg: 'bg-gradient-to-tr from-[#D97706] to-[#F59E0B]',
          ring: 'ring-[#F59E0B]/40',
          shadow: 'shadow-[0_4px_16px_rgba(245,158,11,0.4)]',
          label: 'List updated',
        };
      case 'CONNECTION_REQUEST':
      case 'CONNECTION_ACCEPTED':
        return {
          icon: Heart,
          bg: 'bg-gradient-to-tr from-[#E11D48] to-[#F43F5E]',
          ring: 'ring-[#F43F5E]/40',
          shadow: 'shadow-[0_4px_16px_rgba(244,63,94,0.4)]',
          label: 'Duo paired',
        };
      default:
        return {
          icon: Bell,
          bg: 'bg-[#125CB9]',
          ring: 'ring-[#125CB9]/40',
          shadow: 'shadow-md',
          label: 'Notification',
        };
    }
  };

  const iconInfo = getIconInfo();
  const Icon = iconInfo.icon;

  return (
    <>
      {/* 1. Mobile Popout: Pops out right from the top right bell header */}
      <div
        onClick={handleClick}
        title={iconInfo.label}
        className={`lg:hidden fixed top-3 right-12 z-50 cursor-pointer select-none transition-all duration-200 ${
          isExiting
            ? 'opacity-0 scale-50 -translate-y-2 pointer-events-none'
            : 'opacity-100 scale-100 translate-y-0 animate-in zoom-in-50 fade-in duration-150'
        }`}
      >
        <div
          className={`flex h-9 w-9 items-center justify-center rounded-full ${iconInfo.bg} text-white shadow-lg ${iconInfo.shadow} ring-3 ${iconInfo.ring} animate-bounce duration-300`}
        >
          <Icon className="h-4 w-4" />
        </div>
      </div>

      {/* 2. Desktop Sidebar Popout: Pops out right above the bottom sidebar bell */}
      <div
        onClick={handleClick}
        title={iconInfo.label}
        className={`hidden lg:flex fixed bottom-14 left-44 z-50 cursor-pointer select-none items-center space-x-2 rounded-full border border-theme bg-theme-card/95 px-3 py-1.5 shadow-xl backdrop-blur-md transition-all duration-200 ${
          isExiting
            ? 'opacity-0 scale-50 translate-y-2 pointer-events-none'
            : 'opacity-100 scale-100 translate-y-0 animate-in zoom-in-75 fade-in slide-in-from-bottom-2 duration-150'
        }`}
      >
        <div
          className={`flex h-7 w-7 items-center justify-center rounded-full ${iconInfo.bg} text-white shrink-0 shadow-md ${iconInfo.shadow} ring-2 ${iconInfo.ring}`}
        >
          <Icon className="h-3.5 w-3.5" />
        </div>
        <div className="text-left pr-1">
          <span className="text-[11px] font-semibold text-theme-primary block leading-none">
            {iconInfo.label}
          </span>
          <span className="text-[9px] font-mono text-theme-muted block truncate max-w-[120px] mt-0.5">
            {visibleNotif.body}
          </span>
        </div>
      </div>
    </>
  );
};
