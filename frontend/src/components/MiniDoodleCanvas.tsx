'use client';

import React, { useRef, useState, useEffect, useCallback } from 'react';
import { RotateCcw, Eraser, PenTool, Trash2 } from 'lucide-react';

interface MiniDoodleCanvasProps {
  onChange: (dataUrl: string | null) => void;
}

const DOODLE_COLORS = [
  { id: 'espresso', hex: '#422F0E', label: 'Espresso' },
  { id: 'berry', hex: '#EA5E86', label: 'Berry' },
  { id: 'forest', hex: '#037F71', label: 'Forest' },
  { id: 'sunset', hex: '#F49625', label: 'Sunset' },
  { id: 'teal', hex: '#57B1A8', label: 'Sage Teal' },
  { id: 'peach', hex: '#FFD094', label: 'Butter Peach' },
];

const BRUSH_SIZES = [
  { size: 3, label: 'Fine' },
  { size: 6, label: 'Medium' },
  { size: 12, label: 'Bold' },
];

export const MiniDoodleCanvas: React.FC<MiniDoodleCanvasProps> = ({ onChange }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const [isDrawing, setIsDrawing] = useState(false);
  const [color, setColor] = useState('#422F0E');
  const [brushSize, setBrushSize] = useState(4);
  const [isEraser, setIsEraser] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);
  const [history, setHistory] = useState<ImageData[]>([]);
  const lastPos = useRef<{ x: number; y: number } | null>(null);

  const initCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    setHistory([]);
    setHasDrawn(false);
    onChangeRef.current(null);
  }, []);

  // Initialize canvas only ONCE on mount
  useEffect(() => {
    initCanvas();
  }, [initCanvas]);

  const saveHistoryState = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const snapshot = ctx.getImageData(0, 0, canvas.width, canvas.height);
    setHistory((prev) => [...prev.slice(-15), snapshot]);
    setHasDrawn(true);
    onChangeRef.current(canvas.toDataURL('image/png'));
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

  const handleUndo = () => {
    if (history.length === 0) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const newHistory = [...history];
    newHistory.pop(); // remove current state
    setHistory(newHistory);

    if (newHistory.length > 0) {
      const prevSnapshot = newHistory[newHistory.length - 1];
      ctx.putImageData(prevSnapshot, 0, 0);
      onChangeRef.current(canvas.toDataURL('image/png'));
    } else {
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      setHasDrawn(false);
      onChangeRef.current(null);
    }
  };

  return (
    <div className="space-y-3 rounded-2xl border border-[#EFE8DC] bg-[#FAF7F2] p-3">
      {/* Canvas Header Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-1">
          {DOODLE_COLORS.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => {
                setColor(c.hex);
                setIsEraser(false);
              }}
              style={{ backgroundColor: c.hex }}
              className={`h-6 w-6 rounded-full border border-black/10 transition-transform ${
                !isEraser && color === c.hex
                  ? 'scale-110 ring-2 ring-[#422F0E]'
                  : 'hover:scale-105 opacity-80 hover:opacity-100'
              }`}
              title={c.label}
            />
          ))}

          <button
            type="button"
            onClick={() => setIsEraser(!isEraser)}
            className={`p-1.5 rounded-full border transition-all ml-1 ${
              isEraser
                ? 'bg-[#422F0E] text-[#FAF7F2] border-[#422F0E]'
                : 'border-[#EFE8DC] bg-white text-[#6B5E4E] hover:bg-[#F2ECE1]'
            }`}
            title="Eraser"
          >
            <Eraser className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Brush Size & Undo / Clear */}
        <div className="flex items-center space-x-1.5">
          <div className="flex items-center border border-[#EFE8DC] rounded-full bg-white px-1.5 py-0.5 gap-1">
            {BRUSH_SIZES.map((b) => (
              <button
                key={b.size}
                type="button"
                onClick={() => setBrushSize(b.size)}
                className={`p-1 rounded-full transition-all ${
                  brushSize === b.size ? 'bg-[#FCC4C0]/40 text-[#EA5E86]' : 'text-[#A89F91]'
                }`}
                title={b.label}
              >
                <div
                  className="rounded-full bg-current"
                  style={{ width: b.size === 3 ? 4 : b.size === 6 ? 6 : 8, height: b.size === 3 ? 4 : b.size === 6 ? 6 : 8 }}
                />
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={handleUndo}
            disabled={history.length === 0}
            className="p-1.5 rounded-full border border-[#EFE8DC] bg-white text-[#6B5E4E] hover:bg-[#F2ECE1] disabled:opacity-30"
            title="Undo"
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </button>

          <button
            type="button"
            onClick={initCanvas}
            disabled={!hasDrawn}
            className="p-1.5 rounded-full border border-[#EFE8DC] bg-white text-[#EA5E86] hover:bg-[#FFF5F5] disabled:opacity-30"
            title="Clear canvas"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* The Mini Drawing Canvas Surface */}
      <div className="relative w-full aspect-[16/9] sm:aspect-[2/1] rounded-xl border border-[#EFE8DC] bg-white overflow-hidden shadow-inner touch-none cursor-crosshair">
        <canvas
          ref={canvasRef}
          width={500}
          height={260}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
          className="w-full h-full block"
        />

        {!hasDrawn && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-xs font-mono text-[#A89F91] gap-1.5">
            <PenTool className="h-3.5 w-3.5 text-[#EA5E86]" />
            <span>Draw a cute doodle here for your partner</span>
          </div>
        )}
      </div>
    </div>
  );
};
