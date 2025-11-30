from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, computed_field

from app.models.enums import DebatePhase, DebatePosition, DebateStatus


class ModelSummary(BaseModel):
    """Summary of an AI model for embedding in responses."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str
    provider: str
    elo_rating: int


class TopicSummary(BaseModel):
    """Summary of a topic for embedding in responses."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    title: str
    category: str


class TranscriptEntryResponse(BaseModel):
    """A single entry in the debate transcript."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    phase: DebatePhase
    position: DebatePosition | None
    speaker_id: UUID
    speaker_name: str | None = None
    content: str
    token_count: int
    sequence_order: int
    created_at: datetime


class DebateListItem(BaseModel):
    """Debate summary for list responses."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    topic: TopicSummary
    debater_pro: ModelSummary
    debater_con: ModelSummary
    judge: ModelSummary
    winner: ModelSummary | None
    pro_score: int | None
    con_score: int | None
    status: DebateStatus
    scheduled_at: datetime
    completed_at: datetime | None
    created_at: datetime
    # Elo tracking
    pro_elo_before: int | None = None
    pro_elo_after: int | None = None
    con_elo_before: int | None = None
    con_elo_after: int | None = None
    # Blinded judging (judge didn't know model names)
    is_blinded: bool = False


class DebateDetail(BaseModel):
    """Full debate details including transcript."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    topic: TopicSummary
    debater_pro: ModelSummary
    debater_con: ModelSummary
    judge: ModelSummary
    auditor: ModelSummary
    winner: ModelSummary | None
    pro_score: int | None
    con_score: int | None
    judge_score: float | None
    status: DebateStatus
    scheduled_at: datetime
    started_at: datetime | None
    completed_at: datetime | None
    created_at: datetime
    transcript: list[TranscriptEntryResponse]

    # Elo tracking
    pro_elo_before: int | None = None
    pro_elo_after: int | None = None
    con_elo_before: int | None = None
    con_elo_after: int | None = None

    # Elo history (last 5 Elo values for sparkline, oldest first)
    pro_elo_history: list[int] = []
    con_elo_history: list[int] = []

    # Blinded judging (judge didn't know model names)
    is_blinded: bool = False

    # Computed fields
    duration_seconds: int | None = None
    total_word_count: int = 0
    pro_word_count: int = 0
    con_word_count: int = 0

    # Content filter info
    has_substitutions: bool = False
    content_filter_excuses: list["ContentFilterExcuseInfo"] = []

    # Judge score context for comparison visualization
    judge_score_context: "JudgeScoreContext | None" = None


class JudgeScoreContext(BaseModel):
    """Context for comparing the judge's score to historical averages."""

    current_score: float  # This debate's judge_score
    judge_avg: float | None  # Judge's historical average score
    judge_debates_judged: int  # Number of debates this judge has judged
    site_avg: float | None  # Site-wide average judge score
    site_total_debates: int  # Total debates with judge scores
    auditor_avg: float | None  # This auditor's historical average score given
    auditor_debates_audited: int  # Number of debates this auditor has audited


class DebateListResponse(BaseModel):
    """Paginated list of debates."""

    debates: list[DebateListItem]
    total: int
    limit: int
    offset: int


class LiveDebateResponse(BaseModel):
    """Response for live debate endpoint."""

    debate: DebateDetail | None
    is_live: bool


class ContentFilterExcuseResponse(BaseModel):
    """Details of a content filter excuse during a debate."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    debate_id: UUID
    model_id: UUID
    model_name: str
    replacement_model_id: UUID | None
    replacement_model_name: str | None
    role: str  # 'debater_pro', 'debater_con', 'judge', 'auditor'
    phase: DebatePhase | None
    provider: str
    error_message: str | None
    created_at: datetime


class DebateContentFilterResponse(BaseModel):
    """Content filter excuses for a debate."""

    debate_id: UUID
    excuses: list[ContentFilterExcuseResponse]
    total_excuses: int


class ContentFilterExcuseInfo(BaseModel):
    """Info about a model that was excused due to content filter before the debate started."""

    model_id: str
    model_name: str
    role: str  # 'debater_pro', 'debater_con', 'judge', 'auditor'
    provider: str
    error_message: str | None = None


class ScheduledDebateItem(BaseModel):
    """A scheduled debate in the daily schedule."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    topic: TopicSummary
    debater_pro: ModelSummary
    debater_con: ModelSummary
    judge: ModelSummary
    status: DebateStatus
    scheduled_at: datetime
    started_at: datetime | None = None
    completed_at: datetime | None = None
    winner: ModelSummary | None = None
    pro_score: int | None = None
    con_score: int | None = None
    # Elo tracking
    pro_elo_before: int | None = None
    pro_elo_after: int | None = None
    con_elo_before: int | None = None
    con_elo_after: int | None = None
    # Blinded judging (judge didn't know model names)
    is_blinded: bool = False


class DailyScheduleResponse(BaseModel):
    """Daily debate schedule."""

    date: str  # ISO date string (YYYY-MM-DD)
    debates: list[ScheduledDebateItem]
    total_scheduled: int
    completed_count: int
    in_progress_count: int
