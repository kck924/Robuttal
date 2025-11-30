'use client';

import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Suspense } from 'react';

function ErrorContent() {
  const searchParams = useSearchParams();
  const error = searchParams.get('error');

  const errorMessages: Record<string, { title: string; description: string }> = {
    Configuration: {
      title: 'Server Error',
      description: 'There is a problem with the server configuration. Please try again later.',
    },
    AccessDenied: {
      title: 'Access Denied',
      description: 'You do not have permission to sign in. Please contact support if you believe this is an error.',
    },
    Verification: {
      title: 'Verification Error',
      description: 'The verification link may have expired or already been used.',
    },
    Default: {
      title: 'Authentication Error',
      description: 'An error occurred during authentication. Please try again.',
    },
  };

  const { title, description } = errorMessages[error || 'Default'] || errorMessages.Default;

  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="max-w-md w-full mx-4 text-center">
        <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-red-100 flex items-center justify-center">
          <svg
            className="w-8 h-8 text-red-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        </div>

        <h1 className="text-2xl font-bold text-gray-900 mb-2">{title}</h1>
        <p className="text-gray-600 mb-8">{description}</p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link href="/auth/signin" className="btn-primary">
            Try Again
          </Link>
          <Link href="/" className="btn-secondary">
            Go Home
          </Link>
        </div>

        {error && (
          <p className="mt-8 text-xs text-gray-400">
            Error code: {error}
          </p>
        )}
      </div>
    </div>
  );
}

export default function AuthErrorPage() {
  return (
    <Suspense fallback={
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-primary-500 border-t-transparent rounded-full" />
      </div>
    }>
      <ErrorContent />
    </Suspense>
  );
}
