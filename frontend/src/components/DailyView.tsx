'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { dailyApi } from '@/lib/api';
import { DailyQuestion, DailyResponse } from '@/types';
import { Lock, CheckCircle2, Clock, Send, Bookmark, Check, Sparkles, Feather } from 'lucide-react';
import { format } from 'date-fns';

export const DailyView: React.FC = () => {
  const { profile, partner } = useAuth();
  const [questions, setQuestions] = useState<DailyQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [questionStatuses, setQuestionStatuses] = useState<Record<string, 'NOT_STARTED' | 'DRAFT' | 'SUBMITTED'>>({});
  const [partnerStatus, setPartnerStatus] = useState<'NOT_SUBMITTED' | 'SUBMITTED'>('NOT_SUBMITTED');
  const [partnerResponses, setPartnerResponses] = useState<DailyResponse[]>([]);
  const [activeActions, setActiveActions] = useState<Record<string, 'saving' | 'submitting' | null>>({});
  const [feedbackMsg, setFeedbackMsg] = useState<{ id: string; text: string; type: 'success' | 'info' } | null>(null);

  const fetchTodayData = useCallback(async () => {
    try {
      const data = await dailyApi.getResponses();
      setQuestions(data.questions || []);
      setPartnerStatus(data.partner_status);
      setPartnerResponses(data.partner_responses || []);

      const currentAnswers: Record<string, string> = {};
      const currentStatuses: Record<string, 'NOT_STARTED' | 'DRAFT' | 'SUBMITTED'> = {};

      data.questions.forEach((q) => {
        currentStatuses[q.id] = 'NOT_STARTED';
      });

      data.my_responses.forEach((resp) => {
        currentAnswers[resp.question_id] = resp.answer;
        currentStatuses[resp.question_id] = resp.status;
      });

      setAnswers(currentAnswers);
      setQuestionStatuses(currentStatuses);
    } catch (err) {
      console.warn('Failed to load daily questions:', err);
    }
  }, []);

  useEffect(() => {
    fetchTodayData();
  }, [fetchTodayData]);

  const handleAnswerChange = (qId: string, text: string) => {
    setAnswers((prev) => ({ ...prev, [qId]: text }));
  };

  const handleSaveQuestionDraft = async (qId: string) => {
    const text = answers[qId] || '';
    setActiveActions((prev) => ({ ...prev, [qId]: 'saving' }));
    setFeedbackMsg(null);

    try {
      await dailyApi.saveResponses([{ question_id: qId, answer: text }], 'SAVE_DRAFT');
      setQuestionStatuses((prev) => ({ ...prev, [qId]: 'DRAFT' }));
      setFeedbackMsg({
        id: qId,
        type: 'info',
        text: 'Draft saved in private.',
      });
      setTimeout(() => setFeedbackMsg(null), 3500);
    } catch (err: any) {
      alert(err.message || 'Failed to save draft.');
    } finally {
      setActiveActions((prev) => ({ ...prev, [qId]: null }));
    }
  };

  const handleSendQuestion = async (qId: string) => {
    const text = (answers[qId] || '').trim();
    if (!text) {
      alert('Please write an answer before sending.');
      return;
    }

    setActiveActions((prev) => ({ ...prev, [qId]: 'submitting' }));
    setFeedbackMsg(null);

    try {
      await dailyApi.saveResponses([{ question_id: qId, answer: text }], 'SUBMIT');
      setQuestionStatuses((prev) => ({ ...prev, [qId]: 'SUBMITTED' }));
      setFeedbackMsg({
        id: qId,
        type: 'success',
        text: `Shared with ${partner?.name || 'partner'}.`,
      });
      await fetchTodayData();
      setTimeout(() => setFeedbackMsg(null), 4000);
    } catch (err: any) {
      alert(err.message || 'Failed to submit response.');
    } finally {
      setActiveActions((prev) => ({ ...prev, [qId]: null }));
    }
  };

  const todayFormatted = format(new Date(), 'EEEE, MMMM dd, yyyy');
  const submittedCount = Object.values(questionStatuses).filter((s) => s === 'SUBMITTED').length;

  return (
    <div className="w-full flex justify-center px-4 sm:px-6 lg:px-8 py-6 sm:py-8 lg:py-10">
      {/* Centered Daily Reading Area (~780–860px) */}
      <div className="w-full max-w-[820px] space-y-6 sm:space-y-8">
        {/* Header */}
        <div className="pb-6 border-b border-[#EBE5DA] flex flex-col sm:flex-row sm:items-baseline justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 rounded-md bg-[#FAF2EF] px-2.5 py-0.5 border border-[#F2DDD7] text-[11px] font-mono uppercase tracking-wider text-[#C96A4A] mb-2">
              <Feather className="h-3 w-3" />
              <span>{todayFormatted}</span>
            </div>
            <h2 className="font-serif text-2xl sm:text-3xl lg:text-4xl font-normal text-[#292522]">
              Daily Reflections
            </h2>
            <p className="mt-1.5 text-xs sm:text-sm text-[#7A7267]">
              Quiet prompts for today. Keep as a private draft or share individually with {partner?.name}.
            </p>
          </div>

          {/* Progress Indicator */}
          <div className="flex items-center gap-2.5 font-mono text-xs sm:text-sm text-[#696156] self-start sm:self-auto">
            <span className="text-[#A89F91]">Shared:</span>
            <span className="rounded-xl border border-[#E8DFD3] bg-[#FFFFFF] px-3 py-1 text-xs sm:text-sm font-semibold text-[#292522] shadow-2xs">
              {submittedCount} / {questions.length}
            </span>
          </div>
        </div>

        {/* Privacy Banner */}
        <div className="rounded-2xl border border-[#F0DDD4] bg-[#FAF3F0] p-4 sm:p-5 text-xs sm:text-sm text-[#696156] flex items-center gap-3.5 shadow-2xs">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#FFFFFF] border border-[#F0DDD4] text-[#C96A4A] shrink-0">
            <Lock className="h-4 w-4" />
          </div>
          <span className="leading-relaxed">
            <strong className="text-[#292522]">Private by default:</strong> Pressing <strong>Draft</strong> keeps your answer sealed and private. It is only revealed when you press <strong>Send</strong>.
          </span>
        </div>

        {/* Questions Cards Stream */}
        <div className="space-y-6">
          {questions.map((q, idx) => {
            const partnerAns = partnerResponses.find((r) => r.question_id === q.id);
            const status = questionStatuses[q.id] || 'NOT_STARTED';
            const actionState = activeActions[q.id];
            const isFeedback = feedbackMsg?.id === q.id;

            return (
              <div
                key={q.id}
                className="rounded-2xl sm:rounded-3xl border border-[#EBE5DA] bg-[#FFFFFF] p-5 sm:p-7 shadow-[0_2px_12px_rgba(41,37,34,0.03)] transition-all hover:border-[#DFD7CA]"
              >
                {/* Question Header & Status */}
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-baseline space-x-3">
                    <span className="font-mono text-xs sm:text-sm text-[#C96A4A] font-semibold">{String(idx + 1).padStart(2, '0')} /</span>
                    <h3 className="font-serif text-lg sm:text-xl font-normal text-[#292522] leading-snug">
                      {q.question}
                    </h3>
                  </div>

                  <div className="shrink-0">
                    {status === 'SUBMITTED' ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-[#D5E2D1] bg-[#F2F6F0] px-2.5 py-1 text-xs font-mono font-medium text-[#4D6A46]">
                        <Check className="h-3 w-3" /> Shared
                      </span>
                    ) : status === 'DRAFT' ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-[#EFE3C3] bg-[#FAF6E8] px-2.5 py-1 text-xs font-mono font-medium text-[#8F6B23]">
                        <Bookmark className="h-3 w-3" /> Draft
                      </span>
                    ) : (
                      <span className="inline-flex items-center rounded-full bg-[#FAF5EE] border border-[#ECE3D7] px-2.5 py-1 text-xs font-mono text-[#9E9589]">
                        Unwritten
                      </span>
                    )}
                  </div>
                </div>

                {/* Answer Input */}
                <div className="mt-4">
                  <textarea
                    value={answers[q.id] || ''}
                    onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                    placeholder="Write your reflection here..."
                    rows={3}
                    className="w-full rounded-2xl border border-[#E8DFD3] bg-[#FAF8F5] p-3.5 sm:p-4 text-xs sm:text-sm md:text-base text-[#292522] placeholder-[#A89F91] focus:border-[#C96A4A] focus:bg-[#FFFFFF] focus:outline-none focus:ring-1 focus:ring-[#C96A4A] leading-relaxed"
                  />
                </div>

                {/* Action Toolbar */}
                <div className="mt-4 flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-[#F5EFE6]">
                  <div>
                    {isFeedback && (
                      <span
                        className={`text-xs font-mono flex items-center gap-1.5 ${
                          feedbackMsg.type === 'success' ? 'text-[#5E8056]' : 'text-[#7A7267]'
                        }`}
                      >
                        {feedbackMsg.type === 'success' ? (
                          <CheckCircle2 className="h-4 w-4" />
                        ) : (
                          <Bookmark className="h-4 w-4" />
                        )}
                        {feedbackMsg.text}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2.5 ml-auto">
                    <button
                      type="button"
                      onClick={() => handleSaveQuestionDraft(q.id)}
                      disabled={actionState === 'saving' || actionState === 'submitting'}
                      title="Save Draft (Private)"
                      className="flex items-center space-x-2 rounded-xl border border-[#E8DFD3] bg-[#FAF5EE] px-3.5 sm:px-4 py-2 text-xs sm:text-sm font-medium text-[#696156] hover:bg-[#FAF1EC] hover:text-[#C96A4A] hover:border-[#F0DDD4] disabled:opacity-40 transition-all min-h-[40px]"
                    >
                      <Bookmark className="h-4 w-4" />
                      <span>{actionState === 'saving' ? 'Saving...' : 'Draft'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleSendQuestion(q.id)}
                      disabled={actionState === 'submitting' || actionState === 'saving'}
                      title="Send answer to partner"
                      className="flex items-center space-x-2 rounded-xl bg-[#C96A4A] px-4 sm:px-5 py-2 text-xs sm:text-sm font-medium text-white hover:bg-[#B75C3E] disabled:opacity-40 transition-all min-h-[40px] shadow-[0_2px_8px_rgba(201,106,74,0.18)]"
                    >
                      <Send className="h-4 w-4" />
                      <span>{actionState === 'submitting' ? 'Sending...' : status === 'SUBMITTED' ? 'Update & Send' : 'Send'}</span>
                    </button>
                  </div>
                </div>

                {/* Partner's Submitted Response */}
                {partnerStatus === 'SUBMITTED' && partnerAns ? (
                  <div className="mt-5 rounded-2xl border border-[#ECE0D6] bg-[#FAF5F0] p-4 sm:p-5">
                    <div className="flex items-center space-x-2 text-[10px] font-mono uppercase tracking-wider text-[#A89F91] mb-1.5">
                      <Sparkles className="h-3 w-3 text-[#C96A4A]" />
                      <span>{partner?.name}'s response</span>
                    </div>
                    <p className="text-xs sm:text-sm md:text-base text-[#292522] whitespace-pre-wrap leading-relaxed font-serif italic">
                      "{partnerAns.answer || '(Left blank)'}"
                    </p>
                  </div>
                ) : (
                  <div className="mt-3.5 flex items-center space-x-2 text-[10px] font-mono text-[#A89F91]">
                    <Clock className="h-3 w-3" />
                    <span>{partner?.name}'s answer will appear here once shared.</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
