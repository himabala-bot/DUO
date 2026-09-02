'use client';

import React, { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { JoinDuoPrompt } from '@/components/JoinDuoPrompt';
import { AuthView } from '@/components/AuthView';
import { RefreshCw } from 'lucide-react';

function JoinContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token') || searchParams.get('pair') || '';
  const { profile, supabaseUser, isLoading, refreshProfile } = useAuth();

  useEffect(() => {
    if (token && typeof window !== 'undefined') {
      localStorage.setItem('pending_pair_token', token);
    }
  }, [token]);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-theme-page text-theme-primary">
        <div className="text-center space-y-2">
          <RefreshCw className="h-6 w-6 text-[#125CB9] animate-spin mx-auto" />
          <p className="text-xs font-mono text-theme-muted">Opening Duo invite...</p>
        </div>
      </div>
    );
  }

  // Not signed in -> show AuthView with the invite banner
  if (!supabaseUser && !profile) {
    return <AuthView />;
  }

  // Signed in -> Show Join confirmation dialog
  return (
    <div className="min-h-screen bg-theme-page text-theme-primary flex items-center justify-center p-4">
      <JoinDuoPrompt
        token={token}
        onJoined={async () => {
          if (typeof window !== 'undefined') {
            localStorage.removeItem('pending_pair_token');
          }
          await refreshProfile();
          router.push('/');
        }}
        onDismiss={() => {
          if (typeof window !== 'undefined') {
            localStorage.removeItem('pending_pair_token');
          }
          router.push('/');
        }}
      />
    </div>
  );
}

export default function JoinPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-screen items-center justify-center bg-theme-page text-theme-primary">
          <RefreshCw className="h-6 w-6 text-[#125CB9] animate-spin" />
        </div>
      }
    >
      <JoinContent />
    </Suspense>
  );
}
