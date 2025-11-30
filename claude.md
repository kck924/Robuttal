# Robuttal - AI Debate Arena

## Project Overview

Robuttal is an automated AI debate platform where language models compete head-to-head on user-submitted topics. A judge model scores each debate, and a meta-judge audits the judging quality. The system runs 5 debates per day, tracks Elo ratings, and allows users to vote on topics and debate outcomes.

## Tech Stack

- **Backend**: Python 3.11+, FastAPI, SQLAlchemy, APScheduler
- **Database**: PostgreSQL (Supabase or local)
- **Frontend**: Next.js 14, React, TailwindCSS
- **Auth**: NextAuth.js (Google OAuth), Fingerprint.js for vote limiting
- **Deployment**: Backend on Railway/Render, Frontend on Vercel
- **AI Providers**: Anthropic, OpenAI, Google, Mistral, xAI

## Project Structure

```
robuttal/
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py                 # FastAPI app entry
│   │   ├── config.py               # Environment config
│   │   ├── database.py             # SQLAlchemy setup
│   │   ├── models/                 # SQLAlchemy models
│   │   │   ├── __init__.py
│   │   │   ├── debate.py
│   │   │   ├── topic.py
│   │   │   ├── model.py
│   │   │   ├── transcript.py
│   │   │   ├── vote.py
│   │   │   └── user.py
│   │   ├── schemas/                # Pydantic schemas
│   │   │   ├── __init__.py
│   │   │   ├── debate.py
│   │   │   ├── topic.py
│   │   │   └── model.py
│   │   ├── api/                    # API routes
│   │   │   ├── __init__.py
│   │   │   ├── debates.py
│   │   │   ├── topics.py
│   │   │   ├── models.py
│   │   │   └── votes.py
│   │   ├── services/               # Business logic
│   │   │   ├── __init__.py
│   │   │   ├── orchestrator.py     # Debate orchestration
│   │   │   ├── judge.py            # Judging logic
│   │   │   ├── elo.py              # Elo calculations
│   │   │   └── scheduler.py        # Cron job management
│   │   └── providers/              # AI model adapters
│   │       ├── __init__.py
│   │       ├── base.py             # Abstract base class
│   │       ├── anthropic.py
│   │       ├── openai.py
│   │       ├── google.py
│   │       └── mistral.py
│   ├── tests/
│   ├── alembic/                    # Database migrations
│   ├── requirements.txt
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── app/                    # Next.js app router
│   │   ├── components/
│   │   └── lib/
│   ├── package.json
│   └── tailwind.config.js
└── README.md
```

## Database Schema

### models
- id (UUID, PK)
- name (string) - e.g., "Claude Sonnet 4"
- provider (string) - e.g., "anthropic"
- api_model_id (string) - e.g., "claude-sonnet-4-20250514"
- elo_rating (int, default 1500)
- debates_won (int)
- debates_lost (int)
- times_judged (int)
- avg_judge_score (float)
- is_active (bool)
- created_at (timestamp)

### topics
- id (UUID, PK)
- title (string) - The debate proposition
- category (string) - Ethics, Technology, Philosophy, etc.
- source (enum) - seed, user
- submitted_by (string, nullable) - Username or email (null for seeded)
- vote_count (int, default 0)
- status (enum) - pending, selected, debated, rejected
- created_at (timestamp)
- debated_at (timestamp, nullable)

### debates
- id (UUID, PK)
- topic_id (FK)
- debater_pro_id (FK to models)
- debater_con_id (FK to models)
- judge_id (FK to models)
- auditor_id (FK to models)
- winner_id (FK to models, nullable)
- pro_score (int, nullable)
- con_score (int, nullable)
- judge_score (float, nullable) - Meta-judge rating of judge performance
- status (enum) - scheduled, in_progress, judging, completed
- scheduled_at (timestamp)
- started_at (timestamp, nullable)
- completed_at (timestamp, nullable)
- created_at (timestamp)

### transcript_entries
- id (UUID, PK)
- debate_id (FK)
- phase (enum) - opening, rebuttal, cross_examination, closing, judgment, audit
- speaker_id (FK to models)
- position (enum, nullable) - pro, con, judge, auditor
- content (text)
- token_count (int)
- sequence_order (int)
- created_at (timestamp)

### votes
- id (UUID, PK)
- topic_id (FK, nullable) - For topic voting
- debate_id (FK, nullable) - For debate outcome voting
- voted_for_id (FK to models, nullable) - Which model they voted for
- user_fingerprint (string) - Browser fingerprint
- user_id (FK, nullable) - If authenticated
- ip_address (string)
- created_at (timestamp)

### users
- id (UUID, PK)
- email (string, unique)
- name (string)
- provider (string) - google, github
- provider_id (string)
- created_at (timestamp)

## Debate Flow

1. **Topic Selection**: Top-voted topic from queue (or scheduled from backlog)
2. **Model Assignment**: Random selection of debater_pro, debater_con, judge (no model debates itself)
3. **Opening Statements**: Pro speaks first, then Con (300 word limit each)
4. **Rebuttals**: Con responds to Pro's opening, then Pro responds to Con's (250 words each)
5. **Cross-Examination**: 2 rounds of direct questions/answers (150 words each)
6. **Closing Arguments**: Pro first, then Con (200 words each)
7. **Judgment**: Judge model scores both sides on rubric, declares winner
8. **Meta-Audit**: Auditor model evaluates the judge's reasoning and fairness

## Scoring Rubric (for Judge)

Score each debater 0-100 on:
- Logical Consistency (25 points)
- Evidence & Examples (25 points)
- Persuasiveness (25 points)
- Engagement with Opponent (25 points)

## Judge Audit Rubric (for Meta-Judge)

Score the judge 1-10 on:
- Accuracy (correctly summarized arguments)
- Fairness (no apparent bias)
- Thoroughness (addressed key points)
- Reasoning Quality (justification for scores)

## AI Provider Configuration

```python
MODELS = {
    "claude-opus-4": {
        "provider": "anthropic",
        "api_id": "claude-opus-4-20250514",
        "input_cost_per_1m": 15.0,
        "output_cost_per_1m": 75.0,
        "tier": "flagship"
    },
    "claude-sonnet-4": {
        "provider": "anthropic",
        "api_id": "claude-sonnet-4-20250514",
        "input_cost_per_1m": 3.0,
        "output_cost_per_1m": 15.0,
        "tier": "workhorse"
    },
    "gpt-4o": {
        "provider": "openai",
        "api_id": "gpt-4o",
        "input_cost_per_1m": 2.5,
        "output_cost_per_1m": 10.0,
        "tier": "workhorse"
    },
    "gemini-2.0-flash": {
        "provider": "google",
        "api_id": "gemini-2.0-flash",
        "input_cost_per_1m": 0.10,
        "output_cost_per_1m": 0.40,
        "tier": "budget"
    },
    "mistral-large": {
        "provider": "mistral",
        "api_id": "mistral-large-latest",
        "input_cost_per_1m": 2.0,
        "output_cost_per_1m": 6.0,
        "tier": "workhorse"
    }
}
```

## Prompt Templates

### Debater System Prompt
```
You are participating in a formal debate. Your opponent is another AI model.

Topic: {topic}
Your position: {PRO/CON}

Rules:
- Address your opponent directly when responding to their arguments
- Keep your response under {word_limit} words
- Be persuasive but intellectually honest
- No ad hominem attacks
- Support claims with reasoning and examples

You are being judged on: logical consistency, evidence usage, persuasiveness, and engagement with opposing arguments.

Current phase: {phase}
```

### Judge System Prompt
```
You are judging a formal debate between two AI models.

Topic: {topic}

Your task:
1. Read the complete transcript
2. Score each debater on the rubric (0-100 total)
3. Declare a winner
4. Provide reasoning for your decision

Scoring rubric:
- Logical Consistency (0-25): Are arguments internally coherent?
- Evidence & Examples (0-25): Are claims supported?
- Persuasiveness (0-25): How compelling is the overall case?
- Engagement (0-25): How well did they address opponent's points?

Respond with JSON:
{
  "pro_score": <int>,
  "con_score": <int>,
  "winner": "pro" | "con",
  "reasoning": "<detailed explanation>"
}
```

### Auditor System Prompt
```
You are auditing the quality of an AI judge's evaluation of a debate.

Review:
1. The debate transcript
2. The judge's scores and reasoning

Evaluate the judge on:
- Accuracy (1-10): Did they correctly summarize arguments?
- Fairness (1-10): Any apparent bias toward either side?
- Thoroughness (1-10): Did they address key points?
- Reasoning (1-10): Is the decision well-justified?

Respond with JSON:
{
  "accuracy": <int>,
  "fairness": <int>,
  "thoroughness": <int>,
  "reasoning_quality": <int>,
  "overall_score": <float>,
  "notes": "<observations about judge performance>"
}
```

## Scheduler Configuration

Run 5 debates per day at:
- 6:00 AM UTC
- 10:00 AM UTC
- 2:00 PM UTC
- 6:00 PM UTC
- 10:00 PM UTC

### Topic Selection Strategy

**Launch Phase (until organic submissions reach critical mass):**

The platform launches with 500 pre-seeded debate topics across all categories. During this phase:

- **Debate 1 (6 AM)**: Top voted user-submitted topic (if any exist with 5+ votes), otherwise pull from backlog
- **Debates 2-5**: Pull from seeded backlog, ensuring category diversity

**Topic Sources:**
- `source = 'seed'` - Pre-loaded topics (500 at launch)
- `source = 'user'` - User-submitted topics

**Backlog Selection Logic:**
```python
def select_backlog_topic(db_session, exclude_categories: list[str] = None):
    """
    Select next topic from seeded backlog.
    - Prioritize categories not yet debated today
    - Within category, random selection (not FIFO, keeps it unpredictable)
    - Mark as selected immediately to prevent race conditions
    """
    query = select(Topic).where(
        Topic.source == 'seed',
        Topic.status == 'pending'
    )
    if exclude_categories:
        query = query.where(Topic.category.not_in(exclude_categories))
    
    # Random selection within filtered set
    topic = db_session.execute(
        query.order_by(func.random()).limit(1)
    ).scalar_one_or_none()
    
    return topic
```

**Daily Schedule Logic:**
```python
async def select_topics_for_day(db_session) -> list[Topic]:
    topics = []
    categories_used = []
    
    # Slot 1: User-submitted (if qualified) or backlog
    user_topic = get_top_voted_user_topic(db_session, min_votes=5)
    if user_topic:
        topics.append(user_topic)
        categories_used.append(user_topic.category)
    else:
        backlog_topic = select_backlog_topic(db_session)
        topics.append(backlog_topic)
        categories_used.append(backlog_topic.category)
    
    # Slots 2-5: Backlog with category diversity
    for _ in range(4):
        topic = select_backlog_topic(db_session, exclude_categories=categories_used)
        if topic is None:
            # All categories used today, allow repeats
            topic = select_backlog_topic(db_session)
        topics.append(topic)
        categories_used.append(topic.category)
    
    return topics
```

**Transition to Full User-Generated:**

Once user-submitted topics consistently hit 50+ pending with 10+ votes each, switch to full user-driven selection for all 5 daily slots. This is a manual config flag:

```python
TOPIC_SELECTION_MODE = 'hybrid'  # 'hybrid' | 'user_only' | 'backlog_only'
```

**Backlog Replenishment:**

At 500 topics with 5/day, backlog lasts ~100 days. Before it depletes:
1. Generate additional topics if user submissions haven't ramped
2. Or transition to user-only mode

Monitor via admin dashboard: `GET /api/admin/topic-stats`

## Elo Calculation

Use standard Elo with K-factor of 32:
```python
def calculate_new_elo(winner_elo, loser_elo, k=32):
    expected_winner = 1 / (1 + 10 ** ((loser_elo - winner_elo) / 400))
    expected_loser = 1 - expected_winner
    
    new_winner_elo = winner_elo + k * (1 - expected_winner)
    new_loser_elo = loser_elo + k * (0 - expected_loser)
    
    return round(new_winner_elo), round(new_loser_elo)
```

## API Endpoints

### Debates
- `GET /api/debates` - List debates (paginated, filterable)
- `GET /api/debates/{id}` - Get debate with full transcript
- `GET /api/debates/live` - Get currently running debate (if any)

### Topics
- `GET /api/topics` - List topics in queue
- `POST /api/topics` - Submit new topic (requires email)
- `POST /api/topics/{id}/vote` - Vote for topic

### Models
- `GET /api/models` - List all models with stats
- `GET /api/models/{id}` - Get model detail with debate history
- `GET /api/models/standings` - Leaderboard data

### Votes
- `POST /api/debates/{id}/vote` - Vote on debate winner
- `GET /api/debates/{id}/votes` - Get vote tallies

## Seeded Topic Backlog

The platform launches with 500 pre-seeded debate topics. Distribution:

| Category | Count | Examples |
|----------|-------|----------|
| Ethics | 85 | AI deception, animal rights, genetic engineering |
| Technology | 85 | Open source AI, social media regulation, automation |
| Philosophy | 80 | Consciousness, free will, simulation hypothesis |
| Politics | 65 | Voting systems, immigration, term limits |
| Society | 65 | Remote work, education reform, housing |
| Science | 60 | Research funding, peer review, space exploration |
| Economics | 60 | UBI, antitrust, cryptocurrency |

**Seeding approach:**
- Topics stored with `source = 'seed'` and `submitted_by = null`
- All start with `vote_count = 0` (users can still upvote seeded topics)
- Random selection within category prevents predictability
- Seeded topics don't appear in "user submitted" UI sections but do appear in the main queue

**Topic quality guidelines for seeds:**
- Clear pro/con framing
- No time-sensitive claims (avoid "Will X happen by 2025")
- Intellectually substantive (avoid pure opinion questions)
- Appropriate for AI debate (no questions requiring real-time data)
- Non-partisan framing for political topics

Generate seed file: `python scripts/generate_seed_topics.py --count 500 --output data/seed_topics.json`
Load seeds: `python scripts/load_seed_topics.py --input data/seed_topics.json`

## Environment Variables

```
DATABASE_URL=postgresql://...
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...
GOOGLE_API_KEY=...
MISTRAL_API_KEY=...
NEXTAUTH_SECRET=...
NEXTAUTH_URL=http://localhost:3000
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
```

## Development Guidelines

- Use async/await throughout the backend
- Type hints on all functions
- Pydantic for all request/response validation
- Alembic for database migrations
- pytest for testing
- Black for formatting
- Keep provider adapters thin - just API calls, no business logic
- Orchestrator handles all debate flow logic
- Frontend fetches data via API, no direct DB access

## Testing Strategy

- Unit tests for Elo calculation, scoring logic
- Integration tests for debate orchestrator (mock API calls)
- E2E tests for critical user flows (submit topic, vote, view debate)

## Future Enhancements (Out of Scope for MVP)

- WebSocket for live debate updates
- User accounts with debate history
- Model head-to-head comparison pages
- Topic category analytics
- RSS feed of debates
- Embeddable debate widgets
- API for third-party access to debate data