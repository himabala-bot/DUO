'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { dailyApi } from '@/lib/api';
import { DailyHistoryDay, DailyResponse } from '@/types';
import { ChevronRight, Calendar } from 'lucide-react';
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
        <div className="pb-6 border-b border-[#E8E4DB]">
          <h2 className="font-serif text-2xl sm:text-3xl lg:text-4xl font-normal text-[#1C1917]">
            Memory Archive
          </h2>
          <p className="mt-1.5 text-xs sm:text-sm text-[#78716C]">
            Browse past daily reflections shared between you and {partner?.name}.
          </p>
        </div>

        {isLoading ? (
          <div className="flex h-64 items-center justify-center text-xs sm:text-sm font-mono text-[#8C857B]">
            Reading archive...
          </div>
        ) : historyList.length === 0 ? (
          <div className="rounded-2xl border border-[#E8E4DB] bg-[#FFFFFF] p-8 sm:p-14 text-center shadow-sm">
            <h4 className="font-serif text-xl text-[#1C1917]">No shared memories yet</h4>
            <p className="mt-1.5 text-xs sm:text-sm text-[#78716C] max-w-md mx-auto leading-relaxed">
              Submit today's Daily Questions to create your first entry in this archive.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 lg:gap-8 items-start">
            {/* Timeline Sidebar (Desktop 4 cols) */}
            <div className="md:col-span-4 lg:col-span-4 space-y-2.5">
              <span className="text-[11px] font-mono uppercase tracking-widest text-[#8C857B]">
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
                          ? 'border-[#1C1917] bg-[#FFFFFF] shadow-md ring-1 ring-[#1C1917]'
                          : 'border-[#E8E4DB] bg-[#FBFAF7] hover:bg-[#F5F2EB] text-[#78716C]'
                      }`}
                    >
                      <div>
                        <div className="text-xs sm:text-sm font-semibold text-[#1C1917] font-mono">
                          {formatted}
                        </div>
                        <p className="mt-1 text-xs text-[#78716C] truncate max-w-[150px] md:max-w-[200px]">
                          {item.summary}
                        </p>
                      </div>

                      <ChevronRight
                        className={`hidden md:block h-4 w-4 shrink-0 ml-2 ${
                          isSelected ? 'text-[#C2410C]' : 'text-[#A8A29E]'
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
                <div className="flex h-64 items-center justify-center rounded-2xl border border-[#E8E4DB] bg-[#FFFFFF] text-xs sm:text-sm font-mono text-[#8C857B]">
                  Opening entry...
                </div>
              ) : dateResponses ? (
                <div className="space-y-6">
                  <div className="flex items-center gap-2.5 pb-4 border-b border-[#E8E4DB]">
                    <Calendar className="h-5 w-5 text-[#C2410C]" />
                    <h3 className="font-serif text-xl sm:text-2xl font-normal text-[#1C1917]">
                      {selectedDate ? format(parseISO(selectedDate), 'EEEE, MMMM dd, yyyy') : ''}
                    </h3>
                  </div>

                  {/* Responses List */}
                  {dateResponses.my_responses.length === 0 && dateResponses.partner_responses.length === 0 ? (
                    <div className="rounded-2xl border border-[#E8E4DB] bg-[#FFFFFF] p-8 text-center text-xs sm:text-sm text-[#78716C]">
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
                          className="rounded-2xl border border-[#E8E4DB] bg-[#FFFFFF] p-5 sm:p-7 space-y-4 shadow-[0_2px_8px_rgba(28,25,23,0.03)]"
                        >
                          <div className="flex items-baseline space-x-2.5">
                            <span className="font-mono text-xs sm:text-sm text-[#8C857B]">{String(idx + 1).padStart(2, '0')} /</span>
                            <h4 className="font-serif text-base sm:text-lg font-normal text-[#1C1917]">
                              {myResp.question_text}
                            </h4>
                          </div>

                          {/* My Answer */}
                          <div className="rounded-2xl border border-[#E8E4DB] bg-[#FBFAF7] p-4 sm:p-5">
                            <span className="text-[11px] font-mono text-[#8C857B]">
                              {profile?.name} (You):
                            </span>
                            <p className="mt-1 text-xs sm:text-sm md:text-base text-[#1C1917] whitespace-pre-wrap leading-relaxed">
                              {myResp.answer || '(No answer recorded)'}
                            </p>
                          </div>

                          {/* Partner's Answer */}
                          {partnerResp ? (
                            <div className="rounded-2xl border border-[#E8E4DB] bg-[#F7F4EC] p-4 sm:p-5">
                              <span className="text-[11px] font-mono text-[#8C857B]">
                                {partner?.name}:
                              </span>
                              <p className="mt-1 text-xs sm:text-sm md:text-base text-[#1C1917] whitespace-pre-wrap leading-relaxed font-serif italic">
                                "{partnerResp.answer || '(No answer recorded)'}"
                              </p>
                            </div>
                          ) : (
                            <div className="text-xs font-mono text-[#A8A29E] italic px-1">
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
