'use client';

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';

type ToastType = 'success' | 'error' | 'info' | 'warning';

interface Toast {
  id: string;
  type: ToastType;
  message: string;
  duration?: number;
}

interface ToastContextValue {
  toasts: Toast[];
  addToast: (type: ToastType, message: string, duration?: number) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}

interface ToastProviderProps {
  children: ReactNode;
}

export function ToastProvider({ children }: ToastProviderProps) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((type: ToastType, message: string, duration = 5000) => {
    const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const toast: Toast = { id, type, message, duration };

    setToasts((prev) => [...prev, toast]);

    if (duration > 0) {
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, duration);
    }
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
      {children}
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </ToastContext.Provider>
  );
}

interface ToastContainerProps {
  toasts: Toast[];
  removeToast: (id: string) => void;
}

function ToastContainer({ toasts, removeToast }: ToastContainerProps) {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3 max-w-md">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onDismiss={() => removeToast(toast.id)} />
      ))}
    </div>
  );
}

interface ToastItemProps {
  toast: Toast;
  onDismiss: () => void;
}

function ToastItem({ toast, onDismiss }: ToastItemProps) {
  const icons: Record<ToastType, ReactNode> = {
    success: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
      </svg>
    ),
    error: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
      </svg>
    ),
    warning: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
    ),
    info: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  };

  // Dark theme with colored accents and glows
  const styles: Record<ToastType, { container: string; icon: string; glow: string }> = {
    success: {
      container: 'bg-gray-900/95 border-emerald-500/30 text-gray-100',
      icon: 'text-emerald-400 bg-emerald-500/20',
      glow: 'shadow-[0_0_20px_rgba(16,185,129,0.25)]',
    },
    error: {
      container: 'bg-gray-900/95 border-red-500/30 text-gray-100',
      icon: 'text-red-400 bg-red-500/20',
      glow: 'shadow-[0_0_20px_rgba(239,68,68,0.25)]',
    },
    warning: {
      container: 'bg-gray-900/95 border-amber-500/30 text-gray-100',
      icon: 'text-amber-400 bg-amber-500/20',
      glow: 'shadow-[0_0_20px_rgba(245,158,11,0.25)]',
    },
    info: {
      container: 'bg-gray-900/95 border-primary-500/30 text-gray-100',
      icon: 'text-primary-400 bg-primary-500/20',
      glow: 'shadow-[0_0_20px_rgba(79,70,229,0.25)]',
    },
  };

  const style = styles[toast.type];

  return (
    <div
      className={`
        flex items-center gap-3 px-4 py-3 rounded-xl border backdrop-blur-sm
        animate-in slide-in-from-right-5 duration-300
        ${style.container} ${style.glow}
      `}
      role="alert"
    >
      <span className={`flex-shrink-0 p-1.5 rounded-lg ${style.icon}`}>
        {icons[toast.type]}
      </span>
      <p className="flex-1 text-sm font-medium font-mono tracking-tight">{toast.message}</p>
      <button
        onClick={onDismiss}
        className="flex-shrink-0 p-1 text-gray-500 hover:text-gray-300 transition-colors rounded hover:bg-white/10"
        aria-label="Dismiss"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}

// Convenience hooks for specific toast types
export function useToastActions() {
  const { addToast } = useToast();

  return {
    success: (message: string, duration?: number) => addToast('success', message, duration),
    error: (message: string, duration?: number) => addToast('error', message, duration),
    warning: (message: string, duration?: number) => addToast('warning', message, duration),
    info: (message: string, duration?: number) => addToast('info', message, duration),
  };
}
