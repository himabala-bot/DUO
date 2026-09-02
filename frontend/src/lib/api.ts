import { supabase } from './supabase';
import {
  UserProfile,
  PartnerProfile,
  Duo,
  ConnectionRequest,
  PairingSession,
  Message,
  Drawing,
  DailyQuestion,
  DailyResponse,
  DailyHistoryDay,
  NotificationItem,
} from '@/types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

class ApiError extends Error {
  status: number;
  data: any;

  constructor(message: string, status: number, data?: any) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const session = (await supabase.auth.getSession()).data.session;
  const token = session?.access_token;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const url = `${API_BASE_URL.replace(/\/$/, '')}/${endpoint.replace(/^\//, '')}`;

  const response = await fetch(url, {
    ...options,
    headers,
  });

  const isJson = response.headers.get('content-type')?.includes('application/json');
  const data = isJson ? await response.json() : null;

  if (!response.ok) {
    const errorMessage =
      data?.error ||
      data?.detail ||
      data?.message ||
      (typeof data === 'object' ? JSON.stringify(data) : 'An unexpected error occurred');
    throw new ApiError(errorMessage, response.status, data);
  }

  return data as T;
}

// 1. AUTHENTICATION & PROFILE APIS
export const authApi = {
  sync: async (): Promise<{ success: boolean; profile: UserProfile }> => {
    return request<{ success: boolean; profile: UserProfile }>('/api/auth/sync/', {
      method: 'POST',
    });
  },

  getProfile: async (): Promise<UserProfile> => {
    return request<UserProfile>('/api/auth/profile/');
  },

  updateProfile: async (data: {
    name?: string;
    avatar_url?: string;
    enter_to_send?: boolean;
    read_receipts?: boolean;
    notifications_enabled?: boolean;
    theme?: string;
  }): Promise<{ success: boolean; profile: UserProfile }> => {
    return request<{ success: boolean; profile: UserProfile }>('/api/auth/profile/', {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  deleteAccount: async (): Promise<{ success: boolean; message: string }> => {
    return request<{ success: boolean; message: string }>('/api/auth/profile/', {
      method: 'DELETE',
    });
  },
};

// 2. DUO CONNECTION SYSTEM APIS
export const duoApi = {
  getCurrent: async (): Promise<{
    has_active_duo: boolean;
    duo_code: string;
    my_profile: { id: string; name: string; email: string; avatar_url: string };
    duo: Duo | null;
    partner: { id: string; name: string; email: string; avatar_url: string } | null;
  }> => {
    return request('/api/duo/');
  },

  regenerateCode: async (): Promise<{ success: boolean; duo_code: string }> => {
    return request('/api/duo/regenerate-code/', { method: 'POST' });
  },

  connect: async (code: string): Promise<{ success: boolean; message: string; request?: ConnectionRequest; duo_id?: string }> => {
    return request('/api/duo/connect/', {
      method: 'POST',
      body: JSON.stringify({ code }),
    });
  },

  getRequests: async (): Promise<{ incoming: ConnectionRequest[]; outgoing: ConnectionRequest[] }> => {
    return request('/api/duo/requests/');
  },

  acceptRequest: async (requestId: string): Promise<{ success: boolean; message: string; duo_id: string }> => {
    return request(`/api/duo/requests/${requestId}/accept/`, { method: 'POST' });
  },

  declineRequest: async (requestId: string): Promise<{ success: boolean; message: string }> => {
    return request(`/api/duo/requests/${requestId}/decline/`, { method: 'POST' });
  },

  cancelRequest: async (requestId: string): Promise<{ success: boolean; message: string }> => {
    return request(`/api/duo/requests/${requestId}/cancel/`, { method: 'POST' });
  },

  leave: async (): Promise<{ success: boolean; message: string }> => {
    return request('/api/duo/leave/', { method: 'POST' });
  },

  createPairingSession: async (params?: { force_new?: boolean }): Promise<{ success: boolean; session: PairingSession }> => {
    return request('/api/duo/pairing/create/', {
      method: 'POST',
      body: params ? JSON.stringify(params) : undefined,
    });
  },

  getPairingSession: async (params: { token?: string; code?: string }): Promise<{
    success: boolean;
    session: PairingSession;
    is_valid: boolean;
  }> => {
    const searchParams = new URLSearchParams();
    if (params.token) searchParams.set('token', params.token);
    if (params.code) searchParams.set('code', params.code);
    return request(`/api/duo/pairing/?${searchParams.toString()}`);
  },

  claimPairingSession: async (data: { token?: string; code?: string }): Promise<{
    success: boolean;
    message: string;
    duo_id: string;
    partner: PartnerProfile;
  }> => {
    return request('/api/duo/pairing/claim/', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  cancelPairingSession: async (token?: string): Promise<{ success: boolean; message: string }> => {
    return request('/api/duo/pairing/cancel/', {
      method: 'POST',
      body: JSON.stringify({ token }),
    });
  },
};

// 3. MESSAGING APIS
export const messagesApi = {
  list: async (): Promise<{ messages: Message[]; disappearing_mode?: boolean; count: number }> => {
    return request('/api/messages/');
  },

  send: async (content: string, replyToId?: string | null): Promise<Message> => {
    return request('/api/messages/', {
      method: 'POST',
      body: JSON.stringify({ content, reply_to_id: replyToId || null }),
    });
  },

  react: async (id: string, emoji: string): Promise<{ success: boolean; message_id: string; reactions: Record<string, string> }> => {
    return request(`/api/messages/${id}/react/`, {
      method: 'POST',
      body: JSON.stringify({ emoji }),
    });
  },

  delete: async (id: string): Promise<{ success: boolean; message_id: string; action: string }> => {
    return request(`/api/messages/${id}/`, {
      method: 'DELETE',
    });
  },

  clearHistory: async (): Promise<{ success: boolean; message: string; cleared_count: number }> => {
    return request('/api/messages/clear/', {
      method: 'POST',
    });
  },

  markRead: async (): Promise<{ success: boolean; marked_count?: number; disappearing_started?: number }> => {
    return request('/api/messages/mark-read/', { method: 'POST' });
  },

  toggleDisappearingMode: async (enabled?: boolean): Promise<{ success: boolean; disappearing_mode: boolean }> => {
    return request('/api/messages/disappearing-mode/', {
      method: 'POST',
      body: JSON.stringify(enabled !== undefined ? { enabled } : {}),
    });
  },

  expireMessages: async (messageIds?: string[]): Promise<{ success: boolean; deleted_count: number; deleted_ids: string[] }> => {
    return request('/api/messages/expire/', {
      method: 'POST',
      body: JSON.stringify(messageIds ? { message_ids: messageIds } : {}),
    });
  },
};

// 4. DRAWING SYSTEM APIS
export const drawingsApi = {
  list: async (): Promise<{ drawings: Drawing[]; count: number }> => {
    return request('/api/drawings/');
  },

  uploadToSupabaseStorage: async (blob: Blob, duoId: string): Promise<string> => {
    const filename = `${duoId}/${Date.now()}_${Math.random().toString(36).substring(2, 9)}.png`;
    const { data, error } = await supabase.storage.from('drawings').upload(filename, blob, {
      contentType: 'image/png',
      upsert: false,
    });

    if (error) {
      throw error;
    }

    try {
      const { data: signedData } = await supabase.storage
        .from('drawings')
        .createSignedUrl(data.path, 60 * 60 * 24 * 30);
      if (signedData?.signedUrl) {
        return signedData.signedUrl;
      }
    } catch {
      // fallback to public url
    }

    const { data: pubData } = supabase.storage.from('drawings').getPublicUrl(data.path);
    if (pubData?.publicUrl) {
      return pubData.publicUrl;
    }

    return data.path;
  },

  create: async (storagePath: string, caption: string = ''): Promise<Drawing> => {
    return request('/api/drawings/', {
      method: 'POST',
      body: JSON.stringify({ storage_path: storagePath, caption }),
    });
  },

  getDetail: async (id: string): Promise<Drawing> => {
    return request(`/api/drawings/${id}/`);
  },
};

// 5. DAILY QUESTIONS & PRIVATE DRAFTS APIS
export const dailyApi = {
  getQuestions: async (): Promise<{ questions: DailyQuestion[]; count: number }> => {
    return request('/api/daily/questions/');
  },

  getResponses: async (date?: string): Promise<{
    date: string;
    questions: DailyQuestion[];
    my_status: 'NOT_STARTED' | 'DRAFT' | 'SUBMITTED';
    partner_status: 'NOT_SUBMITTED' | 'SUBMITTED';
    my_responses: DailyResponse[];
    partner_responses: DailyResponse[];
  }> => {
    const query = date ? `?date=${date}` : '';
    return request(`/api/daily/responses/${query}`);
  },

  saveResponses: async (
    responses: { question_id: string; answer: string; assignment_id?: string }[],
    action: 'SAVE_DRAFT' | 'SUBMIT' = 'SUBMIT',
    date?: string
  ): Promise<{ success: boolean; status: string; date: string; message: string; responses: DailyResponse[] }> => {
    return request('/api/daily/responses/', {
      method: 'POST',
      body: JSON.stringify({ responses, action, date }),
    });
  },

  changeQuestion: async (
    assignmentId: string
  ): Promise<{ success: boolean; message: string; assignment: any; question: DailyQuestion }> => {
    return request(`/api/daily/questions/${assignmentId}/change/`, {
      method: 'POST',
    });
  },

  getHistory: async (): Promise<{ history: DailyHistoryDay[]; total_days: number }> => {
    return request('/api/daily/history/');
  },
};

// 6. NOTIFICATIONS APIS
export const notificationsApi = {
  list: async (): Promise<{ unread_count: number; notifications: NotificationItem[] }> => {
    return request('/api/notifications/');
  },

  markRead: async (id: string): Promise<{ success: boolean; notification: NotificationItem }> => {
    return request(`/api/notifications/${id}/read/`, { method: 'POST' });
  },

  markAllRead: async (): Promise<{ success: boolean; marked_read: number }> => {
    return request('/api/notifications/read-all/', { method: 'POST' });
  },
};

// 7. LITTLE NOTES APIS
export const notesApi = {
  list: async (): Promise<{ notes: import('@/types').LittleNote[]; count: number }> => {
    return request('/api/notes/');
  },

  create: async (data: {
    note_type: 'TEXT' | 'PHOTO' | 'VOICE' | 'DRAWING';
    content?: string;
    media_url?: string;
    color?: string;
    is_pinned?: boolean;
  }): Promise<import('@/types').LittleNote> => {
    return request('/api/notes/', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  update: async (
    id: string,
    data: { is_pinned?: boolean; content?: string; color?: string; media_url?: string }
  ): Promise<import('@/types').LittleNote> => {
    return request(`/api/notes/${id}/`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  delete: async (id: string): Promise<{ success: boolean; message: string }> => {
    return request(`/api/notes/${id}/`, { method: 'DELETE' });
  },
};

// 8. COUPLE TO-DO & KANBAN TASKS APIS
export const tasksApi = {
  list: async (): Promise<{ tasks: import('@/types').Task[]; count: number }> => {
    return request('/api/todos/');
  },

  create: async (data: {
    title: string;
    description?: string;
    status?: import('@/types').TaskStatus;
  }): Promise<import('@/types').Task> => {
    return request('/api/todos/', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  update: async (
    id: string,
    data: {
      title?: string;
      description?: string;
      status?: import('@/types').TaskStatus;
      order?: number;
    }
  ): Promise<import('@/types').Task> => {
    return request(`/api/todos/${id}/`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  delete: async (id: string): Promise<{ success: boolean; message: string }> => {
    return request(`/api/todos/${id}/`, { method: 'DELETE' });
  },
};

export const todosApi = tasksApi;
