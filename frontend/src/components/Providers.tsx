'use client';

import { SessionProvider } from 'next-auth/react';
import { ToastProvider } from './Toast';
import { ReactNode } from 'react';

interface ProvidersProps {
  children: ReactNode;
}

export default function Providers({ children }: ProvidersProps) {
  return (
    <SessionProvider>
      <ToastProvider>{children}</ToastProvider>
    </SessionProvider>
  );
}
