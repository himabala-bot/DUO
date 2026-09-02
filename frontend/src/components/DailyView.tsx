'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { dailyApi } from '@/lib/api';
import { DailyQuestion, DailyResponse, QuestionGenre } from '@/types';
import {
  Check,
  Clock,
  Bookmark,
  Send,
  CheckCircle2,
  Heart,
  Sparkles,
  BookOpen,
  Shuffle,
  Smile,
  Compass,
  ArrowRight,
  Trash2,
  Mic,
} from 'lucide-react';
import { format } from 'date-fns';
import { supabase } from '@/lib/supabase';
import { KeepsakeArchiveModal } from './KeepsakeArchiveModal';
import { VoiceRecorder } from './VoiceRecorder';
import { WaveformPlayer } from './WaveformPlayer';
import { Avatar } from './Avatar';

export const DailyView: React.FC = () => {
  const { profile, partner } = useAuth();
  const { toast } = useToast();
  const [questions, setQuestions] = useState<DailyQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [questionStatuses, setQuestionStatuses] = useState<Record<string, 'DRAFT' | 'SUBMITTED' | 'NOT_STARTED'>>({});
  const [partnerResponses, setPartnerResponses] = useState<DailyResponse[]>([]);
  const [partnerStatus, setPartnerStatus] = useState<string>('NOT_STARTED');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [activeActions, setActiveActions] = useState<Record<string, 'saving' | 'submitting' | 'changing' | null>>({});
  const [feedbackMsg, setFeedbackMsg] = useState<{ id: string; type: 'success' | 'draft'; text: string } | null>(null);
  const [showArchiveModal, setShowArchiveModal] = useState(false);
  const [recordingVoiceQId, setRecordingVoiceQId] = useState<string | null>(null);

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

      setAnswers((prev) => ({ ...initialAnswers, ...prev }));
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

  const handleSaveQuestionDraft = async (q: DailyQuestion) => {
    const text = answers[q.id] || '';
    setActiveActions((prev) => ({ ...prev, [q.id]: 'saving' }));
    setFeedbackMsg(null);

    try {
      await dailyApi.saveResponses([
        { question_id: q.id, answer: text, assignment_id: q.assignment_id }
      ], 'SAVE_DRAFT');
      setQuestionStatuses((prev) => ({ ...prev, [q.id]: 'DRAFT' }));
      toast.love('Saved privately in your drafts', 'Draft Saved');
      setFeedbackMsg({
        id: q.id,
        type: 'draft',
        text: 'Saved privately in your drafts',
      });
      setTimeout(() => setFeedbackMsg(null), 3000);
    } catch (err: any) {
      toast.error(err.message || 'Failed to save draft.', 'Draft Error');
    } finally {
      setActiveActions((prev) => ({ ...prev, [q.id]: null }));
    }
  };

  const handleSendQuestion = async (q: DailyQuestion) => {
    const rawAnswer = (answers[q.id] || '').trim();
    if (!rawAnswer) {
      toast.info('Please write or record a reflection before sending', 'Empty Reflection');
      return;
    }

    setActiveActions((prev) => ({ ...prev, [q.id]: 'submitting' }));
    setFeedbackMsg(null);

    try {
      await dailyApi.saveResponses([
        { question_id: q.id, answer: rawAnswer, assignment_id: q.assignment_id }
      ], 'SUBMIT');
      setQuestionStatuses((prev) => ({ ...prev, [q.id]: 'SUBMITTED' }));
      toast.love(`Sealed and shared with ${partner?.name || 'partner'}`, 'Shared With Partner');
      setFeedbackMsg({
        id: q.id,
        type: 'success',
        text: `Shared with ${partner?.name || 'partner'}`,
      });

      if (profile?.active_duo_id) {
        const duoChan = supabase.channel(`duo:${profile.active_duo_id}`);
        duoChan.send({
          type: 'broadcast',
          event: 'daily_response',
          payload: { user_id: profile.id },
        });
      }

      await fetchTodayData();
      setTimeout(() => setFeedbackMsg(null), 4000);
    } catch (err: any) {
      toast.error(err.message || 'Failed to submit response.', 'Error');
    } finally {
      setActiveActions((prev) => ({ ...prev, [q.id]: null }));
    }
  };

  const handleVoiceAnswer = async (q: DailyQuestion, audioDataUrl: string, duration: number) => {
    const voicePayload = `[voice:${JSON.stringify({ url: audioDataUrl, duration })}]`;
    setAnswers((prev) => ({ ...prev, [q.id]: voicePayload }));
    setActiveActions((prev) => ({ ...prev, [q.id]: 'submitting' }));

    try {
      await dailyApi.saveResponses([
        { question_id: q.id, answer: voicePayload, assignment_id: q.assignment_id }
      ], 'SUBMIT');
      setQuestionStatuses((prev) => ({ ...prev, [q.id]: 'SUBMITTED' }));
      toast.love(`Voice reflection shared with ${partner?.name || 'partner'}`, 'Voice Note Shared');

      if (profile?.active_duo_id) {
        const duoChan = supabase.channel(`duo:${profile.active_duo_id}`);
        duoChan.send({
          type: 'broadcast',
          event: 'daily_response',
          payload: { user_id: profile.id },
        });
      }

      await fetchTodayData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to submit voice note.', 'Error');
    } finally {
      setActiveActions((prev) => ({ ...prev, [q.id]: null }));
    }
  };

  const handleChangeQuestion = async (q: DailyQuestion) => {
    if (!q.assignment_id) return;
    setActiveActions((prev) => ({ ...prev, [q.id]: 'changing' }));

    try {
      const res = await dailyApi.changeQuestion(q.assignment_id);
      if (res.success && res.question) {
        setQuestions((prev) =>
          prev.map((item) => (item.id === q.id ? res.question : item))
        );
        // Clear previous unsubmitted draft text for this question slot
        setAnswers((prev) => {
          const next = { ...prev };
          delete next[q.id];
          return next;
        });
        toast.love(`Replaced with a fresh ${getGenreInfo(q.genre).label} question!`, 'Question Changed');
      }
    } catch (err: any) {
      toast.error(err.message || 'Could not change question.', 'Change Error');
    } finally {
      setActiveActions((prev) => ({ ...prev, [q.id]: null }));
    }
  };

  const getGenreInfo = (genre?: QuestionGenre) => {
    switch (genre) {
      case 'FUN':
        return {
          label: 'Fun & Playful',
          badge: 'bg-[#00D26A]/10 text-[#00D26A] border-[#00D26A]/25',
          icon: Smile,
        };
      case 'DEEP':
        return {
          label: 'Deep & Emotional',
          badge: 'bg-[#125CB9]/10 text-[#125CB9] border-[#125CB9]/25',
          icon: Heart,
        };
      case 'IMAGINATIVE':
      default:
        return {
          label: 'Imaginative & Hypothetical',
          badge: 'bg-[#FB923C]/10 text-[#FB923C] border-[#FB923C]/25',
          icon: Sparkles,
        };
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

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center space-y-2">
          <Heart className="h-6 w-6 text-[#125CB9] animate-bounce mx-auto" />
          <p className="text-xs font-mono text-theme-muted">Opening today's prompts...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full flex justify-center px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
      {/* Centered Daily Reading Area (~800px max) */}
      <div className="w-full max-w-3xl space-y-5">
        {/* Header Block */}
        <div className="pb-4 border-b border-theme flex flex-col sm:flex-row sm:items-baseline justify-between gap-3">
          <div>
            <div className="flex items-center space-x-1.5 text-xs font-mono text-theme-muted">
              <Sparkles className="h-3.5 w-3.5 text-[#FB923C]" />
              <span>{todayFormatted}</span>
            </div>
            <h2 className="mt-1 font-serif text-2xl sm:text-3xl font-bold text-theme-primary">
              Daily Love Prompt
            </h2>
            <p className="mt-0.5 text-xs sm:text-sm text-theme-secondary">
              One thoughtful question each day to draw closer. You and your partner receive unique non-repeating prompts.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
            {/* Previous Answers / Archive Button */}
            <button
              onClick={() => setShowArchiveModal(true)}
              className="flex items-center space-x-1.5 rounded-full border border-theme bg-theme-card px-3.5 py-1.5 text-xs font-medium text-theme-primary hover:bg-theme-card-hover transition-colors shadow-xs"
            >
              <BookOpen className="h-3.5 w-3.5 text-[#125CB9]" />
              <span>Past Answers</span>
            </button>
          </div>
        </div>

        {/* Partner Progress Status Bar */}
        <div className="flex items-center justify-between rounded-[35px] border border-theme bg-theme-card p-4 sm:p-5 shadow-xs">
          <div className="flex items-center space-x-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-2xl border border-theme bg-theme-input text-theme-secondary">
              <Avatar src={partner?.avatar_url} name={partner?.name} size="xs" />
            </span>
            <div>
              <h4 className="font-serif text-xs sm:text-sm font-bold text-theme-primary">
                {partner ? `${partner.name}'s Status` : 'Partner Status'}
              </h4>
              <p className="text-[11px] text-theme-secondary font-mono">
                {partnerStatus === 'SUBMITTED'
                  ? 'Answered today • Reflections unlocked'
                  : 'Has not answered yet today'}
              </p>
            </div>
          </div>

          <span
            className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-mono font-medium ${
              partnerStatus === 'SUBMITTED'
                ? 'bg-[#00D26A]/10 border border-[#00D26A]/25 text-[#00D26A]'
                : 'bg-theme-input border border-theme text-theme-muted'
            }`}
          >
            {partnerStatus === 'SUBMITTED' ? (
              <>
                <CheckCircle2 className="h-3 w-3" /> Shared
              </>
            ) : (
              <>
                <Clock className="h-3 w-3" /> Waiting
              </>
            )}
          </span>
        </div>

        {/* Single Daily Question */}
        <div className="space-y-4">
          {questions.slice(0, 1).map((q) => {
            const status = questionStatuses[q.id] || 'NOT_STARTED';
            const actionState = activeActions[q.id];
            const isFeedback = feedbackMsg?.id === q.id;
            const partnerAns = partnerResponses[0];
            const currentAns = answers[q.id] || '';
            const isVoiceAns = currentAns.startsWith('[voice:');
            const genreInfo = getGenreInfo(q.genre);
            const GenreIcon = genreInfo.icon;

            return (
              <div
                key={q.id}
                className="rounded-[35px] border border-theme bg-theme-card p-5 sm:p-7 shadow-xs transition-all"
              >
                {/* Question Header & Genre Tags */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-theme-subtle">
                  <div className="flex items-center flex-wrap gap-2">
                    {/* Genre Badge */}
                    <span className={`inline-flex items-center space-x-1 rounded-full px-2.5 py-0.5 text-[11px] font-mono font-medium border ${genreInfo.badge}`}>
                      <GenreIcon className="h-3 w-3" />
                      <span>{genreInfo.label}</span>
                    </span>

                    {/* Carry-Forward Indicator */}
                    {q.is_carried_forward && (
                      <span className="inline-flex items-center space-x-1 rounded-full px-2.5 py-0.5 text-[11px] font-mono font-medium border border-[#8B5CF6]/25 bg-[#8B5CF6]/10 text-[#8B5CF6]">
                        <Clock className="h-3 w-3" />
                        <span>Carried over</span>
                      </span>
                    )}
                  </div>

                  <div className="flex items-center space-x-2 self-end sm:self-auto">
                    {/* Change Question Button (Only available if unsubmitted) */}
                    {status !== 'SUBMITTED' && q.assignment_id && (
                      <button
                        type="button"
                        onClick={() => handleChangeQuestion(q)}
                        disabled={actionState === 'changing' || actionState === 'submitting'}
                        className="inline-flex items-center space-x-1 rounded-full border border-theme bg-theme-input px-2.5 py-1 text-[11px] font-mono text-theme-secondary hover:text-theme-primary hover:border-[#125CB9] transition-all disabled:opacity-40"
                        title="Randomly change to another question"
                      >
                        <Shuffle className={`h-3 w-3 ${actionState === 'changing' ? 'animate-spin text-[#125CB9]' : ''}`} />
                        <span>{actionState === 'changing' ? 'Changing...' : 'Change question'}</span>
                      </button>
                    )}

                    {/* Submission Status Badge */}
                    {status === 'SUBMITTED' ? (
                      <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-mono font-medium border border-[#00D26A]/25 bg-[#00D26A]/10 text-[#00D26A]">
                        <Check className="h-3 w-3" /> Shared
                      </span>
                    ) : status === 'DRAFT' ? (
                      <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-mono font-medium border border-[#FB923C]/25 bg-[#FB923C]/10 text-[#FB923C]">
                        <Bookmark className="h-3 w-3" /> Draft
                      </span>
                    ) : (
                      <span className="inline-flex items-center rounded-full bg-theme-input border border-theme px-2.5 py-0.5 text-[11px] font-mono text-theme-muted">
                        Unwritten
                      </span>
                    )}
                  </div>
                </div>

                {/* Question Text */}
                <div className="pt-3.5">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-theme-muted block mb-1">
                    Your Prompt for Today:
                  </span>
                  <h3 className="font-serif text-lg sm:text-xl font-bold text-theme-primary leading-snug">
                    {q.question}
                  </h3>
                </div>

                {/* Answer Input Composer (Chat Section Style) */}
                <div className="mt-4">
                  {status === 'SUBMITTED' ? (
                    <div className="rounded-2xl border border-[#00D26A]/25 bg-[#00D26A]/5 p-4 space-y-2">
                      <span className="text-[10px] font-mono uppercase tracking-wider text-[#00D26A] font-semibold block">
                        Your Shared Reflection:
                      </span>
                      {renderAnswerBody(currentAns, true)}
                    </div>
                  ) : isVoiceAns ? (
                    <div className="rounded-2xl border border-theme bg-theme-input p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-mono uppercase tracking-wider text-theme-muted block">
                          Your Voice Reflection:
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setAnswers((prev) => ({ ...prev, [q.id]: '' }));
                          }}
                          className="text-xs text-theme-muted hover:text-[#F43F5E] transition-colors p-1"
                          title="Discard recording and type text instead"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      {renderAnswerBody(currentAns, true)}

                      <div className="flex items-center justify-end gap-2 pt-2 border-t border-theme-subtle">
                        <button
                          type="button"
                          onClick={() => handleSendQuestion(q)}
                          disabled={activeActions[q.id] === 'submitting'}
                          className="flex items-center space-x-1.5 rounded-full bg-[#125CB9] px-4 py-1.5 text-xs font-medium text-white hover:bg-[#0E4B99] disabled:opacity-40 transition-colors shadow-xs"
                        >
                          <Send className="h-3.5 w-3.5" />
                          <span>{activeActions[q.id] === 'submitting' ? 'Sending...' : 'Send'}</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-theme bg-theme-card p-2 sm:p-2.5 shadow-xs">
                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          handleSendQuestion(q);
                        }}
                        className="flex items-center space-x-2 w-full"
                      >
                        {/* Audio icon on the left (immediately records on click) */}
                        <VoiceRecorder
                          onSendVoice={(url, dur) => handleVoiceAnswer(q, url, dur)}
                        />

                        {/* Space to type message */}
                        <textarea
                          value={currentAns}
                          onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                              e.preventDefault();
                              handleSendQuestion(q);
                            }
                          }}
                          placeholder="Type your reflection here..."
                          rows={1}
                          className="flex-1 max-h-32 min-h-[40px] resize-none rounded-xl border border-theme bg-theme-input px-3.5 py-2 text-xs sm:text-sm text-theme-primary placeholder-theme-muted focus:border-[#125CB9] focus:bg-theme-card focus:outline-none focus:ring-1 focus:ring-[#125CB9] transition-all leading-normal"
                        />

                        {/* Send icon on the right */}
                        <button
                          type="submit"
                          disabled={!currentAns.trim() || activeActions[q.id] === 'submitting'}
                          className="flex h-10 w-10 items-center justify-center rounded-full bg-[#125CB9] text-white shadow-xs hover:bg-[#0E4B99] disabled:opacity-40 disabled:hover:bg-[#125CB9] transition-all shrink-0"
                          title="Send Reflection"
                        >
                          <Send className="h-4 w-4" />
                        </button>
                      </form>

                      {/* Small Draft Helper Link */}
                      {currentAns.trim() && (
                        <div className="flex items-center justify-between px-2 pt-2 border-t border-theme-subtle mt-2 text-[11px] font-mono text-theme-muted">
                          <span>Press Enter to send</span>
                          <button
                            type="button"
                            onClick={() => handleSaveQuestionDraft(q)}
                            disabled={activeActions[q.id] === 'saving'}
                            className="hover:text-theme-primary transition-colors underline"
                          >
                            {activeActions[q.id] === 'saving' ? 'Saving draft...' : 'Save as private draft'}
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Partner's Submitted Response & Unique Question */}
                {partnerStatus === 'SUBMITTED' && partnerAns ? (
                  <div className="mt-4 rounded-3xl border border-[#125CB9]/25 bg-[#125CB9]/5 p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-1.5 text-xs font-mono text-[#125CB9] font-semibold">
                        <Heart className="h-3.5 w-3.5 fill-current" />
                        <span>{partner?.name || 'Partner'}'s Reflection</span>
                      </div>
                      <span className="text-[11px] font-mono text-[#125CB9]/70">
                        Shared Today
                      </span>
                    </div>

                    {partnerAns.question_text && partnerAns.question_text !== q.question && (
                      <div className="pt-1">
                        <span className="text-[10px] font-mono uppercase tracking-wider text-theme-muted block">
                          {partner?.name || 'Partner'}'s Prompt:
                        </span>
                        <p className="font-serif text-sm font-semibold text-theme-primary mt-0.5">
                          {partnerAns.question_text}
                        </p>
                      </div>
                    )}

                    <div className="pt-1.5 border-t border-[#125CB9]/15">
                      <span className="text-[10px] font-mono uppercase tracking-wider text-theme-muted block mb-1">
                        Answer:
                      </span>
                      {renderAnswerBody(partnerAns.answer, false) || (
                        <p className="text-xs sm:text-sm text-theme-primary italic font-serif">
                          "(Left blank)"
                        </p>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="mt-3 flex items-center space-x-1.5 text-xs font-mono text-theme-muted pt-2 border-t border-theme-subtle">
                    <Clock className="h-3.5 w-3.5" />
                    <span>{partner?.name || 'Partner'}'s response will appear here once shared.</span>
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

