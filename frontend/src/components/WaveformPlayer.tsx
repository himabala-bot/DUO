'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause } from 'lucide-react';

interface WaveformPlayerProps {
  audioUrl: string;
  duration?: number;
  isMe?: boolean;
}

export const WaveformPlayer: React.FC<WaveformPlayerProps> = ({ audioUrl, duration = 0, isMe = false }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [audioDuration, setAudioDuration] = useState(duration);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Generate 28 waveform bars with pseudo-random aesthetic heights
  const bars = [
    30, 45, 70, 85, 40, 60, 95, 80, 50, 75, 90, 65, 40, 55, 80, 100, 70, 45, 60, 85, 90, 50, 65, 40, 75, 60, 45, 30
  ];

  useEffect(() => {
    const audio = new Audio(audioUrl);
    audioRef.current = audio;

    audio.addEventListener('loadedmetadata', () => {
      if (audio.duration && !isNaN(audio.duration)) {
        setAudioDuration(audio.duration);
      }
    });

    audio.addEventListener('timeupdate', () => {
      setCurrentTime(audio.currentTime);
    });

    audio.addEventListener('ended', () => {
      setIsPlaying(false);
      setCurrentTime(0);
    });

    return () => {
      audio.pause();
      audio.src = '';
    };
  }, [audioUrl]);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().catch((err) => console.warn('Audio play error:', err));
      setIsPlaying(true);
    }
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!audioRef.current || !audioDuration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pos = (e.clientX - rect.left) / rect.width;
    const seekTime = Math.max(0, Math.min(audioDuration, pos * audioDuration));
    audioRef.current.currentTime = seekTime;
    setCurrentTime(seekTime);
  };

  const formatTime = (secs: number) => {
    if (isNaN(secs) || secs < 0) return '0:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const progressPercent = audioDuration > 0 ? (currentTime / audioDuration) * 100 : 0;

  return (
    <div className="flex items-center space-x-3 py-1 select-none min-w-[200px] max-w-[290px]">
      {/* Play/Pause Button */}
      <button
        type="button"
        onClick={togglePlay}
        className={`flex h-9 w-9 items-center justify-center rounded-full transition-all shadow-sm shrink-0 ${
          isMe
            ? 'bg-[#FAF7F2] text-[#422F0E] hover:bg-[#FCC4C0]'
            : 'bg-[#422F0E] text-[#FAF7F2] hover:bg-[#EA5E86]'
        }`}
        aria-label={isPlaying ? 'Pause voice note' : 'Play voice note'}
      >
        {isPlaying ? <Pause className="h-4 w-4 fill-current" /> : <Play className="h-4 w-4 ml-0.5 fill-current" />}
      </button>

      {/* Waveform Bars Container */}
      <div className="flex-1 flex flex-col justify-center space-y-1">
        <div
          onClick={handleSeek}
          className="relative flex items-center gap-[2.5px] h-7 cursor-pointer group"
          title="Click to seek"
        >
          {bars.map((heightPercent, idx) => {
            const barProgress = (idx / bars.length) * 100;
            const isPlayed = barProgress <= progressPercent;

            return (
              <span
                key={idx}
                style={{ height: `${heightPercent}%` }}
                className={`w-[3px] rounded-full transition-all duration-150 ${
                  isPlayed
                    ? isMe
                      ? 'bg-[#FCC4C0]'
                      : 'bg-[#EA5E86]'
                    : isMe
                    ? 'bg-white/30 group-hover:bg-white/50'
                    : 'bg-[#D4CEC2] group-hover:bg-[#A89F91]'
                } ${isPlaying && isPlayed ? 'animate-pulse' : ''}`}
              />
            );
          })}
        </div>

        {/* Time Progress */}
        <div className="flex items-center justify-between text-[10px] font-mono opacity-80 leading-none">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(audioDuration || duration)}</span>
        </div>
      </div>
    </div>
  );
};
