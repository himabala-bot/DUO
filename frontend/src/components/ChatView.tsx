'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { messagesApi } from '@/lib/api';
import { Message } from '@/types';
import {
  Send,
  Reply,
  X,
  Trash2,
  Check,
  CheckCheck,
  ArrowUp,
  Smile,
  CornerDownRight,
  Heart,
  Sparkles,
  Star,
  ThumbsUp,
  Flame,
} from 'lucide-react';
import { format } from 'date-fns';
import { RealtimeChannel } from '@supabase/supabase-js';
import { VoiceRecorder } from './VoiceRecorder';
import { WaveformPlayer } from './WaveformPlayer';
import { Avatar } from './Avatar';

const QUICK_REACTIONS = [
  { id: 'heart', icon: Heart, color: 'text-[#EA5E86]', fill: 'fill-[#EA5E86]' },
  { id: 'sparkles', icon: Sparkles, color: 'text-[#F49625]', fill: 'fill-[#F49625]' },
  { id: 'smile', icon: Smile, color: 'text-[#57B1A8]', fill: '' },
  { id: 'star', icon: Star, color: 'text-[#F49625]', fill: 'fill-[#F49625]' },
  { id: 'thumbsup', icon: ThumbsUp, color: 'text-[#037F71]', fill: 'fill-[#037F71]' },
];

export const ChatView: React.FC = () => {
  const { profile, partner } = useAuth();
  const { toast, confirm } = useToast();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeReactionMenu, setActiveReactionMenu] = useState<string | null>(null);
  const [swipingMessageId, setSwipingMessageId] = useState<string | null>(null);
  const [swipeOffset, setSwipeOffset] = useState<number>(0);
  const [touchStartX, setTouchStartX] = useState<number>(0);
  const [isPartnerTyping, setIsPartnerTyping] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const lastTapRef = useRef<{ id: string; time: number } | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const partnerTypingTimerRef = useRef<NodeJS.Timeout | null>(null);

  const duoId = profile?.active_duo_id;

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchMessages = useCallback(async () => {
    try {
      const res = await messagesApi.list();
      setMessages(res.messages || []);
      setIsLoading(false);
      messagesApi.markRead().then(() => {
        if (channelRef.current && profile) {
          channelRef.current.send({
            type: 'broadcast',
            event: 'messages_read',
            payload: { duo_id: duoId, reader_id: profile.id },
          });
        }
      }).catch(() => {});
    } catch (err) {
      console.warn('Failed to load messages:', err);
      setIsLoading(false);
    }
  }, [duoId, profile]);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  useEffect(() => {
    scrollToBottom();
  }, [messages.length, isPartnerTyping]);

  // Set up Supabase Realtime channel for instant two-way chat & typing indicators
  useEffect(() => {
    if (!isSupabaseConfigured() || !duoId || !profile) return;

    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    const channel = supabase.channel(`chat:${duoId}`, {
      config: { broadcast: { self: false } },
    });

    // 1. Listen for new messages
    channel.on('broadcast', { event: 'new_message' }, async (payload) => {
      const incoming = payload.payload as Message;
      if (!incoming || !incoming.id) return;

      const isMe = incoming.sender?.id === profile.id || (incoming as any).sender_id === profile.id;
      const formattedMsg: Message = {
        ...incoming,
        is_me: isMe,
      };

      setMessages((prev) => {
        if (prev.some((m) => m.id === formattedMsg.id)) return prev;
        return [...prev, formattedMsg];
      });

      if (!isMe) {
        setIsPartnerTyping(false);
        try {
          await messagesApi.markRead();
          channel.send({
            type: 'broadcast',
            event: 'messages_read',
            payload: { duo_id: duoId, reader_id: profile.id },
          });
        } catch (err) {
          console.warn('Failed to mark read:', err);
        }
      }
    });

    // 2. Listen for real-time reactions
    channel.on('broadcast', { event: 'message_reacted' }, (payload) => {
      const { message_id, reactions } = payload.payload as {
        message_id: string;
        reactions: Record<string, string>;
      };
      if (!message_id) return;

      setMessages((prev) =>
        prev.map((m) => (m.id === message_id ? { ...m, reactions } : m))
      );
    });

    // 3. Listen for unsend / delete in real time
    channel.on('broadcast', { event: 'message_deleted' }, (payload) => {
      const { message_id } = payload.payload as { message_id: string };
      if (!message_id) return;

      setMessages((prev) => prev.filter((m) => m.id !== message_id));
    });

    // 4. Listen for chat cleared in real time
    channel.on('broadcast', { event: 'messages_cleared' }, () => {
      setMessages([]);
    });

    // 5. Listen for read receipts in real time
    channel.on('broadcast', { event: 'messages_read' }, () => {
      const now = new Date().toISOString();
      setMessages((prev) =>
        prev.map((m) => (m.is_me && !m.read_at ? { ...m, read_at: now } : m))
      );
    });

    // 6. Listen for partner typing indicator
    channel.on('broadcast', { event: 'user_typing' }, (payload) => {
      const { is_typing, user_id } = payload.payload as { is_typing: boolean; user_id?: string };
      if (user_id === profile.id) return;

      if (is_typing) {
        setIsPartnerTyping(true);
        if (partnerTypingTimerRef.current) clearTimeout(partnerTypingTimerRef.current);
        partnerTypingTimerRef.current = setTimeout(() => {
          setIsPartnerTyping(false);
        }, 3500);
      } else {
        setIsPartnerTyping(false);
      }
    });

    channel.subscribe();
    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      if (partnerTypingTimerRef.current) clearTimeout(partnerTypingTimerRef.current);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    };
  }, [duoId, profile?.id]);

  // Send typing broadcast
  const sendTypingStatus = (isTyping: boolean) => {
    if (!channelRef.current || !profile) return;
    channelRef.current.send({
      type: 'broadcast',
      event: 'user_typing',
      payload: { is_typing: isTyping, user_id: profile.id },
    });
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setInputText(val);

    if (val.trim()) {
      sendTypingStatus(true);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        sendTypingStatus(false);
      }, 2500);
    } else {
      sendTypingStatus(false);
    }
  };

  // Handle Sending Message
  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const content = inputText.trim();
    if (!content || isSending || !duoId) return;

    sendTypingStatus(false);
    const currentReply = replyingTo;
    setInputText('');
    setReplyingTo(null);
    setIsSending(true);

    const tempId = `temp-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const optimisticMsg: Message = {
      id: tempId,
      duo_id: duoId,
      sender: profile as any,
      receiver: partner as any,
      content,
      reply_to: currentReply
        ? {
            id: currentReply.id,
            sender_name: currentReply.sender?.name || (currentReply.is_me ? 'You' : 'Partner'),
            content: currentReply.content,
          }
        : null,
      reactions: {},
      is_unsent: false,
      is_me: true,
      created_at: new Date().toISOString(),
      read_at: null,
      isOptimistic: true,
    };

    setMessages((prev) => [...prev, optimisticMsg]);

    try {
      const confirmedMsg = await messagesApi.send(content, currentReply?.id);
      const formattedConfirmed: Message = {
        ...confirmedMsg,
        is_me: true,
      };

      setMessages((prev) =>
        prev.map((m) => (m.id === tempId ? formattedConfirmed : m))
      );

      if (channelRef.current) {
        channelRef.current.send({
          type: 'broadcast',
          event: 'new_message',
          payload: confirmedMsg,
        });
      }
    } catch (err) {
      console.error('Failed to send message:', err);
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      toast.error('Message failed to send. Please check your connection.', 'Send Error');
    } finally {
      setIsSending(false);
    }
  };

  // Handle Sending Voice Note
  const handleSendVoiceNote = async (audioDataUrl: string, duration: number) => {
    if (!duoId) return;
    setIsSending(true);
    const voicePayload = `[voice:${JSON.stringify({ url: audioDataUrl, duration })}]`;
    const tempId = `temp-voice-${Date.now()}`;

    const optimisticMsg: Message = {
      id: tempId,
      duo_id: duoId,
      sender: profile as any,
      receiver: partner as any,
      content: voicePayload,
      reply_to: null,
      reactions: {},
      is_unsent: false,
      is_me: true,
      created_at: new Date().toISOString(),
      read_at: null,
      isOptimistic: true,
    };

    setMessages((prev) => [...prev, optimisticMsg]);

    try {
      const confirmedMsg = await messagesApi.send(voicePayload);
      setMessages((prev) =>
        prev.map((m) => (m.id === tempId ? { ...confirmedMsg, is_me: true } : m))
      );

      if (channelRef.current) {
        channelRef.current.send({
          type: 'broadcast',
          event: 'new_message',
          payload: confirmedMsg,
        });
      }
      toast.love('Voice note sent', 'Voice Note');
    } catch (err) {
      console.error('Failed to send voice note:', err);
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      toast.error('Failed to send voice note.', 'Error');
    } finally {
      setIsSending(false);
    }
  };

  // Toggle Reaction (SVG icon keys: heart, sparkles, smile, star, thumbsup)
  const handleToggleReaction = async (msg: Message, reactionKey: string = 'heart') => {
    if (!profile) return;
    const userKey = profile.id;
    const currentReactions = { ...(msg.reactions || {}) };

    if (currentReactions[userKey] === reactionKey) {
      delete currentReactions[userKey];
    } else {
      currentReactions[userKey] = reactionKey;
    }

    setMessages((prev) =>
      prev.map((m) => (m.id === msg.id ? { ...m, reactions: currentReactions } : m))
    );
    setActiveReactionMenu(null);

    if (channelRef.current) {
      channelRef.current.send({
        type: 'broadcast',
        event: 'message_reacted',
        payload: {
          message_id: msg.id,
          reactions: currentReactions,
        },
      });
    }

    try {
      await messagesApi.react(msg.id, reactionKey);
    } catch (err) {
      console.warn('Failed to save reaction:', err);
    }
  };

  // Double Tap / Double Click on Message
  const handleMessageTap = (msg: Message) => {
    const now = Date.now();
    const lastTap = lastTapRef.current;

    if (lastTap && lastTap.id === msg.id && now - lastTap.time < 350) {
      handleToggleReaction(msg, 'heart');
      lastTapRef.current = null;
    } else {
      lastTapRef.current = { id: msg.id, time: now };
    }
  };

  const renderReactionIcon = (reactionKey: string) => {
    const found = QUICK_REACTIONS.find((r) => r.id === reactionKey);
    if (found) {
      const Icon = found.icon;
      return <Icon className={`h-3.5 w-3.5 ${found.color} ${found.fill}`} />;
    }
    return <Heart className="h-3.5 w-3.5 text-[#EA5E86] fill-current" />;
  };

  // Unsend / Delete Message
  const handleDeleteMessage = async (msg: Message) => {
    const isOwner = msg.is_me;
    const ok = await confirm({
      title: isOwner ? 'Unsend Message?' : 'Delete Message?',
      message: isOwner ? 'This message will disappear for both of you.' : 'Remove this message from your chat view.',
      confirmText: isOwner ? 'Unsend' : 'Delete',
      cancelText: 'Keep',
      type: 'danger',
    });

    if (!ok) return;

    setMessages((prev) => prev.filter((m) => m.id !== msg.id));

    if (channelRef.current) {
      channelRef.current.send({
        type: 'broadcast',
        event: 'message_deleted',
        payload: { message_id: msg.id },
      });
    }

    try {
      await messagesApi.delete(msg.id);
    } catch (err) {
      console.warn('Failed to delete message:', err);
    }
  };

  // Touch handlers for swipe to reply on mobile
  const handleTouchStart = (e: React.TouchEvent, msg: Message) => {
    setTouchStartX(e.touches[0].clientX);
    setSwipingMessageId(msg.id);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!swipingMessageId) return;
    const currentX = e.touches[0].clientX;
    const diff = currentX - touchStartX;
    if (diff > 0 && diff < 80) {
      setSwipeOffset(diff);
    }
  };

  const handleTouchEnd = (msg: Message) => {
    if (swipeOffset > 45) {
      setReplyingTo(msg);
      textareaRef.current?.focus();
    }
    setSwipeOffset(0);
    setSwipingMessageId(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const enterToSend = profile?.enter_to_send ?? true;
    if (e.key === 'Enter' && !e.shiftKey && enterToSend) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="flex-1 w-full h-full flex flex-col items-center justify-center p-2 sm:p-4 md:p-6 lg:p-8 min-h-0">
      {/* Centered Conversation Container (~750–880px) */}
      <div className="w-full max-w-[840px] xl:max-w-[880px] h-full flex flex-col overflow-hidden rounded-3xl border border-theme bg-theme-card shadow-lg transition-colors">
        {/* Chat Room Subheader */}
        <div className="flex items-center justify-between border-b border-theme bg-theme-page px-4 sm:px-6 py-3 shrink-0">
          <div className="flex items-center space-x-2.5 sm:space-x-3">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#5B58E6] text-white text-xs shadow-sm">
              <Heart className="h-3.5 w-3.5 fill-current" />
            </div>
            <span className="font-serif text-base sm:text-lg font-bold text-theme-primary">
              {partner?.name}
            </span>
            <span className="text-[10px] font-mono text-theme-muted">/ our stream</span>
          </div>

          <div className="flex items-center space-x-2">
            {isPartnerTyping && (
              <span className="text-[11px] font-mono text-[#5B58E6] flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#5B58E6]/10 border border-[#5B58E6]/30 animate-pulse">
                <span>{partner?.name || 'partner'} is typing...</span>
              </span>
            )}
            <span className="text-[11px] font-mono text-[#00D26A] flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#00D26A]/10 border border-[#00D26A]/30">
              <span className="h-1.5 w-1.5 rounded-full bg-[#00D26A] animate-pulse" />
              live sync
            </span>
          </div>
        </div>

        {/* Message Stream */}
        <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 space-y-4 sm:space-y-5 bg-theme-page">
          {isLoading ? (
            <div className="flex h-full items-center justify-center text-xs sm:text-sm font-mono text-theme-muted">
              Opening conversation...
            </div>
          ) : messages.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-center p-6 space-y-2">
              <Heart className="h-8 w-8 text-[#5B58E6] animate-bounce mb-1" />
              <span className="font-serif text-xl sm:text-2xl text-theme-primary font-bold">Your quiet space</span>
              <p className="max-w-xs text-xs sm:text-sm text-theme-secondary leading-relaxed">
                Send a sweet thought or a voice note to {partner?.name || 'your partner'}.
              </p>
            </div>
          ) : (
            messages.map((msg) => {
              const isSwiping = swipingMessageId === msg.id;
              const isMenuOpen = activeReactionMenu === msg.id;
              const reactionEntries = Object.entries(msg.reactions || {});

              // Check if message is a voice note
              const isVoice = msg.content.startsWith('[voice:');
              let voiceData: { url: string; duration: number } | null = null;
              if (isVoice) {
                try {
                  const jsonStr = msg.content.substring(7, msg.content.length - 1);
                  voiceData = JSON.parse(jsonStr);
                } catch {
                  voiceData = null;
                }
              }

              return (
                <div
                  key={msg.id}
                  className={`group relative flex flex-col ${
                    msg.is_me ? 'items-end' : 'items-start'
                  }`}
                >
                  {/* Replied Message Header */}
                  {msg.reply_to && (
                    <div
                      className={`mb-1 flex items-center space-x-1.5 text-[11px] text-theme-muted ${
                        msg.is_me ? 'pr-2 justify-end' : 'pl-2 justify-start'
                      }`}
                    >
                      <CornerDownRight className="h-3 w-3" />
                      <span className="truncate max-w-[200px]">
                        Replying to <strong>{msg.reply_to.sender_name}</strong>: &ldquo;
                        {msg.reply_to.content}&rdquo;
                      </span>
                    </div>
                  )}

                  {/* Bubble + Action Container */}
                  <div
                    className={`flex items-center gap-2 max-w-[85%] sm:max-w-[75%] ${
                      msg.is_me ? 'flex-row-reverse' : 'flex-row'
                    }`}
                  >
                    {/* Hover Reaction & Actions */}
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center space-x-1 shrink-0">
                      <button
                        onClick={() => setActiveReactionMenu(isMenuOpen ? null : msg.id)}
                        className="rounded-full p-1.5 text-theme-muted hover:bg-theme-card hover:text-theme-primary transition-all"
                        title="Add reaction"
                      >
                        <Smile className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => {
                          setReplyingTo(msg);
                          textareaRef.current?.focus();
                        }}
                        className="rounded-full p-1.5 text-theme-muted hover:bg-theme-card hover:text-theme-primary transition-all"
                        title="Reply"
                      >
                        <Reply className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteMessage(msg)}
                        className="rounded-full p-1.5 text-theme-muted hover:bg-[#F43F5E]/15 hover:text-[#F43F5E] transition-all"
                        title={msg.is_me ? 'Unsend' : 'Delete'}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>

                    {/* The Message Bubble */}
                    <div
                      onClick={() => handleMessageTap(msg)}
                      onDoubleClick={() => handleToggleReaction(msg, 'heart')}
                      onTouchStart={(e) => handleTouchStart(e, msg)}
                      onTouchMove={handleTouchMove}
                      onTouchEnd={() => handleTouchEnd(msg)}
                      style={{
                        transform: isSwiping ? `translateX(${swipeOffset}px)` : 'none',
                        transition: isSwiping ? 'none' : 'transform 0.15s ease',
                      }}
                      className={`relative select-none cursor-pointer rounded-[22px] sm:rounded-[24px] px-4.5 sm:px-5 py-2.5 sm:py-3 text-xs sm:text-[14px] leading-relaxed shadow-sm transition-all ${
                        msg.is_me
                          ? 'bg-[#5B58E6] text-white rounded-br-[8px] shadow-md shadow-[#5B58E6]/25'
                          : 'bg-theme-card text-theme-primary border border-theme rounded-bl-[8px]'
                      }`}
                    >
                      {voiceData ? (
                        <WaveformPlayer
                          audioUrl={voiceData.url}
                          duration={voiceData.duration}
                          isMe={msg.is_me}
                        />
                      ) : (
                        <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                      )}

                      {/* Inline Reactions Pill */}
                      {reactionEntries.length > 0 && (
                        <div
                          className={`absolute -bottom-2.5 ${
                            msg.is_me ? 'right-3' : 'left-3'
                          } flex items-center space-x-1.5 rounded-full border border-theme bg-theme-card px-2 py-0.5 shadow-sm`}
                        >
                          {reactionEntries.map(([userId, reactionKey]) => (
                            <span
                              key={userId}
                              onClick={(e) => {
                                e.stopPropagation();
                                if (profile && userId === profile.id) {
                                  handleToggleReaction(msg, reactionKey);
                                }
                              }}
                              className="hover:scale-125 transition-transform flex items-center"
                              title={userId === profile?.id ? 'You reacted' : `${partner?.name} reacted`}
                            >
                              {renderReactionIcon(reactionKey)}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Reaction Picker Popup */}
                  {isMenuOpen && (
                    <div
                      className={`z-20 mt-1 flex items-center gap-1.5 rounded-full border border-theme bg-theme-card p-1.5 shadow-xl ${
                        msg.is_me ? 'mr-2' : 'ml-2'
                      }`}
                    >
                      {QUICK_REACTIONS.map((r) => {
                        const Icon = r.icon;
                        return (
                          <button
                            key={r.id}
                            onClick={() => handleToggleReaction(msg, r.id)}
                            className={`rounded-full p-1.5 hover:bg-theme-input hover:scale-125 transition-transform ${r.color}`}
                            title={r.id}
                          >
                            <Icon className={`h-4 w-4 ${r.fill}`} />
                          </button>
                        );
                      })}
                      <button
                        onClick={() => setActiveReactionMenu(null)}
                        className="rounded-full p-1 text-theme-muted hover:text-theme-primary"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}

                  {/* Timestamp & Read Status */}
                  <div className="mt-1 flex items-center space-x-1 px-1 text-[11px] font-mono text-theme-muted">
                    <span>
                      {msg.created_at ? format(new Date(msg.created_at), 'hh:mm a') : 'Just now'}
                    </span>
                    {msg.is_me && (
                      <span title={msg.read_at ? 'Read' : 'Sent'}>
                        {msg.read_at ? (
                          <CheckCheck className="h-3.5 w-3.5 text-[#5B58E6]" />
                        ) : (
                          <Check className="h-3.5 w-3.5 text-theme-muted" />
                        )}
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}

          {/* 3-Dot Partner Typing Indicator Bubble */}
          {isPartnerTyping && (
            <div className="flex items-start space-x-2 animate-in fade-in slide-in-from-bottom-2 duration-200">
              <Avatar src={partner?.avatar_url} name={partner?.name} size="xs" />
              <div className="flex items-center space-x-1.5 rounded-full border border-theme bg-theme-card px-4 py-2.5 shadow-sm">
                <span className="h-2 w-2 rounded-full bg-[#5B58E6] animate-bounce [animation-delay:0ms]" />
                <span className="h-2 w-2 rounded-full bg-[#5B58E6] animate-bounce [animation-delay:150ms]" />
                <span className="h-2 w-2 rounded-full bg-[#5B58E6] animate-bounce [animation-delay:300ms]" />
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Replying Banner */}
        {replyingTo && (
          <div className="flex items-center justify-between border-t border-theme bg-[#5B58E6]/10 px-4 sm:px-6 py-2.5 text-xs sm:text-sm shrink-0">
            <div className="flex items-center space-x-2 truncate">
              <Reply className="h-4 w-4 text-[#5B58E6] shrink-0" />
              <span className="font-bold text-theme-primary shrink-0">
                Replying to {replyingTo.is_me ? 'yourself' : replyingTo.sender?.name || partner?.name}:
              </span>
              <span className="truncate italic text-theme-secondary">"{replyingTo.content}"</span>
            </div>
            <button
              onClick={() => setReplyingTo(null)}
              className="p-1 text-theme-muted hover:text-theme-primary transition-all rounded-full"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Input Composer & Voice Recorder */}
        <form onSubmit={handleSendMessage} className="border-t border-theme bg-theme-card p-3 sm:p-4 shrink-0">
          <div className="flex items-center space-x-2">
            {/* Voice Recorder button */}
            <VoiceRecorder onSendVoice={handleSendVoiceNote} />

            {/* Textarea */}
            <textarea
              ref={textareaRef}
              value={inputText}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder={`Message ${partner?.name || 'your partner'}...`}
              rows={1}
              className="flex-1 max-h-32 min-h-[44px] resize-none rounded-full border border-theme bg-theme-input px-4 py-2.5 text-xs sm:text-sm text-theme-primary placeholder-theme-muted focus:border-[#5B58E6] focus:bg-theme-card focus:outline-none focus:ring-2 focus:ring-[#5B58E6]/20 transition-all leading-relaxed"
            />

            {/* Send Button */}
            <button
              type="submit"
              disabled={!inputText.trim() || isSending}
              className="flex h-11 w-11 items-center justify-center rounded-full bg-[#5B58E6] text-white shadow-md shadow-[#5B58E6]/25 hover:bg-[#4A46DC] disabled:opacity-40 disabled:hover:bg-[#5B58E6] transition-all shrink-0"
              title="Send Message"
            >
              <Send className="h-4.5 w-4.5" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
