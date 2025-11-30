import enum


class TopicSource(str, enum.Enum):
    SEED = "seed"
    USER = "user"


class TopicStatus(str, enum.Enum):
    PENDING = "pending"  # Awaiting moderation (user-submitted)
    APPROVED = "approved"  # Approved and visible in queue
    SELECTED = "selected"  # Selected for today's debate
    DEBATED = "debated"  # Already debated
    REJECTED = "rejected"  # Rejected by moderator


class DebateStatus(str, enum.Enum):
    SCHEDULED = "scheduled"
    IN_PROGRESS = "in_progress"
    JUDGING = "judging"
    COMPLETED = "completed"


class DebatePhase(str, enum.Enum):
    OPENING = "opening"
    REBUTTAL = "rebuttal"
    CROSS_EXAMINATION = "cross_examination"
    CLOSING = "closing"
    JUDGMENT = "judgment"
    AUDIT = "audit"


class DebatePosition(str, enum.Enum):
    PRO = "pro"
    CON = "con"
    JUDGE = "judge"
    AUDITOR = "auditor"
