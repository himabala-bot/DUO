'use client';

import React from 'react';
import { useRealtime } from '@/context/RealtimeContext';
import { X } from 'lucide-react';

export const NotificationToast: React.FC<{ onNavigate: (tab: string) => void }> = ({ onNavigate }) => {
  const { latestNotification, markNotificationAsRead } = useRealtime();

  if (!latestNotification) return null;

  const handleClick = () => {
    markNotificationAsRead(latestNotification.id);
    if (latestNotification.type === 'MESSAGE') onNavigate('chat');
    if (latestNotification.type === 'DRAWING') onNavigate('canvas');
    if (latestNotification.type === 'DAILY_RESPONSE') onNavigate('daily');
    if (latestNotification.type === 'CONNECTION_REQUEST' || latestNotification.type === 'CONNECTION_ACCEPTED') {
      onNavigate('duo');
    }
  };

  return (
    <div className="fixed bottom-20 sm:bottom-6 right-4 sm:right-6 z-50 cursor-pointer max-w-[calc(100vw-2rem)] sm:max-w-sm rounded-xl border border-[#E8E4DB] bg-[#FFFFFF] p-4 shadow-[0_8px_24px_rgba(28,25,23,0.08)] transition-all hover:border-[#D4CEC2]">
      <div className="flex items-start space-x-3" onClick={handleClick}>
        <span className="mt-1 h-2 w-2 rounded-full bg-[#C2410C] shrink-0" />
        <div className="flex-1 pr-2">
          <h5 className="text-xs font-serif font-medium text-[#1C1917]">{latestNotification.title}</h5>
          <p className="mt-0.5 text-xs text-[#57534E] line-clamp-2">{latestNotification.body}</p>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            markNotificationAsRead(latestNotification.id);
          }}
          className="text-[#A8A29E] hover:text-[#1C1917] p-1"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
};
