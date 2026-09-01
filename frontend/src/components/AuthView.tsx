'use client';

import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { KeyRound, PenTool, BookOpen, ArrowRight, ShieldCheck, Mail, User as UserIcon, Lock, Heart, Sparkles } from 'lucide-react';

export const AuthView: React.FC = () => {
  const { loginWithEmail, registerWithEmail, loginWithGoogle } = useAuth();
  const [isLogin, setIsLogin] = useState<boolean>(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccessRegistration, setIsSuccessRegistration] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setIsLoading(true);

    try {
      if (isLogin) {
        await loginWithEmail(email.trim(), password);
      } else {
        if (!name.trim()) {
          throw new Error('Please enter your name.');
        }
        await registerWithEmail(email.trim(), password, name.trim());
        setIsSuccessRegistration(true);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Authentication failed. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    setErrorMsg(null);
    try {
      await loginWithGoogle();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to initialize Google Login.');
    }
  };

  return (
    <div className="min-h-screen bg-theme-page text-theme-primary flex flex-col justify-between selection:bg-[#125CB9] selection:text-white transition-colors duration-200">
      {/* Top Bar */}
      <header className="border-b border-theme bg-theme-page/95 backdrop-blur-md sticky top-0 z-30">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6 sm:px-8">
          <div className="flex items-center space-x-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-[#125CB9] text-white shadow-xs">
              <Heart className="h-3.5 w-3.5 fill-current" />
            </span>
            <span className="font-serif text-xl font-bold tracking-tight text-theme-primary">Duo</span>
          </div>
          <a
            href="#auth-section"
            className="rounded-full bg-[#125CB9] px-4 py-1.5 text-xs font-semibold text-white hover:bg-[#0E4B99] transition-colors shadow-xs"
          >
            Sign in &rarr;
          </a>
        </div>
      </header>

      {/* Main Landing Page Content */}
      <main className="flex-1">
        {/* Hero Narrative Section */}
        <section className="mx-auto max-w-4xl px-6 sm:px-8 pt-12 pb-10 sm:pt-20 sm:pb-14 text-center sm:text-left">
          <div className="inline-flex items-center space-x-1.5 rounded-full px-3 py-1 text-xs font-mono font-medium text-[#125CB9] bg-[#125CB9]/10 border border-[#125CB9]/25 mb-4">
            <Heart className="h-3 w-3 fill-current" />
            <span>A shared space made for two</span>
          </div>

          <h1 className="font-serif text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-theme-primary leading-tight">
            A private, quiet space on the internet for <span className="text-[#125CB9]">you two</span>.
          </h1>

          <p className="mt-4 max-w-2xl text-sm sm:text-base text-theme-secondary leading-relaxed font-sans">
            No public feeds, no followers, no noise. Duo is your private sanctuary to share daily love prompts, playful drawings, and real-time thoughts.
          </p>
        </section>

        {/* 3 Pillars: How it works */}
        <section className="mx-auto max-w-4xl px-6 sm:px-8 py-6 sm:py-8">
          <div className="border-t border-theme pt-8">
            <h2 className="text-[10px] font-mono uppercase tracking-wider text-theme-muted mb-6 font-medium">
              How our space works
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Feature 1 */}
              <div className="rounded-2xl border border-theme bg-theme-card p-5 shadow-xs flex flex-col justify-between">
                <div>
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#125CB9]/10 text-[#125CB9] mb-4">
                    <KeyRound className="h-5 w-5" />
                  </div>
                  <span className="text-[11px] font-mono text-theme-muted">01 / Secret Key</span>
                  <h3 className="mt-1 text-sm font-serif font-bold text-theme-primary">Private Pairing</h3>
                  <p className="mt-1 text-xs text-theme-secondary leading-relaxed">
                    Generate your unique DUO secret code and share it with your partner. Once connected, your room is linked forever.
                  </p>
                </div>
              </div>

              {/* Feature 2 */}
              <div className="rounded-2xl border border-theme bg-theme-card p-5 shadow-xs flex flex-col justify-between">
                <div>
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#00D26A]/10 text-[#00D26A] mb-4">
                    <PenTool className="h-5 w-5" />
                  </div>
                  <span className="text-[11px] font-mono text-theme-muted">02 / Live Doodles</span>
                  <h3 className="mt-1 text-sm font-serif font-bold text-theme-primary">Notes & Drawing Studio</h3>
                  <p className="mt-1 text-xs text-theme-secondary leading-relaxed">
                    Instant messaging with real-time ink canvas to leave sweet sketches, doodle reactions, and heartfelt love letters.
                  </p>
                </div>
              </div>

              {/* Feature 3 */}
              <div className="rounded-2xl border border-theme bg-theme-card p-5 shadow-xs flex flex-col justify-between">
                <div>
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#FB923C]/10 text-[#FB923C] mb-4">
                    <BookOpen className="h-5 w-5" />
                  </div>
                  <span className="text-[11px] font-mono text-theme-muted">03 / Love Prompts</span>
                  <h3 className="mt-1 text-sm font-serif font-bold text-theme-primary">Daily Questions</h3>
                  <p className="mt-1 text-xs text-theme-secondary leading-relaxed">
                    Thoughtful prompts every day. Answers remain sealed in private drafts until both of you reveal, creating a shared archive.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Auth Entry Form Section */}
        <section id="auth-section" className="mx-auto max-w-md px-6 py-12 sm:py-16">
          <div className="rounded-2xl border border-theme bg-theme-card p-6 sm:p-8 shadow-xl">
            <div className="text-center mb-5">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#125CB9]/10 text-[#125CB9] mx-auto mb-2.5">
                <Heart className="h-5 w-5 fill-current" />
              </div>
              <h2 className="font-serif text-xl sm:text-2xl font-bold text-theme-primary">
                {isLogin ? 'Welcome back' : 'Start your shared room'}
              </h2>
              <p className="mt-1 text-xs text-theme-secondary">
                {isLogin ? 'Enter your private space' : 'Begin your shared memories together'}
              </p>
            </div>

            {/* Google OAuth Button */}
            <button
              onClick={handleGoogleAuth}
              type="button"
              className="flex w-full items-center justify-center space-x-2.5 rounded-full border border-theme bg-theme-input px-4 py-2.5 text-xs sm:text-sm font-medium text-theme-primary transition-colors hover:bg-theme-card hover:border-[#125CB9] shadow-xs"
            >
              <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
                />
                <path
                  fill="#34A853"
                  d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 10.03 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
                />
                <path
                  fill="#EA4335"
                  d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                />
              </svg>
              <span>Continue with Google</span>
            </button>

            <div className="relative my-4 flex items-center justify-center">
              <div className="w-full border-t border-theme" />
              <span className="absolute bg-theme-card px-2.5 text-[10px] font-mono uppercase tracking-wider text-theme-muted">
                or with email
              </span>
            </div>

            {/* Toggle Sign In / Create Account */}
            <div className="flex rounded-full border border-theme bg-theme-input p-1 mb-4">
              <button
                onClick={() => {
                  setIsLogin(true);
                  setErrorMsg(null);
                }}
                type="button"
                className={`w-1/2 rounded-full py-1.5 text-xs font-medium transition-all ${
                  isLogin
                    ? 'bg-theme-card text-theme-primary shadow-xs font-semibold'
                    : 'text-theme-secondary hover:text-theme-primary'
                }`}
              >
                Sign In
              </button>
              <button
                onClick={() => {
                  setIsLogin(false);
                  setErrorMsg(null);
                }}
                type="button"
                className={`w-1/2 rounded-full py-1.5 text-xs font-medium transition-all ${
                  !isLogin
                    ? 'bg-theme-card text-theme-primary shadow-xs font-semibold'
                    : 'text-theme-secondary hover:text-theme-primary'
                }`}
              >
                Create Room
              </button>
            </div>

            {errorMsg && (
              <div className="mb-3 rounded-xl border border-[#F43F5E]/30 bg-[#F43F5E]/10 p-2.5 text-xs text-[#F43F5E]">
                {errorMsg}
              </div>
            )}

            {isSuccessRegistration && (
              <div className="mb-3 rounded-xl border border-[#00D26A]/30 bg-[#00D26A]/10 p-2.5 text-xs text-[#00D26A]">
                Account created! If email confirmation is enabled on your Supabase project, check your inbox.
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-3">
              {!isLogin && (
                <div>
                  <label className="block text-xs font-medium text-theme-secondary mb-1">Your Name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Alex"
                    className="w-full rounded-xl border border-theme bg-theme-input px-3.5 py-2 text-xs sm:text-sm text-theme-primary placeholder-theme-muted focus:border-[#125CB9] focus:bg-theme-card focus:outline-none"
                    required
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-theme-secondary mb-1">Email Address</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@domain.com"
                  className="w-full rounded-xl border border-theme bg-theme-input px-3.5 py-2 text-xs sm:text-sm text-theme-primary placeholder-theme-muted focus:border-[#125CB9] focus:bg-theme-card focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-theme-secondary mb-1">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  minLength={6}
                  className="w-full rounded-xl border border-theme bg-theme-input px-3.5 py-2 text-xs sm:text-sm text-theme-primary placeholder-theme-muted focus:border-[#125CB9] focus:bg-theme-card focus:outline-none"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="mt-1 flex w-full items-center justify-center space-x-1.5 rounded-full bg-[#125CB9] py-2.5 text-xs sm:text-sm font-medium text-white transition-colors hover:bg-[#0E4B99] disabled:opacity-40 shadow-xs"
              >
                <span>{isLoading ? 'Opening space...' : isLogin ? 'Enter Room' : 'Create Room'}</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </form>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-theme py-6 text-center text-xs font-mono text-theme-muted">
        DUO &mdash; crafted for quiet intimacy
      </footer>
    </div>
  );
};
