'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { dailyApi } from '@/lib/api';
import { DailyQuestion, DailyResponse } from '@/types';
import { Lock, CheckCircle2, Clock, Send, Bookmark, Check, Sparkles, Heart } from 'lucide-react';
import { format } from 'date-fns';

const WASHI_TAPES = ['washi-tape-pink', 'washi-tape-peach', 'washi-tape-yellow', 'washi-tape-mint'];

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
        text: 'Saved in your private secret drafts! 💌',
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
      alert('Please write a sweet note before sending 💕');
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
        text: `Shared with ${partner?.name || 'your partner'}! 💕`,
      });
      await fetchTodayData();
      setTimeout(() => setFeedbackMsg(null), 4000);
    } catch (err: any) {
      alert(err.message || 'Failed to submit response.');
    } finally {
      setActiveActions((prev) => ({ ...prev, [qId]: null }));
    }
  };

  const todayFormatted = format(new Date(), 'EEEE, MMMM dd');
  const submittedCount = Object.values(questionStatuses).filter((s) => s === 'SUBMITTED').length;

  return (
    <div className="w-full flex justify-center px-4 sm:px-6 lg:px-8 py-6 sm:py-8 lg:py-10">
      {/* Centered Daily Reading Area */}
      <div className="w-full max-w-[820px] space-y-6 sm:space-y-8">
        {/* Cute Header */}
        <div className="pb-6 border-b border-[#F4EBE6] flex flex-col sm:flex-row sm:items-baseline justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 rounded-full bg-[#FFF0F3] px-3 py-1 border border-[#FCE1E8] text-xs font-mono uppercase tracking-wider text-[#E11D48] mb-2 shadow-2xs">
              <Heart className="h-3.5 w-3.5 fill-[#E11D48]" />
              <span>{todayFormatted} • Today's Love Notes</span>
            </div>
            <h2 className="font-serif text-3xl sm:text-4xl font-bold text-[#2D2522]">
              Daily Questions 💕
            </h2>
            <p className="mt-1.5 text-xs sm:text-sm text-[#7A6D65]">
              Little daily thoughts for the two of you. Save a draft or send your answer to {partner?.name}!
            </p>
          </div>

          {/* Progress Indicator */}
          <div className="flex items-center gap-2 font-mono text-xs sm:text-sm text-[#6D5E56] self-start sm:self-auto bg-[#FFF5F7] px-3.5 py-1.5 rounded-full border border-[#FCE1E8]">
            <span className="text-[#E11D48] font-bold">Shared:</span>
            <span className="font-bold text-[#2D2522]">
              {submittedCount} / {questions.length} 🌸
            </span>
          </div>
        </div>

        {/* Sweet Privacy Card */}
        <div className="rounded-3xl border-2 border-[#FCE1E8] bg-gradient-to-r from-[#FFF5F7] to-[#FFF9F5] p-4 sm:p-5 text-xs sm:text-sm text-[#6D5E56] flex items-center gap-3.5 shadow-xs">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white border border-[#FCE1E8] text-[#E11D48] shrink-0 shadow-xs">
            <Lock className="h-5 w-5" />
          </div>
          <span className="leading-relaxed">
            <strong className="text-[#E11D48]">Sealed with privacy:</strong> Pressing <strong>Draft</strong> keeps your answer secret. Only when you press <strong>Send 💕</strong> does your answer get shared with {partner?.name}!
          </span>
        </div>

        {/* Questions Cards Stream with Cute Washi Tape Tops */}
        <div className="space-y-8">
          {questions.map((q, idx) => {
            const partnerAns = partnerResponses.find((r) => r.question_id === q.id);
            const status = questionStatuses[q.id] || 'NOT_STARTED';
            const actionState = activeActions[q.id];
            const isFeedback = feedbackMsg?.id === q.id;
            const tapeClass = WASHI_TAPES[idx % WASHI_TAPES.length];

            return (
              <div
                key={q.id}
                className="relative rounded-3xl border-2 border-[#FCE1E8] bg-[#FFFFFF] p-6 sm:p-8 shadow-[0_8px_24px_rgba(244,114,182,0.06)] transition-all hover:border-[#FF758C]"
              >
                {/* Washi tape sticker */}
                <div className={`absolute -top-3 left-8 h-6 w-24 rounded-sm ${tapeClass} rotate-[-2deg]`} />

                {/* Question Header & Status */}
                <div className="flex items-start justify-between gap-4 pt-1">
                  <div className="flex items-baseline space-x-3">
                    <span className="font-mono text-sm text-[#E11D48] font-bold">🌸 {String(idx + 1).padStart(2, '0')}</span>
                    <h3 className="font-serif text-lg sm:text-xl font-bold text-[#2D2522] leading-snug">
                      {q.question}
                    </h3>
                  </div>

                  <div className="shrink-0">
                    {status === 'SUBMITTED' ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-[#BBF7D0] bg-[#DCFCE7] px-3 py-1 text-xs font-mono font-bold text-[#15803D] shadow-2xs">
                        <Check className="h-3.5 w-3.5" /> Shared 💕
                      </span>
                    ) : status === 'DRAFT' ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-[#FEF08A] bg-[#FEF9C3] px-3 py-1 text-xs font-mono font-bold text-[#A16207] shadow-2xs">
                        <Bookmark className="h-3.5 w-3.5" /> Draft 💌
                      </span>
                    ) : (
                      <span className="inline-flex items-center rounded-full bg-[#FFF5F2] border border-[#FED7AA] px-3 py-1 text-xs font-mono text-[#EA580C]">
                        Not written yet
                      </span>
                    )}
                  </div>
                </div>

                {/* Answer Input */}
                <div className="mt-5">
                  <textarea
                    value={answers[q.id] || ''}
                    onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                    placeholder="Write something heartfelt..."
                    rows={3}
                    className="w-full rounded-2xl border-2 border-[#FCE1E8] bg-[#FFFDFC] p-4 text-xs sm:text-sm md:text-base text-[#2D2522] placeholder-[#B2A49B] focus:border-[#FF758C] focus:bg-[#FFFFFF] focus:outline-none focus:ring-2 focus:ring-[#FF758C]/20 leading-relaxed"
                  />
                </div>

                {/* Action Toolbar */}
                <div className="mt-4 flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-[#FFF0F3]">
                  <div>
                    {isFeedback && (
                      <span
                        className={`text-xs font-mono flex items-center gap-1.5 font-semibold ${
                          feedbackMsg.type === 'success' ? 'text-[#15803D]' : 'text-[#EA580C]'
                        }`}
                      >
                        {feedbackMsg.type === 'success' ? (
                          <CheckCircle2 className="h-4 w-4 text-[#22C55E]" />
                        ) : (
                          <Bookmark className="h-4 w-4 text-[#EA580C]" />
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
                      title="Save Secret Draft"
                      className="flex items-center space-x-1.5 rounded-2xl border border-[#FCE1E8] bg-[#FFF5F7] px-4 py-2 text-xs sm:text-sm font-semibold text-[#E11D48] hover:bg-[#FFE4E8] disabled:opacity-40 transition-all min-h-[42px]"
                    >
                      <Bookmark className="h-4 w-4" />
                      <span>{actionState === 'saving' ? 'Saving...' : 'Save Draft 💌'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleSendQuestion(q.id)}
                      disabled={actionState === 'submitting' || actionState === 'saving'}
                      title="Send answer to partner"
                      className="flex items-center space-x-2 rounded-2xl bg-gradient-to-r from-[#FF758C] to-[#FF7EB3] px-5 py-2 text-xs sm:text-sm font-bold text-white hover:scale-105 hover:shadow-[0_4px_16px_rgba(255,117,140,0.35)] disabled:opacity-40 transition-all min-h-[42px] shadow-sm"
                    >
                      <Send className="h-4 w-4" />
                      <span>{actionState === 'submitting' ? 'Sending...' : status === 'SUBMITTED' ? 'Update & Send 💕' : 'Send 💕'}</span>
                    </button>
                  </div>
                </div>

                {/* Partner's Submitted Response */}
                {partnerStatus === 'SUBMITTED' && partnerAns ? (
                  <div className="mt-5 rounded-2xl border-2 border-[#FED7AA] bg-[#FFF9F5] p-4 sm:p-5 shadow-2xs">
                    <div className="flex items-center space-x-2 text-xs font-mono font-bold text-[#EA580C] mb-1.5">
                      <Sparkles className="h-3.5 w-3.5" />
                      <span>{partner?.name}'s Love Note 💕:</span>
                    </div>
                    <p className="text-xs sm:text-sm md:text-base text-[#2D2522] whitespace-pre-wrap leading-relaxed font-serif italic">
                      "{partnerAns.answer || '(Left blank)'}"
                    </p>
                  </div>
                ) : (
                  <div className="mt-4 flex items-center space-x-2 text-xs font-mono text-[#B2A49B] bg-[#FFF8F9] px-3.5 py-2 rounded-xl border border-[#FCE1E8]">
                    <Clock className="h-3.5 w-3.5 text-[#E11D48]" />
                    <span>{partner?.name}'s answer is waiting to be shared! ✨</span>
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
