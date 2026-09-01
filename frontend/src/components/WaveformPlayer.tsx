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
  const [audioDuration, setAudioDuration] = useState<number>(isFinite(duration) && duration > 0 ? duration : 0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Generate 24 aesthetic waveform bars
  const bars = [
    30, 45, 70, 85, 40, 60, 95, 80, 50, 75, 90, 65, 40, 55, 80, 100, 70, 45, 60, 85, 90, 50, 65, 40
  ];

  useEffect(() => {
    if (!audioUrl) return;
    const audio = new Audio(audioUrl);
    audioRef.current = audio;

    const updateDuration = () => {
      if (isFinite(audio.duration) && audio.duration > 0 && !isNaN(audio.duration)) {
        setAudioDuration(audio.duration);
      } else if (audio.duration === Infinity) {
        audio.currentTime = 1e101;
        audio.ontimeupdate = function () {
          this.ontimeupdate = () => {
            setCurrentTime(audio.currentTime);
          };
          if (isFinite(audio.duration) && audio.duration > 0) {
            setAudioDuration(audio.duration);
          }
          audio.currentTime = 0;
        };
      }
    };

    audio.addEventListener('loadedmetadata', updateDuration);
    audio.addEventListener('durationchange', updateDuration);
    audio.addEventListener('canplaythrough', updateDuration);

    audio.addEventListener('timeupdate', () => {
      setCurrentTime(audio.currentTime);
      if ((!audioDuration || !isFinite(audioDuration)) && isFinite(audio.duration) && audio.duration > 0) {
        setAudioDuration(audio.duration);
      }
    });

    audio.addEventListener('ended', () => {
      setIsPlaying(false);
      setCurrentTime(0);
    });

    audio.addEventListener('pause', () => {
      setIsPlaying(false);
    });

    audio.addEventListener('play', () => {
      setIsPlaying(true);
    });

    return () => {
      audio.pause();
      audio.src = '';
    };
  }, [audioUrl]);

  useEffect(() => {
    if (isFinite(duration) && duration > 0) {
      setAudioDuration(duration);
    }
  }, [duration]);

  const togglePlay = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().then(() => {
        setIsPlaying(true);
      }).catch((err) => {
        console.warn('Audio play error:', err);
        setIsPlaying(false);
      });
    }
  };

  const effectiveDuration = isFinite(audioDuration) && audioDuration > 0
    ? audioDuration
    : (duration && isFinite(duration) && duration > 0 ? duration : 0);

  const seekToPosition = (clientX: number, target: HTMLElement) => {
    if (!audioRef.current || !effectiveDuration) return;
    const rect = target.getBoundingClientRect();
    const pos = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    const seekTime = pos * effectiveDuration;
    audioRef.current.currentTime = seekTime;
    setCurrentTime(seekTime);
  };

  const handleSeekMouse = (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    seekToPosition(e.clientX, e.currentTarget);
  };

  const handleSeekTouch = (e: React.TouchEvent<HTMLDivElement>) => {
    e.stopPropagation();
    if (e.touches.length > 0) {
      seekToPosition(e.touches[0].clientX, e.currentTarget);
    }
  };

  const formatTime = (secs: number) => {
    if (!secs || isNaN(secs) || !isFinite(secs) || secs < 0) return '0:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const progressPercent = effectiveDuration > 0 ? (currentTime / effectiveDuration) * 100 : 0;

  return (
    <div className="flex items-center space-x-2.5 py-1 select-none min-w-0 w-full max-w-[270px]">
      {/* Play/Pause Button */}
      <button
        type="button"
        onClick={togglePlay}
        className={`flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-full transition-all shadow-xs shrink-0 ${
          isMe
            ? 'bg-white text-[#125CB9] hover:bg-white/90'
            : 'bg-[#125CB9] text-white hover:bg-[#0E4B99]'
        }`}
        aria-label={isPlaying ? 'Pause voice note' : 'Play voice note'}
      >
        {isPlaying ? (
          <Pause className="h-3.5 w-3.5 sm:h-4 sm:w-4 fill-current" />
        ) : (
          <Play className="h-3.5 w-3.5 sm:h-4 sm:w-4 ml-0.5 fill-current" />
        )}
      </button>

      {/* Waveform Bars Container */}
      <div className="flex-1 flex flex-col justify-center space-y-1 min-w-0">
        <div
          onClick={handleSeekMouse}
          onTouchStart={handleSeekTouch}
          onTouchMove={handleSeekTouch}
          className="relative flex items-center justify-between gap-[2px] h-6 sm:h-7 cursor-pointer group w-full touch-none"
          title="Click to seek"
        >
          {bars.map((heightPercent, idx) => {
            const barProgress = (idx / bars.length) * 100;
            const isPlayed = barProgress <= progressPercent;

            return (
              <span
                key={idx}
                style={{ height: `${heightPercent}%` }}
                className={`w-[2.5px] sm:w-[3px] rounded-full transition-all duration-150 shrink-0 ${
                  isPlayed
                    ? isMe
                      ? 'bg-white'
                      : 'bg-[#125CB9]'
                    : isMe
                    ? 'bg-white/35 group-hover:bg-white/55'
                    : 'bg-theme-muted/40 group-hover:bg-theme-muted/60'
                } ${isPlaying && isPlayed ? 'animate-pulse' : ''}`}
              />
            );
          })}
        </div>

        {/* Time Progress */}
        <div className="flex items-center justify-between text-[10px] font-mono opacity-80 leading-none px-0.5">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(effectiveDuration)}</span>
        </div>
      </div>
    </div>
  );
};

