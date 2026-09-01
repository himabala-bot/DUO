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
        return 'border-[#00D26A]/30 bg-theme-card text-theme-primary shadow-lg ring-1 ring-[#00D26A]/20';
      case 'error':
        return 'border-[#F43F5E]/30 bg-theme-card text-theme-primary shadow-lg ring-1 ring-[#F43F5E]/20';
      case 'info':
        return 'border-[#FB923C]/30 bg-theme-card text-theme-primary shadow-lg ring-1 ring-[#FB923C]/20';
      case 'drawing':
        return 'border-[#00D0FF]/30 bg-theme-card text-theme-primary shadow-lg ring-1 ring-[#00D0FF]/20';
      case 'love':
      default:
        return 'border-[#5B58E6]/30 bg-theme-card text-theme-primary shadow-lg ring-1 ring-[#5B58E6]/20';
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

      {/* Floating Sleek Toasts Container */}
      <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[9999] flex flex-col items-center gap-2 pointer-events-none w-full max-w-sm px-4">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto flex items-center space-x-2.5 rounded-lg border px-3.5 py-2 transition-all duration-200 animate-in fade-in zoom-in-95 slide-in-from-top-2 shadow-sm ${getToastStyles(
              t.type
            )}`}
          >
            <div className="flex h-5 w-5 items-center justify-center rounded bg-theme-input shadow-xs shrink-0">
              {getToastIcon(t.type)}
            </div>

            <div className="flex flex-col pr-1">
              {t.title && (
                <span className="text-[10px] font-mono font-semibold uppercase tracking-wider leading-none mb-0.5 text-theme-muted">
                  {t.title}
                </span>
              )}
              <span className="text-xs font-medium leading-snug text-theme-primary">
                {t.message}
              </span>
            </div>

            <button
              onClick={() => t.id && removeToast(t.id)}
              className="rounded p-0.5 text-theme-muted hover:text-theme-primary transition-colors ml-auto"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>

      {/* Clean Confirmation Modal Dialog */}
      {confirmDialog && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/60 p-4 backdrop-blur-[4px] animate-in fade-in duration-150">
          <div className="w-full max-w-sm rounded-xl border border-theme bg-theme-card p-5 shadow-2xl text-center animate-in zoom-in-95 duration-150">
            <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-lg bg-[#5B58E6]/10 text-[#5B58E6] mb-2.5">
              {confirmDialog.options.type === 'danger' ? (
                <Trash2 className="h-5 w-5 text-[#F43F5E]" />
              ) : (
                <Heart className="h-5 w-5 fill-current text-[#5B58E6]" />
              )}
            </div>

            <h3 className="font-serif text-base font-bold text-theme-primary">
              {confirmDialog.options.title}
            </h3>
            <p className="mt-1 text-xs text-theme-secondary leading-relaxed">
              {confirmDialog.options.message}
            </p>

            <div className="mt-4 flex items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => handleConfirmClose(false)}
                className="flex-1 rounded-lg border border-theme bg-theme-input py-1.5 text-xs font-medium text-theme-secondary hover:bg-theme-card hover:text-theme-primary transition-colors"
              >
                {confirmDialog.options.cancelText || 'Cancel'}
              </button>

              <button
                type="button"
                onClick={() => handleConfirmClose(true)}
                className={`flex-1 rounded-lg py-1.5 text-xs font-medium text-white shadow-xs transition-colors ${
                  confirmDialog.options.type === 'danger'
                    ? 'bg-[#F43F5E] hover:bg-[#E11D48]'
                    : 'bg-[#5B58E6] hover:bg-[#4A46DC]'
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
