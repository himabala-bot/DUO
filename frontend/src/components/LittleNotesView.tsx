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
    accentColor: 'text-[#422F0E]',
    badgeBg: 'bg-[#FAF7F2] border-[#EFE8DC] text-[#422F0E]',
    cardBg: '#FAF7F2',
  },
  {
    id: 'PHOTO',
    title: 'Photos',
    subtitle: 'Moments from today & cozy snapshots',
    icon: Camera,
    accentColor: 'text-[#EA5E86]',
    badgeBg: 'bg-[#FFF8FA] border-[#FCC4C0] text-[#EA5E86]',
    cardBg: '#FFF8FA',
  },
  {
    id: 'VOICE',
    title: 'Voice Notes',
    subtitle: 'Audio whispers, laughs & sweet voice memos',
    icon: Mic,
    accentColor: 'text-[#037F71]',
    badgeBg: 'bg-[#F5FBEF] border-[#DDF2B8] text-[#037F71]',
    cardBg: '#F5FBEF',
  },
  {
    id: 'DRAWING',
    title: 'Doodles',
    subtitle: 'Hand-drawn love sketches & live canvas ink',
    icon: PenTool,
    accentColor: 'text-[#F49625]',
    badgeBg: 'bg-[#FFF9EE] border-[#FFD094] text-[#F49625]',
    cardBg: '#FFF9EE',
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
    <div className="w-full flex justify-center px-4 sm:px-6 lg:px-8 py-6 sm:py-8 lg:py-10">
      {/* Main Container (~1100–1240px) */}
      <div className="w-full max-w-[1240px] space-y-6 sm:space-y-8">
        {/* Header & Controls */}
        <div className="pb-6 border-b border-[#EFE8DC] flex flex-col sm:flex-row sm:items-baseline justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2 text-xs font-mono text-[#A89F91]">
              <Sparkles className="h-3.5 w-3.5 text-[#F49625]" />
              <span>Little Notes & Moments</span>
            </div>
            <h2 className="mt-1 font-serif text-2xl sm:text-3xl lg:text-4xl font-bold text-[#422F0E]">
              Little Notes Studio
            </h2>
            <p className="mt-1 text-xs sm:text-sm text-[#6B5E4E]">
              &ldquo;I saw something today that reminded me of you.&rdquo; Tiny memos, photos, voice notes, and doodles.
            </p>
          </div>

          <div className="flex items-center gap-2.5 self-start sm:self-auto shrink-0">
            <button
              onClick={() => {
                setNoteType(selectedCategory || 'TEXT');
                setShowCreateModal(true);
              }}
              className="flex items-center space-x-2 rounded-full bg-[#422F0E] px-5 py-2.5 text-xs sm:text-sm font-medium text-[#FAF7F2] hover:bg-[#EA5E86] transition-all shadow-sm"
            >
              <Plus className="h-4 w-4" />
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
            className="group relative cursor-pointer overflow-hidden rounded-3xl border border-[#FCC4C0] bg-gradient-to-r from-[#FFF8FA] via-[#FAF7F2] to-[#FFF9EE] p-4 sm:p-6 shadow-sm transition-all duration-300 hover:shadow-md hover:-translate-y-0.5"
          >
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center space-x-3.5 min-w-0">
                <div className="relative shrink-0">
                  <Avatar src={latestNoteForYou.author.avatar_url} name={latestNoteForYou.author.name} size="md" />
                  <span className="absolute -bottom-0.5 -right-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-[#037F71] ring-2 ring-white">
                    <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
                  </span>
                </div>

                <div className="min-w-0">
                  <div className="flex items-center space-x-2">
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-medium border bg-[#FFF5F5] border-[#FCC4C0] text-[#EA5E86]">
                      <Heart className="h-2.5 w-2.5 fill-current" />
                      <span>Note for you</span>
                    </span>
                    <span className="text-[11px] font-mono text-[#A89F91]">
                      {format(new Date(latestNoteForYou.created_at), 'hh:mm a')}
                    </span>
                  </div>

                  <h4 className="mt-1 font-serif text-base sm:text-lg font-bold text-[#422F0E] truncate">
                    {latestNoteForYou.is_me ? `You posted a ${latestNoteForYou.note_type.toLowerCase()}` : `New note for you by ${latestNoteForYou.author.name}`}
                  </h4>

                  <p className="mt-0.5 text-xs text-[#6B5E4E] line-clamp-1">
                    {latestNoteForYou.content || (latestNoteForYou.note_type === 'DRAWING' ? 'Sent a hand-drawn doodle' : latestNoteForYou.note_type === 'VOICE' ? 'Recorded a voice whisper' : 'Attached a sweet photo')}
                  </p>
                </div>
              </div>

              {/* Right CTA */}
              <div className="flex items-center space-x-2 shrink-0 self-end sm:self-center">
                <span className="text-xs font-semibold text-[#EA5E86] group-hover:underline">
                  Open Note
                </span>
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white border border-[#EFE8DC] text-[#422F0E] group-hover:bg-[#EA5E86] group-hover:text-white transition-colors shadow-sm">
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </span>
              </div>
            </div>
          </div>
        )}

        {/* ─────────────────────────────────────────────────────────────
            MAIN VIEW 1: ALL MEMOS 4-CATEGORY CARDS HUB (When selectedCategory is null)
        ───────────────────────────────────────────────────────────── */}
        {selectedCategory === null ? (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-serif text-xl sm:text-2xl font-bold text-[#422F0E]">
                  All Memos
                </h3>
                <p className="text-xs text-[#6B5E4E] mt-0.5">
                  Browse by category to view our collection of words, photos, voice notes, and doodles.
                </p>
              </div>
            </div>

            {/* 4 Primary Category Cards with Card-25 Stacked Hover Animations */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-4 gap-6">
              {CATEGORIES.map((cat) => {
                const Icon = cat.icon;
                const catNotes = notes.filter((n) => n.note_type === cat.id);
                const latestInCat = catNotes[0];
                const count = catNotes.length;

                return (
                  <div
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id)}
                    style={{ backgroundColor: cat.cardBg }}
                    className="group relative block w-full h-[380px] cursor-pointer rounded-3xl border border-[#EFE8DC] p-6 text-[#422F0E] shadow-sm transition-all duration-300 ease-in-out hover:-translate-y-1.5 hover:shadow-xl flex flex-col justify-between overflow-hidden"
                  >
                    {/* Card Header: Category Title & Animated Arrow */}
                    <div className="flex items-center justify-between shrink-0">
                      <div className="flex items-center space-x-2.5">
                        <div className={`flex h-9 w-9 items-center justify-center rounded-2xl border border-black/5 bg-white shadow-sm ${cat.accentColor}`}>
                          <Icon className="h-4.5 w-4.5" />
                        </div>
                        <div>
                          <h4 className="font-serif text-base font-bold text-[#422F0E]">
                            {cat.title}
                          </h4>
                          <span className="text-[11px] font-mono text-[#8C857B]">
                            {count} {count === 1 ? 'memo' : 'memos'}
                          </span>
                        </div>
                      </div>

                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/80 border border-black/5 text-[#A89F91] group-hover:bg-[#422F0E] group-hover:text-white transition-all shadow-sm">
                        <ArrowRight className="h-4 w-4 transition-transform duration-300 ease-in-out group-hover:translate-x-1" />
                      </div>
                    </div>

                    {/* Signature Card-25 Stacked Visual Preview */}
                    <div className="relative my-3 h-40 w-full shrink-0">
                      {latestInCat ? (
                        <>
                          {cat.id === 'DRAWING' && latestInCat.media_url ? (
                            <>
                              <div className="absolute inset-0 rounded-2xl border-2 border-white/60 bg-white/40 shadow-sm transition-all duration-300 ease-in-out group-hover:-translate-x-2 group-hover:rotate-[-4deg]" />
                              <div className="absolute inset-0 rounded-2xl border-2 border-white/80 bg-white/70 shadow-sm transition-all duration-300 ease-in-out group-hover:translate-x-2 group-hover:rotate-[4deg]" />
                              <div className="relative h-full w-full overflow-hidden rounded-2xl border-2 border-white bg-white p-2 shadow-md transition-all duration-300 ease-in-out group-hover:scale-[1.02] flex items-center justify-center">
                                <img
                                  src={latestInCat.media_url}
                                  alt="Latest Doodle"
                                  className="h-full w-full object-contain select-none"
                                />
                              </div>
                            </>
                          ) : cat.id === 'PHOTO' && latestInCat.media_url ? (
                            <>
                              <div className="absolute inset-0 rounded-2xl border-2 border-white/60 bg-[#FFF5F5] shadow-sm transition-all duration-300 ease-in-out group-hover:-translate-x-2 group-hover:rotate-[-4deg]" />
                              <div className="absolute inset-0 rounded-2xl border-2 border-white/80 bg-[#FFF8FA] shadow-sm transition-all duration-300 ease-in-out group-hover:translate-x-2 group-hover:rotate-[4deg]" />
                              <div className="relative h-full w-full overflow-hidden rounded-2xl border-2 border-white bg-white shadow-md transition-all duration-300 ease-in-out group-hover:scale-[1.02]">
                                <img
                                  src={latestInCat.media_url}
                                  alt="Latest Photo"
                                  className="h-full w-full object-cover rounded-xl"
                                />
                              </div>
                            </>
                          ) : cat.id === 'VOICE' && latestInCat.media_url ? (
                            <div className="relative h-full w-full flex items-center justify-center">
                              <div className="w-full rounded-2xl border-2 border-white bg-white p-3.5 shadow-md transition-all duration-300 ease-in-out group-hover:scale-[1.02]">
                                <WaveformPlayer audioUrl={latestInCat.media_url} />
                              </div>
                            </div>
                          ) : (
                            <>
                              <div className="absolute inset-0 rounded-2xl border-2 border-white/60 bg-white/40 shadow-sm transition-all duration-300 ease-in-out group-hover:-translate-x-2 group-hover:rotate-[-4deg]" />
                              <div className="absolute inset-0 rounded-2xl border-2 border-white/80 bg-white/70 shadow-sm transition-all duration-300 ease-in-out group-hover:translate-x-2 group-hover:rotate-[4deg]" />
                              <div className="relative h-full w-full overflow-hidden rounded-2xl border-2 border-white bg-white p-4 shadow-md transition-all duration-300 ease-in-out group-hover:scale-[1.02] flex items-center">
                                <p className="text-xs sm:text-sm text-[#422F0E] whitespace-pre-wrap leading-relaxed line-clamp-4 font-serif">
                                  {latestInCat.content}
                                </p>
                              </div>
                            </>
                          )}
                        </>
                      ) : (
                        /* Empty Placeholder Stack */
                        <div className="relative h-full w-full flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-[#EFE8DC] bg-white/60 p-4 text-center">
                          <Icon className={`h-6 w-6 mb-1.5 opacity-40 ${cat.accentColor}`} />
                          <span className="text-xs font-serif font-medium text-[#6B5E4E]">No {cat.title.toLowerCase()} yet</span>
                          <span className="text-[10px] font-mono text-[#A89F91] mt-0.5">Click to add first note</span>
                        </div>
                      )}
                    </div>

                    {/* Stats & Latest Author Footer */}
                    <div className="pt-2 border-t border-black/5 shrink-0">
                      {latestInCat ? (
                        <div className="flex items-center justify-between text-[11px] font-mono text-[#8C857B]">
                          <div className="flex items-center space-x-1.5 truncate max-w-[130px]">
                            <Avatar src={latestInCat.author.avatar_url} name={latestInCat.author.name} size="xs" />
                            <span className="truncate">{latestInCat.is_me ? 'You' : latestInCat.author.name}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <Clock className="h-3 w-3 text-[#F49625]" />
                            <span>{format(new Date(latestInCat.created_at), 'MMM dd')}</span>
                          </div>
                        </div>
                      ) : (
                        <span className="text-[11px] font-mono text-[#A89F91]">
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
          <div className="space-y-6 animate-in fade-in duration-200">
            {(() => {
              const currentCatConfig = CATEGORIES.find((c) => c.id === selectedCategory) || CATEGORIES[0];
              const CatIcon = currentCatConfig.icon;
              const categoryNotes = notes.filter((n) => n.note_type === selectedCategory);

              return (
                <>
                  {/* Category Top Breadcrumb & Action Bar */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#EFE8DC]">
                    <div className="flex items-center space-x-3">
                      <button
                        onClick={() => setSelectedCategory(null)}
                        className="flex items-center space-x-1.5 rounded-full border border-[#EFE8DC] bg-white px-3.5 py-1.5 text-xs font-mono text-[#6B5E4E] hover:bg-[#F2ECE1] hover:text-[#422F0E] transition-all shadow-sm"
                      >
                        <ArrowLeft className="h-3.5 w-3.5" />
                        <span>All Memos</span>
                      </button>

                      <div className="flex items-center space-x-2">
                        <CatIcon className={`h-5 w-5 ${currentCatConfig.accentColor}`} />
                        <h3 className="font-serif text-xl sm:text-2xl font-bold text-[#422F0E]">
                          {currentCatConfig.title}
                        </h3>
                        <span className="text-xs font-mono font-medium px-2.5 py-0.5 rounded-full border bg-white border-[#EFE8DC] text-[#6B5E4E]">
                          {categoryNotes.length}
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={() => openCreateForCategory(currentCatConfig.id)}
                      className="flex items-center space-x-1.5 rounded-full bg-[#422F0E] px-5 py-2 text-xs font-medium text-white hover:bg-[#EA5E86] transition-all shadow-sm self-start sm:self-auto"
                    >
                      <Plus className="h-4 w-4" />
                      <span>Add {currentCatConfig.title.slice(0, -1)}</span>
                    </button>
                  </div>

                  {/* Category Notes Grid */}
                  {categoryNotes.length === 0 ? (
                    <div className="rounded-3xl border border-[#EFE8DC] bg-white p-12 text-center space-y-3 shadow-sm">
                      <CatIcon className={`h-8 w-8 mx-auto mb-1 ${currentCatConfig.accentColor}`} />
                      <h4 className="font-serif text-xl font-bold text-[#422F0E]">No {currentCatConfig.title.toLowerCase()} yet</h4>
                      <p className="text-xs sm:text-sm text-[#6B5E4E] max-w-sm mx-auto">
                        Be the first to share a {currentCatConfig.title.toLowerCase().slice(0, -1)} with {partner?.name || 'your partner'}!
                      </p>
                      <button
                        onClick={() => openCreateForCategory(currentCatConfig.id)}
                        className="mt-2 inline-flex items-center space-x-2 rounded-full bg-[#422F0E] px-6 py-2.5 text-xs font-medium text-white hover:bg-[#EA5E86] transition-all shadow-sm"
                      >
                        <Plus className="h-4 w-4" />
                        <span>Create First Note</span>
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                      {categoryNotes.map((note) => {
                        const formattedDate = format(new Date(note.created_at), 'MMM dd, hh:mm a');

                        return (
                          <div
                            key={note.id}
                            onClick={() => setPreviewNote(note)}
                            style={{ backgroundColor: note.color || currentCatConfig.cardBg }}
                            className={cn(
                              "group relative block w-full h-[360px] cursor-pointer rounded-3xl border border-[#EFE8DC] p-5 text-[#422F0E] shadow-sm transition-all duration-300 ease-in-out hover:-translate-y-1.5 hover:shadow-xl flex flex-col justify-between overflow-hidden",
                              note.is_pinned ? "ring-2 ring-[#FCC4C0]" : ""
                            )}
                          >
                            <div className="flex flex-col h-full justify-between">
                              {/* Card Header: Author and Arrow */}
                              <div className="mb-3 flex items-center justify-between shrink-0">
                                <div className="flex items-center space-x-2">
                                  <Avatar src={note.author.avatar_url} name={note.author.name} size="xs" />
                                  <h3 className="text-sm font-bold text-[#422F0E] truncate max-w-[120px]">
                                    {note.is_me ? 'You' : note.author.name}
                                  </h3>
                                </div>

                                <div className="flex items-center space-x-1">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleTogglePin(note);
                                    }}
                                    className={`p-1.5 rounded-full transition-colors ${
                                      note.is_pinned
                                        ? 'text-[#EA5E86] bg-white shadow-sm'
                                        : 'text-[#A89F91] hover:text-[#422F0E] opacity-0 group-hover:opacity-100'
                                    }`}
                                    title={note.is_pinned ? 'Unpin note' : 'Pin note to top'}
                                  >
                                    <Pin className="h-3.5 w-3.5 fill-current" />
                                  </button>

                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDeleteNote(note);
                                    }}
                                    className="p-1.5 text-[#A89F91] hover:text-[#EA5E86] rounded-full hover:bg-black/5 opacity-0 group-hover:opacity-100 transition-opacity"
                                    title="Delete note"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>

                                  <ArrowRight className="h-4 w-4 text-[#A89F91] transition-transform duration-300 ease-in-out group-hover:translate-x-1 group-hover:text-[#422F0E]" />
                                </div>
                              </div>

                              {/* Stacked Images / Visual Display with Card-25 Hover Animation */}
                              <div className="relative mb-3 h-36 w-full shrink-0">
                                {note.note_type === 'DRAWING' && note.media_url ? (
                                  <>
                                    <div className="absolute inset-0 rounded-2xl border-2 border-white/60 bg-white/40 shadow-sm transition-all duration-300 ease-in-out group-hover:-translate-x-2 group-hover:rotate-[-3deg]" />
                                    <div className="absolute inset-0 rounded-2xl border-2 border-white/80 bg-white/70 shadow-sm transition-all duration-300 ease-in-out group-hover:translate-x-2 group-hover:rotate-[3deg]" />
                                    <div className="relative h-full w-full overflow-hidden rounded-2xl border-2 border-white bg-white p-2 shadow-md transition-all duration-300 ease-in-out group-hover:scale-[1.02] flex items-center justify-center">
                                      <img
                                        src={note.media_url}
                                        alt="Doodle"
                                        className="h-full w-full object-contain select-none"
                                      />
                                    </div>
                                  </>
                                ) : note.note_type === 'PHOTO' && note.media_url ? (
                                  <>
                                    <div className="absolute inset-0 rounded-2xl border-2 border-white/60 bg-[#FFF5F5] shadow-sm transition-all duration-300 ease-in-out group-hover:-translate-x-2 group-hover:rotate-[-3deg]" />
                                    <div className="absolute inset-0 rounded-2xl border-2 border-white/80 bg-[#FFF8FA] shadow-sm transition-all duration-300 ease-in-out group-hover:translate-x-2 group-hover:rotate-[3deg]" />
                                    <div className="relative h-full w-full overflow-hidden rounded-2xl border-2 border-white bg-white shadow-md transition-all duration-300 ease-in-out group-hover:scale-[1.02]">
                                      <img
                                        src={note.media_url}
                                        alt="Photo"
                                        className="h-full w-full object-cover rounded-xl"
                                      />
                                    </div>
                                  </>
                                ) : note.note_type === 'VOICE' && note.media_url ? (
                                  <div className="relative h-full w-full flex items-center justify-center">
                                    <div className="w-full rounded-2xl border-2 border-white bg-white p-4 shadow-md transition-all duration-300 ease-in-out group-hover:scale-[1.02]">
                                      <WaveformPlayer audioUrl={note.media_url} />
                                    </div>
                                  </div>
                                ) : (
                                  <>
                                    <div className="absolute inset-0 rounded-2xl border-2 border-white/60 bg-white/40 shadow-sm transition-all duration-300 ease-in-out group-hover:-translate-x-2 group-hover:rotate-[-3deg]" />
                                    <div className="absolute inset-0 rounded-2xl border-2 border-white/80 bg-white/70 shadow-sm transition-all duration-300 ease-in-out group-hover:translate-x-2 group-hover:rotate-[3deg]" />
                                    <div className="relative h-full w-full overflow-hidden rounded-2xl border-2 border-white bg-white p-4 shadow-md transition-all duration-300 ease-in-out group-hover:scale-[1.02] flex items-center">
                                      <p className="text-xs sm:text-sm text-[#422F0E] whitespace-pre-wrap leading-relaxed line-clamp-4 font-serif">
                                        {note.content}
                                      </p>
                                    </div>
                                  </>
                                )}
                              </div>

                              {/* Stats Section (card-25 style) */}
                              <div className="mb-2 flex items-center space-x-3 text-xs text-[#8C857B] shrink-0">
                                <div className="flex items-center space-x-1 font-mono">
                                  <Clock className="h-3.5 w-3.5 text-[#F49625]" />
                                  <span>{formattedDate}</span>
                                </div>
                                <div className="flex items-center space-x-1 font-mono">
                                  <CatIcon className={`h-3.5 w-3.5 ${currentCatConfig.accentColor}`} />
                                  <span className="capitalize">{note.note_type.toLowerCase()}</span>
                                </div>
                              </div>

                              {/* Description / Caption */}
                              {note.note_type !== 'TEXT' && note.content ? (
                                <p className="text-xs leading-relaxed text-[#6B5E4E] line-clamp-2 shrink-0">
                                  {note.content}
                                </p>
                              ) : (
                                <div className="shrink-0 h-4" />
                              )}
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
          <div
            style={{ backgroundColor: previewNote.color || '#FFFFFF' }}
            className="w-full max-w-md rounded-3xl border border-[#EFE8DC] p-6 shadow-2xl animate-in zoom-in-95 duration-200 space-y-4 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between pb-3 border-b border-black/5">
              <div className="flex items-center space-x-2">
                <Avatar src={previewNote.author.avatar_url} name={previewNote.author.name} size="sm" />
                <div>
                  <h4 className="text-sm font-bold text-[#422F0E]">
                    {previewNote.is_me ? 'You' : previewNote.author.name}
                  </h4>
                  <p className="text-[10px] font-mono text-[#A89F91]">
                    {format(new Date(previewNote.created_at), 'MMMM dd, yyyy • hh:mm a')}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setPreviewNote(null)}
                className="p-1.5 rounded-full text-[#A89F91] hover:text-[#422F0E] hover:bg-black/5"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Media Zoom */}
            {previewNote.note_type === 'DRAWING' && previewNote.media_url && (
              <div className="rounded-2xl border-2 border-white bg-white p-3 shadow-inner">
                <img
                  src={previewNote.media_url}
                  alt="Doodle"
                  className="w-full max-h-72 object-contain select-none"
                />
              </div>
            )}

            {previewNote.note_type === 'PHOTO' && previewNote.media_url && (
              <div className="rounded-2xl border-2 border-white bg-white overflow-hidden shadow-sm">
                <img
                  src={previewNote.media_url}
                  alt="Photo"
                  className="w-full max-h-80 object-cover"
                />
              </div>
            )}

            {previewNote.note_type === 'VOICE' && previewNote.media_url && (
              <div className="rounded-2xl border-2 border-white bg-white p-4 shadow-sm">
                <WaveformPlayer audioUrl={previewNote.media_url} />
              </div>
            )}

            {/* Full Content */}
            {previewNote.content && (
              <div className="p-3 bg-white/70 rounded-2xl border border-black/5">
                <p className="text-xs sm:text-sm text-[#422F0E] whitespace-pre-wrap leading-relaxed">
                  {previewNote.content}
                </p>
              </div>
            )}

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setPreviewNote(null)}
                className="px-5 py-2 rounded-full bg-[#422F0E] text-white text-xs font-medium hover:bg-[#EA5E86] transition-all shadow-sm"
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
          <div className="w-full max-w-lg rounded-3xl border border-[#EFE8DC] bg-[#FFFFFF] p-6 shadow-xl animate-in zoom-in-95 duration-200 space-y-5">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-[#EFE8DC]">
              <div className="flex items-center space-x-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#FCC4C0] text-[#EA5E86]">
                  <Heart className="h-3.5 w-3.5 fill-current" />
                </span>
                <h3 className="font-serif text-xl font-bold text-[#422F0E]">Leave a Little Note</h3>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-1.5 text-[#A89F91] hover:text-[#422F0E] rounded-full"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Note Type Selector Tabs */}
            <div className="grid grid-cols-4 gap-2 border border-[#EFE8DC] rounded-full p-1 bg-[#FAF7F2]">
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
                    className={`flex items-center justify-center space-x-1.5 py-2 rounded-full text-xs font-medium transition-all ${
                      isActive
                        ? 'bg-[#422F0E] text-white font-semibold shadow-sm'
                        : 'text-[#6B5E4E] hover:text-[#422F0E]'
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Form Content Depending on Note Type */}
            <form onSubmit={handleCreateNote} className="space-y-4">
              {/* Photo Upload Option */}
              {noteType === 'PHOTO' && (
                <div className="space-y-2">
                  <label className="block text-xs font-medium text-[#6B5E4E]">Upload Photo</label>
                  <div className="flex items-center space-x-3">
                    <label className="cursor-pointer flex items-center space-x-2 rounded-full border border-dashed border-[#EA5E86] bg-[#FFF8FA] px-4 py-2 text-xs font-medium text-[#EA5E86] hover:bg-[#FFF5F5]">
                      <Camera className="h-4 w-4" />
                      <span>Choose Image</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handlePhotoUpload}
                        className="hidden"
                      />
                    </label>
                  </div>
                  {mediaUrl && (
                    <div className="rounded-2xl border border-[#EFE8DC] overflow-hidden max-h-48 mt-2">
                      <img src={mediaUrl} alt="Preview" className="w-full h-full object-cover" />
                    </div>
                  )}
                </div>
              )}

              {/* Voice Note Option */}
              {noteType === 'VOICE' && (
                <div className="space-y-2 text-center p-4 rounded-2xl border border-[#EFE8DC] bg-[#FAF7F2]">
                  <span className="text-xs text-[#6B5E4E] block mb-2 font-medium">Record your voice note:</span>
                  <div className="flex justify-center">
                    <VoiceRecorder onSendVoice={(url) => setMediaUrl(url)} />
                  </div>
                  {mediaUrl && (
                    <div className="mt-3 flex justify-center">
                      <WaveformPlayer audioUrl={mediaUrl} />
                    </div>
                  )}
                </div>
              )}

              {/* Drawing Option - Direct Inline Drawing Canvas */}
              {noteType === 'DRAWING' && (
                <div className="space-y-1.5">
                  <label className="block text-xs font-medium text-[#6B5E4E]">Draw Your Doodle</label>
                  <MiniDoodleCanvas onChange={(dataUrl) => setMediaUrl(dataUrl || '')} />
                </div>
              )}

              {/* Note Content / Message */}
              <div>
                <label className="block text-xs font-medium text-[#6B5E4E] mb-1.5">
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
                  className="w-full rounded-2xl border border-[#EFE8DC] bg-[#FAF7F2] p-3.5 text-xs sm:text-sm text-[#422F0E] placeholder-[#A89F91] focus:border-[#EA5E86] focus:outline-none"
                />
              </div>

              {/* Color Theme Selector */}
              <div>
                <label className="block text-[11px] font-medium text-[#6B5E4E] mb-1.5">Note Card Color</label>
                <div className="flex gap-2.5">
                  {NOTE_COLORS.map((col) => (
                    <button
                      key={col.id}
                      type="button"
                      onClick={() => setSelectedColor(col.bg)}
                      style={{ backgroundColor: col.bg, borderColor: col.border }}
                      className={`h-8 w-8 rounded-full border-2 transition-transform ${
                        selectedColor === col.bg ? 'scale-110 ring-2 ring-[#422F0E]' : 'hover:scale-105'
                      }`}
                      title={col.name}
                    />
                  ))}
                </div>
              </div>

              {/* Pin Checkbox */}
              <label className="flex items-center space-x-2 text-xs text-[#6B5E4E] cursor-pointer">
                <input
                  type="checkbox"
                  checked={isPinned}
                  onChange={(e) => setIsPinned(e.target.checked)}
                  className="rounded border-[#EFE8DC] text-[#EA5E86] focus:ring-[#FCC4C0]"
                />
                <span>Pin this note to the top</span>
              </label>

              {/* Submit Buttons */}
              <div className="flex justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-5 py-2 rounded-full border border-[#EFE8DC] text-xs font-medium text-[#6B5E4E]"
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
                  className="px-6 py-2 rounded-full bg-[#422F0E] text-white hover:bg-[#EA5E86] text-xs font-medium shadow-sm disabled:opacity-40 transition-all"
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
