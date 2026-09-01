'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { dailyApi } from '@/lib/api';
import { DailyHistoryDay, DailyResponse } from '@/types';
import {
  X,
  Calendar,
  ChevronRight,
  Sparkles,
  Heart,
  BookOpen,
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { WaveformPlayer } from './WaveformPlayer';

interface KeepsakeArchiveModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const KeepsakeArchiveModal: React.FC<KeepsakeArchiveModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { partner } = useAuth();
  const [historyList, setHistoryList] = useState<DailyHistoryDay[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [dateResponses, setDateResponses] = useState<{
    date: string;
    questions: { id: string; question: string }[];
    my_responses: DailyResponse[];
    partner_responses: DailyResponse[];
  } | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isLoadingDetails, setIsLoadingDetails] = useState<boolean>(false);

  const fetchHistory = useCallback(async () => {
    try {
      const res = await dailyApi.getHistory();
      setHistoryList(res.history || []);
      if (res.history && res.history.length > 0) {
        setSelectedDate(res.history[0].date);
      }
    } catch (err) {
      console.warn('Failed to load history:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchDateDetails = useCallback(async (date: string) => {
    setIsLoadingDetails(true);
    try {
      const data = await dailyApi.getResponses(date);
      setDateResponses(data as any);
    } catch (err) {
      console.warn('Failed to load date details:', err);
    } finally {
      setIsLoadingDetails(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      fetchHistory();
    }
  }, [isOpen, fetchHistory]);

  useEffect(() => {
    if (selectedDate && isOpen) {
      fetchDateDetails(selectedDate);
    }
  }, [selectedDate, isOpen, fetchDateDetails]);

  if (!isOpen) return null;

  const renderAnswerContent = (text?: string, isMe = false) => {
    if (!text) return <span className="italic opacity-60">(No response recorded)</span>;
    if (text.startsWith('[voice:')) {
      try {
        const jsonStr = text.substring(7, text.length - 1);
        const data = JSON.parse(jsonStr);
        return <WaveformPlayer audioUrl={data.url} duration={data.duration} isMe={isMe} />;
      } catch {
        return <p>{text}</p>;
      }
    }
    return <p className="whitespace-pre-wrap leading-relaxed">{text}</p>;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3 sm:p-6 backdrop-blur-[4px] overflow-y-auto">
      <div className="relative w-full max-w-4xl rounded-3xl border border-theme bg-theme-card shadow-2xl overflow-hidden flex flex-col max-h-[90vh] transition-colors">
        {/* Top Header */}
        <div className="flex items-center justify-between border-b border-theme bg-theme-page px-6 py-4 shrink-0">
          <div className="flex items-center space-x-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#5B58E6] text-white">
              <BookOpen className="h-3.5 w-3.5" />
            </span>
            <div>
              <h2 className="font-serif text-xl sm:text-2xl font-bold text-theme-primary">Keepsake Archive</h2>
              <p className="text-[11px] font-mono text-theme-muted">Past daily love prompts answered together</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-1.5 text-theme-secondary hover:text-theme-primary hover:bg-theme-card transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-7 bg-theme-card">
          {isLoading ? (
            <div className="flex h-64 items-center justify-center text-xs sm:text-sm font-mono text-theme-muted">
              Opening scrapbook...
            </div>
          ) : historyList.length === 0 ? (
            <div className="rounded-3xl border border-theme bg-theme-input p-8 text-center space-y-2">
              <Heart className="h-8 w-8 text-[#5B58E6] mx-auto mb-1" />
              <h4 className="font-serif text-xl text-theme-primary font-bold">No past reflections yet</h4>
              <p className="text-xs sm:text-sm text-theme-secondary max-w-sm mx-auto">
                Submit today's daily prompts together to begin your lifelong archive!
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
              {/* Timeline Sidebar (Desktop 4 cols) */}
              <div className="md:col-span-4 space-y-2.5">
                <span className="text-[10px] font-mono uppercase tracking-widest text-theme-muted">
                  Dates ({historyList.length})
                </span>

                <div className="flex md:flex-col gap-2 overflow-x-auto md:overflow-x-visible md:max-h-[500px] md:overflow-y-auto pr-1">
                  {historyList.map((item) => {
                    const isSelected = selectedDate === item.date;
                    const formatted = format(parseISO(item.date), 'MMM dd, yyyy');

                    return (
                      <button
                        key={item.date}
                        onClick={() => setSelectedDate(item.date)}
                        className={`min-w-[160px] md:min-w-0 md:w-full text-left rounded-2xl p-3.5 transition-all flex items-center justify-between border shrink-0 ${
                          isSelected
                            ? 'border-[#5B58E6] bg-[#5B58E6]/10 shadow-sm ring-2 ring-[#5B58E6]/30 font-semibold text-theme-primary'
                            : 'border-theme bg-theme-input hover:bg-theme-card-hover text-theme-secondary'
                        }`}
                      >
                        <div className="truncate">
                          <div className="text-xs sm:text-sm font-mono flex items-center gap-1.5">
                            <Heart className="h-3 w-3 text-[#5B58E6] fill-current" />
                            {formatted}
                          </div>
                          <p className="mt-0.5 text-[11px] text-theme-muted truncate">{item.summary}</p>
                        </div>
                        <ChevronRight className={`h-4 w-4 shrink-0 ${isSelected ? 'text-[#5B58E6]' : 'text-theme-muted'}`} />
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Day Responses Details (Desktop 8 cols) */}
              <div className="md:col-span-8">
                {isLoadingDetails ? (
                  <div className="flex h-64 items-center justify-center rounded-3xl border border-theme bg-theme-input text-xs font-mono text-theme-muted">
                    Opening entry...
                  </div>
                ) : dateResponses ? (
                  <div className="space-y-4">
                    <div className="pb-3 border-b border-theme flex items-center space-x-2">
                      <Calendar className="h-4 w-4 text-[#5B58E6]" />
                      <h3 className="font-serif text-lg sm:text-xl font-bold text-theme-primary">
                        {selectedDate ? format(parseISO(selectedDate), 'EEEE, MMMM dd, yyyy') : ''}
                      </h3>
                    </div>

                    <div className="space-y-4">
                      {dateResponses.questions.map((q, idx) => {
                        const myAns = dateResponses.my_responses.find((r) => r.question_id === q.id);
                        const partnerAns = dateResponses.partner_responses.find((r) => r.question_id === q.id);

                        return (
                          <div
                            key={q.id}
                            className="rounded-3xl border border-theme bg-theme-page p-4 sm:p-5 space-y-3"
                          >
                            <h4 className="font-serif text-sm sm:text-base font-bold text-theme-primary">
                              {idx + 1}. {q.question}
                            </h4>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                              {/* My Answer */}
                              <div className="rounded-2xl border border-theme bg-theme-card p-3.5 text-xs text-theme-primary">
                                <span className="text-[10px] font-mono uppercase tracking-widest text-theme-muted block mb-1">
                                  You:
                                </span>
                                {renderAnswerContent(myAns?.answer, true)}
                              </div>

                              {/* Partner's Answer */}
                              <div className="rounded-2xl border border-[#5B58E6]/20 bg-[#5B58E6]/5 p-3.5 text-xs text-theme-primary">
                                <span className="text-[10px] font-mono uppercase tracking-widest text-[#5B58E6] block mb-1">
                                  {partner?.name || 'Partner'}:
                                </span>
                                {renderAnswerContent(partnerAns?.answer, false)}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
