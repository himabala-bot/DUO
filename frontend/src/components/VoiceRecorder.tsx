'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Mic, Square, Trash2, Send, Play, Pause, X } from 'lucide-react';
import { WaveformPlayer } from './WaveformPlayer';

interface VoiceRecorderProps {
  onSendVoice: (audioDataUrl: string, duration: number) => void;
  onCancel?: () => void;
  compact?: boolean;
}

export const VoiceRecorder: React.FC<VoiceRecorderProps> = ({
  onSendVoice,
  onCancel,
  compact = false,
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordTime, setRecordTime] = useState(0);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioDuration, setAudioDuration] = useState(0);
  const [permissionError, setPermissionError] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop();
      }
    };
  }, []);

  const startRecording = async () => {
    setPermissionError(false);
    setAudioUrl(null);
    audioChunksRef.current = [];

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = () => {
          const base64Data = reader.result as string;
          setAudioUrl(base64Data);
        };

        // Stop all audio tracks
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start(100);
      setIsRecording(true);
      startTimeRef.current = Date.now();
      setRecordTime(0);

      timerRef.current = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
        setRecordTime(elapsed);
        if (elapsed >= 120) {
          // Max 2 mins
          stopRecording();
        }
      }, 1000);
    } catch (err) {
      console.warn('Microphone access denied or error:', err);
      setPermissionError(true);
    }
  };

  const stopRecording = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    const duration = Math.max(1, Math.floor((Date.now() - startTimeRef.current) / 1000));
    setAudioDuration(duration);

    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
  };

  const cancelRecording = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
    setAudioUrl(null);
    setRecordTime(0);
    if (onCancel) onCancel();
  };

  const handleSend = () => {
    if (audioUrl) {
      onSendVoice(audioUrl, audioDuration || recordTime);
      setAudioUrl(null);
      setRecordTime(0);
    }
  };

  const formatTimer = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  if (permissionError) {
    return (
      <div className="flex items-center space-x-2 text-xs text-[#EA5E86] bg-[#FFF5F5] border border-[#FCC4C0] px-3.5 py-2 rounded-full">
        <span>Microphone access blocked. Please allow mic permission.</span>
        <button onClick={() => setPermissionError(false)} className="p-1 hover:text-[#422F0E]">
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    );
  }

  // State 1: Ready to Record
  if (!isRecording && !audioUrl) {
    return (
      <button
        type="button"
        onClick={startRecording}
        className="flex h-11 w-11 items-center justify-center rounded-full border border-[#EFE8DC] bg-[#FAF7F2] text-[#422F0E] hover:bg-[#FCC4C0]/40 hover:text-[#EA5E86] transition-all shadow-sm shrink-0"
        title="Record voice note"
        aria-label="Record voice note"
      >
        <Mic className="h-5 w-5" />
      </button>
    );
  }

  // State 2: Actively Recording
  if (isRecording) {
    return (
      <div className="flex items-center space-x-2.5 bg-[#FFF5F5] border border-[#FCC4C0] rounded-full px-4 py-1.5 shadow-sm animate-in fade-in duration-200">
        <span className="h-2.5 w-2.5 rounded-full bg-[#EA5E86] animate-ping" />
        <span className="text-xs font-mono font-medium text-[#EA5E86]">
          Rec {formatTimer(recordTime)}
        </span>

        {/* Animated Sound Wave Indicator */}
        <div className="flex items-center space-x-1 px-1">
          <span className="h-3 w-1 bg-[#EA5E86] rounded-full animate-bounce [animation-delay:0ms]" />
          <span className="h-5 w-1 bg-[#EA5E86] rounded-full animate-bounce [animation-delay:150ms]" />
          <span className="h-2 w-1 bg-[#EA5E86] rounded-full animate-bounce [animation-delay:300ms]" />
          <span className="h-4 w-1 bg-[#EA5E86] rounded-full animate-bounce [animation-delay:450ms]" />
        </div>

        {/* Stop Button */}
        <button
          type="button"
          onClick={stopRecording}
          className="flex h-7 w-7 items-center justify-center rounded-full bg-[#EA5E86] text-white hover:bg-[#D94E76] transition-colors"
          title="Done recording"
        >
          <Square className="h-3 w-3 fill-current" />
        </button>

        {/* Cancel Button */}
        <button
          type="button"
          onClick={cancelRecording}
          className="p-1 text-[#A89F91] hover:text-[#422F0E] rounded-full"
          title="Discard"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    );
  }

  // State 3: Recorded Audio Preview
  return (
    <div className="flex items-center space-x-2 bg-[#FAF7F2] border border-[#EFE8DC] rounded-full px-3 py-1 shadow-sm animate-in fade-in duration-200">
      {audioUrl && <WaveformPlayer audioUrl={audioUrl} duration={audioDuration} />}

      {/* Discard / Cancel */}
      <button
        type="button"
        onClick={cancelRecording}
        className="p-1.5 text-[#A89F91] hover:text-[#EA5E86] rounded-full hover:bg-black/5 transition-colors"
        title="Discard"
      >
        <Trash2 className="h-4 w-4" />
      </button>

      {/* Send Voice Note */}
      <button
        type="button"
        onClick={handleSend}
        className="flex h-8 w-8 items-center justify-center rounded-full bg-[#422F0E] text-white hover:bg-[#EA5E86] transition-colors shadow-sm shrink-0"
        title="Send voice note"
      >
        <Send className="h-3.5 w-3.5" />
      </button>
    </div>
  );
};
