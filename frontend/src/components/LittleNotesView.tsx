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
  Image as ImageIcon,
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
  Play,
  Volume2,
} from 'lucide-react';
import { format } from 'date-fns';
import { RealtimeChannel } from '@supabase/supabase-js';
import { VoiceRecorder } from './VoiceRecorder';
import { WaveformPlayer } from './WaveformPlayer';
import { Avatar } from './Avatar';
import { MiniDoodleCanvas } from './MiniDoodleCanvas';

const NOTE_COLORS = [
  { id: 'cream', bg: '#FAF7F2', border: '#EFE8DC', name: 'Cozy Paper' },
  { id: 'pink', bg: '#FFF8FA', border: '#FCC4C0', name: 'Blush Rose' },
  { id: 'peach', bg: '#FFF9EE', border: '#FFD094', name: 'Warm Butter' },
  { id: 'teal', bg: '#F2F9F9', border: '#AECFD0', name: 'Sage Sky' },
  { id: 'matcha', bg: '#F5FBEF', border: '#DDF2B8', name: 'Matcha Lime' },
];

export const LittleNotesView: React.FC = () => {
  const { profile, partner } = useAuth();
  const { toast, confirm } = useToast();
  const [notes, setNotes] = useState<LittleNote[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTabFilter, setActiveTabFilter] = useState<'ALL' | 'TEXT' | 'PHOTO' | 'VOICE' | 'DRAWING'>('ALL');

  // Create Note Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [noteType, setNoteType] = useState<'TEXT' | 'PHOTO' | 'VOICE' | 'DRAWING'>('TEXT');
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

  // Subsets by category
  const doodleNotes = notes.filter((n) => n.note_type === 'DRAWING');
  const textNotes = notes.filter((n) => n.note_type === 'TEXT');
  const photoNotes = notes.filter((n) => n.note_type === 'PHOTO');
  const voiceNotes = notes.filter((n) => n.note_type === 'VOICE');

  const filteredNotes = notes.filter((n) => {
    if (activeTabFilter === 'ALL') return true;
    return n.note_type === activeTabFilter;
  });

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
              &ldquo;I saw something today that reminded me of you.&rdquo; Leave tiny memos, photos, voice notes, and doodles.
            </p>
          </div>

          <div className="flex items-center gap-2.5 self-start sm:self-auto shrink-0">
            <button
              onClick={() => {
                setNoteType('TEXT');
                setShowCreateModal(true);
              }}
              className="flex items-center space-x-2 rounded-full bg-[#422F0E] px-5 py-2.5 text-xs sm:text-sm font-medium text-[#FAF7F2] hover:bg-[#EA5E86] transition-all shadow-sm"
            >
              <Plus className="h-4 w-4" />
              <span>New Note</span>
            </button>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
          {[
            { id: 'ALL', label: 'All Memos', icon: Sparkles, count: notes.length },
            { id: 'DRAWING', label: 'Doodles', icon: PenTool, count: doodleNotes.length },
            { id: 'TEXT', label: 'Text Notes', icon: FileText, count: textNotes.length },
            { id: 'PHOTO', label: 'Photos', icon: Camera, count: photoNotes.length },
            { id: 'VOICE', label: 'Voice Notes', icon: Mic, count: voiceNotes.length },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTabFilter === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTabFilter(tab.id as any)}
                className={`flex items-center space-x-2 px-4 py-2 rounded-full border text-xs font-medium transition-all whitespace-nowrap ${
                  isActive
                    ? 'border-[#422F0E] bg-[#422F0E] text-[#FAF7F2] font-semibold shadow-sm'
                    : 'border-[#EFE8DC] bg-[#FFFFFF] text-[#6B5E4E] hover:bg-[#FAF7F2]'
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                <span>{tab.label}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                    isActive ? 'bg-white/20 text-white' : 'bg-[#FAF7F2] text-[#A89F91]'
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Empty State */}
        {notes.length === 0 ? (
          <div className="rounded-3xl border border-[#EFE8DC] bg-[#FFFFFF] p-10 sm:p-14 text-center space-y-3 shadow-sm">
            <Heart className="h-8 w-8 text-[#FCC4C0] mx-auto mb-1 animate-bounce" />
            <h4 className="font-serif text-xl font-bold text-[#422F0E]">No notes pinned yet</h4>
            <p className="text-xs sm:text-sm text-[#6B5E4E] max-w-md mx-auto leading-relaxed">
              Post a note, a photo of your lunch, a quick voice whisper, or a hand-drawn doodle to brighten {partner?.name}&apos;s day.
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="mt-3 inline-flex items-center space-x-2 rounded-full bg-[#422F0E] px-6 py-2.5 text-xs font-medium text-white hover:bg-[#EA5E86] transition-all shadow-sm"
            >
              <Plus className="h-4 w-4" />
              <span>Write First Note</span>
            </button>
          </div>
        ) : activeTabFilter === 'ALL' ? (
          /* ─────────────────────────────────────────────────────────────
             ASYMMETRIC BENTO GRID LAYOUT FOR "ALL MEMOS"
             [ Left: Doodles Stack (50%) ] [ Mid: Text + Photos (30%) ] [ Right: Audios (20%) ]
          ───────────────────────────────────────────────────────────── */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-5 items-stretch min-h-[530px]">
            {/* 1. LEFT LARGE BOX: DOODLES STACKED CARDS (lg:col-span-6) */}
            <div
              onClick={() => setActiveTabFilter('DRAWING')}
              className="group relative cursor-pointer lg:col-span-6 rounded-3xl border border-[#EFE8DC] bg-[#FFF8FA] p-6 sm:p-7 shadow-[0_4px_20px_rgba(234,94,134,0.05)] hover:border-[#EA5E86] hover:shadow-[0_12px_36px_rgba(234,94,134,0.12)] transition-all duration-300 flex flex-col justify-between overflow-hidden"
            >
              {/* Header */}
              <div className="flex items-center justify-between z-10">
                <div className="flex items-center space-x-2.5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-[#EA5E86] text-white shadow-sm">
                    <PenTool className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="font-serif text-lg sm:text-xl font-bold text-[#422F0E]">Doodles Deck</h3>
                    <p className="text-[11px] font-mono text-[#A89F91]">Hand-drawn love notes & sketches</p>
                  </div>
                </div>

                <div className="flex items-center space-x-1.5 rounded-full border border-[#FCC4C0] bg-white px-3 py-1 text-xs font-mono font-medium text-[#EA5E86] shadow-sm">
                  <span>{doodleNotes.length}</span>
                  <ArrowRight className="h-3 w-3 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>

              {/* Center: 3D Stacked Cards Deck */}
              <div className="relative my-6 flex-1 min-h-[260px] flex items-center justify-center">
                {doodleNotes.length === 0 ? (
                  <div className="text-center p-8 rounded-2xl border-2 border-dashed border-[#FCC4C0] bg-white/70 space-y-2">
                    <PenTool className="h-6 w-6 text-[#EA5E86] mx-auto animate-bounce" />
                    <p className="text-xs font-serif text-[#422F0E]">No doodles in the deck yet</p>
                    <p className="text-[11px] text-[#A89F91]">Click to draw your first sketch</p>
                  </div>
                ) : (
                  <div className="relative w-full max-w-[280px] sm:max-w-[320px] aspect-[4/3]">
                    {/* Back Card 3 (if exists) */}
                    {doodleNotes[2] && (
                      <div className="absolute inset-0 rounded-3xl border border-[#EFE8DC] bg-white p-3 shadow-md transform -rotate-6 translate-y-3 scale-90 opacity-70 group-hover:-rotate-8 group-hover:-translate-x-3 transition-all duration-300 overflow-hidden">
                        <img
                          src={doodleNotes[2].media_url}
                          alt="Doodle 3"
                          className="w-full h-full object-contain pointer-events-none"
                        />
                      </div>
                    )}

                    {/* Middle Card 2 (if exists) */}
                    {doodleNotes[1] && (
                      <div className="absolute inset-0 rounded-3xl border border-[#EFE8DC] bg-white p-3 shadow-lg transform rotate-4 translate-y-1.5 scale-95 opacity-90 group-hover:rotate-6 group-hover:translate-x-2 transition-all duration-300 overflow-hidden">
                        <img
                          src={doodleNotes[1].media_url}
                          alt="Doodle 2"
                          className="w-full h-full object-contain pointer-events-none"
                        />
                      </div>
                    )}

                    {/* Front Card 1 (Top / Latest Doodle) */}
                    {doodleNotes[0] && (
                      <div className="absolute inset-0 rounded-3xl border border-[#FCC4C0] bg-white p-3.5 shadow-xl transform rotate-0 scale-100 group-hover:scale-105 group-hover:-translate-y-2 transition-all duration-300 overflow-hidden flex flex-col justify-between">
                        <div className="flex items-center justify-between pb-1 text-[10px] font-mono text-[#A89F91]">
                          <span className="flex items-center gap-1 font-semibold text-[#422F0E]">
                            <Avatar src={doodleNotes[0].author.avatar_url} name={doodleNotes[0].author.name} size="xs" />
                            {doodleNotes[0].is_me ? 'You' : doodleNotes[0].author.name}
                          </span>
                          <span>{format(new Date(doodleNotes[0].created_at), 'MMM dd')}</span>
                        </div>

                        <div className="flex-1 min-h-0 flex items-center justify-center p-1">
                          <img
                            src={doodleNotes[0].media_url}
                            alt="Latest Doodle"
                            className="w-full h-full object-contain select-none pointer-events-none"
                          />
                        </div>

                        {doodleNotes[0].content && (
                          <p className="text-[11px] text-[#6B5E4E] truncate pt-1 border-t border-[#F5EFE6] text-center italic font-serif">
                            &ldquo;{doodleNotes[0].content}&rdquo;
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Bottom Footer Cue */}
              <div className="flex items-center justify-between pt-3 border-t border-[#FCC4C0]/40 text-xs font-mono text-[#6B5E4E] z-10">
                <span>Stacked doodle gallery</span>
                <span className="font-semibold text-[#EA5E86] group-hover:underline flex items-center gap-1">
                  View all doodles <ArrowRight className="h-3 w-3" />
                </span>
              </div>
            </div>

            {/* 2. MIDDLE COLUMN: TEXT NOTES CARD (TOP) + PHOTOS CARD (BOTTOM) (lg:col-span-3.5) */}
            <div className="lg:col-span-3.5 flex flex-col gap-5">
              {/* TOP: TEXT NOTES CARD */}
              <div
                onClick={() => setActiveTabFilter('TEXT')}
                className="group relative cursor-pointer flex-1 min-h-[250px] rounded-3xl border border-[#EFE8DC] bg-[#FFF9EE] p-5 sm:p-6 shadow-[0_4px_16px_rgba(244,150,37,0.04)] hover:border-[#F49625] hover:shadow-[0_10px_28px_rgba(244,150,37,0.12)] transition-all duration-300 flex flex-col justify-between overflow-hidden"
              >
                {/* Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-2xl bg-[#F49625] text-white shadow-sm">
                      <FileText className="h-4 w-4" />
                    </div>
                    <h3 className="font-serif text-base sm:text-lg font-bold text-[#422F0E]">Text Notes</h3>
                  </div>
                  <span className="rounded-full border border-[#FFD094] bg-white px-2.5 py-0.5 text-[11px] font-mono font-medium text-[#F49625]">
                    {textNotes.length}
                  </span>
                </div>

                {/* Excerpt Body */}
                <div className="my-3 flex-1 flex flex-col justify-center">
                  {textNotes.length === 0 ? (
                    <p className="text-xs text-[#A89F91] italic text-center">No text notes yet</p>
                  ) : (
                    <div className="rounded-2xl border border-[#EFE8DC] bg-white p-3.5 shadow-sm space-y-1.5 group-hover:scale-[1.02] transition-transform">
                      <div className="flex items-center justify-between text-[10px] font-mono text-[#A89F91]">
                        <span className="font-semibold text-[#422F0E]">
                          {textNotes[0].is_me ? 'You' : textNotes[0].author.name}
                        </span>
                        <span>{format(new Date(textNotes[0].created_at), 'MMM dd')}</span>
                      </div>
                      <p className="text-xs sm:text-sm text-[#422F0E] line-clamp-3 leading-relaxed font-serif italic">
                        &ldquo;{textNotes[0].content}&rdquo;
                      </p>
                    </div>
                  )}
                </div>

                {/* Bottom */}
                <div className="flex items-center justify-between pt-2 border-t border-[#FFD094]/40 text-[11px] font-mono text-[#6B5E4E]">
                  <span>Sweet memos</span>
                  <span className="text-[#F49625] font-semibold flex items-center gap-1 group-hover:underline">
                    Read all <ArrowRight className="h-3 w-3" />
                  </span>
                </div>
              </div>

              {/* BOTTOM: PHOTOS CARD */}
              <div
                onClick={() => setActiveTabFilter('PHOTO')}
                className="group relative cursor-pointer flex-1 min-h-[250px] rounded-3xl border border-[#EFE8DC] bg-[#FAF7F2] p-5 sm:p-6 shadow-[0_4px_16px_rgba(66,47,14,0.03)] hover:border-[#422F0E] hover:shadow-[0_10px_28px_rgba(66,47,14,0.08)] transition-all duration-300 flex flex-col justify-between overflow-hidden"
              >
                {/* Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-2xl bg-[#422F0E] text-white shadow-sm">
                      <Camera className="h-4 w-4" />
                    </div>
                    <h3 className="font-serif text-base sm:text-lg font-bold text-[#422F0E]">Photos</h3>
                  </div>
                  <span className="rounded-full border border-[#EFE8DC] bg-white px-2.5 py-0.5 text-[11px] font-mono font-medium text-[#422F0E]">
                    {photoNotes.length}
                  </span>
                </div>

                {/* Photo Polaroid Preview Body */}
                <div className="my-3 flex-1 flex items-center justify-center">
                  {photoNotes.length === 0 ? (
                    <p className="text-xs text-[#A89F91] italic text-center">No photos uploaded yet</p>
                  ) : (
                    <div className="relative w-full h-28 rounded-2xl overflow-hidden border-2 border-white bg-white shadow-md group-hover:scale-[1.03] transition-transform">
                      <img
                        src={photoNotes[0].media_url}
                        alt="Latest Photo"
                        className="w-full h-full object-cover"
                      />
                      {photoNotes[0].content && (
                        <div className="absolute inset-x-0 bottom-0 bg-black/50 backdrop-blur-[2px] p-1.5 text-center text-white text-[10px] truncate">
                          {photoNotes[0].content}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Bottom */}
                <div className="flex items-center justify-between pt-2 border-t border-[#EFE8DC] text-[11px] font-mono text-[#6B5E4E]">
                  <span>Polaroids</span>
                  <span className="text-[#422F0E] font-semibold flex items-center gap-1 group-hover:underline">
                    View gallery <ArrowRight className="h-3 w-3" />
                  </span>
                </div>
              </div>
            </div>

            {/* 3. RIGHT VERTICAL PILLAR: AUDIOS CARD (lg:col-span-2.5) */}
            <div
              onClick={() => setActiveTabFilter('VOICE')}
              className="group relative cursor-pointer lg:col-span-2.5 rounded-3xl border border-[#EFE8DC] bg-[#F5FBEF] p-6 shadow-[0_4px_20px_rgba(3,127,113,0.04)] hover:border-[#037F71] hover:shadow-[0_12px_36px_rgba(3,127,113,0.12)] transition-all duration-300 flex flex-col justify-between overflow-hidden"
            >
              {/* Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-[#037F71] text-white shadow-sm">
                    <Mic className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="font-serif text-base sm:text-lg font-bold text-[#422F0E]">Audios</h3>
                    <p className="text-[10px] font-mono text-[#A89F91]">Voice whispers</p>
                  </div>
                </div>
                <span className="rounded-full border border-[#DDF2B8] bg-white px-2.5 py-0.5 text-[11px] font-mono font-medium text-[#037F71]">
                  {voiceNotes.length}
                </span>
              </div>

              {/* Body: Animated Audio Wave Visualizer & Latest Player */}
              <div className="my-6 flex-1 flex flex-col justify-center space-y-4">
                {voiceNotes.length === 0 ? (
                  <div className="text-center p-4 space-y-2">
                    <Volume2 className="h-6 w-6 text-[#037F71] mx-auto opacity-50" />
                    <p className="text-xs text-[#A89F91] italic">No voice notes recorded yet</p>
                  </div>
                ) : (
                  <>
                    {/* Equalizer animation bar visualizer */}
                    <div className="flex items-center justify-center gap-1 py-2">
                      {[30, 60, 40, 85, 55, 90, 45, 75, 35, 65, 95, 50, 80, 40].map((h, idx) => (
                        <span
                          key={idx}
                          style={{ height: `${h * 0.35}px` }}
                          className="w-1 rounded-full bg-[#037F71] opacity-70 group-hover:opacity-100 group-hover:scale-y-110 transition-transform"
                        />
                      ))}
                    </div>

                    {/* Latest Voice Player */}
                    <div className="rounded-2xl border border-[#EFE8DC] bg-white p-3.5 shadow-sm space-y-2">
                      <div className="flex items-center justify-between text-[10px] font-mono text-[#A89F91]">
                        <span className="font-semibold text-[#037F71]">
                          {voiceNotes[0].is_me ? 'You' : voiceNotes[0].author.name}
                        </span>
                        <span>{format(new Date(voiceNotes[0].created_at), 'MMM dd')}</span>
                      </div>
                      <div className="scale-95 origin-center">
                        <WaveformPlayer audioUrl={voiceNotes[0].media_url} />
                      </div>
                      {voiceNotes[0].content && (
                        <p className="text-[10px] text-[#6B5E4E] line-clamp-1 italic text-center">
                          {voiceNotes[0].content}
                        </p>
                      )}
                    </div>
                  </>
                )}
              </div>

              {/* Bottom */}
              <div className="flex items-center justify-between pt-3 border-t border-[#DDF2B8]/50 text-xs font-mono text-[#6B5E4E]">
                <span>Recordings</span>
                <span className="text-[#037F71] font-semibold flex items-center gap-1 group-hover:underline">
                  Listen all <ArrowRight className="h-3 w-3" />
                </span>
              </div>
            </div>
          </div>
        ) : (
          /* ─────────────────────────────────────────────────────────────
             FILTERED CATEGORY VIEW: UNIFORM CARD GRID (WHEN A CARD IS SELECTED)
          ───────────────────────────────────────────────────────────── */
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-[#EFE8DC]">
              <button
                onClick={() => setActiveTabFilter('ALL')}
                className="inline-flex items-center space-x-1.5 text-xs font-mono font-medium text-[#6B5E4E] hover:text-[#422F0E] transition-colors"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                <span>Back to All Memos Deck</span>
              </button>

              <span className="text-xs font-mono text-[#A89F91]">
                Showing {filteredNotes.length} {activeTabFilter.toLowerCase()} notes
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {filteredNotes.map((note) => {
                const formattedDate = format(new Date(note.created_at), 'MMM dd, hh:mm a');

                return (
                  <div
                    key={note.id}
                    style={{ backgroundColor: note.color || '#FAF7F2' }}
                    className={`group relative h-[350px] rounded-3xl border border-[#EFE8DC] p-5 shadow-[0_2px_12px_rgba(66,47,14,0.03)] hover:shadow-md transition-all flex flex-col justify-between overflow-hidden ${
                      note.is_pinned ? 'ring-2 ring-[#FCC4C0]' : ''
                    }`}
                  >
                    {/* Top Bar: Author, Pin & Actions */}
                    <div className="flex items-center justify-between shrink-0">
                      <div className="flex items-center space-x-2">
                        <Avatar src={note.author.avatar_url} name={note.author.name} size="xs" />
                        <span className="text-xs font-semibold text-[#422F0E] truncate max-w-[120px]">
                          {note.is_me ? 'You' : note.author.name}
                        </span>
                      </div>

                      <div className="flex items-center space-x-1">
                        {/* Pin Button */}
                        <button
                          onClick={() => handleTogglePin(note)}
                          className={`p-1.5 rounded-full transition-colors ${
                            note.is_pinned
                              ? 'text-[#EA5E86] bg-white shadow-sm'
                              : 'text-[#A89F91] hover:text-[#422F0E] opacity-0 group-hover:opacity-100'
                          }`}
                          title={note.is_pinned ? 'Unpin note' : 'Pin note to top'}
                        >
                          <Pin className="h-3.5 w-3.5 fill-current" />
                        </button>

                        {/* Delete Button */}
                        <button
                          onClick={() => handleDeleteNote(note)}
                          className="p-1.5 text-[#A89F91] hover:text-[#EA5E86] rounded-full hover:bg-black/5 opacity-0 group-hover:opacity-100 transition-opacity"
                          title="Delete note"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Body Content - Uniform Flex Area */}
                    <div className="flex-1 min-h-0 py-2.5 flex flex-col justify-center overflow-hidden space-y-2">
                      {/* Doodle / Drawing Note */}
                      {note.note_type === 'DRAWING' && note.media_url && (
                        <div className="flex-1 min-h-0 w-full rounded-2xl overflow-hidden border border-[#EFE8DC] bg-white p-2.5 flex items-center justify-center shadow-inner">
                          <img
                            src={note.media_url}
                            alt="Doodle Note"
                            className="w-full h-full object-contain select-none"
                          />
                        </div>
                      )}

                      {/* Photo Note */}
                      {note.note_type === 'PHOTO' && note.media_url && (
                        <div className="flex-1 min-h-0 w-full rounded-2xl overflow-hidden border border-[#EFE8DC] bg-white shadow-sm flex items-center justify-center">
                          <img
                            src={note.media_url}
                            alt="Photo Note"
                            className="w-full h-full object-cover rounded-xl"
                          />
                        </div>
                      )}

                      {/* Voice Note */}
                      {note.note_type === 'VOICE' && note.media_url && (
                        <div className="flex-1 min-h-0 w-full rounded-2xl border border-[#EFE8DC] bg-white p-3.5 flex flex-col justify-center shadow-sm">
                          <WaveformPlayer audioUrl={note.media_url} />
                        </div>
                      )}

                      {/* Text Note */}
                      {note.note_type === 'TEXT' && note.content && (
                        <div className="flex-1 min-h-0 w-full flex flex-col justify-center overflow-y-auto pr-1">
                          <p className="text-xs sm:text-sm text-[#422F0E] whitespace-pre-wrap leading-relaxed">
                            {note.content}
                          </p>
                        </div>
                      )}

                      {/* Optional Caption for Photo/Doodle/Voice */}
                      {note.content && note.note_type !== 'TEXT' && (
                        <p className="text-[11px] text-[#6B5E4E] line-clamp-2 leading-snug shrink-0 px-0.5">
                          {note.content}
                        </p>
                      )}
                    </div>

                    {/* Bottom: Timestamp & Category */}
                    <div className="pt-2 border-t border-black/5 flex items-center justify-between text-[10px] font-mono text-[#A89F91] shrink-0">
                      <span>{formattedDate}</span>
                      <span className="capitalize">{note.note_type.toLowerCase()}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Create Note Modal Dialog */}
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
                className="rounded-full p-1.5 text-[#A89F91] hover:text-[#422F0E]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Note Type Picker */}
            <div className="grid grid-cols-4 gap-2">
              {[
                { id: 'TEXT', label: 'Text', icon: FileText },
                { id: 'PHOTO', label: 'Photo', icon: Camera },
                { id: 'VOICE', label: 'Voice', icon: Mic },
                { id: 'DRAWING', label: 'Doodle', icon: PenTool },
              ].map((t) => {
                const Icon = t.icon;
                const isSelected = noteType === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => {
                      setNoteType(t.id as any);
                      setMediaUrl('');
                    }}
                    className={`flex flex-col items-center justify-center py-2.5 px-2 rounded-2xl border text-xs font-medium transition-all ${
                      isSelected
                        ? 'border-[#422F0E] bg-[#422F0E] text-[#FAF7F2] shadow-sm font-semibold'
                        : 'border-[#EFE8DC] bg-[#FAF7F2] text-[#6B5E4E] hover:bg-[#F2ECE1]'
                    }`}
                  >
                    <Icon className="h-4 w-4 mb-1" />
                    <span>{t.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Form Inputs based on Note Type */}
            <form onSubmit={handleCreateNote} className="space-y-4">
              {/* Photo Upload Option */}
              {noteType === 'PHOTO' && (
                <div className="space-y-2">
                  <label className="block text-xs font-medium text-[#6B5E4E]">Upload Photo</label>
                  <div className="flex items-center gap-2">
                    <label className="cursor-pointer flex-1 flex items-center justify-center space-x-2 rounded-full border border-[#EFE8DC] bg-[#FAF7F2] px-4 py-2.5 text-xs text-[#6B5E4E] hover:bg-[#F2ECE1] transition-all">
                      <Camera className="h-4 w-4 text-[#EA5E86]" />
                      <span>{mediaUrl ? 'Change Photo' : 'Select Photo File'}</span>
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
