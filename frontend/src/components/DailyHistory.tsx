'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { dailyApi } from '@/lib/api';
import { DailyHistoryDay, DailyResponse } from '@/types';
import { ChevronRight, Calendar, Archive, Bookmark, Sparkles, Heart } from 'lucide-react';
import { format, parseISO } from 'date-fns';

export const DailyHistory: React.FC = () => {
  const { profile, partner } = useAuth();
  const [historyList, setHistoryList] = useState<DailyHistoryDay[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [dateResponses, setDateResponses] = useState<{
    my_responses: DailyResponse[];
    partner_responses: DailyResponse[];
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);

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

  const fetchDateDetails = useCallback(async (dateStr: string) => {
    setIsLoadingDetails(true);
    try {
      const data = await dailyApi.getResponses(dateStr);
      setDateResponses({
        my_responses: data.my_responses || [],
        partner_responses: data.partner_responses || [],
      });
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

  return (
    <div className="w-full flex justify-center px-4 sm:px-6 lg:px-8 py-6 sm:py-8 lg:py-10">
      {/* Centered Memory Archive */}
      <div className="w-full max-w-[1100px] lg:max-w-[1240px] space-y-6 sm:space-y-8">
        {/* Header */}
        <div className="pb-6 border-b border-[#F4EBE6]">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-[#FAF5FF] px-3 py-1 border border-[#E9D5FF] text-xs font-mono uppercase tracking-wider text-[#9333EA] mb-2 shadow-2xs">
            <span>📸</span>
            <span>Our Keepsake Vault</span>
          </div>
          <h2 className="font-serif text-3xl sm:text-4xl font-bold text-[#2D2522]">
            Sweet Memories 💕
          </h2>
          <p className="mt-1.5 text-xs sm:text-sm text-[#7A6D65]">
            Revisit past love notes and daily reflections shared between you and {partner?.name}.
          </p>
        </div>

        {isLoading ? (
          <div className="flex h-64 items-center justify-center text-xs font-mono text-[#B2A49B]">
            Opening our memory scrapbook... 💕
          </div>
        ) : historyList.length === 0 ? (
          <div className="rounded-3xl border-2 border-[#FCE1E8] bg-[#FFFFFF] p-8 sm:p-14 text-center shadow-xs">
            <div className="h-14 w-14 rounded-3xl bg-[#FFF0F3] text-[#E11D48] flex items-center justify-center mx-auto mb-3 border border-[#FCE1E8] shadow-xs">
              <Heart className="h-7 w-7 fill-[#E11D48]" />
            </div>
            <h4 className="font-serif text-2xl font-bold text-[#2D2522]">No shared memories yet</h4>
            <p className="mt-1.5 text-xs sm:text-sm text-[#7A6D65] max-w-md mx-auto leading-relaxed">
              Answer today's Daily Questions to create your very first keepsake in this scrapbook! 💕
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 lg:gap-8 items-start">
            {/* Timeline Sidebar */}
            <div className="md:col-span-4 lg:col-span-4 space-y-2.5">
              <span className="text-[10px] font-mono uppercase tracking-widest text-[#B2A49B] font-bold">
                Memories Timeline ({historyList.length} {historyList.length === 1 ? 'day' : 'days'} 💕)
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
                      className={`min-w-[190px] md:min-w-0 md:w-full text-left rounded-3xl p-4 transition-all flex items-center justify-between border-2 shrink-0 ${
                        isSelected
                          ? 'border-[#FF758C] bg-gradient-to-r from-[#FFF5F7] to-[#FFF9F5] shadow-sm scale-[1.02]'
                          : 'border-[#F4EBE6] bg-[#FFFFFF] hover:bg-[#FFF5F7] text-[#7A6D65]'
                      }`}
                    >
                      <div>
                        <div className={`text-xs sm:text-sm font-bold font-mono ${isSelected ? 'text-[#E11D48]' : 'text-[#2D2522]'}`}>
                          🌸 {formatted}
                        </div>
                        <p className="mt-1 text-xs text-[#7A6D65] truncate max-w-[150px] md:max-w-[200px]">
                          {item.summary}
                        </p>
                      </div>

                      <ChevronRight
                        className={`hidden md:block h-4 w-4 shrink-0 ml-2 ${
                          isSelected ? 'text-[#E11D48]' : 'text-[#D1C2B8]'
                        }`}
                      />
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Date Details Reading Area */}
            <div className="md:col-span-8 lg:col-span-8">
              {isLoadingDetails ? (
                <div className="flex h-64 items-center justify-center rounded-3xl border border-[#FCE1E8] bg-[#FFFFFF] text-xs font-mono text-[#B2A49B]">
                  Unlocking memory... 💕
                </div>
              ) : dateResponses ? (
                <div className="space-y-6">
                  <div className="flex items-center gap-2.5 pb-4 border-b border-[#F4EBE6]">
                    <div className="h-8 w-8 rounded-2xl bg-[#FFF0F3] text-[#E11D48] flex items-center justify-center border border-[#FCE1E8]">
                      <Calendar className="h-4 w-4" />
                    </div>
                    <h3 className="font-serif text-2xl font-bold text-[#2D2522]">
                      {selectedDate ? format(parseISO(selectedDate), 'EEEE, MMMM dd, yyyy') : ''} 💕
                    </h3>
                  </div>

                  {/* Responses List */}
                  {dateResponses.my_responses.length === 0 && dateResponses.partner_responses.length === 0 ? (
                    <div className="rounded-3xl border-2 border-[#FCE1E8] bg-[#FFFFFF] p-8 text-center text-xs sm:text-sm text-[#7A6D65]">
                      No submitted memories recorded for this date.
                    </div>
                  ) : (
                    dateResponses.my_responses.map((myResp, idx) => {
                      const partnerResp = dateResponses.partner_responses.find(
                        (p) => p.question_id === myResp.question_id
                      );

                      return (
                        <div
                          key={myResp.id}
                          className="rounded-3xl border-2 border-[#FCE1E8] bg-[#FFFFFF] p-6 sm:p-7 space-y-4 shadow-[0_4px_20px_rgba(244,114,182,0.06)]"
                        >
                          <div className="flex items-baseline space-x-2.5">
                            <span className="font-mono text-sm text-[#E11D48] font-bold">🌸 {String(idx + 1).padStart(2, '0')} /</span>
                            <h4 className="font-serif text-lg sm:text-xl font-bold text-[#2D2522]">
                              {myResp.question_text}
                            </h4>
                          </div>

                          {/* My Answer */}
                          <div className="rounded-2xl border border-[#FED7AA] bg-[#FFF9F5] p-4 sm:p-5">
                            <span className="text-[10px] font-mono uppercase tracking-wider text-[#EA580C] font-bold">
                              {profile?.name} (You):
                            </span>
                            <p className="mt-1 text-xs sm:text-sm md:text-base text-[#2D2522] whitespace-pre-wrap leading-relaxed">
                              {myResp.answer || '(No answer recorded)'}
                            </p>
                          </div>

                          {/* Partner's Answer */}
                          {partnerResp ? (
                            <div className="rounded-2xl border-2 border-[#FCE1E8] bg-gradient-to-r from-[#FFF5F7] to-[#FFF9F5] p-4 sm:p-5">
                              <span className="text-[10px] font-mono uppercase tracking-wider text-[#E11D48] font-bold flex items-center gap-1">
                                <Sparkles className="h-3 w-3" />
                                {partner?.name}'s Answer 💕:
                              </span>
                              <p className="mt-1 text-xs sm:text-sm md:text-base text-[#2D2522] whitespace-pre-wrap leading-relaxed font-serif italic">
                                "{partnerResp.answer || '(No answer recorded)'}"
                              </p>
                            </div>
                          ) : (
                            <div className="text-xs font-mono text-[#B2A49B] italic px-1">
                              {partner?.name} didn't record an answer on this day.
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              ) : null}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
