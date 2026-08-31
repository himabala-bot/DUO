'use client';

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { useAuth } from './AuthContext';
import { notificationsApi } from '@/lib/api';
import { NotificationItem } from '@/types';
import { RealtimeChannel } from '@supabase/supabase-js';

interface RealtimeContextType {
  notifications: NotificationItem[];
  unreadCount: number;
  latestNotification: NotificationItem | null;
  refreshNotifications: () => Promise<void>;
  markNotificationAsRead: (id: string) => Promise<void>;
  markAllNotificationsAsRead: () => Promise<void>;
  partnerOnline: boolean;
}

const RealtimeContext = createContext<RealtimeContextType | undefined>(undefined);

export const RealtimeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { profile, refreshProfile } = useAuth();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [latestNotification, setLatestNotification] = useState<NotificationItem | null>(null);
  const [partnerOnline, setPartnerOnline] = useState<boolean>(false);
  const userChannelRef = useRef<RealtimeChannel | null>(null);
  const duoChannelRef = useRef<RealtimeChannel | null>(null);

  const fetchNotifications = useCallback(async () => {
    if (!profile) return;
    try {
      const res = await notificationsApi.list();
      setNotifications(res.notifications || []);
      setUnreadCount(res.unread_count || 0);
    } catch (err) {
      console.warn('Failed to load notifications:', err);
    }
  }, [profile?.id]);

  useEffect(() => {
    if (profile) {
      fetchNotifications();
    }
  }, [profile?.id, fetchNotifications]);

  // Set up Supabase Realtime subscriptions
  useEffect(() => {
    if (!isSupabaseConfigured() || !profile) return;

    const userId = profile.id;
    const activeDuoId = profile.active_duo_id;

    // 1. Channel for user notifications & relationship updates
    const userChannel = supabase.channel(`user:${userId}`, {
      config: { broadcast: { self: false } },
    });

    userChannel
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `recipient_id=eq.${userId}`,
        },
        (payload) => {
          const newNotif = payload.new as NotificationItem;
          setNotifications((prev) => [newNotif, ...prev]);
          setUnreadCount((c) => c + 1);
          setLatestNotification(newNotif);

          setTimeout(() => {
            setLatestNotification((current) => (current?.id === newNotif.id ? null : current));
          }, 6000);
        }
      )
      .on('broadcast', { event: 'new_notification' }, (payload) => {
        const newNotif = payload.payload as NotificationItem;
        if (!newNotif || !newNotif.id) return;
        setNotifications((prev) => {
          if (prev.some((n) => n.id === newNotif.id)) return prev;
          return [newNotif, ...prev];
        });
        setUnreadCount((c) => c + 1);
        setLatestNotification(newNotif);

        setTimeout(() => {
          setLatestNotification((current) => (current?.id === newNotif.id ? null : current));
        }, 6000);
      })
      .on('broadcast', { event: 'new_drawing' }, (payload) => {
        const drawing = payload.payload as any;
        if (!drawing) return;
        const senderId = drawing.sender?.id || drawing.sender_id;
        if (senderId === userId) return;

        const senderName = drawing.sender?.name || profile.partner?.name || 'Partner';
        const newNotif: NotificationItem = {
          id: `draw-${drawing.id || Date.now()}`,
          recipient_id: userId,
          type: 'DRAWING',
          title: `New Drawing from ${senderName}`,
          body: drawing.caption ? `"${drawing.caption}"` : 'Sent you a new doodle!',
          reference_id: drawing.id || null,
          is_read: false,
          created_at: new Date().toISOString(),
        };

        setNotifications((prev) => [newNotif, ...prev]);
        setUnreadCount((c) => c + 1);
        setLatestNotification(newNotif);

        setTimeout(() => {
          setLatestNotification((current) => (current?.id === newNotif.id ? null : current));
        }, 6000);
      })
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'connection_requests',
          filter: `receiver_id=eq.${userId}`,
        },
        () => {
          fetchNotifications();
          refreshProfile();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'duo_members',
          filter: `user_id=eq.${userId}`,
        },
        () => {
          refreshProfile();
        }
      )
      .subscribe();

    userChannelRef.current = userChannel;

    // 2. Presence channel for partner online status if in active DUO
    let duoChannel: RealtimeChannel | null = null;
    if (activeDuoId) {
      duoChannel = supabase.channel(`duo_presence:${activeDuoId}`, {
        config: { presence: { key: userId } },
      });

      duoChannel
        .on('presence', { event: 'sync' }, () => {
          const state = duoChannel?.presenceState() || {};
          const presentUserIds = Object.keys(state);
          const partnerId = profile.partner?.id;
          if (partnerId && presentUserIds.includes(partnerId)) {
            setPartnerOnline(true);
          } else {
            setPartnerOnline(false);
          }
        })
        .subscribe(async (status: string) => {
          if (status === 'SUBSCRIBED') {
            await duoChannel?.track({ online_at: new Date().toISOString() });
          }
        });

      duoChannelRef.current = duoChannel;
    }

    return () => {
      if (userChannelRef.current) {
        supabase.removeChannel(userChannelRef.current);
        userChannelRef.current = null;
      }
      if (duoChannelRef.current) {
        supabase.removeChannel(duoChannelRef.current);
        duoChannelRef.current = null;
      }
    };
  }, [profile?.id, profile?.active_duo_id]);

  const markNotificationAsRead = async (id: string) => {
    try {
      await notificationsApi.markRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch (err) {
      console.warn('Failed to mark notification as read:', err);
    }
  };

  const markAllNotificationsAsRead = async () => {
    try {
      await notificationsApi.markAllRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (err) {
      console.warn('Failed to mark all as read:', err);
    }
  };

  return (
    <RealtimeContext.Provider
      value={{
        notifications,
        unreadCount,
        latestNotification,
        refreshNotifications: fetchNotifications,
        markNotificationAsRead,
        markAllNotificationsAsRead,
        partnerOnline,
      }}
    >
      {children}
    </RealtimeContext.Provider>
  );
};

export const useRealtime = () => {
  const context = useContext(RealtimeContext);
  if (!context) {
    throw new Error('useRealtime must be used within a RealtimeProvider');
  }
  return context;
};
