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

export const DEMO_PARTNER_A: PartnerProfile = {
  id: 'demo-user-a',
  name: 'Alex',
  email: 'alex@demo.duo',
  avatar_url: 'https://api.dicebear.com/7.x/notionists/svg?seed=Alex',
};

export const DEMO_PARTNER_B: PartnerProfile = {
  id: 'demo-user-b',
  name: 'Sam',
  email: 'sam@demo.duo',
  avatar_url: 'https://api.dicebear.com/7.x/notionists/svg?seed=Sam',
};

export const DEMO_USER_A: UserProfile = {
  id: 'demo-user-a',
  auth_user_id: 'demo-auth-a',
  name: 'Alex',
  email: 'alex@demo.duo',
  duo_code: 'DUO-ALEX01',
  avatar_url: 'https://api.dicebear.com/7.x/notionists/svg?seed=Alex',
  created_at: new Date(Date.now() - 30 * 86400000).toISOString(),
  updated_at: new Date().toISOString(),
  has_active_duo: true,
  active_duo_id: 'demo-duo-session',
  partner: DEMO_PARTNER_B,
};

export const DEMO_USER_B: UserProfile = {
  id: 'demo-user-b',
  auth_user_id: 'demo-auth-b',
  name: 'Sam',
  email: 'sam@demo.duo',
  duo_code: 'DUO-SAM02',
  avatar_url: 'https://api.dicebear.com/7.x/notionists/svg?seed=Sam',
  created_at: new Date(Date.now() - 30 * 86400000).toISOString(),
  updated_at: new Date().toISOString(),
  has_active_duo: true,
  active_duo_id: 'demo-duo-session',
  partner: DEMO_PARTNER_A,
};

export const getInitialDemoMessages = (): Message[] => {
  const now = Date.now();
  return [
    {
      id: 'demo-msg-1',
      duo_id: 'demo-duo-session',
      sender: DEMO_PARTNER_B,
      receiver: DEMO_PARTNER_A,
      content: 'Good morning! Did you remember to water the kitchen herbs before leaving?',
      is_me: false,
      read_at: new Date(now - 3600000 * 4).toISOString(),
      created_at: new Date(now - 3600000 * 4.5).toISOString(),
      reactions: { 'demo-user-a': 'heart' },
    },
    {
      id: 'demo-msg-2',
      duo_id: 'demo-duo-session',
      sender: DEMO_PARTNER_A,
      receiver: DEMO_PARTNER_B,
      content: 'Yes, all watered. I also picked up the fresh espresso beans on my way in.',
      is_me: true,
      read_at: new Date(now - 3600000 * 3.5).toISOString(),
      created_at: new Date(now - 3600000 * 3.8).toISOString(),
      reactions: { 'demo-user-b': 'thumbsup' },
    },
    {
      id: 'demo-msg-3',
      duo_id: 'demo-duo-session',
      sender: DEMO_PARTNER_B,
      receiver: DEMO_PARTNER_A,
      content: 'Wonderful. I added the train schedule for our weekend trip to the To-Do board. Take a look when you get a chance.',
      is_me: false,
      read_at: new Date(now - 3600000 * 2).toISOString(),
      created_at: new Date(now - 3600000 * 2.2).toISOString(),
    },
    {
      id: 'demo-msg-4',
      duo_id: 'demo-duo-session',
      sender: DEMO_PARTNER_A,
      receiver: DEMO_PARTNER_B,
      content: 'Just saw it! Checking seats on the 10:15 AM departure right now.',
      is_me: true,
      read_at: new Date(now - 3600000 * 1).toISOString(),
      created_at: new Date(now - 3600000 * 1.1).toISOString(),
    },
    {
      id: 'demo-msg-5',
      duo_id: 'demo-duo-session',
      sender: DEMO_PARTNER_B,
      receiver: DEMO_PARTNER_A,
      content: 'Perfect. Also, do not forget to answer today\'s daily prompt—I already submitted my reflection.',
      is_me: false,
      read_at: null,
      created_at: new Date(now - 60000 * 15).toISOString(),
    },
  ];
};

export const getInitialDemoQuestions = (): DailyQuestion[] => [
  {
    id: 'demo-q-1',
    question: 'What is a quiet moment from this week that made you feel deeply appreciated?',
    genre: 'DEEP',
    order: 0,
    category: 'Intimacy',
  },
  {
    id: 'demo-q-2',
    question: 'If we could book a spontaneous weekend getaway anywhere within driving distance, where would we go?',
    genre: 'IMAGINATIVE',
    order: 1,
    category: 'Adventure',
  },
];

export const getInitialDemoDailyResponses = (): Record<string, DailyResponse> => ({
  'demo-q-1_demo-user-b': {
    id: 'resp-1',
    question_id: 'demo-q-1',
    question_text: 'What is a quiet moment from this week that made you feel deeply appreciated?',
    user_id: 'demo-user-b',
    user_name: 'Sam',
    answer: 'When you brought me chamomile tea yesterday without me asking while I was on that long conference call.',
    response_date: new Date().toISOString().split('T')[0],
    status: 'SUBMITTED',
    submitted_at: new Date(Date.now() - 3600000 * 2).toISOString(),
    is_me: false,
    created_at: new Date(Date.now() - 3600000 * 2).toISOString(),
    updated_at: new Date(Date.now() - 3600000 * 2).toISOString(),
  },
});

export const getInitialDemoTasks = (): Task[] => [
  {
    id: 'demo-task-1',
    duo_id: 'demo-duo-session',
    created_by: DEMO_PARTNER_A,
    title: 'Book weekend train tickets to coastal cottage',
    description: 'Looking for morning departures with quiet car seats.',
    status: 'TODO',
    order: 0,
    is_me: true,
    completed_at: null,
    created_at: new Date(Date.now() - 86400000).toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'demo-task-2',
    duo_id: 'demo-duo-session',
    created_by: DEMO_PARTNER_B,
    title: 'Pick up vintage film prints from local photo lab',
    description: 'Order #4892 from our anniversary walk.',
    status: 'TODO',
    order: 1,
    is_me: false,
    completed_at: null,
    created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'demo-task-3',
    duo_id: 'demo-duo-session',
    created_by: DEMO_PARTNER_A,
    title: 'Pack warm wool sweaters and rain jackets',
    description: 'Weather forecast shows coastal mist in the evenings.',
    status: 'IN_PROGRESS',
    order: 0,
    is_me: true,
    completed_at: null,
    created_at: new Date(Date.now() - 86400000 * 3).toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'demo-task-4',
    duo_id: 'demo-duo-session',
    created_by: DEMO_PARTNER_B,
    title: 'Reserve table at the old harbor bistro',
    description: 'Friday evening dinner at 7:30 PM.',
    status: 'COMPLETED',
    order: 0,
    is_me: false,
    completed_at: new Date(Date.now() - 86400000 * 4).toISOString(),
    created_at: new Date(Date.now() - 86400000 * 4).toISOString(),
    updated_at: new Date().toISOString(),
  },
];

export const getInitialDemoNotes = (): LittleNote[] => [
  {
    id: 'demo-note-1',
    duo_id: 'demo-duo-session',
    author: DEMO_PARTNER_B,
    note_type: 'TEXT',
    content: 'Take a deep breath and take your time today. Proud of everything you are building.',
    media_url: '',
    color: '#FB923C',
    is_pinned: true,
    is_me: false,
    created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'demo-note-2',
    duo_id: 'demo-duo-session',
    author: DEMO_PARTNER_A,
    note_type: 'TEXT',
    content: 'Left fresh pour-over coffee on the counter for you. Have a lovely morning.',
    media_url: '',
    color: '#125CB9',
    is_pinned: false,
    is_me: true,
    created_at: new Date(Date.now() - 86400000).toISOString(),
    updated_at: new Date().toISOString(),
  },
];

export const getInitialDemoNotifications = (): NotificationItem[] => [
  {
    id: 'demo-notif-1',
    recipient_id: 'demo-user-a',
    type: 'MESSAGE',
    title: 'New Message',
    body: 'Sam sent a message in Whisper Chat.',
    reference_id: 'demo-msg-5',
    is_read: false,
    created_at: new Date(Date.now() - 60000 * 15).toISOString(),
  },
  {
    id: 'demo-notif-2',
    recipient_id: 'demo-user-a',
    type: 'DAILY_RESPONSE',
    title: 'Prompt Answered',
    body: 'Sam submitted their daily reflection. Answer to reveal both.',
    reference_id: 'demo-q-1',
    is_read: false,
    created_at: new Date(Date.now() - 3600000 * 2).toISOString(),
  },
  {
    id: 'demo-notif-3',
    recipient_id: 'demo-user-a',
    type: 'NOTE',
    title: 'New Note',
    body: 'Sam left a sweet reminder note for you.',
    reference_id: 'demo-note-1',
    is_read: true,
    created_at: new Date(Date.now() - 86400000).toISOString(),
  },
];
