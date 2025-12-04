import re
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.models import Debate, DebateStatus, Model
from app.schemas.model import (
    AuditorRecord,
    CategoryScores,
    DebaterStanding,
    EloDataPoint,
    EloHistoryResponse,
    EloTrendData,
    EloTrendPoint,
    HeadToHeadRecord,
    JudgedDebate,
    JudgeScores,
    JudgeStanding,
    JudgingStats,
    ModelDetailResponse,
    ModelEloHistory,
    ModelListResponse,
    ModelResponse,
    RecentDebate,
    ScoringStats,
    StandingsResponse,
)

router = APIRouter(prefix="/api/models", tags=["models"])


def generate_slug(name: str) -> str:
    """
    Generate a URL-friendly slug from a model name.

    Examples:
        "Claude Opus 4" -> "claude-opus-4"
        "GPT-4o" -> "gpt-4o"
        "Gemini 2.0 Flash" -> "gemini-2-0-flash"
    """
    # Lowercase and replace spaces/special chars with hyphens
    slug = name.lower()
    slug = re.sub(r'[^a-z0-9]+', '-', slug)
    slug = slug.strip('-')
    return slug

# Starting Elo for calculating trends
STARTING_ELO = 1500


@router.get("/standings", response_model=StandingsResponse)
async def get_standings(
    db: AsyncSession = Depends(get_db),
) -> StandingsResponse:
    """
    Get leaderboard standings.

    Returns:
    - **debater_standings**: Models ranked by Elo rating
    - **judge_standings**: Models ranked by average judge score
    """
    # Get all active models
    result = await db.execute(
        select(Model).where(Model.is_active == True).order_by(Model.elo_rating.desc())
    )
    models = result.scalars().all()

    # Calculate trends for all models
    trends = await _calculate_trends_for_models(db, [m.id for m in models])

    # Build debater standings
    debater_standings = []
    for rank, model in enumerate(models, start=1):
        total_debates = model.debates_won + model.debates_lost
        win_rate = (
            (model.debates_won / total_debates * 100) if total_debates > 0 else None
        )

        debater_standings.append(
            DebaterStanding(
                rank=rank,
                id=model.id,
                name=model.name,
                slug=generate_slug(model.name),
                provider=model.provider,
                elo_rating=model.elo_rating,
                debates_won=model.debates_won,
                debates_lost=model.debates_lost,
                win_rate=round(win_rate, 1) if win_rate is not None else None,
                recent_trend=trends.get(model.id),
            )
        )

    # Build judge standings (sorted by avg_judge_score)
    judge_models = sorted(
        [m for m in models if m.times_judged > 0],
        key=lambda m: m.avg_judge_score or 0,
        reverse=True,
    )

    judge_standings = []
    for rank, model in enumerate(judge_models, start=1):
        judge_standings.append(
            JudgeStanding(
                rank=rank,
                id=model.id,
                name=model.name,
                slug=generate_slug(model.name),
                provider=model.provider,
                times_judged=model.times_judged,
                avg_judge_score=(
                    round(model.avg_judge_score, 2)
                    if model.avg_judge_score is not None
                    else None
                ),
            )
        )

    # Build Elo history
    elo_history = await _build_elo_history(db, models)

    return StandingsResponse(
        debater_standings=debater_standings,
        judge_standings=judge_standings,
        elo_history=elo_history,
    )


@router.get("", response_model=ModelListResponse)
async def list_models(
    active_only: bool = Query(default=True),
    db: AsyncSession = Depends(get_db),
) -> ModelListResponse:
    """
    List all models with stats.

    - **active_only**: Only return active models (default: true)
    """
    query = select(Model).order_by(Model.elo_rating.desc())

    if active_only:
        query = query.where(Model.is_active == True)

    result = await db.execute(query)
    models = result.scalars().all()

    # Calculate trends for all models
    trends = await _calculate_trends_for_models(db, [m.id for m in models])

    # Build response
    model_responses = []
    for model in models:
        total_debates = model.debates_won + model.debates_lost
        win_rate = (
            (model.debates_won / total_debates * 100) if total_debates > 0 else None
        )

        model_responses.append(
            ModelResponse(
                id=model.id,
                name=model.name,
                slug=generate_slug(model.name),
                provider=model.provider,
                api_model_id=model.api_model_id,
                elo_rating=model.elo_rating,
                debates_won=model.debates_won,
                debates_lost=model.debates_lost,
                times_judged=model.times_judged,
                avg_judge_score=(
                    round(model.avg_judge_score, 2)
                    if model.avg_judge_score is not None
                    else None
                ),
                is_active=model.is_active,
                created_at=model.created_at,
                win_rate=round(win_rate, 1) if win_rate is not None else None,
                recent_trend=trends.get(model.id),
            )
        )

    return ModelListResponse(models=model_responses)


@router.get("/by-slug/{slug}", response_model=ModelDetailResponse)
async def get_model_by_slug(
    slug: str,
    db: AsyncSession = Depends(get_db),
) -> ModelDetailResponse:
    """
    Get model details by URL-friendly slug.

    Example: /api/models/by-slug/claude-opus-4
    """
    # Get all models and find those matching the slug
    # Prioritize active models over inactive ones (in case of duplicates)
    result = await db.execute(
        select(Model).order_by(Model.is_active.desc())  # Active first
    )
    models = result.scalars().all()

    model = None
    for m in models:
        if generate_slug(m.name) == slug:
            model = m
            break

    if model is None:
        raise HTTPException(status_code=404, detail="Model not found")

    # Reuse the logic from get_model
    return await _build_model_detail_response(model, db)


@router.get("/{model_id}", response_model=ModelDetailResponse)
async def get_model(
    model_id: UUID,
    db: AsyncSession = Depends(get_db),
) -> ModelDetailResponse:
    """
    Get model details with recent debate history.

    Returns the model's stats and their last 10 debates.
    """
    # Get the model
    result = await db.execute(select(Model).where(Model.id == model_id))
    model = result.scalar_one_or_none()

    if model is None:
        raise HTTPException(status_code=404, detail="Model not found")

    return await _build_model_detail_response(model, db)


async def _build_model_detail_response(
    model: Model,
    db: AsyncSession,
) -> ModelDetailResponse:
    """Build a ModelDetailResponse for a given model."""
    model_id = model.id

    # Get recent debates where this model was a debater
    debates_query = (
        select(Debate)
        .options(
            selectinload(Debate.topic),
            selectinload(Debate.debater_pro),
            selectinload(Debate.debater_con),
        )
        .where(
            Debate.status == DebateStatus.COMPLETED,
            or_(
                Debate.debater_pro_id == model_id,
                Debate.debater_con_id == model_id,
            ),
        )
        .order_by(Debate.completed_at.desc())
        .limit(10)
    )

    debates_result = await db.execute(debates_query)
    debates = debates_result.scalars().all()

    # Calculate trend from these debates
    trend = _calculate_trend_from_debates(model_id, debates)

    # Build recent debates list with Elo history
    # Debates are ordered newest-first, so we need to look "ahead" in the list for history
    recent_debates = []
    for i, debate in enumerate(debates):
        is_pro = debate.debater_pro_id == model_id
        opponent = debate.debater_con if is_pro else debate.debater_pro
        position = "pro" if is_pro else "con"
        won = debate.winner_id == model_id
        score = debate.pro_score if is_pro else debate.con_score
        opponent_score = debate.con_score if is_pro else debate.pro_score

        # Get Elo values for this model in this debate
        elo_before = debate.pro_elo_before if is_pro else debate.con_elo_before
        elo_after = debate.pro_elo_after if is_pro else debate.con_elo_after
        elo_change = (elo_after - elo_before) if (elo_before is not None and elo_after is not None) else None

        # Build Elo history: up to 4 prior debates + current (5 points total)
        # Since debates are newest-first, "prior" debates are at higher indices
        elo_history: list[int] = []
        # Get up to 4 prior debates (indices i+1 to i+4)
        prior_debates = debates[i + 1 : i + 5]
        # Reverse to get oldest-first order
        for prior in reversed(prior_debates):
            prior_is_pro = prior.debater_pro_id == model_id
            prior_elo = prior.pro_elo_after if prior_is_pro else prior.con_elo_after
            if prior_elo is not None:
                elo_history.append(prior_elo)
        # Add current debate's after value
        if elo_after is not None:
            elo_history.append(elo_after)

        recent_debates.append(
            RecentDebate(
                id=debate.id,
                topic_title=debate.topic.title,
                opponent_name=opponent.name,
                opponent_id=opponent.id,
                position=position,
                result="win" if won else "loss",
                score=score,
                opponent_score=opponent_score,
                elo_before=elo_before,
                elo_after=elo_after,
                elo_change=elo_change,
                elo_history=elo_history,
                completed_at=debate.completed_at,
            )
        )

    # Calculate win rate
    total_debates = model.debates_won + model.debates_lost
    win_rate = (
        (model.debates_won / total_debates * 100) if total_debates > 0 else None
    )

    # Build head-to-head records against all opponents
    head_to_head = await _build_head_to_head_records(db, model_id)

    # Build scoring statistics
    scoring_stats = await _build_scoring_stats(db, model_id)

    # Build judging statistics
    judging_stats = await _build_judging_stats(db, model_id)

    # Build auditor breakdown (how each auditor rates this model as judge)
    auditor_breakdown = await _build_auditor_breakdown(db, model_id)

    # Build Elo trend data for chart
    elo_trend = await _build_elo_trend(db, model_id)

    return ModelDetailResponse(
        id=model.id,
        name=model.name,
        slug=generate_slug(model.name),
        provider=model.provider,
        api_model_id=model.api_model_id,
        elo_rating=model.elo_rating,
        debates_won=model.debates_won,
        debates_lost=model.debates_lost,
        times_judged=model.times_judged,
        avg_judge_score=(
            round(model.avg_judge_score, 2)
            if model.avg_judge_score is not None
            else None
        ),
        is_active=model.is_active,
        created_at=model.created_at,
        win_rate=round(win_rate, 1) if win_rate is not None else None,
        recent_trend=trend,
        recent_debates=recent_debates,
        head_to_head=head_to_head,
        scoring_stats=scoring_stats,
        judging_stats=judging_stats,
        auditor_breakdown=auditor_breakdown,
        elo_trend=elo_trend,
    )


async def _build_head_to_head_records(
    db: AsyncSession,
    model_id: UUID,
) -> list[HeadToHeadRecord]:
    """
    Build head-to-head records against all opponents this model has faced.

    Returns a list of HeadToHeadRecord sorted by total games (most games first).
    """
    from collections import defaultdict

    # Get ALL completed debates for this model (not just recent 10)
    debates_query = (
        select(Debate)
        .options(
            selectinload(Debate.debater_pro),
            selectinload(Debate.debater_con),
        )
        .where(
            Debate.status == DebateStatus.COMPLETED,
            or_(
                Debate.debater_pro_id == model_id,
                Debate.debater_con_id == model_id,
            ),
        )
    )

    result = await db.execute(debates_query)
    debates = result.scalars().all()

    # Aggregate stats per opponent
    opponent_stats: dict[UUID, dict] = defaultdict(lambda: {
        "wins": 0,
        "losses": 0,
        "scores": [],
        "opponent_scores": [],
        "opponent": None,
    })

    for debate in debates:
        is_pro = debate.debater_pro_id == model_id
        opponent = debate.debater_con if is_pro else debate.debater_pro
        won = debate.winner_id == model_id
        my_score = debate.pro_score if is_pro else debate.con_score
        opp_score = debate.con_score if is_pro else debate.pro_score

        stats = opponent_stats[opponent.id]
        stats["opponent"] = opponent

        if won:
            stats["wins"] += 1
        else:
            stats["losses"] += 1

        if my_score is not None:
            stats["scores"].append(my_score)
        if opp_score is not None:
            stats["opponent_scores"].append(opp_score)

    # Build HeadToHeadRecord objects
    records = []
    for opponent_id, stats in opponent_stats.items():
        opponent = stats["opponent"]
        total_games = stats["wins"] + stats["losses"]
        win_rate = (stats["wins"] / total_games * 100) if total_games > 0 else 0

        avg_score = (
            round(sum(stats["scores"]) / len(stats["scores"]), 1)
            if stats["scores"] else None
        )
        avg_opponent_score = (
            round(sum(stats["opponent_scores"]) / len(stats["opponent_scores"]), 1)
            if stats["opponent_scores"] else None
        )

        records.append(HeadToHeadRecord(
            opponent_id=opponent.id,
            opponent_name=opponent.name,
            opponent_slug=generate_slug(opponent.name),
            opponent_provider=opponent.provider,
            opponent_elo=opponent.elo_rating,
            wins=stats["wins"],
            losses=stats["losses"],
            total_games=total_games,
            win_rate=round(win_rate, 1),
            avg_score=avg_score,
            avg_opponent_score=avg_opponent_score,
        ))

    # Sort by total games descending, then by win rate descending
    records.sort(key=lambda r: (r.total_games, r.win_rate), reverse=True)

    return records


async def _build_scoring_stats(
    db: AsyncSession,
    model_id: UUID,
) -> ScoringStats | None:
    """
    Build scoring statistics for a model, showing their average category scores
    compared to site-wide averages.

    Returns None if the model has no debates with scoring data.
    """
    from sqlalchemy import func

    # Get all completed debates for this model with category scores
    debates_query = (
        select(Debate)
        .where(
            Debate.status == DebateStatus.COMPLETED,
            or_(
                Debate.debater_pro_id == model_id,
                Debate.debater_con_id == model_id,
            ),
        )
    )

    result = await db.execute(debates_query)
    debates = result.scalars().all()

    # Collect this model's scores
    model_logical = []
    model_evidence = []
    model_persuasiveness = []
    model_engagement = []
    model_total = []

    for debate in debates:
        is_pro = debate.debater_pro_id == model_id
        if is_pro:
            if debate.pro_logical_consistency is not None:
                model_logical.append(debate.pro_logical_consistency)
            if debate.pro_evidence is not None:
                model_evidence.append(debate.pro_evidence)
            if debate.pro_persuasiveness is not None:
                model_persuasiveness.append(debate.pro_persuasiveness)
            if debate.pro_engagement is not None:
                model_engagement.append(debate.pro_engagement)
            if debate.pro_score is not None:
                model_total.append(debate.pro_score)
        else:
            if debate.con_logical_consistency is not None:
                model_logical.append(debate.con_logical_consistency)
            if debate.con_evidence is not None:
                model_evidence.append(debate.con_evidence)
            if debate.con_persuasiveness is not None:
                model_persuasiveness.append(debate.con_persuasiveness)
            if debate.con_engagement is not None:
                model_engagement.append(debate.con_engagement)
            if debate.con_score is not None:
                model_total.append(debate.con_score)

    debates_scored = len(model_total)
    if debates_scored == 0:
        return None

    # Calculate model averages
    model_scores = CategoryScores(
        logical_consistency=round(sum(model_logical) / len(model_logical), 1) if model_logical else None,
        evidence=round(sum(model_evidence) / len(model_evidence), 1) if model_evidence else None,
        persuasiveness=round(sum(model_persuasiveness) / len(model_persuasiveness), 1) if model_persuasiveness else None,
        engagement=round(sum(model_engagement) / len(model_engagement), 1) if model_engagement else None,
        total=round(sum(model_total) / len(model_total), 1) if model_total else None,
    )

    # Calculate site-wide averages from all completed debates
    site_query = (
        select(
            func.avg(Debate.pro_logical_consistency).label("pro_lc"),
            func.avg(Debate.con_logical_consistency).label("con_lc"),
            func.avg(Debate.pro_evidence).label("pro_ev"),
            func.avg(Debate.con_evidence).label("con_ev"),
            func.avg(Debate.pro_persuasiveness).label("pro_per"),
            func.avg(Debate.con_persuasiveness).label("con_per"),
            func.avg(Debate.pro_engagement).label("pro_eng"),
            func.avg(Debate.con_engagement).label("con_eng"),
            func.avg(Debate.pro_score).label("pro_total"),
            func.avg(Debate.con_score).label("con_total"),
        )
        .where(Debate.status == DebateStatus.COMPLETED)
    )

    site_result = await db.execute(site_query)
    row = site_result.one()

    # Average pro and con to get overall site average per category
    def avg_two(a, b):
        vals = [v for v in [a, b] if v is not None]
        return round(sum(vals) / len(vals), 1) if vals else None

    site_averages = CategoryScores(
        logical_consistency=avg_two(row.pro_lc, row.con_lc),
        evidence=avg_two(row.pro_ev, row.con_ev),
        persuasiveness=avg_two(row.pro_per, row.con_per),
        engagement=avg_two(row.pro_eng, row.con_eng),
        total=avg_two(row.pro_total, row.con_total),
    )

    return ScoringStats(
        model_scores=model_scores,
        site_averages=site_averages,
        debates_scored=debates_scored,
    )


async def _build_judging_stats(
    db: AsyncSession,
    model_id: UUID,
) -> JudgingStats | None:
    """
    Build judging statistics for a model, showing their average audit scores
    compared to site-wide averages.

    Returns None if the model has no judged debates with audit data.
    """
    from sqlalchemy import func
    from sqlalchemy.orm import selectinload

    # Get all completed debates where this model was the judge with audit data
    debates_query = (
        select(Debate)
        .options(
            selectinload(Debate.topic),
            selectinload(Debate.debater_pro),
            selectinload(Debate.debater_con),
            selectinload(Debate.winner),
        )
        .where(
            Debate.status == DebateStatus.COMPLETED,
            Debate.judge_id == model_id,
            Debate.audit_accuracy.isnot(None),  # Has audit data
        )
        .order_by(Debate.completed_at.desc())
    )

    result = await db.execute(debates_query)
    debates = result.scalars().all()

    # Collect this model's audit scores
    model_accuracy = []
    model_fairness = []
    model_thoroughness = []
    model_reasoning = []
    model_overall = []

    for debate in debates:
        if debate.audit_accuracy is not None:
            model_accuracy.append(debate.audit_accuracy)
        if debate.audit_fairness is not None:
            model_fairness.append(debate.audit_fairness)
        if debate.audit_thoroughness is not None:
            model_thoroughness.append(debate.audit_thoroughness)
        if debate.audit_reasoning_quality is not None:
            model_reasoning.append(debate.audit_reasoning_quality)
        if debate.judge_score is not None:
            model_overall.append(debate.judge_score)

    times_judged = len(model_accuracy)
    if times_judged == 0:
        return None

    # Calculate model averages
    model_scores = JudgeScores(
        accuracy=round(sum(model_accuracy) / len(model_accuracy), 1) if model_accuracy else None,
        fairness=round(sum(model_fairness) / len(model_fairness), 1) if model_fairness else None,
        thoroughness=round(sum(model_thoroughness) / len(model_thoroughness), 1) if model_thoroughness else None,
        reasoning_quality=round(sum(model_reasoning) / len(model_reasoning), 1) if model_reasoning else None,
        overall=round(sum(model_overall) / len(model_overall), 1) if model_overall else None,
    )

    # Calculate site-wide averages from all completed debates with audit data
    site_query = (
        select(
            func.avg(Debate.audit_accuracy).label("accuracy"),
            func.avg(Debate.audit_fairness).label("fairness"),
            func.avg(Debate.audit_thoroughness).label("thoroughness"),
            func.avg(Debate.audit_reasoning_quality).label("reasoning"),
            func.avg(Debate.judge_score).label("overall"),
        )
        .where(
            Debate.status == DebateStatus.COMPLETED,
            Debate.audit_accuracy.isnot(None),
        )
    )

    site_result = await db.execute(site_query)
    row = site_result.one()

    site_averages = JudgeScores(
        accuracy=round(row.accuracy, 1) if row.accuracy is not None else None,
        fairness=round(row.fairness, 1) if row.fairness is not None else None,
        thoroughness=round(row.thoroughness, 1) if row.thoroughness is not None else None,
        reasoning_quality=round(row.reasoning, 1) if row.reasoning is not None else None,
        overall=round(row.overall, 1) if row.overall is not None else None,
    )

    # Build list of recent judged debates (limit to 10)
    recent_judged_debates = []
    for debate in debates[:10]:
        recent_judged_debates.append(JudgedDebate(
            id=debate.id,
            topic_title=debate.topic.title,
            pro_name=debate.debater_pro.name,
            pro_slug=generate_slug(debate.debater_pro.name),
            con_name=debate.debater_con.name,
            con_slug=generate_slug(debate.debater_con.name),
            winner_name=debate.winner.name if debate.winner else None,
            pro_score=debate.pro_score,
            con_score=debate.con_score,
            judge_score=debate.judge_score,
            completed_at=debate.completed_at,
        ))

    return JudgingStats(
        model_scores=model_scores,
        site_averages=site_averages,
        times_judged=times_judged,
        recent_judged_debates=recent_judged_debates,
    )


async def _build_auditor_breakdown(
    db: AsyncSession,
    model_id: UUID,
) -> list[AuditorRecord]:
    """
    Build a breakdown of how each auditor has scored this model when it acts as judge.

    Returns a list of AuditorRecord sorted by times_audited (most audits first).
    """
    from collections import defaultdict
    from sqlalchemy.orm import selectinload

    # Get all completed debates where this model was the judge with audit data
    debates_query = (
        select(Debate)
        .options(selectinload(Debate.auditor))
        .where(
            Debate.status == DebateStatus.COMPLETED,
            Debate.judge_id == model_id,
            Debate.audit_accuracy.isnot(None),  # Has audit data
        )
    )

    result = await db.execute(debates_query)
    debates = result.scalars().all()

    # Aggregate scores by auditor
    auditor_stats: dict[UUID, dict] = defaultdict(lambda: {
        "auditor": None,
        "overall_scores": [],
        "accuracy_scores": [],
        "fairness_scores": [],
        "thoroughness_scores": [],
        "reasoning_scores": [],
    })

    for debate in debates:
        auditor = debate.auditor
        stats = auditor_stats[auditor.id]
        stats["auditor"] = auditor

        if debate.judge_score is not None:
            stats["overall_scores"].append(debate.judge_score)
        if debate.audit_accuracy is not None:
            stats["accuracy_scores"].append(debate.audit_accuracy)
        if debate.audit_fairness is not None:
            stats["fairness_scores"].append(debate.audit_fairness)
        if debate.audit_thoroughness is not None:
            stats["thoroughness_scores"].append(debate.audit_thoroughness)
        if debate.audit_reasoning_quality is not None:
            stats["reasoning_scores"].append(debate.audit_reasoning_quality)

    # Build AuditorRecord objects
    records = []
    for auditor_id, stats in auditor_stats.items():
        auditor = stats["auditor"]
        overall_scores = stats["overall_scores"]

        if not overall_scores:
            continue

        records.append(AuditorRecord(
            auditor_id=auditor.id,
            auditor_name=auditor.name,
            auditor_slug=generate_slug(auditor.name),
            auditor_provider=auditor.provider,
            times_audited=len(overall_scores),
            avg_overall=round(sum(overall_scores) / len(overall_scores), 1),
            avg_accuracy=(
                round(sum(stats["accuracy_scores"]) / len(stats["accuracy_scores"]), 1)
                if stats["accuracy_scores"] else None
            ),
            avg_fairness=(
                round(sum(stats["fairness_scores"]) / len(stats["fairness_scores"]), 1)
                if stats["fairness_scores"] else None
            ),
            avg_thoroughness=(
                round(sum(stats["thoroughness_scores"]) / len(stats["thoroughness_scores"]), 1)
                if stats["thoroughness_scores"] else None
            ),
            avg_reasoning=(
                round(sum(stats["reasoning_scores"]) / len(stats["reasoning_scores"]), 1)
                if stats["reasoning_scores"] else None
            ),
        ))

    # Sort by times audited (most first), then by avg overall (highest first)
    records.sort(key=lambda r: (r.times_audited, r.avg_overall), reverse=True)

    return records


async def _calculate_trends_for_models(
    db: AsyncSession,
    model_ids: list[UUID],
) -> dict[UUID, int]:
    """
    Calculate Elo trend (change over last 10 debates) for multiple models.

    Returns a dict mapping model_id to trend (positive = improving, negative = declining).
    """
    trends = {}

    for model_id in model_ids:
        # Get last 10 completed debates for this model
        debates_query = (
            select(Debate)
            .where(
                Debate.status == DebateStatus.COMPLETED,
                or_(
                    Debate.debater_pro_id == model_id,
                    Debate.debater_con_id == model_id,
                ),
            )
            .order_by(Debate.completed_at.desc())
            .limit(10)
        )

        result = await db.execute(debates_query)
        debates = result.scalars().all()

        trends[model_id] = _calculate_trend_from_debates(model_id, debates)

    return trends


def _calculate_trend_from_debates(model_id: UUID, debates: list[Debate]) -> int | None:
    """
    Calculate approximate Elo trend from a list of debates.

    Since we don't store historical Elo, we estimate based on wins/losses
    against opponents. This is an approximation.

    Returns the estimated Elo change, or None if no debates.
    """
    if not debates:
        return None

    # Simple approximation: +16 for win, -16 for loss (half of K-factor)
    # This is a rough estimate since we don't have opponent Elo at time of match
    total_change = 0
    for debate in debates:
        won = debate.winner_id == model_id
        total_change += 16 if won else -16

    return total_change


async def _build_elo_trend(
    db: AsyncSession,
    model_id: UUID,
) -> EloTrendData | None:
    """
    Build Elo trend data for a single model showing Elo vs debate number.

    Returns Elo after each debate, ordered by debate completion time.
    X-axis will be debate number (1, 2, 3, ...).
    """
    # Get ALL completed debates for this model, ordered by time
    debates_query = (
        select(Debate)
        .options(
            selectinload(Debate.debater_pro),
            selectinload(Debate.debater_con),
        )
        .where(
            Debate.status == DebateStatus.COMPLETED,
            or_(
                Debate.debater_pro_id == model_id,
                Debate.debater_con_id == model_id,
            ),
            Debate.completed_at.isnot(None),
        )
        .order_by(Debate.completed_at.asc())
    )

    result = await db.execute(debates_query)
    debates = result.scalars().all()

    if not debates:
        return None

    data_points: list[EloTrendPoint] = []

    for i, debate in enumerate(debates, start=1):
        is_pro = debate.debater_pro_id == model_id
        opponent = debate.debater_con if is_pro else debate.debater_pro
        elo_after = debate.pro_elo_after if is_pro else debate.con_elo_after
        won = debate.winner_id == model_id

        if elo_after is not None:
            data_points.append(
                EloTrendPoint(
                    debate_number=i,
                    elo=elo_after,
                    result="win" if won else "loss",
                    opponent_name=opponent.name,
                    debate_id=debate.id,
                )
            )

    if not data_points:
        return None

    return EloTrendData(
        data_points=data_points,
        starting_elo=STARTING_ELO,
    )


async def _build_elo_history(
    db: AsyncSession,
    models: list[Model],
) -> EloHistoryResponse:
    """
    Build Elo history for all models from completed debates.

    Uses the pro_elo_before/after and con_elo_before/after columns
    to reconstruct each model's Elo trajectory over time.
    """
    from datetime import datetime

    model_histories: list[ModelEloHistory] = []

    for model in models:
        # Get all completed debates where this model participated, ordered by time
        debates_query = (
            select(Debate)
            .where(
                Debate.status == DebateStatus.COMPLETED,
                or_(
                    Debate.debater_pro_id == model.id,
                    Debate.debater_con_id == model.id,
                ),
                Debate.completed_at.isnot(None),
            )
            .order_by(Debate.completed_at.asc())
        )

        result = await db.execute(debates_query)
        debates = result.scalars().all()

        data_points: list[EloDataPoint] = []

        # Add starting point (1500 at model creation or first debate)
        if debates:
            first_debate = debates[0]
            # Get the "before" Elo from first debate
            if first_debate.debater_pro_id == model.id:
                starting_elo = first_debate.pro_elo_before
            else:
                starting_elo = first_debate.con_elo_before

            if starting_elo is not None:
                data_points.append(
                    EloDataPoint(
                        date=first_debate.completed_at,
                        elo=starting_elo,
                    )
                )

        # Add data point after each debate
        for debate in debates:
            if debate.completed_at is None:
                continue

            if debate.debater_pro_id == model.id:
                elo_after = debate.pro_elo_after
            else:
                elo_after = debate.con_elo_after

            if elo_after is not None:
                data_points.append(
                    EloDataPoint(
                        date=debate.completed_at,
                        elo=elo_after,
                    )
                )

        # Only include models that have Elo history
        if data_points:
            model_histories.append(
                ModelEloHistory(
                    model_id=model.id,
                    model_name=model.name,
                    model_slug=generate_slug(model.name),
                    provider=model.provider,
                    data_points=data_points,
                )
            )

    return EloHistoryResponse(models=model_histories)
