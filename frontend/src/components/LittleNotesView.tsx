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

          {/* 4 File Folder Cards (Interactive Tilting Papers on Hover) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                id: 'TEXT' as CategoryType,
                title: 'Text notes',
                subtitle: 'Notes & More',
                gradient: 'from-[#3B82F6] via-[#1D4ED8] to-[#1E3A8A]',
                icon: FileText,
                iconColor: 'text-[#3B82F6]',
                badgeColor: 'bg-[#3B82F6]/15 text-[#3B82F6] border-[#3B82F6]/30',
              },
              {
                id: 'PHOTO' as CategoryType,
                title: 'Photo memories',
                subtitle: 'Pictures & More',
                gradient: 'from-[#F43F5E] via-[#E11D48] to-[#881337]',
                icon: Camera,
                iconColor: 'text-[#F43F5E]',
                badgeColor: 'bg-[#F43F5E]/15 text-[#F43F5E] border-[#F43F5E]/30',
              },
              {
                id: 'VOICE' as CategoryType,
                title: 'Voice notes',
                subtitle: 'Audio & More',
                gradient: 'from-[#F97316] via-[#EA580C] to-[#9A3412]',
                icon: Mic,
                iconColor: 'text-[#F97316]',
                badgeColor: 'bg-[#F97316]/15 text-[#F97316] border-[#F97316]/30',
              },
              {
                id: 'DRAWING' as CategoryType,
                title: 'Doodle sketches',
                subtitle: 'Drawings & More',
                gradient: 'from-[#10B981] via-[#059669] to-[#064E3B]',
                icon: PenTool,
                iconColor: 'text-[#10B981]',
                badgeColor: 'bg-[#10B981]/15 text-[#10B981] border-[#10B981]/30',
              },
            ].map((folder) => {
              const FolderIcon = folder.icon;
              const catNotes = notes.filter((n) => n.note_type === folder.id);
              const latestInCat = catNotes[0];
              const count = catNotes.length;

              return (
                <div
                  key={folder.id}
                  onClick={() => setSelectedCategory(folder.id)}
                  className="group relative flex flex-col justify-between w-full h-[320px] rounded-[45px] overflow-hidden cursor-pointer border border-black/10 dark:border-white/10 shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 bg-[#1C1C1E] select-none"
                  title={`Open ${folder.title}`}
                >
                  {/* Top Background: Rich Gradient with Tilting Papers */}
                  <div className={`relative h-[155px] w-full bg-gradient-to-b ${folder.gradient} overflow-hidden flex items-end justify-center pb-2`}>
                    {/* Subtle ambient lighting orb */}
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl" />

                    {/* Left Sheet (Tilts Left on Hover) */}
                    <div className="absolute bottom-1 left-[15%] w-[96px] sm:w-[110px] h-[92px] rounded-2xl bg-white/95 text-neutral-800 p-2.5 shadow-md origin-bottom transition-all duration-300 ease-out transform -rotate-[7deg] translate-y-1 group-hover:-rotate-[18deg] group-hover:-translate-y-4 group-hover:-translate-x-3">
                      <div className="w-10 h-1.5 bg-neutral-300 rounded-full mb-2" />
                      <div className="w-full h-1 bg-neutral-200 rounded-full mb-1" />
                      <div className="w-4/5 h-1 bg-neutral-200 rounded-full mb-1" />
                      <div className="w-3/5 h-1 bg-neutral-200 rounded-full" />
                    </div>

                    {/* Center Sheet (Lifts Up & Scales on Hover) */}
                    <div className="relative z-10 w-[108px] sm:w-[124px] h-[105px] rounded-2xl bg-white text-neutral-800 p-2 shadow-xl origin-bottom transition-all duration-300 ease-out transform group-hover:-translate-y-6 group-hover:scale-105 flex flex-col justify-between overflow-hidden">
                      {latestInCat ? (
                        <>
                          {folder.id === 'PHOTO' && latestInCat.media_url ? (
                            <img src={latestInCat.media_url} className="w-full h-full object-cover rounded-xl" alt="" />
                          ) : folder.id === 'DRAWING' && latestInCat.media_url ? (
                            <img src={latestInCat.media_url} className="w-full h-full object-contain rounded-xl" alt="" />
                          ) : folder.id === 'VOICE' ? (
                            <div className="h-full flex flex-col justify-center items-center gap-1.5 p-1">
                              <div className="p-2 rounded-full bg-[#F97316]/10 text-[#F97316]">
                                <Mic className="h-4 w-4" />
                              </div>
                              <span className="text-[9px] font-mono text-neutral-600 font-semibold">Audio Memo</span>
                            </div>
                          ) : (
                            <div className="p-1">
                              <p className="text-[9px] font-medium text-neutral-700 leading-tight line-clamp-4">
                                {latestInCat.content}
                              </p>
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="p-1 space-y-1.5 pt-1">
                          <div className="w-12 h-1.5 bg-neutral-300 rounded-full mb-2" />
                          <div className="w-full h-1 bg-neutral-200 rounded-full" />
                          <div className="w-5/6 h-1 bg-neutral-200 rounded-full" />
                          <div className="w-4/6 h-1 bg-neutral-200 rounded-full" />
                        </div>
                      )}
                    </div>

                    {/* Right Sheet (Tilts Right on Hover) */}
                    <div className="absolute bottom-1 right-[15%] w-[96px] sm:w-[110px] h-[92px] rounded-2xl bg-white/95 text-neutral-800 p-2.5 shadow-md origin-bottom transition-all duration-300 ease-out transform rotate-[7deg] translate-y-1 group-hover:rotate-[18deg] group-hover:-translate-y-4 group-hover:translate-x-3">
                      <div className="w-12 h-1.5 bg-neutral-300 rounded-full mb-2" />
                      <div className="w-full h-1 bg-neutral-200 rounded-full mb-1" />
                      <div className="w-4/5 h-1 bg-neutral-200 rounded-full mb-1" />
                      <div className="w-3/5 h-1 bg-neutral-200 rounded-full" />
                    </div>
                  </div>

                  {/* Folder Front Cutout Flap (Accurate Shape as in Reference Image) */}
                  <div className="relative z-20 -mt-6 w-full flex-1 bg-[#1E1E22] dark:bg-[#18181B] rounded-b-[45px] p-6 pt-3 flex flex-col justify-between text-white border-t border-white/5">
                    {/* Folder Tab Row: Title, Subtitle, and Ellipsis */}
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className="text-base font-semibold text-white tracking-tight leading-snug">
                          {folder.title}
                        </h4>
                        <p className="text-xs text-neutral-400 font-normal mt-0.5">
                          {folder.subtitle}
                        </p>
                      </div>

                      <div className="flex h-6 w-6 items-center justify-center rounded-full text-neutral-400 group-hover:text-white transition-colors">
                        <span className="tracking-widest font-bold text-sm">•••</span>
                      </div>
                    </div>

                    {/* Footer: Document Icon + Total Count */}
                    <div className="flex items-center space-x-2 text-xs font-mono text-neutral-400 pt-3 border-t border-white/5">
                      <FileText className="h-3.5 w-3.5" />
                      <span>{count.toLocaleString()} {count === 1 ? 'File' : 'Files'}</span>
                    </div>
                  </div>
                </div>
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
                <div className="w-full max-w-4xl max-h-[88vh] rounded-[45px] border border-theme bg-theme-card p-6 sm:p-8 shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 space-y-5">
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
          <div className="w-full max-w-md rounded-[45px] border border-theme bg-theme-card p-6 sm:p-7 shadow-2xl animate-in zoom-in-95 duration-150 space-y-4 max-h-[85vh] overflow-y-auto">
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
          <div className="w-full max-w-lg rounded-[45px] border border-theme bg-theme-card p-6 sm:p-8 shadow-2xl animate-in zoom-in-95 duration-150 space-y-4">
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
