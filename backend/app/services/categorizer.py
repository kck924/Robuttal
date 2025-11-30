"""
Auto-categorization service for debate topics.

Uses AI to classify topics into the taxonomy hierarchy.
"""

import json
import logging
from typing import Tuple

from app.config import get_settings
from app.taxonomy import (
    Domain,
    Subdomain,
    TAXONOMY,
    get_taxonomy_tree,
)

logger = logging.getLogger(__name__)


def _build_taxonomy_prompt() -> str:
    """Build the taxonomy description for the prompt."""
    lines = []
    tree = get_taxonomy_tree()

    for domain, subdomains in tree.items():
        lines.append(f"\n## {domain.value}")
        for info in subdomains:
            lines.append(f"- **{info.subdomain.value}**: {info.description}")

    return "\n".join(lines)


CATEGORIZATION_SYSTEM_PROMPT = """You are a topic categorization assistant for a debate platform.

Your task is to classify debate topics into a two-level taxonomy:
1. Domain (broad category)
2. Subdomain (specific category)

Here is the complete taxonomy:
{taxonomy}

Instructions:
- Analyze the debate topic carefully
- Select the BEST matching subdomain based on the primary subject matter
- The domain is determined by the subdomain selection
- If a topic spans multiple categories, choose the most dominant one
- Respond ONLY with valid JSON in the exact format specified

Output format:
{{"subdomain": "<exact subdomain name>", "domain": "<exact domain name>", "confidence": <0.0-1.0>}}

Example:
Topic: "Should AI systems be required to disclose when they're not human?"
Output: {{"subdomain": "AI & Computing", "domain": "Science & Technology", "confidence": 0.95}}

Topic: "Is professional esports a legitimate sport?"
Output: {{"subdomain": "Sports & Competition", "domain": "Society & Culture", "confidence": 0.9}}
"""


async def categorize_topic(topic_title: str) -> Tuple[Subdomain, Domain, float]:
    """
    Categorize a topic using AI.

    Args:
        topic_title: The debate topic to categorize

    Returns:
        Tuple of (subdomain, domain, confidence_score)

    Raises:
        ValueError: If categorization fails or returns invalid category
    """
    settings = get_settings()

    # Use Google's Gemini Flash for fast, cheap categorization
    try:
        import google.generativeai as genai

        genai.configure(api_key=settings.google_api_key)
        model = genai.GenerativeModel("gemini-2.0-flash")

        system_prompt = CATEGORIZATION_SYSTEM_PROMPT.format(
            taxonomy=_build_taxonomy_prompt()
        )

        response = await model.generate_content_async(
            f"{system_prompt}\n\nTopic: \"{topic_title}\"\nOutput:",
            generation_config=genai.GenerationConfig(
                temperature=0.1,
                max_output_tokens=100,
            ),
        )

        response_text = response.text.strip()

        # Parse JSON response
        # Handle potential markdown code blocks
        if response_text.startswith("```"):
            response_text = response_text.split("```")[1]
            if response_text.startswith("json"):
                response_text = response_text[4:]
            response_text = response_text.strip()

        result = json.loads(response_text)

        subdomain_str = result.get("subdomain")
        domain_str = result.get("domain")
        confidence = result.get("confidence", 0.8)

        # Validate subdomain exists
        subdomain = None
        for sd in Subdomain:
            if sd.value == subdomain_str:
                subdomain = sd
                break

        if subdomain is None:
            raise ValueError(f"Invalid subdomain returned: {subdomain_str}")

        # Get the correct domain from taxonomy (don't trust the AI's domain)
        domain = TAXONOMY[subdomain].domain

        logger.info(
            f"Categorized topic: '{topic_title[:50]}...' -> {domain.value}/{subdomain.value} (confidence: {confidence})"
        )

        return subdomain, domain, confidence

    except ImportError:
        logger.warning("Google AI SDK not available, falling back to keyword matching")
        return _keyword_fallback(topic_title)
    except Exception as e:
        logger.error(f"AI categorization failed: {e}, falling back to keyword matching")
        return _keyword_fallback(topic_title)


def _keyword_fallback(topic_title: str) -> Tuple[Subdomain, Domain, float]:
    """
    Fallback categorization using keyword matching.

    Used when AI categorization is unavailable or fails.
    """
    topic_lower = topic_title.lower()

    best_match: Subdomain | None = None
    best_score = 0

    for subdomain, info in TAXONOMY.items():
        score = 0
        for keyword in info.keywords:
            if keyword.lower() in topic_lower:
                # Longer keywords are more specific, weight them higher
                score += len(keyword)

        if score > best_score:
            best_score = score
            best_match = subdomain

    # Default to AI & Computing if no match found
    if best_match is None:
        best_match = Subdomain.AI_COMPUTING
        confidence = 0.3
    else:
        # Normalize confidence based on match quality
        confidence = min(0.7, best_score / 20)

    domain = TAXONOMY[best_match].domain

    logger.info(
        f"Keyword fallback categorized: '{topic_title[:50]}...' -> {domain.value}/{best_match.value} (confidence: {confidence})"
    )

    return best_match, domain, confidence


async def recategorize_topic(topic_title: str, current_subdomain: str) -> Tuple[Subdomain, Domain, float]:
    """
    Re-categorize a topic, useful for migration or correction.

    This is the same as categorize_topic but logs differently.
    """
    subdomain, domain, confidence = await categorize_topic(topic_title)

    if subdomain.value != current_subdomain:
        logger.info(
            f"Re-categorized topic from '{current_subdomain}' to '{subdomain.value}'"
        )

    return subdomain, domain, confidence
