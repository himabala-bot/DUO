'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { messagesApi } from '@/lib/api';
import { Message } from '@/types';
import {
  ArrowUp,
  Check,
  CheckCheck,
  Reply,
  Trash2,
  Smile,
  X,
  CornerDownRight,
  Heart,
  Sparkles,
} from 'lucide-react';
import { format } from 'date-fns';
import { RealtimeChannel } from '@supabase/supabase-js';

const QUICK_REACTIONS = ['❤️', '🥰', '✨', '🥺', '🌸', '🧸', '💌', '🔥'];

export const ChatView: React.FC = () => {
  const { profile, partner } = useAuth();
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

  // Supabase Realtime for instant chat
  useEffect(() => {
    if (!isSupabaseConfigured() || !duoId || !profile) return;

    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    const channel = supabase.channel(`chat:${duoId}`, {
      config: { broadcast: { self: false } },
    });

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
            payload: {},
          });
        } catch (e) {
          console.warn(e);
        }
      }
    });

    channel.on('broadcast', { event: 'message_reaction' }, (payload) => {
      const { message_id, reactions } = payload.payload as {
        message_id: string;
        reactions: Record<string, string>;
      };
      if (!message_id) return;

      setMessages((prev) =>
        prev.map((m) => (m.id === message_id ? { ...m, reactions } : m))
      );
    });

    channel.on('broadcast', { event: 'message_deleted' }, (payload) => {
      const { message_id } = payload.payload as { message_id: string };
      if (!message_id) return;

      setMessages((prev) => prev.filter((m) => m.id !== message_id));
    });

    channel.on('broadcast', { event: 'messages_cleared' }, () => {
      setMessages([]);
    });

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

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const content = inputText.trim();
    if (!content || isSending || !profile) return;

    const tempId = `temp-${Date.now()}`;
    const optimisticMessage: Message = {
      id: tempId,
      duo_id: duoId || '',
      sender: {
        id: profile.id,
        name: profile.name,
        email: profile.email,
        avatar_url: profile.avatar_url,
      },
      receiver: partner || {
        id: '',
        name: 'Partner',
        email: '',
        avatar_url: '',
      },
      content,
      reply_to: replyingTo
        ? {
            id: replyingTo.id,
            sender_name: replyingTo.sender?.name || (replyingTo.is_me ? profile.name : 'Partner'),
            content: replyingTo.content,
          }
        : null,
      reactions: {},
      created_at: new Date().toISOString(),
      read_at: null,
      is_me: true,
    };

    setMessages((prev) => [...prev, optimisticMessage]);
    setInputText('');
    const targetReplyId = replyingTo?.id || null;
    setReplyingTo(null);
    setIsSending(true);

    try {
      const savedMessage = await messagesApi.send(content, targetReplyId);
      const fullSavedMessage: Message = {
        ...savedMessage,
        is_me: true,
      };

      setMessages((prev) =>
        prev.map((m) => (m.id === tempId ? fullSavedMessage : m))
      );

      if (channelRef.current) {
        channelRef.current.send({
          type: 'broadcast',
          event: 'new_message',
          payload: fullSavedMessage,
        });
      }
    } catch (err) {
      console.warn('Failed to send message:', err);
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      setInputText(content);
    } finally {
      setIsSending(false);
    }
  };

  const handleToggleReaction = async (msg: Message, emoji: string) => {
    if (!profile) return;
    const userId = profile.id;
    const currentReactions = { ...(msg.reactions || {}) };

    if (currentReactions[userId] === emoji) {
      delete currentReactions[userId];
    } else {
      currentReactions[userId] = emoji;
    }

    setMessages((prev) =>
      prev.map((m) => (m.id === msg.id ? { ...m, reactions: currentReactions } : m))
    );
    setActiveReactionMenu(null);

    try {
      const res = await messagesApi.react(msg.id, emoji);
      if (channelRef.current) {
        channelRef.current.send({
          type: 'broadcast',
          event: 'message_reaction',
          payload: { message_id: msg.id, reactions: res.reactions },
        });
      }
    } catch (err) {
      console.warn('Failed to update reaction:', err);
    }
  };

  const handleMessageTap = (msg: Message) => {
    const now = Date.now();
    if (lastTapRef.current && lastTapRef.current.id === msg.id && now - lastTapRef.current.time < 320) {
      handleToggleReaction(msg, '❤️');
      lastTapRef.current = null;
    } else {
      lastTapRef.current = { id: msg.id, time: now };
    }
  };

  const handleDeleteMessage = async (msg: Message) => {
    if (!confirm(msg.is_me ? 'Unsend this note?' : 'Delete this message?')) return;

    setMessages((prev) => prev.filter((m) => m.id !== msg.id));

    try {
      await messagesApi.delete(msg.id);
      if (channelRef.current) {
        channelRef.current.send({
          type: 'broadcast',
          event: 'message_deleted',
          payload: { message_id: msg.id },
        });
      }
    } catch (err) {
      console.warn('Failed to delete message:', err);
    }
  };

  const handleTouchStart = (e: React.TouchEvent, msg: Message) => {
    setTouchStartX(e.touches[0].clientX);
    setSwipingMessageId(msg.id);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStartX === null) return;
    const currentX = e.touches[0].clientX;
    const diff = currentX - touchStartX;
    if (diff > 0 && diff < 90) {
      setSwipeOffset(diff);
    }
  };

  const handleTouchEnd = (msg: Message) => {
    if (swipeOffset > 45) {
      handleSelectReply(msg);
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
      {/* Centered Marshmallow Conversation Container */}
      <div className="w-full max-w-[840px] xl:max-w-[880px] h-full flex flex-col overflow-hidden rounded-3xl border-2 border-[#FCE1E8] bg-[#FFFDFC] shadow-[0_8px_32px_rgba(244,114,182,0.08)]">
        {/* Chat Room Subheader with Cute Couple Pill */}
        <div className="flex items-center justify-between border-b border-[#FCE1E8] bg-gradient-to-r from-[#FFF5F7] to-[#FFF8F5] px-4 sm:px-6 py-3.5 shrink-0">
          <div className="flex items-center space-x-2.5 sm:space-x-3">
            <span className="text-xl">💖</span>
            <div>
              <h3 className="font-serif text-base sm:text-lg font-bold text-[#2D2522]">
                {partner?.name || 'My Favorite Person'}
              </h3>
              <p className="text-[10px] font-mono text-[#E11D48]">our private whisper stream ✨</p>
            </div>
          </div>

          <span className="text-[10px] font-mono text-[#15803D] flex items-center gap-1.5 bg-[#DCFCE7] px-3 py-1 rounded-full border border-[#BBF7D0]">
            <span className="h-1.5 w-1.5 rounded-full bg-[#22C55E] animate-ping" />
            live sync 💕
          </span>
        </div>

        {/* Message Stream */}
        <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 space-y-4 sm:space-y-5 bg-gradient-to-b from-[#FFFDFC] to-[#FFF8F9]">
          {isLoading ? (
            <div className="flex h-full items-center justify-center text-xs font-mono text-[#B2A49B]">
              Opening our secret chat... 💕
            </div>
          ) : messages.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-center p-8">
              <div className="h-14 w-14 rounded-3xl bg-gradient-to-tr from-[#FFE4E6] to-[#FED7AA] text-[#E11D48] flex items-center justify-center mb-3 shadow-[0_4px_16px_rgba(244,114,182,0.2)] animate-heart-pulse">
                <Heart className="h-7 w-7 fill-[#E11D48]" />
              </div>
              <span className="font-serif text-2xl font-bold text-[#2D2522] mb-1.5">Our Cozy Space 💕</span>
              <p className="max-w-xs text-xs sm:text-sm text-[#7A6D65] leading-relaxed">
                Leave a secret note, sweet thought, or memory for {partner?.name}. Double-tap any message to send a heart!
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
                  } ${isHighlighted ? 'ring-2 ring-[#E11D48]/40 rounded-3xl p-1 bg-[#FFF0F3]' : ''}`}
                >
                  {/* Swipe indicator */}
                  {isSwiping && swipeOffset > 20 && (
                    <div
                      className="absolute left-0 top-1/2 -translate-y-1/2 text-[#E11D48] flex items-center gap-1 text-xs font-mono font-bold"
                      style={{ opacity: Math.min(swipeOffset / 40, 1) }}
                    >
                      <Reply className="h-3.5 w-3.5" />
                      <span>Reply</span>
                    </div>
                  )}

                  {/* Quoted reply banner */}
                  {msg.reply_to && (
                    <div
                      onClick={() => msg.reply_to && handleScrollToMessage(msg.reply_to.id)}
                      className={`mb-1 flex items-center space-x-2 cursor-pointer max-w-[85%] sm:max-w-[70%] rounded-2xl px-3.5 py-1.5 text-xs border ${
                        msg.is_me
                          ? 'border-[#FCE1E8] bg-[#FFF0F3] text-[#E11D48]'
                          : 'border-[#F4EBE6] bg-[#FFFFFF] text-[#6D5E56]'
                      } transition-all hover:opacity-85 shadow-2xs`}
                    >
                      <CornerDownRight className="h-3.5 w-3.5 text-[#E11D48] shrink-0" />
                      <span className="font-bold text-[#2D2522] shrink-0">
                        {msg.reply_to.sender_name}:
                      </span>
                      <span className="truncate italic">"{msg.reply_to.content}"</span>
                    </div>
                  )}

                  {/* Message Bubble */}
                  <div className="relative flex items-center gap-1.5 max-w-[85%] sm:max-w-[70%]">
                    {/* Action buttons (desktop hover) */}
                    <div
                      className={`opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 ${
                        msg.is_me ? 'order-first' : 'order-last'
                      }`}
                    >
                      <button
                        onClick={() => setActiveReactionMenu(isMenuOpen ? null : msg.id)}
                        className="rounded-full p-1.5 text-[#B2A49B] hover:bg-[#FFF0F3] hover:text-[#E11D48] transition-all"
                        title="React"
                      >
                        <Smile className="h-4 w-4" />
                      </button>

                      <button
                        onClick={() => handleSelectReply(msg)}
                        className="rounded-full p-1.5 text-[#B2A49B] hover:bg-[#FFF0F3] hover:text-[#E11D48] transition-all"
                        title="Reply"
                      >
                        <Reply className="h-4 w-4" />
                      </button>

                      <button
                        onClick={() => handleDeleteMessage(msg)}
                        className="rounded-full p-1.5 text-[#B2A49B] hover:bg-[#FFF0F3] hover:text-[#E11D48] transition-all"
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
                      className={`relative select-none cursor-pointer rounded-[24px] sm:rounded-[26px] px-4.5 sm:px-5 py-3 text-xs sm:text-[14px] leading-relaxed transition-all ${
                        msg.is_me
                          ? 'bg-gradient-to-r from-[#FF758C] to-[#FF7EB3] text-white rounded-br-[6px] shadow-[0_4px_16px_rgba(255,117,140,0.25)]'
                          : 'bg-[#FFFFFF] text-[#2D2522] border-1.5 border-[#FCE1E8] rounded-bl-[6px] shadow-[0_3px_12px_rgba(244,114,182,0.06)]'
                      }`}
                    >
                      <p className="whitespace-pre-wrap break-words">{msg.content}</p>

                      {/* Inline Reactions Pill */}
                      {reactionEntries.length > 0 && (
                        <div
                          className={`absolute -bottom-3 ${
                            msg.is_me ? 'right-3' : 'left-3'
                          } flex items-center space-x-1 rounded-full border border-[#FCE1E8] bg-[#FFFFFF] px-2.5 py-0.5 text-xs shadow-sm`}
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
                              className="hover:scale-125 transition-transform cursor-pointer"
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
                      className={`z-20 mt-1 flex items-center gap-1 rounded-full border-2 border-[#FCE1E8] bg-[#FFFFFF] p-1.5 shadow-[0_12px_32px_rgba(225,29,72,0.15)] ${
                        msg.is_me ? 'mr-2' : 'ml-2'
                      }`}
                    >
                      {QUICK_REACTIONS.map((emoji) => (
                        <button
                          key={emoji}
                          onClick={() => handleToggleReaction(msg, emoji)}
                          className="rounded-full p-1 text-lg hover:scale-130 transition-transform"
                        >
                          {emoji}
                        </button>
                      ))}
                      <button
                        onClick={() => setActiveReactionMenu(null)}
                        className="rounded-full p-1 text-[#B2A49B] hover:text-[#E11D48]"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}

                  {/* Timestamp & Read Status */}
                  <div className="mt-1 flex items-center space-x-1 px-1 text-[10px] font-mono text-[#B2A49B]">
                    <span>
                      {msg.created_at ? format(new Date(msg.created_at), 'hh:mm a') : 'Just now'}
                    </span>
                    {msg.is_me && (
                      <span>
                        {msg.read_at ? (
                          <CheckCheck className="h-3.5 w-3.5 text-[#E11D48]" />
                        ) : (
                          <Check className="h-3.5 w-3.5 text-[#B2A49B]" />
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
          <div className="flex items-center justify-between border-t border-[#FCE1E8] bg-[#FFF0F3] px-4 sm:px-6 py-2.5 text-xs sm:text-sm shrink-0">
            <div className="flex items-center space-x-2 truncate">
              <Reply className="h-4 w-4 text-[#E11D48] shrink-0" />
              <span className="font-bold text-[#E11D48] shrink-0">
                Replying to {replyingTo.is_me ? 'yourself' : replyingTo.sender?.name || partner?.name}:
              </span>
              <span className="truncate italic text-[#7A6D65]">"{replyingTo.content}"</span>
            </div>
            <button
              onClick={() => setReplyingTo(null)}
              className="p-1 text-[#B2A49B] hover:text-[#E11D48] transition-all"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Input Composer */}
        <form onSubmit={handleSendMessage} className="border-t border-[#FCE1E8] bg-[#FFFFFF] p-3.5 sm:p-4 shrink-0">
          <div className="flex items-center space-x-3">
            <textarea
              ref={textareaRef}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                replyingTo
                  ? `Replying to ${replyingTo.is_me ? 'yourself' : replyingTo.sender?.name}... 💕`
                  : `Whisper something sweet to ${partner?.name || 'your partner'}... 💕 (Enter to send)`
              }
              rows={1}
              className="flex-1 max-h-32 min-h-[46px] resize-none rounded-2xl border-2 border-[#FCE1E8] bg-[#FFFDFC] px-4 py-3 text-xs sm:text-sm text-[#2D2522] placeholder-[#B2A49B] focus:border-[#FF758C] focus:bg-[#FFFFFF] focus:outline-none focus:ring-2 focus:ring-[#FF758C]/20"
            />
            <button
              type="submit"
              disabled={!inputText.trim() || isSending}
              className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-tr from-[#FF758C] to-[#FF7EB3] text-white hover:scale-105 hover:shadow-[0_4px_16px_rgba(255,117,140,0.4)] disabled:opacity-30 transition-all shrink-0 shadow-sm"
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
