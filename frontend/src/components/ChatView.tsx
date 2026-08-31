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
  SmilePlus,
  Smile,
  CornerDownRight,
  Heart,
} from 'lucide-react';
import { format } from 'date-fns';
import { RealtimeChannel } from '@supabase/supabase-js';

const QUICK_EMOJIS = ['❤️', '✨', '☕', '🕊️', '🌿', '🫂', '💌', '🔥'];

export const ChatView: React.FC = () => {
  const { profile, partner } = useAuth();
  const { toast, confirm } = useToast();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [activeReactionMenu, setActiveReactionMenu] = useState<string | null>(null);
  const [highlightedMessageId, setHighlightedMessageId] = useState<string | null>(null);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [swipingMessageId, setSwipingMessageId] = useState<string | null>(null);
  const [swipeOffset, setSwipeOffset] = useState<number>(0);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const lastTapRef = useRef<{ id: string; time: number } | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const duoId = profile?.active_duo_id;

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchMessages = useCallback(async () => {
    try {
      const res = await messagesApi.list();
      setMessages(res.messages || []);
      setIsLoading(false);
      messagesApi.markRead().catch(() => {});
    } catch (err) {
      console.warn('Failed to load messages:', err);
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  useEffect(() => {
    scrollToBottom();
  }, [messages.length]);

  // Set up Supabase Realtime channel for instant two-way chat
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

    // 5. Listen for read receipts
    channel.on('broadcast', { event: 'messages_read' }, () => {
      const now = new Date().toISOString();
      setMessages((prev) =>
        prev.map((m) => (m.is_me && !m.read_at ? { ...m, read_at: now } : m))
      );
    });

    channel.subscribe();
    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [duoId, profile?.id]);

  // Handle Sending Message
  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const content = inputText.trim();
    if (!content || isSending || !duoId) return;

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
            sender_name: currentReply.is_me ? 'You' : currentReply.sender?.name || partner?.name || 'Partner',
            content: currentReply.content,
          }
        : null,
      reactions: {},
      is_me: true,
      created_at: new Date().toISOString(),
      read_at: null,
      isOptimistic: true,
    };

    setMessages((prev) => [...prev, optimisticMsg]);

    try {
      const saved = await messagesApi.send(content, currentReply?.id);
      const confirmedMsg: Message = {
        ...saved,
        is_me: true,
      };

      setMessages((prev) => {
        if (prev.some((m) => m.id === confirmedMsg.id)) {
          return prev.filter((m) => m.id !== tempId);
        }
        return prev.map((m) => (m.id === tempId ? confirmedMsg : m));
      });

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

  // Toggle Reaction
  const handleToggleReaction = async (msg: Message, emoji: string = '❤️') => {
    if (!profile) return;
    const userKey = profile.id;
    const currentReactions = { ...(msg.reactions || {}) };

    if (currentReactions[userKey] === emoji) {
      delete currentReactions[userKey];
    } else {
      currentReactions[userKey] = emoji;
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
      await messagesApi.react(msg.id, emoji);
    } catch (err) {
      console.warn('Failed to save reaction:', err);
    }
  };

  // Double Tap / Double Click on Message
  const handleMessageTap = (msg: Message) => {
    const now = Date.now();
    const lastTap = lastTapRef.current;

    if (lastTap && lastTap.id === msg.id && now - lastTap.time < 350) {
      handleToggleReaction(msg, '❤️');
      lastTapRef.current = null;
    } else {
      lastTapRef.current = { id: msg.id, time: now };
    }
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

  // Drag / Swipe to Reply
  const handleTouchStart = (e: React.TouchEvent, msg: Message) => {
    setTouchStartX(e.touches[0].clientX);
    setSwipingMessageId(msg.id);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStartX === null) return;
    const currentX = e.touches[0].clientX;
    const diff = currentX - touchStartX;
    if (diff > 0 && diff < 80) {
      setSwipeOffset(diff);
    }
  };

  const handleTouchEnd = (msg: Message) => {
    if (swipeOffset > 40) {
      setReplyingTo(msg);
      textareaRef.current?.focus();
    }
    setTouchStartX(null);
    setSwipingMessageId(null);
    setSwipeOffset(0);
  };

  const handleSelectReply = (msg: Message) => {
    setReplyingTo(msg);
    textareaRef.current?.focus();
  };

  const handleScrollToMessage = (msgId: string) => {
    const el = document.getElementById(`msg-${msgId}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setHighlightedMessageId(msgId);
      setTimeout(() => setHighlightedMessageId(null), 2000);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const isEnterToSend = profile?.enter_to_send ?? true;
    if (isEnterToSend) {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSendMessage();
      }
    } else {
      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        handleSendMessage();
      }
    }
  };

  return (
    <div className="flex-1 w-full h-full flex flex-col items-center justify-center p-2 sm:p-4 md:p-6 lg:p-8 min-h-0">
      {/* Centered Conversation Container (~750–880px) */}
      <div className="w-full max-w-[840px] xl:max-w-[880px] h-full flex flex-col overflow-hidden rounded-3xl border border-[#EFE8DC] bg-[#FFFFFF] shadow-[0_4px_24px_rgba(66,47,14,0.04)]">
        {/* Chat Room Subheader */}
        <div className="flex items-center justify-between border-b border-[#EFE8DC] bg-[#FAF7F2] px-4 sm:px-6 py-3 shrink-0">
          <div className="flex items-center space-x-2.5 sm:space-x-3">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#FCC4C0]/40 text-[#EA5E86] text-xs">
              <Heart className="h-3.5 w-3.5 fill-current" />
            </div>
            <span className="font-serif text-base sm:text-lg font-medium text-[#422F0E]">
              {partner?.name}
            </span>
            <span className="text-[10px] font-mono text-[#A89F91]">/ our stream</span>
          </div>
          <span className="text-[11px] font-mono text-[#037F71] flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#DDF2B8]">
            <span className="h-1.5 w-1.5 rounded-full bg-[#037F71] animate-pulse" />
            live sync
          </span>
        </div>

        {/* Message Stream */}
        <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 space-y-4 sm:space-y-5 bg-[#FAF7F2]">
          {isLoading ? (
            <div className="flex h-full items-center justify-center text-xs sm:text-sm font-mono text-[#8C857B]">
              Opening conversation...
            </div>
          ) : messages.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-center p-8">
              <span className="font-serif text-xl sm:text-2xl text-[#1C1917] mb-2">Your quiet space</span>
              <p className="max-w-sm text-xs sm:text-sm text-[#78716C] leading-relaxed">
                Send a quick thought or note to {partner?.name}. Double-tap to react, or swipe to reply.
              </p>
            </div>
          ) : (
            messages.map((msg) => {
              const isSwiping = swipingMessageId === msg.id;
              const isHighlighted = highlightedMessageId === msg.id;
              const reactionsMap = msg.reactions || {};
              const reactionEntries = Object.entries(reactionsMap);
              const isMenuOpen = activeReactionMenu === msg.id;

              return (
                <div
                  key={msg.id}
                  id={`msg-${msg.id}`}
                  className={`group relative flex flex-col transition-all ${
                    msg.is_me ? 'items-end' : 'items-start'
                  } ${isHighlighted ? 'ring-2 ring-[#C2410C]/40 rounded-2xl p-1 bg-[#F5F2EB]/60' : ''}`}
                >
                  {/* Swipe indicator */}
                  {isSwiping && swipeOffset > 20 && (
                    <div
                      className="absolute left-0 top-1/2 -translate-y-1/2 text-[#C2410C] flex items-center gap-1 text-xs font-mono"
                      style={{ opacity: Math.min(swipeOffset / 40, 1) }}
                    >
                      <Reply className="h-3.5 w-3.5" />
                      <span>Reply</span>
                    </div>
                  )}

                  {/* Quoted parent reply banner */}
                  {msg.reply_to && (
                    <div
                      onClick={() => msg.reply_to && handleScrollToMessage(msg.reply_to.id)}
                      className={`mb-1 flex items-center space-x-2 cursor-pointer max-w-[85%] sm:max-w-[70%] rounded-xl px-3 py-1.5 text-xs border ${
                        msg.is_me
                          ? 'border-[#D4CEC2] bg-[#F5F2EB] text-[#57534E]'
                          : 'border-[#E8E4DB] bg-[#FFFFFF] text-[#57534E]'
                      } transition-all hover:opacity-85`}
                    >
                      <CornerDownRight className="h-3.5 w-3.5 text-[#C2410C] shrink-0" />
                      <span className="font-semibold text-[#1C1917] shrink-0">
                        {msg.reply_to.sender_name}:
                      </span>
                      <span className="truncate italic">"{msg.reply_to.content}"</span>
                    </div>
                  )}

                  {/* Message Bubble + Action Hover Container */}
                  <div className="relative flex items-center gap-1.5 max-w-[85%] sm:max-w-[70%]">
                    {/* Action buttons (desktop hover) */}
                    <div
                      className={`opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 ${
                        msg.is_me ? 'order-first' : 'order-last'
                      }`}
                    >
                      <button
                        onClick={() => setActiveReactionMenu(isMenuOpen ? null : msg.id)}
                        className="rounded-full p-1.5 text-[#8C857B] hover:bg-[#E8E4DB] hover:text-[#1C1917] transition-all"
                        title="React"
                      >
                        <Smile className="h-4 w-4" />
                      </button>

                      <button
                        onClick={() => handleSelectReply(msg)}
                        className="rounded-full p-1.5 text-[#8C857B] hover:bg-[#E8E4DB] hover:text-[#1C1917] transition-all"
                        title="Reply"
                      >
                        <Reply className="h-4 w-4" />
                      </button>

                      <button
                        onClick={() => handleDeleteMessage(msg)}
                        className="rounded-full p-1.5 text-[#8C857B] hover:bg-[#FEF2F2] hover:text-[#DC2626] transition-all"
                        title={msg.is_me ? 'Unsend' : 'Delete'}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>

                    {/* The Message Bubble */}
                    <div
                      onClick={() => handleMessageTap(msg)}
                      onDoubleClick={() => handleToggleReaction(msg, '❤️')}
                      onTouchStart={(e) => handleTouchStart(e, msg)}
                      onTouchMove={handleTouchMove}
                      onTouchEnd={() => handleTouchEnd(msg)}
                      style={{
                        transform: isSwiping ? `translateX(${swipeOffset}px)` : 'none',
                        transition: isSwiping ? 'none' : 'transform 0.15s ease',
                      }}
                      className={`relative select-none cursor-pointer rounded-[22px] sm:rounded-[24px] px-4 sm:px-5 py-2.5 sm:py-3 text-xs sm:text-[14px] leading-relaxed shadow-sm transition-all ${
                        msg.is_me
                          ? 'bg-[#1C1917] text-[#FAF8F5] rounded-br-[8px]'
                          : 'bg-[#FFFFFF] text-[#1C1917] border border-[#E8E4DB] rounded-bl-[8px] shadow-[0_2px_8px_rgba(28,25,23,0.03)]'
                      }`}
                    >
                      <p className="whitespace-pre-wrap break-words">{msg.content}</p>

                      {/* Inline Reactions Pill */}
                      {reactionEntries.length > 0 && (
                        <div
                          className={`absolute -bottom-2.5 ${
                            msg.is_me ? 'right-3' : 'left-3'
                          } flex items-center space-x-1 rounded-full border border-[#E8E4DB] bg-[#FFFFFF] px-2 py-0.5 text-xs shadow-sm`}
                        >
                          {reactionEntries.map(([userId, emoji]) => (
                            <span
                              key={userId}
                              onClick={(e) => {
                                e.stopPropagation();
                                if (profile && userId === profile.id) {
                                  handleToggleReaction(msg, emoji);
                                }
                              }}
                              className="hover:scale-125 transition-transform"
                              title={userId === profile?.id ? 'You reacted' : `${partner?.name} reacted`}
                            >
                              {emoji}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Reaction Picker Popup */}
                  {isMenuOpen && (
                    <div
                      className={`z-20 mt-1 flex items-center gap-1.5 rounded-full border border-[#E8E4DB] bg-[#FFFFFF] p-1.5 shadow-lg ${
                        msg.is_me ? 'mr-2' : 'ml-2'
                      }`}
                    >
                      {QUICK_EMOJIS.map((emoji) => (
                        <button
                          key={emoji}
                          onClick={() => handleToggleReaction(msg, emoji)}
                          className="rounded-full p-1 text-base hover:scale-125 transition-transform"
                        >
                          {emoji}
                        </button>
                      ))}
                      <button
                        onClick={() => setActiveReactionMenu(null)}
                        className="rounded-full p-1 text-[#8C857B] hover:text-[#1C1917]"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}

                  {/* Timestamp & Read Status */}
                  <div className="mt-1 flex items-center space-x-1 px-1 text-[11px] font-mono text-[#A89F91]">
                    <span>
                      {msg.created_at ? format(new Date(msg.created_at), 'hh:mm a') : 'Just now'}
                    </span>
                    {msg.is_me && (
                      <span>
                        {msg.read_at ? (
                          <CheckCheck className="h-3.5 w-3.5 text-[#EA5E86]" />
                        ) : (
                          <Check className="h-3.5 w-3.5 text-[#A89F91]" />
                        )}
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Replying Banner */}
        {replyingTo && (
          <div className="flex items-center justify-between border-t border-[#EFE8DC] bg-[#FFF8FA] px-4 sm:px-6 py-2.5 text-xs sm:text-sm shrink-0">
            <div className="flex items-center space-x-2 truncate">
              <Reply className="h-4 w-4 text-[#EA5E86] shrink-0" />
              <span className="font-semibold text-[#422F0E] shrink-0">
                Replying to {replyingTo.is_me ? 'yourself' : replyingTo.sender?.name || partner?.name}:
              </span>
              <span className="truncate italic text-[#6B5E4E]">"{replyingTo.content}"</span>
            </div>
            <button
              onClick={() => setReplyingTo(null)}
              className="p-1 text-[#A89F91] hover:text-[#422F0E] transition-all rounded-full"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Input Composer */}
        <form onSubmit={handleSendMessage} className="border-t border-[#EFE8DC] bg-[#FFFFFF] p-3.5 sm:p-4 shrink-0">
          <div className="flex items-center space-x-2.5">
            <textarea
              ref={textareaRef}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                replyingTo
                  ? `Replying to ${replyingTo.is_me ? 'yourself' : replyingTo.sender?.name}...`
                  : `Send a sweet message to ${partner?.name || 'partner'}... (Enter to send)`
              }
              rows={1}
              className="flex-1 max-h-32 min-h-[44px] resize-none rounded-full border border-[#EFE8DC] bg-[#FAF7F2] px-5 py-3 text-xs sm:text-sm text-[#422F0E] placeholder-[#A89F91] focus:border-[#EA5E86] focus:bg-[#FFFFFF] focus:outline-none focus:ring-2 focus:ring-[#FCC4C0]/40"
            />
            <button
              type="submit"
              disabled={!inputText.trim() || isSending}
              className="flex h-11 w-11 items-center justify-center rounded-full bg-[#422F0E] text-white hover:bg-[#EA5E86] disabled:opacity-30 transition-all shrink-0 shadow-sm"
              aria-label="Send message"
            >
              <ArrowUp className="h-5 w-5" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
