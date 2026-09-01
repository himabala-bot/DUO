'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform, Variants } from 'framer-motion';
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

interface FrontCardProps {
  notif: NotificationItem;
  exitDirection: number;
  onSwipe: (id: string, dir: number) => void;
  onClick: (notif: NotificationItem) => void;
}

const cardVariants: Variants = {
  initial: { scale: 0.95, y: 12, opacity: 0.8 },
  animate: { scale: 1, y: 0, opacity: 1 },
  exit: (dir: number) => ({
    x: (dir || 1) * 600,
    opacity: 0,
    rotate: (dir || 1) * 25,
    transition: { duration: 0.22, ease: 'easeIn' },
  }),
};

const FrontCard: React.FC<FrontCardProps> = ({ notif, exitDirection, onSwipe, onClick }) => {
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 200], [-14, 14]);
  const opacity = useTransform(x, [-260, -130, 0, 130, 260], [0.35, 1, 1, 1, 0.35]);

  const label = getNotificationLabel(notif.type);
  const timeString = formatNotificationTime(notif.created_at);

  return (
    <motion.div
      key={notif.id}
      custom={exitDirection}
      style={{ x, rotate, opacity, zIndex: 30 }}
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.9}
      onDragEnd={(_, info) => {
        // Swiping past 70px or flick velocity > 350 flies out the card
        if (Math.abs(info.offset.x) > 70 || Math.abs(info.velocity.x) > 350) {
          const dir = info.offset.x > 0 ? 1 : -1;
          onSwipe(notif.id, dir);
        }
      }}
      variants={cardVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={{
        type: 'spring',
        stiffness: 350,
        damping: 26,
      }}
      whileTap={{ cursor: 'grabbing' }}
      className="absolute inset-0 rounded-[24px] border border-theme bg-theme-card p-6 shadow-2xl flex flex-col justify-between cursor-grab active:cursor-grabbing text-theme-primary transition-colors select-none"
    >
      {/* Card Header: Type Label */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-mono font-medium text-theme-secondary uppercase tracking-wider">
          {label}
        </span>
        <span className="h-2 w-2 rounded-full bg-[#125CB9]" />
      </div>

      {/* Card Center: Title & Description */}
      <div onClick={() => onClick(notif)} className="cursor-pointer group">
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
};

export const NotificationCardDeck: React.FC<NotificationCardDeckProps> = ({
  isOpen,
  onClose,
  notifications,
  onMarkAsRead,
  onMarkAllAsRead,
  onNavigate,
}) => {
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());
  const [exitDirection, setExitDirection] = useState<number>(1);

  // Reset local dismissed set when dialog opens
  useEffect(() => {
    if (isOpen) {
      setDismissedIds(new Set());
    }
  }, [isOpen]);

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

  const visibleNotifications = notifications.filter(
    (n) => !n.is_read && !dismissedIds.has(n.id)
  );

  const handleSwipeAway = useCallback(
    (id: string, direction: number) => {
      setExitDirection(direction);
      setDismissedIds((prev) => new Set(prev).add(id));
      onMarkAsRead(id);
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
          {visibleNotifications.length === 0 ? (
            /* Empty State Card */
            <div className="w-full h-full rounded-[24px] border border-theme bg-theme-card p-6 shadow-2xl flex flex-col justify-between text-theme-primary animate-in zoom-in-95 duration-200">
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
            <AnimatePresence custom={exitDirection}>
              {visibleNotifications.slice(0, 4).map((notif, index) => {
                const isFront = index === 0;

                if (isFront) {
                  return (
                    <FrontCard
                      key={notif.id}
                      notif={notif}
                      exitDirection={exitDirection}
                      onSwipe={handleSwipeAway}
                      onClick={handleCardClick}
                    />
                  );
                }

                const label = getNotificationLabel(notif.type);
                const timeString = formatNotificationTime(notif.created_at);

                // Cards behind the front card (physical stack effect)
                return (
                  <motion.div
                    key={notif.id}
                    animate={{
                      scale: 1 - index * 0.045,
                      y: index * 12,
                      opacity: index < 3 ? 1 - index * 0.18 : 0.4,
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
            {visibleNotifications.length > 0
              ? `${visibleNotifications.length} left`
              : 'No new notifications'}
          </span>

          {visibleNotifications.length > 0 && (
            <button
              type="button"
              onClick={() => {
                setDismissedIds(new Set(notifications.map((n) => n.id)));
                onMarkAllAsRead();
              }}
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
