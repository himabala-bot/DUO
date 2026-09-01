'use client';

import React, { useRef, useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { drawingsApi } from '@/lib/api';
import {
  RotateCcw,
  RotateCw,
  Trash2,
  Download,
  Eye,
  Check,
  Eraser,
  ArrowRight,
  X,
  Palette,
  Archive,
  Heart,
} from 'lucide-react';
import { Drawing } from '@/types';
import { format } from 'date-fns';
import { RealtimeChannel } from '@supabase/supabase-js';

const COLORS = [
  { name: 'Espresso', value: '#422F0E' },
  { name: 'Berry Pink', value: '#EA5E86' },
  { name: 'Coral', value: '#EF6545' },
  { name: 'Sunset', value: '#F49625' },
  { name: 'Peach', value: '#FFD094' },
  { name: 'Butter', value: '#F7E9B2' },
  { name: 'Matcha', value: '#DDF2B8' },
  { name: 'Sage', value: '#AECFD0' },
  { name: 'Teal', value: '#57B1A8' },
  { name: 'Deep Forest', value: '#037F71' },
  { name: 'Lilac', value: '#F9D4F8' },
  { name: 'Blush', value: '#FCC4C0' },
  { name: 'Paper White', value: '#FFFFFF' },
];

const SIZES = [
  { name: 'Fine', value: 2 },
  { name: 'Pen', value: 5 },
  { name: 'Brush', value: 10 },
  { name: 'Marker', value: 20 },
];

export const DrawingCanvas: React.FC = () => {
  const { profile, partner } = useAuth();
  const { toast, confirm } = useToast();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [color, setColor] = useState<string>('#1C1917');
  const [brushSize, setBrushSize] = useState<number>(5);
  const [isEraser, setIsEraser] = useState<boolean>(false);
  const [caption, setCaption] = useState<string>('');
  const [isDrawing, setIsDrawing] = useState<boolean>(false);
  const [history, setHistory] = useState<ImageData[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);
  const [isSending, setIsSending] = useState<boolean>(false);
  const [drawings, setDrawings] = useState<Drawing[]>([]);
  const [activeTab, setActiveTab] = useState<'canvas' | 'gallery'>('canvas');
  const [selectedDrawing, setSelectedDrawing] = useState<Drawing | null>(null);
  const lastPos = useRef<{ x: number; y: number } | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);

  const duoId = profile?.active_duo_id;

  // Initialize canvas with clean white paper background
  const initCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const initialState = ctx.getImageData(0, 0, canvas.width, canvas.height);
    setHistory([initialState]);
    setHistoryIndex(0);
  }, []);

  const fetchDrawings = useCallback(async () => {
    try {
      const res = await drawingsApi.list();
      setDrawings(res.drawings || []);
    } catch (err) {
      console.warn('Failed to load drawings:', err);
    }
  }, []);

  useEffect(() => {
    initCanvas();
    fetchDrawings();
  }, [initCanvas, fetchDrawings]);

  // Set up Supabase Realtime channel for instant drawings sync
  useEffect(() => {
    if (!isSupabaseConfigured() || !duoId || !profile) return;

    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    const channel = supabase.channel(`drawings_studio:${duoId}`, {
      config: { broadcast: { self: false } },
    });

    channel
      .on('broadcast', { event: 'new_drawing' }, (payload) => {
        const newDrawing = payload.payload as Drawing;
        if (!newDrawing || !newDrawing.id) return;

        const isMe = newDrawing.sender?.id === profile.id || (newDrawing as any).sender_id === profile.id;
        const formatted: Drawing = {
          ...newDrawing,
          is_me: isMe,
        };

        setDrawings((prev) => {
          if (prev.some((d) => d.id === formatted.id)) return prev;
          return [formatted, ...prev];
        });
      })
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'drawings',
          filter: `duo_id=eq.${duoId}`,
        },
        () => {
          fetchDrawings();
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [duoId, profile?.id, fetchDrawings]);

  const saveHistoryState = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    const currentState = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(currentState);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  };

  const handleUndo = () => {
    if (historyIndex > 0) {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const newIndex = historyIndex - 1;
      ctx.putImageData(history[newIndex], 0, 0);
      setHistoryIndex(newIndex);
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const newIndex = historyIndex + 1;
      ctx.putImageData(history[newIndex], 0, 0);
      setHistoryIndex(newIndex);
    }
  };

  const handleClear = async () => {
    const ok = await confirm({
      title: 'Clear Canvas?',
      message: 'This will reset your current doodle and sketch.',
      confirmText: 'Clear',
      cancelText: 'Keep Drawing',
      type: 'danger',
    });
    if (!ok) return;
    initCanvas();
  };

  const getCanvasCoords = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    if ('touches' in e) {
      const touch = e.touches[0];
      return {
        x: (touch.clientX - rect.left) * scaleX,
        y: (touch.clientY - rect.top) * scaleY,
      };
    } else {
      return {
        x: (e.clientX - rect.left) * scaleX,
        y: (e.clientY - rect.top) * scaleY,
      };
    }
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    setIsDrawing(true);
    const coords = getCanvasCoords(e);
    lastPos.current = coords;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.beginPath();
    ctx.arc(coords.x, coords.y, (isEraser ? brushSize * 2 : brushSize) / 2, 0, Math.PI * 2);
    ctx.fillStyle = isEraser ? '#FFFFFF' : color;
    ctx.fill();
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !lastPos.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const coords = getCanvasCoords(e);

    ctx.beginPath();
    ctx.moveTo(lastPos.current.x, lastPos.current.y);
    ctx.lineTo(coords.x, coords.y);
    ctx.strokeStyle = isEraser ? '#FFFFFF' : color;
    ctx.lineWidth = isEraser ? brushSize * 2 : brushSize;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();

    lastPos.current = coords;
  };

  const stopDrawing = () => {
    if (isDrawing) {
      setIsDrawing(false);
      lastPos.current = null;
      saveHistoryState();
    }
  };

  const handleSendDrawing = async () => {
    const canvas = canvasRef.current;
    if (!canvas || !duoId) return;

    setIsSending(true);
    try {
      const dataUrl = canvas.toDataURL('image/png');
      let storagePath = dataUrl;

      try {
        const blob = await new Promise<Blob | null>((resolve) =>
          canvas.toBlob((b) => resolve(b), 'image/png')
        );
        if (blob) {
          storagePath = await drawingsApi.uploadToSupabaseStorage(blob, duoId);
        }
      } catch (uploadErr) {
        console.warn('Supabase storage upload bypassed, saving high-res PNG directly:', uploadErr);
        storagePath = dataUrl;
      }

      const savedDrawing = await drawingsApi.create(storagePath, caption.trim());

      const confirmedDrawing: Drawing = {
        ...savedDrawing,
        image_url: savedDrawing.image_url || storagePath,
        is_me: true,
      };

      setDrawings((prev) => [confirmedDrawing, ...prev.filter((d) => d.id !== confirmedDrawing.id)]);

      if (channelRef.current) {
        channelRef.current.send({
          type: 'broadcast',
          event: 'new_drawing',
          payload: confirmedDrawing,
        });
      }

      if (partner?.id) {
        const partnerNotifChannel = supabase.channel(`user:${partner.id}`);
        partnerNotifChannel.send({
          type: 'broadcast',
          event: 'new_drawing',
          payload: confirmedDrawing,
        });
      }

      setCaption('');
      initCanvas();
      toast.drawing(`Doodle sent to ${partner?.name || 'partner'}!`, 'Shared');
    } catch (err: any) {
      console.error('Failed to send drawing:', err);
      toast.error(err.message || 'Failed to send drawing. Please check your connection.', 'Error');
    } finally {
      setIsSending(false);
    }
  };

  const handleDownloadDrawing = async (drawing: Drawing) => {
    const rawUrl = drawing.image_url || drawing.storage_path;
    if (!rawUrl) return;

    const filename = `duo_drawing_${format(new Date(drawing.created_at), 'yyyyMMdd_HHmmss')}.png`;

    try {
      if (rawUrl.startsWith('data:')) {
        const link = document.createElement('a');
        link.href = rawUrl;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        return;
      }

      const response = await fetch(rawUrl);
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);
    } catch (err) {
      console.warn('Blob fetch download failed, falling back to direct anchor:', err);
      const link = document.createElement('a');
      link.href = rawUrl;
      link.download = filename;
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  return (
    <div className="w-full flex justify-center px-4 sm:px-6 lg:px-8 py-6 sm:py-8 lg:py-10">
      {/* Studio Workspace (~1200–1320px) */}
      <div className="w-full max-w-[1200px] lg:max-w-[1320px] space-y-6 sm:space-y-8">
        {/* Subheader & Mode Switcher */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-theme pb-5">
          <div>
            <div className="flex items-center space-x-1.5 text-xs font-mono text-theme-muted">
              <Heart className="h-3.5 w-3.5 text-[#125CB9] fill-current" />
              <span>Doodle Studio</span>
            </div>
            <h2 className="mt-1 font-serif text-2xl sm:text-3xl font-bold text-theme-primary">
              Shared Canvas
            </h2>
            <p className="mt-1 text-xs sm:text-sm text-theme-secondary">
              Draw a sweet sketch or love note in real-time with {partner?.name}.
            </p>
          </div>
        </div>

        {/* Mode Switcher Tabs */}
        <div className="flex items-center justify-between pb-3 border-b border-theme">
          <div className="flex items-center space-x-1 border border-theme rounded-full p-1 bg-theme-input">
            <button
              onClick={() => setActiveTab('canvas')}
              className={`flex items-center space-x-1.5 px-3.5 py-1.5 rounded-full text-xs font-medium transition-all ${
                activeTab === 'canvas'
                  ? 'bg-theme-card text-theme-primary shadow-xs font-semibold'
                  : 'text-theme-secondary hover:text-theme-primary'
              }`}
            >
              <Palette className="h-3.5 w-3.5" />
              <span>Studio View</span>
            </button>
            <button
              onClick={() => setActiveTab('gallery')}
              className={`flex items-center space-x-1.5 px-3.5 py-1.5 rounded-full text-xs font-medium transition-all ${
                activeTab === 'gallery'
                  ? 'bg-theme-card text-theme-primary shadow-xs font-semibold'
                  : 'text-theme-secondary hover:text-theme-primary'
              }`}
            >
              <Archive className="h-3.5 w-3.5" />
              <span>Gallery ({drawings.length})</span>
            </button>
          </div>
        </div>

        {activeTab === 'canvas' ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
            {/* Canvas Viewport (Desktop 8-9 cols) */}
            <div className="lg:col-span-8 xl:col-span-9 flex flex-col items-center">
              <div className="w-full overflow-hidden rounded-2xl border border-theme bg-theme-card p-2 sm:p-2.5 shadow-xs">
                <canvas
                  ref={canvasRef}
                  width={800}
                  height={600}
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                  onTouchStart={startDrawing}
                  onTouchMove={draw}
                  onTouchEnd={stopDrawing}
                  className="w-full aspect-[4/3] rounded-xl cursor-crosshair touch-none bg-[#FFFFFF]"
                />
              </div>

              {/* Caption & Send Bar */}
              <div className="mt-3 flex w-full flex-col sm:flex-row gap-2.5">
                <input
                  type="text"
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  placeholder="Add a sweet caption (optional)..."
                  maxLength={100}
                  className="flex-1 rounded-2xl border border-theme bg-theme-input px-4 py-2 text-xs sm:text-sm text-theme-primary placeholder-theme-muted focus:border-[#125CB9] focus:bg-theme-card focus:outline-none"
                />
                <button
                  onClick={handleSendDrawing}
                  disabled={isSending}
                  className="flex items-center justify-center space-x-1.5 rounded-full bg-[#125CB9] px-5 py-2 text-xs font-medium text-white hover:bg-[#0E4B99] transition-colors disabled:opacity-40 shadow-xs shrink-0"
                >
                  <span>{isSending ? 'Sending doodle...' : `Send to ${partner?.name || 'Partner'}`}</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            {/* Tools & Palette Sidebar (Desktop 4-3 cols) */}
            <div className="lg:col-span-4 xl:col-span-3 rounded-2xl border border-theme bg-theme-card p-4 shadow-xs flex flex-col gap-4">
              {/* History Actions */}
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-theme-muted font-medium">Actions</span>
                <div className="mt-1.5 flex gap-1.5">
                  <button
                    onClick={handleUndo}
                    disabled={historyIndex <= 0}
                    title="Undo"
                    className="flex-1 flex items-center justify-center rounded-xl border border-theme bg-theme-input p-2 text-theme-secondary hover:bg-theme-card disabled:opacity-30 transition-colors"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={handleRedo}
                    disabled={historyIndex >= history.length - 1}
                    title="Redo"
                    className="flex-1 flex items-center justify-center rounded-xl border border-theme bg-theme-input p-2 text-theme-secondary hover:bg-theme-card disabled:opacity-30 transition-colors"
                  >
                    <RotateCw className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={handleClear}
                    title="Clear Canvas"
                    className="flex-1 flex items-center justify-center rounded-xl border border-theme bg-theme-input p-2 text-theme-muted hover:text-[#F43F5E] hover:bg-[#F43F5E]/10 transition-colors"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              {/* Inks / Colors */}
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-theme-muted font-medium">Ink Palette</span>
                <div className="mt-1.5 grid grid-cols-4 gap-1.5">
                  {COLORS.map((c) => (
                    <button
                      key={c.value}
                      onClick={() => {
                        setColor(c.value);
                        setIsEraser(false);
                      }}
                      title={c.name}
                      className={`relative h-8 w-full rounded-xl border transition-all ${
                        !isEraser && color === c.value
                          ? 'border-[#125CB9] ring-2 ring-[#125CB9]/40 scale-105 shadow-xs'
                          : 'border-theme hover:scale-105'
                      }`}
                      style={{ backgroundColor: c.value }}
                    >
                      {!isEraser && color === c.value && (
                        <Check className={`h-3 w-3 mx-auto ${c.value === '#FFFFFF' || c.value === '#F7E9B2' || c.value === '#FFD094' || c.value === '#DDF2B8' || c.value === '#F9D4F8' || c.value === '#FCC4C0' ? 'text-[#191C26]' : 'text-white'}`} />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Nib Sizes */}
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-theme-muted font-medium">Brush Size</span>
                <div className="mt-1.5 grid grid-cols-2 lg:grid-cols-1 gap-1">
                  {SIZES.map((s) => (
                    <button
                      key={s.name}
                      onClick={() => setBrushSize(s.value)}
                      className={`flex items-center justify-between rounded-xl px-3 py-1.5 text-xs font-medium transition-all ${
                        brushSize === s.value
                          ? 'bg-[#125CB9]/10 text-[#125CB9] font-semibold border border-[#125CB9]/25'
                          : 'text-theme-secondary hover:bg-theme-input border border-transparent'
                      }`}
                    >
                      <span>{s.name}</span>
                      <div
                        className="rounded-full bg-current"
                        style={{ width: `${s.value + 2}px`, height: `${s.value + 2}px` }}
                      />
                    </button>
                  ))}
                </div>
              </div>

              {/* Eraser */}
              <div>
                <button
                  onClick={() => setIsEraser(!isEraser)}
                  className={`flex w-full items-center justify-center space-x-1.5 rounded-xl py-2 text-xs font-medium transition-all ${
                    isEraser
                      ? 'bg-[#125CB9] text-white shadow-xs'
                      : 'border border-theme bg-theme-input text-theme-secondary hover:bg-theme-card'
                  }`}
                >
                  <Eraser className="h-3.5 w-3.5" />
                  <span>{isEraser ? 'Eraser Active' : 'Eraser'}</span>
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* Gallery View */
          <div>
            {drawings.length === 0 ? (
              <div className="flex h-64 flex-col items-center justify-center rounded-2xl border border-theme bg-theme-card p-8 sm:p-12 text-center shadow-sm">
                <h4 className="font-serif text-xl text-theme-primary font-bold">No drawings in archive</h4>
                <p className="mt-1.5 text-xs sm:text-sm text-theme-secondary">
                  Draw a sketch and share it with {partner?.name} to start your archive.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-6">
                {drawings.map((draw) => {
                  const imgSource = draw.image_url || draw.storage_path;

                  return (
                    <div
                      key={draw.id}
                      className="rounded-2xl border border-theme bg-theme-card overflow-hidden shadow-xs transition-all hover:border-[#125CB9]"
                    >
                      <div
                        onClick={() => setSelectedDrawing(draw)}
                        className="cursor-pointer aspect-[4/3] w-full bg-theme-input flex items-center justify-center overflow-hidden border-b border-theme"
                      >
                        {imgSource ? (
                          <img
                            src={imgSource}
                            alt={draw.caption || 'DUO Drawing'}
                            className="h-full w-full object-contain p-3"
                          />
                        ) : (
                          <div className="text-xs text-theme-muted font-mono">No preview</div>
                        )}
                      </div>

                      <div className="p-4">
                        <div className="flex items-center justify-between text-xs font-mono text-theme-muted">
                          <span>{draw.is_me ? 'You' : draw.sender?.name}</span>
                          <span>{format(new Date(draw.created_at), 'MMM dd, yyyy')}</span>
                        </div>
                        {draw.caption && <p className="mt-1.5 text-xs sm:text-sm text-theme-primary font-serif italic line-clamp-2">"{draw.caption}"</p>}

                        <div className="mt-3.5 flex justify-end gap-2">
                          <button
                            onClick={() => setSelectedDrawing(draw)}
                            className="rounded-full p-2 text-theme-secondary hover:bg-theme-input hover:text-theme-primary transition-colors"
                            title="View"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDownloadDrawing(draw)}
                            className="rounded-full p-2 text-theme-secondary hover:bg-theme-input hover:text-theme-primary transition-colors"
                            title="Download PNG"
                          >
                            <Download className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Lightbox Modal */}
        {selectedDrawing && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-[2px]">
            <div className="relative max-h-[90vh] max-w-3xl w-full overflow-hidden rounded-2xl border border-theme bg-theme-card p-6 shadow-2xl">
              <div className="flex items-center justify-between pb-4 border-b border-theme">
                <div>
                  <h4 className="font-serif text-lg font-bold text-theme-primary">
                    Drawing by {selectedDrawing.is_me ? 'You' : selectedDrawing.sender?.name}
                  </h4>
                  <p className="text-xs font-mono text-theme-muted">
                    {format(new Date(selectedDrawing.created_at), 'MMMM dd, yyyy hh:mm a')}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleDownloadDrawing(selectedDrawing)}
                    className="rounded-full border border-theme bg-theme-input px-3.5 py-1.5 text-xs font-medium text-theme-primary hover:bg-theme-card flex items-center gap-1.5"
                  >
                    <Download className="h-4 w-4" /> Download
                  </button>
                  <button
                    onClick={() => setSelectedDrawing(null)}
                    className="rounded-full p-2 text-theme-muted hover:text-theme-primary"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>

              <div className="mt-4 overflow-hidden rounded-2xl bg-theme-input border border-theme p-4 flex items-center justify-center">
                <img
                  src={selectedDrawing.image_url || selectedDrawing.storage_path}
                  alt={selectedDrawing.caption}
                  className="max-h-[60vh] w-auto object-contain"
                />
              </div>

              {selectedDrawing.caption && (
                <p className="mt-3 text-center text-sm font-serif italic text-theme-primary">
                  "{selectedDrawing.caption}"
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
