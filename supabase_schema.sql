-- ==============================================================================
-- DUO - Supabase PostgreSQL Schema, Security Policies (RLS), and Realtime Setup
-- ==============================================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. PROFILES TABLE
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    auth_user_id UUID UNIQUE NOT NULL,
    name VARCHAR(150) NOT NULL DEFAULT 'DUO Member',
    email VARCHAR(255) UNIQUE NOT NULL,
    avatar_url TEXT DEFAULT '',
    duo_code VARCHAR(20) UNIQUE NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_profiles_auth_user_id ON public.profiles(auth_user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_duo_code ON public.profiles(duo_code);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);

-- 2. DUOS TABLE
CREATE TABLE IF NOT EXISTS public.duos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_duos_status ON public.duos(status);

-- 3. DUO MEMBERS TABLE
CREATE TABLE IF NOT EXISTS public.duo_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    duo_id UUID NOT NULL REFERENCES public.duos(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    role VARCHAR(50) NOT NULL DEFAULT 'MEMBER',
    joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_duo_member UNIQUE (duo_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_duo_members_user ON public.duo_members(user_id);
CREATE INDEX IF NOT EXISTS idx_duo_members_duo ON public.duo_members(duo_id);

-- 4. CONNECTION REQUESTS TABLE
CREATE TABLE IF NOT EXISTS public.connection_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    receiver_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_diff_users CHECK (sender_id <> receiver_id)
);

CREATE INDEX IF NOT EXISTS idx_conn_req_sender ON public.connection_requests(sender_id, status);
CREATE INDEX IF NOT EXISTS idx_conn_req_receiver ON public.connection_requests(receiver_id, status);

-- 5. MESSAGES TABLE
CREATE TABLE IF NOT EXISTS public.messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    duo_id UUID NOT NULL REFERENCES public.duos(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    receiver_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    read_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_messages_duo_created ON public.messages(duo_id, created_at);
CREATE INDEX IF NOT EXISTS idx_messages_receiver_read ON public.messages(receiver_id, read_at);

-- 6. DRAWINGS TABLE
CREATE TABLE IF NOT EXISTS public.drawings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    duo_id UUID NOT NULL REFERENCES public.duos(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    receiver_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    storage_path VARCHAR(500) NOT NULL,
    caption VARCHAR(255) DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_drawings_duo_created ON public.drawings(duo_id, created_at DESC);

-- 7. DAILY QUESTIONS TABLE
CREATE TABLE IF NOT EXISTS public.daily_questions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    question TEXT NOT NULL,
    category VARCHAR(50) DEFAULT 'DAILY',
    active BOOLEAN NOT NULL DEFAULT TRUE,
    "order" INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_daily_questions_active ON public.daily_questions(active, "order");

-- 8. DAILY RESPONSES TABLE
CREATE TABLE IF NOT EXISTS public.daily_responses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    question_id UUID NOT NULL REFERENCES public.daily_questions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    duo_id UUID NOT NULL REFERENCES public.duos(id) ON DELETE CASCADE,
    answer TEXT DEFAULT '',
    response_date DATE NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'DRAFT',
    submitted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_daily_response UNIQUE (question_id, user_id, duo_id, response_date)
);

CREATE INDEX IF NOT EXISTS idx_daily_responses_duo_date ON public.daily_responses(duo_id, response_date, status);
CREATE INDEX IF NOT EXISTS idx_daily_responses_user_date ON public.daily_responses(user_id, response_date, status);

-- 9. NOTIFICATIONS TABLE
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    recipient_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    body TEXT NOT NULL,
    reference_id VARCHAR(255),
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_recipient ON public.notifications(recipient_id, is_read, created_at DESC);

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.duos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.duo_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.connection_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drawings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Helper function to get current user's profile ID
CREATE OR REPLACE FUNCTION public.get_current_profile_id()
RETURNS UUID AS $$
    SELECT id FROM public.profiles WHERE auth_user_id = auth.uid() LIMIT 1;
$$ LANGUAGE SQL SECURITY DEFINER;

-- Profiles: Users can view all profiles (needed for search by DUO code) and update their own
CREATE POLICY "Users can view profiles" ON public.profiles
    FOR SELECT USING (true);

CREATE POLICY "Users can update own profile" ON public.profiles
    FOR UPDATE USING (auth_user_id = auth.uid());

-- Duos & DuoMembers: Only DUO members can read DUO info
CREATE POLICY "Members can view their DUO" ON public.duos
    FOR SELECT USING (
        id IN (SELECT duo_id FROM public.duo_members WHERE user_id = public.get_current_profile_id())
    );

CREATE POLICY "Members can view duo members" ON public.duo_members
    FOR SELECT USING (
        duo_id IN (SELECT duo_id FROM public.duo_members WHERE user_id = public.get_current_profile_id())
    );

-- Connection requests: Senders and receivers only
CREATE POLICY "View connection requests" ON public.connection_requests
    FOR SELECT USING (
        sender_id = public.get_current_profile_id() OR receiver_id = public.get_current_profile_id()
    );

-- Messages: DUO members only
CREATE POLICY "View messages within DUO" ON public.messages
    FOR SELECT USING (
        duo_id IN (SELECT duo_id FROM public.duo_members WHERE user_id = public.get_current_profile_id())
    );

-- Drawings: DUO members only
CREATE POLICY "View drawings within DUO" ON public.drawings
    FOR SELECT USING (
        duo_id IN (SELECT duo_id FROM public.duo_members WHERE user_id = public.get_current_profile_id())
    );

-- Daily Questions: Publicly readable by all authenticated users
CREATE POLICY "View active daily questions" ON public.daily_questions
    FOR SELECT USING (active = true);

-- Daily Responses: OWN responses (Draft & Submitted) + PARTNER SUBMITTED responses only
CREATE POLICY "View own responses and partner submitted responses" ON public.daily_responses
    FOR SELECT USING (
        user_id = public.get_current_profile_id()
        OR (
            duo_id IN (SELECT duo_id FROM public.duo_members WHERE user_id = public.get_current_profile_id())
            AND status = 'SUBMITTED'
        )
    );

-- Notifications: Recipient only
CREATE POLICY "View own notifications" ON public.notifications
    FOR SELECT USING (
        recipient_id = public.get_current_profile_id()
    );

-- ==============================================================================
-- SUPABASE STORAGE BUCKET & POLICIES
-- ==============================================================================

-- Create private bucket 'drawings' if not exists
INSERT INTO storage.buckets (id, name, public)
VALUES ('drawings', 'drawings', false)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS: DUO members can upload and read their drawings
CREATE POLICY "Authenticated users can upload drawings"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'drawings');

CREATE POLICY "Authenticated users can view drawings"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'drawings');

-- ==============================================================================
-- SUPABASE REALTIME REPLICATION SETUP
-- ==============================================================================

-- Enable Realtime publication for DUO tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE public.drawings;
ALTER PUBLICATION supabase_realtime ADD TABLE public.daily_responses;
ALTER PUBLICATION supabase_realtime ADD TABLE public.connection_requests;
ALTER PUBLICATION supabase_realtime ADD TABLE public.duo_members;
