'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { dailyApi } from '@/lib/api';
import { DailyQuestion, DailyResponse } from '@/types';
import {
  Check,
  Clock,
  Lock,
  Bookmark,
  Send,
  CheckCircle2,
  Heart,
  Sparkles,
} from 'lucide-react';
import { format } from 'date-fns';

export const DailyView: React.FC = () => {
  const { partner } = useAuth();
  const { toast } = useToast();
  const [questions, setQuestions] = useState<DailyQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [questionStatuses, setQuestionStatuses] = useState<Record<string, 'DRAFT' | 'SUBMITTED' | 'NOT_STARTED'>>({});
  const [partnerResponses, setPartnerResponses] = useState<DailyResponse[]>([]);
  const [partnerStatus, setPartnerStatus] = useState<string>('NOT_STARTED');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [activeActions, setActiveActions] = useState<Record<string, 'saving' | 'submitting' | null>>({});
  const [feedbackMsg, setFeedbackMsg] = useState<{ id: string; type: 'success' | 'draft'; text: string } | null>(null);

  const fetchTodayData = useCallback(async () => {
    try {
      const data = await dailyApi.getResponses();
      setQuestions(data.questions || []);

      const initialAnswers: Record<string, string> = {};
      const initialStatuses: Record<string, 'DRAFT' | 'SUBMITTED' | 'NOT_STARTED'> = {};

      if (data.my_responses) {
        data.my_responses.forEach((r: DailyResponse) => {
          initialAnswers[r.question_id] = r.answer;
          initialStatuses[r.question_id] = r.status;
        });
      }

      setAnswers(initialAnswers);
      setQuestionStatuses(initialStatuses);
      setPartnerResponses(data.partner_responses || []);
      setPartnerStatus(data.partner_status || 'NOT_STARTED');
    } catch (err) {
      console.warn('Failed to load daily questions:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTodayData();
  }, [fetchTodayData]);

  const handleAnswerChange = (qId: string, value: string) => {
    setAnswers((prev) => ({ ...prev, [qId]: value }));
  };

  const handleSaveQuestionDraft = async (qId: string) => {
    const text = answers[qId] || '';
    setActiveActions((prev) => ({ ...prev, [qId]: 'saving' }));
    setFeedbackMsg(null);

    try {
      await dailyApi.saveResponses([{ question_id: qId, answer: text }], 'SAVE_DRAFT');
      setQuestionStatuses((prev) => ({ ...prev, [qId]: 'DRAFT' }));
      toast.love('Saved privately in your drafts ✨', 'Draft Saved');
      setFeedbackMsg({
        id: qId,
        type: 'draft',
        text: 'Saved privately in your drafts ✨',
      });
      setTimeout(() => setFeedbackMsg(null), 3000);
    } catch (err: any) {
      toast.error(err.message || 'Failed to save draft.', 'Draft Error');
    } finally {
      setActiveActions((prev) => ({ ...prev, [qId]: null }));
    }
  };

  const handleSendQuestion = async (qId: string) => {
    const text = (answers[qId] || '').trim();
    if (!text) {
      toast.info('Please write a note before sending 💕', 'Empty Note');
      return;
    }

    setActiveActions((prev) => ({ ...prev, [qId]: 'submitting' }));
    setFeedbackMsg(null);

    try {
      await dailyApi.saveResponses([{ question_id: qId, answer: text }], 'SUBMIT');
      setQuestionStatuses((prev) => ({ ...prev, [qId]: 'SUBMITTED' }));
      toast.love(`Sealed & shared with ${partner?.name || 'partner'} 💌`, 'Love Note Shared');
      setFeedbackMsg({
        id: qId,
        type: 'success',
        text: `Sealed & shared with ${partner?.name || 'partner'} 💌`,
      });
      await fetchTodayData();
      setTimeout(() => setFeedbackMsg(null), 4000);
    } catch (err: any) {
      toast.error(err.message || 'Failed to submit response.', 'Error');
    } finally {
      setActiveActions((prev) => ({ ...prev, [qId]: null }));
    }
  };

  const todayFormatted = format(new Date(), 'EEEE, MMMM dd, yyyy');
  const submittedCount = Object.values(questionStatuses).filter((s) => s === 'SUBMITTED').length;

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center space-y-2">
          <Heart className="h-6 w-6 text-[#EA5E86] animate-bounce mx-auto" />
          <p className="text-xs font-mono text-[#A89F91]">Opening today's prompts...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full flex justify-center px-4 sm:px-6 lg:px-8 py-6 sm:py-8 lg:py-10">
      {/* Centered Daily Reading Area (~780–860px) */}
      <div className="w-full max-w-[820px] space-y-6 sm:space-y-8">
        {/* Header */}
        <div className="pb-6 border-b border-[#EFE8DC] flex flex-col sm:flex-row sm:items-baseline justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2 text-xs font-mono text-[#A89F91]">
              <Sparkles className="h-3.5 w-3.5 text-[#F49625]" />
              <span>{todayFormatted}</span>
            </div>
            <h2 className="mt-1 font-serif text-2xl sm:text-3xl lg:text-4xl font-normal text-[#422F0E]">
              Daily Love Questions
            </h2>
            <p className="mt-1.5 text-xs sm:text-sm text-[#6B5E4E]">
              Answer together, one note at a time. Save as a cozy draft or share with {partner?.name}.
            </p>
          </div>

          {/* Progress Indicator */}
          <div className="flex items-center gap-2 font-mono text-xs text-[#6B5E4E] self-start sm:self-auto">
            <span className="text-[#A89F91]">Shared:</span>
            <span className="rounded-full border border-[#FCC4C0] bg-[#FFF5F5] px-3.5 py-1 text-xs font-semibold text-[#EA5E86] shadow-sm flex items-center gap-1.5">
              <Heart className="h-3 w-3 fill-current" />
              {submittedCount} / {questions.length}
            </span>
          </div>
        </div>

        {/* Privacy Banner */}
        <div className="rounded-3xl border border-[#EFE8DC] bg-[#FFFFFF] p-4 sm:p-5 text-xs sm:text-sm text-[#6B5E4E] flex items-center gap-3.5 shadow-sm">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#FCC4C0]/30 text-[#EA5E86] shrink-0">
            <Lock className="h-4 w-4" />
          </div>
          <span className="leading-relaxed">
            <strong className="text-[#422F0E]">Private by default:</strong> Pressing <strong>Draft</strong> keeps your answer hidden from {partner?.name}. Only when you press <strong>Send</strong> is your love note revealed!
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
                className="rounded-3xl border border-[#EFE8DC] bg-[#FFFFFF] p-5 sm:p-7 shadow-[0_2px_12px_rgba(66,47,14,0.03)] transition-all"
              >
                {/* Question Header & Status */}
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-baseline space-x-3">
                    <span className="font-mono text-xs sm:text-sm text-[#A89F91] font-medium">
                      {String(idx + 1).padStart(2, '0')} /
                    </span>
                    <h3 className="font-serif text-lg sm:text-xl font-normal text-[#422F0E] leading-snug">
                      {q.question}
                    </h3>
                  </div>

                  <div className="shrink-0">
                    {status === 'SUBMITTED' ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-[#DDF2B8] bg-[#F5FBEF] px-3 py-1 text-xs font-mono font-medium text-[#037F71]">
                        <Check className="h-3 w-3" /> Shared 💕
                      </span>
                    ) : status === 'DRAFT' ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-[#FFD094] bg-[#FFF9EE] px-3 py-1 text-xs font-mono font-medium text-[#F49625]">
                        <Bookmark className="h-3 w-3" /> Draft
                      </span>
                    ) : (
                      <span className="inline-flex items-center rounded-full bg-[#FAF7F2] border border-[#EFE8DC] px-3 py-1 text-xs font-mono text-[#A89F91]">
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
                    placeholder="Write a sweet reflection..."
                    rows={3}
                    className="w-full rounded-2xl border border-[#EFE8DC] bg-[#FAF7F2] p-4 text-xs sm:text-sm md:text-base text-[#422F0E] placeholder-[#A89F91] focus:border-[#EA5E86] focus:bg-[#FFFFFF] focus:outline-none focus:ring-2 focus:ring-[#FCC4C0]/40 leading-relaxed"
                  />
                </div>

                {/* Action Toolbar */}
                <div className="mt-4 flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-[#F5EFE6]">
                  <div>
                    {isFeedback && (
                      <span
                        className={`text-xs font-mono flex items-center gap-1.5 ${
                          feedbackMsg.type === 'success' ? 'text-[#037F71]' : 'text-[#F49625]'
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
                      className="flex items-center space-x-2 rounded-full border border-[#EFE8DC] bg-[#FAF7F2] px-4 py-2 text-xs sm:text-sm font-medium text-[#6B5E4E] hover:bg-[#F2ECE1] hover:text-[#422F0E] disabled:opacity-40 transition-all min-h-[40px]"
                    >
                      <Bookmark className="h-3.5 w-3.5" />
                      <span>{actionState === 'saving' ? 'Saving...' : 'Draft'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleSendQuestion(q.id)}
                      disabled={actionState === 'submitting' || actionState === 'saving'}
                      title="Send answer to partner"
                      className="flex items-center space-x-2 rounded-full bg-[#422F0E] px-5 py-2 text-xs sm:text-sm font-medium text-[#FAF7F2] hover:bg-[#EA5E86] disabled:opacity-40 transition-all min-h-[40px] shadow-sm"
                    >
                      <Send className="h-3.5 w-3.5" />
                      <span>{actionState === 'submitting' ? 'Sending...' : status === 'SUBMITTED' ? 'Update & Share' : 'Send'}</span>
                    </button>
                  </div>
                </div>

                {/* Partner's Submitted Response */}
                {partnerStatus === 'SUBMITTED' && partnerAns ? (
                  <div className="mt-5 rounded-3xl border border-[#FCC4C0]/40 bg-[#FFF8FA] p-4 sm:p-5 space-y-1">
                    <div className="flex items-center space-x-1.5 text-[11px] font-mono text-[#EA5E86] font-medium">
                      <Heart className="h-3 w-3 fill-current" />
                      <span>{partner?.name}'s response:</span>
                    </div>
                    <p className="text-xs sm:text-sm md:text-base text-[#422F0E] whitespace-pre-wrap leading-relaxed font-serif italic pt-1">
                      "{partnerAns.answer || '(Left blank)'}"
                    </p>
                  </div>
                ) : (
                  <div className="mt-3.5 flex items-center space-x-2 text-[11px] font-mono text-[#A89F91]">
                    <Clock className="h-3.5 w-3.5" />
                    <span>{partner?.name}'s note will appear here once shared.</span>
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
