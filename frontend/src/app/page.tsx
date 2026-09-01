'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Navbar } from '@/components/Navbar';
import { AuthView } from '@/components/AuthView';
import { ConnectionHub } from '@/components/ConnectionHub';
import { JoinDuoPrompt } from '@/components/JoinDuoPrompt';
import { ChatView } from '@/components/ChatView';
import { DrawingCanvas } from '@/components/DrawingCanvas';
import { DailyView } from '@/components/DailyView';
import { LittleNotesView } from '@/components/LittleNotesView';
import { TodoKanbanView } from '@/components/TodoKanbanView';

export default function Home() {
  const { profile, hasActiveDuo, isLoading, supabaseUser, refreshProfile } = useAuth();
  // Persist active tab across page refreshes
  const [activeTab, setActiveTabState] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const savedTab = localStorage.getItem('duo_active_tab');
      if (savedTab && ['daily', 'chat', 'canvas', 'notes', 'todo'].includes(savedTab)) {
        return savedTab;
      }
    }
    return 'daily';
  });

  const setActiveTab = (tab: string) => {
    setActiveTabState(tab);
    if (typeof window !== 'undefined') {
      localStorage.setItem('duo_active_tab', tab);
    }
  };

  const [pendingPairToken, setPendingPairToken] = useState<string | null>(null);

  // Detect ?pair=<token> parameter from QR code scan
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const urlParams = new URLSearchParams(window.location.search);
    const tokenFromUrl = urlParams.get('pair');

    if (tokenFromUrl) {
      localStorage.setItem('pending_pair_token', tokenFromUrl);
      setPendingPairToken(tokenFromUrl);
      // Clean query parameter from URL without reloading
      window.history.replaceState({}, document.title, window.location.pathname);
    } else {
      const storedToken = localStorage.getItem('pending_pair_token');
      if (storedToken) {
        setPendingPairToken(storedToken);
      }
    }
  }, []);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-theme-page text-theme-primary">
        <div className="text-center">
          <span className="font-serif text-3xl font-bold text-theme-primary">Duo</span>
          <p className="mt-2 text-xs font-mono text-theme-muted">Opening our room...</p>
        </div>
      </div>
    );
  }

  // Not signed in -> Show Landing Page + Auth
  if (!supabaseUser && !profile) {
    return <AuthView />;
  }

  // Signed in, but not in an active paired room
  if (!hasActiveDuo) {
    return (
      <div className="min-h-screen bg-theme-page text-theme-primary flex flex-col lg:flex-row">
        <Navbar activeTab={activeTab} setActiveTab={setActiveTab} />
        <main className="flex-1 min-h-0 pb-20 lg:pb-0 flex flex-col justify-center overflow-y-auto">
          <ConnectionHub />
        </main>

        {/* Second Device QR Pairing Claim Prompt */}
        {pendingPairToken && (
          <JoinDuoPrompt
            token={pendingPairToken}
            onJoined={async () => {
              setPendingPairToken(null);
              localStorage.removeItem('pending_pair_token');
              await refreshProfile();
            }}
            onDismiss={() => {
              setPendingPairToken(null);
              localStorage.removeItem('pending_pair_token');
            }}
          />
        )}
      </div>
    );
  }

  // Signed in and in an active paired room
  return (
    <div className="h-screen bg-theme-page text-theme-primary flex flex-col lg:flex-row overflow-hidden">
      {/* Navigation: Desktop Sidebar (left) / Mobile & Tablet Header + Pill Bar */}
      <Navbar activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* Main Workspace */}
      <main className="flex-1 min-h-0 flex flex-col overflow-y-auto pb-20 sm:pb-6 lg:pb-0">
        {activeTab === 'daily' && <DailyView />}
        {activeTab === 'chat' && <ChatView />}
        {activeTab === 'canvas' && <DrawingCanvas />}
        {activeTab === 'notes' && <LittleNotesView />}
        {activeTab === 'todo' && <TodoKanbanView />}
      </main>
    </div>
  );
}

