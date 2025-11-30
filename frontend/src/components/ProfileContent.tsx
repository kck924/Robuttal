'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Session } from 'next-auth';
import { UserProfile } from '@/lib/api';
import { formatRelativeTime } from '@/lib/utils';

interface ProfileContentProps {
  profile: UserProfile | null;
  session: Session;
}

function getStatusColor(status: string): string {
  switch (status) {
    case 'pending':
      return 'bg-yellow-100 text-yellow-700';
    case 'approved':
      return 'bg-blue-100 text-blue-700';
    case 'selected':
      return 'bg-green-100 text-green-700';
    case 'debated':
      return 'bg-purple-100 text-purple-700';
    case 'rejected':
      return 'bg-red-100 text-red-700';
    default:
      return 'bg-gray-100 text-gray-700';
  }
}

function StatCard({
  label,
  value,
  icon,
  color = 'primary',
}: {
  label: string;
  value: number | string;
  icon: React.ReactNode;
  color?: 'primary' | 'green' | 'purple' | 'yellow' | 'red';
}) {
  const colorClasses = {
    primary: 'bg-primary-50 text-primary-600',
    green: 'bg-green-50 text-green-600',
    purple: 'bg-purple-50 text-purple-600',
    yellow: 'bg-yellow-50 text-yellow-600',
    red: 'bg-red-50 text-red-600',
  };

  return (
    <div className="card">
      <div className="card-body flex items-center gap-4">
        <div className={`w-12 h-12 rounded-lg ${colorClasses[color]} flex items-center justify-center`}>
          {icon}
        </div>
        <div>
          <div className="text-2xl font-bold text-gray-900">{value}</div>
          <div className="text-sm text-gray-500">{label}</div>
        </div>
      </div>
    </div>
  );
}

export default function ProfileContent({ profile, session }: ProfileContentProps) {
  const user = session.user;

  return (
    <div className="container-wide py-8">
      {/* Profile Header */}
      <div className="card mb-8">
        <div className="card-body">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
            {/* Avatar */}
            <div className="flex-shrink-0">
              {user?.image ? (
                <Image
                  src={user.image}
                  alt={user.name || 'User'}
                  width={96}
                  height={96}
                  className="rounded-full"
                />
              ) : (
                <div className="w-24 h-24 rounded-full bg-primary-500 flex items-center justify-center text-white text-3xl font-bold">
                  {user?.name?.charAt(0).toUpperCase() || 'U'}
                </div>
              )}
            </div>

            {/* User Info */}
            <div className="flex-1 text-center sm:text-left">
              <h1 className="text-2xl font-bold text-gray-900">{user?.name}</h1>
              <p className="text-gray-500 mt-1">{user?.email}</p>
              {profile && (
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 mt-3">
                  <span className="text-sm text-gray-500">
                    Member since {new Date(profile.created_at).toLocaleDateString('en-US', {
                      month: 'long',
                      year: 'numeric',
                    })}
                  </span>
                  <span className="text-sm text-gray-300">|</span>
                  <span className="text-sm text-gray-500 capitalize">
                    via {profile.provider}
                  </span>
                </div>
              )}
            </div>

            {/* Quick Actions */}
            <div className="flex flex-col gap-2">
              <Link
                href="/topics?filter=mine"
                className="btn-secondary text-sm flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                </svg>
                View Your Topics
              </Link>
              <Link
                href="/topics?submit=true"
                className="btn-primary text-sm flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Submit Topic
              </Link>
            </div>
          </div>
        </div>
      </div>

      {profile ? (
        <>
          {/* Stats Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
            <StatCard
              label="Topics Submitted"
              value={profile.topic_stats.total_submitted}
              color="primary"
              icon={
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                </svg>
              }
            />
            <StatCard
              label="Votes Received"
              value={profile.topic_stats.total_votes_received}
              color="green"
              icon={
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                </svg>
              }
            />
            <StatCard
              label="Topics Debated"
              value={profile.topic_stats.topics_debated}
              color="purple"
              icon={
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              }
            />
            <StatCard
              label="Topic Votes Cast"
              value={profile.vote_stats.total_topic_votes}
              color="yellow"
              icon={
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              }
            />
          </div>

          {/* Your Debated Topics - Full Width Featured Section */}
          {profile.debated_topics.length > 0 && (
            <div className="card mb-8">
              <div className="card-header">
                <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <svg className="w-5 h-5 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                  </svg>
                  Your Debated Topics
                </h2>
              </div>
              <div className="divide-y divide-gray-100">
                {profile.debated_topics.map((debate) => (
                  <div
                    key={debate.id}
                    className="px-4 py-4 sm:px-6 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                      {/* Topic Title */}
                      <div className="flex-1 min-w-0">
                        <Link
                          href={`/debates/${debate.id}`}
                          className="text-base font-medium text-gray-900 hover:text-primary-600"
                        >
                          {debate.topic_title}
                        </Link>
                        <p className="text-sm text-gray-500 mt-1">
                          {debate.completed_at && new Date(debate.completed_at).toLocaleDateString('en-US', {
                            month: 'long',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </p>
                      </div>

                      {/* Debate Details */}
                      <div className="flex items-center gap-4 sm:gap-6">
                        {/* Pro Model */}
                        <div className="text-center">
                          <Link
                            href={`/models/${debate.pro_slug}`}
                            className="text-sm font-medium text-gray-900 hover:text-primary-600"
                          >
                            {debate.pro_name}
                          </Link>
                          <div className={`text-lg font-bold ${debate.winner_slug === debate.pro_slug ? 'text-green-600' : 'text-gray-600'}`}>
                            {debate.pro_score ?? '-'}
                          </div>
                          {debate.winner_slug === debate.pro_slug && (
                            <span className="text-xs text-green-600 font-medium">Winner</span>
                          )}
                        </div>

                        {/* VS */}
                        <div className="text-gray-400 text-sm font-medium">vs</div>

                        {/* Con Model */}
                        <div className="text-center">
                          <Link
                            href={`/models/${debate.con_slug}`}
                            className="text-sm font-medium text-gray-900 hover:text-primary-600"
                          >
                            {debate.con_name}
                          </Link>
                          <div className={`text-lg font-bold ${debate.winner_slug === debate.con_slug ? 'text-green-600' : 'text-gray-600'}`}>
                            {debate.con_score ?? '-'}
                          </div>
                          {debate.winner_slug === debate.con_slug && (
                            <span className="text-xs text-green-600 font-medium">Winner</span>
                          )}
                        </div>

                        {/* View Debate Link */}
                        <Link
                          href={`/debates/${debate.id}`}
                          className="hidden sm:flex items-center text-primary-600 hover:text-primary-700"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </Link>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Two Column Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Recent Topics */}
            <div className="lg:col-span-2">
              <div className="card">
                <div className="card-header flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-gray-900">Recent Topics</h2>
                  {profile.topic_stats.total_submitted > 5 && (
                    <Link href="/topics?filter=mine" className="text-sm text-primary-600 hover:underline">
                      View all
                    </Link>
                  )}
                </div>
                {profile.recent_topics.length > 0 ? (
                  <div className="divide-y divide-gray-100">
                    {profile.recent_topics.map((topic) => (
                      <div key={topic.id} className="px-4 py-3 sm:px-6">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            {topic.debate_id ? (
                              <Link
                                href={`/debates/${topic.debate_id}`}
                                className="text-sm font-medium text-primary-600 hover:text-primary-700 hover:underline truncate block"
                              >
                                {topic.title}
                              </Link>
                            ) : (
                              <p className="text-sm font-medium text-gray-900 truncate">
                                {topic.title}
                              </p>
                            )}
                            <div className="flex items-center gap-2 mt-1">
                              <span className={`text-xs font-medium px-2 py-0.5 rounded ${getStatusColor(topic.status)}`}>
                                {topic.status.charAt(0).toUpperCase() + topic.status.slice(1)}
                              </span>
                              <span className="text-xs text-gray-500">{topic.category}</span>
                              <span className="text-xs text-gray-400">
                                {formatRelativeTime(topic.created_at)}
                              </span>
                              {topic.debate_id && (
                                <Link
                                  href={`/debates/${topic.debate_id}`}
                                  className="text-xs text-primary-500 hover:text-primary-600 flex items-center gap-1"
                                >
                                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                  </svg>
                                  View Debate
                                </Link>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-1 text-gray-500">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                            </svg>
                            <span className="text-sm font-medium">{topic.vote_count}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="card-body text-center py-12">
                    <svg
                      className="w-12 h-12 mx-auto text-gray-300 mb-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z"
                      />
                    </svg>
                    <p className="text-gray-500 mb-2">No topics submitted yet</p>
                    <p className="text-sm text-gray-400 mb-4">
                      Submit your first debate topic!
                    </p>
                    <Link href="/topics?submit=true" className="btn-primary">
                      Submit a Topic
                    </Link>
                  </div>
                )}
              </div>

              {/* Debates You've Voted On */}
              {profile.voted_debates.length > 0 && (
                <div className="card mt-6">
                  <div className="card-header flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-gray-900">Debates You&apos;ve Voted On</h2>
                    <Link href="/archive" className="text-sm text-primary-600 hover:underline">
                      Browse Archive
                    </Link>
                  </div>
                  <div className="divide-y divide-gray-100">
                    {profile.voted_debates.map((debate) => (
                      <Link
                        key={debate.id}
                        href={`/debates/${debate.id}`}
                        className="block px-4 py-3 sm:px-6 hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">
                              {debate.topic_title}
                            </p>
                            <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                              <span>{debate.pro_name}</span>
                              <span className="text-gray-400">vs</span>
                              <span>{debate.con_name}</span>
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-xs text-primary-600">
                                You voted: {debate.user_vote_for}
                              </span>
                              {debate.winner_name && (
                                <>
                                  <span className="text-xs text-gray-400">|</span>
                                  <span className={`text-xs ${debate.winner_name === debate.user_vote_for ? 'text-green-600' : 'text-gray-500'}`}>
                                    Winner: {debate.winner_name}
                                    {debate.winner_name === debate.user_vote_for && ' (correct!)'}
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                          <div className="flex-shrink-0">
                            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Topic Breakdown */}
              <div className="card">
                <div className="card-header">
                  <h3 className="font-semibold text-gray-900">Topic Breakdown</h3>
                </div>
                <div className="card-body space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Pending</span>
                    <span className="text-sm font-medium text-yellow-600">{profile.topic_stats.topics_pending}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Approved</span>
                    <span className="text-sm font-medium text-blue-600">{profile.topic_stats.topics_approved}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Debated</span>
                    <span className="text-sm font-medium text-purple-600">{profile.topic_stats.topics_debated}</span>
                  </div>
                </div>
              </div>

              {/* Activity Summary */}
              <div className="card">
                <div className="card-header">
                  <h3 className="font-semibold text-gray-900">Voting Activity</h3>
                </div>
                <div className="card-body space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Topic Votes</span>
                    <span className="text-sm font-medium text-gray-900">{profile.vote_stats.total_topic_votes}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Debate Votes</span>
                    <span className="text-sm font-medium text-gray-900">{profile.vote_stats.total_debate_votes}</span>
                  </div>
                </div>
              </div>

              {/* Quick Links */}
              <div className="card">
                <div className="card-header">
                  <h3 className="font-semibold text-gray-900">Quick Links</h3>
                </div>
                <div className="card-body space-y-2">
                  <Link
                    href="/topics"
                    className="flex items-center gap-2 text-sm text-gray-600 hover:text-primary-600"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                    Browse All Topics
                  </Link>
                  <Link
                    href="/standings"
                    className="flex items-center gap-2 text-sm text-gray-600 hover:text-primary-600"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                    View Standings
                  </Link>
                  <Link
                    href="/archive"
                    className="flex items-center gap-2 text-sm text-gray-600 hover:text-primary-600"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                    </svg>
                    Debate Archive
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </>
      ) : (
        /* Error State */
        <div className="card">
          <div className="card-body text-center py-12">
            <svg
              className="w-16 h-16 mx-auto text-gray-300 mb-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Profile Not Found</h2>
            <p className="text-gray-500 mb-4">
              We couldn&apos;t load your profile data. This might be because you haven&apos;t submitted any topics yet.
            </p>
            <div className="flex justify-center gap-4">
              <Link href="/topics?submit=true" className="btn-primary">
                Submit a Topic
              </Link>
              <Link href="/" className="btn-secondary">
                Go Home
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
