'use client';

import React, { useState, useEffect } from 'react';
import { useRealtime } from '@/context/RealtimeContext';
import { X, Heart, Sparkles } from 'lucide-react';
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

    // Instagram-style micro popout: pops out, stays for 3.2s, then disappears
    const timer = setTimeout(() => {
      setVisibleNotif(null);
    }, 3200);

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

  const getEmojiAndStyle = () => {
    switch (visibleNotif.type) {
      case 'MESSAGE':
        return {
          emoji: '💬',
          bg: 'from-[#FF758C] to-[#FF7EB3]',
          label: 'New Secret Whisper 💕',
        };
      case 'DRAWING':
        return {
          emoji: '🎨',
          bg: 'from-[#10B981] to-[#34D399]',
          label: 'New Sweet Doodle 🎨',
        };
      case 'DAILY_RESPONSE':
        return {
          emoji: '🌸',
          bg: 'from-[#F59E0B] to-[#FBBF24]',
          label: 'Daily Love Note 💕',
        };
      case 'CONNECTION_REQUEST':
      case 'CONNECTION_ACCEPTED':
        return {
          emoji: '💌',
          bg: 'from-[#8B5CF6] to-[#A78BFA]',
          label: 'Room Key Linked ✨',
        };
      default:
        return {
          emoji: '💖',
          bg: 'from-[#EC4899] to-[#F472B6]',
          label: 'Love Update 💕',
        };
    }
  };

  const info = getEmojiAndStyle();

  return (
    <div
      onClick={handleClick}
      className="fixed top-16 right-4 sm:top-20 sm:right-6 lg:top-6 lg:left-72 z-50 cursor-pointer animate-in fade-in zoom-in-95 slide-in-from-top-3 duration-200 select-none"
    >
      <div className="flex items-center space-x-2.5 rounded-full border-2 border-[#FCE1E8] bg-[#FFFFFF] px-4 py-2.5 shadow-[0_12px_32px_rgba(244,114,182,0.2)] hover:scale-105 transition-transform">
        {/* Dynamic icon badge */}
        <div className={`flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-tr ${info.bg} text-white shadow-sm shrink-0 animate-bounce text-sm`}>
          <span>{info.emoji}</span>
        </div>

        <div className="flex flex-col pr-1">
          <span className="text-xs font-bold text-[#2D2522] flex items-center gap-1">
            {info.label}
          </span>
          <span className="text-xs text-[#6D5E56] truncate max-w-[160px] sm:max-w-[220px]">
            {visibleNotif.body}
          </span>
        </div>

        <button
          onClick={(e) => {
            e.stopPropagation();
            markNotificationAsRead(visibleNotif.id);
            setVisibleNotif(null);
          }}
          className="text-[#B2A49B] hover:text-[#E11D48] p-1 rounded-full"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
};
