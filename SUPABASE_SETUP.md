# Supabase Configuration & Setup Guide for DUO

This guide details how to set up your Supabase project for DUO, including PostgreSQL schema execution, Row Level Security (RLS) policies, Realtime publications, and the private Storage bucket for drawings.

---

### Step 1: Create a New Supabase Project
1. Go to [Supabase Dashboard](https://supabase.com/dashboard) and log in.
2. Click **New Project**.
3. Set:
   - **Name**: `DUO`
   - **Database Password**: Enter a strong password and save it securely.
   - **Region**: Choose the region closest to your users.
4. Click **Create new project** and wait ~1-2 minutes for provisioning.

---

### Step 2: Execute the Database Schema & RLS Policies
1. In the Supabase left sidebar, click the **SQL Editor** tab.
2. Click **+ New query**.
3. Open the [supabase_schema.sql](file:///c:/Users/Himabala/Desktop/duo/supabase_schema.sql) file located in the root of the DUO project repository.
4. Copy its complete contents and paste into the Supabase SQL editor.
5. Click **Run** (or `Ctrl + Enter`).
6. Verify output confirms all tables, constraints, RLS policies, triggers, and Realtime publications were created successfully.

---

### Step 3: Verify the Private Storage Bucket
The SQL script creates the bucket automatically, but you can verify it:
1. In the Supabase left sidebar, click **Storage**.
2. Confirm the bucket named **`drawings`** is listed.
3. Ensure its **Public** toggle is **OFF (Private)**.
4. Under **Configuration > Policies**, confirm that the authenticated RLS policies exist for uploading and viewing drawings.

---

### Step 4: Verify Realtime Replication Publications
1. In the Supabase left sidebar, click **Database > Publications**.
2. Click `supabase_realtime`.
3. Verify that the following tables are enabled for Realtime replication:
   - `public.messages`
   - `public.notifications`
   - `public.drawings`
   - `public.daily_responses`
   - `public.connection_requests`
   - `public.duo_members`

---

### Step 5: Obtain API Keys & Database URL
1. Go to **Project Settings > API**:
   - **Project URL**: Copy into `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_URL`.
   - **anon public key**: Copy into `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
   - **service_role key**: Copy into `SUPABASE_SERVICE_ROLE_KEY` in `backend/.env`. *(Never expose this key to frontend clients)*.
   - **JWT Secret**: Copy into `SUPABASE_JWT_SECRET` in `backend/.env`.
2. Go to **Project Settings > Database**:
   - Scroll to **Connection string > URI (Session Mode or Transaction Mode)**.
   - Copy the connection string (with your password) into `DATABASE_URL` in `backend/.env`.
