# Google OAuth Setup Guide for DUO

This guide explains step-by-step how to configure real Google OAuth login with Supabase Auth for DUO.

---

### Step 1: Create a Google Cloud Project
1. Navigate to the [Google Cloud Console](https://console.cloud.google.com/).
2. Click the project dropdown in the top bar and select **New Project**.
3. Name your project **DUO App** and click **Create**.

---

### Step 2: Configure the OAuth Consent Screen
1. Go to **APIs & Services > OAuth consent screen**.
2. Select User Type: **External** and click **Create**.
3. Fill in the required application details:
   - **App name**: `DUO`
   - **User support email**: Select your email.
   - **Developer contact information**: Enter your email address.
4. Click **Save and Continue**.
5. Under **Scopes**, click **Add or Remove Scopes**, select:
   - `.../auth/userinfo.email`
   - `.../auth/userinfo.profile`
   - `openid`
6. Click **Update**, then **Save and Continue**.
7. If your app is in "Testing" status, add your test email under **Test Users** so you can log in immediately.

---

### Step 3: Create OAuth 2.0 Client Credentials
1. Go to **APIs & Services > Credentials**.
2. Click **+ CREATE CREDENTIALS** at the top and choose **OAuth client ID**.
3. Select Application type: **Web application**.
4. Set Name: `DUO Web Client`.

---

### Step 4: Configure Authorized Redirect URIs in Google Cloud Console
In the OAuth Client form in Google Cloud Console:
1. Under **Authorized JavaScript origins**, add:
   - `http://localhost:3000` (for local development)
   - `https://ogvioddvnypfuhlykhpd.supabase.co`
2. Under **Authorized redirect URIs**, add your Supabase Auth callback URL (**DO NOT put localhost here**):
   - `https://ogvioddvnypfuhlykhpd.supabase.co/auth/v1/callback`
   *(This is the exact URL Google redirects to after authentication; Supabase will then forward the user to your app).*
3. Click **Save** / **Create**.
4. Copy your **Client ID** and **Client Secret**.

---

### Step 5: Configure Google Provider inside Supabase
1. Open your [Supabase Dashboard](https://supabase.com/dashboard).
2. Select your DUO project.
3. In the left navigation, click **Authentication > Providers**.
4. Scroll down to **Google** and toggle it **Enabled**.
5. Paste your **Google Client ID** and **Google Client Secret** obtained in Step 4.
6. Click **Save**.

---

### Step 6: Configure Site URL & Redirect URLs in Supabase
1. In Supabase Dashboard, go to **Authentication > URL Configuration**.
2. Set **Site URL**:
   - For local development: `http://localhost:3000`
   - For production: `https://your-production-app.vercel.app`
3. Under **Redirect URLs**, add:
   - `http://localhost:3000/**`
   - `http://localhost:3000/auth/callback`
   - `https://your-production-app.vercel.app/**`
   - `https://your-production-app.vercel.app/auth/callback`
4. Click **Save**.

---

### Step 7: Configure Vercel & Frontend Environment Variables
Add the following environment variables to your `.env.local` or Vercel Project Settings:
```env
NEXT_PUBLIC_SUPABASE_URL=https://<YOUR_SUPABASE_PROJECT_REF>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<YOUR_SUPABASE_ANON_KEY>
NEXT_PUBLIC_API_URL=https://<YOUR_DJANGO_BACKEND_URL>
```
