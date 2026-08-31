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
  Heart,
  Sparkles,
} from 'lucide-react';
import { Drawing } from '@/types';
import { format } from 'date-fns';
import { RealtimeChannel } from '@supabase/supabase-js';

const PALETTE_COLORS = [
  { name: 'Bubblegum Pink', value: '#FF758C' },
  { name: 'Strawberry Rose', value: '#E11D48' },
  { name: 'Sweet Peach', value: '#FB923C' },
  { name: 'Honey Sunshine', value: '#EAB308' },
  { name: 'Matcha Mint', value: '#10B981' },
  { name: 'Sky Blue', value: '#38BDF8' },
  { name: 'Soft Lavender', value: '#A855F7' },
  { name: 'Midnight Ink', value: '#1E1B18' },
  { name: 'Marshmallow White', value: '#FFFFFF' },
];

const SIZES = [
  { name: 'Fine', value: 2 },
  { name: 'Pen', value: 5 },
  { name: 'Brush', value: 10 },
  { name: 'Marker', value: 22 },
];

export const DrawingCanvas: React.FC = () => {
  const { profile, partner } = useAuth();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [color, setColor] = useState<string>('#FF758C');
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

  useEffect(() => {
    if (!isSupabaseConfigured() || !duoId || !profile) return;

    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    const channel = supabase.channel(`drawings_studio:${duoId}`, {
      config: { broadcast: { self: false } },
    });

    channel.on('broadcast', { event: 'new_drawing' }, (payload) => {
      const drawing = payload.payload as Drawing;
      if (!drawing || !drawing.id) return;

      const isMe = drawing.sender?.id === profile.id || (drawing as any).sender_id === profile.id;
      const formattedDrawing: Drawing = {
        ...drawing,
        is_me: isMe,
      };

      setDrawings((prev) => [formattedDrawing, ...prev.filter((d) => d.id !== formattedDrawing.id)]);
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

  const saveState = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    const currentState = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(currentState);

    if (newHistory.length > 25) {
      newHistory.shift();
    }

    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  };

  const getCoordinates = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    if ('touches' in e) {
      if (e.touches.length === 0) return null;
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
    const coords = getCoordinates(e);
    if (!coords) return;
    setIsDrawing(true);
    lastPos.current = coords;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.beginPath();
    ctx.arc(coords.x, coords.y, brushSize / 2, 0, Math.PI * 2);
    ctx.fillStyle = isEraser ? '#FFFFFF' : color;
    ctx.fill();
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !lastPos.current) return;
    const coords = getCoordinates(e);
    if (!coords) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.beginPath();
    ctx.moveTo(lastPos.current.x, lastPos.current.y);
    ctx.lineTo(coords.x, coords.y);
    ctx.strokeStyle = isEraser ? '#FFFFFF' : color;
    ctx.lineWidth = brushSize;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();

    lastPos.current = coords;
  };

  const stopDrawing = () => {
    if (isDrawing) {
      setIsDrawing(false);
      lastPos.current = null;
      saveState();
    }
  };

  const handleUndo = () => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.putImageData(history[newIndex], 0, 0);
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.putImageData(history[newIndex], 0, 0);
    }
  };

  const handleClear = () => {
    if (!confirm('Clear sketchpad? 🎨')) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    saveState();
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
      alert(`Doodle sent with love to ${partner?.name || 'your partner'}! 💕`);
    } catch (err: any) {
      console.error('Failed to send drawing:', err);
      alert(err.message || 'Failed to send doodle.');
    } finally {
      setIsSending(false);
    }
  };

  const handleDownloadDrawing = async (drawing: Drawing) => {
    const rawUrl = drawing.image_url || drawing.storage_path;
    if (!rawUrl) return;

    const filename = `duo_sketch_${format(new Date(drawing.created_at), 'yyyyMMdd_HHmmss')}.png`;

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
      {/* Studio Workspace */}
      <div className="w-full max-w-[1200px] lg:max-w-[1320px] space-y-6 sm:space-y-8">
        {/* Top Header & Switcher */}
        <div className="flex flex-col sm:flex-row sm:items-baseline justify-between pb-6 border-b border-[#F4EBE6] gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 rounded-full bg-[#F0FDF4] px-3 py-1 border border-[#BBF7D0] text-xs font-mono uppercase tracking-wider text-[#15803D] mb-2 shadow-2xs">
              <span>🎨</span>
              <span>Our Shared Sketchpad</span>
            </div>
            <h2 className="font-serif text-3xl sm:text-4xl font-bold text-[#2D2522]">
              Doodle Studio 💕
            </h2>
            <p className="mt-1.5 text-xs sm:text-sm text-[#7A6D65]">
              Draw cute handwritten notes, sweet doodles, and sketches for {partner?.name}.
            </p>
          </div>

          <div className="flex border-2 border-[#FCE1E8] rounded-full bg-[#FFF5F7] p-1 self-start sm:self-auto shadow-xs">
            <button
              onClick={() => setActiveTab('canvas')}
              className={`flex items-center space-x-2 rounded-full px-4 py-1.5 text-xs sm:text-sm font-bold transition-all ${
                activeTab === 'canvas'
                  ? 'bg-[#FFFFFF] text-[#E11D48] shadow-xs'
                  : 'text-[#7A6D65] hover:text-[#E11D48]'
              }`}
            >
              <span>🎨</span>
              <span>Sketchpad</span>
            </button>
            <button
              onClick={() => setActiveTab('gallery')}
              className={`flex items-center space-x-2 rounded-full px-4 py-1.5 text-xs sm:text-sm font-bold transition-all ${
                activeTab === 'gallery'
                  ? 'bg-[#FFFFFF] text-[#E11D48] shadow-xs'
                  : 'text-[#7A6D65] hover:text-[#E11D48]'
              }`}
            >
              <span>📸</span>
              <span>Doodle Vault ({drawings.length})</span>
            </button>
          </div>
        </div>

        {activeTab === 'canvas' ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
            {/* Canvas Viewport */}
            <div className="lg:col-span-8 xl:col-span-9 flex flex-col items-center">
              <div className="w-full overflow-hidden rounded-3xl border-2 border-[#FCE1E8] bg-[#FFFFFF] p-3 sm:p-4 shadow-[0_8px_28px_rgba(244,114,182,0.08)]">
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
                  className="w-full aspect-[4/3] rounded-2xl cursor-crosshair touch-none bg-[#FFFFFF]"
                />
              </div>

              {/* Caption & Send Bar */}
              <div className="mt-4 sm:mt-5 flex w-full flex-col sm:flex-row gap-3">
                <input
                  type="text"
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  placeholder="Add a cute caption or love note 💕 (optional)..."
                  maxLength={100}
                  className="flex-1 rounded-2xl border-2 border-[#FCE1E8] bg-[#FFFFFF] px-4 py-3 text-xs sm:text-sm text-[#2D2522] placeholder-[#B2A49B] focus:border-[#FF758C] focus:outline-none focus:ring-2 focus:ring-[#FF758C]/20 shadow-xs"
                />
                <button
                  onClick={handleSendDrawing}
                  disabled={isSending}
                  className="flex items-center justify-center space-x-2 rounded-2xl bg-gradient-to-r from-[#FF758C] to-[#FF7EB3] px-6 py-3 text-xs sm:text-sm font-bold text-white hover:scale-105 hover:shadow-[0_4px_16px_rgba(255,117,140,0.35)] transition-all disabled:opacity-40 min-h-[46px] shadow-sm shrink-0"
                >
                  <span>{isSending ? 'Sending Doodle...' : `Send Doodle to ${partner?.name || 'Partner'} 💕`}</span>
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Tools & Cute Candy Palette */}
            <div className="lg:col-span-4 xl:col-span-3 rounded-3xl border-2 border-[#FCE1E8] bg-[#FFFFFF] p-6 shadow-[0_8px_24px_rgba(244,114,182,0.06)] flex flex-col gap-6">
              {/* History Actions */}
              <div>
                <span className="text-[10px] font-mono uppercase tracking-widest text-[#B2A49B] font-bold">Quick Actions</span>
                <div className="mt-2.5 flex gap-2">
                  <button
                    onClick={handleUndo}
                    disabled={historyIndex <= 0}
                    title="Undo"
                    className="flex-1 flex items-center justify-center rounded-2xl border border-[#FCE1E8] bg-[#FFF5F7] p-3 text-[#E11D48] hover:bg-[#FFE4E8] disabled:opacity-30 min-h-[42px] transition-all"
                  >
                    <RotateCcw className="h-4 w-4" />
                  </button>
                  <button
                    onClick={handleRedo}
                    disabled={historyIndex >= history.length - 1}
                    title="Redo"
                    className="flex-1 flex items-center justify-center rounded-2xl border border-[#FCE1E8] bg-[#FFF5F7] p-3 text-[#E11D48] hover:bg-[#FFE4E8] disabled:opacity-30 min-h-[42px] transition-all"
                  >
                    <RotateCw className="h-4 w-4" />
                  </button>
                  <button
                    onClick={handleClear}
                    title="Clear Sketchpad"
                    className="flex items-center justify-center rounded-2xl border border-[#FCE1E8] bg-[#FFF5F7] p-3 text-[#E11D48] hover:bg-[#FFE4E8] min-h-[42px] transition-all"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Tool Mode */}
              <div>
                <span className="text-[10px] font-mono uppercase tracking-widest text-[#B2A49B] font-bold">Tool</span>
                <div className="mt-2.5 flex gap-2">
                  <button
                    onClick={() => setIsEraser(false)}
                    className={`flex-1 flex items-center justify-center space-x-2 rounded-2xl py-2.5 text-xs font-bold border transition-all ${
                      !isEraser
                        ? 'bg-[#FFF0F3] border-[#FCE1E8] text-[#E11D48] shadow-xs'
                        : 'border-[#F4EBE6] bg-[#FFFDFC] text-[#7A6D65] hover:bg-[#FFF5F7]'
                    }`}
                  >
                    <Palette className="h-4 w-4" />
                    <span>Doodle Pen</span>
                  </button>
                  <button
                    onClick={() => setIsEraser(true)}
                    className={`flex-1 flex items-center justify-center space-x-2 rounded-2xl py-2.5 text-xs font-bold border transition-all ${
                      isEraser
                        ? 'bg-[#FFF0F3] border-[#FCE1E8] text-[#E11D48] shadow-xs'
                        : 'border-[#F4EBE6] bg-[#FFFDFC] text-[#7A6D65] hover:bg-[#FFF5F7]'
                    }`}
                  >
                    <Eraser className="h-4 w-4" />
                    <span>Eraser</span>
                  </button>
                </div>
              </div>

              {/* Candy Palette */}
              <div>
                <span className="text-[10px] font-mono uppercase tracking-widest text-[#B2A49B] font-bold">Candy Inks</span>
                <div className="mt-2.5 grid grid-cols-3 gap-2.5">
                  {PALETTE_COLORS.map((c) => (
                    <button
                      key={c.value}
                      onClick={() => {
                        setColor(c.value);
                        setIsEraser(false);
                      }}
                      title={c.name}
                      style={{ backgroundColor: c.value }}
                      className={`h-10 w-full rounded-2xl border-2 transition-all flex items-center justify-center ${
                        color === c.value && !isEraser
                          ? 'border-[#2D2522] scale-110 shadow-md ring-2 ring-[#FF758C]/40'
                          : 'border-[#F4EBE6] hover:scale-105'
                      }`}
                    >
                      {color === c.value && !isEraser && (
                        <Check className={`h-4 w-4 ${c.value === '#FFFFFF' || c.value === '#EAB308' || c.value === '#FB923C' ? 'text-[#2D2522]' : 'text-white'}`} />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Brush Size */}
              <div>
                <span className="text-[10px] font-mono uppercase tracking-widest text-[#B2A49B] font-bold">Brush Size</span>
                <div className="mt-2.5 grid grid-cols-4 gap-2">
                  {SIZES.map((s) => (
                    <button
                      key={s.value}
                      onClick={() => setBrushSize(s.value)}
                      className={`rounded-2xl py-2 text-xs font-mono font-bold border transition-all ${
                        brushSize === s.value
                          ? 'bg-[#E11D48] text-white border-[#E11D48] shadow-xs'
                          : 'border-[#F4EBE6] bg-[#FFFDFC] text-[#7A6D65] hover:bg-[#FFF5F7]'
                      }`}
                    >
                      {s.name}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* Archive Gallery with Polaroid Frames */
          <div className="space-y-6">
            {drawings.length === 0 ? (
              <div className="rounded-3xl border-2 border-[#FCE1E8] bg-[#FFFFFF] p-8 sm:p-14 text-center shadow-xs">
                <span className="text-4xl block mb-2">🎨</span>
                <h4 className="font-serif text-xl font-bold text-[#2D2522]">No doodles saved yet</h4>
                <p className="mt-1.5 text-xs sm:text-sm text-[#7A6D65] max-w-sm mx-auto">
                  Draw your first little sketch in the Studio and surprise {partner?.name}! 💕
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
                {drawings.map((drawing) => {
                  const imgUrl = drawing.image_url || drawing.storage_path;
                  return (
                    <div
                      key={drawing.id}
                      onClick={() => setSelectedDrawing(drawing)}
                      className="group cursor-pointer rounded-3xl border-2 border-[#FCE1E8] bg-[#FFFFFF] p-3.5 shadow-xs transition-all hover:border-[#FF758C] hover:scale-[1.02] hover:shadow-md"
                    >
                      <div className="aspect-[4/3] w-full overflow-hidden rounded-2xl border border-[#FCE1E8] bg-[#FFFDFC]">
                        <img
                          src={imgUrl}
                          alt={drawing.caption || 'Drawing'}
                          className="h-full w-full object-contain group-hover:scale-105 transition-transform"
                        />
                      </div>
                      <div className="mt-3 px-1">
                        <span className="text-[10px] font-mono text-[#B2A49B] block">
                          {format(new Date(drawing.created_at), 'MMM dd, yyyy')}
                        </span>
                        <h4 className="font-serif text-sm font-bold text-[#2D2522] truncate mt-0.5">
                          {drawing.caption || 'Sweet Doodle 💕'}
                        </h4>
                        <span className="text-xs text-[#E11D48] font-mono font-bold mt-1 inline-block">
                          {drawing.is_me ? 'By you 💕' : `By ${drawing.sender?.name || partner?.name} ✨`}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Full Image Modal */}
        {selectedDrawing && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs">
            <div className="w-full max-w-xl rounded-3xl border-2 border-[#FCE1E8] bg-[#FFFFFF] p-6 shadow-2xl">
              <div className="flex items-center justify-between pb-3 border-b border-[#FCE1E8]">
                <div>
                  <h4 className="font-serif text-lg font-bold text-[#2D2522]">
                    {selectedDrawing.caption || 'Our Doodle 💕'}
                  </h4>
                  <span className="text-[10px] font-mono text-[#B2A49B]">
                    {format(new Date(selectedDrawing.created_at), 'EEEE, MMMM dd • hh:mm a')}
                  </span>
                </div>
                <button
                  onClick={() => setSelectedDrawing(null)}
                  className="rounded-full p-1.5 text-[#B2A49B] hover:text-[#E11D48]"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="mt-4 aspect-[4/3] w-full overflow-hidden rounded-2xl border border-[#FCE1E8] bg-[#FFFDFC]">
                <img
                  src={selectedDrawing.image_url || selectedDrawing.storage_path}
                  alt={selectedDrawing.caption || 'Drawing'}
                  className="h-full w-full object-contain"
                />
              </div>

              <div className="mt-4 flex justify-between items-center">
                <span className="text-xs font-mono font-bold text-[#E11D48]">
                  {selectedDrawing.is_me ? 'Drawn by you 💕' : `Drawn by ${selectedDrawing.sender?.name || partner?.name} ✨`}
                </span>
                <button
                  onClick={() => handleDownloadDrawing(selectedDrawing)}
                  className="flex items-center space-x-2 rounded-2xl bg-gradient-to-r from-[#FF758C] to-[#FF7EB3] px-4 py-2 text-xs font-bold text-white shadow-xs"
                >
                  <Download className="h-4 w-4" />
                  <span>Save to Device 💕</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
