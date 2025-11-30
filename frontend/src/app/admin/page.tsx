'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Topic } from '@/lib/api';

const ADMIN_EMAIL = 'kevinklein333@gmail.com'; // Your admin email
const API_BASE = process.env.NEXT_PUBLIC_API_URL || '';

interface PendingTopicsResponse {
  topics: Topic[];
  total: number;
}

interface ModelCostStats {
  model_id: string;
  model_name: string;
  provider: string;
  total_input_tokens: number;
  total_output_tokens: number;
  total_cost_usd: number;
  api_calls: number;
  avg_latency_ms: number;
}

interface DailyCostStats {
  date: string;
  total_cost_usd: number;
  total_input_tokens: number;
  total_output_tokens: number;
  api_calls: number;
}

interface CostStatsResponse {
  total_cost_usd: number;
  total_input_tokens: number;
  total_output_tokens: number;
  total_api_calls: number;
  avg_cost_per_debate: number;
  by_model: ModelCostStats[];
  by_day: DailyCostStats[];
  period_start: string;
  period_end: string;
}

function formatCost(cost: number): string {
  if (cost < 0.01) return `$${cost.toFixed(4)}`;
  if (cost < 1) return `$${cost.toFixed(3)}`;
  return `$${cost.toFixed(2)}`;
}

function formatTokens(tokens: number): string {
  if (tokens >= 1_000_000) return `${(tokens / 1_000_000).toFixed(2)}M`;
  if (tokens >= 1_000) return `${(tokens / 1_000).toFixed(1)}K`;
  return tokens.toString();
}

function formatLatency(ms: number): string {
  if (ms >= 1000) return `${(ms / 1000).toFixed(1)}s`;
  return `${Math.round(ms)}ms`;
}

export default function AdminPage() {
  const { data: session, status } = useSession();
  const [topics, setTopics] = useState<Topic[]>([]);
  const [costStats, setCostStats] = useState<CostStatsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [costLoading, setCostLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [costDays, setCostDays] = useState(30);

  const isAdmin = session?.user?.email === ADMIN_EMAIL;

  useEffect(() => {
    if (status === 'authenticated' && isAdmin) {
      fetchPendingTopics();
      fetchCostStats();
    } else {
      setLoading(false);
      setCostLoading(false);
    }
  }, [status, isAdmin]);

  useEffect(() => {
    if (status === 'authenticated' && isAdmin) {
      fetchCostStats();
    }
  }, [costDays]);

  async function fetchPendingTopics() {
    try {
      const res = await fetch(`${API_BASE}/api/admin/topics/pending`);
      if (!res.ok) throw new Error('Failed to fetch topics');
      const data: PendingTopicsResponse = await res.json();
      setTopics(data.topics);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }

  async function fetchCostStats() {
    setCostLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/admin/cost-stats?days=${costDays}`);
      if (!res.ok) throw new Error('Failed to fetch cost stats');
      const data: CostStatsResponse = await res.json();
      setCostStats(data);
    } catch (err) {
      console.error('Cost stats error:', err);
    } finally {
      setCostLoading(false);
    }
  }

  async function handleModerate(topicId: string, action: 'approve' | 'reject') {
    setActionLoading(topicId);
    try {
      const res = await fetch(`${API_BASE}/api/admin/topics/${topicId}/moderate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || 'Failed to moderate topic');
      }

      // Remove from list
      setTopics((prev) => prev.filter((t) => t.id !== topicId));
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to moderate topic');
    } finally {
      setActionLoading(null);
    }
  }

  if (status === 'loading' || loading) {
    return (
      <div className="container-wide py-8">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        </div>
      </div>
    );
  }

  if (status === 'unauthenticated') {
    return (
      <div className="container-wide py-8">
        <div className="card">
          <div className="card-body text-center py-12">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Admin Access Required</h1>
            <p className="text-gray-600 mb-6">Please sign in to access the admin panel.</p>
            <a
              href="/api/auth/signin"
              className="btn-primary"
            >
              Sign In
            </a>
          </div>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="container-wide py-8">
        <div className="card">
          <div className="card-body text-center py-12">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h1>
            <p className="text-gray-600">You don&apos;t have permission to access this page.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container-wide py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Admin Panel</h1>
        <p className="text-gray-600 mt-1">Moderate topics and monitor API costs</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {/* Cost Monitoring Section */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900">API Cost Monitoring</h2>
          <select
            value={costDays}
            onChange={(e) => setCostDays(Number(e.target.value))}
            className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          >
            <option value={7}>Last 7 days</option>
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
            <option value={365}>Last year</option>
          </select>
        </div>

        {costLoading ? (
          <div className="card">
            <div className="card-body flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600"></div>
            </div>
          </div>
        ) : costStats ? (
          <>
            {/* Summary Stats */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
              <div className="card">
                <div className="card-body text-center">
                  <div className="text-2xl font-bold text-green-600">{formatCost(costStats.total_cost_usd)}</div>
                  <div className="text-xs text-gray-500">Total Cost</div>
                </div>
              </div>
              <div className="card">
                <div className="card-body text-center">
                  <div className="text-2xl font-bold text-blue-600">{formatTokens(costStats.total_input_tokens)}</div>
                  <div className="text-xs text-gray-500">Input Tokens</div>
                </div>
              </div>
              <div className="card">
                <div className="card-body text-center">
                  <div className="text-2xl font-bold text-purple-600">{formatTokens(costStats.total_output_tokens)}</div>
                  <div className="text-xs text-gray-500">Output Tokens</div>
                </div>
              </div>
              <div className="card">
                <div className="card-body text-center">
                  <div className="text-2xl font-bold text-orange-600">{costStats.total_api_calls}</div>
                  <div className="text-xs text-gray-500">API Calls</div>
                </div>
              </div>
              <div className="card">
                <div className="card-body text-center">
                  <div className="text-2xl font-bold text-indigo-600">{formatCost(costStats.avg_cost_per_debate)}</div>
                  <div className="text-xs text-gray-500">Avg/Debate</div>
                </div>
              </div>
            </div>

            {/* Cost by Model */}
            {costStats.by_model.length > 0 && (
              <div className="card mb-6">
                <div className="card-header">
                  <h3 className="text-lg font-semibold">Cost by Model</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Model</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Provider</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Input</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Output</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Calls</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Avg Latency</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Cost</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {costStats.by_model.map((model) => (
                        <tr key={model.model_id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm font-medium text-gray-900">{model.model_name}</td>
                          <td className="px-4 py-3 text-sm text-gray-500 capitalize">{model.provider}</td>
                          <td className="px-4 py-3 text-sm text-gray-600 text-right">{formatTokens(model.total_input_tokens)}</td>
                          <td className="px-4 py-3 text-sm text-gray-600 text-right">{formatTokens(model.total_output_tokens)}</td>
                          <td className="px-4 py-3 text-sm text-gray-600 text-right">{model.api_calls}</td>
                          <td className="px-4 py-3 text-sm text-gray-600 text-right">{formatLatency(model.avg_latency_ms)}</td>
                          <td className="px-4 py-3 text-sm font-semibold text-green-600 text-right">{formatCost(model.total_cost_usd)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Daily Breakdown */}
            {costStats.by_day.length > 0 && (
              <div className="card">
                <div className="card-header">
                  <h3 className="text-lg font-semibold">Daily Breakdown</h3>
                </div>
                <div className="overflow-x-auto max-h-64 overflow-y-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200 sticky top-0">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">API Calls</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Input Tokens</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Output Tokens</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Cost</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {costStats.by_day.map((day) => (
                        <tr key={day.date} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm font-medium text-gray-900">{day.date}</td>
                          <td className="px-4 py-3 text-sm text-gray-600 text-right">{day.api_calls}</td>
                          <td className="px-4 py-3 text-sm text-gray-600 text-right">{formatTokens(day.total_input_tokens)}</td>
                          <td className="px-4 py-3 text-sm text-gray-600 text-right">{formatTokens(day.total_output_tokens)}</td>
                          <td className="px-4 py-3 text-sm font-semibold text-green-600 text-right">{formatCost(day.total_cost_usd)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {costStats.by_model.length === 0 && costStats.by_day.length === 0 && (
              <div className="card">
                <div className="card-body text-center py-12 text-gray-500">
                  No API usage data recorded yet. Run a debate to see cost statistics.
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="card">
            <div className="card-body text-center py-12 text-gray-500">
              Failed to load cost statistics
            </div>
          </div>
        )}
      </div>

      {/* Topic Moderation Section */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Topic Moderation</h2>

        {/* Pending count stat */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="card">
            <div className="card-body text-center">
              <div className="text-3xl font-bold text-primary-600">{topics.length}</div>
              <div className="text-sm text-gray-500">Pending Moderation</div>
            </div>
          </div>
        </div>

        {/* Pending Topics */}
        <div className="card">
          <div className="card-header">
            <h3 className="text-lg font-semibold">Topics Awaiting Approval</h3>
          </div>
          <div className="divide-y divide-gray-100">
            {topics.length === 0 ? (
              <div className="card-body text-center py-12 text-gray-500">
                No topics pending moderation
              </div>
            ) : (
              topics.map((topic) => (
                <div key={topic.id} className="card-body flex items-start gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-medium px-2 py-0.5 rounded bg-gray-100 text-gray-700">
                        {topic.category}
                      </span>
                      <span className="text-xs text-gray-400">
                        by {topic.submitted_by}
                      </span>
                    </div>
                    <h3 className="font-medium text-gray-900">{topic.title}</h3>
                    <p className="text-xs text-gray-500 mt-1">
                      Submitted {new Date(topic.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleModerate(topic.id, 'approve')}
                      disabled={actionLoading === topic.id}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 text-sm font-medium"
                    >
                      {actionLoading === topic.id ? '...' : 'Approve'}
                    </button>
                    <button
                      onClick={() => handleModerate(topic.id, 'reject')}
                      disabled={actionLoading === topic.id}
                      className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 text-sm font-medium"
                    >
                      {actionLoading === topic.id ? '...' : 'Reject'}
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
