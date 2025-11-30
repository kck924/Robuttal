import uuid
from datetime import datetime, timedelta
from enum import Enum

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models import Model, Topic, TopicSource, TopicStatus, TranscriptEntry
from app.schemas.topic import TopicResponse
from app.services.scheduler import get_topic_stats, run_single_debate

router = APIRouter(prefix="/api/admin", tags=["admin"])


class TopicStatsResponse(BaseModel):
    """Topic statistics for admin dashboard."""

    backlog_remaining: int
    user_pending: int
    user_qualified: int
    total_debated: int
    days_remaining: float
    categories: dict[str, int]
    min_votes_required: int
    topic_selection_mode: str


class TriggerDebateResponse(BaseModel):
    """Response from triggering a manual debate."""

    success: bool
    message: str
    debate_id: str | None = None


class ModerationAction(str, Enum):
    APPROVE = "approve"
    REJECT = "reject"


class ModerateTopicRequest(BaseModel):
    """Request to moderate a topic."""

    action: ModerationAction


class ModerateTopicResponse(BaseModel):
    """Response from moderating a topic."""

    success: bool
    message: str
    topic: TopicResponse


class PendingTopicsResponse(BaseModel):
    """List of topics awaiting moderation."""

    topics: list[TopicResponse]
    total: int


@router.get("/topic-stats", response_model=TopicStatsResponse)
async def get_topic_statistics(
    db: AsyncSession = Depends(get_db),
) -> TopicStatsResponse:
    """
    Get topic statistics for admin dashboard.

    Returns:
    - Backlog remaining (seeded topics pending)
    - User submissions pending and qualified
    - Total debates completed
    - Estimated days of backlog remaining
    - Category breakdown
    """
    stats = await get_topic_stats(db)
    return TopicStatsResponse(**stats)


@router.post("/trigger-debate", response_model=TriggerDebateResponse)
async def trigger_debate(
    db: AsyncSession = Depends(get_db),
) -> TriggerDebateResponse:
    """
    Manually trigger a debate for testing.

    This runs the full debate flow:
    1. Select topic
    2. Select models
    3. Run debate phases
    4. Judge and audit
    5. Update Elo ratings

    WARNING: This will consume API credits for all AI providers involved.
    """
    try:
        debate = await run_single_debate(db)

        if debate is None:
            return TriggerDebateResponse(
                success=False,
                message="No topic available for debate",
                debate_id=None,
            )

        await db.commit()

        return TriggerDebateResponse(
            success=True,
            message="Debate completed successfully",
            debate_id=str(debate.id),
        )

    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=500,
            detail=f"Debate failed: {str(e)}",
        )


@router.get("/topics/pending", response_model=PendingTopicsResponse)
async def get_pending_topics(
    db: AsyncSession = Depends(get_db),
) -> PendingTopicsResponse:
    """
    Get all user-submitted topics awaiting moderation.

    Returns topics with status='pending' and source='user'.
    """
    result = await db.execute(
        select(Topic)
        .where(Topic.source == TopicSource.USER, Topic.status == TopicStatus.PENDING)
        .order_by(Topic.created_at.desc())
    )
    topics = result.scalars().all()

    return PendingTopicsResponse(
        topics=[TopicResponse.model_validate(t) for t in topics],
        total=len(topics),
    )


@router.post("/topics/{topic_id}/moderate", response_model=ModerateTopicResponse)
async def moderate_topic(
    topic_id: uuid.UUID,
    body: ModerateTopicRequest,
    db: AsyncSession = Depends(get_db),
) -> ModerateTopicResponse:
    """
    Approve or reject a user-submitted topic.

    - **approve**: Sets status to 'approved', topic becomes visible in queue
    - **reject**: Sets status to 'rejected', topic is hidden
    """
    result = await db.execute(select(Topic).where(Topic.id == topic_id))
    topic = result.scalar_one_or_none()

    if topic is None:
        raise HTTPException(status_code=404, detail="Topic not found")

    if topic.status != TopicStatus.PENDING:
        raise HTTPException(
            status_code=400,
            detail=f"Topic is not pending moderation (status: {topic.status.value})",
        )

    if body.action == ModerationAction.APPROVE:
        topic.status = TopicStatus.APPROVED
        message = "Topic approved and added to queue"
    else:
        topic.status = TopicStatus.REJECTED
        message = "Topic rejected"

    await db.flush()
    await db.refresh(topic)

    return ModerateTopicResponse(
        success=True,
        message=message,
        topic=TopicResponse.model_validate(topic),
    )


# ============== Cost Monitoring ==============


class ModelCostStats(BaseModel):
    """Cost statistics for a single model."""

    model_id: str
    model_name: str
    provider: str
    total_input_tokens: int
    total_output_tokens: int
    total_cost_usd: float
    api_calls: int
    avg_latency_ms: float


class DailyCostStats(BaseModel):
    """Cost statistics for a single day."""

    date: str
    total_cost_usd: float
    total_input_tokens: int
    total_output_tokens: int
    api_calls: int


class CostStatsResponse(BaseModel):
    """Complete cost monitoring statistics."""

    # Summary stats
    total_cost_usd: float
    total_input_tokens: int
    total_output_tokens: int
    total_api_calls: int
    avg_cost_per_debate: float

    # Breakdown by model
    by_model: list[ModelCostStats]

    # Daily breakdown (last N days)
    by_day: list[DailyCostStats]

    # Period info
    period_start: str
    period_end: str


@router.get("/cost-stats", response_model=CostStatsResponse)
async def get_cost_statistics(
    days: int = Query(default=30, ge=1, le=365, description="Number of days to look back"),
    db: AsyncSession = Depends(get_db),
) -> CostStatsResponse:
    """
    Get API cost and token usage statistics.

    Returns:
    - Total costs and token usage
    - Breakdown by model
    - Daily breakdown for the specified period
    """
    # Calculate date range
    end_date = datetime.utcnow()
    start_date = end_date - timedelta(days=days)

    # Get total stats
    total_result = await db.execute(
        select(
            func.coalesce(func.sum(TranscriptEntry.cost_usd), 0).label("total_cost"),
            func.coalesce(func.sum(TranscriptEntry.input_tokens), 0).label("total_input"),
            func.coalesce(func.sum(TranscriptEntry.output_tokens), 0).label("total_output"),
            func.count(TranscriptEntry.id).label("api_calls"),
        ).where(
            TranscriptEntry.created_at >= start_date,
            TranscriptEntry.cost_usd.isnot(None),
        )
    )
    totals = total_result.one()

    # Get stats by model
    model_stats_result = await db.execute(
        select(
            TranscriptEntry.speaker_id,
            Model.name.label("model_name"),
            Model.provider,
            func.coalesce(func.sum(TranscriptEntry.input_tokens), 0).label("input_tokens"),
            func.coalesce(func.sum(TranscriptEntry.output_tokens), 0).label("output_tokens"),
            func.coalesce(func.sum(TranscriptEntry.cost_usd), 0).label("cost"),
            func.count(TranscriptEntry.id).label("calls"),
            func.coalesce(func.avg(TranscriptEntry.latency_ms), 0).label("avg_latency"),
        )
        .join(Model, TranscriptEntry.speaker_id == Model.id)
        .where(
            TranscriptEntry.created_at >= start_date,
            TranscriptEntry.cost_usd.isnot(None),
        )
        .group_by(TranscriptEntry.speaker_id, Model.name, Model.provider)
        .order_by(func.sum(TranscriptEntry.cost_usd).desc())
    )
    model_stats = model_stats_result.all()

    # Get daily stats
    daily_stats_result = await db.execute(
        select(
            func.date(TranscriptEntry.created_at).label("date"),
            func.coalesce(func.sum(TranscriptEntry.cost_usd), 0).label("cost"),
            func.coalesce(func.sum(TranscriptEntry.input_tokens), 0).label("input_tokens"),
            func.coalesce(func.sum(TranscriptEntry.output_tokens), 0).label("output_tokens"),
            func.count(TranscriptEntry.id).label("calls"),
        )
        .where(
            TranscriptEntry.created_at >= start_date,
            TranscriptEntry.cost_usd.isnot(None),
        )
        .group_by(func.date(TranscriptEntry.created_at))
        .order_by(func.date(TranscriptEntry.created_at).desc())
    )
    daily_stats = daily_stats_result.all()

    # Count unique debates for avg cost per debate
    debate_count_result = await db.execute(
        select(func.count(func.distinct(TranscriptEntry.debate_id))).where(
            TranscriptEntry.created_at >= start_date,
            TranscriptEntry.cost_usd.isnot(None),
        )
    )
    debate_count = debate_count_result.scalar() or 1  # Avoid division by zero

    return CostStatsResponse(
        total_cost_usd=float(totals.total_cost),
        total_input_tokens=int(totals.total_input),
        total_output_tokens=int(totals.total_output),
        total_api_calls=int(totals.api_calls),
        avg_cost_per_debate=float(totals.total_cost) / debate_count if debate_count > 0 else 0,
        by_model=[
            ModelCostStats(
                model_id=str(row.speaker_id),
                model_name=row.model_name,
                provider=row.provider,
                total_input_tokens=int(row.input_tokens),
                total_output_tokens=int(row.output_tokens),
                total_cost_usd=float(row.cost),
                api_calls=int(row.calls),
                avg_latency_ms=float(row.avg_latency),
            )
            for row in model_stats
        ],
        by_day=[
            DailyCostStats(
                date=str(row.date),
                total_cost_usd=float(row.cost),
                total_input_tokens=int(row.input_tokens),
                total_output_tokens=int(row.output_tokens),
                api_calls=int(row.calls),
            )
            for row in daily_stats
        ],
        period_start=start_date.isoformat(),
        period_end=end_date.isoformat(),
    )
