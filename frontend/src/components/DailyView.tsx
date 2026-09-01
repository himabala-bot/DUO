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
  BookOpen,
  Mic,
} from 'lucide-react';
import { format } from 'date-fns';
import { KeepsakeArchiveModal } from './KeepsakeArchiveModal';
import { VoiceRecorder } from './VoiceRecorder';
import { WaveformPlayer } from './WaveformPlayer';

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
  const [showArchiveModal, setShowArchiveModal] = useState(false);

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
      toast.love('Saved privately in your drafts', 'Draft Saved');
      setFeedbackMsg({
        id: qId,
        type: 'draft',
        text: 'Saved privately in your drafts',
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
      toast.info('Please write a note before sending', 'Empty Note');
      return;
    }

    setActiveActions((prev) => ({ ...prev, [qId]: 'submitting' }));
    setFeedbackMsg(null);

    try {
      await dailyApi.saveResponses([{ question_id: qId, answer: text }], 'SUBMIT');
      setQuestionStatuses((prev) => ({ ...prev, [qId]: 'SUBMITTED' }));
      toast.love(`Sealed and shared with ${partner?.name || 'partner'}`, 'Love Note Shared');
      setFeedbackMsg({
        id: qId,
        type: 'success',
        text: `Sealed and shared with ${partner?.name || 'partner'}`,
      });
      await fetchTodayData();
      setTimeout(() => setFeedbackMsg(null), 4000);
    } catch (err: any) {
      toast.error(err.message || 'Failed to submit response.', 'Error');
    } finally {
      setActiveActions((prev) => ({ ...prev, [qId]: null }));
    }
  };

  const handleVoiceAnswer = async (qId: string, audioDataUrl: string, duration: number) => {
    const voicePayload = `[voice:${JSON.stringify({ url: audioDataUrl, duration })}]`;
    setAnswers((prev) => ({ ...prev, [qId]: voicePayload }));
    setActiveActions((prev) => ({ ...prev, [qId]: 'submitting' }));

    try {
      await dailyApi.saveResponses([{ question_id: qId, answer: voicePayload }], 'SUBMIT');
      setQuestionStatuses((prev) => ({ ...prev, [qId]: 'SUBMITTED' }));
      toast.love(`Voice reflection shared with ${partner?.name || 'partner'}`, 'Voice Note Shared');
      await fetchTodayData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to submit voice note.', 'Error');
    } finally {
      setActiveActions((prev) => ({ ...prev, [qId]: null }));
    }
  };

  const renderAnswerBody = (text?: string, isMe = false) => {
    if (!text) return null;
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

          {/* Action CTAs & Progress */}
          <div className="flex items-center gap-2.5 self-start sm:self-auto">
            <button
              onClick={() => setShowArchiveModal(true)}
              className="flex items-center space-x-1.5 rounded-full border border-[#EFE8DC] bg-[#FAF7F2] px-4 py-2 text-xs font-medium text-[#422F0E] hover:bg-[#F2ECE1] transition-all shadow-sm"
            >
              <BookOpen className="h-3.5 w-3.5 text-[#EA5E86]" />
              <span>Previous Answers</span>
            </button>

            <span className="rounded-full border border-[#FCC4C0] bg-[#FFF5F5] px-3.5 py-1.5 text-xs font-semibold text-[#EA5E86] shadow-sm flex items-center gap-1.5">
              <Heart className="h-3 w-3 fill-current" />
              {submittedCount} / {questions.length}
            </span>
          </div>
        </div>

        {/* Partner Progress Overview Card */}
        <div className="rounded-3xl border border-theme bg-theme-card p-4 sm:p-5 flex items-center justify-between shadow-sm">
          <div className="flex items-center space-x-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-[#5B58E6]/15 text-[#5B58E6]">
              <Heart className="h-4.5 w-4.5 fill-current" />
            </span>
            <div>
              <h4 className="font-serif text-sm sm:text-base font-bold text-theme-primary">
                {partner ? `${partner.name}'s Status` : 'Partner Status'}
              </h4>
              <p className="text-xs text-theme-secondary font-mono">
                {partnerStatus === 'SUBMITTED'
                  ? 'Answered today • Reflections unlocked'
                  : 'Has not answered yet today'}
              </p>
            </div>
          </div>

          <span
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-medium ${
              partnerStatus === 'SUBMITTED'
                ? 'bg-[#00D26A]/15 border border-[#00D26A]/30 text-[#00D26A]'
                : 'bg-theme-input border border-theme text-theme-muted'
            }`}
          >
            {partnerStatus === 'SUBMITTED' ? (
              <>
                <CheckCircle2 className="h-3.5 w-3.5" /> Ready
              </>
            ) : (
              <>
                <Clock className="h-3.5 w-3.5" /> Waiting
              </>
            )}
          </span>
        </div>

        {/* Daily Questions List */}
        <div className="space-y-6">
          {questions.map((q, idx) => {
            const status = questionStatuses[q.id] || 'NOT_STARTED';
            const actionState = activeActions[q.id];
            const isFeedback = feedbackMsg?.id === q.id;
            const partnerAns = partnerResponses.find((r) => r.question_id === q.id);
            const currentAns = answers[q.id] || '';
            const isVoiceAns = currentAns.startsWith('[voice:');

            return (
              <div
                key={q.id}
                className="rounded-3xl border border-theme bg-theme-card p-5 sm:p-7 shadow-sm transition-all"
              >
                {/* Question Header & Status */}
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-baseline space-x-3">
                    <span className="font-mono text-xs sm:text-sm text-theme-muted font-medium">
                      {String(idx + 1).padStart(2, '0')} /
                    </span>
                    <h3 className="font-serif text-lg sm:text-xl font-bold text-theme-primary leading-snug">
                      {q.question}
                    </h3>
                  </div>

                  <div className="shrink-0">
                    {status === 'SUBMITTED' ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-[#00D26A]/30 bg-[#00D26A]/15 px-3 py-1 text-xs font-mono font-medium text-[#00D26A]">
                        <Check className="h-3 w-3" /> Shared
                      </span>
                    ) : status === 'DRAFT' ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-[#FB923C]/30 bg-[#FB923C]/15 px-3 py-1 text-xs font-mono font-medium text-[#FB923C]">
                        <Bookmark className="h-3 w-3" /> Draft
                      </span>
                    ) : (
                      <span className="inline-flex items-center rounded-full bg-theme-input border border-theme px-3 py-1 text-xs font-mono text-theme-muted">
                        Unwritten
                      </span>
                    )}
                  </div>
                </div>

                {/* Answer Input or Voice Preview */}
                <div className="mt-4">
                  {isVoiceAns ? (
                    <div className="rounded-2xl border border-theme bg-theme-input p-4 flex items-center justify-between">
                      <div>
                        <span className="text-[10px] font-mono uppercase tracking-widest text-theme-muted block mb-1">
                          Your Voice Reflection:
                        </span>
                        {renderAnswerBody(currentAns, true)}
                      </div>
                      <button
                        type="button"
                        onClick={() => setAnswers((prev) => ({ ...prev, [q.id]: '' }))}
                        className="text-xs text-[#5B58E6] hover:underline font-mono"
                      >
                        Change to text
                      </button>
                    </div>
                  ) : (
                    <textarea
                      value={currentAns}
                      onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                      placeholder="Write a sweet reflection..."
                      rows={3}
                      className="w-full rounded-2xl border border-theme bg-theme-input p-4 text-xs sm:text-sm md:text-base text-theme-primary placeholder-theme-muted focus:border-[#5B58E6] focus:bg-theme-card focus:outline-none focus:ring-2 focus:ring-[#5B58E6]/20 leading-relaxed"
                    />
                  )}
                </div>

                {/* Action Toolbar */}
                <div className="mt-4 flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-theme-subtle">
                  <div className="flex items-center space-x-2">
                    {/* Voice Note Option */}
                    {!isVoiceAns && (
                      <VoiceRecorder
                        onSendVoice={(url, dur) => handleVoiceAnswer(q.id, url, dur)}
                      />
                    )}

                    {isFeedback && (
                      <span
                        className={`text-xs font-mono flex items-center gap-1.5 ${
                          feedbackMsg.type === 'success' ? 'text-[#00D26A]' : 'text-[#FB923C]'
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
                      className="flex items-center space-x-2 rounded-full border border-theme bg-theme-input px-4 py-2 text-xs sm:text-sm font-medium text-theme-secondary hover:bg-theme-card hover:text-theme-primary disabled:opacity-40 transition-all min-h-[40px]"
                    >
                      <Bookmark className="h-3.5 w-3.5" />
                      <span>{actionState === 'saving' ? 'Saving...' : 'Draft'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleSendQuestion(q.id)}
                      disabled={actionState === 'submitting' || actionState === 'saving'}
                      title="Send answer to partner"
                      className="flex items-center space-x-2 rounded-full bg-[#5B58E6] px-5 py-2 text-xs sm:text-sm font-medium text-white hover:bg-[#4A46DC] disabled:opacity-40 transition-all min-h-[40px] shadow-sm shadow-[#5B58E6]/25"
                    >
                      <Send className="h-3.5 w-3.5" />
                      <span>{actionState === 'submitting' ? 'Sending...' : status === 'SUBMITTED' ? 'Update & Share' : 'Send'}</span>
                    </button>
                  </div>
                </div>

                {/* Partner's Submitted Response */}
                {partnerStatus === 'SUBMITTED' && partnerAns ? (
                  <div className="mt-5 rounded-3xl border border-[#5B58E6]/20 bg-[#5B58E6]/5 p-4 sm:p-5 space-y-1">
                    <div className="flex items-center space-x-1.5 text-[11px] font-mono text-[#5B58E6] font-medium">
                      <Heart className="h-3 w-3 fill-current" />
                      <span>{partner?.name}'s response:</span>
                    </div>
                    <div className="pt-1">
                      {renderAnswerBody(partnerAns.answer, false) || (
                        <p className="text-xs sm:text-sm md:text-base text-theme-primary italic font-serif">
                          "(Left blank)"
                        </p>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="mt-3.5 flex items-center space-x-2 text-[11px] font-mono text-theme-muted">
                    <Clock className="h-3.5 w-3.5" />
                    <span>{partner?.name}'s note will appear here once shared.</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Keepsake Archive Modal Dialog */}
      <KeepsakeArchiveModal
        isOpen={showArchiveModal}
        onClose={() => setShowArchiveModal(false)}
      />
    </div>
  );
};
