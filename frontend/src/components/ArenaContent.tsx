'use client';

import { useState } from 'react';
import Link from 'next/link';
import { DebateDetail, VoteTally, DailyScheduleResponse, Topic, voteTopic } from '@/lib/api';
import { formatRelativeTime, MAIN_DEBATE_PHASES } from '@/lib/utils';
import DebateMatchup from './DebateMatchup';
import DailySchedule from './DailySchedule';
import JudgeScoreComparison from './JudgeScoreComparison';
import TranscriptViewer from './TranscriptViewer';
import VoteSection from './VoteSection';
import { useToastActions } from './Toast';

interface ArenaContentProps {
  debate: DebateDetail | null;
  isLive: boolean;
  votes: VoteTally | null;
  schedule: DailyScheduleResponse | null;
  topTopics?: Topic[];
}

// Single topic item with voting
function TopicItem({ topic: initialTopic }: { topic: Topic }) {
  const [topic, setTopic] = useState(initialTopic);
  const [isVoting, setIsVoting] = useState(false);
  const [hasVoted, setHasVoted] = useState(false);
  const toast = useToastActions();

  const handleVote = async () => {
    if (isVoting || hasVoted) return;

    setIsVoting(true);
    try {
      const result = await voteTopic(topic.id);
      setTopic(result.topic);
      setHasVoted(true);
      toast.success('Vote recorded!');
    } catch (err) {
      if (err instanceof Error && err.message.includes('already voted')) {
        setHasVoted(true);
        toast.info('You already voted for this topic');
      } else {
        toast.error('Failed to vote');
      }
    } finally {
      setIsVoting(false);
    }
  };

  return (
    <div className="px-4 py-3 flex items-start gap-3">
      <button
        onClick={handleVote}
        disabled={isVoting || hasVoted}
        className={`flex-shrink-0 w-9 h-9 rounded-lg flex flex-col items-center justify-center transition-all ${
          hasVoted
            ? 'bg-primary-100 text-primary-600 cursor-default'
            : 'bg-gray-100 hover:bg-primary-50 hover:text-primary-600 text-gray-500 cursor-pointer'
        }`}
        title={hasVoted ? 'Already voted' : 'Vote for this topic'}
      >
        <svg
          className={`w-3.5 h-3.5 ${isVoting ? 'animate-bounce' : ''}`}
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
        <span className="text-xs font-semibold font-mono leading-none">
          {topic.vote_count}
        </span>
      </button>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-gray-800 leading-snug line-clamp-2">
          {topic.title}
        </p>
        {topic.vote_count >= 5 && (
          <span className="inline-block mt-1 text-xs text-green-600 font-medium">
            Eligible
          </span>
        )}
      </div>
    </div>
  );
}

// Support/Donate Card component
function SupportCard() {
  return (
    <a
      href="https://ko-fi.com/robuttal"
      target="_blank"
      rel="noopener noreferrer"
      className="block relative overflow-hidden rounded-xl bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 border border-primary-500/30 hover:border-primary-400/50 transition-all group shadow-[0_0_20px_rgba(79,70,229,0.15)] hover:shadow-[0_0_30px_rgba(79,70,229,0.3)]"
    >
      {/* Animated gradient border effect */}
      <div className="absolute inset-0 bg-gradient-to-r from-primary-500/0 via-primary-500/10 to-primary-500/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />

      <div className="relative px-4 py-4">
        <div className="flex items-center gap-3">
          {/* Coffee cup icon */}
          <div className="w-10 h-10 rounded-lg bg-primary-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
            <svg className="w-5 h-5 text-primary-400" viewBox="0 0 24 24" fill="currentColor">
              <path d="M2 21h18v-2H2M20 8h-2V5h2m0-2H4v10a4 4 0 0 0 4 4h6a4 4 0 0 0 4-4v-3h2a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2z"/>
            </svg>
          </div>
          <div className="flex-1">
            <div className="font-semibold text-white text-sm font-mono tracking-tight">Support Robuttal</div>
            <div className="text-xs text-gray-400">Buy us a coffee</div>
          </div>
          <div className="flex items-center gap-1 text-primary-400 text-xs font-mono">
            <span className="opacity-0 group-hover:opacity-100 transition-opacity">Ko-fi</span>
            <svg className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </div>
        </div>
      </div>
    </a>
  );
}

// Top Topics Card component
function TopTopicsCard({ topics }: { topics: Topic[] }) {
  if (!topics || topics.length === 0) return null;

  return (
    <div className="card">
      <div className="card-header flex items-center justify-between">
        <h3 className="font-semibold text-gray-900">Top Topics</h3>
        <Link
          href="/topics"
          className="text-xs text-primary-600 hover:underline"
        >
          View all
        </Link>
      </div>
      <div className="divide-y divide-gray-100">
        {topics.map((topic) => (
          <TopicItem key={topic.id} topic={topic} />
        ))}
      </div>
      <div className="px-4 py-3 bg-gray-50 border-t border-gray-100">
        <Link
          href="/topics?submit=true"
          className="flex items-center justify-center gap-1.5 text-sm font-medium text-primary-600 hover:text-primary-700"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Submit a topic
        </Link>
      </div>
    </div>
  );
}

export default function ArenaContent({ debate, isLive, votes, schedule, topTopics }: ArenaContentProps) {
  // Determine completed phases from transcript
  const completedPhases = debate
    ? Array.from(new Set(debate.transcript.map((e) => e.phase)))
    : [];

  // Determine current phase (last phase with entries, or first phase without)
  const getCurrentPhase = (): string | undefined => {
    if (!debate || debate.status === 'completed') return undefined;

    for (const phase of MAIN_DEBATE_PHASES) {
      if (!completedPhases.includes(phase)) {
        return phase;
      }
    }
    return 'judgment';
  };

  const currentPhase = getCurrentPhase();

  // Empty state
  if (!debate) {
    return (
      <div className="container-wide py-4 sm:py-8">
        {/* Hero Section */}
        <div className="text-center mb-6 sm:mb-12">
          <h1 className="text-2xl sm:text-4xl font-bold text-gray-900 mb-2 sm:mb-4">
            AI Debate Arena
          </h1>
          <p className="text-sm sm:text-lg text-gray-600 max-w-2xl mx-auto px-2">
            Watch language models compete head-to-head on user-submitted topics.
            Judged by AI, audited for fairness, ranked by <a href="/elo" className="text-primary-600 hover:underline">Elo</a>.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8">
          {/* Daily Schedule - takes 2 columns */}
          <div className="lg:col-span-2">
            {schedule ? (
              <DailySchedule schedule={schedule} />
            ) : (
              <div className="card">
                <div className="card-header flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-gray-300 rounded-full" />
                    <span className="font-semibold text-gray-500">No Active Debate</span>
                  </div>
                  <span className="text-sm text-gray-500">Debates run 5× daily</span>
                </div>
                <div className="card-body">
                  <p className="text-gray-500 text-center py-8">
                    No debate currently in progress.
                    <br />
                    <span className="text-sm">
                      Check back at the next scheduled time or browse the{' '}
                      <Link href="/archive" className="text-primary-600 hover:underline">
                        archive
                      </Link>
                      .
                    </span>
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Sidebar - 1 column */}
          <div className="space-y-4">
            {/* Top Topics */}
            {topTopics && topTopics.length > 0 && (
              <TopTopicsCard topics={topTopics} />
            )}

            {/* Quick Links */}
            <Link href="/standings" className="card card-body hover:shadow-md transition-shadow block">
              <h3 className="font-semibold text-gray-900 mb-2">Standings</h3>
              <p className="text-sm text-gray-600">
                View <span className="text-primary-600">Elo</span> rankings and model statistics.
              </p>
            </Link>
            <Link href="/archive" className="card card-body hover:shadow-md transition-shadow block">
              <h3 className="font-semibold text-gray-900 mb-2">Archive</h3>
              <p className="text-sm text-gray-600">
                Browse past debates with full transcripts.
              </p>
            </Link>

            {/* Support */}
            <SupportCard />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container-wide py-4 sm:py-8">
      {/* Status Banner */}
      {isLive && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-3 sm:px-4 py-2 sm:py-3 mb-4 sm:mb-6 flex flex-wrap items-center gap-2 sm:gap-3">
          <span className="w-2 h-2 sm:w-3 sm:h-3 bg-red-500 rounded-full animate-pulse" />
          <span className="text-red-800 font-medium text-sm sm:text-base">Live Debate in Progress</span>
          <span className="text-red-600 text-xs sm:text-sm hidden sm:inline">
            Auto-refreshing every 30 seconds
          </span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 sm:gap-6">
        {/* Main Content - 3 columns */}
        <div className="lg:col-span-3 space-y-4 sm:space-y-6">
          {/* Matchup Card */}
          <DebateMatchup
            topic={debate.topic}
            debaterPro={debate.debater_pro}
            debaterCon={debate.debater_con}
            judge={debate.judge}
            winner={debate.winner}
            proScore={debate.pro_score}
            conScore={debate.con_score}
            status={debate.status}
            proEloBefore={debate.pro_elo_before}
            proEloAfter={debate.pro_elo_after}
            conEloBefore={debate.con_elo_before}
            conEloAfter={debate.con_elo_after}
            proEloHistory={debate.pro_elo_history}
            conEloHistory={debate.con_elo_history}
            isBlinded={debate.is_blinded}
          />

          {/* Transcript */}
          <div>
            <h2 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">
              Transcript
            </h2>
            <TranscriptViewer
              entries={debate.transcript}
              debaterPro={debate.debater_pro}
              debaterCon={debate.debater_con}
              judge={debate.judge}
              auditor={debate.auditor}
              showJudgment={debate.status === 'completed'}
            />
          </div>
        </div>

        {/* Sidebar - 1 column */}
        <div className="flex flex-col gap-6">
          {/* Judge Quality Card - First on mobile, after schedule on desktop */}
          {debate.status === 'completed' && debate.judge_score && (
            <div className="card order-first lg:order-4">
              <div className="card-header">
                <h3 className="font-semibold text-gray-900">Judge Quality</h3>
              </div>
              <div className="card-body">
                {debate.judge_score_context ? (
                  <JudgeScoreComparison
                    context={debate.judge_score_context}
                    judgeName={debate.judge.name}
                    auditorName={debate.auditor.name}
                  />
                ) : (
                  <div className="text-center">
                    <div className="text-3xl font-bold font-mono text-purple-600">
                      {debate.judge_score.toFixed(1)}
                    </div>
                    <div className="text-xs text-gray-500 uppercase mt-1">
                      Audit Score
                    </div>
                  </div>
                )}
                <div className="mt-4 pt-4 border-t border-gray-100 text-sm text-gray-600">
                  <p>
                    <span className="font-medium">Judge:</span> {debate.judge.name}
                  </p>
                  <p className="mt-1">
                    <span className="font-medium">Auditor:</span> {debate.auditor.name}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Daily Schedule */}
          <div className="order-2 lg:order-1">
            {schedule && <DailySchedule schedule={schedule} />}
          </div>

          {/* Vote Section */}
          <div className="order-3 lg:order-2">
            <VoteSection
              debateId={debate.id}
              debaterPro={debate.debater_pro}
              debaterCon={debate.debater_con}
              winner={debate.winner}
              initialVotes={votes}
              isCompleted={debate.status === 'completed'}
            />
          </div>

          {/* Top Topics */}
          {topTopics && topTopics.length > 0 && (
            <div className="order-4 lg:order-3">
              <TopTopicsCard topics={topTopics} />
            </div>
          )}

          {/* Meta Info */}
          <div className="card order-5">
            <div className="card-body text-sm text-gray-500 space-y-2">
              <div className="flex justify-between">
                <span>Category</span>
                <span className="text-gray-700">{debate.topic.category}</span>
              </div>
              <div className="flex justify-between">
                <span>Scheduled</span>
                <span className="text-gray-700">
                  {formatRelativeTime(debate.scheduled_at)}
                </span>
              </div>
              {debate.completed_at && (
                <div className="flex justify-between">
                  <span>Completed</span>
                  <span className="text-gray-700">
                    {formatRelativeTime(debate.completed_at)}
                  </span>
                </div>
              )}
              <div className="pt-2 border-t border-gray-100">
                <Link
                  href={`/debates/${debate.id}`}
                  className="text-primary-600 hover:underline"
                >
                  View full debate page →
                </Link>
              </div>
            </div>
          </div>

          {/* Support */}
          <div className="order-6">
            <SupportCard />
          </div>
        </div>
      </div>
    </div>
  );
}
