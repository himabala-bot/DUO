'use client';

import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { KeyRound, PenTool, BookOpen, ArrowRight, ShieldCheck, Mail, User as UserIcon, Lock, Sparkles, Heart } from 'lucide-react';

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
    <div className="min-h-screen bg-[#FFFDF9] text-[#2D2522] flex flex-col justify-between selection:bg-[#FED7E2] selection:text-[#E11D48]">
      {/* Top Bar */}
      <header className="border-b border-[#F4EBE6] bg-[#FFFDFC]/95 backdrop-blur-md sticky top-0 z-30">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6 sm:px-8 lg:px-10">
          <div className="flex items-center space-x-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-2xl bg-gradient-to-tr from-[#FF758C] to-[#FF7EB3] text-white shadow-xs">
              <Heart className="h-4.5 w-4.5 fill-white" />
            </div>
            <span className="font-serif text-2xl font-bold tracking-tight text-[#2D2522]">Duo</span>
            <span className="text-[10px] font-mono uppercase tracking-widest text-[#B2A49B]">/ our little world 💕</span>
          </div>
          <a
            href="#auth-section"
            className="text-xs sm:text-sm font-bold text-[#E11D48] hover:underline transition-colors"
          >
            Enter Room &rarr;
          </a>
        </div>
      </header>

      {/* Main Landing Page Content */}
      <main className="flex-1">
        {/* Hero Section */}
        <section className="mx-auto max-w-5xl px-6 sm:px-8 lg:px-10 pt-16 pb-12 sm:pt-24 sm:pb-16 text-center sm:text-left">
          <div className="inline-flex items-center space-x-2 rounded-full border border-[#FCE1E8] bg-[#FFF0F3] px-4 py-1.5 text-xs font-bold text-[#E11D48] mb-6 shadow-2xs">
            <Heart className="h-3.5 w-3.5 fill-[#E11D48] animate-heart-pulse" />
            <span>A cozy private digital world for only two 💕</span>
          </div>

          <h1 className="font-serif text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight text-[#2D2522] leading-[1.12]">
            A private, cute space made for <span className="italic font-serif text-[#E11D48]">just the two of you</span>.
          </h1>

          <p className="mt-6 max-w-3xl text-base sm:text-lg md:text-xl text-[#6D5E56] leading-relaxed font-sans font-light">
            No public feeds, no followers, no outside noise. Duo is a charming, tactile space to whisper real-time notes, share cute doodles, and reveal sealed daily reflections together.
          </p>
        </section>

        {/* 3 Pillars */}
        <section className="mx-auto max-w-5xl px-6 sm:px-8 lg:px-10 py-8 sm:py-12">
          <div className="border-t border-[#F4EBE6] pt-12">
            <h2 className="text-[10px] font-mono uppercase tracking-widest text-[#B2A49B] font-bold mb-8">
              Why Couples Love Duo 💕
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
              {/* Feature 1: Pink */}
              <div className="rounded-3xl border-2 border-[#FCE1E8] bg-gradient-to-b from-[#FFF5F7] to-[#FFFFFF] p-6 sm:p-7 shadow-xs flex flex-col justify-between">
                <div>
                  <span className="text-3xl block mb-3">🗝️</span>
                  <span className="text-[10px] font-mono uppercase tracking-wider text-[#E11D48] font-bold">01 / Connection Key</span>
                  <h3 className="mt-2 text-lg font-serif font-bold text-[#2D2522]">Private Room Key</h3>
                  <p className="mt-2 text-xs sm:text-sm text-[#6D5E56] leading-relaxed">
                    Generate your unique 6-character room key and share it with your partner. Once connected, your little world is sealed forever.
                  </p>
                </div>
              </div>

              {/* Feature 2: Mint */}
              <div className="rounded-3xl border-2 border-[#BBF7D0] bg-gradient-to-b from-[#F0FDF4] to-[#FFFFFF] p-6 sm:p-7 shadow-xs flex flex-col justify-between">
                <div>
                  <span className="text-3xl block mb-3">🎨</span>
                  <span className="text-[10px] font-mono uppercase tracking-wider text-[#15803D] font-bold">02 / Doodle Studio</span>
                  <h3 className="mt-2 text-lg font-serif font-bold text-[#2D2522]">Notes & Doodle Studio</h3>
                  <p className="mt-2 text-xs sm:text-sm text-[#6D5E56] leading-relaxed">
                    Instant whisper chat stream and a cute candy-color doodle pad to draw little sketches, heart doodles, and letters.
                  </p>
                </div>
              </div>

              {/* Feature 3: Honey */}
              <div className="rounded-3xl border-2 border-[#FEF08A] bg-gradient-to-b from-[#FEFCE8] to-[#FFFFFF] p-6 sm:p-7 shadow-xs flex flex-col justify-between">
                <div>
                  <span className="text-3xl block mb-3">🌸</span>
                  <span className="text-[10px] font-mono uppercase tracking-wider text-[#A16207] font-bold">03 / Daily Love Notes</span>
                  <h3 className="mt-2 text-lg font-serif font-bold text-[#2D2522]">Sealed Questions</h3>
                  <p className="mt-2 text-xs sm:text-sm text-[#6D5E56] leading-relaxed">
                    Sweet daily prompts to reflect and smile. Answers remain sealed in private drafts until both of you choose to share!
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Auth Section */}
        <section id="auth-section" className="mx-auto max-w-md px-6 py-16 sm:py-24">
          <div className="rounded-3xl border-2 border-[#FCE1E8] bg-[#FFFFFF] p-8 sm:p-10 shadow-[0_16px_48px_rgba(244,114,182,0.12)]">
            <div className="text-center mb-6">
              <span className="text-3xl block mb-1">💖</span>
              <h2 className="font-serif text-2xl sm:text-3xl font-bold text-[#2D2522]">
                {isLogin ? 'Welcome Back 💕' : 'Create Your Space 💌'}
              </h2>
              <p className="mt-1.5 text-xs sm:text-sm text-[#7A6D65]">
                {isLogin ? 'Enter your shared world with your favorite person' : 'Begin your private space together'}
              </p>
            </div>

            {/* Google OAuth Button */}
            <button
              onClick={handleGoogleAuth}
              type="button"
              className="flex w-full items-center justify-center space-x-3 rounded-2xl border-2 border-[#FCE1E8] bg-[#FFFDFC] px-4 py-3 text-xs sm:text-sm font-bold text-[#2D2522] transition-all hover:bg-[#FFF0F3] hover:border-[#FF758C] shadow-2xs"
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
              <div className="w-full border-t border-[#F4EBE6]" />
              <span className="absolute bg-[#FFFFFF] px-3 text-[10px] font-mono uppercase tracking-wider text-[#B2A49B] font-bold">
                or with email
              </span>
            </div>

            {/* Toggle Sign In / Create Account */}
            <div className="flex rounded-2xl border border-[#FCE1E8] bg-[#FFF5F7] p-1 mb-5">
              <button
                onClick={() => {
                  setIsLogin(true);
                  setErrorMsg(null);
                }}
                type="button"
                className={`w-1/2 rounded-xl py-2 text-xs sm:text-sm font-bold transition-all ${
                  isLogin
                    ? 'bg-[#FFFFFF] text-[#E11D48] shadow-xs'
                    : 'text-[#7A6D65] hover:text-[#2D2522]'
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
                className={`w-1/2 rounded-xl py-2 text-xs sm:text-sm font-bold transition-all ${
                  !isLogin
                    ? 'bg-[#FFFFFF] text-[#E11D48] shadow-xs'
                    : 'text-[#7A6D65] hover:text-[#2D2522]'
                }`}
              >
                Create Account
              </button>
            </div>

            {errorMsg && (
              <div className="mb-4 rounded-2xl border border-[#FCE1E8] bg-[#FFF0F3] p-3.5 text-xs text-[#E11D48] font-medium">
                {errorMsg}
              </div>
            )}

            {isSuccessRegistration && (
              <div className="mb-4 rounded-2xl border border-[#BBF7D0] bg-[#DCFCE7] p-3.5 text-xs text-[#15803D] font-medium">
                Account created! Logging in with love... 💕
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {!isLogin && (
                <div>
                  <label className="block text-[11px] font-bold text-[#6D5E56] mb-1.5">
                    Your Name
                  </label>
                  <div className="relative">
                    <UserIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#B2A49B]" />
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Alex"
                      className="w-full rounded-2xl border-2 border-[#FCE1E8] bg-[#FFFDFC] pl-10 pr-4 py-3 text-xs sm:text-sm text-[#2D2522] placeholder-[#B2A49B] focus:border-[#FF758C] focus:bg-[#FFFFFF] focus:outline-none focus:ring-2 focus:ring-[#FF758C]/20"
                      required
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-[11px] font-bold text-[#6D5E56] mb-1.5">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#B2A49B]" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full rounded-2xl border-2 border-[#FCE1E8] bg-[#FFFDFC] pl-10 pr-4 py-3 text-xs sm:text-sm text-[#2D2522] placeholder-[#B2A49B] focus:border-[#FF758C] focus:bg-[#FFFFFF] focus:outline-none focus:ring-2 focus:ring-[#FF758C]/20"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#6D5E56] mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#B2A49B]" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    minLength={6}
                    className="w-full rounded-2xl border-2 border-[#FCE1E8] bg-[#FFFDFC] pl-10 pr-4 py-3 text-xs sm:text-sm text-[#2D2522] placeholder-[#B2A49B] focus:border-[#FF758C] focus:bg-[#FFFFFF] focus:outline-none focus:ring-2 focus:ring-[#FF758C]/20"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex items-center justify-center space-x-2 rounded-2xl bg-gradient-to-r from-[#FF758C] to-[#FF7EB3] py-3.5 text-xs sm:text-sm font-bold text-white hover:scale-102 hover:shadow-[0_4px_16px_rgba(255,117,140,0.35)] transition-all disabled:opacity-50 min-h-[48px] shadow-sm"
              >
                <span>{isLoading ? 'Connecting...' : isLogin ? 'Enter Our Room 💕' : 'Create Our World 💕'}</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </form>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-[#F4EBE6] py-8 text-center text-xs font-mono text-[#B2A49B]">
        <p>DUO &mdash; A cozy digital world made for two 💕</p>
      </footer>
    </div>
  );
};
