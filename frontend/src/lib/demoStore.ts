import {
  DEMO_USER_A,
  DEMO_USER_B,
  DEMO_PARTNER_A,
  DEMO_PARTNER_B,
  getInitialDemoMessages,
  getInitialDemoQuestions,
  getInitialDemoDailyResponses,
  getInitialDemoTasks,
  getInitialDemoNotes,
  getInitialDemoNotifications,
} from './demoData';
import {
  UserProfile,
  PartnerProfile,
  Message,
  DailyQuestion,
  DailyResponse,
  Task,
  LittleNote,
  NotificationItem,
} from '@/types';
import { supabase } from './supabase';

const DEMO_STORAGE_KEY = 'duo_demo_store_v1';
const DEMO_CHANNEL_NAME = 'duo_demo_session_channel';

interface DemoStoreState {
  messages: Message[];
  disappearing_mode: boolean;
  questions: DailyQuestion[];
  responses: Record<string, DailyResponse>; // key: `${question_id}_${user_id}`
  tasks: Task[];
  notes: LittleNote[];
  notifications: NotificationItem[];
}

function getInitialStore(): DemoStoreState {
  return {
    messages: getInitialDemoMessages(),
    disappearing_mode: false,
    questions: getInitialDemoQuestions(),
    responses: getInitialDemoDailyResponses(),
    tasks: getInitialDemoTasks(),
    notes: getInitialDemoNotes(),
    notifications: getInitialDemoNotifications(),
  };
}

let memoryState: DemoStoreState | null = null;
let broadcastChannel: BroadcastChannel | null = null;

if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
  try {
    broadcastChannel = new BroadcastChannel('duo_demo_broadcast_channel');
  } catch {}
}

function loadState(): DemoStoreState {
  if (memoryState) return memoryState;

  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem(DEMO_STORAGE_KEY);
      if (stored) {
        memoryState = JSON.parse(stored);
        return memoryState!;
      }
    } catch {}
  }

  memoryState = getInitialStore();
  saveState(memoryState);
  return memoryState;
}

function saveState(state: DemoStoreState, broadcast = true) {
  memoryState = state;
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(state));
    } catch {}
  }

  if (broadcast && broadcastChannel) {
    broadcastChannel.postMessage({ type: 'DEMO_STATE_UPDATED', payload: state });
  }

  // Also broadcast on Supabase channel if available
  try {
    const channel = supabase.channel(DEMO_CHANNEL_NAME);
    channel.send({
      type: 'broadcast',
      event: 'demo_sync',
      payload: { timestamp: Date.now() },
    }).catch(() => {});
  } catch {}
}

// Listen for cross-tab updates via BroadcastChannel
if (broadcastChannel) {
  broadcastChannel.onmessage = (event) => {
    if (event.data?.type === 'DEMO_STATE_UPDATED' && event.data?.payload) {
      memoryState = event.data.payload;
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('duo_demo_event', { detail: event.data }));
      }
    }
  };
}

// Helper to determine current demo user based on URL or session
export function getDemoUser(role: 'user_a' | 'user_b' = 'user_a'): UserProfile {
  return role === 'user_b' ? DEMO_USER_B : DEMO_USER_A;
}

export function getDemoPartner(role: 'user_a' | 'user_b' = 'user_a'): PartnerProfile {
  return role === 'user_b' ? DEMO_PARTNER_A : DEMO_PARTNER_B;
}

export const demoStore = {
  reset() {
    const fresh = getInitialStore();
    saveState(fresh);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('duo_demo_reset'));
    }
    return fresh;
  },

  // Messages API
  getMessages(userRole: 'user_a' | 'user_b' = 'user_a'): { messages: Message[]; disappearing_mode: boolean } {
    const state = loadState();
    const myId = userRole === 'user_b' ? DEMO_USER_B.id : DEMO_USER_A.id;
    const localized = state.messages.map((m) => ({
      ...m,
      is_me: m.sender.id === myId,
    }));
    return {
      messages: localized,
      disappearing_mode: state.disappearing_mode,
    };
  },

  sendMessage(senderRole: 'user_a' | 'user_b', content: string, type: string = 'TEXT', replyToId?: string): Message {
    const state = loadState();
    const sender = senderRole === 'user_b' ? DEMO_PARTNER_B : DEMO_PARTNER_A;
    const receiver = senderRole === 'user_b' ? DEMO_PARTNER_A : DEMO_PARTNER_B;

    let replyToObj = null;
    if (replyToId) {
      const found = state.messages.find((m) => m.id === replyToId);
      if (found) {
        replyToObj = {
          id: found.id,
          sender_name: found.sender.name,
          content: found.content,
        };
      }
    }

    const newMsg: Message = {
      id: `demo-msg-${Date.now()}`,
      duo_id: 'demo-duo-session',
      sender,
      receiver,
      content,
      reply_to: replyToObj,
      is_me: true,
      read_at: null,
      is_disappearing: state.disappearing_mode,
      expires_at: state.disappearing_mode ? new Date(Date.now() + 10000).toISOString() : null,
      created_at: new Date().toISOString(),
      reactions: {},
    };

    const nextState = {
      ...state,
      messages: [...state.messages, newMsg],
    };

    saveState(nextState);

    // Supabase broadcast for chat
    try {
      const channel = supabase.channel(`duo_chat:demo-duo-session`);
      channel.send({
        type: 'broadcast',
        event: 'new_message',
        payload: newMsg,
      }).catch(() => {});
    } catch {}

    return newMsg;
  },

  markMessagesRead(readerRole: 'user_a' | 'user_b') {
    const state = loadState();
    const readerId = readerRole === 'user_b' ? DEMO_USER_B.id : DEMO_USER_A.id;

    let changed = false;
    const updatedMessages = state.messages.map((m) => {
      if (m.sender.id !== readerId && !m.read_at) {
        changed = true;
        return { ...m, read_at: new Date().toISOString() };
      }
      return m;
    });

    if (changed) {
      saveState({ ...state, messages: updatedMessages });
    }
  },

  toggleReaction(messageId: string, userRole: 'user_a' | 'user_b', reaction: string) {
    const state = loadState();
    const userId = userRole === 'user_b' ? DEMO_USER_B.id : DEMO_USER_A.id;

    const updated = state.messages.map((m) => {
      if (m.id !== messageId) return m;
      const reactions = { ...(m.reactions || {}) };

      if (reactions[userId] === reaction) {
        delete reactions[userId];
      } else {
        reactions[userId] = reaction;
      }
      return { ...m, reactions };
    });

    saveState({ ...state, messages: updated });
  },

  setDisappearingMode(enabled: boolean) {
    const state = loadState();
    saveState({ ...state, disappearing_mode: enabled });
  },

  // Daily Questions API
  getDailyData(userRole: 'user_a' | 'user_b') {
    const state = loadState();
    const myId = userRole === 'user_b' ? DEMO_USER_B.id : DEMO_USER_A.id;
    const partnerId = userRole === 'user_b' ? DEMO_USER_A.id : DEMO_USER_B.id;

    const myResponses: DailyResponse[] = [];
    const partnerResponses: DailyResponse[] = [];

    state.questions.forEach((q) => {
      const myKey = `${q.id}_${myId}`;
      const partnerKey = `${q.id}_${partnerId}`;

      if (state.responses[myKey]) {
        myResponses.push({ ...state.responses[myKey], is_me: true });
      }
      if (state.responses[partnerKey]) {
        partnerResponses.push({ ...state.responses[partnerKey], is_me: false });
      }
    });

    const hasAnsweredToday = myResponses.some((r) => r.question_id === state.questions[0]?.id && r.status === 'SUBMITTED');
    const partnerHasAnsweredToday = partnerResponses.some((r) => r.question_id === state.questions[0]?.id && r.status === 'SUBMITTED');

    return {
      questions: state.questions,
      my_responses: myResponses,
      partner_responses: partnerResponses,
      partner_status: partnerHasAnsweredToday ? 'SUBMITTED' : 'NOT_STARTED',
      both_answered: hasAnsweredToday && partnerHasAnsweredToday,
    };
  },

  submitDailyResponse(userRole: 'user_a' | 'user_b', questionId: string, answer: string): DailyResponse {
    const state = loadState();
    const myId = userRole === 'user_b' ? DEMO_USER_B.id : DEMO_USER_A.id;
    const myName = userRole === 'user_b' ? DEMO_USER_B.name : DEMO_USER_A.name;
    const question = state.questions.find((q) => q.id === questionId);
    const key = `${questionId}_${myId}`;

    const newResponse: DailyResponse = {
      id: `demo-resp-${Date.now()}`,
      question_id: questionId,
      question_text: question?.question || 'Daily Reflection',
      question_genre: question?.genre,
      user_id: myId,
      user_name: myName,
      answer,
      response_date: new Date().toISOString().split('T')[0],
      status: 'SUBMITTED',
      submitted_at: new Date().toISOString(),
      is_me: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    saveState({
      ...state,
      responses: {
        ...state.responses,
        [key]: newResponse,
      },
    });

    return newResponse;
  },

  // Tasks (Kanban) API
  getTasks(userRole: 'user_a' | 'user_b' = 'user_a'): Task[] {
    const state = loadState();
    const myId = userRole === 'user_b' ? DEMO_USER_B.id : DEMO_USER_A.id;
    return state.tasks.map((t) => ({
      ...t,
      is_me: t.created_by.id === myId,
    }));
  },

  createTask(title: string, description: string = '', status: string = 'TODO', userRole: 'user_a' | 'user_b' = 'user_a'): Task {
    const state = loadState();
    const creator = userRole === 'user_b' ? DEMO_PARTNER_B : DEMO_PARTNER_A;

    const newTask: Task = {
      id: `demo-task-${Date.now()}`,
      duo_id: 'demo-duo-session',
      created_by: creator,
      title,
      description,
      status: status as any,
      order: state.tasks.length,
      is_me: true,
      completed_at: status === 'COMPLETED' ? new Date().toISOString() : null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    saveState({
      ...state,
      tasks: [...state.tasks, newTask],
    });

    return newTask;
  },

  updateTask(taskId: string, patch: Partial<Task>): Task | null {
    const state = loadState();
    let updatedTask: Task | null = null;

    const updatedTasks = state.tasks.map((t) => {
      if (t.id === taskId) {
        updatedTask = {
          ...t,
          ...patch,
          completed_at: patch.status === 'COMPLETED' ? (t.completed_at || new Date().toISOString()) : (patch.status ? null : t.completed_at),
          updated_at: new Date().toISOString(),
        };
        return updatedTask;
      }
      return t;
    });

    if (updatedTask) {
      saveState({ ...state, tasks: updatedTasks });
    }

    return updatedTask;
  },

  deleteTask(taskId: string) {
    const state = loadState();
    saveState({
      ...state,
      tasks: state.tasks.filter((t) => t.id !== taskId),
    });
  },

  // Notes API
  getNotes(userRole: 'user_a' | 'user_b' = 'user_a'): LittleNote[] {
    const state = loadState();
    const myId = userRole === 'user_b' ? DEMO_USER_B.id : DEMO_USER_A.id;
    return state.notes.map((n) => ({
      ...n,
      is_me: n.author.id === myId,
    }));
  },

  createNote(data: { note_type: 'TEXT' | 'PHOTO' | 'VOICE' | 'DRAWING'; content?: string; media_url?: string; color?: string; is_pinned?: boolean }, userRole: 'user_a' | 'user_b' = 'user_a'): LittleNote {
    const state = loadState();
    const author = userRole === 'user_b' ? DEMO_PARTNER_B : DEMO_PARTNER_A;

    const newNote: LittleNote = {
      id: `demo-note-${Date.now()}`,
      duo_id: 'demo-duo-session',
      author,
      note_type: data.note_type,
      content: data.content || '',
      media_url: data.media_url || '',
      color: data.color || '#FB923C',
      is_pinned: data.is_pinned || false,
      is_me: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    saveState({
      ...state,
      notes: [newNote, ...state.notes],
    });

    return newNote;
  },

  // Notifications API
  getNotifications(userRole: 'user_a' | 'user_b'): { notifications: NotificationItem[]; unread_count: number } {
    const state = loadState();
    const userId = userRole === 'user_b' ? DEMO_USER_B.id : DEMO_USER_A.id;
    const userNotifs = state.notifications.filter((n) => n.recipient_id === userId || !n.recipient_id);
    const unread = userNotifs.filter((n) => !n.is_read).length;

    return {
      notifications: userNotifs,
      unread_count: unread,
    };
  },

  markNotificationRead(notifId: string) {
    const state = loadState();
    const updated = state.notifications.map((n) => (n.id === notifId ? { ...n, is_read: true } : n));
    saveState({ ...state, notifications: updated });
  },
};
