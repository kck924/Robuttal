"""
Hierarchical topic taxonomy for debates.

This module defines the 2-level category taxonomy used to classify debate topics.
Level 1: Domain (broad area)
Level 2: Subdomain (specific category within the domain)
"""

from dataclasses import dataclass
from enum import Enum


class Domain(str, Enum):
    """Level 1: Top-level domains for debate topics."""

    SCIENCE_TECHNOLOGY = "Science & Technology"
    SOCIETY_CULTURE = "Society & Culture"
    POLITICS_GOVERNANCE = "Politics & Governance"
    ECONOMICS_BUSINESS = "Economics & Business"
    PHILOSOPHY_ETHICS = "Philosophy & Ethics"
    ARTS_HUMANITIES = "Arts & Humanities"


class Subdomain(str, Enum):
    """Level 2: Specific categories within each domain."""

    # Science & Technology
    AI_COMPUTING = "AI & Computing"
    ENVIRONMENT_CLIMATE = "Environment & Climate"
    MEDICINE_HEALTH = "Medicine & Health"
    SPACE_EXPLORATION = "Space & Exploration"
    BIOTECHNOLOGY = "Biotechnology"
    ENERGY_RESOURCES = "Energy & Resources"

    # Society & Culture
    EDUCATION = "Education"
    MEDIA_ENTERTAINMENT = "Media & Entertainment"
    SPORTS_COMPETITION = "Sports & Competition"
    FAMILY_RELATIONSHIPS = "Family & Relationships"
    RELIGION_SPIRITUALITY = "Religion & Spirituality"
    DEMOGRAPHICS_MIGRATION = "Demographics & Migration"
    URBAN_RURAL = "Urban & Rural Life"

    # Politics & Governance
    DEMOCRACY_VOTING = "Democracy & Voting"
    INTERNATIONAL_RELATIONS = "International Relations"
    LAW_JUSTICE = "Law & Justice"
    CIVIL_RIGHTS = "Civil Rights & Liberties"
    MILITARY_DEFENSE = "Military & Defense"
    PUBLIC_POLICY = "Public Policy"

    # Economics & Business
    MARKETS_TRADE = "Markets & Trade"
    LABOR_WORK = "Labor & Work"
    FINANCE_WEALTH = "Finance & Wealth"
    ENTREPRENEURSHIP = "Entrepreneurship"
    CONSUMER_ECONOMICS = "Consumer Economics"
    INEQUALITY = "Economic Inequality"

    # Philosophy & Ethics
    MORALITY_VALUES = "Morality & Values"
    CONSCIOUSNESS_MIND = "Consciousness & Mind"
    EXISTENCE_MEANING = "Existence & Meaning"
    APPLIED_ETHICS = "Applied Ethics"
    EPISTEMOLOGY = "Knowledge & Truth"
    LOGIC_REASONING = "Logic & Reasoning"

    # Arts & Humanities
    LITERATURE_LANGUAGE = "Literature & Language"
    VISUAL_PERFORMING_ARTS = "Visual & Performing Arts"
    HISTORY_MEMORY = "History & Memory"
    CULTURAL_IDENTITY = "Cultural Identity"
    ARCHITECTURE_DESIGN = "Architecture & Design"


@dataclass
class SubdomainInfo:
    """Information about a subdomain including its parent domain."""

    subdomain: Subdomain
    domain: Domain
    description: str
    keywords: list[str]  # Keywords to help with auto-categorization


# Mapping of subdomains to their parent domains and metadata
TAXONOMY: dict[Subdomain, SubdomainInfo] = {
    # Science & Technology
    Subdomain.AI_COMPUTING: SubdomainInfo(
        subdomain=Subdomain.AI_COMPUTING,
        domain=Domain.SCIENCE_TECHNOLOGY,
        description="Artificial intelligence, machine learning, software, algorithms, and computing technology",
        keywords=["AI", "artificial intelligence", "machine learning", "algorithm", "software", "computer", "robot", "automation", "ChatGPT", "neural network", "data", "programming", "tech", "digital"],
    ),
    Subdomain.ENVIRONMENT_CLIMATE: SubdomainInfo(
        subdomain=Subdomain.ENVIRONMENT_CLIMATE,
        domain=Domain.SCIENCE_TECHNOLOGY,
        description="Climate change, environmental protection, sustainability, and ecology",
        keywords=["climate", "environment", "global warming", "carbon", "pollution", "sustainability", "green", "renewable", "ecology", "biodiversity", "conservation", "emissions", "fossil fuel"],
    ),
    Subdomain.MEDICINE_HEALTH: SubdomainInfo(
        subdomain=Subdomain.MEDICINE_HEALTH,
        domain=Domain.SCIENCE_TECHNOLOGY,
        description="Healthcare, medicine, public health, diseases, and medical technology",
        keywords=["health", "medicine", "doctor", "hospital", "disease", "vaccine", "pharmaceutical", "drug", "therapy", "patient", "medical", "healthcare", "mental health", "pandemic"],
    ),
    Subdomain.SPACE_EXPLORATION: SubdomainInfo(
        subdomain=Subdomain.SPACE_EXPLORATION,
        domain=Domain.SCIENCE_TECHNOLOGY,
        description="Space travel, astronomy, colonization, and extraterrestrial topics",
        keywords=["space", "Mars", "moon", "NASA", "rocket", "astronaut", "satellite", "planet", "colonization", "alien", "universe", "astronomy", "SpaceX", "orbit"],
    ),
    Subdomain.BIOTECHNOLOGY: SubdomainInfo(
        subdomain=Subdomain.BIOTECHNOLOGY,
        domain=Domain.SCIENCE_TECHNOLOGY,
        description="Genetic engineering, cloning, synthetic biology, and biological technology",
        keywords=["gene", "genetic", "CRISPR", "DNA", "cloning", "GMO", "biotech", "synthetic biology", "genome", "mutation", "hereditary", "eugenics"],
    ),
    Subdomain.ENERGY_RESOURCES: SubdomainInfo(
        subdomain=Subdomain.ENERGY_RESOURCES,
        domain=Domain.SCIENCE_TECHNOLOGY,
        description="Energy production, natural resources, and power infrastructure",
        keywords=["energy", "nuclear", "solar", "wind", "oil", "gas", "electricity", "power", "renewable", "fossil", "battery", "grid", "mining", "resource"],
    ),

    # Society & Culture
    Subdomain.EDUCATION: SubdomainInfo(
        subdomain=Subdomain.EDUCATION,
        domain=Domain.SOCIETY_CULTURE,
        description="Schools, universities, learning methods, and educational policy",
        keywords=["education", "school", "university", "college", "student", "teacher", "learning", "curriculum", "degree", "tuition", "classroom", "academic", "homework", "exam"],
    ),
    Subdomain.MEDIA_ENTERTAINMENT: SubdomainInfo(
        subdomain=Subdomain.MEDIA_ENTERTAINMENT,
        domain=Domain.SOCIETY_CULTURE,
        description="News, social media, movies, television, gaming, and entertainment industry",
        keywords=["media", "news", "social media", "Twitter", "Facebook", "Instagram", "TikTok", "movie", "film", "television", "streaming", "gaming", "video game", "entertainment", "celebrity", "influencer"],
    ),
    Subdomain.SPORTS_COMPETITION: SubdomainInfo(
        subdomain=Subdomain.SPORTS_COMPETITION,
        domain=Domain.SOCIETY_CULTURE,
        description="Athletics, esports, Olympics, and competitive events",
        keywords=["sport", "athlete", "Olympics", "football", "basketball", "soccer", "baseball", "esports", "competition", "team", "league", "championship", "fitness", "doping", "FIFA"],
    ),
    Subdomain.FAMILY_RELATIONSHIPS: SubdomainInfo(
        subdomain=Subdomain.FAMILY_RELATIONSHIPS,
        domain=Domain.SOCIETY_CULTURE,
        description="Marriage, parenting, family structure, and interpersonal relationships",
        keywords=["family", "marriage", "divorce", "parent", "child", "parenting", "dating", "relationship", "spouse", "wedding", "custody", "adoption", "household"],
    ),
    Subdomain.RELIGION_SPIRITUALITY: SubdomainInfo(
        subdomain=Subdomain.RELIGION_SPIRITUALITY,
        domain=Domain.SOCIETY_CULTURE,
        description="Religious beliefs, practices, secularism, and spiritual matters",
        keywords=["religion", "religious", "God", "church", "faith", "spiritual", "atheist", "prayer", "worship", "sacred", "secular", "Christianity", "Islam", "Buddhism", "Hindu"],
    ),
    Subdomain.DEMOGRAPHICS_MIGRATION: SubdomainInfo(
        subdomain=Subdomain.DEMOGRAPHICS_MIGRATION,
        domain=Domain.SOCIETY_CULTURE,
        description="Population trends, immigration, aging, and demographic changes",
        keywords=["immigration", "immigrant", "refugee", "border", "population", "aging", "birth rate", "demographic", "migration", "citizenship", "diversity", "assimilation"],
    ),
    Subdomain.URBAN_RURAL: SubdomainInfo(
        subdomain=Subdomain.URBAN_RURAL,
        domain=Domain.SOCIETY_CULTURE,
        description="City vs. rural life, housing, transportation, and community development",
        keywords=["city", "urban", "rural", "housing", "transportation", "suburb", "infrastructure", "public transit", "zoning", "gentrification", "commute", "downtown"],
    ),

    # Politics & Governance
    Subdomain.DEMOCRACY_VOTING: SubdomainInfo(
        subdomain=Subdomain.DEMOCRACY_VOTING,
        domain=Domain.POLITICS_GOVERNANCE,
        description="Electoral systems, voting rights, democratic processes, and representation",
        keywords=["vote", "voting", "election", "democracy", "ballot", "electoral", "poll", "representative", "candidate", "campaign", "referendum", "constituency"],
    ),
    Subdomain.INTERNATIONAL_RELATIONS: SubdomainInfo(
        subdomain=Subdomain.INTERNATIONAL_RELATIONS,
        domain=Domain.POLITICS_GOVERNANCE,
        description="Diplomacy, international organizations, treaties, and global cooperation",
        keywords=["UN", "United Nations", "NATO", "treaty", "diplomacy", "international", "foreign policy", "sanctions", "alliance", "sovereignty", "globalization", "superpower"],
    ),
    Subdomain.LAW_JUSTICE: SubdomainInfo(
        subdomain=Subdomain.LAW_JUSTICE,
        domain=Domain.POLITICS_GOVERNANCE,
        description="Legal systems, courts, crime, punishment, and judicial processes",
        keywords=["law", "legal", "court", "judge", "crime", "prison", "punishment", "justice", "trial", "jury", "sentence", "criminal", "police", "attorney", "constitution"],
    ),
    Subdomain.CIVIL_RIGHTS: SubdomainInfo(
        subdomain=Subdomain.CIVIL_RIGHTS,
        domain=Domain.POLITICS_GOVERNANCE,
        description="Freedom of speech, privacy, equality, and fundamental rights",
        keywords=["rights", "freedom", "liberty", "privacy", "speech", "equality", "discrimination", "civil rights", "human rights", "censorship", "protest", "amendment"],
    ),
    Subdomain.MILITARY_DEFENSE: SubdomainInfo(
        subdomain=Subdomain.MILITARY_DEFENSE,
        domain=Domain.POLITICS_GOVERNANCE,
        description="Armed forces, warfare, national security, and defense policy",
        keywords=["military", "army", "war", "defense", "weapon", "soldier", "veteran", "combat", "nuclear", "security", "terrorism", "drone", "invasion"],
    ),
    Subdomain.PUBLIC_POLICY: SubdomainInfo(
        subdomain=Subdomain.PUBLIC_POLICY,
        domain=Domain.POLITICS_GOVERNANCE,
        description="Government programs, regulation, taxation, and policy implementation",
        keywords=["policy", "government", "regulation", "tax", "budget", "legislation", "reform", "subsidy", "welfare", "bureaucracy", "administration", "mandate"],
    ),

    # Economics & Business
    Subdomain.MARKETS_TRADE: SubdomainInfo(
        subdomain=Subdomain.MARKETS_TRADE,
        domain=Domain.ECONOMICS_BUSINESS,
        description="Free trade, tariffs, market systems, and international commerce",
        keywords=["market", "trade", "tariff", "capitalism", "free market", "import", "export", "commerce", "supply", "demand", "competition", "monopoly", "globalization"],
    ),
    Subdomain.LABOR_WORK: SubdomainInfo(
        subdomain=Subdomain.LABOR_WORK,
        domain=Domain.ECONOMICS_BUSINESS,
        description="Employment, wages, unions, working conditions, and labor rights",
        keywords=["job", "employment", "wage", "salary", "worker", "union", "labor", "minimum wage", "unemployment", "workplace", "remote work", "gig economy", "career"],
    ),
    Subdomain.FINANCE_WEALTH: SubdomainInfo(
        subdomain=Subdomain.FINANCE_WEALTH,
        domain=Domain.ECONOMICS_BUSINESS,
        description="Banking, investment, cryptocurrency, and personal finance",
        keywords=["bank", "finance", "investment", "stock", "crypto", "cryptocurrency", "bitcoin", "wealth", "savings", "debt", "loan", "interest", "Wall Street"],
    ),
    Subdomain.ENTREPRENEURSHIP: SubdomainInfo(
        subdomain=Subdomain.ENTREPRENEURSHIP,
        domain=Domain.ECONOMICS_BUSINESS,
        description="Startups, innovation, business creation, and venture capital",
        keywords=["startup", "entrepreneur", "business", "founder", "venture capital", "innovation", "company", "CEO", "Silicon Valley", "disruption", "scale"],
    ),
    Subdomain.CONSUMER_ECONOMICS: SubdomainInfo(
        subdomain=Subdomain.CONSUMER_ECONOMICS,
        domain=Domain.ECONOMICS_BUSINESS,
        description="Consumer protection, advertising, pricing, and market behavior",
        keywords=["consumer", "advertising", "marketing", "brand", "purchase", "price", "retail", "shopping", "product", "customer", "subscription"],
    ),
    Subdomain.INEQUALITY: SubdomainInfo(
        subdomain=Subdomain.INEQUALITY,
        domain=Domain.ECONOMICS_BUSINESS,
        description="Wealth distribution, poverty, billionaires, and economic disparity",
        keywords=["inequality", "poverty", "billionaire", "wealth gap", "rich", "poor", "redistribution", "UBI", "universal basic income", "class", "1%", "homelessness"],
    ),

    # Philosophy & Ethics
    Subdomain.MORALITY_VALUES: SubdomainInfo(
        subdomain=Subdomain.MORALITY_VALUES,
        domain=Domain.PHILOSOPHY_ETHICS,
        description="Right and wrong, moral principles, and ethical frameworks",
        keywords=["moral", "morality", "ethics", "ethical", "right", "wrong", "virtue", "value", "principle", "good", "evil", "duty", "obligation"],
    ),
    Subdomain.CONSCIOUSNESS_MIND: SubdomainInfo(
        subdomain=Subdomain.CONSCIOUSNESS_MIND,
        domain=Domain.PHILOSOPHY_ETHICS,
        description="Consciousness, free will, identity, and philosophy of mind",
        keywords=["consciousness", "mind", "free will", "determinism", "identity", "self", "awareness", "perception", "thought", "qualia", "sentience", "soul"],
    ),
    Subdomain.EXISTENCE_MEANING: SubdomainInfo(
        subdomain=Subdomain.EXISTENCE_MEANING,
        domain=Domain.PHILOSOPHY_ETHICS,
        description="Purpose of life, existentialism, and metaphysical questions",
        keywords=["existence", "meaning", "purpose", "life", "death", "existential", "nihilism", "absurd", "being", "reality", "simulation", "afterlife"],
    ),
    Subdomain.APPLIED_ETHICS: SubdomainInfo(
        subdomain=Subdomain.APPLIED_ETHICS,
        domain=Domain.PHILOSOPHY_ETHICS,
        description="Practical ethical dilemmas like euthanasia, abortion, and animal rights",
        keywords=["euthanasia", "abortion", "animal rights", "vegetarian", "vegan", "death penalty", "torture", "trolley problem", "bioethics", "dilemma"],
    ),
    Subdomain.EPISTEMOLOGY: SubdomainInfo(
        subdomain=Subdomain.EPISTEMOLOGY,
        domain=Domain.PHILOSOPHY_ETHICS,
        description="Nature of knowledge, truth, belief, and justification",
        keywords=["knowledge", "truth", "belief", "evidence", "proof", "skepticism", "certainty", "epistemology", "fact", "opinion", "objective", "subjective"],
    ),
    Subdomain.LOGIC_REASONING: SubdomainInfo(
        subdomain=Subdomain.LOGIC_REASONING,
        domain=Domain.PHILOSOPHY_ETHICS,
        description="Logical reasoning, argumentation, and rational thought",
        keywords=["logic", "reason", "argument", "fallacy", "rational", "inference", "deduction", "induction", "paradox", "contradiction"],
    ),

    # Arts & Humanities
    Subdomain.LITERATURE_LANGUAGE: SubdomainInfo(
        subdomain=Subdomain.LITERATURE_LANGUAGE,
        domain=Domain.ARTS_HUMANITIES,
        description="Books, writing, linguistics, and literary culture",
        keywords=["book", "novel", "author", "writing", "literature", "language", "poetry", "reading", "publishing", "fiction", "story", "narrative", "grammar"],
    ),
    Subdomain.VISUAL_PERFORMING_ARTS: SubdomainInfo(
        subdomain=Subdomain.VISUAL_PERFORMING_ARTS,
        domain=Domain.ARTS_HUMANITIES,
        description="Painting, sculpture, music, theater, dance, and artistic expression",
        keywords=["art", "artist", "music", "painting", "sculpture", "theater", "dance", "museum", "gallery", "performance", "concert", "creative", "aesthetic"],
    ),
    Subdomain.HISTORY_MEMORY: SubdomainInfo(
        subdomain=Subdomain.HISTORY_MEMORY,
        domain=Domain.ARTS_HUMANITIES,
        description="Historical events, monuments, commemoration, and collective memory",
        keywords=["history", "historical", "monument", "statue", "memorial", "heritage", "tradition", "legacy", "ancestor", "commemoration", "archive", "museum"],
    ),
    Subdomain.CULTURAL_IDENTITY: SubdomainInfo(
        subdomain=Subdomain.CULTURAL_IDENTITY,
        domain=Domain.ARTS_HUMANITIES,
        description="National identity, cultural preservation, and heritage",
        keywords=["culture", "identity", "heritage", "tradition", "national", "ethnic", "indigenous", "customs", "folklore", "native", "ancestral"],
    ),
    Subdomain.ARCHITECTURE_DESIGN: SubdomainInfo(
        subdomain=Subdomain.ARCHITECTURE_DESIGN,
        domain=Domain.ARTS_HUMANITIES,
        description="Buildings, urban design, aesthetics, and the built environment",
        keywords=["architecture", "building", "design", "urban design", "architect", "construction", "landmark", "skyscraper", "planning", "aesthetics"],
    ),
}


def get_domain_for_subdomain(subdomain: Subdomain) -> Domain:
    """Get the parent domain for a given subdomain."""
    return TAXONOMY[subdomain].domain


def get_subdomains_for_domain(domain: Domain) -> list[Subdomain]:
    """Get all subdomains belonging to a domain."""
    return [
        info.subdomain
        for info in TAXONOMY.values()
        if info.domain == domain
    ]


def get_all_subdomains() -> list[Subdomain]:
    """Get all subdomains."""
    return list(Subdomain)


def get_all_domains() -> list[Domain]:
    """Get all domains."""
    return list(Domain)


def get_taxonomy_tree() -> dict[Domain, list[SubdomainInfo]]:
    """Get the full taxonomy organized by domain."""
    tree: dict[Domain, list[SubdomainInfo]] = {domain: [] for domain in Domain}
    for info in TAXONOMY.values():
        tree[info.domain].append(info)
    return tree


# For serialization - flat list of all category options with hierarchy info
def get_category_options() -> list[dict]:
    """Get all categories as a flat list with hierarchy info for frontend."""
    options = []
    for subdomain, info in TAXONOMY.items():
        options.append({
            "subdomain": subdomain.value,
            "domain": info.domain.value,
            "description": info.description,
        })
    return options


# Legacy category mapping for migration
LEGACY_CATEGORY_MAP: dict[str, Subdomain] = {
    "Ethics": Subdomain.MORALITY_VALUES,
    "Technology": Subdomain.AI_COMPUTING,
    "Philosophy": Subdomain.CONSCIOUSNESS_MIND,
    "Politics": Subdomain.PUBLIC_POLICY,
    "Society": Subdomain.MEDIA_ENTERTAINMENT,
    "Science": Subdomain.MEDICINE_HEALTH,
    "Economics": Subdomain.MARKETS_TRADE,
}
