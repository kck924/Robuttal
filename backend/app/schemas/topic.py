from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from app.models.enums import TopicSource, TopicStatus
from app.taxonomy import Domain, Subdomain


class TopicResponse(BaseModel):
    """Topic response model."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    title: str
    subdomain: str
    domain: str
    category: str  # Legacy field, same as subdomain for new topics
    source: TopicSource
    submitted_by: str | None
    vote_count: int
    status: TopicStatus
    created_at: datetime
    debated_at: datetime | None
    debate_id: UUID | None = None  # ID of the debate if this topic was debated


class TopicCreate(BaseModel):
    """Request body for creating a topic.

    Note: category/subdomain/domain are auto-assigned by the system.
    Users only need to provide the title and their identifier.
    """

    title: str = Field(..., min_length=10, max_length=500)
    submitted_by: str = Field(..., min_length=1, max_length=255)


class TaxonomySubdomain(BaseModel):
    """Subdomain info for taxonomy endpoint."""

    subdomain: str
    domain: str
    description: str


class TaxonomyDomain(BaseModel):
    """Domain with its subdomains for taxonomy endpoint."""

    domain: str
    subdomains: list[TaxonomySubdomain]


class TaxonomyResponse(BaseModel):
    """Full taxonomy tree response."""

    domains: list[TaxonomyDomain]


class TopicVoteRequest(BaseModel):
    """Request body for voting on a topic."""

    fingerprint: str = Field(..., min_length=1, max_length=255)
    ip_address: str = Field(default="", max_length=45)  # Optional, backend extracts from request


class TopicListResponse(BaseModel):
    """Paginated list of topics."""

    topics: list[TopicResponse]
    total: int
    limit: int
    offset: int


class TopicVoteResponse(BaseModel):
    """Response after voting on a topic."""

    topic: TopicResponse
    voted: bool
    message: str
