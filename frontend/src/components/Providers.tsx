'use client';

import { SessionProvider, useSession } from 'next-auth/react';
import { ToastProvider } from './Toast';
import { ReactNode, useEffect, useRef } from 'react';
import { trackLogin } from '@/lib/analytics';

interface ProvidersProps {
  children: ReactNode;
}

function AuthTracker({ children }: { children: ReactNode }) {
  const { data: session, status } = useSession();
  const hasTrackedLogin = useRef(false);

  useEffect(() => {
    // Track login when user becomes authenticated
    if (status === 'authenticated' && session?.user && !hasTrackedLogin.current) {
      trackLogin('google');
      hasTrackedLogin.current = true;
    }
    // Reset tracker when user logs out
    if (status === 'unauthenticated') {
      hasTrackedLogin.current = false;
    }
  }, [status, session]);

  return <>{children}</>;
}

export default function Providers({ children }: ProvidersProps) {
  return (
    <SessionProvider>
      <ToastProvider>
        <AuthTracker>{children}</AuthTracker>
      </ToastProvider>
    </SessionProvider>
  );
}
