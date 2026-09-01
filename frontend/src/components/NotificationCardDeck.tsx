'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { NotificationItem } from '@/types';
import { format, isToday, isYesterday, parseISO } from 'date-fns';

interface NotificationCardDeckProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: NotificationItem[];
  onMarkAsRead: (id: string) => void;
  onMarkAllAsRead: () => void;
  onNavigate: (tab: string) => void;
}

const getNotificationLabel = (type: string) => {
  switch (type) {
    case 'MESSAGE':
      return 'New message';
    case 'DRAWING':
      return 'New drawing';
    case 'DAILY_RESPONSE':
      return 'Daily response';
    case 'NOTE':
      return 'New note';
    case 'CONNECTION_REQUEST':
    case 'CONNECTION_ACCEPTED':
      return 'Connection';
    default:
      return 'Notification';
  }
};

const formatNotificationTime = (isoString: string) => {
  try {
    const date = parseISO(isoString);
    if (isToday(date)) {
      return `Today · ${format(date, 'h:mm a')}`;
    }
    if (isYesterday(date)) {
      return `Yesterday · ${format(date, 'h:mm a')}`;
    }
    return format(date, 'MMM d · h:mm a');
  } catch {
    return 'Recently';
  }
};

export const NotificationCardDeck: React.FC<NotificationCardDeckProps> = ({
  isOpen,
  onClose,
  notifications,
  onMarkAsRead,
  onMarkAllAsRead,
  onNavigate,
}) => {
  const [swipingId, setSwipingId] = useState<string | null>(null);
  const [swipeDirection, setSwipeDirection] = useState<number>(1);

  // Close on ESC key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const unreadNotifications = notifications.filter((n) => !n.is_read);

  const handleSwipeAway = useCallback(
    (id: string, direction: number) => {
      setSwipingId(id);
      setSwipeDirection(direction);

      setTimeout(() => {
        onMarkAsRead(id);
        setSwipingId(null);
      }, 200);
    },
    [onMarkAsRead]
  );

  const handleCardClick = (notif: NotificationItem) => {
    onMarkAsRead(notif.id);
    if (notif.type === 'MESSAGE') onNavigate('chat');
    if (notif.type === 'DRAWING') onNavigate('canvas');
    if (notif.type === 'DAILY_RESPONSE') onNavigate('daily');
    if (notif.type === 'NOTE') onNavigate('notes');
    if (notif.type === 'CONNECTION_REQUEST' || notif.type === 'CONNECTION_ACCEPTED') {
      onNavigate('duo');
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-[6px] animate-in fade-in duration-200"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 10 }}
        transition={{ duration: 0.22, ease: 'easeOut' }}
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-[460px] flex flex-col items-center select-none"
      >
        {/* ─────────────────────────────────────────────────────────────
            NOTIFICATION CARD STACK DECK
        ───────────────────────────────────────────────────────────── */}
        <div className="relative w-full h-[270px] sm:h-[285px] flex items-center justify-center">
          {unreadNotifications.length === 0 ? (
            /* Empty State Card */
            <div className="w-full h-full rounded-[24px] border border-theme bg-theme-card p-6 shadow-2xl flex flex-col justify-between text-theme-primary">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-medium text-theme-muted uppercase tracking-wider">
                  Updates
                </span>
                <span className="h-2 w-2 rounded-full bg-[#00D26A]" />
              </div>

              <div>
                <h3 className="font-serif text-2xl font-semibold text-theme-primary tracking-tight">
                  You're all caught up.
                </h3>
                <p className="text-xs text-theme-secondary mt-1.5 leading-relaxed">
                  No new notifications right now. Everything shared is up to date.
                </p>
              </div>

              <div className="text-xs font-mono text-theme-muted">
                Duo space is peaceful
              </div>
            </div>
          ) : (
            <AnimatePresence>
              {unreadNotifications.slice(0, 4).map((notif, index) => {
                const isFront = index === 0;
                const label = getNotificationLabel(notif.type);
                const timeString = formatNotificationTime(notif.created_at);

                if (isFront) {
                  return (
                    <motion.div
                      key={notif.id}
                      drag="x"
                      dragConstraints={{ left: 0, right: 0 }}
                      dragElastic={0.85}
                      onDragEnd={(_, info) => {
                        if (Math.abs(info.offset.x) > 100 || Math.abs(info.velocity.x) > 450) {
                          handleSwipeAway(notif.id, info.offset.x > 0 ? 1 : -1);
                        }
                      }}
                      animate={{
                        x: 0,
                        rotate: 0,
                        scale: 1,
                        y: 0,
                        opacity: 1,
                      }}
                      exit={{
                        x: swipeDirection * 450,
                        opacity: 0,
                        rotate: swipeDirection * 15,
                        transition: { duration: 0.2 },
                      }}
                      transition={{
                        type: 'spring',
                        stiffness: 340,
                        damping: 26,
                      }}
                      style={{ zIndex: 30 }}
                      whileTap={{ cursor: 'grabbing' }}
                      className="absolute inset-0 rounded-[24px] border border-theme bg-theme-card p-6 shadow-2xl flex flex-col justify-between cursor-grab active:cursor-grabbing text-theme-primary transition-colors"
                    >
                      {/* Card Header: Type Label */}
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-mono font-medium text-theme-secondary uppercase tracking-wider">
                          {label}
                        </span>
                        <span className="h-2 w-2 rounded-full bg-[#125CB9]" />
                      </div>

                      {/* Card Center: Title & Description */}
                      <div
                        onClick={() => handleCardClick(notif)}
                        className="cursor-pointer group"
                      >
                        <h3 className="font-serif text-xl sm:text-2xl font-bold text-theme-primary tracking-tight group-hover:text-[#125CB9] transition-colors leading-snug">
                          {notif.title}
                        </h3>
                        <p className="text-xs sm:text-sm text-theme-secondary mt-1.5 leading-relaxed line-clamp-2">
                          {notif.body}
                        </p>
                      </div>

                      {/* Card Footer: Timestamp & Swipe Hint */}
                      <div className="flex items-center justify-between text-xs font-mono text-theme-muted pt-2 border-t border-theme-subtle">
                        <span>{timeString}</span>
                        <span className="text-[11px] opacity-60">Swipe to dismiss</span>
                      </div>
                    </motion.div>
                  );
                }

                // Cards behind the front card (physical stack effect)
                return (
                  <motion.div
                    key={notif.id}
                    animate={{
                      scale: 1 - index * 0.04,
                      y: index * 12,
                      opacity: index < 3 ? 1 - index * 0.16 : 0.45,
                    }}
                    transition={{
                      type: 'spring',
                      stiffness: 300,
                      damping: 25,
                    }}
                    style={{ zIndex: 20 - index }}
                    className="pointer-events-none absolute inset-0 rounded-[24px] border border-theme bg-theme-card p-6 shadow-lg flex flex-col justify-between"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono font-medium text-theme-secondary uppercase tracking-wider opacity-60">
                        {label}
                      </span>
                    </div>

                    <div className="opacity-40">
                      <h4 className="font-serif text-lg font-bold text-theme-primary truncate">
                        {notif.title}
                      </h4>
                      <p className="text-xs text-theme-secondary mt-1 truncate">
                        {notif.body}
                      </p>
                    </div>

                    <div className="text-xs font-mono text-theme-muted opacity-40">
                      {timeString}
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          )}
        </div>

        {/* ─────────────────────────────────────────────────────────────
            BOTTOM CONTROLS: EXACTLY TWO ELEMENTS
            LEFT: Counter ("4 left" / "No new notifications")
            RIGHT: Single CTA ("Mark all read")
        ───────────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between w-full mt-6 px-3">
          <span className="text-xs font-mono font-medium text-theme-secondary">
            {unreadNotifications.length > 0
              ? `${unreadNotifications.length} left`
              : 'No new notifications'}
          </span>

          {unreadNotifications.length > 0 && (
            <button
              type="button"
              onClick={onMarkAllAsRead}
              className="text-xs font-medium text-theme-secondary hover:text-theme-primary transition-colors hover:underline"
            >
              Mark all read
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
};
