'use client';

import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Navbar } from '@/components/Navbar';
import { AuthView } from '@/components/AuthView';
import { ConnectionHub } from '@/components/ConnectionHub';
import { ChatView } from '@/components/ChatView';
import { DrawingCanvas } from '@/components/DrawingCanvas';
import { DailyView } from '@/components/DailyView';
import { DailyHistory } from '@/components/DailyHistory';

export default function Home() {
  const { profile, hasActiveDuo, isLoading, supabaseUser } = useAuth();
  // Set default starting page to 'daily' (Daily Questions & Reflections)
  const [activeTab, setActiveTab] = useState<string>('daily');

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#FBFAF7] text-[#292522]">
        <div className="text-center">
          <span className="font-serif text-3xl font-normal text-[#292522]">Duo</span>
          <p className="mt-2 text-xs font-mono text-[#A89F91]">Opening room...</p>
        </div>
      </div>
    );
  }

  // Not signed in -> Show Editorial Landing Page + Auth
  if (!supabaseUser && !profile) {
    return <AuthView />;
  }

  // Signed in, but not in an active paired room
  if (!hasActiveDuo) {
    return (
      <div className="min-h-screen bg-[#FBFAF7] text-[#1C1917] flex flex-col lg:flex-row">
        <Navbar activeTab={activeTab} setActiveTab={setActiveTab} />
        <main className="flex-1 min-h-0 pb-20 lg:pb-0 flex flex-col justify-center overflow-y-auto">
          <ConnectionHub />
        </main>
      </div>
    );
  }

  // Signed in and in an active paired room
  return (
    <div className="h-screen bg-[#FBFAF7] text-[#1C1917] flex flex-col lg:flex-row overflow-hidden">
      {/* Navigation: Desktop Sidebar (left) / Mobile & Tablet Header + Pill Bar */}
      <Navbar activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* Main Workspace */}
      <main className="flex-1 min-h-0 flex flex-col overflow-y-auto pb-20 sm:pb-6 lg:pb-0">
        {activeTab === 'daily' && <DailyView />}
        {activeTab === 'chat' && <ChatView />}
        {activeTab === 'canvas' && <DrawingCanvas />}
        {activeTab === 'history' && <DailyHistory />}
        {activeTab === 'duo' && <ConnectionHub />}
      </main>
    </div>
  );
}
