'use client';

import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import {
  PenTool,
  BookOpen,
  ArrowRight,
  Mail,
  User as UserIcon,
  Lock,
  Heart,
  FolderOpen,
  ListTodo,
  MessageCircle,
  Check,
  CheckCircle2,
  Sun,
  Moon,
} from 'lucide-react';

export const AuthView: React.FC = () => {
  const { loginWithEmail, registerWithEmail, loginWithGoogle } = useAuth();
  const { resolvedTheme, toggleTheme } = useTheme();
  const [isLogin, setIsLogin] = useState<boolean>(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccessRegistration, setIsSuccessRegistration] = useState(false);
  const [activeFeatureTab, setActiveFeatureTab] = useState<'daily' | 'notes' | 'canvas' | 'chat' | 'todo'>('daily');

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
      <header className="border-b border-theme bg-theme-page/95 backdrop-blur-md sticky top-0 z-30">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6 sm:px-8">
          <div className="flex items-center space-x-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-white dark:bg-white/95 border border-theme shadow-xs overflow-hidden shrink-0 p-0.5">
              <img src="/logo.png" alt="Duo Logo" className="w-full h-full object-contain" />
            </div>
            <span className="font-serif text-xl font-bold tracking-tight text-theme-primary">Duo</span>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={toggleTheme}
              className="flex h-8 w-8 items-center justify-center rounded-full border border-theme bg-theme-card text-theme-secondary hover:text-theme-primary transition-colors shadow-xs"
              title={`Switch to ${resolvedTheme === 'dark' ? 'Light' : 'Dark'} Mode`}
            >
              {resolvedTheme === 'dark' ? <Sun className="h-4 w-4 text-[#FB923C]" /> : <Moon className="h-4 w-4 text-[#125CB9]" />}
            </button>

            <a
              href="#auth-section"
              className="rounded-full bg-[#125CB9] px-4 py-1.5 text-xs font-semibold text-white hover:bg-[#0E4B99] transition-all shadow-xs"
            >
              Sign In &rarr;
            </a>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero Narrative Section */}
        <section className="mx-auto max-w-4xl px-6 sm:px-8 pt-12 pb-10 sm:pt-20 sm:pb-16 text-center">
          <div className="inline-flex items-center space-x-2 rounded-full px-3.5 py-1 text-xs font-mono font-medium text-[#125CB9] bg-[#125CB9]/10 border border-[#125CB9]/25 mb-4">
            <Heart className="h-3.5 w-3.5 fill-current" />
            <span>Strictly Two People &bull; Zero Noise</span>
          </div>

          <h1 className="font-serif text-3xl sm:text-5xl md:text-6xl font-bold tracking-tight text-theme-primary leading-tight max-w-3xl mx-auto">
            A private, quiet universe for <span className="text-[#125CB9]">you two</span>.
          </h1>

          <p className="mt-4 max-w-2xl text-sm sm:text-base text-theme-secondary leading-relaxed font-sans mx-auto">
            No public algorithms, no followers, no third wheels. Duo is a dedicated digital sanctuary for couples and best friends to answer daily love prompts, draw in real-time, leave voice notes in tactile file folders, and stay deeply connected.
          </p>

          <div className="mt-8 flex items-center justify-center">
            <a
              href="#auth-section"
              className="rounded-full bg-[#125CB9] px-8 py-3.5 text-sm font-semibold text-white hover:bg-[#0E4B99] transition-all shadow-md active:scale-98 flex items-center space-x-2"
            >
              <span>Enter Your Room</span>
              <ArrowRight className="h-4 w-4" />
            </a>
          </div>
        </section>

        <section id="features" className="mx-auto max-w-4xl px-6 sm:px-8 py-8">
          <div className="border-t border-theme pt-8">
            <div className="text-center space-y-2 mb-8">
              <span className="text-[11px] font-mono uppercase tracking-wider text-[#125CB9] font-semibold">
                Designed with Intention
              </span>
              <h2 className="font-serif text-2xl sm:text-4xl font-bold text-theme-primary">
                Everything inside your private space
              </h2>
              <p className="text-xs sm:text-sm text-theme-secondary max-w-lg mx-auto">
                Explore each bespoke room designed specifically for two people.
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-2 mb-6">
              {[
                { id: 'daily', label: 'Daily Prompts', icon: BookOpen },
                { id: 'notes', label: 'File Notes', icon: FolderOpen },
                { id: 'canvas', label: 'Live Canvas', icon: PenTool },
                { id: 'chat', label: 'Whisper Chat', icon: MessageCircle },
                { id: 'todo', label: 'Duo Kanban', icon: ListTodo },
              ].map((tab) => {
                const Icon = tab.icon;
                const isActive = activeFeatureTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveFeatureTab(tab.id as any)}
                    className={`flex items-center space-x-2 rounded-full px-4 py-2 text-xs font-medium transition-all ${
                      isActive
                        ? 'bg-[#125CB9] text-white shadow-xs scale-102'
                        : 'bg-theme-card border border-theme text-theme-secondary hover:text-theme-primary hover:border-[#125CB9]/40'
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Active Tab Detailed Showcase Card */}
            <div className="rounded-3xl border border-theme bg-theme-card p-6 sm:p-8 shadow-sm transition-all duration-300">
              {activeFeatureTab === 'daily' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                  <div className="space-y-3">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-[#FB923C] font-semibold">
                      Feature 01 &bull; Sealed Questions
                    </span>
                    <h3 className="font-serif text-2xl font-bold text-theme-primary">
                      Daily Love Prompts with Voice & Vaults
                    </h3>
                    <p className="text-xs sm:text-sm text-theme-secondary leading-relaxed">
                      Every day at midnight, you and your partner each receive a thoughtful, tailored prompt. Neither question repeats for your duo ever. Answers stay sealed in private vaults until both partners answer, building an intimate multi-year diary.
                    </p>
                    <ul className="space-y-1.5 text-xs text-theme-secondary pt-1">
                      <li className="flex items-center space-x-2">
                        <CheckCircle2 className="h-3.5 w-3.5 text-[#00D26A]" />
                        <span>Strictly 1 question per day with Duo-wide uniqueness</span>
                      </li>
                      <li className="flex items-center space-x-2">
                        <CheckCircle2 className="h-3.5 w-3.5 text-[#00D26A]" />
                        <span>Voice recording reflections alongside text</span>
                      </li>
                      <li className="flex items-center space-x-2">
                        <CheckCircle2 className="h-3.5 w-3.5 text-[#00D26A]" />
                        <span>Calendar archive to look back on past reflections</span>
                      </li>
                    </ul>
                  </div>

                  <div className="rounded-2xl border border-theme bg-theme-input p-5 space-y-3">
                    <div className="flex items-center justify-between text-[11px] font-mono text-theme-muted">
                      <span>TODAY'S PROMPT</span>
                      <span className="text-[#FB923C] font-bold">LOCKED UNTIL SHARED</span>
                    </div>
                    <h4 className="font-serif text-sm sm:text-base font-bold text-theme-primary">
                      "What is a tiny gesture from me this week that secretly made you feel loved?"
                    </h4>
                    <div className="rounded-xl border border-theme bg-theme-card p-3 text-xs text-theme-secondary italic">
                      "When you left that sticky note on my coffee mug on Tuesday..."
                    </div>
                  </div>
                </div>
              )}

              {activeFeatureTab === 'notes' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                  <div className="space-y-3">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-[#C9A6D0] font-semibold">
                      Feature 02 &bull; Tactile Digital Objects
                    </span>
                    <h3 className="font-serif text-2xl font-bold text-theme-primary">
                      Little Notes in Physical File Folders
                    </h3>
                    <p className="text-xs sm:text-sm text-theme-secondary leading-relaxed">
                      Say goodbye to flat lists. Little Notes are organized into tactile digital file folders with notched tab geometry, soft pastel palettes, and papers that tilt on hover.
                    </p>
                    <ul className="space-y-1.5 text-xs text-theme-secondary pt-1">
                      <li className="flex items-center space-x-2">
                        <CheckCircle2 className="h-3.5 w-3.5 text-[#00D26A]" />
                        <span>4 curated genres: Text Whispers, Photos, Audio Notes, Doodles</span>
                      </li>
                      <li className="flex items-center space-x-2">
                        <CheckCircle2 className="h-3.5 w-3.5 text-[#00D26A]" />
                        <span>Unopened Notes Preview spotlight with live read status</span>
                      </li>
                      <li className="flex items-center space-x-2">
                        <CheckCircle2 className="h-3.5 w-3.5 text-[#00D26A]" />
                        <span>Full audio recording with waveform player</span>
                      </li>
                    </ul>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-2xl border-2 border-[#242424] bg-[#FFF3A6] p-4 text-[#242424] shadow-xs">
                      <span className="text-[10px] font-mono font-bold uppercase">Text Folder</span>
                      <p className="text-xs font-serif font-bold mt-1">"Good morning my love &hearts;"</p>
                    </div>
                    <div className="rounded-2xl border-2 border-[#242424] bg-[#B8E6BE] p-4 text-[#242424] shadow-xs">
                      <span className="text-[10px] font-mono font-bold uppercase">Audio Folder</span>
                      <p className="text-xs font-serif font-bold mt-1">Voice note (0:42)</p>
                    </div>
                  </div>
                </div>
              )}

              {activeFeatureTab === 'canvas' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                  <div className="space-y-3">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-[#00D26A] font-semibold">
                      Feature 03 &bull; Shared Ink Studio
                    </span>
                    <h3 className="font-serif text-2xl font-bold text-theme-primary">
                      Real-Time Live Drawing Canvas
                    </h3>
                    <p className="text-xs sm:text-sm text-theme-secondary leading-relaxed">
                      Doodle together across oceans in real-time. Brush strokes flow between screens with zero latency over Supabase Realtime channels.
                    </p>
                    <ul className="space-y-1.5 text-xs text-theme-secondary pt-1">
                      <li className="flex items-center space-x-2">
                        <CheckCircle2 className="h-3.5 w-3.5 text-[#00D26A]" />
                        <span>Smooth Bézier stroke smoothing & custom ink palette</span>
                      </li>
                      <li className="flex items-center space-x-2">
                        <CheckCircle2 className="h-3.5 w-3.5 text-[#00D26A]" />
                        <span>Eraser, stroke width adjustment & clear canvas</span>
                      </li>
                      <li className="flex items-center space-x-2">
                        <CheckCircle2 className="h-3.5 w-3.5 text-[#00D26A]" />
                        <span>Export keepsakes directly into your Little Notes file</span>
                      </li>
                    </ul>
                  </div>

                  <div className="rounded-2xl border border-theme bg-white p-6 shadow-inner text-center">
                    <PenTool className="h-10 w-10 text-[#125CB9] mx-auto mb-2" />
                    <span className="text-xs font-mono text-gray-500 font-bold">Collaborative Live Ink</span>
                    <p className="text-[11px] text-gray-400 mt-1">Both cursors draw simultaneously in real-time</p>
                  </div>
                </div>
              )}

              {activeFeatureTab === 'chat' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                  <div className="space-y-3">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-[#125CB9] font-semibold">
                      Feature 04 &bull; Private Messaging
                    </span>
                    <h3 className="font-serif text-2xl font-bold text-theme-primary">
                      Whisper Chat & Live Presence
                    </h3>
                    <p className="text-xs sm:text-sm text-theme-secondary leading-relaxed">
                      An intimate chat room with live typing bubbles, read receipts, message replies, and quick photo/voice attachments.
                    </p>
                    <ul className="space-y-1.5 text-xs text-theme-secondary pt-1">
                      <li className="flex items-center space-x-2">
                        <CheckCircle2 className="h-3.5 w-3.5 text-[#00D26A]" />
                        <span>Live typing indicators & read receipts</span>
                      </li>
                      <li className="flex items-center space-x-2">
                        <CheckCircle2 className="h-3.5 w-3.5 text-[#00D26A]" />
                        <span>Threaded replies & emoji reactions</span>
                      </li>
                    </ul>
                  </div>

                  <div className="space-y-2">
                    <div className="rounded-2xl bg-[#125CB9] text-white p-3 text-xs max-w-xs ml-auto rounded-br-none shadow-xs">
                      "Can't wait to see you tonight &hearts;"
                    </div>
                    <div className="rounded-2xl bg-theme-input text-theme-primary p-3 text-xs max-w-xs mr-auto rounded-bl-none border border-theme shadow-xs">
                      "Counting down the hours!"
                    </div>
                  </div>
                </div>
              )}

              {activeFeatureTab === 'todo' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                  <div className="space-y-3">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-[#8EAFE3] font-semibold">
                      Feature 05 &bull; Couple Kanban
                    </span>
                    <h3 className="font-serif text-2xl font-bold text-theme-primary">
                      Shared Duo Lists & Kanban Boards
                    </h3>
                    <p className="text-xs sm:text-sm text-theme-secondary leading-relaxed">
                      Plan date nights, grocery runs, bucket list travel destinations, and everyday chores with draggable Kanban columns.
                    </p>
                    <ul className="space-y-1.5 text-xs text-theme-secondary pt-1">
                      <li className="flex items-center space-x-2">
                        <CheckCircle2 className="h-3.5 w-3.5 text-[#00D26A]" />
                        <span>To Do, In Progress, and Completed columns</span>
                      </li>
                      <li className="flex items-center space-x-2">
                        <CheckCircle2 className="h-3.5 w-3.5 text-[#00D26A]" />
                        <span>Live synchronization when items are added or checked off</span>
                      </li>
                    </ul>
                  </div>

                  <div className="rounded-2xl border border-theme bg-theme-input p-4 space-y-2">
                    <div className="flex items-center justify-between text-xs font-mono font-bold text-theme-primary">
                      <span>Date Night Bucket List</span>
                      <span className="text-[#00D26A]">2/3 Done</span>
                    </div>
                    <div className="space-y-1.5 text-xs">
                      <div className="flex items-center space-x-2 line-through text-theme-muted">
                        <Check className="h-3.5 w-3.5 text-[#00D26A]" />
                        <span>Cook handmade pasta together</span>
                      </div>
                      <div className="flex items-center space-x-2 line-through text-theme-muted">
                        <Check className="h-3.5 w-3.5 text-[#00D26A]" />
                        <span>Stargazing on the roof</span>
                      </div>
                      <div className="flex items-center space-x-2 text-theme-primary font-medium">
                        <span className="h-3.5 w-3.5 rounded-full border border-theme" />
                        <span>Weekend pottery workshop</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Auth Entry Form Section */}
        <section id="auth-section" className="mx-auto max-w-md px-6 py-10 sm:py-14">
          <div className="rounded-3xl border border-theme bg-theme-card p-6 sm:p-8 shadow-xl">
            <div className="text-center mb-5">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white dark:bg-white/95 border border-theme shadow-xs overflow-hidden mx-auto mb-3 p-1">
                <img src="/logo.png" alt="Duo Logo" className="w-full h-full object-contain" />
              </div>
              <h2 className="font-serif text-xl sm:text-2xl font-bold text-theme-primary">
                {isLogin ? 'Welcome back to Duo' : 'Start your shared room'}
              </h2>
              <p className="mt-1 text-xs text-theme-secondary">
                {isLogin
                  ? 'Enter your private space'
                  : 'Begin your shared memories together'}
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
        DUO &mdash; crafted with love for quiet intimacy
      </footer>
    </div>
  );
};
