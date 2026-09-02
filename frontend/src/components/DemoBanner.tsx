'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { demoStore } from '@/lib/demoStore';
import { useToast } from '@/context/ToastContext';
import {
  Sparkles,
  ExternalLink,
  RotateCcw,
  LogOut,
  UserCheck,
} from 'lucide-react';

interface DemoBannerProps {
  currentRole: 'user_a' | 'user_b';
}

export const DemoBanner: React.FC<DemoBannerProps> = ({ currentRole }) => {
  const router = useRouter();
  const { toast, confirm } = useToast();
  const isAlex = currentRole === 'user_a';
  const userName = isAlex ? 'Alex' : 'Sam';
  const partnerName = isAlex ? 'Sam' : 'Alex';
  const partnerUrl = isAlex ? '/demo/partner' : '/demo';

  const handleOpenPartnerView = () => {
    window.open(partnerUrl, '_blank');
    toast.love(`Opened ${partnerName}'s view in a new tab. Arrange tabs side-by-side to see realtime sync!`, 'Partner View');
  };

  const handleResetDemo = async () => {
    const ok = await confirm({
      title: 'Reset Demo Data?',
      message: 'This will reset all messages, daily answers, and tasks back to the default realistic demo state.',
      confirmText: 'Reset Demo',
      cancelText: 'Keep Changes',
      type: 'warning',
    });

    if (ok) {
      demoStore.reset();
      toast.love('Demo data reset to original state.', 'Demo Reset');
      window.location.reload();
    }
  };

  const handleExitDemo = () => {
    sessionStorage.removeItem('duo_is_demo');
    router.push('/');
  };

  return (
    <div className="border-b border-theme bg-theme-input/80 px-4 py-2 text-xs backdrop-blur-md sticky top-0 z-40 flex flex-wrap items-center justify-between gap-2 select-none">
      <div className="flex items-center space-x-2">
        <span className="inline-flex items-center space-x-1.5 rounded-full bg-[#125CB9]/15 px-2.5 py-0.5 font-mono text-[11px] font-semibold text-[#125CB9] border border-[#125CB9]/25">
          <Sparkles className="h-3 w-3" />
          <span>Demo Mode</span>
        </span>
        <span className="text-theme-secondary font-medium">
          Viewing as <strong className="text-theme-primary font-semibold">{userName}</strong>
        </span>
        <span className="text-theme-muted hidden sm:inline">&bull;</span>
        <span className="text-theme-muted hidden sm:inline text-[11px]">
          Paired with <strong className="text-theme-secondary">{partnerName}</strong>
        </span>
      </div>

      <div className="flex items-center space-x-2">
        <button
          onClick={handleOpenPartnerView}
          type="button"
          className="inline-flex items-center space-x-1.5 rounded-full bg-[#125CB9] px-3 py-1 text-[11px] font-semibold text-white hover:bg-[#0E4B99] transition-all shadow-xs active:scale-95"
          title={`Open ${partnerName}'s perspective in a new tab to test live sync`}
        >
          <ExternalLink className="h-3 w-3" />
          <span>Open Partner View ({partnerName})</span>
        </button>

        <button
          onClick={handleResetDemo}
          type="button"
          className="inline-flex items-center space-x-1 rounded-full border border-theme bg-theme-card px-2.5 py-1 text-[11px] font-medium text-theme-secondary hover:text-theme-primary transition-colors"
          title="Reset demo data to initial state"
        >
          <RotateCcw className="h-3 w-3" />
          <span className="hidden md:inline">Reset</span>
        </button>

        <button
          onClick={handleExitDemo}
          type="button"
          className="inline-flex items-center space-x-1 rounded-full border border-theme bg-theme-card px-2.5 py-1 text-[11px] font-medium text-[#F43F5E] hover:bg-[#F43F5E]/10 transition-colors"
          title="Exit demo and return to normal landing page"
        >
          <LogOut className="h-3 w-3" />
          <span>Exit Demo</span>
        </button>
      </div>
    </div>
  );
};
