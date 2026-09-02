'use client';

import React, { useState, useEffect } from 'react';
import { Navbar } from './Navbar';
import { DailyView } from './DailyView';
import { ChatView } from './ChatView';
import { DrawingCanvas } from './DrawingCanvas';
import { LittleNotesView } from './LittleNotesView';
import { TodoKanbanView } from './TodoKanbanView';

interface DemoWorkspaceProps {
  role: 'user_a' | 'user_b';
}

export const DemoWorkspace: React.FC<DemoWorkspaceProps> = ({ role }) => {
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTabState] = useState<string>('daily');
  const [syncKey, setSyncKey] = useState<number>(0);

  const setActiveTab = (tab: string) => {
    setActiveTabState(tab);
  };

  useEffect(() => {
    setMounted(true);
    if (typeof window === 'undefined') return;
    sessionStorage.setItem('duo_is_demo', 'true');

    const handleReset = () => {
      setSyncKey((prev) => prev + 1);
    };

    window.addEventListener('duo_demo_reset', handleReset);

    return () => {
      window.removeEventListener('duo_demo_reset', handleReset);
    };
  }, []);

  if (!mounted) {
    return (
      <div className="flex h-screen items-center justify-center bg-theme-page text-theme-primary">
        <div className="text-center space-y-2">
          <span className="font-serif text-3xl font-bold text-theme-primary">Duo</span>
          <p className="mt-2 text-xs font-mono text-theme-muted">Opening demo room...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-theme-page text-theme-primary flex flex-col selection:bg-[#125CB9] selection:text-white">
      {/* Main Workspace with Real App Navigation & Components */}
      <div className="flex-1 flex flex-col lg:flex-row h-screen overflow-hidden">
        <Navbar activeTab={activeTab} setActiveTab={setActiveTab} />

        <main className="flex-1 min-h-0 flex flex-col overflow-y-auto pb-20 sm:pb-6 lg:pb-0" key={syncKey}>
          {activeTab === 'daily' && <DailyView />}
          {activeTab === 'chat' && <ChatView />}
          {activeTab === 'canvas' && <DrawingCanvas />}
          {activeTab === 'notes' && <LittleNotesView />}
          {activeTab === 'todo' && <TodoKanbanView />}
        </main>
      </div>
    </div>
  );
};
