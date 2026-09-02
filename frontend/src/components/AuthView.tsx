'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { duoApi } from '@/lib/api';
import { PairingSession } from '@/types';
import { Avatar } from './Avatar';
import {
  PenTool,
  BookOpen,
  ArrowRight,
  Mail,
  User as UserIcon,
  Lock,
  Heart,
  Sparkles,
  CheckCircle2,
  FolderOpen,
  ListTodo,
  MessageCircle,
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

  // QR Pairing session state on landing page (if opened via phone scan link ?pair=...)
  const [pairingSession, setPairingSession] = useState<PairingSession | null>(null);
  const [activeFeatureTab, setActiveFeatureTab] = useState<'daily' | 'notes' | 'canvas' | 'chat' | 'todo'>('daily');

  // Check if landing page was opened via QR scan (?pair=...)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('pair') || urlParams.get('token') || localStorage.getItem('pending_pair_token');

    if (token) {
      localStorage.setItem('pending_pair_token', token);
      duoApi.getPairingSession({ token })
        .then((res) => {
          if (res.success && res.session) {
            setPairingSession(res.session);
          }
        })
        .catch(() => {
          // Token might be expired or invalid
        });
    }
  }, []);

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
          <div className="flex items-center space-x-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-white dark:bg-white/95 border border-theme shadow-xs overflow-hidden shrink-0 p-0.5">
              <img src="/logo.png" alt="Duo Logo" className="w-full h-full object-contain" />
            </div>
            <span className="font-serif text-xl font-bold tracking-tight text-theme-primary">Duo</span>
          </div>

          <div className="flex items-center space-x-3">
            <a
              href="#features"
              className="hidden sm:inline-block text-xs font-medium text-theme-secondary hover:text-theme-primary transition-colors"
            >
              Explore Features
            </a>

            {/* Theme Toggle Button */}
            <button
              onClick={toggleTheme}
              className="flex h-8 w-8 items-center justify-center rounded-full border border-theme bg-theme-card text-theme-secondary hover:text-theme-primary hover:bg-theme-card-hover transition-colors shadow-xs"
              title={`Switch to ${resolvedTheme === 'dark' ? 'Light' : 'Dark'} Mode`}
            >
              {resolvedTheme === 'dark' ? (
                <Sun className="h-4 w-4 text-[#FB923C]" />
              ) : (
                <Moon className="h-4 w-4 text-[#125CB9]" />
              )}
            </button>

            <a
              href="#auth-section"
              className="rounded-full bg-[#125CB9] px-4 py-1.5 text-xs font-semibold text-white hover:bg-[#0E4B99] transition-colors shadow-xs"
            >
              Sign In &rarr;
            </a>
          </div>
        </div>
      </header>

      {/* Main Landing Page Content */}
      <main className="flex-1 pb-16">
        {/* QR Pairing Scanned Banner (If opened via phone camera scan) */}
        {pairingSession && (
          <div className="mx-auto max-w-4xl px-4 sm:px-8 pt-6">
            <div className="rounded-3xl border border-[#125CB9]/40 bg-[#125CB9]/10 p-5 sm:p-6 shadow-lg flex flex-col sm:flex-row items-center justify-between gap-4 animate-in slide-in-from-top-4 duration-300">
              <div className="flex items-center space-x-4 text-center sm:text-left">
                <Avatar
                  src={pairingSession.creator.avatar_url}
                  name={pairingSession.creator.name}
                  size="lg"
                />
                <div>
                  <div className="inline-flex items-center space-x-1.5 text-xs font-mono font-bold text-[#125CB9]">
                    <Sparkles className="h-3.5 w-3.5" />
                    <span>DEVICE PAIRING INVITE ACTIVE</span>
                  </div>
                  <h3 className="font-serif text-lg sm:text-xl font-bold text-theme-primary mt-0.5">
                    {pairingSession.creator.name} invited you to Duo
                  </h3>
                  <p className="text-xs text-theme-secondary">
                    Sign in below to connect your device and enter your shared private room.
                  </p>
                </div>
              </div>

              <a
                href="#auth-section"
                className="rounded-full bg-[#125CB9] px-6 py-2.5 text-xs font-semibold text-white hover:bg-[#0E4B99] transition-all shadow-md shrink-0 flex items-center space-x-1.5"
              >
                <span>Accept & Sign In</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </a>
            </div>
          </div>
        )}

        {/* Hero Narrative Section */}
        <section className="mx-auto max-w-4xl px-6 sm:px-8 pt-12 pb-8 sm:pt-18 sm:pb-12 text-center">
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

          <div className="mt-7 flex items-center justify-center">
            <a
              href="#auth-section"
              className="rounded-full bg-[#125CB9] px-8 py-3.5 text-sm font-semibold text-white hover:bg-[#0E4B99] transition-all shadow-md active:scale-98 flex items-center space-x-2"
            >
              <span>Enter Your Room</span>
              <ArrowRight className="h-4 w-4" />
            </a>
          </div>
        </section>

        {/* Deep Dive: Interactive Feature Tabs */}
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

            {/* Interactive Feature Category Pills (Clean Icons Only - No Emojis) */}
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
                        ? 'bg-[#125CB9] text-white shadow-md font-semibold'
                        : 'border border-theme bg-theme-card text-theme-secondary hover:text-theme-primary hover:bg-theme-input'
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
                        <span>Live cursor presence shows where your partner is hovering</span>
                      </li>
                    </ul>
                  </div>

                  <div className="rounded-2xl border border-theme bg-theme-input p-5 flex items-center justify-center min-h-[160px]">
                    <div className="text-center space-y-2">
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#00D26A]/10 text-[#00D26A] mx-auto">
                        <PenTool className="h-6 w-6" />
                      </div>
                      <span className="text-xs font-mono text-theme-muted block">Live Multiplayer Sync</span>
                    </div>
                  </div>
                </div>
              )}

              {activeFeatureTab === 'chat' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                  <div className="space-y-3">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-[#125CB9] font-semibold">
                      Feature 04 &bull; Cozy Stream
                    </span>
                    <h3 className="font-serif text-2xl font-bold text-theme-primary">
                      Whisper Chat & Disappearing Mode
                    </h3>
                    <p className="text-xs sm:text-sm text-theme-secondary leading-relaxed">
                      Intimate messaging without group chaos. Turn on Disappearing Mode for temporary messages that vanish 10 seconds after both partners have seen them.
                    </p>
                    <ul className="space-y-1.5 text-xs text-theme-secondary pt-1">
                      <li className="flex items-center space-x-2">
                        <CheckCircle2 className="h-3.5 w-3.5 text-[#00D26A]" />
                        <span>Voice notes, typing indicators & reaction stamps</span>
                      </li>
                      <li className="flex items-center space-x-2">
                        <CheckCircle2 className="h-3.5 w-3.5 text-[#00D26A]" />
                        <span>Dashed border indicator during temporary chat</span>
                      </li>
                    </ul>
                  </div>

                  <div className="rounded-2xl border border-theme bg-theme-input p-4 space-y-2.5">
                    <div className="rounded-2xl border border-[#125CB9]/30 bg-[#125CB9]/10 p-3 text-xs text-theme-primary ml-auto max-w-[80%] text-right">
                      Thinking about you today &hearts;
                    </div>
                    <div className="rounded-2xl border border-theme bg-theme-card p-3 text-xs text-theme-primary mr-auto max-w-[80%]">
                      Can't wait to see you tonight!
                    </div>
                  </div>
                </div>
              )}

              {activeFeatureTab === 'todo' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                  <div className="space-y-3">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-[#00D26A] font-semibold">
                      Feature 05 &bull; Calm Kanban
                    </span>
                    <h3 className="font-serif text-2xl font-bold text-theme-primary">
                      Our To-Do Board
                    </h3>
                    <p className="text-xs sm:text-sm text-theme-secondary leading-relaxed">
                      Organize your shared life effortlessly. 3 serene columns (To Do, In Progress, Completed) with drag-and-drop mechanics and live synchronisation.
                    </p>
                    <ul className="space-y-1.5 text-xs text-theme-secondary pt-1">
                      <li className="flex items-center space-x-2">
                        <CheckCircle2 className="h-3.5 w-3.5 text-[#00D26A]" />
                        <span>Instant 1-click task creation with author stamps</span>
                      </li>
                      <li className="flex items-center space-x-2">
                        <CheckCircle2 className="h-3.5 w-3.5 text-[#00D26A]" />
                        <span>Drag & drop reordering across workflow columns</span>
                      </li>
                    </ul>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div className="rounded-xl border border-theme bg-theme-card p-2.5 text-[11px] font-mono text-center">
                      <span className="text-theme-muted block mb-1">TO DO</span>
                      <span className="font-sans font-medium text-xs text-theme-primary">Weekend trip</span>
                    </div>
                    <div className="rounded-xl border border-theme bg-theme-card p-2.5 text-[11px] font-mono text-center">
                      <span className="text-[#125CB9] block mb-1">IN PROGRESS</span>
                      <span className="font-sans font-medium text-xs text-theme-primary">Book tickets</span>
                    </div>
                    <div className="rounded-xl border border-theme bg-theme-card p-2.5 text-[11px] font-mono text-center">
                      <span className="text-[#00D26A] block mb-1">DONE</span>
                      <span className="font-sans font-medium text-xs text-theme-muted line-through">Pack bags</span>
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
                {pairingSession
                  ? `Sign in to connect with ${pairingSession.creator.name}`
                  : isLogin
                  ? 'Enter your private space'
                  : 'Begin your shared memories together'}
              </p>
            </div>

            {errorMsg && (
              <div className="mb-4 rounded-2xl border border-[#F43F5E]/30 bg-[#F43F5E]/10 p-3 text-xs text-[#F43F5E]">
                {errorMsg}
              </div>
            )}

            {isSuccessRegistration && (
              <div className="mb-4 rounded-2xl border border-[#00D26A]/30 bg-[#00D26A]/10 p-3 text-xs text-[#00D26A]">
                Account created! Please check your email to confirm your registration.
              </div>
            )}

            {/* Google OAuth Quick Button */}
            <button
              type="button"
              onClick={handleGoogleAuth}
              className="w-full flex items-center justify-center space-x-2.5 rounded-2xl border border-theme bg-theme-input py-2.5 px-4 text-xs sm:text-sm font-medium text-theme-primary hover:bg-theme-card transition-all shadow-xs mb-4"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>Continue with Google</span>
            </button>

            <div className="relative my-4 text-center">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-theme" />
              </div>
              <span className="relative bg-theme-card px-3 text-[11px] font-mono text-theme-muted uppercase tracking-wider">
                or with email
              </span>
            </div>

            {/* Email / Password Form */}
            <form onSubmit={handleSubmit} className="space-y-3.5">
              {!isLogin && (
                <div>
                  <label className="block text-[11px] font-mono uppercase tracking-wider text-theme-muted mb-1 font-medium">
                    Your Name
                  </label>
                  <div className="relative">
                    <UserIcon className="absolute left-3.5 top-3 h-4 w-4 text-theme-muted" />
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Alex"
                      required={!isLogin}
                      className="w-full rounded-xl border border-theme bg-theme-input pl-10 pr-3.5 py-2.5 text-xs sm:text-sm text-theme-primary placeholder-theme-muted focus:border-[#125CB9] focus:bg-theme-card focus:outline-none"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-[11px] font-mono uppercase tracking-wider text-theme-muted mb-1 font-medium">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-3 h-4 w-4 text-theme-muted" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    required
                    className="w-full rounded-xl border border-theme bg-theme-input pl-10 pr-3.5 py-2.5 text-xs sm:text-sm text-theme-primary placeholder-theme-muted focus:border-[#125CB9] focus:bg-theme-card focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-mono uppercase tracking-wider text-theme-muted mb-1 font-medium">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-3 h-4 w-4 text-theme-muted" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    className="w-full rounded-xl border border-theme bg-theme-input pl-10 pr-3.5 py-2.5 text-xs sm:text-sm text-theme-primary placeholder-theme-muted focus:border-[#125CB9] focus:bg-theme-card focus:outline-none"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full mt-2 rounded-full bg-[#125CB9] py-3 text-xs sm:text-sm font-semibold text-white hover:bg-[#0E4B99] disabled:opacity-40 transition-colors shadow-md"
              >
                {isLoading ? 'Please wait...' : isLogin ? 'Sign In' : 'Create Account'}
              </button>
            </form>

            <div className="mt-5 text-center">
              <button
                type="button"
                onClick={() => {
                  setIsLogin(!isLogin);
                  setErrorMsg(null);
                }}
                className="text-xs text-theme-secondary hover:text-theme-primary transition-colors"
              >
                {isLogin
                  ? "Don't have a room yet? Create an account"
                  : 'Already have an account? Sign in'}
              </button>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};
