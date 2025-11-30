'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Topic, voteTopic } from '@/lib/api';
import { useToastActions } from './Toast';

interface TopicCardProps {
  topic: Topic;
  showStatus?: boolean;
  showSource?: boolean;
  onVote?: () => void;
}

function getDomainColor(domain: string): string {
  // Color by domain (top-level category)
  const domainLower = domain.toLowerCase();
  if (domainLower.includes('science') || domainLower.includes('technology')) {
    return 'bg-blue-100 text-blue-700';
  }
  if (domainLower.includes('society') || domainLower.includes('culture')) {
    return 'bg-green-100 text-green-700';
  }
  if (domainLower.includes('politics') || domainLower.includes('governance')) {
    return 'bg-red-100 text-red-700';
  }
  if (domainLower.includes('economics') || domainLower.includes('business')) {
    return 'bg-yellow-100 text-yellow-700';
  }
  if (domainLower.includes('philosophy') || domainLower.includes('ethics')) {
    return 'bg-purple-100 text-purple-700';
  }
  if (domainLower.includes('arts') || domainLower.includes('humanities')) {
    return 'bg-indigo-100 text-indigo-700';
  }
  return 'bg-gray-100 text-gray-700';
}

function getStatusBadge(status: string): { text: string; color: string } | null {
  switch (status) {
    case 'pending':
      return { text: 'Pending', color: 'bg-yellow-100 text-yellow-700' };
    case 'approved':
      return { text: 'Approved', color: 'bg-blue-100 text-blue-700' };
    case 'selected':
      return { text: 'Selected for Today', color: 'bg-green-100 text-green-700' };
    case 'debated':
      return { text: 'Debated', color: 'bg-purple-100 text-purple-700' };
    case 'rejected':
      return { text: 'Rejected', color: 'bg-red-100 text-red-700' };
    default:
      return null;
  }
}

export default function TopicCard({ topic, showStatus = false, showSource = false, onVote }: TopicCardProps) {
  const [voteCount, setVoteCount] = useState(topic.vote_count);
  const [isVoting, setIsVoting] = useState(false);
  const [hasVoted, setHasVoted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const toast = useToastActions();

  const handleVote = async () => {
    if (isVoting || hasVoted) return;

    setIsVoting(true);
    setError(null);

    try {
      await voteTopic(topic.id);
      setVoteCount((prev) => prev + 1);
      setHasVoted(true);
      toast.success('Vote submitted!');
      onVote?.();
    } catch (err) {
      if (err instanceof Error && err.message.includes('already voted')) {
        setHasVoted(true);
        setError('You already voted for this topic');
        toast.info('You already voted for this topic');
      } else {
        setError('Failed to vote');
        toast.error('Failed to submit vote. Please try again.');
      }
    } finally {
      setIsVoting(false);
    }
  };

  const statusBadge = showStatus ? getStatusBadge(topic.status) : null;
  // Can vote on pending or approved topics (approved = user-submitted, moderated)
  const canVote = (topic.status === 'pending' || topic.status === 'approved') && !hasVoted;

  return (
    <div className="card hover:shadow-md transition-shadow">
      <div className="card-body">
        <div className="flex gap-4">
          {/* Vote Button */}
          <div className="flex flex-col items-center">
            <button
              onClick={handleVote}
              disabled={!canVote || isVoting}
              className={`w-12 h-12 rounded-lg flex flex-col items-center justify-center transition-all ${
                hasVoted
                  ? 'bg-primary-100 text-primary-600 cursor-default'
                  : canVote
                  ? 'bg-gray-100 hover:bg-primary-100 hover:text-primary-600 text-gray-500'
                  : 'bg-gray-50 text-gray-300 cursor-not-allowed'
              }`}
              title={hasVoted ? 'Already voted' : canVote ? 'Vote for this topic' : 'Voting closed'}
            >
              <svg
                className={`w-5 h-5 ${isVoting ? 'animate-bounce' : ''}`}
                fill={hasVoted ? 'currentColor' : 'none'}
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 15l7-7 7 7"
                />
              </svg>
              <span className="text-sm font-semibold font-mono">{voteCount}</span>
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span
                className={`text-xs font-medium px-2 py-0.5 rounded ${getDomainColor(
                  topic.domain || ''
                )}`}
                title={topic.domain || topic.category}
              >
                {topic.subdomain || topic.category}
              </span>
              {statusBadge && (
                <span
                  className={`text-xs font-medium px-2 py-0.5 rounded ${statusBadge.color}`}
                >
                  {statusBadge.text}
                </span>
              )}
              {showSource && (
                <span className={`text-xs font-medium px-2 py-0.5 rounded ${
                  topic.source === 'user'
                    ? 'bg-primary-50 text-primary-600'
                    : 'bg-gray-100 text-gray-500'
                }`}>
                  {topic.source === 'user' ? 'Community' : 'Seeded'}
                </span>
              )}
            </div>

            <h3 className="text-gray-900 font-medium leading-snug">{topic.title}</h3>

            {error && (
              <p className="text-xs text-red-500 mt-1">{error}</p>
            )}

            <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
              <span>
                {new Date(topic.created_at).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                })}
              </span>
              {voteCount >= 5 && topic.status === 'pending' && (
                <span className="text-green-600 font-medium">
                  Eligible for debate
                </span>
              )}
              {topic.debate_id && (
                <Link
                  href={`/debates/${topic.debate_id}`}
                  className="text-primary-600 hover:text-primary-700 font-medium flex items-center gap-1"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                  View Debate
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
