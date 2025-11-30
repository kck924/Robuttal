"""Authentication API endpoints for user management."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime
import uuid

from ..database import get_db
from ..models.user import User
from ..models.topic import Topic
from ..models.vote import Vote
from ..models.debate import Debate
from ..models.model import Model
from .models import generate_slug

router = APIRouter(prefix="/api/auth", tags=["auth"])


class UserCreate(BaseModel):
    """Schema for creating/updating a user from OAuth."""
    email: EmailStr
    name: str
    provider: str
    provider_id: str


class UserResponse(BaseModel):
    """Schema for user response."""
    id: str
    email: str
    name: str
    provider: str
    created_at: str

    class Config:
        from_attributes = True


@router.post("/user", response_model=UserResponse)
async def create_or_update_user(
    user_data: UserCreate,
    db: AsyncSession = Depends(get_db)
):
    """
    Create a new user or update existing user on OAuth sign in.
    Called by NextAuth on successful authentication.
    """
    # Check if user already exists by provider + provider_id
    result = await db.execute(
        select(User).where(
            User.provider == user_data.provider,
            User.provider_id == user_data.provider_id
        )
    )
    existing_user = result.scalar_one_or_none()

    if existing_user:
        # Update existing user's info (name might change)
        existing_user.name = user_data.name
        existing_user.email = user_data.email
        await db.commit()
        await db.refresh(existing_user)
        return UserResponse(
            id=str(existing_user.id),
            email=existing_user.email,
            name=existing_user.name,
            provider=existing_user.provider,
            created_at=existing_user.created_at.isoformat()
        )

    # Check if user exists by email (might have signed up with different provider)
    result = await db.execute(
        select(User).where(User.email == user_data.email)
    )
    existing_by_email = result.scalar_one_or_none()

    if existing_by_email:
        # User exists with this email but different provider
        # Update to use new provider (or you could reject this)
        existing_by_email.provider = user_data.provider
        existing_by_email.provider_id = user_data.provider_id
        existing_by_email.name = user_data.name
        await db.commit()
        await db.refresh(existing_by_email)
        return UserResponse(
            id=str(existing_by_email.id),
            email=existing_by_email.email,
            name=existing_by_email.name,
            provider=existing_by_email.provider,
            created_at=existing_by_email.created_at.isoformat()
        )

    # Create new user
    new_user = User(
        id=uuid.uuid4(),
        email=user_data.email,
        name=user_data.name,
        provider=user_data.provider,
        provider_id=user_data.provider_id
    )
    db.add(new_user)
    await db.commit()
    await db.refresh(new_user)

    return UserResponse(
        id=str(new_user.id),
        email=new_user.email,
        name=new_user.name,
        provider=new_user.provider,
        created_at=new_user.created_at.isoformat()
    )


@router.get("/user/{email}", response_model=Optional[UserResponse])
async def get_user_by_email(
    email: str,
    db: AsyncSession = Depends(get_db)
):
    """Get a user by email address."""
    result = await db.execute(
        select(User).where(User.email == email)
    )
    user = result.scalar_one_or_none()

    if not user:
        return None

    return UserResponse(
        id=str(user.id),
        email=user.email,
        name=user.name,
        provider=user.provider,
        created_at=user.created_at.isoformat()
    )


class TopicStats(BaseModel):
    """Statistics about user's topics."""
    total_submitted: int
    total_votes_received: int
    topics_debated: int
    topics_pending: int
    topics_approved: int


class VoteStats(BaseModel):
    """Statistics about user's voting activity."""
    total_topic_votes: int
    total_debate_votes: int


class UserTopicSummary(BaseModel):
    """Summary of a user's topic."""
    id: str
    title: str
    category: str
    status: str
    vote_count: int
    created_at: str
    debated_at: Optional[str]
    debate_id: Optional[str]  # ID of the debate if this topic was debated


class VotedDebateSummary(BaseModel):
    """Summary of a debate the user voted on."""
    id: str
    topic_title: str
    pro_name: str
    con_name: str
    winner_name: Optional[str]
    user_vote_for: str  # Name of model the user voted for
    completed_at: Optional[str]


class UserDebatedTopicSummary(BaseModel):
    """Detailed summary of a user's topic that has been debated."""
    id: str  # debate id
    topic_id: str
    topic_title: str
    pro_name: str
    pro_slug: str
    con_name: str
    con_slug: str
    winner_name: Optional[str]
    winner_slug: Optional[str]
    pro_score: Optional[int]
    con_score: Optional[int]
    completed_at: Optional[str]


class UserProfileResponse(BaseModel):
    """Full profile response with stats."""
    id: str
    email: str
    name: str
    provider: str
    created_at: str
    topic_stats: TopicStats
    vote_stats: VoteStats
    recent_topics: List[UserTopicSummary]
    debated_topics: List[UserDebatedTopicSummary]  # User's topics that have been debated
    voted_debates: List[VotedDebateSummary]


@router.get("/profile/{email}", response_model=Optional[UserProfileResponse])
async def get_user_profile(
    email: str,
    db: AsyncSession = Depends(get_db)
):
    """Get a user's full profile with stats."""
    # Get user (may not exist if they haven't been synced via OAuth)
    result = await db.execute(
        select(User).where(User.email == email)
    )
    user = result.scalar_one_or_none()

    # If no user record, create a minimal profile response based on topics
    # This handles cases where users submit topics before OAuth creates their User record
    user_id = user.id if user else None
    user_name = user.name if user else email.split('@')[0]
    user_provider = user.provider if user else "unknown"
    user_created_at = user.created_at.isoformat() if user else None

    # Get topic stats
    topics_result = await db.execute(
        select(Topic).where(Topic.submitted_by == email)
    )
    user_topics = topics_result.scalars().all()

    total_submitted = len(user_topics)
    total_votes_received = sum(t.vote_count for t in user_topics)
    topics_debated = sum(1 for t in user_topics if t.status == 'debated')
    topics_pending = sum(1 for t in user_topics if t.status == 'pending')
    topics_approved = sum(1 for t in user_topics if t.status == 'approved')

    # Get vote stats (only if user exists in DB)
    total_topic_votes = 0
    total_debate_votes = 0
    if user_id:
        topic_votes_result = await db.execute(
            select(func.count()).select_from(Vote).where(
                Vote.user_id == user_id,
                Vote.topic_id.isnot(None)
            )
        )
        total_topic_votes = topic_votes_result.scalar() or 0

        debate_votes_result = await db.execute(
            select(func.count()).select_from(Vote).where(
                Vote.user_id == user_id,
                Vote.debate_id.isnot(None)
            )
        )
        total_debate_votes = debate_votes_result.scalar() or 0

    # Get recent topics (most recent 5)
    recent_topics = sorted(user_topics, key=lambda t: t.created_at, reverse=True)[:5]

    # Get debate IDs for topics that have been debated
    topic_ids = [t.id for t in recent_topics]
    debates_by_topic = {}
    if topic_ids:
        debates_result = await db.execute(
            select(Debate).where(Debate.topic_id.in_(topic_ids))
        )
        for debate in debates_result.scalars().all():
            debates_by_topic[debate.topic_id] = str(debate.id)

    # Get user's debated topics with full debate details
    from sqlalchemy.orm import selectinload
    debated_topic_ids = [t.id for t in user_topics if t.status == 'debated' or (hasattr(t.status, 'value') and t.status.value == 'debated')]
    debated_topics_list = []
    if debated_topic_ids:
        debated_debates_result = await db.execute(
            select(Debate)
            .options(
                selectinload(Debate.topic),
                selectinload(Debate.debater_pro),
                selectinload(Debate.debater_con),
                selectinload(Debate.winner),
            )
            .where(Debate.topic_id.in_(debated_topic_ids))
            .order_by(Debate.completed_at.desc())
        )
        for debate in debated_debates_result.scalars().all():
            debated_topics_list.append(
                UserDebatedTopicSummary(
                    id=str(debate.id),
                    topic_id=str(debate.topic_id),
                    topic_title=debate.topic.title if debate.topic else "Unknown Topic",
                    pro_name=debate.debater_pro.name if debate.debater_pro else "Unknown",
                    pro_slug=generate_slug(debate.debater_pro.name) if debate.debater_pro else "",
                    con_name=debate.debater_con.name if debate.debater_con else "Unknown",
                    con_slug=generate_slug(debate.debater_con.name) if debate.debater_con else "",
                    winner_name=debate.winner.name if debate.winner else None,
                    winner_slug=generate_slug(debate.winner.name) if debate.winner else None,
                    pro_score=debate.pro_score,
                    con_score=debate.con_score,
                    completed_at=debate.completed_at.isoformat() if debate.completed_at else None,
                )
            )

    # Get debates the user has voted on (most recent 5, only if user exists)
    voted_debates_list = []
    if user_id:
        voted_debates_result = await db.execute(
            select(Vote)
            .options(
                selectinload(Vote.debate).selectinload(Debate.topic),
                selectinload(Vote.debate).selectinload(Debate.debater_pro),
                selectinload(Vote.debate).selectinload(Debate.debater_con),
                selectinload(Vote.debate).selectinload(Debate.winner),
                selectinload(Vote.voted_for)
            )
            .where(
                Vote.user_id == user_id,
                Vote.debate_id.isnot(None)
            )
            .order_by(Vote.created_at.desc())
            .limit(5)
        )
        user_debate_votes = voted_debates_result.scalars().all()

        for vote in user_debate_votes:
            if vote.debate:
                voted_debates_list.append(
                    VotedDebateSummary(
                        id=str(vote.debate.id),
                        topic_title=vote.debate.topic.title if vote.debate.topic else "Unknown Topic",
                        pro_name=vote.debate.debater_pro.name if vote.debate.debater_pro else "Unknown",
                        con_name=vote.debate.debater_con.name if vote.debate.debater_con else "Unknown",
                        winner_name=vote.debate.winner.name if vote.debate.winner else None,
                        user_vote_for=vote.voted_for.name if vote.voted_for else "Unknown",
                        completed_at=vote.debate.completed_at.isoformat() if vote.debate.completed_at else None,
                    )
                )

    return UserProfileResponse(
        id=str(user_id) if user_id else email,
        email=email,
        name=user_name,
        provider=user_provider,
        created_at=user_created_at or datetime.utcnow().isoformat(),
        topic_stats=TopicStats(
            total_submitted=total_submitted,
            total_votes_received=total_votes_received,
            topics_debated=topics_debated,
            topics_pending=topics_pending,
            topics_approved=topics_approved,
        ),
        vote_stats=VoteStats(
            total_topic_votes=total_topic_votes,
            total_debate_votes=total_debate_votes,
        ),
        recent_topics=[
            UserTopicSummary(
                id=str(t.id),
                title=t.title,
                category=t.category,
                status=t.status.value if hasattr(t.status, 'value') else t.status,
                vote_count=t.vote_count,
                created_at=t.created_at.isoformat(),
                debated_at=t.debated_at.isoformat() if t.debated_at else None,
                debate_id=debates_by_topic.get(t.id),
            )
            for t in recent_topics
        ],
        debated_topics=debated_topics_list,
        voted_debates=voted_debates_list,
    )
