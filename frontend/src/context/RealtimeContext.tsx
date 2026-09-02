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

    const triggerNotification = (notif: NotificationItem) => {
      setNotifications((prev) => [notif, ...prev.filter((n) => n.id !== notif.id)]);
      setUnreadCount((c) => c + 1);
      setLatestNotification(notif);
    };

    const handleIncomingMessage = (payload: any) => {
      const msg = payload.payload || payload;
      if (!msg) return;
      const senderId = msg.sender?.id || msg.sender_id || msg.user_id;
      if (senderId === userId) return;

      const isVoice = typeof msg.content === 'string' && msg.content.startsWith('[voice:');

      const newNotif: NotificationItem = {
        id: `msg-${msg.id || Date.now()}`,
        recipient_id: userId,
        type: isVoice ? ('VOICE' as any) : 'MESSAGE',
        title: isVoice ? 'Voice Note' : 'New Message',
        body: isVoice ? 'Sent you a voice note' : (msg.content || 'New message'),
        reference_id: msg.id || null,
        is_read: false,
        created_at: new Date().toISOString(),
      };

      triggerNotification(newNotif);
    };

    const handleIncomingDrawing = (payload: any) => {
      const drawing = payload.payload || payload;
      if (!drawing) return;
      const senderId = drawing.sender?.id || drawing.sender_id;
      if (senderId === userId) return;

      const newNotif: NotificationItem = {
        id: `draw-${drawing.id || Date.now()}`,
        recipient_id: userId,
        type: 'DRAWING',
        title: 'New Doodle',
        body: drawing.caption ? `"${drawing.caption}"` : 'Sent you a doodle',
        reference_id: drawing.id || null,
        is_read: false,
        created_at: new Date().toISOString(),
      };

      triggerNotification(newNotif);
    };

    const handleIncomingNote = (payload: any) => {
      const note = payload.payload || payload;
      if (!note) return;
      const authorId = note.author?.id || note.author_id;
      if (authorId === userId) return;

      const newNotif: NotificationItem = {
        id: `note-${note.id || Date.now()}`,
        recipient_id: userId,
        type: 'NOTE' as any,
        title: 'New Note',
        body: note.content || 'Left a new note for you',
        reference_id: note.id || null,
        is_read: false,
        created_at: new Date().toISOString(),
      };

      triggerNotification(newNotif);
    };

    const handleIncomingDaily = (payload: any) => {
      const data = payload.payload || payload;
      if (data?.user_id === userId) return;

      const newNotif: NotificationItem = {
        id: `prompt-${Date.now()}`,
        recipient_id: userId,
        type: 'DAILY_RESPONSE',
        title: 'Prompt Answered',
        body: 'Answered today\'s daily prompt',
        reference_id: null,
        is_read: false,
        created_at: new Date().toISOString(),
      };

      triggerNotification(newNotif);
    };

    const handleIncomingTask = (payload: any) => {
      const data = payload.payload || payload;
      const task = data?.task;
      if (task?.created_by?.id === userId) return;

      const newNotif: NotificationItem = {
        id: `task-${Date.now()}`,
        recipient_id: userId,
        type: 'TASK' as any,
        title: 'Task Updated',
        body: task?.title ? `"${task.title}"` : 'Shared list updated',
        reference_id: task?.id || null,
        is_read: false,
        created_at: new Date().toISOString(),
      };

      triggerNotification(newNotif);
    };

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
          triggerNotification(newNotif);
        }
      )
      .on('broadcast', { event: 'new_notification' }, (payload) => {
        const newNotif = payload.payload as NotificationItem;
        if (!newNotif || !newNotif.id) return;
        triggerNotification(newNotif);
      })
      .on('broadcast', { event: 'new_message' }, handleIncomingMessage)
      .on('broadcast', { event: 'new_drawing' }, handleIncomingDrawing)
      .on('broadcast', { event: 'new_note' }, handleIncomingNote)
      .on('broadcast', { event: 'notes_updated' }, handleIncomingNote)
      .on('broadcast', { event: 'daily_response' }, handleIncomingDaily)
      .on('broadcast', { event: 'tasks_updated' }, handleIncomingTask)
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

    // 2. Multi-channel subscriptions for the active DUO (Chat, Canvas, Notes, Presence)
    let duoChannel: RealtimeChannel | null = null;
    let chatChannel: RealtimeChannel | null = null;
    let canvasChannel: RealtimeChannel | null = null;
    let notesChannel: RealtimeChannel | null = null;
    let todosChannel: RealtimeChannel | null = null;

    if (activeDuoId) {
      // Main Duo channel for presence and global broadcasts
      duoChannel = supabase.channel(`duo:${activeDuoId}`, {
        config: { broadcast: { self: false }, presence: { key: userId } },
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
        .on('broadcast', { event: 'new_message' }, handleIncomingMessage)
        .on('broadcast', { event: 'new_drawing' }, handleIncomingDrawing)
        .on('broadcast', { event: 'new_note' }, handleIncomingNote)
        .on('broadcast', { event: 'notes_updated' }, handleIncomingNote)
        .on('broadcast', { event: 'daily_response' }, handleIncomingDaily)
        .on('broadcast', { event: 'tasks_updated' }, handleIncomingTask)
        .subscribe(async (status: string) => {
          if (status === 'SUBSCRIBED') {
            await duoChannel?.track({ online_at: new Date().toISOString() });
          }
        });

      // Chat Channel listener for instant text & voice notifications
      chatChannel = supabase.channel(`chat:${activeDuoId}`, {
        config: { broadcast: { self: false } },
      });
      chatChannel
        .on('broadcast', { event: 'new_message' }, handleIncomingMessage)
        .subscribe();

      // Canvas / Doodle Channel listener for instant doodle notifications
      canvasChannel = supabase.channel(`drawings_studio:${activeDuoId}`, {
        config: { broadcast: { self: false } },
      });
      canvasChannel
        .on('broadcast', { event: 'new_drawing' }, handleIncomingDrawing)
        .subscribe();

      // Notes Channel listener for instant memo notifications
      notesChannel = supabase.channel(`notes:${activeDuoId}`, {
        config: { broadcast: { self: false } },
      });
      notesChannel
        .on('broadcast', { event: 'new_note' }, handleIncomingNote)
        .on('broadcast', { event: 'notes_updated' }, handleIncomingNote)
        .subscribe();

      // Todos Channel listener for instant task notifications
      todosChannel = supabase.channel(`todos:${activeDuoId}`, {
        config: { broadcast: { self: false } },
      });
      todosChannel
        .on('broadcast', { event: 'tasks_updated' }, handleIncomingTask)
        .subscribe();

      duoChannelRef.current = duoChannel;
    }

    return () => {
      if (userChannelRef.current) {
        supabase.removeChannel(userChannelRef.current);
        userChannelRef.current = null;
      }
      if (duoChannel) {
        supabase.removeChannel(duoChannel);
      }
      if (chatChannel) {
        supabase.removeChannel(chatChannel);
      }
      if (canvasChannel) {
        supabase.removeChannel(canvasChannel);
      }
      if (notesChannel) {
        supabase.removeChannel(notesChannel);
      }
      duoChannelRef.current = null;
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
