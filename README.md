# DUO — Private Two-Person Connection Platform

**DUO** is a private, real-time two-person connection web application built with **Next.js**, **Django REST Framework**, and **Supabase** (PostgreSQL, Storage, Realtime, and Auth).

Two people create accounts, connect securely using a unique DUO code (e.g. `DUO-7K4P2M`), and unlock an exclusive shared private space to exchange messages, live drawings, daily questions, and memories.

---

## 🌟 Core Features

1. **Authentication & Identity**:
   - Email/Password Signup & Login
   - Real Google OAuth integration via Supabase Auth
   - Cryptographic JWT verification on the Django backend (deriving authenticated users securely from tokens)
   - Profile management with unique DUO code generation.

2. **DUO Connection System**:
   - Unique, unguessable DUO codes (`DUO-XXXXXX`)
   - Connection request flow: Request -> Notification -> Accept / Decline
   - Strict 2-member limit per DUO with prevention of duplicate requests or third-party connections.

3. **1-to-1 Real-time Messaging**:
   - Private 1-to-1 chat between partners
   - Live message delivery via Supabase Realtime
   - Optimistic message sending and double-check read receipts (`Sent` / `Read`)
   - Auto-scroll and instant partner notifications.

4. **Interactive Drawing Canvas & Gallery**:
   - Full HTML5 Canvas studio with smooth brush stroke rendering, multi-color palette, brush sizes, eraser, and undo/redo history
   - Automatic PNG export and upload to private Supabase Storage bucket `drawings`
   - Signed download/view URLs ensuring only DUO members can access drawings
   - Lightbox preview and date-preserved PNG downloads.

5. **Daily Questions & Private Drafts**:
   - Pool of intimacy and relationship questions stored in PostgreSQL
   - **Strict Privacy Enforcement**: Answers remain confidential drafts until the user presses **Submit**
   - Side-by-side answer reveal comparison when both partners submit
   - Live partner response status indicators.

6. **Memory Archive (History)**:
   - Timeline archive of past submitted daily responses and drawings.

7. **Instant Notifications & Live Presence**:
   - Real-time notification badge and floating toast banners
   - Live presence indicator showing when partner is active in DUO.

---

## 🛠️ Tech Stack

- **Frontend**: Next.js 16 (App Router), TypeScript, React, Tailwind CSS, Lucide Icons, Canvas Confetti.
- **Backend API**: Python 3.12, Django 5.1, Django REST Framework, PyJWT, Cryptography, dj-database-url.
- **Database & Cloud**: Supabase PostgreSQL, Supabase Auth (Google OAuth), Supabase Storage (drawings bucket), Supabase Realtime.

---

## 🚀 Quick Start (Local Development)

### 1. Backend Setup
```bash
cd backend
python -m pip install -r requirements.txt # or install django djangorestframework django-cors-headers dj-database-url psycopg2-binary pyjwt cryptography requests python-dotenv supabase
python manage.py migrate
python manage.py seed_questions
python manage.py runserver 8000
```

### 2. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

The frontend will be available at `http://localhost:3000` and the Django API at `http://127.0.0.1:8000`.

---

## 🔒 Security & Architecture Rules

- **Django is the primary authority**: All relationship validations, message creation, response submissions, and notifications go through Django REST Framework.
- **No client ID trust**: Django never trusts sender/receiver/duo IDs provided in the request body. IDs are strictly derived from the authenticated token and active DUO membership.
- **Private Supabase Storage**: Drawing PNGs are never stored in PostgreSQL binary columns; only secure paths are saved in DB, and access is controlled via authenticated signed URLs.

---

## 📚 Documentation Links

- [Google OAuth Setup Guide](GOOGLE_OAUTH_SETUP.md)
- [Supabase Schema & Setup Guide](SUPABASE_SETUP.md)
- [Production Deployment Guide](DEPLOYMENT_GUIDE.md)
- [Supabase SQL Schema](supabase_schema.sql)
