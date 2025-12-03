import uuid
from datetime import datetime, timedelta
from enum import Enum

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models import Debate, DebateStatus, Model, Topic, TopicSource, TopicStatus, TranscriptEntry
from app.schemas.topic import TopicResponse
from app.services.scheduler import get_topic_stats, run_single_debate
from app.services.judge import JudgeService
from app.services.elo import update_elos_for_debate

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


class RetryJudgingResponse(BaseModel):
    """Response from retrying judging on a stuck debate."""

    success: bool
    message: str
    debate_id: str
    winner: str | None = None


class RetryJudgingRequest(BaseModel):
    new_judge_id: uuid.UUID | None = None  # Optional: reassign judge before retrying


@router.post("/debates/{debate_id}/retry-judging", response_model=RetryJudgingResponse)
async def retry_judging(
    debate_id: uuid.UUID,
    request: RetryJudgingRequest | None = None,
    db: AsyncSession = Depends(get_db),
) -> RetryJudgingResponse:
    """
    Retry judging for a debate stuck in 'judging' status.

    This will:
    1. Optionally reassign the judge (if new_judge_id is provided)
    2. Run the judge phase
    3. Run the audit phase
    4. Update Elo ratings
    5. Mark debate as completed
    """
    # Get the debate
    result = await db.execute(select(Debate).where(Debate.id == debate_id))
    debate = result.scalar_one_or_none()

    if debate is None:
        raise HTTPException(status_code=404, detail="Debate not found")

    if debate.status != DebateStatus.JUDGING:
        raise HTTPException(
            status_code=400,
            detail=f"Debate is not in judging status (current: {debate.status.value})",
        )

    # Optionally reassign the judge
    if request and request.new_judge_id:
        new_judge = await db.get(Model, request.new_judge_id)
        if new_judge is None:
            raise HTTPException(status_code=404, detail="New judge model not found")
        # Make sure new judge is not a debater in this debate
        if request.new_judge_id in [debate.debater_pro_id, debate.debater_con_id]:
            raise HTTPException(
                status_code=400,
                detail="Judge cannot be the same as a debater in this debate",
            )
        debate.judge_id = request.new_judge_id
        await db.commit()

    try:
        # Run judge and audit
        judge_service = JudgeService(db)
        await judge_service.judge_debate(debate_id)
        await judge_service.audit_judge(debate_id)

        # Update Elo ratings
        await update_elos_for_debate(db, debate_id)

        # Mark topic as debated
        topic_result = await db.execute(select(Topic).where(Topic.id == debate.topic_id))
        topic = topic_result.scalar_one_or_none()
        if topic:
            topic.status = TopicStatus.DEBATED
            topic.debated_at = datetime.utcnow()

        await db.commit()

        # Refresh to get winner
        await db.refresh(debate)

        return RetryJudgingResponse(
            success=True,
            message="Judging completed successfully",
            debate_id=str(debate_id),
            winner=debate.winner.name if debate.winner else None,
        )

    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=500,
            detail=f"Judging failed: {str(e)}",
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


class DeleteDebateResponse(BaseModel):
    """Response from deleting a debate."""

    success: bool
    message: str
    debate_id: str


@router.delete("/debates/{debate_id}", response_model=DeleteDebateResponse)
async def delete_debate(
    debate_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
) -> DeleteDebateResponse:
    """
    Delete a debate and all its related data.

    This will:
    1. Delete all transcript entries for the debate
    2. Delete all votes for the debate
    3. Reset the topic status to 'approved' (so it can be debated again)
    4. Delete the debate itself

    WARNING: This is destructive and cannot be undone.
    """
    from app.models import Vote

    # Get the debate
    result = await db.execute(select(Debate).where(Debate.id == debate_id))
    debate = result.scalar_one_or_none()

    if debate is None:
        raise HTTPException(status_code=404, detail="Debate not found")

    topic_id = debate.topic_id

    try:
        # Delete transcript entries
        await db.execute(
            select(TranscriptEntry).where(TranscriptEntry.debate_id == debate_id)
        )
        transcript_result = await db.execute(
            select(func.count(TranscriptEntry.id)).where(
                TranscriptEntry.debate_id == debate_id
            )
        )
        transcript_count = transcript_result.scalar() or 0

        # Delete transcript entries
        from sqlalchemy import delete

        await db.execute(
            delete(TranscriptEntry).where(TranscriptEntry.debate_id == debate_id)
        )

        # Delete votes for this debate
        await db.execute(delete(Vote).where(Vote.debate_id == debate_id))

        # Reset topic status so it can be debated again
        topic_result = await db.execute(select(Topic).where(Topic.id == topic_id))
        topic = topic_result.scalar_one_or_none()
        if topic:
            topic.status = TopicStatus.APPROVED
            topic.debated_at = None

        # Delete the debate
        await db.delete(debate)
        await db.commit()

        return DeleteDebateResponse(
            success=True,
            message=f"Debate deleted successfully (removed {transcript_count} transcript entries)",
            debate_id=str(debate_id),
        )

    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=500,
            detail=f"Failed to delete debate: {str(e)}",
        )


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
