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
} from 'lucide-react';
import { format } from 'date-fns';
import { RealtimeChannel } from '@supabase/supabase-js';
import { VoiceRecorder } from './VoiceRecorder';
import { WaveformPlayer } from './WaveformPlayer';
import { Avatar } from './Avatar';

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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 items-start">
            {filteredNotes.map((note) => {
              const formattedDate = format(new Date(note.created_at), 'MMM dd, hh:mm a');

              return (
                <div
                  key={note.id}
                  style={{ backgroundColor: note.color || '#FAF7F2' }}
                  className={`group relative rounded-3xl border border-[#EFE8DC] p-5 shadow-[0_2px_12px_rgba(66,47,14,0.03)] hover:shadow-md transition-all flex flex-col justify-between space-y-4 ${
                    note.is_pinned ? 'ring-2 ring-[#FCC4C0]' : ''
                  }`}
                >
                  {/* Top Bar: Author, Pin & Actions */}
                  <div className="flex items-center justify-between">
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

                  {/* Body Content */}
                  <div className="space-y-2">
                    {/* Media Previews */}
                    {note.note_type === 'PHOTO' && note.media_url && (
                      <div className="rounded-2xl overflow-hidden border border-[#EFE8DC] bg-white shadow-sm max-h-56">
                        <img
                          src={note.media_url}
                          alt="Photo Note"
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}

                    {note.note_type === 'DRAWING' && note.media_url && (
                      <div className="rounded-2xl overflow-hidden border border-[#EFE8DC] bg-white shadow-sm p-2">
                        <img
                          src={note.media_url}
                          alt="Doodle Note"
                          className="w-full h-auto max-h-48 object-contain"
                        />
                      </div>
                    )}

                    {note.note_type === 'VOICE' && note.media_url && (
                      <div className="rounded-2xl border border-[#EFE8DC] bg-white p-3">
                        <WaveformPlayer audioUrl={note.media_url} />
                      </div>
                    )}

                    {/* Text Message */}
                    {note.content && (
                      <p className="text-xs sm:text-sm text-[#422F0E] whitespace-pre-wrap leading-relaxed">
                        {note.content}
                      </p>
                    )}
                  </div>

                  {/* Bottom: Timestamp */}
                  <div className="pt-2 border-t border-black/5 flex items-center justify-between text-[10px] font-mono text-[#A89F91]">
                    <span>{formattedDate}</span>
                    <span className="capitalize">{note.note_type.toLowerCase()}</span>
                  </div>
                </div>
              );
            })}
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

              {/* Drawing / Image URL Option */}
              {noteType === 'DRAWING' && (
                <div className="space-y-2">
                  <label className="block text-xs font-medium text-[#6B5E4E]">Image / Doodle URL</label>
                  <input
                    type="url"
                    value={mediaUrl}
                    onChange={(e) => setMediaUrl(e.target.value)}
                    placeholder="https://example.com/drawing.png"
                    className="w-full rounded-full border border-[#EFE8DC] bg-[#FAF7F2] px-4 py-2 text-xs text-[#422F0E] focus:outline-none focus:border-[#EA5E86]"
                  />
                  {mediaUrl && (
                    <div className="rounded-2xl border border-[#EFE8DC] overflow-hidden max-h-48 mt-2 p-2 bg-white">
                      <img src={mediaUrl} alt="Preview" className="w-full h-full object-contain" />
                    </div>
                  )}
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
                  rows={3}
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
                  disabled={isSubmitting || (noteType === 'TEXT' && !textContent.trim())}
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
