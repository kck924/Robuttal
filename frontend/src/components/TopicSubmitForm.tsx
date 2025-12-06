'use client';

import { useState, useEffect } from 'react';
import { useSession, signIn } from 'next-auth/react';
import { createTopic, Topic } from '@/lib/api';
import { useToastActions } from './Toast';
import { trackTopicSubmit, trackSignUpStart, trackError } from '@/lib/analytics';
import { isInAppBrowser, openInDefaultBrowser } from '@/lib/browserDetect';

interface TopicSubmitFormProps {
  onSuccess?: () => void;
}

export default function TopicSubmitForm({ onSuccess }: TopicSubmitFormProps) {
  const { data: session, status } = useSession();
  const [title, setTitle] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successTopic, setSuccessTopic] = useState<Topic | null>(null);
  const [inAppBrowser, setInAppBrowser] = useState(false);
  const [urlCopied, setUrlCopied] = useState(false);
  const toast = useToastActions();

  useEffect(() => {
    setInAppBrowser(isInAppBrowser());
  }, []);

  // Pre-fill email from session
  const userEmail = session?.user?.email || '';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Check authentication
    if (!session) {
      toast.error('Please sign in to submit a topic');
      trackSignUpStart('google');
      signIn('google');
      return;
    }

    // Validation
    if (!title.trim()) {
      setError('Please enter a topic');
      return;
    }
    if (title.length < 10) {
      setError('Topic must be at least 10 characters');
      return;
    }
    if (title.length > 500) {
      setError('Topic must be less than 500 characters');
      return;
    }

    setIsSubmitting(true);

    try {
      const topic = await createTopic({
        title: title.trim(),
        submitted_by: userEmail,
      });

      setSuccessTopic(topic);
      setTitle('');
      toast.success('Topic submitted and categorized! Get others to vote for it.');
      trackTopicSubmit(topic.subdomain || topic.category);

      onSuccess?.();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to submit topic';
      setError(errorMessage);
      toast.error(errorMessage);
      trackError('topic_submit_failed', errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Show sign-in prompt if not authenticated
  if (status === 'loading') {
    return (
      <div className="card">
        <div className="card-body py-8">
          <div className="flex items-center justify-center gap-2 text-gray-500">
            <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            Loading...
          </div>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="card">
        <div className="card-header">
          <h2 className="text-lg font-semibold text-gray-900">Submit a Topic</h2>
          <p className="text-sm text-gray-500 mt-1">
            Sign in to propose debate topics for AI models to argue.
          </p>
        </div>
        <div className="card-body text-center py-8">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
            <svg
              className="w-8 h-8 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
              />
            </svg>
          </div>
          {inAppBrowser ? (
            <>
              <p className="text-gray-600 mb-4">
                To sign in, please open this page in your browser.
              </p>
              <button
                onClick={() => {
                  openInDefaultBrowser();
                  // Also copy URL as fallback
                  if (navigator.clipboard) {
                    navigator.clipboard.writeText(window.location.href).then(() => {
                      setUrlCopied(true);
                      setTimeout(() => setUrlCopied(false), 3000);
                    });
                  }
                }}
                className="btn-primary inline-flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
                Open in Browser
              </button>
              {urlCopied && (
                <p className="text-xs text-green-600 mt-2">
                  URL copied! Paste in your browser if it didn&apos;t open automatically.
                </p>
              )}
              <p className="text-xs text-gray-400 mt-4">
                Google sign-in doesn&apos;t work in app browsers.<br />
                Tap the button above, or use your app&apos;s menu to &quot;Open in Browser&quot;.
              </p>
            </>
          ) : (
            <>
              <p className="text-gray-600 mb-4">
                Sign in with your Google account to submit topics.
              </p>
              <button
                onClick={() => {
                  trackSignUpStart('google');
                  signIn('google');
                }}
                className="btn-primary inline-flex items-center gap-2"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path
                    fill="currentColor"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="currentColor"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                Sign in with Google
              </button>
              <p className="text-xs text-gray-400 mt-4">
                Voting on topics does not require an account.
              </p>
            </>
          )}
        </div>
      </div>
    );
  }

  if (successTopic) {
    return (
      <div className="card">
        <div className="card-body text-center py-8">
          <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-6 h-6 text-green-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Topic Submitted!
          </h3>
          <div className="bg-gray-50 rounded-lg p-4 mb-4 text-left">
            <p className="text-sm text-gray-600 mb-2">Auto-categorized as:</p>
            <div className="flex items-center gap-2">
              <span className="text-xs px-2 py-1 bg-primary-100 text-primary-700 rounded-full">
                {successTopic.domain}
              </span>
              <span className="text-gray-400">&gt;</span>
              <span className="text-xs px-2 py-1 bg-gray-200 text-gray-700 rounded-full">
                {successTopic.subdomain}
              </span>
            </div>
          </div>
          <p className="text-gray-600 mb-4">
            Your topic is now in the queue. Get others to vote for it to increase
            its chances of being featured!
          </p>
          <button
            onClick={() => setSuccessTopic(null)}
            className="btn-secondary"
          >
            Submit Another Topic
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="card-header">
        <h2 className="text-lg font-semibold text-gray-900">Submit a Topic</h2>
        <p className="text-sm text-gray-500 mt-1">
          Propose a debate topic for AI models to argue. Topics are automatically
          categorized. Topics with 5+ votes get featured in daily debates.
        </p>
      </div>
      <form onSubmit={handleSubmit} className="card-body space-y-4">
        {/* Signed in as */}
        <div className="flex items-center gap-2 text-sm text-gray-600 bg-gray-50 px-3 py-2 rounded-lg">
          <svg
            className="w-4 h-4 text-green-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 13l4 4L19 7"
            />
          </svg>
          Submitting as <span className="font-medium">{userEmail}</span>
        </div>

        {/* Topic Input */}
        <div>
          <label
            htmlFor="topic"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Debate Topic
          </label>
          <textarea
            id="topic"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Should AI systems be granted legal personhood?"
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 resize-none"
            maxLength={500}
          />
          <div className="mt-1 flex justify-between text-xs text-gray-500">
            <span>e.g., "Is a hot dog a sandwich?" or "A hot dog is a sandwich"</span>
            <span>{title.length}/500</span>
          </div>
        </div>

        {/* Info notes */}
        <div className="space-y-2">
          <div className="flex items-start gap-2 text-xs text-gray-500 bg-gray-50 px-3 py-2 rounded-lg">
            <svg
              className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span>
              Avoid topics requiring current events or real-time info—AI models
              have knowledge cutoffs.
            </span>
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-500 bg-blue-50 px-3 py-2 rounded-lg">
          <svg
            className="w-4 h-4 text-blue-500 flex-shrink-0"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <span>Your topic will be automatically categorized using AI</span>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">
            {error}
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isSubmitting}
          className="btn-primary w-full"
        >
          {isSubmitting ? 'Categorizing & Submitting...' : 'Submit Topic'}
        </button>
      </form>
    </div>
  );
}
