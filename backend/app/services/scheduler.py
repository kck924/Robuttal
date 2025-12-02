import asyncio
import logging
import random
import uuid
from datetime import datetime, timedelta

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from sqlalchemy import and_, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.database import async_session_maker
from app.models import Debate, DebateStatus, Model, Topic, TopicSource, TopicStatus, TranscriptEntry
from app.providers.base import ContentFilterError
from app.services.orchestrator import DebateOrchestrator
from app.services.judge import JudgeService
from app.services.elo import update_elos_for_debate

logger = logging.getLogger(__name__)

# Debate schedule times (UTC)
# TEMPORARY: Running every 30 mins for monitoring (Dec 2, 2025)
# Revert to original schedule after testing:
# DEBATE_TIMES = [(6, 0), (10, 0), (14, 0), (18, 0), (22, 0)]
DEBATE_TIMES = [
    (2, 0),   # 2:00 AM
    (2, 30),  # 2:30 AM
    (3, 0),   # 3:00 AM
    (3, 30),  # 3:30 AM
    (4, 0),   # 4:00 AM
    (4, 30),  # 4:30 AM
    (5, 0),   # 5:00 AM
    (5, 30),  # 5:30 AM
    (6, 0),   # 6:00 AM
    (6, 30),  # 6:30 AM
    (7, 0),   # 7:00 AM
    (7, 30),  # 7:30 AM
    (8, 0),   # 8:00 AM
]

# Minimum votes for user-submitted topics
MIN_USER_VOTES = 5

# Days to avoid repeating matchups
MATCHUP_COOLDOWN_DAYS = 7

# Maximum attempts to restart debate due to content filter
MAX_CONTENT_FILTER_RESTARTS = 3


class DebateScheduler:
    """Scheduler for running automated debates."""

    def __init__(self):
        self.scheduler = AsyncIOScheduler()
        self.settings = get_settings()

    def start(self):
        """Start the scheduler with debate jobs."""
        for hour, minute in DEBATE_TIMES:
            self.scheduler.add_job(
                self._run_scheduled_debate,
                CronTrigger(hour=hour, minute=minute, timezone="UTC"),
                id=f"debate_{hour:02d}_{minute:02d}",
                replace_existing=True,
            )
            logger.info(f"Scheduled debate at {hour:02d}:{minute:02d} UTC")

        self.scheduler.start()
        logger.info("Debate scheduler started")

    def stop(self):
        """Stop the scheduler."""
        self.scheduler.shutdown()
        logger.info("Debate scheduler stopped")

    async def _run_scheduled_debate(self):
        """Run a single scheduled debate."""
        logger.info("Starting scheduled debate")
        try:
            async with async_session_maker() as db:
                await run_single_debate(db)
                await db.commit()
        except Exception as e:
            logger.error(f"Scheduled debate failed: {e}", exc_info=True)


async def run_single_debate(db: AsyncSession) -> Debate | None:
    """
    Run a single debate from topic selection to completion.

    If a content filter is triggered, the debate restarts with a replacement model.
    Models that trigger content filters are logged and excused from the debate.
    The excuses are stored on the final debate so they can be displayed on the website.

    Returns the completed debate or None if no topic available.
    """
    # Select topic
    topic = await select_next_topic(db)
    if topic is None:
        logger.warning("No topic available for debate")
        return None

    logger.info(f"Selected topic: {topic.title}")

    # Track excused models and content filter events for this debate
    excused_model_ids: set[uuid.UUID] = set()
    content_filter_excuses: list[dict] = []

    # Create debate ID upfront so we can reuse it across restarts
    debate_id = uuid.uuid4()
    debate: Debate | None = None

    for attempt in range(MAX_CONTENT_FILTER_RESTARTS + 1):
        # Select models, excluding any that were excused
        models = await select_debate_models(db, topic.id, exclude_model_ids=excused_model_ids)
        if models is None:
            logger.error("Could not select models for debate (not enough models available)")
            return None

        debater_pro, debater_con, judge, auditor = models

        if attempt > 0:
            logger.info(f"Restart attempt {attempt} after content filter")

        logger.info(
            f"Models selected - Pro: {debater_pro.name}, Con: {debater_con.name}, "
            f"Judge: {judge.name}, Auditor: {auditor.name}"
        )

        if debate is None:
            # Create debate on first attempt
            # Randomly assign blinded status (50/50) for analysis purposes
            is_blinded = random.choice([True, False])
            debate = Debate(
                id=debate_id,
                topic_id=topic.id,
                debater_pro_id=debater_pro.id,
                debater_con_id=debater_con.id,
                judge_id=judge.id,
                auditor_id=auditor.id,
                status=DebateStatus.SCHEDULED,
                scheduled_at=datetime.utcnow(),
                created_at=datetime.utcnow(),
                is_blinded=is_blinded,
            )
            logger.info(f"Debate will be {'blinded' if is_blinded else 'non-blinded'}")
            db.add(debate)
            # Mark topic as selected
            topic.status = TopicStatus.SELECTED
        else:
            # Update debate with new models on restart
            debate.debater_pro_id = debater_pro.id
            debate.debater_con_id = debater_con.id
            debate.judge_id = judge.id
            debate.auditor_id = auditor.id
            debate.status = DebateStatus.SCHEDULED

        await db.flush()

        try:
            # 1. Run debate (opening, rebuttal, cross-exam, closing)
            orchestrator = DebateOrchestrator(db, debate.id)
            await orchestrator.run_debate()

            # Merge any in-debate content filter excuses from orchestrator
            if orchestrator.content_filter_excuses:
                content_filter_excuses.extend(orchestrator.content_filter_excuses)
                logger.info(
                    f"Orchestrator recorded {len(orchestrator.content_filter_excuses)} "
                    f"content filter excuse(s) during debate"
                )

            # Flush to persist transcript entries, then commit and start fresh session
            # This ensures the judge service sees all the entries
            await db.commit()

            # 2. Judge the debate
            judge_service = JudgeService(db)
            await judge_service.judge_debate(debate.id)

            # 3. Audit the judge
            await judge_service.audit_judge(debate.id)

            # Merge any content filter excuses from judge service
            if judge_service.content_filter_excuses:
                content_filter_excuses.extend(judge_service.content_filter_excuses)
                logger.info(
                    f"Judge service recorded {len(judge_service.content_filter_excuses)} "
                    f"content filter excuse(s) during judging/auditing"
                )

            # 4. Update Elo ratings
            await update_elos_for_debate(db, debate.id)

            # 5. Mark topic as debated
            topic.status = TopicStatus.DEBATED
            topic.debated_at = datetime.utcnow()

            # 6. Store content filter excuses in debate metadata for display
            if content_filter_excuses:
                debate.analysis_metadata = debate.analysis_metadata or {}
                debate.analysis_metadata["content_filter_excuses"] = content_filter_excuses

            await db.flush()
            logger.info(f"Debate {debate.id} completed successfully")

            return debate

        except ContentFilterError as e:
            logger.warning(f"Content filter triggered by {e.model_name}: {e.message}")

            # Identify which model triggered the filter based on the error
            excused_model = _identify_excused_model(
                e, debater_pro, debater_con, judge, auditor
            )

            if excused_model:
                excused_model_ids.add(excused_model.id)

                # Determine the role
                if excused_model.id == debater_pro.id:
                    role = "debater_pro"
                elif excused_model.id == debater_con.id:
                    role = "debater_con"
                elif excused_model.id == judge.id:
                    role = "judge"
                else:
                    role = "auditor"

                # Track for metadata - this will be stored on the final successful debate
                content_filter_excuses.append({
                    "model_id": str(excused_model.id),
                    "model_name": excused_model.name,
                    "role": role,
                    "provider": e.provider,
                    "error_message": e.message,
                    "attempt": attempt + 1,
                })

                # Increment the model's times_excused counter
                excused_model.times_excused += 1

                logger.info(f"Model {excused_model.name} excused from debate (role: {role})")

            # Delete the failed debate's transcript entries (but keep the debate)
            await db.execute(
                TranscriptEntry.__table__.delete().where(
                    TranscriptEntry.debate_id == debate.id
                )
            )
            await db.flush()

            # If we've exceeded max restarts, raise the error
            if attempt >= MAX_CONTENT_FILTER_RESTARTS:
                logger.error(f"Max content filter restarts exceeded for topic: {topic.title}")
                topic.status = TopicStatus.PENDING  # Reset topic status
                # Store the excuses even on failure
                if content_filter_excuses:
                    debate.analysis_metadata = debate.analysis_metadata or {}
                    debate.analysis_metadata["content_filter_excuses"] = content_filter_excuses
                await db.flush()
                raise

            # Continue to next attempt
            continue

        except RuntimeError as e:
            # Handle RuntimeError from judge/auditor service when no replacement is available
            # This can happen during judging or auditing phases
            error_msg = str(e)
            logger.warning(f"RuntimeError during debate: {error_msg}")

            if "auditor" in error_msg.lower():
                # Auditor couldn't be replaced - excuse the current auditor and retry
                excused_model_ids.add(auditor.id)
                content_filter_excuses.append({
                    "model_id": str(auditor.id),
                    "model_name": auditor.name,
                    "role": "auditor",
                    "provider": auditor.provider,
                    "error_message": error_msg,
                    "attempt": attempt + 1,
                })
                auditor.times_excused += 1
                logger.info(f"Auditor {auditor.name} excused, will retry with different auditor")
            elif "judge" in error_msg.lower():
                # Judge couldn't be replaced - excuse and retry
                excused_model_ids.add(judge.id)
                content_filter_excuses.append({
                    "model_id": str(judge.id),
                    "model_name": judge.name,
                    "role": "judge",
                    "provider": judge.provider,
                    "error_message": error_msg,
                    "attempt": attempt + 1,
                })
                judge.times_excused += 1
                logger.info(f"Judge {judge.name} excused, will retry with different judge")
            else:
                # Unknown RuntimeError - re-raise
                raise

            # Delete transcript entries and retry
            await db.execute(
                TranscriptEntry.__table__.delete().where(
                    TranscriptEntry.debate_id == debate.id
                )
            )
            await db.flush()

            if attempt >= MAX_CONTENT_FILTER_RESTARTS:
                logger.error(f"Max restarts exceeded for topic: {topic.title}")
                topic.status = TopicStatus.PENDING
                if content_filter_excuses:
                    debate.analysis_metadata = debate.analysis_metadata or {}
                    debate.analysis_metadata["content_filter_excuses"] = content_filter_excuses
                await db.flush()
                raise

            continue

        except Exception as e:
            logger.error(f"Debate {debate.id} failed: {e}", exc_info=True)
            raise

    # Should not reach here, but just in case
    return None


def _identify_excused_model(
    error: ContentFilterError,
    debater_pro: Model,
    debater_con: Model,
    judge: Model,
    auditor: Model,
) -> Model | None:
    """
    Identify which model triggered the content filter based on the error.

    Returns the model that should be excused, or None if uncertain.
    """
    # The error contains the model name from the provider
    model_name_lower = error.model_name.lower()

    for model in [debater_pro, debater_con, judge, auditor]:
        if model.name.lower() in model_name_lower or model_name_lower in model.name.lower():
            return model

    # If we can't identify by name, check the provider
    for model in [debater_pro, debater_con, judge, auditor]:
        if model.provider == error.provider:
            return model

    # Default to None if we can't identify
    return None


async def select_next_topic(db: AsyncSession) -> Topic | None:
    """
    Select the next topic for debate based on selection mode.

    Modes:
    - hybrid: User topics first (if qualified), then backlog
    - user_only: Only user-submitted topics
    - backlog_only: Only seeded backlog topics
    """
    settings = get_settings()
    mode = settings.topic_selection_mode

    if mode == "user_only":
        return await _get_top_voted_user_topic(db, MIN_USER_VOTES)

    elif mode == "backlog_only":
        return await _select_backlog_topic(db)

    else:  # hybrid
        # Try user topic first
        user_topic = await _get_top_voted_user_topic(db, MIN_USER_VOTES)
        if user_topic:
            return user_topic

        # Fall back to backlog
        return await _select_backlog_topic(db)


async def select_topics_for_day(db: AsyncSession) -> list[Topic]:
    """
    Select all 5 topics for a day's debates.

    Slot 1: User-submitted (if qualified) or backlog
    Slots 2-5: Backlog with category diversity
    """
    settings = get_settings()
    topics = []
    categories_used = []

    # Slot 1: User or backlog
    if settings.topic_selection_mode != "backlog_only":
        user_topic = await _get_top_voted_user_topic(db, MIN_USER_VOTES)
        if user_topic:
            topics.append(user_topic)
            categories_used.append(user_topic.category)

    if not topics:
        backlog_topic = await _select_backlog_topic(db)
        if backlog_topic:
            topics.append(backlog_topic)
            categories_used.append(backlog_topic.category)

    # Slots 2-5: Backlog with category diversity
    for _ in range(4):
        topic = await _select_backlog_topic(db, exclude_categories=categories_used)
        if topic is None:
            # All categories used, allow repeats
            topic = await _select_backlog_topic(db)

        if topic:
            topics.append(topic)
            categories_used.append(topic.category)

    return topics


async def _get_top_voted_user_topic(
    db: AsyncSession,
    min_votes: int,
) -> Topic | None:
    """Get the top-voted user-submitted topic with minimum votes.

    User topics must be approved by moderator before being eligible.
    """
    result = await db.execute(
        select(Topic)
        .where(
            Topic.source == TopicSource.USER,
            Topic.status == TopicStatus.APPROVED,
            Topic.vote_count >= min_votes,
        )
        .order_by(Topic.vote_count.desc(), Topic.created_at.asc())
        .limit(1)
    )
    return result.scalar_one_or_none()


async def _select_backlog_topic(
    db: AsyncSession,
    exclude_categories: list[str] | None = None,
) -> Topic | None:
    """
    Select a random topic from the seeded backlog.

    Args:
        exclude_categories: Categories to exclude for diversity

    Returns:
        A random pending seed topic, or None if none available
    """
    query = select(Topic).where(
        Topic.source == TopicSource.SEED,
        Topic.status == TopicStatus.PENDING,
    )

    if exclude_categories:
        query = query.where(Topic.category.not_in(exclude_categories))

    # Random selection
    query = query.order_by(func.random()).limit(1)

    result = await db.execute(query)
    return result.scalar_one_or_none()


async def select_debate_models(
    db: AsyncSession,
    topic_id: uuid.UUID,
    exclude_model_ids: set[uuid.UUID] | None = None,
) -> tuple[Model, Model, Model, Model] | None:
    """
    Select models for a debate: debater_pro, debater_con, judge, auditor.

    Rules:
    - All four must be different
    - Avoid repeating exact matchup within MATCHUP_COOLDOWN_DAYS
    - Auditor should prefer models with high judge scores
    - Exclude any models in exclude_model_ids (e.g., those excused due to content filters)
    """
    # Get all active models, excluding any that were explicitly excluded
    query = select(Model).where(Model.is_active == True)
    if exclude_model_ids:
        query = query.where(Model.id.not_in(exclude_model_ids))

    result = await db.execute(query)
    models = list(result.scalars().all())

    if len(models) < 3:
        logger.error(f"Not enough active models: {len(models)} < 3")
        return None

    # Allow auditor to reuse a model if we only have 3
    allow_auditor_reuse = len(models) < 4

    # Get recent matchups to avoid
    cutoff = datetime.utcnow() - timedelta(days=MATCHUP_COOLDOWN_DAYS)
    recent_debates = await db.execute(
        select(Debate)
        .where(Debate.created_at >= cutoff)
    )
    recent_matchups = set()
    for debate in recent_debates.scalars():
        # Store matchups as frozensets so order doesn't matter
        matchup = frozenset([debate.debater_pro_id, debate.debater_con_id])
        recent_matchups.add(matchup)

    # Try to find a valid combination
    max_attempts = 50
    for _ in range(max_attempts):
        # Shuffle models for random selection
        shuffled = models.copy()
        random.shuffle(shuffled)

        debater_pro = shuffled[0]
        debater_con = shuffled[1]

        # Check if this matchup was recent
        matchup = frozenset([debater_pro.id, debater_con.id])
        if matchup in recent_matchups:
            continue

        # Select judge (different from debaters)
        judge_candidates = [m for m in shuffled[2:]]
        if not judge_candidates:
            continue
        judge = judge_candidates[0]

        # Select auditor (different from judge, prefer high judge scores)
        # If we only have 3 models, allow auditor to be same as a debater
        if allow_auditor_reuse:
            auditor_candidates = [
                m for m in shuffled
                if m.id != judge.id  # Just not the judge
            ]
        else:
            auditor_candidates = [
                m for m in shuffled
                if m.id not in (debater_pro.id, debater_con.id, judge.id)
            ]
        if not auditor_candidates:
            continue

        # Sort by avg_judge_score descending (None values last)
        auditor_candidates.sort(
            key=lambda m: m.avg_judge_score if m.avg_judge_score is not None else -1,
            reverse=True,
        )
        auditor = auditor_candidates[0]

        return (debater_pro, debater_con, judge, auditor)

    # If we couldn't avoid recent matchups, just pick randomly
    logger.warning("Could not avoid recent matchups, selecting randomly")
    random.shuffle(models)
    if len(models) >= 4:
        return (models[0], models[1], models[2], models[3])
    else:
        # With 3 models, auditor reuses one of the debaters
        return (models[0], models[1], models[2], models[0])


async def get_topic_stats(db: AsyncSession) -> dict:
    """Get statistics about topics for admin dashboard."""
    # Backlog remaining (seed topics pending)
    backlog_result = await db.execute(
        select(func.count())
        .select_from(Topic)
        .where(
            Topic.source == TopicSource.SEED,
            Topic.status == TopicStatus.PENDING,
        )
    )
    backlog_remaining = backlog_result.scalar() or 0

    # User submissions pending
    user_pending_result = await db.execute(
        select(func.count())
        .select_from(Topic)
        .where(
            Topic.source == TopicSource.USER,
            Topic.status == TopicStatus.PENDING,
        )
    )
    user_pending = user_pending_result.scalar() or 0

    # User submissions with enough votes
    user_qualified_result = await db.execute(
        select(func.count())
        .select_from(Topic)
        .where(
            Topic.source == TopicSource.USER,
            Topic.status == TopicStatus.PENDING,
            Topic.vote_count >= MIN_USER_VOTES,
        )
    )
    user_qualified = user_qualified_result.scalar() or 0

    # Total debated
    debated_result = await db.execute(
        select(func.count())
        .select_from(Topic)
        .where(Topic.status == TopicStatus.DEBATED)
    )
    total_debated = debated_result.scalar() or 0

    # Category breakdown of backlog
    category_result = await db.execute(
        select(Topic.category, func.count())
        .where(
            Topic.source == TopicSource.SEED,
            Topic.status == TopicStatus.PENDING,
        )
        .group_by(Topic.category)
    )
    categories = {row[0]: row[1] for row in category_result}

    # Estimated days of backlog remaining (5 debates per day)
    days_remaining = backlog_remaining / 5 if backlog_remaining > 0 else 0

    return {
        "backlog_remaining": backlog_remaining,
        "user_pending": user_pending,
        "user_qualified": user_qualified,
        "total_debated": total_debated,
        "days_remaining": round(days_remaining, 1),
        "categories": categories,
        "min_votes_required": MIN_USER_VOTES,
        "topic_selection_mode": get_settings().topic_selection_mode,
    }


# Global scheduler instance
_scheduler: DebateScheduler | None = None


def get_scheduler() -> DebateScheduler:
    """Get or create the global scheduler instance."""
    global _scheduler
    if _scheduler is None:
        _scheduler = DebateScheduler()
    return _scheduler


def start_scheduler():
    """Start the global scheduler."""
    scheduler = get_scheduler()
    scheduler.start()


def stop_scheduler():
    """Stop the global scheduler."""
    global _scheduler
    if _scheduler:
        _scheduler.stop()
        _scheduler = None
