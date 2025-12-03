'use client';

import { useState } from 'react';
import { ModelSummary, VoteTally, voteOnDebate } from '@/lib/api';
import { trackDebateVote, trackError } from '@/lib/analytics';

interface VoteSectionProps {
  debateId: string;
  debaterPro: ModelSummary;
  debaterCon: ModelSummary;
  winner?: ModelSummary | null;
  initialVotes?: VoteTally | null;
  isCompleted: boolean;
}

export default function VoteSection({
  debateId,
  debaterPro,
  debaterCon,
  winner,
  initialVotes,
  isCompleted,
}: VoteSectionProps) {
  const [votes, setVotes] = useState<VoteTally | null>(initialVotes || null);
  const [hasVoted, setHasVoted] = useState(false);
  const [votedFor, setVotedFor] = useState<string | null>(null);
  const [isVoting, setIsVoting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleVote = async (modelId: string) => {
    if (hasVoted || isVoting) return;

    setIsVoting(true);
    setError(null);

    try {
      // Generate a simple fingerprint (in production, use FingerprintJS)
      const fingerprint = `${navigator.userAgent}-${screen.width}x${screen.height}`;

      const result = await voteOnDebate(debateId, {
        model_id: modelId,
        fingerprint: btoa(fingerprint).slice(0, 64),
        ip_address: '0.0.0.0', // Backend should get real IP
      });

      if (result.voted) {
        setHasVoted(true);
        setVotedFor(modelId);
        const position = modelId === debaterPro.id ? 'pro' : 'con';
        const modelName = modelId === debaterPro.id ? debaterPro.name : debaterCon.name;
        trackDebateVote(debateId, modelName, position);

        // Optimistically update vote counts
        if (votes) {
          const isPro = modelId === debaterPro.id;
          setVotes({
            ...votes,
            total_votes: votes.total_votes + 1,
            pro_votes: isPro ? votes.pro_votes + 1 : votes.pro_votes,
            con_votes: isPro ? votes.con_votes : votes.con_votes + 1,
            pro_model: {
              ...votes.pro_model,
              votes: isPro ? votes.pro_model.votes + 1 : votes.pro_model.votes,
              percentage: isPro
                ? ((votes.pro_votes + 1) / (votes.total_votes + 1)) * 100
                : (votes.pro_votes / (votes.total_votes + 1)) * 100,
            },
            con_model: {
              ...votes.con_model,
              votes: isPro ? votes.con_model.votes : votes.con_model.votes + 1,
              percentage: isPro
                ? (votes.con_votes / (votes.total_votes + 1)) * 100
                : ((votes.con_votes + 1) / (votes.total_votes + 1)) * 100,
            },
          });
        }
      } else {
        setHasVoted(true);
        setError(result.message);
      }
    } catch (err) {
      setError('Failed to submit vote. Please try again.');
      trackError('debate_vote_failed', err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsVoting(false);
    }
  };

  const VOTE_THRESHOLD = 20;
  const totalVotes = votes?.total_votes || 0;
  const hasEnoughVotes = totalVotes >= VOTE_THRESHOLD;
  const showResults = hasEnoughVotes;
  const proVotes = votes?.pro_votes || 0;
  const conVotes = votes?.con_votes || 0;
  const proPercentage = totalVotes > 0 ? (proVotes / totalVotes) * 100 : 50;
  const conPercentage = totalVotes > 0 ? (conVotes / totalVotes) * 100 : 50;

  // Calculate agreement with judge
  const agreementWithJudge = votes?.agreement_with_judge;

  return (
    <div className="card">
      <div className="card-header">
        <h3 className="font-semibold text-gray-900">Community Vote</h3>
        {isCompleted && (
          <p className="text-sm text-gray-500 mt-1">
            Who do you think should have won?
          </p>
        )}
      </div>
      <div className="card-body">
        {/* Vote Buttons */}
        {!hasVoted && isCompleted && (
          <div>
            <div className="grid grid-cols-2 gap-2 sm:gap-4 mb-3">
              <button
                onClick={() => handleVote(debaterPro.id)}
                disabled={isVoting}
                className={`py-2 sm:py-3 px-2 sm:px-4 rounded-lg border-2 transition-all ${
                  isVoting
                    ? 'border-gray-200 bg-gray-50 cursor-wait'
                    : 'border-blue-200 hover:border-blue-400 hover:bg-blue-50'
                }`}
              >
                <div className="text-[10px] sm:text-xs text-gray-500 uppercase tracking-wide mb-0.5 sm:mb-1">
                  Pro
                </div>
                <div className="font-medium text-gray-900 text-[11px] sm:text-base">{debaterPro.name}</div>
              </button>
              <button
                onClick={() => handleVote(debaterCon.id)}
                disabled={isVoting}
                className={`py-2 sm:py-3 px-2 sm:px-4 rounded-lg border-2 transition-all ${
                  isVoting
                    ? 'border-gray-200 bg-gray-50 cursor-wait'
                    : 'border-red-200 hover:border-red-400 hover:bg-red-50'
                }`}
              >
                <div className="text-[10px] sm:text-xs text-gray-500 uppercase tracking-wide mb-0.5 sm:mb-1">
                  Con
                </div>
                <div className="font-medium text-gray-900 text-[11px] sm:text-base">{debaterCon.name}</div>
              </button>
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <p className="text-sm text-red-600 mb-4">{error}</p>
        )}

        {/* Vote Confirmation (when voted but not enough votes to show results) */}
        {hasVoted && !showResults && !error && (
          <div className="text-center py-4">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-50 border border-green-200 rounded-lg mb-3">
              <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span className="text-green-700 font-medium">
                Vote recorded for {votedFor === debaterPro.id ? debaterPro.name : debaterCon.name}
              </span>
            </div>
            <p className="text-sm text-gray-500">
              Results will be revealed once enough votes are collected
            </p>
          </div>
        )}

        {/* Results */}
        {showResults && (
          <div>
            {/* Vote Bar */}
            <div className="mb-3 sm:mb-4">
              <div className="h-6 sm:h-8 bg-gray-100 rounded-full overflow-hidden flex">
                <div
                  className="bg-blue-500 flex items-center justify-end pr-1.5 sm:pr-2 transition-all duration-500"
                  style={{ width: `${proPercentage}%` }}
                >
                  {proPercentage >= 15 && (
                    <span className="text-white text-[10px] sm:text-sm font-medium">
                      {proPercentage.toFixed(0)}%
                    </span>
                  )}
                </div>
                <div
                  className="bg-red-500 flex items-center justify-start pl-1.5 sm:pl-2 transition-all duration-500"
                  style={{ width: `${conPercentage}%` }}
                >
                  {conPercentage >= 15 && (
                    <span className="text-white text-[10px] sm:text-sm font-medium">
                      {conPercentage.toFixed(0)}%
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Vote Counts */}
            <div className="flex justify-between text-xs sm:text-sm">
              <div className="text-blue-600">
                <span className="font-medium">{proVotes}</span> for Pro
                {votedFor === debaterPro.id && (
                  <span className="ml-1 text-gray-400 hidden sm:inline">(your vote)</span>
                )}
              </div>
              <div className="text-red-600">
                <span className="font-medium">{conVotes}</span> for Con
                {votedFor === debaterCon.id && (
                  <span className="ml-1 text-gray-400 hidden sm:inline">(your vote)</span>
                )}
              </div>
            </div>

            {/* Agreement with Judge */}
            {agreementWithJudge !== null && agreementWithJudge !== undefined && (
              <div className="mt-4 pt-4 border-t border-gray-100">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">Agreement with AI Judge</span>
                  <span className="font-medium text-gray-900">
                    {agreementWithJudge.toFixed(0)}%
                  </span>
                </div>
              </div>
            )}

            {/* Total Votes */}
            <div className="mt-2 text-center text-sm text-gray-500">
              {totalVotes} total vote{totalVotes !== 1 ? 's' : ''}
            </div>
          </div>
        )}

        {/* Not completed state */}
        {!isCompleted && (
          <p className="text-sm text-gray-500 text-center py-4">
            Voting opens after the debate is complete.
          </p>
        )}
      </div>
    </div>
  );
}
