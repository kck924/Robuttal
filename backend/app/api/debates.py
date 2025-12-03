from datetime import date, datetime, timedelta, timezone
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import and_, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.models import Debate, DebatePosition, DebateStatus, Model, Topic
from app.schemas.debate import (
    ContentFilterExcuseInfo,
    ContentFilterExcuseResponse,
    DailyScheduleResponse,
    DebateContentFilterResponse,
    DebateDetail,
    DebateListItem,
    DebateListResponse,
    JudgeScoreContext,
    LiveDebateResponse,
    ModelSummary,
    ScheduledDebateItem,
    TopicSummary,
    TranscriptEntryResponse,
    UpcomingSlot,
)

router = APIRouter(prefix="/api/debates", tags=["debates"])


@router.get("", response_model=DebateListResponse)
async def list_debates(
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    status: DebateStatus | None = Query(default=None),
    model_id: UUID | None = Query(default=None),
    search: str | None = Query(default=None, min_length=2, max_length=200),
    db: AsyncSession = Depends(get_db),
) -> DebateListResponse:
    """
    List debates with pagination and filtering.

    - **limit**: Number of debates to return (1-100)
    - **offset**: Number of debates to skip
    - **status**: Filter by debate status
    - **model_id**: Filter by model (as debater, judge, or winner)
    - **search**: Search by topic title (case-insensitive, min 2 chars)
    """
    # Build base query
    query = select(Debate).options(
        selectinload(Debate.topic),
        selectinload(Debate.debater_pro),
        selectinload(Debate.debater_con),
        selectinload(Debate.judge),
        selectinload(Debate.winner),
    )

    # Apply filters
    if status is not None:
        query = query.where(Debate.status == status)

    if model_id is not None:
        query = query.where(
            (Debate.debater_pro_id == model_id)
            | (Debate.debater_con_id == model_id)
            | (Debate.judge_id == model_id)
        )

    # Apply search filter on topic title
    if search is not None:
        search_pattern = f"%{search}%"
        query = query.join(Debate.topic).where(
            Topic.title.ilike(search_pattern)
        )

    # Get total count
    count_query = select(func.count()).select_from(query.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0

    # Apply pagination and ordering
    query = query.order_by(Debate.created_at.desc()).offset(offset).limit(limit)

    result = await db.execute(query)
    debates = result.scalars().all()

    # Convert to response models
    debate_items = [_debate_to_list_item(debate) for debate in debates]

    return DebateListResponse(
        debates=debate_items,
        total=total,
        limit=limit,
        offset=offset,
    )


@router.get("/live", response_model=LiveDebateResponse)
async def get_live_debate(
    db: AsyncSession = Depends(get_db),
) -> LiveDebateResponse:
    """
    Get the currently running debate, if any.

    Returns the debate with status IN_PROGRESS, or null if no debate is live.
    """
    query = (
        select(Debate)
        .options(
            selectinload(Debate.topic),
            selectinload(Debate.debater_pro),
            selectinload(Debate.debater_con),
            selectinload(Debate.judge),
            selectinload(Debate.auditor),
            selectinload(Debate.winner),
            selectinload(Debate.transcript_entries),
        )
        .where(Debate.status == DebateStatus.IN_PROGRESS)
        .order_by(Debate.started_at.desc())
        .limit(1)
    )

    result = await db.execute(query)
    debate = result.scalar_one_or_none()

    if debate is None:
        return LiveDebateResponse(debate=None, is_live=False)

    return LiveDebateResponse(
        debate=await _debate_to_detail(debate, db),
        is_live=True,
    )


@router.get("/schedule/today", response_model=DailyScheduleResponse)
async def get_todays_schedule(
    db: AsyncSession = Depends(get_db),
) -> DailyScheduleResponse:
    """
    Get today's debate schedule.

    Returns all debates scheduled for today (UTC), ordered by scheduled time.
    Also includes upcoming time slots that haven't had debates yet.
    """
    # Import DEBATE_TIMES from scheduler to stay in sync
    from app.services.scheduler import DEBATE_TIMES

    # Get today's date boundaries in UTC
    # Use timezone-naive datetimes since the DB column is TIMESTAMP WITHOUT TIME ZONE
    now = datetime.now(timezone.utc)
    today = now.date()
    start_of_day = datetime.combine(today, datetime.min.time())
    end_of_day = start_of_day + timedelta(days=1)

    query = (
        select(Debate)
        .options(
            selectinload(Debate.topic),
            selectinload(Debate.debater_pro),
            selectinload(Debate.debater_con),
            selectinload(Debate.judge),
            selectinload(Debate.winner),
        )
        .where(
            and_(
                Debate.scheduled_at >= start_of_day,
                Debate.scheduled_at < end_of_day,
            )
        )
        .order_by(Debate.scheduled_at.asc())
    )

    result = await db.execute(query)
    debates = result.scalars().all()

    # Convert to response items
    schedule_items = []
    completed_count = 0
    in_progress_count = 0

    # Track which time slots have debates
    debate_hours = set()
    for debate in debates:
        debate_hours.add(debate.scheduled_at.hour)

        if debate.status == DebateStatus.COMPLETED:
            completed_count += 1
        elif debate.status == DebateStatus.IN_PROGRESS:
            in_progress_count += 1

        schedule_items.append(
            ScheduledDebateItem(
                id=debate.id,
                topic=TopicSummary(
                    id=debate.topic.id,
                    title=debate.topic.title,
                    category=debate.topic.category,
                ),
                debater_pro=ModelSummary(
                    id=debate.debater_pro.id,
                    name=debate.debater_pro.name,
                    provider=debate.debater_pro.provider,
                    elo_rating=debate.debater_pro.elo_rating,
                ),
                debater_con=ModelSummary(
                    id=debate.debater_con.id,
                    name=debate.debater_con.name,
                    provider=debate.debater_con.provider,
                    elo_rating=debate.debater_con.elo_rating,
                ),
                judge=ModelSummary(
                    id=debate.judge.id,
                    name=debate.judge.name,
                    provider=debate.judge.provider,
                    elo_rating=debate.judge.elo_rating,
                ),
                status=debate.status,
                scheduled_at=debate.scheduled_at,
                started_at=debate.started_at,
                completed_at=debate.completed_at,
                winner=ModelSummary(
                    id=debate.winner.id,
                    name=debate.winner.name,
                    provider=debate.winner.provider,
                    elo_rating=debate.winner.elo_rating,
                )
                if debate.winner
                else None,
                pro_score=debate.pro_score,
                con_score=debate.con_score,
                pro_elo_before=debate.pro_elo_before,
                pro_elo_after=debate.pro_elo_after,
                con_elo_before=debate.con_elo_before,
                con_elo_after=debate.con_elo_after,
            )
        )

    # Build upcoming slots for times that haven't had debates yet
    upcoming_slots = []
    current_hour = now.hour
    current_minute = now.minute

    for slot_index, (hour, minute) in enumerate(DEBATE_TIMES):
        # Skip if we already have a debate at this hour
        if hour in debate_hours:
            continue

        # Create the scheduled time for today
        slot_time = datetime.combine(today, datetime.min.time()).replace(
            hour=hour, minute=minute
        )

        # Only include future slots (with a small buffer for slots about to start)
        if hour > current_hour or (hour == current_hour and minute > current_minute - 5):
            upcoming_slots.append(
                UpcomingSlot(
                    scheduled_time=slot_time,
                    slot_index=slot_index,
                )
            )

    return DailyScheduleResponse(
        date=today.isoformat(),
        debates=schedule_items,
        upcoming_slots=upcoming_slots,
        total_scheduled=len(schedule_items) + len(upcoming_slots),
        completed_count=completed_count,
        in_progress_count=in_progress_count,
    )


@router.get("/{debate_id}", response_model=DebateDetail)
async def get_debate(
    debate_id: UUID,
    db: AsyncSession = Depends(get_db),
) -> DebateDetail:
    """
    Get full debate details including transcript.

    Returns the debate with all transcript entries and computed statistics.
    """
    query = (
        select(Debate)
        .options(
            selectinload(Debate.topic),
            selectinload(Debate.debater_pro),
            selectinload(Debate.debater_con),
            selectinload(Debate.judge),
            selectinload(Debate.auditor),
            selectinload(Debate.winner),
            selectinload(Debate.transcript_entries),
        )
        .where(Debate.id == debate_id)
    )

    result = await db.execute(query)
    debate = result.scalar_one_or_none()

    if debate is None:
        raise HTTPException(status_code=404, detail="Debate not found")

    return await _debate_to_detail(debate, db)


@router.get("/{debate_id}/content-filters", response_model=DebateContentFilterResponse)
async def get_debate_content_filters(
    debate_id: UUID,
    db: AsyncSession = Depends(get_db),
) -> DebateContentFilterResponse:
    """
    Get content filter excuses for a specific debate.

    Returns all instances where a model was swapped due to content filter
    violations during the debate. Data is retrieved from the debate's
    analysis_metadata field.
    """
    # Get the debate with its metadata
    debate_query = select(Debate).where(Debate.id == debate_id)
    debate_result = await db.execute(debate_query)
    debate = debate_result.scalar_one_or_none()

    if debate is None:
        raise HTTPException(status_code=404, detail="Debate not found")

    # Extract excuses from analysis_metadata
    excuse_responses = []
    if debate.analysis_metadata and "content_filter_excuses" in debate.analysis_metadata:
        for i, excuse_data in enumerate(debate.analysis_metadata["content_filter_excuses"]):
            # Generate a pseudo-UUID for the excuse since we don't have real IDs anymore
            excuse_responses.append(
                ContentFilterExcuseResponse(
                    id=UUID(int=i),  # Placeholder ID
                    debate_id=debate_id,
                    model_id=UUID(excuse_data.get("model_id", "00000000-0000-0000-0000-000000000000")),
                    model_name=excuse_data.get("model_name", "Unknown"),
                    replacement_model_id=UUID(excuse_data["replacement_model_id"]) if excuse_data.get("replacement_model_id") else None,
                    replacement_model_name=excuse_data.get("replacement_model_name"),
                    role=excuse_data.get("role", "unknown"),
                    phase=excuse_data.get("phase"),
                    provider=excuse_data.get("provider", "unknown"),
                    error_message=excuse_data.get("error_message"),
                    created_at=debate.created_at,  # Use debate created_at as placeholder
                )
            )

    return DebateContentFilterResponse(
        debate_id=debate_id,
        excuses=excuse_responses,
        total_excuses=len(excuse_responses),
    )


def _debate_to_list_item(debate: Debate) -> DebateListItem:
    """Convert a Debate model to a DebateListItem schema."""
    return DebateListItem(
        id=debate.id,
        topic=TopicSummary(
            id=debate.topic.id,
            title=debate.topic.title,
            category=debate.topic.category,
        ),
        debater_pro=ModelSummary(
            id=debate.debater_pro.id,
            name=debate.debater_pro.name,
            provider=debate.debater_pro.provider,
            elo_rating=debate.debater_pro.elo_rating,
        ),
        debater_con=ModelSummary(
            id=debate.debater_con.id,
            name=debate.debater_con.name,
            provider=debate.debater_con.provider,
            elo_rating=debate.debater_con.elo_rating,
        ),
        judge=ModelSummary(
            id=debate.judge.id,
            name=debate.judge.name,
            provider=debate.judge.provider,
            elo_rating=debate.judge.elo_rating,
        ),
        winner=ModelSummary(
            id=debate.winner.id,
            name=debate.winner.name,
            provider=debate.winner.provider,
            elo_rating=debate.winner.elo_rating,
        )
        if debate.winner
        else None,
        pro_score=debate.pro_score,
        con_score=debate.con_score,
        status=debate.status,
        scheduled_at=debate.scheduled_at,
        completed_at=debate.completed_at,
        created_at=debate.created_at,
        pro_elo_before=debate.pro_elo_before,
        pro_elo_after=debate.pro_elo_after,
        con_elo_before=debate.con_elo_before,
        con_elo_after=debate.con_elo_after,
        is_blinded=debate.is_blinded,
    )


async def _debate_to_detail(debate: Debate, db: AsyncSession) -> DebateDetail:
    """Convert a Debate model to a DebateDetail schema with computed fields."""
    # Build transcript with speaker names
    transcript = []
    for entry in sorted(debate.transcript_entries, key=lambda e: e.sequence_order):
        # Determine speaker name
        speaker_name = None
        if entry.speaker_id == debate.debater_pro_id:
            speaker_name = debate.debater_pro.name
        elif entry.speaker_id == debate.debater_con_id:
            speaker_name = debate.debater_con.name
        elif entry.speaker_id == debate.judge_id:
            speaker_name = debate.judge.name
        elif entry.speaker_id == debate.auditor_id:
            speaker_name = debate.auditor.name

        transcript.append(
            TranscriptEntryResponse(
                id=entry.id,
                phase=entry.phase,
                position=entry.position,
                speaker_id=entry.speaker_id,
                speaker_name=speaker_name,
                content=entry.content,
                token_count=entry.token_count,
                sequence_order=entry.sequence_order,
                created_at=entry.created_at,
            )
        )

    # Calculate duration
    duration_seconds = None
    if debate.started_at and debate.completed_at:
        duration_seconds = int(
            (debate.completed_at - debate.started_at).total_seconds()
        )

    # Calculate word counts
    total_word_count = 0
    pro_word_count = 0
    con_word_count = 0

    for entry in debate.transcript_entries:
        words = len(entry.content.split())
        total_word_count += words
        if entry.position == DebatePosition.PRO:
            pro_word_count += words
        elif entry.position == DebatePosition.CON:
            con_word_count += words

    # Get Elo history for both debaters (last 5 debates before this one)
    pro_elo_history = await _get_elo_history(db, debate.debater_pro_id, debate.id)
    con_elo_history = await _get_elo_history(db, debate.debater_con_id, debate.id)

    # Extract content filter excuses from analysis_metadata
    content_filter_excuses: list[ContentFilterExcuseInfo] = []
    if debate.analysis_metadata and "content_filter_excuses" in debate.analysis_metadata:
        for excuse_data in debate.analysis_metadata["content_filter_excuses"]:
            content_filter_excuses.append(
                ContentFilterExcuseInfo(
                    model_id=excuse_data.get("model_id", ""),
                    model_name=excuse_data.get("model_name", "Unknown"),
                    role=excuse_data.get("role", "unknown"),
                    provider=excuse_data.get("provider", "unknown"),
                    error_message=excuse_data.get("error_message"),
                )
            )
    has_substitutions = len(content_filter_excuses) > 0

    # Get judge score context if we have a judge score
    judge_score_context = None
    if debate.judge_score is not None:
        judge_score_context = await _get_judge_score_context(
            db,
            debate.judge_score,
            debate.judge_id,
            debate.auditor_id,
            debate.id,
        )

    return DebateDetail(
        id=debate.id,
        topic=TopicSummary(
            id=debate.topic.id,
            title=debate.topic.title,
            category=debate.topic.category,
        ),
        debater_pro=ModelSummary(
            id=debate.debater_pro.id,
            name=debate.debater_pro.name,
            provider=debate.debater_pro.provider,
            elo_rating=debate.debater_pro.elo_rating,
        ),
        debater_con=ModelSummary(
            id=debate.debater_con.id,
            name=debate.debater_con.name,
            provider=debate.debater_con.provider,
            elo_rating=debate.debater_con.elo_rating,
        ),
        judge=ModelSummary(
            id=debate.judge.id,
            name=debate.judge.name,
            provider=debate.judge.provider,
            elo_rating=debate.judge.elo_rating,
        ),
        auditor=ModelSummary(
            id=debate.auditor.id,
            name=debate.auditor.name,
            provider=debate.auditor.provider,
            elo_rating=debate.auditor.elo_rating,
        ),
        winner=ModelSummary(
            id=debate.winner.id,
            name=debate.winner.name,
            provider=debate.winner.provider,
            elo_rating=debate.winner.elo_rating,
        )
        if debate.winner
        else None,
        pro_score=debate.pro_score,
        con_score=debate.con_score,
        judge_score=debate.judge_score,
        status=debate.status,
        scheduled_at=debate.scheduled_at,
        started_at=debate.started_at,
        completed_at=debate.completed_at,
        created_at=debate.created_at,
        transcript=transcript,
        pro_elo_before=debate.pro_elo_before,
        pro_elo_after=debate.pro_elo_after,
        con_elo_before=debate.con_elo_before,
        con_elo_after=debate.con_elo_after,
        pro_elo_history=pro_elo_history,
        con_elo_history=con_elo_history,
        duration_seconds=duration_seconds,
        total_word_count=total_word_count,
        pro_word_count=pro_word_count,
        con_word_count=con_word_count,
        has_substitutions=has_substitutions,
        content_filter_excuses=content_filter_excuses,
        judge_score_context=judge_score_context,
        is_blinded=debate.is_blinded,
    )


async def _get_elo_history(
    db: AsyncSession, model_id: UUID, current_debate_id: UUID
) -> list[int]:
    """
    Get the Elo history for a model (last 4 debates before current + current).
    Returns list of Elo values, oldest first.
    """
    # Get completed debates for this model, excluding the current debate
    query = (
        select(Debate)
        .where(
            Debate.status == DebateStatus.COMPLETED,
            Debate.id != current_debate_id,
            (Debate.debater_pro_id == model_id) | (Debate.debater_con_id == model_id),
            # Only include debates with Elo tracking
            (Debate.pro_elo_after.isnot(None)) | (Debate.con_elo_after.isnot(None)),
        )
        .order_by(Debate.completed_at.desc())
        .limit(4)
    )

    result = await db.execute(query)
    debates = result.scalars().all()

    # Extract Elo values (after each debate), oldest first
    elo_values = []
    for d in reversed(debates):
        if d.debater_pro_id == model_id and d.pro_elo_after is not None:
            elo_values.append(d.pro_elo_after)
        elif d.debater_con_id == model_id and d.con_elo_after is not None:
            elo_values.append(d.con_elo_after)

    return elo_values


async def _get_judge_score_context(
    db: AsyncSession,
    current_score: float,
    judge_id: UUID,
    auditor_id: UUID,
    current_debate_id: UUID,
) -> JudgeScoreContext:
    """
    Get context for comparing the judge's score to historical averages.
    """
    # 1. Judge's historical average score (when they judged)
    judge_avg_query = select(
        func.avg(Debate.judge_score),
        func.count(Debate.id),
    ).where(
        Debate.status == DebateStatus.COMPLETED,
        Debate.judge_id == judge_id,
        Debate.judge_score.isnot(None),
    )
    judge_result = await db.execute(judge_avg_query)
    judge_row = judge_result.one()
    judge_avg = float(judge_row[0]) if judge_row[0] is not None else None
    judge_debates_judged = judge_row[1] or 0

    # 2. Site-wide average judge score
    site_avg_query = select(
        func.avg(Debate.judge_score),
        func.count(Debate.id),
    ).where(
        Debate.status == DebateStatus.COMPLETED,
        Debate.judge_score.isnot(None),
    )
    site_result = await db.execute(site_avg_query)
    site_row = site_result.one()
    site_avg = float(site_row[0]) if site_row[0] is not None else None
    site_total_debates = site_row[1] or 0

    # 3. Auditor's historical average score given (when they audited)
    auditor_avg_query = select(
        func.avg(Debate.judge_score),
        func.count(Debate.id),
    ).where(
        Debate.status == DebateStatus.COMPLETED,
        Debate.auditor_id == auditor_id,
        Debate.judge_score.isnot(None),
    )
    auditor_result = await db.execute(auditor_avg_query)
    auditor_row = auditor_result.one()
    auditor_avg = float(auditor_row[0]) if auditor_row[0] is not None else None
    auditor_debates_audited = auditor_row[1] or 0

    return JudgeScoreContext(
        current_score=current_score,
        judge_avg=judge_avg,
        judge_debates_judged=judge_debates_judged,
        site_avg=site_avg,
        site_total_debates=site_total_debates,
        auditor_avg=auditor_avg,
        auditor_debates_audited=auditor_debates_audited,
    )
