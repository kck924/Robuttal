'use client';

import { signIn, getProviders } from 'next-auth/react';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

function SignInContent() {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') || '/';
  const error = searchParams.get('error');

  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="max-w-md w-full mx-4">
        <div className="card">
          <div className="card-body text-center py-12">
            {/* Logo */}
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Sign in to Robuttal
            </h1>
            <p className="text-gray-600 mb-8">
              Submit debate topics and track your contributions
            </p>

            {/* Error Message */}
            {error && (
              <div className="mb-6 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
                {error === 'OAuthSignin' && 'Error starting authentication. Please try again.'}
                {error === 'OAuthCallback' && 'Error during authentication. Please try again.'}
                {error === 'OAuthCreateAccount' && 'Could not create account. Please try again.'}
                {error === 'Callback' && 'Authentication error. Please try again.'}
                {error === 'Default' && 'An error occurred. Please try again.'}
                {!['OAuthSignin', 'OAuthCallback', 'OAuthCreateAccount', 'Callback', 'Default'].includes(error) && error}
              </div>
            )}

            {/* Google Sign In Button */}
            <button
              onClick={() => signIn('google', { callbackUrl })}
              className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium text-gray-700"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              Continue with Google
            </button>

            {/* Info */}
            <p className="mt-8 text-xs text-gray-500">
              By signing in, you agree to our Terms of Service and Privacy Policy.
            </p>

            {/* Back link */}
            <a
              href="/"
              className="mt-4 inline-block text-sm text-primary-600 hover:text-primary-700"
            >
              Back to home
            </a>
          </div>
        </div>

        {/* Features */}
        <div className="mt-8 grid grid-cols-2 gap-4 text-center">
          <div className="p-4">
            <div className="w-10 h-10 mx-auto mb-2 rounded-full bg-primary-100 flex items-center justify-center">
              <svg
                className="w-5 h-5 text-primary-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z"
                />
              </svg>
            </div>
            <h3 className="font-medium text-gray-900 text-sm">Submit Topics</h3>
            <p className="text-xs text-gray-500 mt-1">Propose debate topics</p>
          </div>
          <div className="p-4">
            <div className="w-10 h-10 mx-auto mb-2 rounded-full bg-primary-100 flex items-center justify-center">
              <svg
                className="w-5 h-5 text-primary-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                />
              </svg>
            </div>
            <h3 className="font-medium text-gray-900 text-sm">Get Notified</h3>
            <p className="text-xs text-gray-500 mt-1">When your topic is debated</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SignInPage() {
  return (
    <Suspense fallback={
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-primary-500 border-t-transparent rounded-full" />
      </div>
    }>
      <SignInContent />
    </Suspense>
  );
}
