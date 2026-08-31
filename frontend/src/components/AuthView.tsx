'use client';

import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { KeyRound, PenTool, BookOpen, ArrowRight, ShieldCheck, Mail, User as UserIcon, Lock, Sparkles, Feather } from 'lucide-react';

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
    <div className="min-h-screen bg-[#FBFAF7] text-[#292522] flex flex-col justify-between selection:bg-[#F3D7D3] selection:text-[#C96A4A]">
      {/* Editorial Top Bar */}
      <header className="border-b border-[#EBE5DA] bg-[#FBFAF7]/95 backdrop-blur-md sticky top-0 z-30">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6 sm:px-8 lg:px-10">
          <div className="flex items-baseline space-x-2.5">
            <span className="font-serif text-2xl sm:text-3xl font-normal tracking-tight text-[#292522]">Duo</span>
            <span className="text-[10px] font-mono uppercase tracking-widest text-[#A89F91]">/ private room for two</span>
          </div>
          <a
            href="#auth-section"
            className="text-xs sm:text-sm font-medium text-[#696156] hover:text-[#C96A4A] transition-colors"
          >
            Sign in &rarr;
          </a>
        </div>
      </header>

      {/* Main Landing Page Content */}
      <main className="flex-1">
        {/* Hero Narrative Section */}
        <section className="mx-auto max-w-5xl px-6 sm:px-8 lg:px-10 pt-16 pb-12 sm:pt-24 sm:pb-16 text-center sm:text-left">
          <div className="inline-flex items-center space-x-2 rounded-full border border-[#F0DDD4] bg-[#FAF2EF] px-4 py-1.5 text-xs font-medium text-[#C96A4A] mb-6">
            <Feather className="h-3.5 w-3.5" />
            <span>Private two-person digital space</span>
          </div>

          <h1 className="font-serif text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-normal tracking-tight text-[#292522] leading-[1.12]">
            A quiet space on the internet made for <span className="italic font-serif text-[#C96A4A]">only two</span>.
          </h1>

          <p className="mt-6 max-w-3xl text-base sm:text-lg md:text-xl text-[#696156] leading-relaxed font-sans font-light">
            No public feeds, no follower counts, no outside noise. Duo is a warm, tactile digital journal where two people share real-time notes, sketches, and sealed daily reflections.
          </p>
        </section>

        {/* 3 Pillars: How it works */}
        <section className="mx-auto max-w-5xl px-6 sm:px-8 lg:px-10 py-8 sm:py-12">
          <div className="border-t border-[#EBE5DA] pt-12">
            <h2 className="text-[10px] font-mono uppercase tracking-widest text-[#A89F91] mb-8">
              The DUO Experience
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
              {/* Feature 1: Blush Card */}
              <div className="rounded-3xl border border-[#F0DDD4] bg-[#FAF3F0] p-6 sm:p-7 shadow-2xs flex flex-col justify-between">
                <div>
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#FFFFFF] text-[#C96A4A] border border-[#F0DDD4] mb-5 shadow-2xs">
                    <KeyRound className="h-5 w-5" />
                  </div>
                  <span className="text-[10px] font-mono uppercase tracking-wider text-[#C96A4A] font-semibold">01 / Connection Key</span>
                  <h3 className="mt-2 text-lg font-serif font-medium text-[#292522]">Private Pairing</h3>
                  <p className="mt-2 text-xs sm:text-sm text-[#696156] leading-relaxed">
                    Generate your unique 6-character key and share it with your partner. Once connected, your room is completely private.
                  </p>
                </div>
              </div>

              {/* Feature 2: Sage Card */}
              <div className="rounded-3xl border border-[#DFE5DA] bg-[#F4F6F2] p-6 sm:p-7 shadow-2xs flex flex-col justify-between">
                <div>
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#FFFFFF] text-[#5E8056] border border-[#DFE5DA] mb-5 shadow-2xs">
                    <PenTool className="h-5 w-5" />
                  </div>
                  <span className="text-[10px] font-mono uppercase tracking-wider text-[#5E8056] font-semibold">02 / Studio Canvas</span>
                  <h3 className="mt-2 text-lg font-serif font-medium text-[#292522]">Notes & Sketchbook</h3>
                  <p className="mt-2 text-xs sm:text-sm text-[#696156] leading-relaxed">
                    Instant conversation stream and a freehand sketchbook with warm ink palettes to leave doodles, letters, and keepsakes.
                  </p>
                </div>
              </div>

              {/* Feature 3: Butter Card */}
              <div className="rounded-3xl border border-[#ECE4CA] bg-[#FAF8EE] p-6 sm:p-7 shadow-2xs flex flex-col justify-between">
                <div>
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#FFFFFF] text-[#8F6B23] border border-[#ECE4CA] mb-5 shadow-2xs">
                    <BookOpen className="h-5 w-5" />
                  </div>
                  <span className="text-[10px] font-mono uppercase tracking-wider text-[#8F6B23] font-semibold">03 / Intimacy Journal</span>
                  <h3 className="mt-2 text-lg font-serif font-medium text-[#292522]">Daily Sealed Questions</h3>
                  <p className="mt-2 text-xs sm:text-sm text-[#696156] leading-relaxed">
                    Thoughtful prompts every day. Answers remain sealed in private drafts until both of you choose to share, building your archive.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Auth Entry Form Section */}
        <section id="auth-section" className="mx-auto max-w-md px-6 py-16 sm:py-24">
          <div className="rounded-3xl border border-[#EBE5DA] bg-[#FFFFFF] p-8 sm:p-10 shadow-[0_8px_32px_rgba(41,37,34,0.06)]">
            <div className="text-center mb-6">
              <h2 className="font-serif text-2xl sm:text-3xl font-normal text-[#292522]">
                {isLogin ? 'Enter your room' : 'Create your account'}
              </h2>
              <p className="mt-1.5 text-xs sm:text-sm text-[#7A7267]">
                {isLogin ? 'Welcome back to your private space' : 'Begin your shared space with your partner'}
              </p>
            </div>

            {/* Google OAuth Button */}
            <button
              onClick={handleGoogleAuth}
              type="button"
              className="flex w-full items-center justify-center space-x-3 rounded-2xl border border-[#E8DFD3] bg-[#FAF8F5] px-4 py-3 text-xs sm:text-sm font-medium text-[#292522] transition-all hover:bg-[#FAF2EF] hover:border-[#F0DDD4] shadow-2xs"
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

            <div className="relative my-6 flex items-center justify-center">
              <div className="w-full border-t border-[#EBE5DA]" />
              <span className="absolute bg-[#FFFFFF] px-3 text-[10px] font-mono uppercase tracking-wider text-[#A89F91]">
                or with email
              </span>
            </div>

            {/* Toggle Sign In / Create Account */}
            <div className="flex rounded-2xl border border-[#E8DFD3] bg-[#FAF5EE] p-1 mb-5">
              <button
                onClick={() => {
                  setIsLogin(true);
                  setErrorMsg(null);
                }}
                type="button"
                className={`w-1/2 rounded-xl py-2 text-xs sm:text-sm font-medium transition-all ${
                  isLogin
                    ? 'bg-[#FFFFFF] text-[#C96A4A] shadow-xs font-semibold'
                    : 'text-[#7A7267] hover:text-[#292522]'
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
                className={`w-1/2 rounded-xl py-2 text-xs sm:text-sm font-medium transition-all ${
                  !isLogin
                    ? 'bg-[#FFFFFF] text-[#C96A4A] shadow-xs font-semibold'
                    : 'text-[#7A7267] hover:text-[#292522]'
                }`}
              >
                Create Account
              </button>
            </div>

            {errorMsg && (
              <div className="mb-4 rounded-2xl border border-[#F4DCD9] bg-[#FAF2F0] p-3.5 text-xs text-[#C96A4A]">
                {errorMsg}
              </div>
            )}

            {isSuccessRegistration && (
              <div className="mb-4 rounded-2xl border border-[#D5E2D1] bg-[#F2F6F0] p-3.5 text-xs text-[#4D6A46]">
                Account created! Logging in...
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {!isLogin && (
                <div>
                  <label className="block text-[11px] font-medium text-[#696156] mb-1.5">
                    Your Name
                  </label>
                  <div className="relative">
                    <UserIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#A89F91]" />
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Alex"
                      className="w-full rounded-2xl border border-[#E8DFD3] bg-[#FAF8F5] pl-10 pr-4 py-3 text-xs sm:text-sm text-[#292522] placeholder-[#A89F91] focus:border-[#C96A4A] focus:bg-[#FFFFFF] focus:outline-none focus:ring-1 focus:ring-[#C96A4A]"
                      required
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-[11px] font-medium text-[#696156] mb-1.5">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#A89F91]" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full rounded-2xl border border-[#E8DFD3] bg-[#FAF8F5] pl-10 pr-4 py-3 text-xs sm:text-sm text-[#292522] placeholder-[#A89F91] focus:border-[#C96A4A] focus:bg-[#FFFFFF] focus:outline-none focus:ring-1 focus:ring-[#C96A4A]"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-[#696156] mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#A89F91]" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    minLength={6}
                    className="w-full rounded-2xl border border-[#E8DFD3] bg-[#FAF8F5] pl-10 pr-4 py-3 text-xs sm:text-sm text-[#292522] placeholder-[#A89F91] focus:border-[#C96A4A] focus:bg-[#FFFFFF] focus:outline-none focus:ring-1 focus:ring-[#C96A4A]"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex items-center justify-center space-x-2 rounded-2xl bg-[#C96A4A] py-3.5 text-xs sm:text-sm font-medium text-white hover:bg-[#B75C3E] transition-all disabled:opacity-50 shadow-[0_2px_8px_rgba(201,106,74,0.18)] min-h-[46px]"
              >
                <span>{isLoading ? 'Connecting...' : isLogin ? 'Sign In to Room' : 'Create Account'}</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </form>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-[#EBE5DA] py-8 text-center text-xs font-mono text-[#A89F91]">
        <p>DUO &mdash; An understated private space for two.</p>
      </footer>
    </div>
  );
};
