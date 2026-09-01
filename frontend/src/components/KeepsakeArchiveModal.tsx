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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3 sm:p-6 backdrop-blur-[3px] overflow-y-auto">
      <div className="relative w-full max-w-4xl rounded-2xl border border-theme bg-theme-card shadow-2xl overflow-hidden flex flex-col max-h-[85vh] transition-colors">
        {/* Top Header */}
        <div className="flex items-center justify-between border-b border-theme bg-theme-page px-5 py-3.5 shrink-0">
          <div className="flex items-center space-x-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-[#125CB9] text-white">
              <BookOpen className="h-3.5 w-3.5" />
            </span>
            <div>
              <h2 className="font-serif text-base sm:text-lg font-bold text-theme-primary leading-none">Keepsake Archive</h2>
              <p className="text-[10px] font-mono text-theme-muted mt-0.5">Past daily love prompts answered together</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-1.5 text-theme-secondary hover:text-theme-primary hover:bg-theme-card transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-theme-card">
          {isLoading ? (
            <div className="flex h-64 items-center justify-center text-xs font-mono text-theme-muted">
              Loading archive...
            </div>
          ) : historyList.length === 0 ? (
            <div className="rounded-2xl border border-theme bg-theme-input p-8 text-center space-y-2">
              <Heart className="h-6 w-6 text-[#125CB9] mx-auto mb-1" />
              <h4 className="font-serif text-base text-theme-primary font-bold">No past reflections yet</h4>
              <p className="text-xs text-theme-secondary max-w-sm mx-auto">
                Submit today's daily prompts together to begin your shared keepsake archive.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-start">
              {/* Timeline Sidebar (Desktop 4 cols) */}
              <div className="md:col-span-4 space-y-2">
                <span className="text-[10px] font-mono uppercase tracking-wider text-theme-muted font-medium">
                  Entries ({historyList.length})
                </span>

                <div className="flex md:flex-col gap-1.5 overflow-x-auto md:overflow-x-visible md:max-h-[460px] md:overflow-y-auto pr-1">
                  {historyList.map((item) => {
                    const isSelected = selectedDate === item.date;
                    const formatted = format(parseISO(item.date), 'MMM dd, yyyy');

                    return (
                      <button
                        key={item.date}
                        onClick={() => setSelectedDate(item.date)}
                        className={`min-w-[150px] md:min-w-0 md:w-full text-left rounded-xl p-2.5 transition-all flex items-center justify-between border shrink-0 ${
                          isSelected
                            ? 'border-[#125CB9] bg-[#125CB9]/10 text-theme-primary font-semibold'
                            : 'border-theme bg-theme-input hover:bg-theme-card-hover text-theme-secondary'
                        }`}
                      >
                        <div className="truncate">
                          <div className="text-xs font-mono flex items-center gap-1.5">
                            <Heart className="h-3 w-3 text-[#125CB9] fill-current" />
                            {formatted}
                          </div>
                          <p className="mt-0.5 text-[10px] text-theme-muted truncate">{item.summary}</p>
                        </div>
                        <ChevronRight className={`h-3.5 w-3.5 shrink-0 ${isSelected ? 'text-[#125CB9]' : 'text-theme-muted'}`} />
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Day Responses Details (Desktop 8 cols) */}
              <div className="md:col-span-8">
                {isLoadingDetails ? (
                  <div className="flex h-64 items-center justify-center rounded-2xl border border-theme bg-theme-input text-xs font-mono text-theme-muted">
                    Loading answers...
                  </div>
                ) : dateResponses ? (
                  <div className="space-y-3.5">
                    <div className="pb-2.5 border-b border-theme flex items-center space-x-2">
                      <Calendar className="h-3.5 w-3.5 text-[#125CB9]" />
                      <h3 className="font-serif text-sm sm:text-base font-bold text-theme-primary">
                        {selectedDate ? format(parseISO(selectedDate), 'EEEE, MMMM dd, yyyy') : ''}
                      </h3>
                    </div>

                    <div className="space-y-3">
                      {dateResponses.questions.map((q, idx) => {
                        const myAns = dateResponses.my_responses.find((r) => r.question_id === q.id);
                        const partnerAns = dateResponses.partner_responses.find((r) => r.question_id === q.id);

                        return (
                          <div
                            key={q.id}
                            className="rounded-2xl border border-theme bg-theme-page p-3.5 space-y-2.5"
                          >
                            <h4 className="font-serif text-xs sm:text-sm font-bold text-theme-primary">
                              {idx + 1}. {q.question}
                            </h4>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                              {/* My Answer */}
                              <div className="rounded-xl border border-theme bg-theme-card p-3 text-xs text-theme-primary">
                                <span className="text-[10px] font-mono uppercase tracking-wider text-theme-muted block mb-1 font-medium">
                                  You:
                                </span>
                                {renderAnswerContent(myAns?.answer, true)}
                              </div>

                              {/* Partner's Answer */}
                              <div className="rounded-xl border border-[#125CB9]/20 bg-[#125CB9]/5 p-3 text-xs text-theme-primary">
                                <span className="text-[10px] font-mono uppercase tracking-wider text-[#125CB9] block mb-1 font-medium">
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
