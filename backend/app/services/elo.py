import logging
import uuid
from dataclasses import dataclass

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models import Debate, DebateStatus, Model

logger = logging.getLogger(__name__)


@dataclass
class EloUpdate:
    """Result of an Elo update."""

    winner_id: uuid.UUID
    winner_name: str
    winner_old_elo: int
    winner_new_elo: int
    loser_id: uuid.UUID
    loser_name: str
    loser_old_elo: int
    loser_new_elo: int

    @property
    def winner_change(self) -> int:
        return self.winner_new_elo - self.winner_old_elo

    @property
    def loser_change(self) -> int:
        return self.loser_new_elo - self.loser_old_elo


def calculate_new_elos(
    winner_elo: int,
    loser_elo: int,
    k: int = 32,
) -> tuple[int, int]:
    """
    Calculate new Elo ratings after a match.

    Uses the standard Elo formula:
    - Expected score = 1 / (1 + 10^((opponent_elo - player_elo) / 400))
    - New rating = old_rating + K * (actual_score - expected_score)

    Args:
        winner_elo: Current Elo rating of the winner
        loser_elo: Current Elo rating of the loser
        k: K-factor (volatility). Default 32 for new players.

    Returns:
        Tuple of (new_winner_elo, new_loser_elo)
    """
    # Calculate expected scores
    expected_winner = 1 / (1 + 10 ** ((loser_elo - winner_elo) / 400))
    expected_loser = 1 - expected_winner

    # Calculate new ratings
    # Winner gets actual score of 1, loser gets 0
    new_winner_elo = winner_elo + k * (1 - expected_winner)
    new_loser_elo = loser_elo + k * (0 - expected_loser)

    return round(new_winner_elo), round(new_loser_elo)


async def update_elos_for_debate(
    db_session: AsyncSession,
    debate_id: uuid.UUID,
) -> EloUpdate:
    """
    Update Elo ratings for both debaters after a debate.

    Args:
        db_session: The database session
        debate_id: The ID of the completed debate

    Returns:
        EloUpdate with old and new ratings for both models

    Raises:
        ValueError: If debate not found, not completed, or no winner
    """
    # Load debate with related models
    result = await db_session.execute(
        select(Debate)
        .options(
            selectinload(Debate.debater_pro),
            selectinload(Debate.debater_con),
            selectinload(Debate.winner),
        )
        .where(Debate.id == debate_id)
    )
    debate = result.scalar_one_or_none()

    if debate is None:
        raise ValueError(f"Debate not found: {debate_id}")

    if debate.status != DebateStatus.COMPLETED:
        raise ValueError(f"Debate {debate_id} is not completed (status: {debate.status})")

    if debate.winner_id is None:
        raise ValueError(f"Debate {debate_id} has no winner")

    # Determine winner and loser
    if debate.winner_id == debate.debater_pro_id:
        winner = debate.debater_pro
        loser = debate.debater_con
    else:
        winner = debate.debater_con
        loser = debate.debater_pro

    # Store old Elos
    winner_old_elo = winner.elo_rating
    loser_old_elo = loser.elo_rating

    # Calculate new Elos
    new_winner_elo, new_loser_elo = calculate_new_elos(winner_old_elo, loser_old_elo)

    # Update models
    winner.elo_rating = new_winner_elo
    winner.debates_won += 1

    loser.elo_rating = new_loser_elo
    loser.debates_lost += 1

    # Store Elo changes on the debate record
    if debate.winner_id == debate.debater_pro_id:
        debate.pro_elo_before = winner_old_elo
        debate.pro_elo_after = new_winner_elo
        debate.con_elo_before = loser_old_elo
        debate.con_elo_after = new_loser_elo
    else:
        debate.pro_elo_before = loser_old_elo
        debate.pro_elo_after = new_loser_elo
        debate.con_elo_before = winner_old_elo
        debate.con_elo_after = new_winner_elo

    await db_session.flush()

    elo_update = EloUpdate(
        winner_id=winner.id,
        winner_name=winner.name,
        winner_old_elo=winner_old_elo,
        winner_new_elo=new_winner_elo,
        loser_id=loser.id,
        loser_name=loser.name,
        loser_old_elo=loser_old_elo,
        loser_new_elo=new_loser_elo,
    )

    logger.info(
        f"Elo update: {winner.name} {winner_old_elo} -> {new_winner_elo} (+{elo_update.winner_change}), "
        f"{loser.name} {loser_old_elo} -> {new_loser_elo} ({elo_update.loser_change})"
    )

    return elo_update
