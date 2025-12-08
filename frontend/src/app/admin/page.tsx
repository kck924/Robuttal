'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { Topic, DebateListItem, getDebates, TaxonomySubdomain, getTaxonomy } from '@/lib/api';

const ADMIN_EMAIL = 'kevinklein333@gmail.com'; // Your admin email
const API_BASE = process.env.NEXT_PUBLIC_API_URL || '';

type TabType = 'topics' | 'debates' | 'costs';

interface PendingTopicsResponse {
  topics: Topic[];
  total: number;
}

interface DeleteDebateResponse {
  success: boolean;
  message: string;
  debate_id: string;
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

function formatDateTime(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

export default function AdminPage() {
  const { data: session, status } = useSession();
  const [activeTab, setActiveTab] = useState<TabType>('topics');
  const [topics, setTopics] = useState<Topic[]>([]);
  const [costStats, setCostStats] = useState<CostStatsResponse | null>(null);
  const [debates, setDebates] = useState<DebateListItem[]>([]);
  const [debatesTotal, setDebatesTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [costLoading, setCostLoading] = useState(true);
  const [debatesLoading, setDebatesLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [costDays, setCostDays] = useState(30);
  const [taxonomy, setTaxonomy] = useState<Record<string, TaxonomySubdomain[]>>({});
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<{ domain: string; subdomain: string } | null>(null);

  const isAdmin = session?.user?.email === ADMIN_EMAIL;

  useEffect(() => {
    if (status === 'authenticated' && isAdmin) {
      fetchPendingTopics();
      fetchCostStats();
      fetchDebates();
      fetchTaxonomy();
    } else {
      setLoading(false);
      setCostLoading(false);
      setDebatesLoading(false);
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

  async function fetchDebates() {
    setDebatesLoading(true);
    try {
      const response = await getDebates({ limit: 50 });
      setDebates(response.debates);
      setDebatesTotal(response.total);
    } catch (err) {
      console.error('Debates fetch error:', err);
    } finally {
      setDebatesLoading(false);
    }
  }

  async function fetchTaxonomy() {
    try {
      const data = await getTaxonomy();
      setTaxonomy(data);
    } catch (err) {
      console.error('Taxonomy fetch error:', err);
    }
  }

  async function handleRecategorize(topicId: string) {
    if (!selectedCategory) return;

    setActionLoading(topicId);
    try {
      const res = await fetch(`${API_BASE}/api/admin/topics/${topicId}/recategorize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(selectedCategory),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || 'Failed to recategorize topic');
      }

      const result = await res.json();
      // Update topic in list
      setTopics((prev) =>
        prev.map((t) =>
          t.id === topicId
            ? { ...t, domain: selectedCategory.domain, subdomain: selectedCategory.subdomain, category: selectedCategory.subdomain }
            : t
        )
      );
      setEditingCategory(null);
      setSelectedCategory(null);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to recategorize topic');
    } finally {
      setActionLoading(null);
    }
  }

  async function handleDeleteDebate(debateId: string) {
    setActionLoading(debateId);
    try {
      const res = await fetch(`${API_BASE}/api/admin/debates/${debateId}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || 'Failed to delete debate');
      }

      const result: DeleteDebateResponse = await res.json();

      // Remove from list
      setDebates((prev) => prev.filter((d) => d.id !== debateId));
      setDebatesTotal((prev) => prev - 1);
      setDeleteConfirm(null);
      alert(result.message);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete debate');
    } finally {
      setActionLoading(null);
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

  const tabs = [
    { id: 'topics' as TabType, label: 'Topic Approval', count: topics.length },
    { id: 'debates' as TabType, label: 'Debates', count: debatesTotal },
    { id: 'costs' as TabType, label: 'API Costs', count: null },
  ];

  return (
    <div className="container-wide py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Admin Panel</h1>
        <p className="text-gray-600 mt-1">Moderate topics, manage debates, and monitor API costs</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="flex gap-4" aria-label="Tabs">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-3 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === tab.id
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.label}
              {tab.count !== null && (
                <span
                  className={`ml-2 py-0.5 px-2 rounded-full text-xs ${
                    activeTab === tab.id
                      ? 'bg-primary-100 text-primary-600'
                      : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Topic Approval Tab */}
      {activeTab === 'topics' && (
        <div>
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
                  <div key={topic.id} className="card-body">
                    <div className="flex items-start gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          {editingCategory === topic.id ? (
                            <div className="flex items-center gap-2 flex-wrap">
                              <select
                                value={selectedCategory ? `${selectedCategory.domain}|${selectedCategory.subdomain}` : `${topic.domain}|${topic.subdomain}`}
                                onChange={(e) => {
                                  const [domain, subdomain] = e.target.value.split('|');
                                  setSelectedCategory({ domain, subdomain });
                                }}
                                className="text-xs px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                              >
                                {Object.entries(taxonomy).map(([domain, subdomains]) => (
                                  <optgroup key={domain} label={domain}>
                                    {subdomains.map((sub) => (
                                      <option key={sub.subdomain} value={`${domain}|${sub.subdomain}`}>
                                        {sub.subdomain}
                                      </option>
                                    ))}
                                  </optgroup>
                                ))}
                              </select>
                              <button
                                onClick={() => handleRecategorize(topic.id)}
                                disabled={actionLoading === topic.id}
                                className="text-xs px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                              >
                                {actionLoading === topic.id ? '...' : 'Save'}
                              </button>
                              <button
                                onClick={() => {
                                  setEditingCategory(null);
                                  setSelectedCategory(null);
                                }}
                                className="text-xs px-2 py-1 text-gray-600 hover:text-gray-800"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <>
                              <span className="text-xs font-medium px-2 py-0.5 rounded bg-primary-100 text-primary-700">
                                {topic.domain}
                              </span>
                              <span className="text-gray-400">&gt;</span>
                              <span className="text-xs font-medium px-2 py-0.5 rounded bg-gray-100 text-gray-700">
                                {topic.subdomain || topic.category}
                              </span>
                              <button
                                onClick={() => {
                                  setEditingCategory(topic.id);
                                  setSelectedCategory({ domain: topic.domain, subdomain: topic.subdomain || topic.category });
                                }}
                                className="text-xs text-blue-600 hover:text-blue-800 ml-1"
                              >
                                Edit
                              </button>
                            </>
                          )}
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
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Debates Tab */}
      {activeTab === 'debates' && (
        <div>
          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="card">
              <div className="card-body text-center">
                <div className="text-3xl font-bold text-primary-600">{debatesTotal}</div>
                <div className="text-sm text-gray-500">Total Debates</div>
              </div>
            </div>
          </div>

          {/* Debates Table */}
          <div className="card">
            <div className="card-header flex items-center justify-between">
              <h3 className="text-lg font-semibold">All Debates</h3>
              <button
                onClick={fetchDebates}
                disabled={debatesLoading}
                className="text-sm text-primary-600 hover:text-primary-700 disabled:opacity-50"
              >
                {debatesLoading ? 'Loading...' : 'Refresh'}
              </button>
            </div>

            {debatesLoading ? (
              <div className="card-body flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600"></div>
              </div>
            ) : debates.length === 0 ? (
              <div className="card-body text-center py-12 text-gray-500">
                No debates found
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date/Time</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Topic</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Score</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {debates.map((debate) => (
                      <tr key={debate.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">
                          <div>{formatDateTime(debate.completed_at || debate.scheduled_at)}</div>
                          <div className="text-xs text-gray-400">
                            {new Date(debate.completed_at || debate.scheduled_at).toLocaleDateString()}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-sm font-medium text-gray-900 max-w-sm truncate">
                            {debate.topic.title}
                          </div>
                          <div className="text-xs text-gray-500">
                            {debate.debater_pro.name} vs {debate.debater_con.name}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${
                              debate.status === 'completed'
                                ? 'bg-green-100 text-green-800'
                                : debate.status === 'in_progress'
                                ? 'bg-yellow-100 text-yellow-800'
                                : debate.status === 'judging'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}
                          >
                            {debate.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center text-sm">
                          {debate.pro_score !== null && debate.con_score !== null ? (
                            <span className="font-mono">
                              {debate.pro_score} - {debate.con_score}
                            </span>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Link
                              href={`/debates/${debate.id}`}
                              className="text-sm text-primary-600 hover:text-primary-700"
                            >
                              View
                            </Link>
                            {deleteConfirm === debate.id ? (
                              <>
                                <button
                                  onClick={() => handleDeleteDebate(debate.id)}
                                  disabled={actionLoading === debate.id}
                                  className="text-sm text-red-600 hover:text-red-700 font-medium disabled:opacity-50"
                                >
                                  {actionLoading === debate.id ? '...' : 'Confirm'}
                                </button>
                                <button
                                  onClick={() => setDeleteConfirm(null)}
                                  className="text-sm text-gray-500 hover:text-gray-700"
                                >
                                  Cancel
                                </button>
                              </>
                            ) : (
                              <button
                                onClick={() => setDeleteConfirm(debate.id)}
                                className="text-sm text-red-600 hover:text-red-700"
                              >
                                Delete
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* API Costs Tab */}
      {activeTab === 'costs' && (
        <div>
          <div className="flex items-center justify-between mb-4">
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
      )}
    </div>
  );
}
