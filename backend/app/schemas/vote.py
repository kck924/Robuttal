from uuid import UUID

from pydantic import BaseModel, Field


class DebateVoteRequest(BaseModel):
    """Request body for voting on a debate outcome."""

    model_id: UUID = Field(..., description="ID of the model the user thinks won")
    fingerprint: str = Field(..., min_length=1, max_length=255)
    ip_address: str = Field(..., min_length=1, max_length=45)


class DebateVoteResponse(BaseModel):
    """Response after voting on a debate."""

    voted: bool
    message: str
    voted_for_id: UUID | None = None
    voted_for_name: str | None = None


class ModelVoteTally(BaseModel):
    """Vote tally for a single model in a debate."""

    model_id: UUID
    model_name: str
    position: str  # "pro" or "con"
    votes: int
    percentage: float


class DebateVoteTallyResponse(BaseModel):
    """Vote tallies for a debate."""

    debate_id: UUID
    total_votes: int
    pro_votes: int
    con_votes: int
    pro_model: ModelVoteTally
    con_model: ModelVoteTally
    judge_winner_id: UUID | None
    agreement_with_judge: float | None  # Percentage of votes agreeing with judge
