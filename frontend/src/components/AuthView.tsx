'use client';

import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { KeyRound, PenTool, BookOpen, ArrowRight, ShieldCheck, Mail, User as UserIcon, Lock } from 'lucide-react';

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
    <div className="min-h-screen bg-[#FBFAF7] text-[#1C1917] flex flex-col justify-between selection:bg-[#FAEDE6] selection:text-[#9C3B1E]">
      {/* Editorial Top Bar */}
      <header className="border-b border-[#E8E4DB] bg-[#FBFAF7]/95 backdrop-blur-md sticky top-0 z-30">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6 sm:px-8 lg:px-10">
          <div className="flex items-baseline space-x-2.5">
            <span className="font-serif text-2xl sm:text-3xl font-normal tracking-tight text-[#1C1917]">Duo</span>
            <span className="text-[11px] font-mono uppercase tracking-widest text-[#8C857B]">/ Room for two</span>
          </div>
          <a
            href="#auth-section"
            className="text-xs sm:text-sm font-medium text-[#57534E] hover:text-[#1C1917] transition-colors"
          >
            Sign in &rarr;
          </a>
        </div>
      </header>

      {/* Main Landing Page Content */}
      <main className="flex-1">
        {/* Hero Narrative Section */}
        <section className="mx-auto max-w-5xl px-6 sm:px-8 lg:px-10 pt-16 pb-12 sm:pt-24 sm:pb-16 text-center sm:text-left">
          <div className="inline-flex items-center space-x-2 rounded-full border border-[#E8E4DB] bg-[#F4F1EA] px-4 py-1.5 text-xs font-medium text-[#78716C] mb-6">
            <span className="h-2 w-2 rounded-full bg-[#C2410C]"></span>
            <span>Private two-person digital space</span>
          </div>

          <h1 className="font-serif text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-normal tracking-tight text-[#1C1917] leading-[1.12]">
            A quiet space on the internet made for <span className="italic font-serif text-[#C2410C]">only two</span>.
          </h1>

          <p className="mt-6 max-w-3xl text-base sm:text-lg md:text-xl text-[#57534E] leading-relaxed font-sans font-light">
            No endless feeds, no follower counts, no public noise. Duo is a private, tactile room where two people share real-time messages, hand-drawn notes, and sealed daily thoughts.
          </p>
        </section>

        {/* 3 Pillars: How it works */}
        <section className="mx-auto max-w-5xl px-6 sm:px-8 lg:px-10 py-8 sm:py-12">
          <div className="border-t border-[#E8E4DB] pt-12">
            <h2 className="text-xs font-mono uppercase tracking-widest text-[#8C857B] mb-8">
              How the space works
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
              {/* Feature 1 */}
              <div className="rounded-2xl border border-[#E8E4DB] bg-[#FFFFFF] p-6 sm:p-7 shadow-[0_2px_8px_rgba(28,25,23,0.03)] flex flex-col justify-between">
                <div>
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#F5F2EB] text-[#1C1917] mb-5">
                    <KeyRound className="h-5 w-5 text-[#C2410C]" />
                  </div>
                  <span className="text-xs font-mono text-[#8C857B]">01 / Key Code</span>
                  <h3 className="mt-2 text-lg font-serif font-medium text-[#1C1917]">Private Pairing</h3>
                  <p className="mt-2 text-xs sm:text-sm text-[#57534E] leading-relaxed">
                    Generate your unique 6-character DUO code and share it with your partner. Once connected, your room is sealed.
                  </p>
                </div>
              </div>

              {/* Feature 2 */}
              <div className="rounded-2xl border border-[#E8E4DB] bg-[#FFFFFF] p-6 sm:p-7 shadow-[0_2px_8px_rgba(28,25,23,0.03)] flex flex-col justify-between">
                <div>
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#F5F2EB] text-[#1C1917] mb-5">
                    <PenTool className="h-5 w-5 text-[#C2410C]" />
                  </div>
                  <span className="text-xs font-mono text-[#8C857B]">02 / Real-time</span>
                  <h3 className="mt-2 text-lg font-serif font-medium text-[#1C1917]">Notes & Drawing Studio</h3>
                  <p className="mt-2 text-xs sm:text-sm text-[#57534E] leading-relaxed">
                    Instant encrypted messaging and a freehand canvas with natural ink tones to leave quick sketches and heartfelt notes.
                  </p>
                </div>
              </div>

              {/* Feature 3 */}
              <div className="rounded-2xl border border-[#E8E4DB] bg-[#FFFFFF] p-6 sm:p-7 shadow-[0_2px_8px_rgba(28,25,23,0.03)] flex flex-col justify-between">
                <div>
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#F5F2EB] text-[#1C1917] mb-5">
                    <BookOpen className="h-5 w-5 text-[#C2410C]" />
                  </div>
                  <span className="text-xs font-mono text-[#8C857B]">03 / Reflection</span>
                  <h3 className="mt-2 text-lg font-serif font-medium text-[#1C1917]">Daily Sealed Questions</h3>
                  <p className="mt-2 text-xs sm:text-sm text-[#57534E] leading-relaxed">
                    Reflective prompts every day. Answers remain sealed in private drafts until both of you submit, building an archive of memories.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Auth Entry Form Section */}
        <section id="auth-section" className="mx-auto max-w-md px-6 py-16 sm:py-24">
          <div className="rounded-2xl border border-[#E8E4DB] bg-[#FFFFFF] p-8 sm:p-10 shadow-[0_8px_32px_rgba(28,25,23,0.06)]">
            <div className="text-center mb-6">
              <h2 className="font-serif text-2xl sm:text-3xl font-normal text-[#1C1917]">
                {isLogin ? 'Enter your room' : 'Create your account'}
              </h2>
              <p className="mt-1.5 text-xs sm:text-sm text-[#78716C]">
                {isLogin ? 'Welcome back to your private space' : 'Begin your shared space with your partner'}
              </p>
            </div>

            {/* Google OAuth Button */}
            <button
              onClick={handleGoogleAuth}
              type="button"
              className="flex w-full items-center justify-center space-x-3 rounded-xl border border-[#D4CEC2] bg-[#FFFFFF] px-4 py-3 text-xs sm:text-sm font-medium text-[#1C1917] transition-all hover:bg-[#F5F2EB] hover:border-[#B0A89D] shadow-sm"
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
              <div className="w-full border-t border-[#E8E4DB]" />
              <span className="absolute bg-[#FFFFFF] px-3 text-[10px] font-mono uppercase tracking-wider text-[#8C857B]">
                or with email
              </span>
            </div>

            {/* Toggle Sign In / Create Account */}
            <div className="flex rounded-xl border border-[#E8E4DB] bg-[#F5F2EB] p-1 mb-5">
              <button
                onClick={() => {
                  setIsLogin(true);
                  setErrorMsg(null);
                }}
                type="button"
                className={`w-1/2 rounded-lg py-2 text-xs sm:text-sm font-medium transition-all ${
                  isLogin
                    ? 'bg-[#FFFFFF] text-[#1C1917] shadow-sm font-semibold'
                    : 'text-[#78716C] hover:text-[#1C1917]'
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
                className={`w-1/2 rounded-lg py-2 text-xs sm:text-sm font-medium transition-all ${
                  !isLogin
                    ? 'bg-[#FFFFFF] text-[#1C1917] shadow-sm font-semibold'
                    : 'text-[#78716C] hover:text-[#1C1917]'
                }`}
              >
                Create Account
              </button>
            </div>

            {errorMsg && (
              <div className="mb-4 rounded-xl border border-[#FCA5A5] bg-[#FEF2F2] p-3.5 text-xs text-[#991B1B]">
                {errorMsg}
              </div>
            )}

            {isSuccessRegistration && (
              <div className="mb-4 rounded-xl border border-[#A7F3D0] bg-[#ECFDF5] p-3.5 text-xs text-[#065F46]">
                Account created! If email confirmation is enabled on your Supabase project, check your inbox.
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {!isLogin && (
                <div>
                  <label className="block text-xs font-medium text-[#57534E] mb-1">Your Name</label>
                  <div className="relative">
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Alex"
                      className="w-full rounded-xl border border-[#D4CEC2] bg-[#FBFAF7] px-4 py-2.5 text-xs sm:text-sm text-[#1C1917] placeholder-[#A8A29E] focus:border-[#C2410C] focus:bg-[#FFFFFF] focus:outline-none focus:ring-1 focus:ring-[#C2410C]"
                      required
                    />
                    <UserIcon className="absolute right-3.5 top-3 h-4 w-4 text-[#A8A29E]" />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-[#57534E] mb-1">Email Address</label>
                <div className="relative">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full rounded-xl border border-[#D4CEC2] bg-[#FBFAF7] px-4 py-2.5 text-xs sm:text-sm text-[#1C1917] placeholder-[#A8A29E] focus:border-[#C2410C] focus:bg-[#FFFFFF] focus:outline-none focus:ring-1 focus:ring-[#C2410C]"
                    required
                  />
                  <Mail className="absolute right-3.5 top-3 h-4 w-4 text-[#A8A29E]" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#57534E] mb-1">Password</label>
                <div className="relative">
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    minLength={6}
                    className="w-full rounded-xl border border-[#D4CEC2] bg-[#FBFAF7] px-4 py-2.5 text-xs sm:text-sm text-[#1C1917] placeholder-[#A8A29E] focus:border-[#C2410C] focus:bg-[#FFFFFF] focus:outline-none focus:ring-1 focus:ring-[#C2410C]"
                    required
                  />
                  <Lock className="absolute right-3.5 top-3 h-4 w-4 text-[#A8A29E]" />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="mt-2 flex w-full items-center justify-center space-x-2 rounded-xl bg-[#1C1917] py-3 text-xs sm:text-sm font-medium text-white hover:bg-[#2E2A27] transition-all disabled:opacity-40 shadow-sm"
              >
                <span>{isLoading ? 'Please wait...' : isLogin ? 'Enter Room' : 'Create Room Account'}</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </form>
          </div>
        </section>
      </main>

      {/* Editorial Footer */}
      <footer className="border-t border-[#E8E4DB] py-8 text-center text-xs font-mono text-[#8C857B]">
        <div className="mx-auto max-w-7xl px-6">
          <p>DUO &mdash; Private Two-Person Architecture</p>
        </div>
      </footer>
    </div>
  );
};
