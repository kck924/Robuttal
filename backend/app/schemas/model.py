from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, computed_field


class ModelResponse(BaseModel):
    """Model response with stats."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str
    slug: str  # URL-friendly identifier
    provider: str
    api_model_id: str
    elo_rating: int
    debates_won: int
    debates_lost: int
    times_judged: int
    avg_judge_score: float | None
    times_excused: int = 0  # Content filter excuses
    is_active: bool
    created_at: datetime

    # Computed fields
    win_rate: float | None = None
    recent_trend: int | None = None  # Elo change over last 10 debates


class EloTrendPoint(BaseModel):
    """A single point in a model's Elo trend (debate number, elo value, result)."""

    debate_number: int  # 1-indexed debate number for this model
    elo: int
    result: str  # "win" or "loss"
    opponent_name: str
    debate_id: UUID
    completed_at: datetime | None = None


class EloTrendData(BaseModel):
    """Full Elo trend data for a model."""

    data_points: list[EloTrendPoint]
    starting_elo: int = 1500


class ModelDetailResponse(BaseModel):
    """Model detail with recent debate history."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str
    slug: str  # URL-friendly identifier
    provider: str
    api_model_id: str
    elo_rating: int
    debates_won: int
    debates_lost: int
    times_judged: int
    avg_judge_score: float | None
    times_excused: int = 0  # Content filter excuses
    is_active: bool
    created_at: datetime
    win_rate: float | None = None
    recent_trend: int | None = None
    recent_debates: list["RecentDebate"] = []
    head_to_head: list["HeadToHeadRecord"] = []  # Record against each opponent
    scoring_stats: "ScoringStats | None" = None  # Category score breakdown vs site average
    judging_stats: "JudgingStats | None" = None  # Judge performance breakdown vs site average
    auditor_breakdown: list["AuditorRecord"] = []  # How each auditor has scored this model as judge
    elo_trend: "EloTrendData | None" = None  # Full Elo history for chart


class RecentDebate(BaseModel):
    """Summary of a recent debate for model history."""

    id: UUID
    topic_title: str
    opponent_name: str
    opponent_id: UUID
    position: str  # "pro" or "con"
    result: str  # "win", "loss"
    score: int | None
    opponent_score: int | None
    elo_before: int | None
    elo_after: int | None
    elo_change: int | None
    elo_history: list[int] = []  # Elo values leading up to this debate (oldest first, up to 4 prior + current)
    completed_at: datetime | None


class HeadToHeadRecord(BaseModel):
    """Head-to-head record against a specific opponent."""

    opponent_id: UUID
    opponent_name: str
    opponent_slug: str
    opponent_provider: str
    opponent_elo: int
    wins: int
    losses: int
    total_games: int
    win_rate: float  # 0-100
    avg_score: float | None  # Average score in debates against this opponent
    avg_opponent_score: float | None  # Average opponent score


class CategoryScores(BaseModel):
    """Average scores per rubric category."""

    logical_consistency: float | None = None  # 0-25
    evidence: float | None = None  # 0-25
    persuasiveness: float | None = None  # 0-25
    engagement: float | None = None  # 0-25
    total: float | None = None  # 0-100


class ScoringStats(BaseModel):
    """Model's scoring statistics with site-wide comparison."""

    model_scores: CategoryScores
    site_averages: CategoryScores
    debates_scored: int  # Number of debates with scoring data


class JudgeScores(BaseModel):
    """Average scores per judge audit category (1-10 scale)."""

    accuracy: float | None = None  # Did they correctly summarize arguments?
    fairness: float | None = None  # Any apparent bias toward either side?
    thoroughness: float | None = None  # Did they address key points?
    reasoning_quality: float | None = None  # Is the decision well-justified?
    overall: float | None = None  # Overall judge score (average of above)


class JudgedDebate(BaseModel):
    """Summary of a debate where this model was the judge."""

    id: UUID
    topic_title: str
    pro_name: str
    pro_slug: str
    con_name: str
    con_slug: str
    winner_name: str | None
    pro_score: int | None
    con_score: int | None
    judge_score: float | None  # Audit score received
    completed_at: datetime | None


class JudgingStats(BaseModel):
    """Model's judging statistics with site-wide comparison."""

    model_scores: JudgeScores
    site_averages: JudgeScores
    times_judged: int  # Number of debates judged with audit data
    recent_judged_debates: list[JudgedDebate] = []  # Recent debates where this model judged


class AuditorRecord(BaseModel):
    """How a specific auditor has rated this model as a judge."""

    auditor_id: UUID
    auditor_name: str
    auditor_slug: str
    auditor_provider: str
    times_audited: int
    avg_overall: float  # Average overall score given by this auditor
    avg_accuracy: float | None
    avg_fairness: float | None
    avg_thoroughness: float | None
    avg_reasoning: float | None


class ModelListResponse(BaseModel):
    """List of models."""

    models: list[ModelResponse]


class DebaterStanding(BaseModel):
    """Debater leaderboard entry."""

    rank: int
    id: UUID
    name: str
    slug: str  # URL-friendly identifier
    provider: str
    elo_rating: int
    debates_won: int
    debates_lost: int
    win_rate: float | None
    recent_trend: int | None


class JudgeStanding(BaseModel):
    """Judge leaderboard entry."""

    rank: int
    id: UUID
    name: str
    slug: str  # URL-friendly identifier
    provider: str
    times_judged: int
    avg_judge_score: float | None


class EloDataPoint(BaseModel):
    """A single Elo rating data point for charting."""

    date: datetime
    elo: int


class ModelEloHistory(BaseModel):
    """Elo history for a single model."""

    model_id: UUID
    model_name: str
    model_slug: str
    provider: str
    data_points: list[EloDataPoint]


class EloHistoryResponse(BaseModel):
    """Elo history for all active models."""

    models: list[ModelEloHistory]


class StandingsResponse(BaseModel):
    """Combined standings response."""

    debater_standings: list[DebaterStanding]
    judge_standings: list[JudgeStanding]
    elo_history: EloHistoryResponse | None = None
