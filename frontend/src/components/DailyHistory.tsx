'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { dailyApi } from '@/lib/api';
import { DailyHistoryDay, DailyResponse } from '@/types';
import {
  Calendar,
  ChevronRight,
  Clock,
  Sparkles,
  Heart,
  BookOpen,
} from 'lucide-react';
import { format, parseISO } from 'date-fns';

export const DailyHistory: React.FC = () => {
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
    fetchHistory();
  }, [fetchHistory]);

  useEffect(() => {
    if (selectedDate) {
      fetchDateDetails(selectedDate);
    }
  }, [selectedDate, fetchDateDetails]);

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center space-y-2">
          <Heart className="h-6 w-6 text-[#EA5E86] animate-bounce mx-auto" />
          <p className="text-xs font-mono text-[#A89F91]">Opening our scrapbook...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full flex justify-center px-4 sm:px-6 lg:px-8 py-6 sm:py-8 lg:py-10">
      {/* Centered Archive Layout (~1100–1240px) */}
      <div className="w-full max-w-[1240px] space-y-6 sm:space-y-8">
        {/* Header */}
        <div className="pb-6 border-b border-[#EFE8DC]">
          <div className="flex items-center space-x-1.5 text-xs font-mono text-[#A89F91]">
            <Sparkles className="h-3.5 w-3.5 text-[#F49625]" />
            <span>Archive & Scrapbook</span>
          </div>
          <h2 className="mt-1 font-serif text-2xl sm:text-3xl lg:text-4xl font-normal text-[#422F0E]">
            Our Shared Memories
          </h2>
          <p className="mt-1.5 text-xs sm:text-sm text-[#6B5E4E]">
            Every past daily reflection answered by you and {partner?.name}, preserved forever.
          </p>
        </div>

        {historyList.length === 0 ? (
          <div className="rounded-3xl border border-[#EFE8DC] bg-[#FFFFFF] p-8 sm:p-12 text-center shadow-sm">
            <Heart className="h-8 w-8 text-[#FCC4C0] mx-auto mb-3" />
            <h4 className="font-serif text-xl text-[#422F0E]">No shared memories yet</h4>
            <p className="mt-1.5 text-xs sm:text-sm text-[#6B5E4E] max-w-md mx-auto leading-relaxed">
              Answer today's Daily Questions together to create your first keepsake in this scrapbook.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 lg:gap-8 items-start">
            {/* Timeline Sidebar (Desktop 4 cols) */}
            <div className="md:col-span-4 lg:col-span-4 space-y-2.5">
              <span className="text-[10px] font-mono uppercase tracking-widest text-[#A89F91]">
                Timeline ({historyList.length} {historyList.length === 1 ? 'day' : 'days'})
              </span>

              {/* Mobile Horizontal Carousel / Desktop Vertical List */}
              <div className="flex md:flex-col gap-2.5 overflow-x-auto md:overflow-x-visible md:max-h-[680px] md:overflow-y-auto pb-2 md:pb-0 pr-1">
                {historyList.map((item) => {
                  const isSelected = selectedDate === item.date;
                  const formatted = format(parseISO(item.date), 'MMM dd, yyyy');

                  return (
                    <button
                      key={item.date}
                      onClick={() => setSelectedDate(item.date)}
                      className={`min-w-[180px] md:min-w-0 md:w-full text-left rounded-3xl p-4 transition-all flex items-center justify-between border shrink-0 ${
                        isSelected
                          ? 'border-[#422F0E] bg-[#FFFFFF] shadow-md ring-2 ring-[#FCC4C0]/40'
                          : 'border-[#EFE8DC] bg-[#FAF7F2] hover:bg-[#F2ECE1] text-[#6B5E4E]'
                      }`}
                    >
                      <div>
                        <div className="text-xs sm:text-sm font-semibold text-[#422F0E] font-mono flex items-center gap-1.5">
                          <Heart className="h-3 w-3 text-[#EA5E86] fill-current" />
                          {formatted}
                        </div>
                        <p className="mt-1 text-xs text-[#6B5E4E] truncate max-w-[150px] md:max-w-[200px]">
                          {item.summary}
                        </p>
                      </div>

                      <ChevronRight
                        className={`hidden md:block h-4 w-4 shrink-0 ml-2 ${
                          isSelected ? 'text-[#EA5E86]' : 'text-[#A89F91]'
                        }`}
                      />
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Date Details Reading Area (Desktop 8 cols) */}
            <div className="md:col-span-8 lg:col-span-8">
              {isLoadingDetails ? (
                <div className="flex h-64 items-center justify-center rounded-3xl border border-[#EFE8DC] bg-[#FFFFFF] text-xs sm:text-sm font-mono text-[#A89F91]">
                  Opening keepsake...
                </div>
              ) : dateResponses ? (
                <div className="space-y-6">
                  <div className="flex items-center gap-2.5 pb-4 border-b border-[#EFE8DC]">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#FFD094]/40 text-[#F49625]">
                      <Calendar className="h-4 w-4" />
                    </div>
                    <h3 className="font-serif text-xl sm:text-2xl font-normal text-[#422F0E]">
                      {selectedDate ? format(parseISO(selectedDate), 'EEEE, MMMM dd, yyyy') : ''}
                    </h3>
                  </div>

                  <div className="space-y-6">
                    {dateResponses.questions.map((q, idx) => {
                      const myAns = dateResponses.my_responses.find((r) => r.question_id === q.id);
                      const partnerAns = dateResponses.partner_responses.find((r) => r.question_id === q.id);

                      return (
                        <div
                          key={q.id}
                          className="rounded-3xl border border-[#EFE8DC] bg-[#FFFFFF] p-5 sm:p-7 shadow-[0_2px_12px_rgba(66,47,14,0.03)] space-y-4"
                        >
                          <div className="flex items-baseline space-x-2">
                            <span className="font-mono text-xs text-[#A89F91] font-semibold">
                              {String(idx + 1).padStart(2, '0')}.
                            </span>
                            <h4 className="font-serif text-lg font-medium text-[#422F0E]">
                              {q.question}
                            </h4>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-[#F5EFE6]">
                            {/* My Answer */}
                            <div className="rounded-2xl border border-[#EFE8DC] bg-[#FAF7F2] p-4">
                              <span className="text-[10px] font-mono uppercase tracking-widest text-[#A89F91] font-medium flex items-center gap-1">
                                <Heart className="h-2.5 w-2.5 text-[#EA5E86] fill-current" />
                                You wrote:
                              </span>
                              <p className="mt-1.5 text-xs sm:text-sm text-[#422F0E] whitespace-pre-wrap leading-relaxed">
                                {myAns?.answer || '(No response recorded)'}
                              </p>
                            </div>

                            {/* Partner's Answer */}
                            <div className="rounded-2xl border border-[#FCC4C0]/40 bg-[#FFF8FA] p-4">
                              <span className="text-[10px] font-mono uppercase tracking-widest text-[#EA5E86] font-medium flex items-center gap-1">
                                <Heart className="h-2.5 w-2.5 fill-current" />
                                {partner?.name} wrote:
                              </span>
                              <p className="mt-1.5 text-xs sm:text-sm text-[#422F0E] whitespace-pre-wrap leading-relaxed font-serif italic">
                                {partnerAns?.answer ? `"${partnerAns.answer}"` : '(No response recorded)'}
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="flex h-64 items-center justify-center rounded-3xl border border-[#EFE8DC] bg-[#FFFFFF] text-xs sm:text-sm font-mono text-[#A89F91]">
                  Select a date to open memories
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
