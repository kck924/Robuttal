const API_BASE = process.env.NEXT_PUBLIC_API_URL || '';

/**
 * Generate a URL-friendly slug from a model name.
 * Must match the backend generate_slug function.
 */
export function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

async function fetchAPI<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE}${endpoint}`;

  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.detail || `API error: ${response.status}`);
  }

  return response.json();
}

// Types
export interface ModelSummary {
  id: string;
  name: string;
  provider: string;
  elo_rating: number;
}

export interface TopicSummary {
  id: string;
  title: string;
  category: string;
}

export interface TranscriptEntry {
  id: string;
  phase: string;
  position: string | null;
  speaker_id: string;
  speaker_name: string | null;
  content: string;
  token_count: number;
  sequence_order: number;
  created_at: string;
}

export interface DebateListItem {
  id: string;
  topic: TopicSummary;
  debater_pro: ModelSummary;
  debater_con: ModelSummary;
  judge: ModelSummary;
  winner: ModelSummary | null;
  pro_score: number | null;
  con_score: number | null;
  status: string;
  scheduled_at: string;
  completed_at: string | null;
  created_at: string;
  // Elo tracking
  pro_elo_before: number | null;
  pro_elo_after: number | null;
  con_elo_before: number | null;
  con_elo_after: number | null;
  // Blinded judging (judge didn't know model names)
  is_blinded: boolean;
}

export interface JudgeScoreContext {
  current_score: number;
  judge_avg: number | null;
  judge_debates_judged: number;
  site_avg: number | null;
  site_total_debates: number;
  auditor_avg: number | null;
  auditor_debates_audited: number;
}

export interface DebateDetail extends DebateListItem {
  auditor: ModelSummary;
  judge_score: number | null;
  started_at: string | null;
  transcript: TranscriptEntry[];
  duration_seconds: number | null;
  total_word_count: number;
  pro_word_count: number;
  con_word_count: number;
  // Elo history for sparkline (oldest first)
  pro_elo_history: number[];
  con_elo_history: number[];
  // Judge score context for comparison visualization
  judge_score_context: JudgeScoreContext | null;
}

export interface DebateListResponse {
  debates: DebateListItem[];
  total: number;
  limit: number;
  offset: number;
}

export interface LiveDebateResponse {
  debate: DebateDetail | null;
  is_live: boolean;
}

export interface Topic {
  id: string;
  title: string;
  subdomain: string;
  domain: string;
  category: string;  // Legacy field, same as subdomain
  source: string;
  submitted_by: string | null;
  vote_count: number;
  status: string;
  created_at: string;
  debated_at: string | null;
  debate_id: string | null;  // ID of the debate if this topic was debated
}

export interface TaxonomySubdomain {
  subdomain: string;
  domain: string;
  description: string;
}

export interface TaxonomyDomain {
  domain: string;
  subdomains: TaxonomySubdomain[];
}

export interface TaxonomyResponse {
  domains: TaxonomyDomain[];
}

export interface TopicListResponse {
  topics: Topic[];
  total: number;
  limit: number;
  offset: number;
}

export interface Model {
  id: string;
  name: string;
  slug: string;
  provider: string;
  api_model_id: string;
  elo_rating: number;
  debates_won: number;
  debates_lost: number;
  times_judged: number;
  avg_judge_score: number | null;
  is_active: boolean;
  created_at: string;
  win_rate: number | null;
  recent_trend: number | null;
}

export interface ModelListResponse {
  models: Model[];
}

export interface RecentDebate {
  id: string;
  topic_title: string;
  opponent_name: string;
  opponent_id: string;
  position: string;
  result: string;
  score: number | null;
  opponent_score: number | null;
  elo_before: number | null;
  elo_after: number | null;
  elo_change: number | null;
  elo_history: number[];  // Elo values leading up to this debate (oldest first, up to 5 points)
  completed_at: string | null;
}

export interface HeadToHeadRecord {
  opponent_id: string;
  opponent_name: string;
  opponent_slug: string;
  opponent_provider: string;
  opponent_elo: number;
  wins: number;
  losses: number;
  total_games: number;
  win_rate: number;
  avg_score: number | null;
  avg_opponent_score: number | null;
}

export interface CategoryScores {
  logical_consistency: number | null;
  evidence: number | null;
  persuasiveness: number | null;
  engagement: number | null;
  total: number | null;
}

export interface ScoringStats {
  model_scores: CategoryScores;
  site_averages: CategoryScores;
  debates_scored: number;
}

export interface JudgeScores {
  accuracy: number | null;
  fairness: number | null;
  thoroughness: number | null;
  reasoning_quality: number | null;
  overall: number | null;
}

export interface JudgedDebate {
  id: string;
  topic_title: string;
  pro_name: string;
  pro_slug: string;
  con_name: string;
  con_slug: string;
  winner_name: string | null;
  pro_score: number | null;
  con_score: number | null;
  judge_score: number | null;
  completed_at: string | null;
}

export interface JudgingStats {
  model_scores: JudgeScores;
  site_averages: JudgeScores;
  times_judged: number;
  recent_judged_debates: JudgedDebate[];
}

export interface AuditorRecord {
  auditor_id: string;
  auditor_name: string;
  auditor_slug: string;
  auditor_provider: string;
  times_audited: number;
  avg_overall: number;
  avg_accuracy: number | null;
  avg_fairness: number | null;
  avg_thoroughness: number | null;
  avg_reasoning: number | null;
}

export interface EloTrendPoint {
  debate_number: number;
  elo: number;
  result: string;
  opponent_name: string;
  topic_title: string;
  debate_id: string;
  completed_at: string | null;
}

export interface EloTrendData {
  data_points: EloTrendPoint[];
  starting_elo: number;
}

export interface ModelDetail extends Model {
  recent_debates: RecentDebate[];
  head_to_head: HeadToHeadRecord[];
  scoring_stats: ScoringStats | null;
  judging_stats: JudgingStats | null;
  auditor_breakdown: AuditorRecord[];
  elo_trend: EloTrendData | null;
}

export interface DebaterStanding {
  rank: number;
  id: string;
  name: string;
  slug: string;
  provider: string;
  elo_rating: number;
  debates_won: number;
  debates_lost: number;
  win_rate: number | null;
  recent_trend: number | null;
}

export interface JudgeStanding {
  rank: number;
  id: string;
  name: string;
  slug: string;
  provider: string;
  times_judged: number;
  avg_judge_score: number | null;
}

export interface EloDataPoint {
  date: string;
  elo: number;
}

export interface ModelEloHistory {
  model_id: string;
  model_name: string;
  model_slug: string;
  provider: string;
  data_points: EloDataPoint[];
}

export interface EloHistoryResponse {
  models: ModelEloHistory[];
}

export interface StandingsResponse {
  debater_standings: DebaterStanding[];
  judge_standings: JudgeStanding[];
  elo_history: EloHistoryResponse | null;
}

export interface VoteTally {
  debate_id: string;
  total_votes: number;
  pro_votes: number;
  con_votes: number;
  pro_model: {
    model_id: string;
    model_name: string;
    position: string;
    votes: number;
    percentage: number;
  };
  con_model: {
    model_id: string;
    model_name: string;
    position: string;
    votes: number;
    percentage: number;
  };
  judge_winner_id: string | null;
  agreement_with_judge: number | null;
}

export interface ScheduledDebateItem {
  id: string;
  topic: TopicSummary;
  debater_pro: ModelSummary;
  debater_con: ModelSummary;
  judge: ModelSummary;
  status: string;
  scheduled_at: string;
  started_at: string | null;
  completed_at: string | null;
  winner: ModelSummary | null;
  pro_score: number | null;
  con_score: number | null;
  // Elo tracking
  pro_elo_before: number | null;
  pro_elo_after: number | null;
  con_elo_before: number | null;
  con_elo_after: number | null;
  // Blinded judging (judge didn't know model names)
  is_blinded: boolean;
}

export interface UpcomingSlot {
  scheduled_time: string;
  slot_index: number;
}

export interface DailyScheduleResponse {
  date: string;
  debates: ScheduledDebateItem[];
  upcoming_slots: UpcomingSlot[];
  total_scheduled: number;
  completed_count: number;
  in_progress_count: number;
}

// API Functions

// Debates
export async function getDebates(params?: {
  limit?: number;
  offset?: number;
  status?: string;
  model_id?: string;
  search?: string;
}): Promise<DebateListResponse> {
  const searchParams = new URLSearchParams();
  if (params?.limit) searchParams.set('limit', String(params.limit));
  if (params?.offset) searchParams.set('offset', String(params.offset));
  if (params?.status) searchParams.set('status', params.status);
  if (params?.model_id) searchParams.set('model_id', params.model_id);
  if (params?.search) searchParams.set('search', params.search);

  const query = searchParams.toString();
  return fetchAPI(`/api/debates${query ? `?${query}` : ''}`);
}

export async function getDebate(id: string): Promise<DebateDetail> {
  return fetchAPI(`/api/debates/${id}`);
}

export async function getLiveDebate(): Promise<LiveDebateResponse> {
  return fetchAPI('/api/debates/live');
}

export async function getTodaysSchedule(): Promise<DailyScheduleResponse> {
  return fetchAPI('/api/debates/schedule/today');
}

// Topics
export async function getTopics(params?: {
  status?: string;
  limit?: number;
  offset?: number;
  submitted_by?: string;
  search?: string;
  category?: string;
}): Promise<TopicListResponse> {
  const searchParams = new URLSearchParams();
  if (params?.status) searchParams.set('status', params.status);
  if (params?.limit) searchParams.set('limit', String(params.limit));
  if (params?.offset) searchParams.set('offset', String(params.offset));
  if (params?.submitted_by) searchParams.set('submitted_by', params.submitted_by);
  if (params?.search) searchParams.set('search', params.search);
  if (params?.category) searchParams.set('category', params.category);

  const query = searchParams.toString();
  return fetchAPI(`/api/topics${query ? `?${query}` : ''}`);
}

export async function createTopic(data: {
  title: string;
  submitted_by: string;
}): Promise<Topic> {
  return fetchAPI('/api/topics', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function getTaxonomy(): Promise<TaxonomyResponse> {
  return fetchAPI('/api/topics/taxonomy');
}

export async function voteForTopic(
  topicId: string,
  data: { fingerprint: string; ip_address: string }
): Promise<{ topic: Topic; voted: boolean; message: string }> {
  return fetchAPI(`/api/topics/${topicId}/vote`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

// Simplified topic vote (generates fingerprint client-side)
export async function voteTopic(topicId: string): Promise<{ topic: Topic; voted: boolean; message: string }> {
  // Generate a simple fingerprint from available browser data
  const fingerprint = await generateFingerprint();

  return fetchAPI(`/api/topics/${topicId}/vote`, {
    method: 'POST',
    body: JSON.stringify({
      fingerprint,
      ip_address: '', // Backend will extract from request
    }),
  });
}

// Simple fingerprint generation
async function generateFingerprint(): Promise<string> {
  const components = [
    navigator.userAgent,
    navigator.language,
    new Date().getTimezoneOffset(),
    screen.width,
    screen.height,
    screen.colorDepth,
  ];

  const str = components.join('|');

  // Simple hash
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }

  return `fp_${Math.abs(hash).toString(36)}`;
}

// Models
export async function getModels(activeOnly = true): Promise<ModelListResponse> {
  return fetchAPI(`/api/models?active_only=${activeOnly}`);
}

export async function getStandings(): Promise<StandingsResponse> {
  return fetchAPI('/api/models/standings');
}

export async function getModelBySlug(slug: string): Promise<ModelDetail> {
  return fetchAPI(`/api/models/by-slug/${slug}`);
}

// Votes
export async function getDebateVotes(debateId: string): Promise<VoteTally> {
  return fetchAPI(`/api/debates/${debateId}/votes`);
}

export async function voteOnDebate(
  debateId: string,
  data: { model_id: string; fingerprint: string; ip_address: string }
): Promise<{ voted: boolean; message: string }> {
  return fetchAPI(`/api/debates/${debateId}/vote`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

// User Profile
export interface TopicStats {
  total_submitted: number;
  total_votes_received: number;
  topics_debated: number;
  topics_pending: number;
  topics_approved: number;
}

export interface VoteStats {
  total_topic_votes: number;
  total_debate_votes: number;
}

export interface UserTopicSummary {
  id: string;
  title: string;
  category: string;
  status: string;
  vote_count: number;
  created_at: string;
  debated_at: string | null;
  debate_id: string | null;
}

export interface VotedDebateSummary {
  id: string;
  topic_title: string;
  pro_name: string;
  con_name: string;
  winner_name: string | null;
  user_vote_for: string;
  completed_at: string | null;
}

export interface UserDebatedTopicSummary {
  id: string;  // debate id
  topic_id: string;
  topic_title: string;
  pro_name: string;
  pro_slug: string;
  con_name: string;
  con_slug: string;
  winner_name: string | null;
  winner_slug: string | null;
  pro_score: number | null;
  con_score: number | null;
  completed_at: string | null;
}

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  provider: string;
  created_at: string;
  topic_stats: TopicStats;
  vote_stats: VoteStats;
  recent_topics: UserTopicSummary[];
  debated_topics: UserDebatedTopicSummary[];
  voted_debates: VotedDebateSummary[];
}

export async function getUserProfile(email: string): Promise<UserProfile> {
  return fetchAPI(`/api/auth/profile/${encodeURIComponent(email)}`);
}
