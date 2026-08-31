'use client';

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { Heart, Sparkles, AlertCircle, Check, X, Palette, Lock, Trash2 } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info' | 'love' | 'drawing';

export interface ToastOptions {
  id?: string;
  type?: ToastType;
  title?: string;
  message: string;
  duration?: number;
}

interface ConfirmOptions {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'danger' | 'warning' | 'love';
}

interface ToastContextType {
  toast: {
    show: (options: ToastOptions | string) => void;
    success: (message: string, title?: string) => void;
    error: (message: string, title?: string) => void;
    info: (message: string, title?: string) => void;
    love: (message: string, title?: string) => void;
    drawing: (message: string, title?: string) => void;
  };
  confirm: (options: ConfirmOptions) => Promise<boolean>;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastOptions[]>([]);
  const [confirmDialog, setConfirmDialog] = useState<{
    options: ConfirmOptions;
    resolve: (val: boolean) => void;
  } | null>(null);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback((options: ToastOptions | string) => {
    const opts: ToastOptions = typeof options === 'string' ? { message: options } : options;
    const id = opts.id || `toast-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
    const newToast: ToastOptions = {
      ...opts,
      id,
      type: opts.type || 'love',
      duration: opts.duration || 3000,
    };

    setToasts((prev) => [...prev, newToast]);

    setTimeout(() => {
      removeToast(id);
    }, newToast.duration);
  }, [removeToast]);

  const success = useCallback((message: string, title?: string) => {
    showToast({ type: 'success', message, title });
  }, [showToast]);

  const error = useCallback((message: string, title?: string) => {
    showToast({ type: 'error', message, title });
  }, [showToast]);

  const info = useCallback((message: string, title?: string) => {
    showToast({ type: 'info', message, title });
  }, [showToast]);

  const love = useCallback((message: string, title?: string) => {
    showToast({ type: 'love', message, title });
  }, [showToast]);

  const drawing = useCallback((message: string, title?: string) => {
    showToast({ type: 'drawing', message, title });
  }, [showToast]);

  const confirm = useCallback((options: ConfirmOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      setConfirmDialog({ options, resolve });
    });
  }, []);

  const handleConfirmClose = (result: boolean) => {
    if (confirmDialog) {
      confirmDialog.resolve(result);
      setConfirmDialog(null);
    }
  };

  const getToastIcon = (type?: ToastType) => {
    switch (type) {
      case 'success':
        return <Check className="h-3.5 w-3.5 text-[#037F71]" />;
      case 'error':
        return <AlertCircle className="h-3.5 w-3.5 text-[#EA5E86]" />;
      case 'info':
        return <Sparkles className="h-3.5 w-3.5 text-[#F49625]" />;
      case 'drawing':
        return <Palette className="h-3.5 w-3.5 text-[#57B1A8]" />;
      case 'love':
      default:
        return <Heart className="h-3.5 w-3.5 text-[#EA5E86] fill-current" />;
    }
  };

  const getToastStyles = (type?: ToastType) => {
    switch (type) {
      case 'success':
        return 'border-[#DDF2B8] bg-[#F5FBEF] text-[#037F71] shadow-[0_8px_24px_rgba(3,127,113,0.12)]';
      case 'error':
        return 'border-[#FCC4C0] bg-[#FFF5F5] text-[#EA5E86] shadow-[0_8px_24px_rgba(234,94,134,0.12)]';
      case 'info':
        return 'border-[#FFD094] bg-[#FFF9EE] text-[#422F0E] shadow-[0_8px_24px_rgba(244,150,37,0.12)]';
      case 'drawing':
        return 'border-[#AECFD0] bg-[#F2F9F9] text-[#037F71] shadow-[0_8px_24px_rgba(87,177,168,0.12)]';
      case 'love':
      default:
        return 'border-[#FCC4C0] bg-[#FFF8FA] text-[#422F0E] shadow-[0_8px_24px_rgba(234,94,134,0.12)]';
    }
  };

  return (
    <ToastContext.Provider
      value={{
        toast: {
          show: showToast,
          success,
          error,
          info,
          love,
          drawing,
        },
        confirm,
      }}
    >
      {children}

      {/* Floating Cute Toasts Container */}
      <div className="fixed top-5 left-1/2 -translate-x-1/2 z-[9999] flex flex-col items-center gap-2 pointer-events-none w-full max-w-md px-4">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto flex items-center space-x-2.5 rounded-full border px-4 py-2.5 transition-all duration-300 animate-in fade-in zoom-in-95 slide-in-from-top-4 ${getToastStyles(
              t.type
            )}`}
          >
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-white shadow-sm shrink-0">
              {getToastIcon(t.type)}
            </div>

            <div className="flex flex-col pr-1">
              {t.title && (
                <span className="text-[11px] font-mono font-semibold uppercase tracking-wider leading-none mb-0.5">
                  {t.title}
                </span>
              )}
              <span className="text-xs sm:text-sm font-medium leading-snug">
                {t.message}
              </span>
            </div>

            <button
              onClick={() => t.id && removeToast(t.id)}
              className="rounded-full p-1 text-[#A89F91] hover:text-[#422F0E] hover:bg-black/5 transition-colors"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>

      {/* Cute Confirmation Modal Dialog */}
      {confirmDialog && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/35 p-4 backdrop-blur-[3px] animate-in fade-in duration-150">
          <div className="w-full max-w-sm rounded-3xl border border-[#EFE8DC] bg-[#FFFFFF] p-6 shadow-[0_16px_48px_rgba(66,47,14,0.14)] text-center animate-in zoom-in-95 duration-200">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#FCC4C0]/40 text-[#EA5E86] mb-3">
              {confirmDialog.options.type === 'danger' ? (
                <Trash2 className="h-6 w-6" />
              ) : (
                <Heart className="h-6 w-6 fill-current" />
              )}
            </div>

            <h3 className="font-serif text-xl font-normal text-[#422F0E]">
              {confirmDialog.options.title}
            </h3>
            <p className="mt-1.5 text-xs sm:text-sm text-[#6B5E4E] leading-relaxed">
              {confirmDialog.options.message}
            </p>

            <div className="mt-6 flex items-center justify-center gap-2.5">
              <button
                type="button"
                onClick={() => handleConfirmClose(false)}
                className="flex-1 rounded-full border border-[#EFE8DC] bg-[#FAF7F2] py-2.5 text-xs sm:text-sm font-medium text-[#6B5E4E] hover:bg-[#F2ECE1] transition-all min-h-[40px]"
              >
                {confirmDialog.options.cancelText || 'Cancel'}
              </button>

              <button
                type="button"
                onClick={() => handleConfirmClose(true)}
                className={`flex-1 rounded-full py-2.5 text-xs sm:text-sm font-medium text-white shadow-sm transition-all min-h-[40px] ${
                  confirmDialog.options.type === 'danger'
                    ? 'bg-[#EA5E86] hover:bg-[#D94E76]'
                    : 'bg-[#422F0E] hover:bg-[#EA5E86]'
                }`}
              >
                {confirmDialog.options.confirmText || 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};
