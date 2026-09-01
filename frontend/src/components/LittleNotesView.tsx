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
  Clock,
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

export const LittleNotesView: React.FC = () => {
  const { profile, partner } = useAuth();
  const { toast, confirm } = useToast();
  const [notes, setNotes] = useState<LittleNote[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTabFilter, setActiveTabFilter] = useState<'ALL' | 'TEXT' | 'PHOTO' | 'VOICE' | 'DRAWING'>('ALL');
  const [previewNote, setPreviewNote] = useState<LittleNote | null>(null);

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
            { id: 'ALL', label: 'All Memos', icon: Sparkles },
            { id: 'TEXT', label: 'Text Notes', icon: FileText },
            { id: 'PHOTO', label: 'Photos', icon: Camera },
            { id: 'VOICE', label: 'Voice Notes', icon: Mic },
            { id: 'DRAWING', label: 'Doodles', icon: PenTool },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTabFilter === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTabFilter(tab.id as any)}
                className={`flex items-center space-x-1.5 px-4 py-2 rounded-full border text-xs font-medium transition-all whitespace-nowrap ${
                  isActive
                    ? 'border-[#422F0E] bg-[#422F0E] text-[#FAF7F2] font-semibold shadow-sm'
                    : 'border-[#EFE8DC] bg-[#FFFFFF] text-[#6B5E4E] hover:bg-[#FAF7F2]'
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Notes Grid */}
        {filteredNotes.length === 0 ? (
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
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredNotes.map((note) => {
              const formattedDate = format(new Date(note.created_at), 'MMM dd, hh:mm a');
              const TypeIcon =
                note.note_type === 'PHOTO'
                  ? Camera
                  : note.note_type === 'VOICE'
                  ? Mic
                  : note.note_type === 'DRAWING'
                  ? PenTool
                  : FileText;

              return (
                <div
                  key={note.id}
                  onClick={() => setPreviewNote(note)}
                  style={{ backgroundColor: note.color || '#FAF7F2' }}
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
                        {/* Pin Button */}
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

                        {/* Delete Button */}
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
                        <TypeIcon className="h-3.5 w-3.5 text-[#EA5E86]" />
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
      </div>

      {/* Note Preview Modal */}
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
                className="p-1.5 text-[#A89F91] hover:text-[#422F0E] rounded-full"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Note Type Selector */}
            <div className="flex gap-2 p-1 rounded-full bg-[#FAF7F2] border border-[#EFE8DC]">
              {[
                { id: 'TEXT', label: 'Text', icon: FileText },
                { id: 'PHOTO', label: 'Photo', icon: Camera },
                { id: 'VOICE', label: 'Voice', icon: Mic },
                { id: 'DRAWING', label: 'Drawing', icon: PenTool },
              ].map((t) => {
                const Icon = t.icon;
                const isSelected = noteType === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setNoteType(t.id as any)}
                    className={`flex-1 flex items-center justify-center space-x-1.5 py-1.5 rounded-full text-xs font-medium transition-all ${
                      isSelected
                        ? 'bg-[#422F0E] text-[#FAF7F2] font-semibold shadow-sm'
                        : 'text-[#6B5E4E] hover:text-[#422F0E]'
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    <span>{t.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Form Inputs */}
            <form onSubmit={handleCreateNote} className="space-y-4">
              {/* Photo Upload Option */}
              {noteType === 'PHOTO' && (
                <div className="space-y-2">
                  <label className="block text-xs font-medium text-[#6B5E4E]">Upload Photo / URL</label>
                  <div className="flex gap-2">
                    <label className="flex-1 flex items-center justify-center gap-2 border border-dashed border-[#D4CEC2] rounded-2xl p-4 bg-[#FAF7F2] cursor-pointer hover:bg-[#F5EFE6] transition-colors">
                      <Camera className="h-5 w-5 text-[#EA5E86]" />
                      <span className="text-xs font-medium text-[#6B5E4E]">Choose Image</span>
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
