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
    <div className="min-h-screen bg-[#FAF7F2] text-[#422F0E] flex flex-col justify-between selection:bg-[#FCC4C0] selection:text-[#422F0E]">
      {/* Top Bar */}
      <header className="border-b border-[#EFE8DC] bg-[#FAF7F2]/95 backdrop-blur-md sticky top-0 z-30">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6 sm:px-8 lg:px-10">
          <div className="flex items-center space-x-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#FCC4C0] text-[#EA5E86]">
              <Heart className="h-3.5 w-3.5 fill-current" />
            </span>
            <span className="font-serif text-2xl sm:text-3xl font-normal tracking-tight text-[#422F0E]">Duo</span>
          </div>
          <a
            href="#auth-section"
            className="rounded-full bg-[#422F0E] px-5 py-2 text-xs font-medium text-[#FAF7F2] hover:bg-[#EA5E86] transition-all shadow-sm"
          >
            Sign in &rarr;
          </a>
        </div>
      </header>

      {/* Main Landing Page Content */}
      <main className="flex-1">
        {/* Hero Narrative Section */}
        <section className="mx-auto max-w-5xl px-6 sm:px-8 lg:px-10 pt-16 pb-12 sm:pt-24 sm:pb-16 text-center sm:text-left">
          <div className="inline-flex items-center space-x-2 rounded-full border border-[#FCC4C0] bg-[#FFF5F5] px-4 py-1.5 text-xs font-medium text-[#EA5E86] mb-6 shadow-sm">
            <Heart className="h-3.5 w-3.5 fill-current" />
            <span>A little sanctuary made for two</span>
          </div>

          <h1 className="font-serif text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-normal tracking-tight text-[#422F0E] leading-[1.14]">
            A private, cozy space on the internet for <span className="italic font-serif text-[#EA5E86]">you two</span>.
          </h1>

          <p className="mt-6 max-w-3xl text-base sm:text-lg md:text-xl text-[#6B5E4E] leading-relaxed font-sans font-light">
            No public feeds, no followers, no noise. Duo is your secret garden where you share daily love prompts, playful drawings, and real-time thoughts.
          </p>
        </section>

        {/* 3 Pillars: How it works */}
        <section className="mx-auto max-w-5xl px-6 sm:px-8 lg:px-10 py-8 sm:py-12">
          <div className="border-t border-[#EFE8DC] pt-12">
            <h2 className="text-[10px] font-mono uppercase tracking-widest text-[#A89F91] mb-8">
              How our space works
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
              {/* Feature 1 */}
              <div className="rounded-3xl border border-[#EFE8DC] bg-[#FFFFFF] p-6 sm:p-7 shadow-[0_2px_12px_rgba(66,47,14,0.03)] flex flex-col justify-between">
                <div>
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#AECFD0]/30 text-[#037F71] mb-5">
                    <KeyRound className="h-5 w-5" />
                  </div>
                  <span className="text-xs font-mono text-[#A89F91]">01 / Secret Key</span>
                  <h3 className="mt-2 text-lg font-serif font-medium text-[#422F0E]">Private Pairing</h3>
                  <p className="mt-2 text-xs sm:text-sm text-[#6B5E4E] leading-relaxed">
                    Generate your unique DUO secret code and share it with your partner. Once connected, your room is sealed forever.
                  </p>
                </div>
              </div>

              {/* Feature 2 */}
              <div className="rounded-3xl border border-[#EFE8DC] bg-[#FFFFFF] p-6 sm:p-7 shadow-[0_2px_12px_rgba(66,47,14,0.03)] flex flex-col justify-between">
                <div>
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#DDF2B8]/50 text-[#037F71] mb-5">
                    <PenTool className="h-5 w-5" />
                  </div>
                  <span className="text-xs font-mono text-[#A89F91]">02 / Live Doodles</span>
                  <h3 className="mt-2 text-lg font-serif font-medium text-[#422F0E]">Notes & Drawing Studio</h3>
                  <p className="mt-2 text-xs sm:text-sm text-[#6B5E4E] leading-relaxed">
                    Instant messaging with real-time ink canvas to leave sweet sketches, doodle reactions, and heartfelt love letters.
                  </p>
                </div>
              </div>

              {/* Feature 3 */}
              <div className="rounded-3xl border border-[#EFE8DC] bg-[#FFFFFF] p-6 sm:p-7 shadow-[0_2px_12px_rgba(66,47,14,0.03)] flex flex-col justify-between">
                <div>
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#FCC4C0]/40 text-[#EA5E86] mb-5">
                    <BookOpen className="h-5 w-5" />
                  </div>
                  <span className="text-xs font-mono text-[#A89F91]">03 / Love Prompts</span>
                  <h3 className="mt-2 text-lg font-serif font-medium text-[#422F0E]">Daily Questions</h3>
                  <p className="mt-2 text-xs sm:text-sm text-[#6B5E4E] leading-relaxed">
                    Thoughtful prompts every day. Answers remain sealed in private drafts until both of you reveal, creating a lifelong scrapbook.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Auth Entry Form Section */}
        <section id="auth-section" className="mx-auto max-w-md px-6 py-16 sm:py-24">
          <div className="rounded-3xl border border-[#EFE8DC] bg-[#FFFFFF] p-8 sm:p-10 shadow-[0_12px_36px_rgba(66,47,14,0.06)]">
            <div className="text-center mb-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#FCC4C0]/40 text-[#EA5E86] mx-auto mb-3">
                <Heart className="h-5 w-5 fill-current" />
              </div>
              <h2 className="font-serif text-2xl sm:text-3xl font-normal text-[#422F0E]">
                {isLogin ? 'Welcome back, love' : 'Start your shared room'}
              </h2>
              <p className="mt-1.5 text-xs sm:text-sm text-[#6B5E4E]">
                {isLogin ? 'Enter your private space' : 'Begin your intimate memories together'}
              </p>
            </div>

            {/* Google OAuth Button */}
            <button
              onClick={handleGoogleAuth}
              type="button"
              className="flex w-full items-center justify-center space-x-3 rounded-full border border-[#EFE8DC] bg-[#FAF7F2] px-5 py-3 text-xs sm:text-sm font-medium text-[#422F0E] transition-all hover:bg-[#F2ECE1] hover:border-[#FCC4C0] shadow-sm"
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
              <div className="w-full border-t border-[#EFE8DC]" />
              <span className="absolute bg-[#FFFFFF] px-3 text-[10px] font-mono uppercase tracking-wider text-[#A89F91]">
                or with email
              </span>
            </div>

            {/* Toggle Sign In / Create Account */}
            <div className="flex rounded-full border border-[#EFE8DC] bg-[#FAF7F2] p-1 mb-5">
              <button
                onClick={() => {
                  setIsLogin(true);
                  setErrorMsg(null);
                }}
                type="button"
                className={`w-1/2 rounded-full py-2 text-xs sm:text-sm font-medium transition-all ${
                  isLogin
                    ? 'bg-[#422F0E] text-[#FAF7F2] shadow-sm font-semibold'
                    : 'text-[#6B5E4E] hover:text-[#422F0E]'
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
                className={`w-1/2 rounded-full py-2 text-xs sm:text-sm font-medium transition-all ${
                  !isLogin
                    ? 'bg-[#422F0E] text-[#FAF7F2] shadow-sm font-semibold'
                    : 'text-[#6B5E4E] hover:text-[#422F0E]'
                }`}
              >
                Create Room
              </button>
            </div>

            {errorMsg && (
              <div className="mb-4 rounded-2xl border border-[#FCC4C0] bg-[#FFF5F5] p-3.5 text-xs text-[#EA5E86]">
                {errorMsg}
              </div>
            )}

            {isSuccessRegistration && (
              <div className="mb-4 rounded-2xl border border-[#DDF2B8] bg-[#F5FBEF] p-3.5 text-xs text-[#037F71]">
                Account created! If email confirmation is enabled on your Supabase project, check your inbox.
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {!isLogin && (
                <div>
                  <label className="block text-xs font-medium text-[#6B5E4E] mb-1">Your Name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Alex"
                    className="w-full rounded-full border border-[#EFE8DC] bg-[#FAF7F2] px-5 py-2.5 text-xs sm:text-sm text-[#422F0E] placeholder-[#A89F91] focus:border-[#EA5E86] focus:bg-[#FFFFFF] focus:outline-none focus:ring-2 focus:ring-[#FCC4C0]/40"
                    required
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-[#6B5E4E] mb-1">Email Address</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@domain.com"
                  className="w-full rounded-full border border-[#EFE8DC] bg-[#FAF7F2] px-5 py-2.5 text-xs sm:text-sm text-[#422F0E] placeholder-[#A89F91] focus:border-[#EA5E86] focus:bg-[#FFFFFF] focus:outline-none focus:ring-2 focus:ring-[#FCC4C0]/40"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#6B5E4E] mb-1">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  minLength={6}
                  className="w-full rounded-full border border-[#EFE8DC] bg-[#FAF7F2] px-5 py-2.5 text-xs sm:text-sm text-[#422F0E] placeholder-[#A89F91] focus:border-[#EA5E86] focus:bg-[#FFFFFF] focus:outline-none focus:ring-2 focus:ring-[#FCC4C0]/40"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="mt-2 flex w-full items-center justify-center space-x-2 rounded-full bg-[#422F0E] py-3 text-xs sm:text-sm font-medium text-[#FAF7F2] transition-all hover:bg-[#EA5E86] disabled:opacity-40 shadow-sm"
              >
                <span>{isLoading ? 'Opening space...' : isLogin ? 'Enter Room' : 'Create Room'}</span>
                <ArrowRight className="h-4 w-4 text-[#FCC4C0]" />
              </button>
            </form>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-[#EFE8DC] py-8 text-center text-xs font-mono text-[#A89F91]">
        DUO &mdash; crafted for love & quiet intimacy
      </footer>
    </div>
  );
};
