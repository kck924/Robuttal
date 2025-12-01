import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models import Debate, Topic, TopicSource, TopicStatus, Vote
from app.schemas.topic import (
    TaxonomyDomain,
    TaxonomyResponse,
    TaxonomySubdomain,
    TopicCreate,
    TopicListResponse,
    TopicResponse,
    TopicVoteRequest,
    TopicVoteResponse,
)
from app.services.categorizer import categorize_topic
from app.taxonomy import get_taxonomy_tree

router = APIRouter(prefix="/api/topics", tags=["topics"])


@router.get("", response_model=TopicListResponse)
async def list_topics(
    status: TopicStatus = Query(default=TopicStatus.PENDING),
    submitted_by: str | None = Query(default=None),
    search: str | None = Query(default=None, min_length=2, max_length=100),
    category: str | None = Query(default=None),
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    db: AsyncSession = Depends(get_db),
) -> TopicListResponse:
    """
    List topics with pagination and search.

    - **status**: Filter by topic status (default: pending)
    - **submitted_by**: Filter by submitter email (for "Your Topics" view)
    - **search**: Search topics by title (case-insensitive, min 2 chars)
    - **category**: Filter by category/subdomain
    - **limit**: Number of topics to return (1-100)
    - **offset**: Number of topics to skip

    Topics are sorted by vote_count descending, then randomly for equal votes.
    """
    # Build query
    query = select(Topic)

    # When filtering by submitter, show all statuses by default
    # Otherwise, filter by the specified status
    if submitted_by:
        query = query.where(Topic.submitted_by == submitted_by)
        # Only apply status filter if explicitly requested (not the default)
        if status != TopicStatus.PENDING:
            query = query.where(Topic.status == status)
    else:
        query = query.where(Topic.status == status)

    # Apply search filter (case-insensitive)
    if search:
        query = query.where(Topic.title.ilike(f"%{search}%"))

    # Apply category filter
    if category:
        query = query.where(Topic.category == category)

    # Get total count
    count_query = select(func.count()).select_from(query.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0

    # Apply ordering and pagination
    # Use random() as tiebreaker for topics with same vote count
    # This ensures seeded topics (all vote_count=0) appear in random order
    query = (
        query.order_by(Topic.vote_count.desc(), func.random())
        .offset(offset)
        .limit(limit)
    )

    result = await db.execute(query)
    topics = result.scalars().all()

    # Fetch debate IDs for debated topics
    debated_topic_ids = [t.id for t in topics if t.status == TopicStatus.DEBATED]
    debates_by_topic = {}
    if debated_topic_ids:
        debates_result = await db.execute(
            select(Debate).where(Debate.topic_id.in_(debated_topic_ids))
        )
        for debate in debates_result.scalars().all():
            debates_by_topic[debate.topic_id] = debate.id

    # Build responses with debate IDs
    topic_responses = []
    for t in topics:
        response = TopicResponse.model_validate(t)
        response.debate_id = debates_by_topic.get(t.id)
        topic_responses.append(response)

    return TopicListResponse(
        topics=topic_responses,
        total=total,
        limit=limit,
        offset=offset,
    )


@router.get("/taxonomy", response_model=TaxonomyResponse)
async def get_taxonomy() -> TaxonomyResponse:
    """
    Get the full taxonomy tree for topic categorization.

    Returns all domains and their subdomains for display in filters/navigation.
    """
    tree = get_taxonomy_tree()
    domains = []

    for domain, subdomain_infos in tree.items():
        subdomains = [
            TaxonomySubdomain(
                subdomain=info.subdomain.value,
                domain=info.domain.value,
                description=info.description,
            )
            for info in subdomain_infos
        ]
        domains.append(TaxonomyDomain(domain=domain.value, subdomains=subdomains))

    return TaxonomyResponse(domains=domains)


@router.post("", response_model=TopicResponse, status_code=201)
async def create_topic(
    body: TopicCreate,
    db: AsyncSession = Depends(get_db),
) -> TopicResponse:
    """
    Submit a new debate topic.

    The topic will be automatically categorized using AI.

    - **title**: The debate proposition (10-500 characters)
    - **submitted_by**: Username or email of submitter
    """
    # Auto-categorize the topic
    subdomain, domain, confidence = await categorize_topic(body.title)

    topic = Topic(
        id=uuid.uuid4(),
        title=body.title,
        subdomain=subdomain.value,
        domain=domain.value,
        category=subdomain.value,  # Legacy field
        source=TopicSource.USER,
        submitted_by=body.submitted_by,
        vote_count=0,
        status=TopicStatus.PENDING,
        created_at=datetime.utcnow(),
        debated_at=None,
    )

    db.add(topic)
    await db.flush()
    await db.refresh(topic)

    return TopicResponse.model_validate(topic)


@router.post("/{topic_id}/vote", response_model=TopicVoteResponse)
async def vote_for_topic(
    topic_id: uuid.UUID,
    body: TopicVoteRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
) -> TopicVoteResponse:
    """
    Vote for a topic to be debated.

    Each fingerprint can only vote once per topic.

    - **fingerprint**: Browser fingerprint for vote limiting
    - **ip_address**: Client IP address (optional, extracted from request if not provided)
    """
    # Extract IP from request if not provided
    ip_address = body.ip_address
    if not ip_address:
        # Check for forwarded IP (from reverse proxy)
        forwarded = request.headers.get("x-forwarded-for")
        if forwarded:
            ip_address = forwarded.split(",")[0].strip()
        else:
            ip_address = request.client.host if request.client else "unknown"

    # Get the topic
    result = await db.execute(select(Topic).where(Topic.id == topic_id))
    topic = result.scalar_one_or_none()

    if topic is None:
        raise HTTPException(status_code=404, detail="Topic not found")

    # Allow voting on pending and approved topics (not selected/debated/rejected)
    if topic.status not in (TopicStatus.PENDING, TopicStatus.APPROVED):
        raise HTTPException(
            status_code=400,
            detail=f"Cannot vote on topic with status: {topic.status.value}",
        )

    # Check for existing vote from same fingerprint
    existing_vote = await db.execute(
        select(Vote).where(
            Vote.topic_id == topic_id,
            Vote.user_fingerprint == body.fingerprint,
        )
    )
    if existing_vote.scalar_one_or_none() is not None:
        return TopicVoteResponse(
            topic=TopicResponse.model_validate(topic),
            voted=False,
            message="You have already voted for this topic",
        )

    # Create vote
    vote = Vote(
        id=uuid.uuid4(),
        topic_id=topic_id,
        debate_id=None,
        voted_for_id=None,
        user_fingerprint=body.fingerprint,
        user_id=None,
        ip_address=ip_address,
        created_at=datetime.utcnow(),
    )
    db.add(vote)

    # Increment vote count
    topic.vote_count += 1

    await db.flush()
    await db.refresh(topic)

    return TopicVoteResponse(
        topic=TopicResponse.model_validate(topic),
        voted=True,
        message="Vote recorded successfully",
    )


@router.get("/{topic_id}", response_model=TopicResponse)
async def get_topic(
    topic_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
) -> TopicResponse:
    """Get a single topic by ID."""
    result = await db.execute(select(Topic).where(Topic.id == topic_id))
    topic = result.scalar_one_or_none()

    if topic is None:
        raise HTTPException(status_code=404, detail="Topic not found")

    return TopicResponse.model_validate(topic)
