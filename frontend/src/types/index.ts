export interface PartnerProfile {
  id: string;
  name: string;
  email: string;
  avatar_url: string;
}

export interface UserProfile {
  id: string;
  auth_user_id: string;
  name: string;
  email: string;
  avatar_url: string;
  duo_code: string;
  has_active_duo: boolean;
  active_duo_id: string | null;
  partner: PartnerProfile | null;
  connected_since?: string | null;
  enter_to_send?: boolean;
  read_receipts?: boolean;
  notifications_enabled?: boolean;
  theme?: 'light' | 'dark' | 'system';
  created_at: string;
  updated_at: string;
}

export interface DuoMember {
  id: string;
  user: PartnerProfile;
  role: string;
  joined_at: string;
}

export interface Duo {
  id: string;
  status: 'ACTIVE' | 'ARCHIVED';
  created_at: string;
  members: DuoMember[];
  partner: PartnerProfile | null;
}

export interface ConnectionRequest {
  id: string;
  sender: PartnerProfile;
  receiver: PartnerProfile;
  status: 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'CANCELLED';
  is_sender: boolean;
  created_at: string;
  updated_at: string;
}

export interface MessageReply {
  id: string;
  sender_name: string;
  content: string;
}

export interface Message {
  id: string;
  duo_id: string;
  sender: PartnerProfile;
  receiver: PartnerProfile;
  content: string;
  reply_to?: MessageReply | null;
  reactions?: Record<string, string>;
  is_unsent?: boolean;
  is_me: boolean;
  created_at: string;
  read_at: string | null;
  isOptimistic?: boolean;
}

export interface Drawing {
  id: string;
  duo_id: string;
  sender: PartnerProfile;
  receiver: PartnerProfile;
  storage_path: string;
  image_url: string;
  caption: string;
  is_me: boolean;
  created_at: string;
}

export interface DailyQuestion {
  id: string;
  question: string;
  category: string;
  order: number;
}

export interface DailyResponse {
  id: string;
  question_id: string;
  question_text: string;
  user_id: string;
  user_name: string;
  answer: string;
  response_date: string;
  status: 'DRAFT' | 'SUBMITTED';
  submitted_at: string | null;
  is_me: boolean;
  created_at: string;
  updated_at: string;
}

export interface DailyHistoryDay {
  date: string;
  my_submitted: boolean;
  partner_submitted: boolean;
  both_submitted: boolean;
  summary: string;
}

export interface NotificationItem {
  id: string;
  recipient_id: string;
  type: 'CONNECTION_REQUEST' | 'CONNECTION_ACCEPTED' | 'MESSAGE' | 'DRAWING' | 'DAILY_RESPONSE';
  title: string;
  body: string;
  reference_id: string | null;
  is_read: boolean;
  created_at: string;
}

export interface LittleNote {
  id: string;
  duo_id: string;
  author: PartnerProfile;
  note_type: 'TEXT' | 'PHOTO' | 'VOICE' | 'DRAWING';
  content: string;
  media_url: string;
  color: string;
  is_pinned: boolean;
  is_me: boolean;
  created_at: string;
  updated_at: string;
}

export interface TodoItem {
  id: string;
  duo_id: string;
  category_id: string;
  created_by: PartnerProfile;
  title: string;
  description: string;
  is_completed: boolean;
  completed_at: string | null;
  order: number;
  is_me: boolean;
  created_at: string;
  updated_at: string;
}

export interface TodoCategory {
  id: string;
  duo_id: string;
  title: string;
  emoji: string;
  color: string;
  order: number;
  items: TodoItem[];
  created_at: string;
}
