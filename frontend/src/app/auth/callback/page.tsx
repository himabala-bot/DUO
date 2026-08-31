'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function AuthCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        const params = new URLSearchParams(window.location.search);
        const code = params.get('code');
        if (code) {
          await supabase.auth.exchangeCodeForSession(code);
        }

        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          router.replace('/');
          return;
        }

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, newSession) => {
          if (newSession) {
            router.replace('/');
          }
        });
        return () => subscription.unsubscribe();
      } catch (err) {
        console.error('Error handling auth callback:', err);
        router.replace('/');
      }
    };

    handleAuthCallback();
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#FBFAF7] p-4 text-[#1C1917]">
      <div className="text-center">
        <span className="font-serif text-3xl font-normal text-[#1C1917]">Duo</span>
        <p className="mt-2 text-xs font-mono text-[#8C857B]">Verifying your room key...</p>
      </div>
    </div>
  );
}
