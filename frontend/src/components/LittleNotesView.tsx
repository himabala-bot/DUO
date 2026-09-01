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
  ChevronLeft,
  ChevronRight,
  Clock,
  Volume2,
} from 'lucide-react';
import { format } from 'date-fns';
import { RealtimeChannel } from '@supabase/supabase-js';
import { VoiceRecorder } from './VoiceRecorder';
import { WaveformPlayer } from './WaveformPlayer';
import { Avatar } from './Avatar';
import { MiniDoodleCanvas } from './MiniDoodleCanvas';
import { FolderCard } from './FolderCard';
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

  // Read Notes Tracking for Unopened Note Preview
  const [readNoteIds, setReadNoteIds] = useState<Set<string>>(() => {
    if (typeof window !== 'undefined' && profile?.id) {
      try {
        const stored = localStorage.getItem(`read_notes_${profile.id}`);
        return stored ? new Set(JSON.parse(stored)) : new Set();
      } catch {
        return new Set();
      }
    }
    return new Set();
  });
  const [unopenedIndex, setUnopenedIndex] = useState(0);

  const markNoteAsRead = useCallback(
    (noteId: string) => {
      setReadNoteIds((prev) => {
        const updated = new Set(prev);
        updated.add(noteId);
        if (typeof window !== 'undefined' && profile?.id) {
          try {
            localStorage.setItem(`read_notes_${profile.id}`, JSON.stringify(Array.from(updated)));
          } catch {}
        }
        return updated;
      });
    },
    [profile?.id]
  );

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
            SPECIAL "NEW / UNOPENED NOTES" PREVIEW CARD
            When unopened notes exist: shows preview with blurred background.
            When all opened: remains on screen saying "no new notes".
            Occupies ~50% width on desktop (max-w-[640px]), centered horizontally.
        ───────────────────────────────────────────────────────────── */}
        {(() => {
          const unopenedPartnerNotes = notes.filter((n) => !n.is_me && !readNoteIds.has(n.id));

          if (unopenedPartnerNotes.length === 0) {
            return (
              <div className="mx-auto w-full max-w-[640px] pt-1">
                <div className="relative w-full h-[220px] sm:h-[235px] overflow-hidden rounded-[30px] border border-neutral-800 bg-[#18181B] text-white shadow-[0_20px_50px_rgba(0,0,0,0.18)] text-left select-none p-6 sm:p-7 flex flex-col justify-between transition-all">
                  <div className="pointer-events-none absolute inset-0 rounded-[30px] border-[2px] border-white/10 z-20" />

                  {/* Top Row: Status Badge */}
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center rounded-full border border-white/20 bg-white/10 px-3.5 py-1 text-xs font-mono font-medium text-white/90 backdrop-blur-md">
                      No new notes
                    </span>
                  </div>

                  {/* Center Text */}
                  <div>
                    <h3 className="max-w-[85%] font-serif text-2xl sm:text-3xl font-semibold leading-tight text-white tracking-tight">
                      You're all caught up.
                    </h3>
                    <p className="text-xs text-white/75 mt-1">
                      No unopened notes right now. All memories are organized below.
                    </p>
                  </div>

                  {/* Bottom Row: Status */}
                  <div className="flex items-center justify-between text-xs text-white/60 font-mono">
                    <span>{notes.length} total {notes.length === 1 ? 'memo' : 'memos'} in your space</span>
                    <span className="text-[11px] text-white/50">Board is peaceful</span>
                  </div>
                </div>
              </div>
            );
          }

          const safeIndex = unopenedIndex < unopenedPartnerNotes.length ? unopenedIndex : 0;
          const currentUnopened = unopenedPartnerNotes[safeIndex];

          const handleOpenCard = () => {
            markNoteAsRead(currentUnopened.id);
            setPreviewNote(currentUnopened);
          };

          return (
            <div className="mx-auto w-full max-w-[640px] pt-1">
              <div
                onClick={handleOpenCard}
                className="group relative w-full h-[240px] sm:h-[255px] overflow-hidden rounded-[30px] border border-white/20 bg-black/10 shadow-[0_20px_60px_rgba(0,0,0,0.14)] transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-[0_24px_70px_rgba(0,0,0,0.20)] cursor-pointer text-left select-none"
              >
                {/* 1. Blurred Note Preview Background Layer */}
                {currentUnopened.note_type === 'PHOTO' && currentUnopened.media_url ? (
                  <div
                    className="absolute inset-0 scale-110 bg-cover bg-center blur-[20px] transition-all duration-500 group-hover:blur-[12px]"
                    style={{ backgroundImage: `url(${currentUnopened.media_url})` }}
                  />
                ) : currentUnopened.note_type === 'DRAWING' && currentUnopened.media_url ? (
                  <div
                    className="absolute inset-0 scale-110 bg-contain bg-center bg-no-repeat blur-[18px] transition-all duration-500 group-hover:blur-[10px]"
                    style={{
                      backgroundImage: `url(${currentUnopened.media_url})`,
                      backgroundColor: '#1E293B',
                    }}
                  />
                ) : currentUnopened.note_type === 'VOICE' ? (
                  <div className="absolute inset-0 bg-gradient-to-br from-[#3D2214] via-[#24160E] to-[#141416] transition-all duration-500">
                    <div className="absolute inset-0 flex items-center justify-center opacity-35 blur-[12px] group-hover:blur-[6px] transition-all">
                      <div className="flex items-center gap-1.5 h-16">
                        {[40, 75, 55, 90, 60, 85, 45, 95, 70, 50, 80, 65, 35, 75, 60, 85, 40].map((h, i) => (
                          <div key={i} className="w-2.5 bg-[#F97316] rounded-full" style={{ height: `${h}%` }} />
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="absolute inset-0 bg-gradient-to-br from-[#1E293B] via-[#0F172A] to-[#18181B]">
                    <div className="absolute inset-0 p-8 flex flex-col justify-center opacity-25 blur-[12px] group-hover:blur-[6px] transition-all select-none">
                      <p className="text-xl text-white font-serif italic line-clamp-3 leading-relaxed">
                        {currentUnopened.content}
                      </p>
                    </div>
                  </div>
                )}

                {/* 2. Readability Glass Overlays */}
                <div className="absolute inset-0 bg-black/40 backdrop-blur-[16px]" />
                <div className="pointer-events-none absolute inset-0 rounded-[30px] border-[2.5px] border-white/15 z-20" />

                {/* 3. Card Content */}
                <div className="relative z-10 flex h-full flex-col justify-between p-6 sm:p-7 text-left text-white">
                  {/* Top Row: Note Type Badge & Optional Stack Indicator */}
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center rounded-full border border-white/20 bg-white/10 px-3.5 py-1 text-xs font-medium text-white/90 backdrop-blur-md shadow-xs">
                      {currentUnopened.note_type === 'TEXT'
                        ? 'Text note'
                        : currentUnopened.note_type === 'PHOTO'
                        ? 'Photo keepsake'
                        : currentUnopened.note_type === 'VOICE'
                        ? 'Voice note'
                        : 'Doodle art'}
                    </span>

                    {/* Stack Pagination (if multiple unopened notes exist) */}
                    {unopenedPartnerNotes.length > 1 && (
                      <div
                        className="flex items-center space-x-1 rounded-full border border-white/20 bg-black/30 px-2.5 py-1 text-[11px] font-mono text-white/85 backdrop-blur-md"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setUnopenedIndex((prev) =>
                              prev > 0 ? prev - 1 : unopenedPartnerNotes.length - 1
                            );
                          }}
                          className="p-0.5 hover:text-white transition-colors"
                          title="Previous note"
                        >
                          <ChevronLeft className="h-3 w-3" />
                        </button>
                        <span>
                          {safeIndex + 1} of {unopenedPartnerNotes.length}
                        </span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setUnopenedIndex((prev) =>
                              prev < unopenedPartnerNotes.length - 1 ? prev + 1 : 0
                            );
                          }}
                          className="p-0.5 hover:text-white transition-colors"
                          title="Next note"
                        >
                          <ChevronRight className="h-3 w-3" />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Center Main Message */}
                  <div>
                    <h3 className="max-w-[85%] font-serif text-2xl sm:text-3xl font-semibold leading-tight text-white tracking-tight">
                      Something is waiting for you.
                    </h3>
                    {currentUnopened.note_type === 'VOICE' && (
                      <p className="text-xs text-white/70 font-mono mt-1">
                        Voice whisper · Tap to listen
                      </p>
                    )}
                  </div>

                  {/* Bottom Row: Metadata & Open CTA */}
                  <div className="flex items-end justify-between gap-3">
                    <div>
                      <p className="text-xs sm:text-sm font-medium text-white/80">
                        From {currentUnopened.author.name}
                      </p>
                      <p className="text-[11px] text-white/55 font-mono mt-0.5">
                        {format(new Date(currentUnopened.created_at), 'MMMM dd · hh:mm a')}
                      </p>
                    </div>

                    <span className="rounded-full border border-white/25 bg-white/15 px-5 py-2 text-xs sm:text-sm font-medium text-white backdrop-blur-md transition-all duration-200 group-hover:bg-white/25 group-hover:border-white/40 shadow-xs">
                      Open note
                    </span>
                  </div>
                </div>
              </div>
            </div>
          );
        })()}

        {/* ─────────────────────────────────────────────────────────────
            MAIN VIEW: ALL MEMOS 4 FILE-SHAPED FOLDER CARDS
        ───────────────────────────────────────────────────────────── */}
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="font-serif text-lg sm:text-xl font-bold text-theme-primary">
                All Collections
              </h3>
              <p className="text-xs text-theme-secondary mt-0.5">
                Organized folders for your words, voice recordings, photo keepsakes, and doodle art.
              </p>
            </div>
          </div>

          {/* 4 File Folder Cards (Refined Physical Digital Folders) */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
            {[
              {
                id: 'TEXT' as CategoryType,
                title: 'Text notes',
                subtitle: 'Notes & More',
                gradient: 'from-[#8EAFE3] to-[#7195CC]',
              },
              {
                id: 'PHOTO' as CategoryType,
                title: 'Photo memories',
                subtitle: 'Pictures & More',
                gradient: 'from-[#F56B9C] to-[#DE4E80]',
              },
              {
                id: 'VOICE' as CategoryType,
                title: 'Voice notes',
                subtitle: 'Audio & More',
                gradient: 'from-[#C3A982] to-[#A88E67]',
              },
              {
                id: 'DRAWING' as CategoryType,
                title: 'Doodle sketches',
                subtitle: 'Drawings & More',
                gradient: 'from-[#B8E6BE] to-[#9CD4A3]',
              },
            ].map((folder) => {
              const catNotes = notes.filter((n) => n.note_type === folder.id);
              const latestInCat = catNotes[0];
              const count = catNotes.length;

              return (
                <FolderCard
                  key={folder.id}
                  id={folder.id}
                  title={folder.title}
                  subtitle={folder.subtitle}
                  count={count}
                  gradient={folder.gradient}
                  latestNote={latestInCat}
                  onClick={() => setSelectedCategory(folder.id)}
                />
              );
            })}
          </div>
        </div>

        {/* ─────────────────────────────────────────────────────────────
            CATEGORY DETAIL POPUP MODAL (Opens over the page on click)
        ───────────────────────────────────────────────────────────── */}
        {selectedCategory && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 sm:p-6 backdrop-blur-md animate-in fade-in duration-200">
            {(() => {
              const currentCatConfig = CATEGORIES.find((c) => c.id === selectedCategory) || CATEGORIES[0];
              const CatIcon = currentCatConfig.icon;
              const categoryNotes = notes.filter((n) => n.note_type === selectedCategory);
              const count = categoryNotes.length;

              return (
                <div className="w-full max-w-4xl max-h-[88vh] rounded-[35px] border border-theme bg-theme-card p-6 sm:p-8 shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 space-y-5">
                  {/* Modal Header */}
                  <div className="flex items-center justify-between pb-4 border-b border-theme shrink-0">
                    <div className="flex items-center space-x-3">
                      <div className={`flex h-10 w-10 items-center justify-center rounded-2xl border border-theme bg-theme-input ${currentCatConfig.accentColor}`}>
                        <CatIcon className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <h3 className="font-serif text-lg sm:text-xl font-bold text-theme-primary">
                            {currentCatConfig.title}
                          </h3>
                          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-mono font-medium border ${currentCatConfig.badgeBg}`}>
                            {count} {count === 1 ? 'File' : 'Files'}
                          </span>
                        </div>
                        <p className="text-xs text-theme-secondary mt-0.5">
                          {currentCatConfig.subtitle}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <button
                        type="button"
                        onClick={() => openCreateForCategory(selectedCategory)}
                        className="btn-primary text-xs py-2 px-4 shadow-xs"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        <span>Add {currentCatConfig.title.split(' ')[0]}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setSelectedCategory(null)}
                        className="p-2 text-theme-muted hover:text-theme-primary rounded-full hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                        title="Close popup"
                      >
                        <X className="h-5 w-5" />
                      </button>
                    </div>
                  </div>

                  {/* Modal Scrollable Grid Content */}
                  <div className="flex-1 overflow-y-auto pr-1">
                    {categoryNotes.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-16 text-center space-y-3 rounded-[35px] border border-dashed border-theme bg-theme-input/40">
                        <CatIcon className={`h-10 w-10 opacity-30 ${currentCatConfig.accentColor}`} />
                        <div>
                          <h4 className="font-serif text-base font-bold text-theme-primary">
                            No {currentCatConfig.title.toLowerCase()} yet
                          </h4>
                          <p className="text-xs text-theme-secondary mt-1 max-w-sm mx-auto">
                            Share a sweet message, voice whisper, memorable photo, or live doodle to fill this collection!
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => openCreateForCategory(selectedCategory)}
                          className="btn-primary text-xs py-2 px-4"
                        >
                          <Plus className="h-3.5 w-3.5" />
                          <span>Create First Note</span>
                        </button>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {categoryNotes.map((note) => {
                          const formattedDate = format(
                            new Date(note.created_at),
                            'MMM dd, yyyy • hh:mm a'
                          );

                          return (
                            <div
                              key={note.id}
                              onClick={() => setPreviewNote(note)}
                              className="group relative flex flex-col justify-between rounded-[32px] border border-theme bg-theme-card p-4 shadow-xs hover:shadow-md transition-all hover:border-[#125CB9] cursor-pointer"
                            >
                              {/* Top Bar: Author, Pin & Actions */}
                              <div className="flex items-center justify-between pb-2 border-b border-theme-subtle">
                                <div className="flex items-center space-x-2">
                                  <Avatar
                                    src={note.author.avatar_url}
                                    name={note.author.name}
                                    size="xs"
                                  />
                                  <span className="text-xs font-semibold text-theme-primary">
                                    {note.is_me ? 'You' : note.author.name}
                                  </span>
                                </div>

                                <div className="flex items-center space-x-1" onClick={(e) => e.stopPropagation()}>
                                  <button
                                    type="button"
                                    onClick={() => handleTogglePin(note)}
                                    className={`p-1.5 rounded-full transition-colors ${
                                      note.is_pinned
                                        ? 'text-[#125CB9] bg-[#125CB9]/10'
                                        : 'text-theme-muted hover:text-theme-primary'
                                    }`}
                                    title={note.is_pinned ? 'Unpin note' : 'Pin note'}
                                  >
                                    <Pin className="h-3.5 w-3.5" />
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => handleDeleteNote(note)}
                                    className="p-1.5 text-theme-muted hover:text-[#F43F5E] rounded-full transition-colors"
                                    title="Delete note"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                              </div>

                              {/* Media / Note Content */}
                              <div className="py-3">
                                {note.note_type === 'PHOTO' && note.media_url ? (
                                  <div className="relative h-44 w-full overflow-hidden rounded-[20px] border border-theme bg-theme-input">
                                    <img
                                      src={note.media_url}
                                      alt="Photo"
                                      className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
                                    />
                                  </div>
                                ) : note.note_type === 'DRAWING' && note.media_url ? (
                                  <div className="relative h-44 w-full overflow-hidden rounded-[20px] border border-theme bg-theme-input p-2 flex items-center justify-center">
                                    <img
                                      src={note.media_url}
                                      alt="Doodle"
                                      className="h-full w-full object-contain select-none"
                                    />
                                  </div>
                                ) : note.note_type === 'VOICE' && note.media_url ? (
                                  <div className="w-full rounded-[20px] border border-theme bg-theme-input p-3" onClick={(e) => e.stopPropagation()}>
                                    <WaveformPlayer audioUrl={note.media_url} />
                                  </div>
                                ) : (
                                  <div className="rounded-[20px] border border-theme bg-theme-input p-3 min-h-[90px] flex items-center">
                                    <p className="text-xs text-theme-primary whitespace-pre-wrap leading-relaxed line-clamp-4">
                                      {note.content}
                                    </p>
                                  </div>
                                )}

                                {note.content && (note.note_type === 'PHOTO' || note.note_type === 'DRAWING') && (
                                  <p className="text-xs text-theme-secondary mt-2 line-clamp-2 px-1">
                                    {note.content}
                                  </p>
                                )}
                              </div>

                              {/* Footer: Timestamp */}
                              <div className="flex items-center justify-between text-[10px] font-mono text-theme-muted pt-2 border-t border-theme-subtle">
                                <div className="flex items-center space-x-1">
                                  <Clock className="h-2.5 w-2.5 text-[#FB923C]" />
                                  <span>{formattedDate}</span>
                                </div>
                                {note.is_pinned && (
                                  <span className="text-[#125CB9] font-medium">Pinned</span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}
          </div>
        )}
      </div>

      {/* ─────────────────────────────────────────────────────────────
          FULL NOTE DETAIL & ZOOM PREVIEW MODAL
      ───────────────────────────────────────────────────────────── */}
      {previewNote && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 sm:p-6 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-[35px] border border-theme bg-theme-card p-6 sm:p-7 shadow-2xl animate-in zoom-in-95 duration-150 space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-theme">
              <div className="flex items-center space-x-2.5">
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
                className="p-1.5 rounded-full text-theme-muted hover:text-theme-primary hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Media Zoom */}
            {previewNote.note_type === 'DRAWING' && previewNote.media_url && (
              <div className="rounded-[28px] border border-theme bg-theme-input p-3">
                <img
                  src={previewNote.media_url}
                  alt="Doodle"
                  className="w-full max-h-72 object-contain select-none"
                />
              </div>
            )}

            {previewNote.note_type === 'PHOTO' && previewNote.media_url && (
              <div className="rounded-[28px] border border-theme bg-theme-input overflow-hidden">
                <img
                  src={previewNote.media_url}
                  alt="Photo"
                  className="w-full max-h-80 object-cover"
                />
              </div>
            )}

            {previewNote.note_type === 'VOICE' && previewNote.media_url && (
              <div className="rounded-[28px] border border-theme bg-theme-input p-3.5">
                <WaveformPlayer audioUrl={previewNote.media_url} />
              </div>
            )}

            {previewNote.content && (
              <div className="p-3.5 bg-theme-input rounded-[28px] border border-theme">
                <p className="text-xs sm:text-sm text-theme-primary whitespace-pre-wrap leading-relaxed">
                  {previewNote.content}
                </p>
              </div>
            )}

            <div className="flex justify-end pt-1">
              <button
                onClick={() => setPreviewNote(null)}
                className="px-5 py-2 rounded-full bg-[#125CB9] text-white text-xs font-medium hover:bg-[#0E4B99] transition-colors shadow-xs"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 sm:p-6 backdrop-blur-md animate-in fade-in duration-200 overflow-y-auto">
          <div className="w-full max-w-lg rounded-[35px] border border-theme bg-theme-card p-6 sm:p-8 shadow-2xl animate-in zoom-in-95 duration-150 space-y-4">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-theme">
              <div className="flex items-center space-x-2.5">
                <span className="flex h-8 w-8 items-center justify-center rounded-2xl bg-[#125CB9]/10 text-[#125CB9]">
                  <Heart className="h-4 w-4 fill-current" />
                </span>
                <h3 className="font-serif text-base font-bold text-theme-primary">Leave a Little Note</h3>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-1.5 text-theme-muted hover:text-theme-primary rounded-full hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
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
