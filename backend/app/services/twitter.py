"""Twitter/X posting service for automated debate announcements."""

import logging
from dataclasses import dataclass
from typing import Optional
from uuid import UUID

import httpx

from app.config import get_settings

logger = logging.getLogger(__name__)


# Provider to Twitter handle mapping
PROVIDER_TWITTER_HANDLES: dict[str, str] = {
    "anthropic": "@AnthropicAI",
    "openai": "@OpenAI",
    "google": "@GoogleAI",
    "mistral": "@MistralAI",
    "xai": "@xai",
    "deepseek": "@deepseek_ai",
}


@dataclass
class DebateAnnouncement:
    """Data for a debate announcement tweet."""

    debate_id: UUID
    topic_title: str
    pro_model_name: str
    pro_elo: int
    pro_provider: str
    con_model_name: str
    con_elo: int
    con_provider: str
    site_url: str = "https://robuttal.com"

    def _get_provider_mentions(self) -> str:
        """Get unique provider Twitter handles for both models."""
        mentions = set()
        if self.pro_provider in PROVIDER_TWITTER_HANDLES:
            mentions.add(PROVIDER_TWITTER_HANDLES[self.pro_provider])
        if self.con_provider in PROVIDER_TWITTER_HANDLES:
            mentions.add(PROVIDER_TWITTER_HANDLES[self.con_provider])
        return " ".join(sorted(mentions))

    def format_tweet(self) -> str:
        """Format the tweet text for a new debate announcement.

        Example output:
        New debate: Consciousness is the only thing we can be certain exists.

        Claude Sonnet 4 [1542 Elo] vs GPT-4o [1518 Elo]

        https://robuttal.com/debates/abc123

        @AnthropicAI @OpenAI #AI #LLM #GenerativeAI
        """
        # Truncate topic if needed (tweets have 280 char limit)
        # Reserve ~120 chars for the rest of the tweet structure (models, mentions, hashtags, URL)
        max_topic_len = 120
        topic = self.topic_title
        if len(topic) > max_topic_len:
            topic = topic[: max_topic_len - 3] + "..."

        debate_url = f"{self.site_url}/debates/{self.debate_id}"
        mentions = self._get_provider_mentions()
        hashtags = "#AI #LLM #GenerativeAI"

        tweet = f"""New debate: {topic}

{self.pro_model_name} [{self.pro_elo} Elo] vs {self.con_model_name} [{self.con_elo} Elo]

{debate_url}

{mentions} {hashtags}"""

        return tweet


class TwitterService:
    """Service for posting to Twitter/X using OAuth 2.0 with PKCE."""

    # Twitter API v2 endpoints
    TWEET_URL = "https://api.twitter.com/2/tweets"

    def __init__(self):
        settings = get_settings()
        self.bearer_token = getattr(settings, "twitter_bearer_token", "")
        self.api_key = getattr(settings, "twitter_api_key", "")
        self.api_secret = getattr(settings, "twitter_api_secret", "")
        self.access_token = getattr(settings, "twitter_access_token", "")
        self.access_token_secret = getattr(settings, "twitter_access_token_secret", "")
        self.enabled = getattr(settings, "twitter_enabled", False)

    def is_configured(self) -> bool:
        """Check if Twitter credentials are configured."""
        return bool(
            self.enabled
            and self.api_key
            and self.api_secret
            and self.access_token
            and self.access_token_secret
        )

    def _get_oauth1_header(self, method: str, url: str) -> dict:
        """Generate OAuth 1.0a header for Twitter API.

        Twitter API v2 still requires OAuth 1.0a for user context endpoints like posting tweets.
        """
        import hashlib
        import hmac
        import time
        import urllib.parse
        import uuid as uuid_module

        # OAuth parameters
        oauth_params = {
            "oauth_consumer_key": self.api_key,
            "oauth_nonce": uuid_module.uuid4().hex,
            "oauth_signature_method": "HMAC-SHA1",
            "oauth_timestamp": str(int(time.time())),
            "oauth_token": self.access_token,
            "oauth_version": "1.0",
        }

        # Create signature base string
        params_string = "&".join(
            f"{urllib.parse.quote(k, safe='')}={urllib.parse.quote(v, safe='')}"
            for k, v in sorted(oauth_params.items())
        )
        base_string = f"{method}&{urllib.parse.quote(url, safe='')}&{urllib.parse.quote(params_string, safe='')}"

        # Create signing key
        signing_key = f"{urllib.parse.quote(self.api_secret, safe='')}&{urllib.parse.quote(self.access_token_secret, safe='')}"

        # Generate signature
        signature = hmac.new(
            signing_key.encode("utf-8"),
            base_string.encode("utf-8"),
            hashlib.sha1,
        ).digest()

        import base64

        oauth_signature = base64.b64encode(signature).decode("utf-8")
        oauth_params["oauth_signature"] = oauth_signature

        # Build Authorization header
        auth_header = "OAuth " + ", ".join(
            f'{urllib.parse.quote(k, safe="")}="{urllib.parse.quote(v, safe="")}"'
            for k, v in sorted(oauth_params.items())
        )

        return {"Authorization": auth_header}

    async def post_tweet(self, text: str) -> Optional[str]:
        """Post a tweet and return the tweet ID if successful."""
        if not self.is_configured():
            logger.warning("Twitter not configured, skipping tweet")
            return None

        try:
            headers = self._get_oauth1_header("POST", self.TWEET_URL)
            headers["Content-Type"] = "application/json"

            async with httpx.AsyncClient() as client:
                response = await client.post(
                    self.TWEET_URL,
                    json={"text": text},
                    headers=headers,
                    timeout=30.0,
                )

                if response.status_code == 201:
                    data = response.json()
                    tweet_id = data.get("data", {}).get("id")
                    logger.info(f"Successfully posted tweet: {tweet_id}")
                    return tweet_id
                else:
                    logger.error(
                        f"Failed to post tweet: {response.status_code} - {response.text}"
                    )
                    return None

        except Exception as e:
            logger.error(f"Error posting tweet: {e}")
            return None

    async def announce_debate_started(
        self,
        debate_id: UUID,
        topic_title: str,
        pro_model_name: str,
        pro_elo: int,
        pro_provider: str,
        con_model_name: str,
        con_elo: int,
        con_provider: str,
    ) -> Optional[str]:
        """Announce a new debate has started."""
        announcement = DebateAnnouncement(
            debate_id=debate_id,
            topic_title=topic_title,
            pro_model_name=pro_model_name,
            pro_elo=pro_elo,
            pro_provider=pro_provider,
            con_model_name=con_model_name,
            con_elo=con_elo,
            con_provider=con_provider,
        )

        tweet_text = announcement.format_tweet()
        logger.info(f"Announcing debate: {debate_id}")
        logger.debug(f"Tweet text:\n{tweet_text}")

        return await self.post_tweet(tweet_text)


# Singleton instance
_twitter_service: Optional[TwitterService] = None


def get_twitter_service() -> TwitterService:
    """Get or create the Twitter service singleton."""
    global _twitter_service
    if _twitter_service is None:
        _twitter_service = TwitterService()
    return _twitter_service


async def announce_debate(
    debate_id: UUID,
    topic_title: str,
    pro_model_name: str,
    pro_elo: int,
    pro_provider: str,
    con_model_name: str,
    con_elo: int,
    con_provider: str,
) -> Optional[str]:
    """Convenience function to announce a debate."""
    service = get_twitter_service()
    return await service.announce_debate_started(
        debate_id=debate_id,
        topic_title=topic_title,
        pro_model_name=pro_model_name,
        pro_elo=pro_elo,
        pro_provider=pro_provider,
        con_model_name=con_model_name,
        con_elo=con_elo,
        con_provider=con_provider,
    )
