'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function JoinPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/');
  }, [router]);

  return (
    <div className="flex h-screen items-center justify-center bg-theme-page text-theme-primary">
      <p className="text-xs font-mono text-theme-muted">Redirecting to Duo...</p>
    </div>
  );
}
