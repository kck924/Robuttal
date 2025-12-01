'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Topic, DailyScheduleResponse, TaxonomyResponse, getTopics } from '@/lib/api';
import TopicSubmitForm from './TopicSubmitForm';
import TopicCard from './TopicCard';
import NextDebateTimer from './NextDebateTimer';

interface TopicsContentProps {
  topics: Topic[];
  schedule: DailyScheduleResponse | null;
  totalPending: number;
  taxonomy: TaxonomyResponse | null;
  isUserFilter?: boolean;
  userEmail?: string;
}

const DOMAIN_COLORS: Record<string, string> = {
  'Science & Technology': 'bg-blue-100 text-blue-700',
  'Society & Culture': 'bg-green-100 text-green-700',
  'Politics & Governance': 'bg-red-100 text-red-700',
  'Economics & Business': 'bg-yellow-100 text-yellow-700',
  'Philosophy & Ethics': 'bg-purple-100 text-purple-700',
  'Arts & Humanities': 'bg-indigo-100 text-indigo-700',
};

function formatScheduledTime(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

export default function TopicsContent({
  topics: initialTopics,
  schedule,
  totalPending,
  taxonomy,
  isUserFilter = false,
  userEmail,
}: TopicsContentProps) {
  const searchParams = useSearchParams();
  const [showSubmitForm, setShowSubmitForm] = useState(false);
  const [topics, setTopics] = useState(initialTopics);
  const [expandedDomain, setExpandedDomain] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [searchTotal, setSearchTotal] = useState<number | null>(null);

  // Debounced search function
  const performSearch = useCallback(async (query: string, category: string | null) => {
    if (query.length === 0 && !category) {
      // Reset to initial topics
      setTopics(initialTopics);
      setSearchTotal(null);
      return;
    }

    if (query.length > 0 && query.length < 2) {
      // Don't search with less than 2 chars
      return;
    }

    setIsSearching(true);
    try {
      const result = await getTopics({
        search: query || undefined,
        category: category || undefined,
        limit: 50,
      });
      setTopics(result.topics);
      setSearchTotal(result.total);
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setIsSearching(false);
    }
  }, [initialTopics]);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      performSearch(searchQuery, selectedCategory);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, selectedCategory, performSearch]);

  // Auto-open submit form if ?submit=true is in the URL
  useEffect(() => {
    if (searchParams.get('submit') === 'true') {
      setShowSubmitForm(true);
    }
  }, [searchParams]);

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedCategory(null);
    setTopics(initialTopics);
    setSearchTotal(null);
  };

  const scheduledDebates = schedule?.debates || [];

  const handleSubmitSuccess = () => {
    // In a real app, we'd refetch or optimistically update
    setShowSubmitForm(false);
  };

  const eligibleTopics = topics.filter((t) => t.vote_count >= 5).length;

  return (
    <div className="container-wide py-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          {isUserFilter ? (
            <>
              <div className="flex items-center gap-2 mb-2">
                <Link
                  href="/topics"
                  className="text-sm text-primary-600 hover:underline flex items-center gap-1"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                  </svg>
                  Back to all topics
                </Link>
              </div>
              <h1 className="text-3xl font-bold text-gray-900">Your Topics</h1>
              <p className="text-gray-600 mt-1">
                Topics you&apos;ve submitted to the debate arena
              </p>
            </>
          ) : (
            <>
              <h1 className="text-3xl font-bold text-gray-900">Topics</h1>
              <p className="text-gray-600 mt-1">
                Vote on upcoming debate topics or submit your own
              </p>
            </>
          )}
        </div>
        <button
          onClick={() => setShowSubmitForm(!showSubmitForm)}
          className={showSubmitForm
            ? "px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            : "group relative px-6 py-3 text-sm font-bold uppercase tracking-wider text-white bg-gradient-to-r from-primary-600 via-primary-500 to-indigo-600 rounded-xl shadow-lg shadow-primary-500/30 hover:shadow-xl hover:shadow-primary-500/40 hover:scale-105 transition-all duration-200 overflow-hidden"
          }
        >
          {!showSubmitForm && (
            <>
              <span className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/25 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
              <span className="relative flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Submit Topic
              </span>
            </>
          )}
          {showSubmitForm && 'Cancel'}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content - Left 2 columns */}
        <div className="lg:col-span-2 space-y-6">
          {/* Submit Form (collapsible) */}
          {showSubmitForm && (
            <div className="animate-in slide-in-from-top-2 duration-200">
              <TopicSubmitForm onSuccess={handleSubmitSuccess} />
            </div>
          )}

          {/* Topics List */}
          <div className="card">
            <div className="card-header">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">
                  {isUserFilter ? 'Your Submissions' : 'All Topics'}
                </h2>
                <span className="text-sm text-gray-500">
                  {searchTotal !== null
                    ? `${searchTotal} results`
                    : isUserFilter
                    ? `${topics.length} ${topics.length === 1 ? 'topic' : 'topics'}`
                    : `${topics.length} topics · ${eligibleTopics} eligible`
                  }
                </span>
              </div>
              <p className="text-sm text-gray-500 mt-1">
                {isUserFilter
                  ? 'Track the status and votes on your submitted topics'
                  : 'Vote on topics to help decide what gets debated next'
                }
              </p>

              {/* Search Bar */}
              {!isUserFilter && (
                <div className="mt-4 space-y-3">
                  <div className="relative">
                    <svg
                      className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                      />
                    </svg>
                    <input
                      type="text"
                      placeholder="Search topics..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    />
                    {isSearching && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        <svg className="animate-spin h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                      </div>
                    )}
                  </div>

                  {/* Category Filter Pills */}
                  <div className="flex flex-wrap gap-2">
                    {(taxonomy?.domains || []).map((domain) => (
                      domain.subdomains.map((sub) => (
                        <button
                          key={sub.subdomain}
                          onClick={() => setSelectedCategory(
                            selectedCategory === sub.subdomain ? null : sub.subdomain
                          )}
                          className={`px-2.5 py-1 text-xs font-medium rounded-full transition-colors ${
                            selectedCategory === sub.subdomain
                              ? 'bg-primary-600 text-white'
                              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                          }`}
                        >
                          {sub.subdomain}
                        </button>
                      ))
                    )).flat().slice(0, 12)}
                    {(searchQuery || selectedCategory) && (
                      <button
                        onClick={clearFilters}
                        className="px-2.5 py-1 text-xs font-medium rounded-full bg-red-100 text-red-600 hover:bg-red-200 transition-colors"
                      >
                        Clear filters
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="divide-y divide-gray-100">
              {topics.length > 0 ? (
                topics.map((topic) => (
                  <TopicCard key={topic.id} topic={topic} showSource={!isUserFilter} showStatus={isUserFilter} />
                ))
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
                  {isUserFilter ? (
                    <>
                      <p className="text-gray-500 mb-2">No topics submitted yet</p>
                      <p className="text-sm text-gray-400">
                        Submit your first debate topic!
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="text-gray-500 mb-2">No topics yet</p>
                      <p className="text-sm text-gray-400">
                        Be the first to submit a debate topic!
                      </p>
                    </>
                  )}
                  <button
                    onClick={() => setShowSubmitForm(true)}
                    className="btn-secondary mt-4"
                  >
                    Submit a Topic
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Sidebar - Right column */}
        <div className="space-y-6">
          {/* Timer */}
          <NextDebateTimer />

          {/* Today's Queue - Compact */}
          {scheduledDebates.length > 0 && (
            <div className="card">
              <div className="card-header py-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                    <h3 className="text-sm font-semibold text-gray-900">Today&apos;s Queue</h3>
                  </div>
                  <span className="text-xs text-gray-500">
                    {schedule?.completed_count || 0}/{schedule?.total_scheduled || 0}
                  </span>
                </div>
              </div>
              <div className="divide-y divide-gray-100">
                {scheduledDebates.map((debate) => {
                  const isCompleted = debate.status === 'completed';
                  const isLive = debate.status === 'in_progress';

                  return (
                    <Link
                      key={debate.id}
                      href={`/debates/${debate.id}`}
                      className={`block px-4 py-2.5 hover:bg-gray-50 transition-colors ${
                        isLive ? 'bg-red-50/50' : ''
                      } ${isCompleted ? 'opacity-60' : ''}`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-mono text-gray-400">
                          {formatScheduledTime(debate.scheduled_at)}
                        </span>
                        {isLive && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-red-100 text-red-700">
                            <span className="w-1 h-1 bg-red-500 rounded-full animate-pulse" />
                            Live
                          </span>
                        )}
                        {isCompleted && (
                          <svg className="w-3.5 h-3.5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        )}
                      </div>
                      <p className={`text-sm leading-snug line-clamp-2 ${
                        isCompleted ? 'text-gray-500' : 'text-gray-700'
                      }`}>
                        {debate.topic.title}
                      </p>
                      <div className="flex items-center gap-1.5 mt-1 text-xs text-gray-400">
                        <span className="text-blue-500">{debate.debater_pro.name}</span>
                        <span>vs</span>
                        <span className="text-red-500">{debate.debater_con.name}</span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}

          {/* How It Works */}
          <div className="card">
            <div className="card-header">
              <h3 className="font-semibold text-gray-900">How It Works</h3>
            </div>
            <div className="card-body space-y-4">
              <div className="flex gap-3">
                <div className="w-6 h-6 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0">
                  <span className="text-xs font-semibold text-primary-600">1</span>
                </div>
                <div>
                  <p className="font-medium text-gray-900 text-sm">Submit a topic</p>
                  <p className="text-xs text-gray-500">
                    Propose a yes/no debate question
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="w-6 h-6 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0">
                  <span className="text-xs font-semibold text-primary-600">2</span>
                </div>
                <div>
                  <p className="font-medium text-gray-900 text-sm">Get votes</p>
                  <p className="text-xs text-gray-500">
                    Topics need 5+ votes to qualify
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="w-6 h-6 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0">
                  <span className="text-xs font-semibold text-primary-600">3</span>
                </div>
                <div>
                  <p className="font-medium text-gray-900 text-sm">Watch the debate</p>
                  <p className="text-xs text-gray-500">
                    AI models argue your topic
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Submission Guidelines */}
          <div className="card">
            <div className="card-header">
              <h3 className="font-semibold text-gray-900">Guidelines</h3>
            </div>
            <div className="card-body text-sm text-gray-600 space-y-3">
              <div className="flex items-start gap-2">
                <span className="text-green-500 mt-0.5">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                </span>
                <span>Clear pro/con framing</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-green-500 mt-0.5">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                </span>
                <span>Intellectually substantive</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-red-500 mt-0.5">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                      clipRule="evenodd"
                    />
                  </svg>
                </span>
                <span>No time-sensitive claims</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-red-500 mt-0.5">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                      clipRule="evenodd"
                    />
                  </svg>
                </span>
                <span>No questions needing real-time data</span>
              </div>
            </div>
          </div>

          {/* Domains */}
          <div className="card">
            <div className="card-header">
              <h3 className="font-semibold text-gray-900">Domains</h3>
              <p className="text-xs text-gray-500 mt-1">Topics are auto-categorized into 6 domains</p>
            </div>
            <div className="card-body space-y-1">
              {(taxonomy?.domains || []).map((domain) => {
                const isExpanded = expandedDomain === domain.domain;
                const colorClass = DOMAIN_COLORS[domain.domain] || 'bg-gray-100 text-gray-700';

                return (
                  <div key={domain.domain}>
                    <button
                      onClick={() => setExpandedDomain(isExpanded ? null : domain.domain)}
                      className={`w-full px-3 py-2 rounded-lg text-sm font-medium text-left flex items-center justify-between transition-colors ${colorClass}`}
                    >
                      <span>{domain.domain}</span>
                      <svg
                        className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    {isExpanded && domain.subdomains.length > 0 && (
                      <div className="mt-1 ml-3 space-y-1">
                        {domain.subdomains.map((sub) => (
                          <div
                            key={sub.subdomain}
                            className="px-3 py-1.5 text-xs text-gray-600 bg-gray-50 rounded"
                            title={sub.description}
                          >
                            {sub.subdomain}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
