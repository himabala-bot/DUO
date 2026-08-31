'use client';

import React, { useRef, useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
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
} from 'lucide-react';
import { Drawing } from '@/types';
import { format } from 'date-fns';
import { RealtimeChannel } from '@supabase/supabase-js';

const COLORS = [
  { name: 'Carbon Ink', value: '#1C1917' },
  { name: 'Warm Terracotta', value: '#C2410C' },
  { name: 'Deep Olive', value: '#365314' },
  { name: 'Warm Sienna', value: '#78350F' },
  { name: 'Slate Indigo', value: '#334155' },
  { name: 'Muted Rose', value: '#9D174D' },
  { name: 'Graphite', value: '#78716C' },
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

  const handleClear = () => {
    if (!confirm('Clear canvas?')) return;
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
      alert(`Drawing sent to ${partner?.name || 'partner'}!`);
    } catch (err: any) {
      console.error('Failed to send drawing:', err);
      alert(err.message || 'Failed to send drawing. Please check your connection.');
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
        {/* Top Header & Switcher */}
        <div className="flex flex-col sm:flex-row sm:items-baseline justify-between pb-6 border-b border-[#E8E4DB] gap-4">
          <div>
            <h2 className="font-serif text-2xl sm:text-3xl lg:text-4xl font-normal text-[#1C1917]">
              Drawing Studio
            </h2>
            <p className="mt-1.5 text-xs sm:text-sm text-[#78716C]">
              Hand-drawn notes, sketches, and doodles for {partner?.name}.
            </p>
          </div>

          <div className="flex border border-[#E8E4DB] rounded-xl bg-[#F5F2EB] p-1 self-start sm:self-auto">
            <button
              onClick={() => setActiveTab('canvas')}
              className={`flex items-center space-x-2 rounded-lg px-4 py-1.5 text-xs sm:text-sm font-medium transition-all ${
                activeTab === 'canvas'
                  ? 'bg-[#FFFFFF] text-[#1C1917] shadow-sm font-semibold'
                  : 'text-[#78716C] hover:text-[#1C1917]'
              }`}
            >
              <Palette className="h-4 w-4" />
              <span>Studio</span>
            </button>
            <button
              onClick={() => setActiveTab('gallery')}
              className={`flex items-center space-x-2 rounded-lg px-4 py-1.5 text-xs sm:text-sm font-medium transition-all ${
                activeTab === 'gallery'
                  ? 'bg-[#FFFFFF] text-[#1C1917] shadow-sm font-semibold'
                  : 'text-[#78716C] hover:text-[#1C1917]'
              }`}
            >
              <Archive className="h-4 w-4" />
              <span>Archive ({drawings.length})</span>
            </button>
          </div>
        </div>

        {activeTab === 'canvas' ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
            {/* Canvas Viewport (Desktop 8-9 cols) */}
            <div className="lg:col-span-8 xl:col-span-9 flex flex-col items-center">
              <div className="w-full overflow-hidden rounded-2xl border border-[#E8E4DB] bg-[#FFFFFF] p-2.5 sm:p-3 shadow-[0_4px_20px_rgba(28,25,23,0.04)]">
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
              <div className="mt-4 sm:mt-5 flex w-full flex-col sm:flex-row gap-3">
                <input
                  type="text"
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  placeholder="Add a note or title (optional)..."
                  maxLength={100}
                  className="flex-1 rounded-xl border border-[#D4CEC2] bg-[#FFFFFF] px-4 py-3 text-xs sm:text-sm text-[#1C1917] placeholder-[#A8A29E] focus:border-[#C2410C] focus:outline-none focus:ring-1 focus:ring-[#C2410C] shadow-sm"
                />
                <button
                  onClick={handleSendDrawing}
                  disabled={isSending}
                  className="flex items-center justify-center space-x-2 rounded-xl bg-[#1C1917] px-6 py-3 text-xs sm:text-sm font-medium text-white hover:bg-[#C2410C] transition-all disabled:opacity-40 min-h-[44px] shadow-sm shrink-0"
                >
                  <span>{isSending ? 'Sending...' : `Send to ${partner?.name || 'Partner'}`}</span>
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Tools & Palette Sidebar (Desktop 4-3 cols) */}
            <div className="lg:col-span-4 xl:col-span-3 rounded-2xl border border-[#E8E4DB] bg-[#FFFFFF] p-5 sm:p-6 shadow-[0_2px_8px_rgba(28,25,23,0.03)] flex flex-col gap-6">
              {/* History Actions */}
              <div>
                <span className="text-[11px] font-mono uppercase tracking-widest text-[#8C857B]">Actions</span>
                <div className="mt-2.5 flex gap-2">
                  <button
                    onClick={handleUndo}
                    disabled={historyIndex <= 0}
                    title="Undo"
                    className="flex-1 flex items-center justify-center rounded-xl border border-[#E8E4DB] bg-[#FBFAF7] p-3 text-[#57534E] hover:bg-[#F5F2EB] disabled:opacity-30 min-h-[42px] transition-all"
                  >
                    <RotateCcw className="h-4 w-4" />
                  </button>
                  <button
                    onClick={handleRedo}
                    disabled={historyIndex >= history.length - 1}
                    title="Redo"
                    className="flex-1 flex items-center justify-center rounded-xl border border-[#E8E4DB] bg-[#FBFAF7] p-3 text-[#57534E] hover:bg-[#F5F2EB] disabled:opacity-30 min-h-[42px] transition-all"
                  >
                    <RotateCw className="h-4 w-4" />
                  </button>
                  <button
                    onClick={handleClear}
                    title="Clear Canvas"
                    className="flex-1 flex items-center justify-center rounded-xl border border-[#E8E4DB] bg-[#FBFAF7] p-3 text-[#78716C] hover:text-[#DC2626] hover:bg-[#FEF2F2] min-h-[42px] transition-all"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Inks / Colors */}
              <div>
                <span className="text-[11px] font-mono uppercase tracking-widest text-[#8C857B]">Ink Palette</span>
                <div className="mt-2.5 grid grid-cols-4 gap-2.5">
                  {COLORS.map((c) => (
                    <button
                      key={c.value}
                      onClick={() => {
                        setColor(c.value);
                        setIsEraser(false);
                      }}
                      title={c.name}
                      className={`relative h-10 w-full rounded-lg border transition-all ${
                        !isEraser && color === c.value
                          ? 'border-[#1C1917] ring-2 ring-[#1C1917]/20 scale-105 shadow-sm'
                          : 'border-[#E8E4DB] hover:scale-105'
                      }`}
                      style={{ backgroundColor: c.value }}
                    >
                      {!isEraser && color === c.value && (
                        <Check className={`h-4 w-4 mx-auto ${c.value === '#FFFFFF' || c.value === '#78716C' ? 'text-black' : 'text-white'}`} />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Nib Sizes */}
              <div>
                <span className="text-[11px] font-mono uppercase tracking-widest text-[#8C857B]">Nib Size</span>
                <div className="mt-2.5 grid grid-cols-2 lg:grid-cols-1 gap-2">
                  {SIZES.map((s) => (
                    <button
                      key={s.name}
                      onClick={() => setBrushSize(s.value)}
                      className={`flex items-center justify-between rounded-xl px-3.5 py-2.5 text-xs sm:text-sm font-medium transition-all ${
                        brushSize === s.value
                          ? 'bg-[#F5F2EB] text-[#1C1917] font-semibold border border-[#D4CEC2]'
                          : 'text-[#78716C] hover:bg-[#FBFAF7] border border-transparent'
                      }`}
                    >
                      <span>{s.name}</span>
                      <div
                        className="rounded-full bg-[#1C1917]"
                        style={{ width: `${s.value + 3}px`, height: `${s.value + 3}px` }}
                      />
                    </button>
                  ))}
                </div>
              </div>

              {/* Eraser */}
              <div>
                <button
                  onClick={() => setIsEraser(!isEraser)}
                  className={`flex w-full items-center justify-center space-x-2 rounded-xl py-3 text-xs sm:text-sm font-medium transition-all min-h-[42px] ${
                    isEraser
                      ? 'bg-[#1C1917] text-white shadow-sm'
                      : 'border border-[#E8E4DB] bg-[#FBFAF7] text-[#57534E] hover:bg-[#F5F2EB]'
                  }`}
                >
                  <Eraser className="h-4 w-4" />
                  <span>{isEraser ? 'Eraser Active' : 'Eraser'}</span>
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* Gallery View */
          <div>
            {drawings.length === 0 ? (
              <div className="flex h-64 flex-col items-center justify-center rounded-2xl border border-[#E8E4DB] bg-[#FFFFFF] p-8 sm:p-12 text-center shadow-sm">
                <h4 className="font-serif text-xl text-[#1C1917]">No drawings in archive</h4>
                <p className="mt-1.5 text-xs sm:text-sm text-[#78716C]">
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
                      className="rounded-2xl border border-[#E8E4DB] bg-[#FFFFFF] overflow-hidden shadow-[0_2px_8px_rgba(28,25,23,0.03)] transition-all hover:border-[#D4CEC2] hover:shadow-md"
                    >
                      <div
                        onClick={() => setSelectedDrawing(draw)}
                        className="cursor-pointer aspect-[4/3] w-full bg-[#FBFAF7] flex items-center justify-center overflow-hidden border-b border-[#E8E4DB]"
                      >
                        {imgSource ? (
                          <img
                            src={imgSource}
                            alt={draw.caption || 'DUO Drawing'}
                            className="h-full w-full object-contain p-3"
                          />
                        ) : (
                          <div className="text-xs text-[#8C857B] font-mono">No preview</div>
                        )}
                      </div>

                      <div className="p-4">
                        <div className="flex items-center justify-between text-xs font-mono text-[#8C857B]">
                          <span>{draw.is_me ? 'You' : draw.sender?.name}</span>
                          <span>{format(new Date(draw.created_at), 'MMM dd, yyyy')}</span>
                        </div>
                        {draw.caption && <p className="mt-1.5 text-xs sm:text-sm text-[#1C1917] font-serif italic line-clamp-2">"{draw.caption}"</p>}

                        <div className="mt-3.5 flex justify-end gap-2">
                          <button
                            onClick={() => setSelectedDrawing(draw)}
                            className="rounded-lg p-2 text-[#78716C] hover:bg-[#F5F2EB] hover:text-[#1C1917] transition-colors"
                            title="View"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDownloadDrawing(draw)}
                            className="rounded-lg p-2 text-[#78716C] hover:bg-[#F5F2EB] hover:text-[#1C1917] transition-colors"
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
            <div className="relative max-h-[90vh] max-w-3xl w-full overflow-hidden rounded-2xl border border-[#E8E4DB] bg-[#FFFFFF] p-6 shadow-2xl">
              <div className="flex items-center justify-between pb-4 border-b border-[#E8E4DB]">
                <div>
                  <h4 className="font-serif text-lg text-[#1C1917]">
                    Drawing by {selectedDrawing.is_me ? 'You' : selectedDrawing.sender?.name}
                  </h4>
                  <p className="text-xs font-mono text-[#8C857B]">
                    {format(new Date(selectedDrawing.created_at), 'MMMM dd, yyyy hh:mm a')}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleDownloadDrawing(selectedDrawing)}
                    className="rounded-xl border border-[#E8E4DB] bg-[#FBFAF7] px-3.5 py-1.5 text-xs font-medium text-[#1C1917] hover:bg-[#F5F2EB] flex items-center gap-1.5"
                  >
                    <Download className="h-4 w-4" /> Download
                  </button>
                  <button
                    onClick={() => setSelectedDrawing(null)}
                    className="rounded-xl p-2 text-[#8C857B] hover:text-[#1C1917]"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>

              <div className="mt-4 overflow-hidden rounded-xl bg-[#FBFAF7] border border-[#E8E4DB] p-4 flex items-center justify-center">
                <img
                  src={selectedDrawing.image_url || selectedDrawing.storage_path}
                  alt={selectedDrawing.caption}
                  className="max-h-[60vh] w-auto object-contain"
                />
              </div>

              {selectedDrawing.caption && (
                <p className="mt-3 text-center text-sm font-serif italic text-[#1C1917]">
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
