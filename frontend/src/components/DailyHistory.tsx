'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { dailyApi } from '@/lib/api';
import { DailyHistoryDay, DailyResponse } from '@/types';
import { ChevronRight, Calendar, Archive, Bookmark, Sparkles } from 'lucide-react';
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
      {/* Centered Memory Archive Workspace (~1100–1240px) */}
      <div className="w-full max-w-[1100px] lg:max-w-[1240px] space-y-6 sm:space-y-8">
        {/* Header */}
        <div className="pb-6 border-b border-[#EBE5DA]">
          <div className="inline-flex items-center gap-1.5 rounded-md bg-[#F6F4F9] px-2.5 py-0.5 border border-[#E3DDEB] text-[11px] font-mono uppercase tracking-wider text-[#7B6A96] mb-2">
            <Archive className="h-3 w-3" />
            <span>Shared Journal Archive</span>
          </div>
          <h2 className="font-serif text-2xl sm:text-3xl lg:text-4xl font-normal text-[#292522]">
            Memory Archive
          </h2>
          <p className="mt-1.5 text-xs sm:text-sm text-[#7A7267]">
            Revisit past reflections and keepsake answers exchanged between you and {partner?.name}.
          </p>
        </div>

        {isLoading ? (
          <div className="flex h-64 items-center justify-center text-xs font-mono text-[#A89F91]">
            Opening archive...
          </div>
        ) : historyList.length === 0 ? (
          <div className="rounded-3xl border border-[#EBE5DA] bg-[#FFFFFF] p-8 sm:p-14 text-center shadow-xs">
            <div className="h-12 w-12 rounded-2xl bg-[#F6F4F9] text-[#7B6A96] flex items-center justify-center mx-auto mb-3 border border-[#E3DDEB]">
              <Bookmark className="h-6 w-6" />
            </div>
            <h4 className="font-serif text-xl text-[#292522]">No shared memories yet</h4>
            <p className="mt-1.5 text-xs sm:text-sm text-[#7A7267] max-w-md mx-auto leading-relaxed">
              Answer today's Daily Reflections to preserve your first shared entry in this space.
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
                      className={`min-w-[180px] md:min-w-0 md:w-full text-left rounded-2xl p-4 transition-all flex items-center justify-between border shrink-0 ${
                        isSelected
                          ? 'border-[#C96A4A] bg-[#FAF1EC] shadow-xs'
                          : 'border-[#EBE5DA] bg-[#FFFFFF] hover:bg-[#FAF8F5] text-[#7A7267]'
                      }`}
                    >
                      <div>
                        <div className={`text-xs sm:text-sm font-semibold font-mono ${isSelected ? 'text-[#C96A4A]' : 'text-[#292522]'}`}>
                          {formatted}
                        </div>
                        <p className="mt-1 text-xs text-[#7A7267] truncate max-w-[150px] md:max-w-[200px]">
                          {item.summary}
                        </p>
                      </div>

                      <ChevronRight
                        className={`hidden md:block h-4 w-4 shrink-0 ml-2 ${
                          isSelected ? 'text-[#C96A4A]' : 'text-[#D4CBBF]'
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
                <div className="flex h-64 items-center justify-center rounded-3xl border border-[#EBE5DA] bg-[#FFFFFF] text-xs font-mono text-[#A89F91]">
                  Opening entry...
                </div>
              ) : dateResponses ? (
                <div className="space-y-6">
                  <div className="flex items-center gap-2.5 pb-4 border-b border-[#EBE5DA]">
                    <div className="h-7 w-7 rounded-lg bg-[#FAF2EF] text-[#C96A4A] flex items-center justify-center border border-[#F2DDD7]">
                      <Calendar className="h-4 w-4" />
                    </div>
                    <h3 className="font-serif text-xl sm:text-2xl font-normal text-[#292522]">
                      {selectedDate ? format(parseISO(selectedDate), 'EEEE, MMMM dd, yyyy') : ''}
                    </h3>
                  </div>

                  {/* Responses List */}
                  {dateResponses.my_responses.length === 0 && dateResponses.partner_responses.length === 0 ? (
                    <div className="rounded-3xl border border-[#EBE5DA] bg-[#FFFFFF] p-8 text-center text-xs sm:text-sm text-[#7A7267]">
                      No submitted responses for this date.
                    </div>
                  ) : (
                    dateResponses.my_responses.map((myResp, idx) => {
                      const partnerResp = dateResponses.partner_responses.find(
                        (p) => p.question_id === myResp.question_id
                      );

                      return (
                        <div
                          key={myResp.id}
                          className="rounded-2xl sm:rounded-3xl border border-[#EBE5DA] bg-[#FFFFFF] p-5 sm:p-7 space-y-4 shadow-[0_2px_12px_rgba(41,37,34,0.03)]"
                        >
                          <div className="flex items-baseline space-x-2.5">
                            <span className="font-mono text-xs sm:text-sm text-[#C96A4A] font-semibold">{String(idx + 1).padStart(2, '0')} /</span>
                            <h4 className="font-serif text-base sm:text-lg font-normal text-[#292522]">
                              {myResp.question_text}
                            </h4>
                          </div>

                          {/* My Answer */}
                          <div className="rounded-2xl border border-[#E8DFD3] bg-[#FAF8F5] p-4 sm:p-5">
                            <span className="text-[10px] font-mono uppercase tracking-wider text-[#A89F91]">
                              {profile?.name} (You):
                            </span>
                            <p className="mt-1 text-xs sm:text-sm md:text-base text-[#292522] whitespace-pre-wrap leading-relaxed">
                              {myResp.answer || '(No answer recorded)'}
                            </p>
                          </div>

                          {/* Partner's Answer */}
                          {partnerResp ? (
                            <div className="rounded-2xl border border-[#F0DDD4] bg-[#FAF2EE] p-4 sm:p-5">
                              <span className="text-[10px] font-mono uppercase tracking-wider text-[#C96A4A] flex items-center gap-1">
                                <Sparkles className="h-3 w-3" />
                                {partner?.name}:
                              </span>
                              <p className="mt-1 text-xs sm:text-sm md:text-base text-[#292522] whitespace-pre-wrap leading-relaxed font-serif italic">
                                "{partnerResp.answer || '(No answer recorded)'}"
                              </p>
                            </div>
                          ) : (
                            <div className="text-xs font-mono text-[#A89F91] italic px-1">
                              {partner?.name} did not record an answer on this day.
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
