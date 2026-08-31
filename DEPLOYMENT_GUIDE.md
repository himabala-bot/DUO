# Production Deployment Guide for DUO

This guide outlines the deployment process for the DUO full-stack application.

---

## 1. Architecture Overview

- **Frontend**: Next.js App Router (Deployed to **Vercel**).
- **Backend API**: Django REST Framework (Deployed to **Fly.io**, **Railway**, **DigitalOcean App Platform**, or any container/Python platform).
- **Database & Services**: **Supabase** (PostgreSQL, Supabase Auth, Storage, and Realtime).

---

## 2. Frontend Deployment (Vercel)

1. Push your code to your GitHub / GitLab repository.
2. Log into [Vercel](https://vercel.com/) and click **Add New > Project**.
3. Import your repository and set the **Root Directory** to `frontend`.
4. In **Environment Variables**, add:
   - `NEXT_PUBLIC_SUPABASE_URL`: Your Supabase Project URL (`https://xxxx.supabase.co`).
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Your Supabase Anon Key.
   - `NEXT_PUBLIC_API_URL`: Your deployed Django API domain (e.g. `https://api.yourdomain.com`).
5. Click **Deploy**.

---

## 3. Backend Deployment (Django REST Framework)

### Requirements:
Ensure the following environment variables are set in your production hosting dashboard:
```env
DJANGO_SECRET_KEY=<strong-random-50-char-secret>
DJANGO_DEBUG=False
ALLOWED_HOSTS=api.yourdomain.com,your-app.fly.dev
CORS_ALLOWED_ORIGINS=https://your-frontend.vercel.app
CSRF_TRUSTED_ORIGINS=https://your-frontend.vercel.app

DATABASE_URL=postgresql://postgres.xxxx:your-db-password@aws-0-us-east-1.pooler.supabase.com:6543/postgres?sslmode=require
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
SUPABASE_JWT_SECRET=your-supabase-jwt-secret
```

### Deploying via Docker / Gunicorn:
Use `gunicorn` to run the Django WSGI application:
```bash
python -m pip install gunicorn
python manage.py collectstatic --noinput
python manage.py migrate
python manage.py seed_questions
gunicorn duo_backend.wsgi:application --bind 0.0.0.0:8000 --workers 4
```

### Production Checklist:
1. `DJANGO_DEBUG=False`
2. Database is connected via `DATABASE_URL` to Supabase PostgreSQL with connection pooling.
3. `CORS_ALLOWED_ORIGINS` explicitly lists your deployed Vercel domain.
4. `SUPABASE_SERVICE_ROLE_KEY` and `DJANGO_SECRET_KEY` are kept strictly private on the backend.
