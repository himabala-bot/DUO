'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { notesApi } from '@/lib/api';
import { LittleNote } from '@/types';
import {
  Plus,
  Pin,
  Trash2,
  Mic,
  PenTool,
  Sparkles,
  Heart,
  Calendar,
  X,
  FileText,
  Camera,
  ArrowRight,
  ArrowLeft,
  Clock,
  Volume2,
} from 'lucide-react';
import { format } from 'date-fns';
import { RealtimeChannel } from '@supabase/supabase-js';
import { VoiceRecorder } from './VoiceRecorder';
import { WaveformPlayer } from './WaveformPlayer';
import { Avatar } from './Avatar';
import { MiniDoodleCanvas } from './MiniDoodleCanvas';
import { cn } from '@/lib/utils';

const NOTE_COLORS = [
  { id: 'cream', bg: '#FAF7F2', border: '#EFE8DC', name: 'Cozy Paper' },
  { id: 'pink', bg: '#FFF8FA', border: '#FCC4C0', name: 'Blush Rose' },
  { id: 'peach', bg: '#FFF9EE', border: '#FFD094', name: 'Warm Butter' },
  { id: 'teal', bg: '#F2F9F9', border: '#AECFD0', name: 'Sage Sky' },
  { id: 'matcha', bg: '#F5FBEF', border: '#DDF2B8', name: 'Matcha Lime' },
];

type CategoryType = 'TEXT' | 'PHOTO' | 'VOICE' | 'DRAWING';

interface CategoryConfig {
  id: CategoryType;
  title: string;
  subtitle: string;
  icon: React.ComponentType<{ className?: string }>;
  accentColor: string;
  badgeBg: string;
  cardBg: string;
}

const CATEGORIES: CategoryConfig[] = [
  {
    id: 'TEXT',
    title: 'Text Notes',
    subtitle: 'Heartfelt words, thoughts & tiny reminders',
    icon: FileText,
    accentColor: 'text-[#125CB9]',
    badgeBg: 'bg-[#125CB9]/10 border-[#125CB9]/30 text-[#125CB9]',
    cardBg: 'var(--bg-card)',
  },
  {
    id: 'PHOTO',
    title: 'Photos',
    subtitle: 'Moments from today & cozy snapshots',
    icon: Camera,
    accentColor: 'text-[#FB7185]',
    badgeBg: 'bg-[#FB7185]/10 border-[#FB7185]/30 text-[#FB7185]',
    cardBg: 'var(--bg-card)',
  },
  {
    id: 'VOICE',
    title: 'Voice Notes',
    subtitle: 'Audio whispers, laughs & sweet voice memos',
    icon: Mic,
    accentColor: 'text-[#00D26A]',
    badgeBg: 'bg-[#00D26A]/10 border-[#00D26A]/30 text-[#00D26A]',
    cardBg: 'var(--bg-card)',
  },
  {
    id: 'DRAWING',
    title: 'Doodles',
    subtitle: 'Hand-drawn love sketches & live canvas ink',
    icon: PenTool,
    accentColor: 'text-[#00D0FF]',
    badgeBg: 'bg-[#00D0FF]/10 border-[#00D0FF]/30 text-[#00D0FF]',
    cardBg: 'var(--bg-card)',
  },
];

export const LittleNotesView: React.FC = () => {
  const { profile, partner } = useAuth();
  const { toast, confirm } = useToast();
  const [notes, setNotes] = useState<LittleNote[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Active view: null means "All Memos Category Hub" (4 main cards), otherwise the opened category
  const [selectedCategory, setSelectedCategory] = useState<CategoryType | null>(null);
  const [previewNote, setPreviewNote] = useState<LittleNote | null>(null);

  // Create Note Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [noteType, setNoteType] = useState<CategoryType>('TEXT');
  const [textContent, setTextContent] = useState('');
  const [mediaUrl, setMediaUrl] = useState('');
  const [selectedColor, setSelectedColor] = useState('#FAF7F2');
  const [isPinned, setIsPinned] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const channelRef = useRef<RealtimeChannel | null>(null);
  const duoId = profile?.active_duo_id;

  const fetchNotes = useCallback(async () => {
    try {
      const res = await notesApi.list();
      setNotes(res.notes || []);
    } catch (err) {
      console.warn('Failed to load Little Notes:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotes();
  }, [fetchNotes]);

  // Supabase Realtime channel for instant note sync
  useEffect(() => {
    if (!isSupabaseConfigured() || !duoId) return;

    const channel = supabase.channel(`notes:${duoId}`, {
      config: { broadcast: { self: false } },
    });

    channel.on('broadcast', { event: 'notes_updated' }, () => {
      fetchNotes();
    });

    channel.subscribe();
    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [duoId, fetchNotes]);

  const broadcastUpdate = () => {
    if (channelRef.current) {
      channelRef.current.send({
        type: 'broadcast',
        event: 'notes_updated',
        payload: {},
      });
    }
  };

  // Create Note
  const handleCreateNote = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (noteType === 'TEXT' && !textContent.trim()) return;
    if (noteType === 'DRAWING' && !mediaUrl) {
      toast.info('Please draw a doodle first', 'Empty Doodle');
      return;
    }

    setIsSubmitting(true);
    try {
      const newNote = await notesApi.create({
        note_type: noteType,
        content: textContent.trim(),
        media_url: mediaUrl.trim(),
        color: selectedColor,
        is_pinned: isPinned,
      });

      setNotes((prev) => [newNote, ...prev]);
      setTextContent('');
      setMediaUrl('');
      setShowCreateModal(false);
      toast.love('Little note pinned to board', 'Note Created');
      broadcastUpdate();
    } catch (err: any) {
      toast.error(err.message || 'Failed to create note.', 'Error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Toggle Pin
  const handleTogglePin = async (note: LittleNote) => {
    const nextPinned = !note.is_pinned;
    setNotes((prev) =>
      prev.map((n) => (n.id === note.id ? { ...n, is_pinned: nextPinned } : n))
    );

    try {
      await notesApi.update(note.id, { is_pinned: nextPinned });
      toast.love(nextPinned ? 'Note pinned to top' : 'Note unpinned', 'Pinned');
      broadcastUpdate();
    } catch (err: any) {
      toast.error('Failed to pin note.', 'Error');
      fetchNotes();
    }
  };

  // Delete Note
  const handleDeleteNote = async (note: LittleNote) => {
    const ok = await confirm({
      title: 'Delete Little Note?',
      message: 'Remove this note from your shared board.',
      confirmText: 'Delete',
      type: 'danger',
    });
    if (!ok) return;

    setNotes((prev) => prev.filter((n) => n.id !== note.id));

    try {
      await notesApi.delete(note.id);
      toast.love('Note removed.', 'Deleted');
      broadcastUpdate();
    } catch (err: any) {
      toast.error('Failed to delete note.', 'Error');
      fetchNotes();
    }
  };

  // Handle Photo File Upload
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      setMediaUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const openCreateForCategory = (cat: CategoryType) => {
    setNoteType(cat);
    setTextContent('');
    setMediaUrl('');
    setShowCreateModal(true);
  };

  // Identify latest note from partner (or most recent note)
  const latestNoteForYou = notes.find((n) => !n.is_me) || notes[0];

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center space-y-2">
          <Heart className="h-6 w-6 text-[#EA5E86] animate-bounce mx-auto" />
          <p className="text-xs font-mono text-[#A89F91]">Opening our Little Notes board...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full flex justify-center px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
      {/* Main Container (~1100–1200px) */}
      <div className="w-full max-w-6xl space-y-5">
        {/* Header & Controls */}
        <div className="pb-4 border-b border-theme flex flex-col sm:flex-row sm:items-baseline justify-between gap-3">
          <div>
            <div className="flex items-center space-x-1.5 text-xs font-mono text-theme-muted">
              <Sparkles className="h-3.5 w-3.5 text-[#FB923C]" />
              <span>Little Notes & Moments</span>
            </div>
            <h2 className="mt-1 font-serif text-2xl sm:text-3xl font-bold text-theme-primary">
              Little Notes Studio
            </h2>
            <p className="mt-0.5 text-xs sm:text-sm text-theme-secondary">
              &ldquo;I saw something today that reminded me of you.&rdquo; Tiny memos, photos, voice notes, and doodles.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
            <button
              onClick={() => {
                setNoteType(selectedCategory || 'TEXT');
                setShowCreateModal(true);
              }}
              className="flex items-center space-x-1.5 rounded-full bg-[#125CB9] px-4 py-2 text-xs font-medium text-white hover:bg-[#0E4B99] transition-colors shadow-xs"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>New Note</span>
            </button>
          </div>
        </div>

        {/* ─────────────────────────────────────────────────────────────
            "NEW NOTE FOR YOU" BANNER (When a note exists)
        ───────────────────────────────────────────────────────────── */}
        {latestNoteForYou && (
          <div
            onClick={() => setPreviewNote(latestNoteForYou)}
            className="group relative cursor-pointer overflow-hidden rounded-2xl border border-theme bg-theme-card p-3.5 sm:p-4 shadow-xs transition-all hover:border-[#125CB9]"
          >
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center space-x-3 min-w-0">
                <Avatar src={latestNoteForYou.author.avatar_url} name={latestNoteForYou.author.name} size="sm" />

                <div className="min-w-0">
                  <div className="flex items-center space-x-2">
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-medium border border-[#125CB9]/25 bg-[#125CB9]/10 text-[#125CB9]">
                      <Heart className="h-2.5 w-2.5 fill-current" />
                      <span>Note for you</span>
                    </span>
                    <span className="text-[10px] font-mono text-theme-muted">
                      {format(new Date(latestNoteForYou.created_at), 'hh:mm a')}
                    </span>
                  </div>

                  <h4 className="mt-0.5 font-serif text-sm sm:text-base font-bold text-theme-primary truncate">
                    {latestNoteForYou.is_me ? `You posted a ${latestNoteForYou.note_type.toLowerCase()}` : `New note for you by ${latestNoteForYou.author.name}`}
                  </h4>

                  <p className="text-xs text-theme-secondary line-clamp-1">
                    {latestNoteForYou.content || (latestNoteForYou.note_type === 'DRAWING' ? 'Sent a hand-drawn doodle' : latestNoteForYou.note_type === 'VOICE' ? 'Recorded a voice whisper' : 'Attached a photo')}
                  </p>
                </div>
              </div>

              {/* Right CTA */}
              <div className="flex items-center space-x-1.5 shrink-0 self-end sm:self-center">
                <span className="text-xs font-semibold text-[#125CB9] group-hover:underline">
                  Open Note
                </span>
                <span className="flex h-8 w-8 items-center justify-center rounded-full border border-theme bg-theme-input text-theme-secondary group-hover:bg-[#125CB9] group-hover:text-white transition-colors">
                  <ArrowRight className="h-3.5 w-3.5" />
                </span>
              </div>
            </div>
          </div>
        )}

        {/* ─────────────────────────────────────────────────────────────
            MAIN VIEW 1: ALL MEMOS 4-CATEGORY CARDS HUB (When selectedCategory is null)
        ───────────────────────────────────────────────────────────── */}
        {selectedCategory === null ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-serif text-base sm:text-lg font-bold text-theme-primary">
                  All Collections
                </h3>
                <p className="text-xs text-theme-secondary mt-0.5">
                  Browse by category to view our collection of words, photos, voice notes, and doodles.
                </p>
              </div>
            </div>

            {/* 4 Primary Category Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {CATEGORIES.map((cat) => {
                const Icon = cat.icon;
                const catNotes = notes.filter((n) => n.note_type === cat.id);
                const latestInCat = catNotes[0];
                const count = catNotes.length;

                return (
                  <div
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id)}
                    className="group relative block w-full h-[330px] cursor-pointer rounded-2xl border border-theme bg-theme-card p-4 text-theme-primary shadow-xs transition-all hover:border-[#125CB9] flex flex-col justify-between overflow-hidden"
                  >
                    {/* Card Header: Category Title & Arrow */}
                    <div className="flex items-center justify-between shrink-0">
                      <div className="flex items-center space-x-2">
                        <div className={`flex h-8 w-8 items-center justify-center rounded-xl border border-theme bg-theme-input ${cat.accentColor}`}>
                          <Icon className="h-4 w-4" />
                        </div>
                        <div>
                          <h4 className="font-serif text-xs sm:text-sm font-bold text-theme-primary">
                            {cat.title}
                          </h4>
                          <span className="text-[10px] font-mono text-theme-muted">
                            {count} {count === 1 ? 'note' : 'notes'}
                          </span>
                        </div>
                      </div>

                      <div className="flex h-7 w-7 items-center justify-center rounded-full border border-theme bg-theme-input text-theme-muted group-hover:bg-[#125CB9] group-hover:text-white transition-colors">
                        <ArrowRight className="h-3 w-3" />
                      </div>
                    </div>

                    {/* Visual Preview */}
                    <div className="relative my-2.5 h-36 w-full shrink-0">
                      {latestInCat ? (
                        <>
                          {cat.id === 'DRAWING' && latestInCat.media_url ? (
                            <div className="relative h-full w-full overflow-hidden rounded-xl border border-theme bg-theme-input p-2 flex items-center justify-center">
                              <img
                                src={latestInCat.media_url}
                                alt="Latest Doodle"
                                className="h-full w-full object-contain select-none"
                              />
                            </div>
                          ) : cat.id === 'PHOTO' && latestInCat.media_url ? (
                            <div className="relative h-full w-full overflow-hidden rounded-xl border border-theme bg-theme-input">
                              <img
                                src={latestInCat.media_url}
                                alt="Latest Photo"
                                className="h-full w-full object-cover"
                              />
                            </div>
                          ) : cat.id === 'VOICE' && latestInCat.media_url ? (
                            <div className="relative h-full w-full flex items-center justify-center">
                              <div className="w-full rounded-xl border border-theme bg-theme-input p-3">
                                <WaveformPlayer audioUrl={latestInCat.media_url} />
                              </div>
                            </div>
                          ) : (
                            <div className="relative h-full w-full overflow-hidden rounded-xl border border-theme bg-theme-input p-3 flex items-center">
                              <p className="text-xs text-theme-primary whitespace-pre-wrap leading-relaxed line-clamp-4">
                                {latestInCat.content}
                              </p>
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="relative h-full w-full flex flex-col items-center justify-center rounded-xl border border-dashed border-theme bg-theme-input/50 p-4 text-center">
                          <Icon className={`h-5 w-5 mb-1 opacity-40 ${cat.accentColor}`} />
                          <span className="text-xs font-serif font-medium text-theme-muted">No {cat.title.toLowerCase()} yet</span>
                        </div>
                      )}
                    </div>

                    {/* Stats & Latest Author Footer */}
                    <div className="pt-2 border-t border-theme-subtle shrink-0">
                      {latestInCat ? (
                        <div className="flex items-center justify-between text-[10px] font-mono text-theme-muted">
                          <div className="flex items-center space-x-1.5 truncate max-w-[130px]">
                            <Avatar src={latestInCat.author.avatar_url} name={latestInCat.author.name} size="xs" />
                            <span className="truncate">{latestInCat.is_me ? 'You' : latestInCat.author.name}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <Clock className="h-2.5 w-2.5 text-[#FB923C]" />
                            <span>{format(new Date(latestInCat.created_at), 'MMM dd')}</span>
                          </div>
                        </div>
                      ) : (
                        <span className="text-[10px] font-mono text-theme-muted">
                          Empty collection
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          /* ─────────────────────────────────────────────────────────────
              MAIN VIEW 2: CATEGORY DETAIL VIEW (When a category card is clicked)
          ───────────────────────────────────────────────────────────── */
          <div className="space-y-4 animate-in fade-in duration-150">
            {(() => {
              const currentCatConfig = CATEGORIES.find((c) => c.id === selectedCategory) || CATEGORIES[0];
              const CatIcon = currentCatConfig.icon;
              const categoryNotes = notes.filter((n) => n.note_type === selectedCategory);

              return (
                <>
                  {/* Category Top Breadcrumb & Action Bar */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-theme">
                    <div className="flex items-center space-x-2.5">
                      <button
                        onClick={() => setSelectedCategory(null)}
                        className="flex items-center space-x-1.5 rounded-full border border-theme bg-theme-card px-3.5 py-1.5 text-xs font-mono text-theme-secondary hover:bg-theme-card-hover transition-colors shadow-xs"
                      >
                        <ArrowLeft className="h-3 w-3" />
                        <span>All Collections</span>
                      </button>

                      <div className="flex items-center space-x-2">
                        <CatIcon className={`h-4 w-4 ${currentCatConfig.accentColor}`} />
                        <h3 className="font-serif text-base sm:text-lg font-bold text-theme-primary">
                          {currentCatConfig.title}
                        </h3>
                        <span className="text-[11px] font-mono font-medium px-2.5 py-0.2 rounded-full border bg-theme-input border-theme text-theme-muted">
                          {categoryNotes.length}
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={() => openCreateForCategory(currentCatConfig.id)}
                      className="flex items-center space-x-1.5 rounded-full bg-[#125CB9] px-4 py-1.5 text-xs font-medium text-white hover:bg-[#0E4B99] transition-colors shadow-xs self-start sm:self-auto"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      <span>Add {currentCatConfig.title.slice(0, -1)}</span>
                    </button>
                  </div>

                  {/* Category Notes Grid */}
                  {categoryNotes.length === 0 ? (
                    <div className="rounded-2xl border border-theme bg-theme-card p-10 text-center space-y-2 shadow-xs">
                      <CatIcon className={`h-6 w-6 mx-auto mb-1 ${currentCatConfig.accentColor}`} />
                      <h4 className="font-serif text-base font-bold text-theme-primary">No {currentCatConfig.title.toLowerCase()} yet</h4>
                      <p className="text-xs text-theme-secondary max-w-sm mx-auto">
                        Share a {currentCatConfig.title.toLowerCase().slice(0, -1)} with {partner?.name || 'your partner'}.
                      </p>
                      <button
                        onClick={() => openCreateForCategory(currentCatConfig.id)}
                        className="mt-2 inline-flex items-center space-x-1.5 rounded-full bg-[#125CB9] px-4 py-2 text-xs font-medium text-white hover:bg-[#0E4B99] transition-colors shadow-xs"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        <span>Create Note</span>
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                      {categoryNotes.map((note) => {
                        const formattedDate = format(new Date(note.created_at), 'MMM dd, hh:mm a');

                        return (
                          <div
                            key={note.id}
                            onClick={() => setPreviewNote(note)}
                            className={cn(
                              "group relative block w-full h-[320px] cursor-pointer rounded-2xl border border-theme bg-theme-card p-4 text-theme-primary shadow-xs transition-all hover:border-[#125CB9] flex flex-col justify-between overflow-hidden",
                              note.is_pinned ? "ring-2 ring-[#125CB9]/40" : ""
                            )}
                          >
                            <div className="flex flex-col h-full justify-between">
                              {/* Card Header: Author and Pin */}
                              <div className="mb-2 flex items-center justify-between shrink-0">
                                <div className="flex items-center space-x-2">
                                  <Avatar src={note.author.avatar_url} name={note.author.name} size="xs" />
                                  <h3 className="text-xs font-bold text-theme-primary truncate max-w-[120px]">
                                    {note.is_me ? 'You' : note.author.name}
                                  </h3>
                                </div>

                                <div className="flex items-center space-x-0.5">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleTogglePin(note);
                                    }}
                                    className={`p-1 rounded-full transition-colors ${
                                      note.is_pinned
                                        ? 'text-[#125CB9] bg-theme-input'
                                        : 'text-theme-muted hover:text-theme-primary opacity-0 group-hover:opacity-100'
                                    }`}
                                    title={note.is_pinned ? 'Unpin note' : 'Pin note'}
                                  >
                                    <Pin className="h-3 w-3 fill-current" />
                                  </button>

                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDeleteNote(note);
                                    }}
                                    className="p-1 text-theme-muted hover:text-[#F43F5E] rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                    title="Delete note"
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </button>
                                </div>
                              </div>

                              {/* Visual Display */}
                              <div className="relative mb-2 h-36 w-full shrink-0">
                                {note.note_type === 'DRAWING' && note.media_url ? (
                                  <div className="relative h-full w-full overflow-hidden rounded-xl border border-theme bg-theme-input p-2 flex items-center justify-center">
                                    <img
                                      src={note.media_url}
                                      alt="Doodle"
                                      className="h-full w-full object-contain select-none"
                                    />
                                  </div>
                                ) : note.note_type === 'PHOTO' && note.media_url ? (
                                  <div className="relative h-full w-full overflow-hidden rounded-xl border border-theme bg-theme-input">
                                    <img
                                      src={note.media_url}
                                      alt="Photo"
                                      className="h-full w-full object-cover"
                                    />
                                  </div>
                                ) : note.note_type === 'VOICE' && note.media_url ? (
                                  <div className="relative h-full w-full flex items-center justify-center">
                                    <div className="w-full rounded-xl border border-theme bg-theme-input p-3">
                                      <WaveformPlayer audioUrl={note.media_url} />
                                    </div>
                                  </div>
                                ) : (
                                  <div className="relative h-full w-full overflow-hidden rounded-xl border border-theme bg-theme-input p-3 flex items-center">
                                    <p className="text-xs text-theme-primary whitespace-pre-wrap leading-relaxed line-clamp-4">
                                      {note.content}
                                    </p>
                                  </div>
                                )}
                              </div>

                              {/* Stats Section */}
                              <div className="flex items-center justify-between text-[10px] font-mono text-theme-muted shrink-0">
                                <div className="flex items-center space-x-1">
                                  <Clock className="h-2.5 w-2.5 text-[#FB923C]" />
                                  <span>{formattedDate}</span>
                                </div>
                                <span className="capitalize">{note.note_type.toLowerCase()}</span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </>
              );
            })()}
          </div>
        )}
      </div>

      {/* ─────────────────────────────────────────────────────────────
          FULL NOTE DETAIL & ZOOM PREVIEW MODAL
      ───────────────────────────────────────────────────────────── */}
      {previewNote && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-[3px]">
          <div className="w-full max-w-md rounded-2xl border border-theme bg-theme-card p-5 shadow-2xl animate-in zoom-in-95 duration-150 space-y-3.5 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-2.5 border-b border-theme">
              <div className="flex items-center space-x-2">
                <Avatar src={previewNote.author.avatar_url} name={previewNote.author.name} size="xs" />
                <div>
                  <h4 className="text-xs font-bold text-theme-primary">
                    {previewNote.is_me ? 'You' : previewNote.author.name}
                  </h4>
                  <p className="text-[10px] font-mono text-theme-muted">
                    {format(new Date(previewNote.created_at), 'MMMM dd, yyyy • hh:mm a')}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setPreviewNote(null)}
                className="p-1 rounded-full text-theme-muted hover:text-theme-primary"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Media Zoom */}
            {previewNote.note_type === 'DRAWING' && previewNote.media_url && (
              <div className="rounded-xl border border-theme bg-theme-input p-3">
                <img
                  src={previewNote.media_url}
                  alt="Doodle"
                  className="w-full max-h-72 object-contain select-none"
                />
              </div>
            )}

            {previewNote.note_type === 'PHOTO' && previewNote.media_url && (
              <div className="rounded-xl border border-theme bg-theme-input overflow-hidden">
                <img
                  src={previewNote.media_url}
                  alt="Photo"
                  className="w-full max-h-80 object-cover"
                />
              </div>
            )}

            {previewNote.note_type === 'VOICE' && previewNote.media_url && (
              <div className="rounded-xl border border-theme bg-theme-input p-3">
                <WaveformPlayer audioUrl={previewNote.media_url} />
              </div>
            )}

            {previewNote.content && (
              <div className="p-3 bg-theme-input rounded-xl border border-theme">
                <p className="text-xs sm:text-sm text-theme-primary whitespace-pre-wrap leading-relaxed">
                  {previewNote.content}
                </p>
              </div>
            )}

            <div className="flex justify-end pt-1">
              <button
                onClick={() => setPreviewNote(null)}
                className="px-4 py-1.5 rounded-full bg-[#125CB9] text-white text-xs font-medium hover:bg-[#0E4B99] transition-colors shadow-xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          CREATE NOTE MODAL DIALOG
      ───────────────────────────────────────────────────────────── */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-[3px] overflow-y-auto">
          <div className="w-full max-w-lg rounded-2xl border border-theme bg-theme-card p-5 shadow-2xl animate-in zoom-in-95 duration-150 space-y-4">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-2.5 border-b border-theme">
              <div className="flex items-center space-x-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-[#125CB9]/10 text-[#125CB9]">
                  <Heart className="h-3.5 w-3.5 fill-current" />
                </span>
                <h3 className="font-serif text-base font-bold text-theme-primary">Leave a Little Note</h3>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-1 text-theme-muted hover:text-theme-primary rounded-full"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Note Type Selector Tabs */}
            <div className="grid grid-cols-4 gap-1 border border-theme rounded-xl p-1 bg-theme-input">
              {[
                { id: 'TEXT', label: 'Text', icon: FileText },
                { id: 'PHOTO', label: 'Photo', icon: Camera },
                { id: 'VOICE', label: 'Voice', icon: Mic },
                { id: 'DRAWING', label: 'Doodle', icon: PenTool },
              ].map((tab) => {
                const Icon = tab.icon;
                const isActive = noteType === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => {
                      setNoteType(tab.id as any);
                      if (tab.id === 'TEXT') setMediaUrl('');
                    }}
                    className={`flex items-center justify-center space-x-1.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      isActive
                        ? 'bg-theme-card text-theme-primary font-semibold shadow-xs'
                        : 'text-theme-secondary hover:text-theme-primary'
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Form Content */}
            <form onSubmit={handleCreateNote} className="space-y-3">
              {/* Photo Upload Option */}
              {noteType === 'PHOTO' && (
                <div className="space-y-2">
                  <label className="block text-xs font-medium text-theme-secondary">Upload Photo</label>
                  <label className="cursor-pointer flex items-center justify-center space-x-2 rounded-xl border border-dashed border-theme bg-theme-input px-4 py-2.5 text-xs font-medium text-theme-primary hover:border-[#125CB9] transition-colors">
                    <Camera className="h-4 w-4 text-[#125CB9]" />
                    <span>Choose Image</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoUpload}
                      className="hidden"
                    />
                  </label>
                  {mediaUrl && (
                    <div className="rounded-xl border border-theme overflow-hidden max-h-44 mt-2">
                      <img src={mediaUrl} alt="Preview" className="w-full h-full object-cover" />
                    </div>
                  )}
                </div>
              )}

              {/* Voice Note Option */}
              {noteType === 'VOICE' && (
                <div className="space-y-2 text-center p-3 rounded-xl border border-theme bg-theme-input">
                  <span className="text-xs text-theme-secondary block mb-1 font-medium">Record voice memo:</span>
                  <div className="flex justify-center">
                    <VoiceRecorder onSendVoice={(url) => setMediaUrl(url)} />
                  </div>
                  {mediaUrl && (
                    <div className="mt-2 flex justify-center">
                      <WaveformPlayer audioUrl={mediaUrl} />
                    </div>
                  )}
                </div>
              )}

              {/* Drawing Option - Direct Inline Drawing Canvas */}
              {noteType === 'DRAWING' && (
                <div className="space-y-1">
                  <label className="block text-xs font-medium text-theme-secondary">Draw Doodle</label>
                  <MiniDoodleCanvas onChange={(dataUrl) => setMediaUrl(dataUrl || '')} />
                </div>
              )}

              {/* Note Content / Message */}
              <div>
                <label className="block text-xs font-medium text-theme-secondary mb-1">
                  {noteType === 'TEXT' ? 'Note Message' : 'Caption (optional)'}
                </label>
                <textarea
                  value={textContent}
                  onChange={(e) => setTextContent(e.target.value)}
                  placeholder={
                    noteType === 'TEXT'
                      ? 'I saw something today that reminded me of you...'
                      : 'Add a sweet caption...'
                  }
                  rows={2}
                  required={noteType === 'TEXT'}
                  className="w-full rounded-xl border border-theme bg-theme-input p-3 text-xs sm:text-sm text-theme-primary placeholder-theme-muted focus:border-[#125CB9] focus:bg-theme-card focus:outline-none"
                />
              </div>

              {/* Pin Checkbox */}
              <label className="flex items-center space-x-2 text-xs text-theme-secondary cursor-pointer">
                <input
                  type="checkbox"
                  checked={isPinned}
                  onChange={(e) => setIsPinned(e.target.checked)}
                  className="rounded border-theme text-[#125CB9] focus:ring-[#125CB9]"
                />
                <span>Pin this note to the top</span>
              </label>

              {/* Submit Buttons */}
              <div className="flex justify-end gap-2 pt-2 border-t border-theme">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-3.5 py-1.5 rounded-full border border-theme text-xs font-medium text-theme-secondary hover:bg-theme-input"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={
                    isSubmitting ||
                    (noteType === 'TEXT' && !textContent.trim()) ||
                    (noteType === 'DRAWING' && !mediaUrl)
                  }
                  className="px-4 py-1.5 rounded-full bg-[#125CB9] text-white hover:bg-[#0E4B99] text-xs font-medium shadow-xs disabled:opacity-40 transition-colors"
                >
                  {isSubmitting ? 'Posting...' : 'Post Little Note'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
