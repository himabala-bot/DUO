'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Mic, Square, Trash2, Send, X } from 'lucide-react';
import { WaveformPlayer } from './WaveformPlayer';

interface VoiceRecorderProps {
  onSendVoice: (audioDataUrl: string, duration: number) => void;
  onCancel?: () => void;
  onStateChange?: (state: 'idle' | 'recording' | 'preview') => void;
  compact?: boolean;
  showSendButton?: boolean;
}

export const VoiceRecorder: React.FC<VoiceRecorderProps> = ({
  onSendVoice,
  onCancel,
  onStateChange,
  compact = false,
  showSendButton = true,
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

  const notifyState = (state: 'idle' | 'recording' | 'preview') => {
    if (onStateChange) onStateChange(state);
  };

  const getSupportedMimeType = () => {
    if (typeof window === 'undefined' || typeof MediaRecorder === 'undefined') return '';
    const types = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/ogg;codecs=opus',
      'audio/mp4',
      'audio/aac',
    ];
    for (const type of types) {
      if (MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(type)) {
        return type;
      }
    }
    return '';
  };

  const startRecording = async () => {
    setPermissionError(false);
    setAudioUrl(null);
    audioChunksRef.current = [];

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const selectedMime = getSupportedMimeType();
      const options = selectedMime ? { mimeType: selectedMime } : undefined;
      const mediaRecorder = options ? new MediaRecorder(stream, options) : new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: selectedMime || 'audio/webm' });
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = () => {
          const base64Data = reader.result as string;
          setAudioUrl(base64Data);
          notifyState('preview');
        };

        // Stop all audio tracks
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start(100);
      setIsRecording(true);
      notifyState('recording');
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
      notifyState('idle');
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
    notifyState('idle');
    if (onCancel) onCancel();
  };

  const handleSend = () => {
    if (audioUrl) {
      onSendVoice(audioUrl, audioDuration || recordTime);
      setAudioUrl(null);
      setRecordTime(0);
      notifyState('idle');
    }
  };

  const formatTimer = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  if (permissionError) {
    return (
      <div className="flex items-center space-x-2 text-xs text-[#F43F5E] bg-[#F43F5E]/10 border border-[#F43F5E]/25 px-3.5 py-2 rounded-full">
        <span>Microphone access blocked. Please allow mic permission.</span>
        <button onClick={() => setPermissionError(false)} className="p-1 hover:text-theme-primary">
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
        className="flex h-10 w-10 items-center justify-center rounded-full border border-theme bg-theme-input text-theme-secondary hover:bg-[#125CB9]/15 hover:text-[#125CB9] hover:border-[#125CB9]/40 transition-colors shadow-xs shrink-0"
        title="Record voice note"
        aria-label="Record voice note"
      >
        <Mic className="h-4.5 w-4.5" />
      </button>
    );
  }

  // State 2: Actively Recording
  if (isRecording) {
    return (
      <div className="flex items-center justify-between space-x-2 bg-[#F43F5E]/10 border border-[#F43F5E]/30 rounded-full px-3 sm:px-4 py-1.5 shadow-xs animate-in fade-in duration-150 w-full min-w-0">
        <div className="flex items-center space-x-2 min-w-0">
          <span className="h-2.5 w-2.5 rounded-full bg-[#F43F5E] animate-ping shrink-0" />
          <span className="text-xs font-mono font-medium text-[#F43F5E] shrink-0">
            Rec {formatTimer(recordTime)}
          </span>

          {/* Animated Sound Wave Indicator */}
          <div className="flex items-center space-x-1 px-1">
            <span className="h-3 w-1 bg-[#F43F5E] rounded-full animate-bounce [animation-delay:0ms]" />
            <span className="h-5 w-1 bg-[#F43F5E] rounded-full animate-bounce [animation-delay:150ms]" />
            <span className="h-2 w-1 bg-[#F43F5E] rounded-full animate-bounce [animation-delay:300ms]" />
            <span className="h-4 w-1 bg-[#F43F5E] rounded-full animate-bounce [animation-delay:450ms]" />
          </div>
        </div>

        <div className="flex items-center space-x-1.5 shrink-0">
          {/* Stop / Done Button */}
          <button
            type="button"
            onClick={stopRecording}
            className="flex h-7 w-7 items-center justify-center rounded-full bg-[#F43F5E] text-white hover:bg-[#E11D48] transition-colors shadow-xs"
            title="Done recording"
          >
            <Square className="h-3 w-3 fill-current" />
          </button>

          {/* Cancel / Discard Button */}
          <button
            type="button"
            onClick={cancelRecording}
            className="p-1.5 text-theme-muted hover:text-[#F43F5E] rounded-full transition-colors"
            title="Discard"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  }

  // State 3: Recorded Audio Preview & Send
  return (
    <div className="flex items-center justify-between space-x-2 bg-theme-input border border-theme rounded-full px-2.5 sm:px-3 py-1 shadow-xs animate-in fade-in duration-150 w-full min-w-0">
      <div className="flex-1 min-w-0">
        {audioUrl && <WaveformPlayer audioUrl={audioUrl} duration={audioDuration || recordTime} />}
      </div>

      <div className="flex items-center space-x-1 shrink-0">
        {/* Discard / Cancel */}
        <button
          type="button"
          onClick={cancelRecording}
          className="p-1.5 text-theme-muted hover:text-[#F43F5E] rounded-full hover:bg-black/5 transition-colors"
          title="Discard"
        >
          <Trash2 className="h-4 w-4" />
        </button>

        {/* Send Voice Note */}
        {showSendButton && (
          <button
            type="button"
            onClick={handleSend}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-[#125CB9] text-white hover:bg-[#0E4B99] transition-colors shadow-xs shrink-0"
            title="Send voice note"
          >
            <Send className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </div>
  );
};

