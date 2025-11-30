'use client';

import { ReactNode } from 'react';

interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  retryLabel?: string;
}

// Generic API Error State
export function ApiError({
  title = 'Something went wrong',
  message = 'We couldn\'t load the data. Please try again.',
  onRetry,
  retryLabel = 'Try Again',
}: ErrorStateProps) {
  return (
    <div className="card">
      <div className="card-body text-center py-12">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-100 flex items-center justify-center">
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
        <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
        <p className="text-gray-500 mb-4 max-w-md mx-auto">{message}</p>
        {onRetry && (
          <button onClick={onRetry} className="btn-primary">
            <svg
              className="w-4 h-4 mr-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            {retryLabel}
          </button>
        )}
      </div>
    </div>
  );
}

// Network Error State
export function NetworkError({ onRetry }: { onRetry?: () => void }) {
  return (
    <ApiError
      title="Connection Error"
      message="Unable to connect to the server. Please check your internet connection and try again."
      onRetry={onRetry}
    />
  );
}

// Empty State Base Component
interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  message?: string;
  action?: ReactNode;
}

export function EmptyState({ icon, title, message, action }: EmptyStateProps) {
  return (
    <div className="text-center py-12">
      {icon && (
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center text-gray-400">
          {icon}
        </div>
      )}
      <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
      {message && <p className="text-gray-500 mb-4 max-w-md mx-auto">{message}</p>}
      {action}
    </div>
  );
}

// No Debates Empty State
export function NoDebates({ showAction = false }: { showAction?: boolean }) {
  return (
    <EmptyState
      icon={
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
          />
        </svg>
      }
      title="No debates yet"
      message="Check back soon! Debates are run 5 times daily at scheduled intervals."
      action={
        showAction && (
          <a href="/topics" className="btn-secondary">
            Submit a Topic
          </a>
        )
      }
    />
  );
}

// No Topics Empty State
export function NoTopics({ onSubmit }: { onSubmit?: () => void }) {
  return (
    <EmptyState
      icon={
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z"
          />
        </svg>
      }
      title="No topics yet"
      message="Be the first to submit a debate topic for AI models to argue!"
      action={
        onSubmit && (
          <button onClick={onSubmit} className="btn-primary">
            Submit a Topic
          </button>
        )
      }
    />
  );
}

// No Results Empty State (for filtered searches)
export function NoResults({ onClear }: { onClear?: () => void }) {
  return (
    <EmptyState
      icon={
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
      }
      title="No results found"
      message="Try adjusting your filters or search terms."
      action={
        onClear && (
          <button onClick={onClear} className="btn-secondary">
            Clear Filters
          </button>
        )
      }
    />
  );
}

// No Rankings Empty State
export function NoRankings() {
  return (
    <EmptyState
      icon={
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
          />
        </svg>
      }
      title="No ranking data yet"
      message="Rankings will appear after debates are completed and scored."
    />
  );
}

// Inline Error Message
export function InlineError({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">
      <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
        <path
          fillRule="evenodd"
          d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
          clipRule="evenodd"
        />
      </svg>
      <span className="flex-1">{message}</span>
      {onRetry && (
        <button
          onClick={onRetry}
          className="text-red-700 hover:text-red-800 font-medium underline"
        >
          Retry
        </button>
      )}
    </div>
  );
}

// Full Page Error
export function PageError({
  title = 'Page Error',
  message = 'Something went wrong loading this page.',
  onRetry,
}: ErrorStateProps) {
  return (
    <div className="container-wide py-16">
      <div className="max-w-md mx-auto text-center">
        <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-red-100 flex items-center justify-center">
          <svg
            className="w-10 h-10 text-red-500"
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
        <p className="text-gray-500 mb-6">{message}</p>
        <div className="flex items-center justify-center gap-4">
          {onRetry && (
            <button onClick={onRetry} className="btn-primary">
              Try Again
            </button>
          )}
          <a href="/" className="btn-secondary">
            Go Home
          </a>
        </div>
      </div>
    </div>
  );
}

// 404 Not Found
export function NotFound({ resource = 'page' }: { resource?: string }) {
  return (
    <div className="container-wide py-16">
      <div className="max-w-md mx-auto text-center">
        <div className="text-8xl font-bold text-gray-200 mb-4">404</div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          {resource.charAt(0).toUpperCase() + resource.slice(1)} Not Found
        </h1>
        <p className="text-gray-500 mb-6">
          The {resource} you're looking for doesn't exist or has been removed.
        </p>
        <a href="/" className="btn-primary">
          Go Home
        </a>
      </div>
    </div>
  );
}
