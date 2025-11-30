import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.models import Debate, DebateStatus, Model, Vote
from app.schemas.vote import (
    DebateVoteRequest,
    DebateVoteResponse,
    DebateVoteTallyResponse,
    ModelVoteTally,
)

router = APIRouter(prefix="/api/debates", tags=["votes"])


@router.post("/{debate_id}/vote", response_model=DebateVoteResponse)
async def vote_on_debate(
    debate_id: uuid.UUID,
    body: DebateVoteRequest,
    db: AsyncSession = Depends(get_db),
) -> DebateVoteResponse:
    """
    Vote for who you think won the debate.

    - Only allowed on completed debates
    - One vote per fingerprint per debate
    - model_id must be one of the debaters (pro or con)
    """
    # Get the debate
    result = await db.execute(
        select(Debate)
        .options(
            selectinload(Debate.debater_pro),
            selectinload(Debate.debater_con),
        )
        .where(Debate.id == debate_id)
    )
    debate = result.scalar_one_or_none()

    if debate is None:
        raise HTTPException(status_code=404, detail="Debate not found")

    if debate.status != DebateStatus.COMPLETED:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot vote on debate with status: {debate.status.value}",
        )

    # Validate model_id is one of the debaters
    if body.model_id not in (debate.debater_pro_id, debate.debater_con_id):
        raise HTTPException(
            status_code=400,
            detail="model_id must be one of the debate participants",
        )

    # Check for existing vote from same fingerprint
    existing_vote = await db.execute(
        select(Vote).where(
            Vote.debate_id == debate_id,
            Vote.user_fingerprint == body.fingerprint,
        )
    )
    if existing_vote.scalar_one_or_none() is not None:
        return DebateVoteResponse(
            voted=False,
            message="You have already voted on this debate",
            voted_for_id=None,
            voted_for_name=None,
        )

    # Get the model being voted for
    voted_for = (
        debate.debater_pro
        if body.model_id == debate.debater_pro_id
        else debate.debater_con
    )

    # Create vote
    vote = Vote(
        id=uuid.uuid4(),
        topic_id=None,
        debate_id=debate_id,
        voted_for_id=body.model_id,
        user_fingerprint=body.fingerprint,
        user_id=None,
        ip_address=body.ip_address,
        created_at=datetime.utcnow(),
    )
    db.add(vote)
    await db.flush()

    return DebateVoteResponse(
        voted=True,
        message="Vote recorded successfully",
        voted_for_id=voted_for.id,
        voted_for_name=voted_for.name,
    )


@router.get("/{debate_id}/votes", response_model=DebateVoteTallyResponse)
async def get_debate_votes(
    debate_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
) -> DebateVoteTallyResponse:
    """
    Get vote tallies for a debate.

    Returns:
    - Total votes
    - Votes for pro and con models
    - Percentage agreement with judge's decision
    """
    # Get the debate
    result = await db.execute(
        select(Debate)
        .options(
            selectinload(Debate.debater_pro),
            selectinload(Debate.debater_con),
        )
        .where(Debate.id == debate_id)
    )
    debate = result.scalar_one_or_none()

    if debate is None:
        raise HTTPException(status_code=404, detail="Debate not found")

    # Count votes for each model
    pro_votes_result = await db.execute(
        select(func.count())
        .select_from(Vote)
        .where(
            Vote.debate_id == debate_id,
            Vote.voted_for_id == debate.debater_pro_id,
        )
    )
    pro_votes = pro_votes_result.scalar() or 0

    con_votes_result = await db.execute(
        select(func.count())
        .select_from(Vote)
        .where(
            Vote.debate_id == debate_id,
            Vote.voted_for_id == debate.debater_con_id,
        )
    )
    con_votes = con_votes_result.scalar() or 0

    total_votes = pro_votes + con_votes

    # Calculate percentages
    pro_percentage = (pro_votes / total_votes * 100) if total_votes > 0 else 0.0
    con_percentage = (con_votes / total_votes * 100) if total_votes > 0 else 0.0

    # Calculate agreement with judge
    agreement_with_judge = None
    if debate.winner_id is not None and total_votes > 0:
        if debate.winner_id == debate.debater_pro_id:
            agreement_with_judge = pro_percentage
        else:
            agreement_with_judge = con_percentage

    return DebateVoteTallyResponse(
        debate_id=debate_id,
        total_votes=total_votes,
        pro_votes=pro_votes,
        con_votes=con_votes,
        pro_model=ModelVoteTally(
            model_id=debate.debater_pro_id,
            model_name=debate.debater_pro.name,
            position="pro",
            votes=pro_votes,
            percentage=round(pro_percentage, 1),
        ),
        con_model=ModelVoteTally(
            model_id=debate.debater_con_id,
            model_name=debate.debater_con.name,
            position="con",
            votes=con_votes,
            percentage=round(con_percentage, 1),
        ),
        judge_winner_id=debate.winner_id,
        agreement_with_judge=(
            round(agreement_with_judge, 1) if agreement_with_judge is not None else None
        ),
    )
