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
  Feather,
  Sparkles,
} from 'lucide-react';
import { Drawing } from '@/types';
import { format } from 'date-fns';
import { RealtimeChannel } from '@supabase/supabase-js';

const PALETTE_COLORS = [
  { name: 'Deep Ink', value: '#292522' },
  { name: 'Warm Terracotta', value: '#C96A4A' },
  { name: 'Dusty Rose', value: '#C9827A' },
  { name: 'Soft Peach', value: '#F2C9B8' },
  { name: 'Sage Green', value: '#A8B5A0' },
  { name: 'Pale Butter', value: '#E8D99B' },
  { name: 'Soft Lavender', value: '#C9BDD8' },
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
  const [color, setColor] = useState<string>('#292522');
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
    if (!confirm('Clear canvas?')) return;
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
        console.warn('Storage upload bypassed, saving directly:', uploadErr);
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
        <div className="flex flex-col sm:flex-row sm:items-baseline justify-between pb-6 border-b border-[#EBE5DA] gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 rounded-md bg-[#F4F6F2] px-2.5 py-0.5 border border-[#DFE5DA] text-[11px] font-mono uppercase tracking-wider text-[#5E8056] mb-2">
              <Palette className="h-3 w-3" />
              <span>Sketchbook Desk</span>
            </div>
            <h2 className="font-serif text-2xl sm:text-3xl lg:text-4xl font-normal text-[#292522]">
              Shared Sketchbook
            </h2>
            <p className="mt-1.5 text-xs sm:text-sm text-[#7A7267]">
              Draw handwritten notes, sketches, and doodles for {partner?.name}.
            </p>
          </div>

          <div className="flex border border-[#E8DFD3] rounded-full bg-[#FAF5EE] p-1 self-start sm:self-auto shadow-2xs">
            <button
              onClick={() => setActiveTab('canvas')}
              className={`flex items-center space-x-2 rounded-full px-4 py-1.5 text-xs sm:text-sm font-medium transition-all ${
                activeTab === 'canvas'
                  ? 'bg-[#FFFFFF] text-[#C96A4A] shadow-xs font-semibold'
                  : 'text-[#7A7267] hover:text-[#292522]'
              }`}
            >
              <Palette className="h-4 w-4" />
              <span>Studio</span>
            </button>
            <button
              onClick={() => setActiveTab('gallery')}
              className={`flex items-center space-x-2 rounded-full px-4 py-1.5 text-xs sm:text-sm font-medium transition-all ${
                activeTab === 'gallery'
                  ? 'bg-[#FFFFFF] text-[#C96A4A] shadow-xs font-semibold'
                  : 'text-[#7A7267] hover:text-[#292522]'
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
              <div className="w-full overflow-hidden rounded-2xl sm:rounded-3xl border border-[#EBE5DA] bg-[#FFFFFF] p-2.5 sm:p-3 shadow-[0_4px_24px_rgba(41,37,34,0.03)]">
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
                  placeholder="Add a note or title to this doodle (optional)..."
                  maxLength={100}
                  className="flex-1 rounded-2xl border border-[#E8DFD3] bg-[#FFFFFF] px-4 py-3 text-xs sm:text-sm text-[#292522] placeholder-[#A89F91] focus:border-[#C96A4A] focus:outline-none focus:ring-1 focus:ring-[#C96A4A] shadow-2xs"
                />
                <button
                  onClick={handleSendDrawing}
                  disabled={isSending}
                  className="flex items-center justify-center space-x-2 rounded-2xl bg-[#C96A4A] px-6 py-3 text-xs sm:text-sm font-medium text-white hover:bg-[#B75C3E] transition-all disabled:opacity-40 min-h-[44px] shadow-[0_2px_8px_rgba(201,106,74,0.2)] shrink-0"
                >
                  <span>{isSending ? 'Sending...' : `Send to ${partner?.name || 'Partner'}`}</span>
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Tools & Palette Sidebar (Desktop 4-3 cols) */}
            <div className="lg:col-span-4 xl:col-span-3 rounded-2xl sm:rounded-3xl border border-[#EBE5DA] bg-[#FFFFFF] p-5 sm:p-6 shadow-[0_2px_12px_rgba(41,37,34,0.03)] flex flex-col gap-6">
              {/* History Actions */}
              <div>
                <span className="text-[10px] font-mono uppercase tracking-widest text-[#A89F91]">Actions</span>
                <div className="mt-2.5 flex gap-2">
                  <button
                    onClick={handleUndo}
                    disabled={historyIndex <= 0}
                    title="Undo"
                    className="flex-1 flex items-center justify-center rounded-xl border border-[#E8DFD3] bg-[#FAF8F5] p-3 text-[#696156] hover:bg-[#FAF1EC] hover:text-[#C96A4A] disabled:opacity-30 min-h-[42px] transition-all"
                  >
                    <RotateCcw className="h-4 w-4" />
                  </button>
                  <button
                    onClick={handleRedo}
                    disabled={historyIndex >= history.length - 1}
                    title="Redo"
                    className="flex-1 flex items-center justify-center rounded-xl border border-[#E8DFD3] bg-[#FAF8F5] p-3 text-[#696156] hover:bg-[#FAF1EC] hover:text-[#C96A4A] disabled:opacity-30 min-h-[42px] transition-all"
                  >
                    <RotateCw className="h-4 w-4" />
                  </button>
                  <button
                    onClick={handleClear}
                    title="Clear Canvas"
                    className="flex items-center justify-center rounded-xl border border-[#E8DFD3] bg-[#FAF8F5] p-3 text-[#A89F91] hover:bg-[#FAF0ED] hover:text-[#C96A4A] min-h-[42px] transition-all"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Tool Mode: Pen vs Eraser */}
              <div>
                <span className="text-[10px] font-mono uppercase tracking-widest text-[#A89F91]">Tool Mode</span>
                <div className="mt-2.5 flex gap-2">
                  <button
                    onClick={() => setIsEraser(false)}
                    className={`flex-1 flex items-center justify-center space-x-2 rounded-xl py-2.5 text-xs font-medium border transition-all ${
                      !isEraser
                        ? 'bg-[#FAF1EC] border-[#F0DDD4] text-[#C96A4A] font-semibold'
                        : 'border-[#E8DFD3] bg-[#FAF8F5] text-[#7A7267] hover:bg-[#FAF5EE]'
                    }`}
                  >
                    <Palette className="h-4 w-4" />
                    <span>Ink Pen</span>
                  </button>
                  <button
                    onClick={() => setIsEraser(true)}
                    className={`flex-1 flex items-center justify-center space-x-2 rounded-xl py-2.5 text-xs font-medium border transition-all ${
                      isEraser
                        ? 'bg-[#FAF1EC] border-[#F0DDD4] text-[#C96A4A] font-semibold'
                        : 'border-[#E8DFD3] bg-[#FAF8F5] text-[#7A7267] hover:bg-[#FAF5EE]'
                    }`}
                  >
                    <Eraser className="h-4 w-4" />
                    <span>Eraser</span>
                  </button>
                </div>
              </div>

              {/* Color Swatches */}
              <div>
                <span className="text-[10px] font-mono uppercase tracking-widest text-[#A89F91]">Ink Palette</span>
                <div className="mt-2.5 grid grid-cols-4 gap-2.5">
                  {PALETTE_COLORS.map((c) => (
                    <button
                      key={c.value}
                      onClick={() => {
                        setColor(c.value);
                        setIsEraser(false);
                      }}
                      title={c.name}
                      style={{ backgroundColor: c.value }}
                      className={`h-9 w-full rounded-xl border transition-all flex items-center justify-center ${
                        color === c.value && !isEraser
                          ? 'border-[#292522] scale-110 shadow-md ring-2 ring-[#C96A4A]/30'
                          : 'border-[#E8DFD3] hover:scale-105'
                      }`}
                    >
                      {color === c.value && !isEraser && (
                        <Check className={`h-4 w-4 ${c.value === '#FFFFFF' || c.value === '#E8D99B' || c.value === '#F2C9B8' ? 'text-[#292522]' : 'text-white'}`} />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Brush Size */}
              <div>
                <span className="text-[10px] font-mono uppercase tracking-widest text-[#A89F91]">Stroke Width</span>
                <div className="mt-2.5 grid grid-cols-4 gap-2">
                  {SIZES.map((s) => (
                    <button
                      key={s.value}
                      onClick={() => setBrushSize(s.value)}
                      className={`rounded-xl py-2 text-xs font-mono border transition-all ${
                        brushSize === s.value
                          ? 'bg-[#292522] text-white border-[#292522] font-semibold'
                          : 'border-[#E8DFD3] bg-[#FAF8F5] text-[#7A7267] hover:bg-[#FAF5EE]'
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
          /* Archive Gallery */
          <div className="space-y-6">
            {drawings.length === 0 ? (
              <div className="rounded-3xl border border-[#EBE5DA] bg-[#FFFFFF] p-8 sm:p-14 text-center shadow-2xs">
                <div className="h-12 w-12 rounded-2xl bg-[#F4F6F2] text-[#5E8056] flex items-center justify-center mx-auto mb-3 border border-[#DFE5DA]">
                  <Palette className="h-6 w-6" />
                </div>
                <h4 className="font-serif text-xl text-[#292522]">No sketches in the gallery</h4>
                <p className="mt-1.5 text-xs sm:text-sm text-[#7A7267] max-w-sm mx-auto">
                  Create your first drawing in the Studio and send it to your partner.
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
                      className="group cursor-pointer rounded-2xl sm:rounded-3xl border border-[#EBE5DA] bg-[#FFFFFF] p-3 shadow-2xs transition-all hover:border-[#C96A4A] hover:shadow-md"
                    >
                      <div className="aspect-[4/3] w-full overflow-hidden rounded-xl border border-[#F0EBE1] bg-[#FAF8F5]">
                        <img
                          src={imgUrl}
                          alt={drawing.caption || 'Drawing'}
                          className="h-full w-full object-contain group-hover:scale-105 transition-transform"
                        />
                      </div>
                      <div className="mt-2.5 px-1">
                        <span className="text-[10px] font-mono text-[#A89F91] block">
                          {format(new Date(drawing.created_at), 'MMM dd, yyyy')}
                        </span>
                        <h4 className="font-serif text-sm font-medium text-[#292522] truncate mt-0.5">
                          {drawing.caption || 'Untitled Sketch'}
                        </h4>
                        <span className="text-[11px] text-[#C96A4A] font-mono mt-1 inline-block">
                          {drawing.is_me ? 'By you' : `By ${drawing.sender?.name || partner?.name}`}
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
            <div className="w-full max-w-xl rounded-3xl border border-[#EBE5DA] bg-[#FFFFFF] p-6 shadow-xl">
              <div className="flex items-center justify-between pb-3 border-b border-[#EBE5DA]">
                <div>
                  <h4 className="font-serif text-lg text-[#292522]">
                    {selectedDrawing.caption || 'Shared Sketch'}
                  </h4>
                  <span className="text-[10px] font-mono text-[#A89F91]">
                    {format(new Date(selectedDrawing.created_at), 'EEEE, MMMM dd, yyyy • hh:mm a')}
                  </span>
                </div>
                <button
                  onClick={() => setSelectedDrawing(null)}
                  className="rounded-full p-1.5 text-[#A89F91] hover:text-[#292522]"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="mt-4 aspect-[4/3] w-full overflow-hidden rounded-2xl border border-[#EBE5DA] bg-[#FAF8F5]">
                <img
                  src={selectedDrawing.image_url || selectedDrawing.storage_path}
                  alt={selectedDrawing.caption || 'Drawing'}
                  className="h-full w-full object-contain"
                />
              </div>

              <div className="mt-4 flex justify-between items-center">
                <span className="text-xs font-mono text-[#C96A4A]">
                  {selectedDrawing.is_me ? 'Drawn by you' : `Drawn by ${selectedDrawing.sender?.name || partner?.name}`}
                </span>
                <button
                  onClick={() => handleDownloadDrawing(selectedDrawing)}
                  className="flex items-center space-x-2 rounded-xl bg-[#292522] px-4 py-2 text-xs font-medium text-white hover:bg-[#C96A4A] transition-all shadow-xs"
                >
                  <Download className="h-4 w-4" />
                  <span>Download</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
