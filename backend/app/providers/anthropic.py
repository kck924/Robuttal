import asyncio
import logging
import time

import anthropic
from anthropic import APIError, APIConnectionError, RateLimitError

from app.providers.base import BaseProvider, CompletionResult, ContentFilterError, ModelConfig

logger = logging.getLogger(__name__)

# Default retry configuration
MAX_RETRIES = 3
RETRY_DELAY_SECONDS = 1.0
RETRY_MULTIPLIER = 2.0


class AnthropicProvider(BaseProvider):
    """Anthropic API adapter for Claude models."""

    def __init__(self, api_key: str, model_config: ModelConfig):
        super().__init__(api_key, model_config)
        self.client = anthropic.AsyncAnthropic(api_key=api_key)

    async def complete(
        self,
        system_prompt: str,
        messages: list[dict],
        max_tokens: int = 1024,
    ) -> str:
        """
        Generate a completion using the Anthropic API.

        Args:
            system_prompt: The system prompt to set context
            messages: List of message dicts with 'role' and 'content' keys
            max_tokens: Maximum tokens in the response

        Returns:
            The text content of the model's response

        Raises:
            APIError: If the API returns an error after all retries
        """
        last_exception = None
        delay = RETRY_DELAY_SECONDS

        for attempt in range(MAX_RETRIES):
            try:
                response = await self.client.messages.create(
                    model=self.model_config.api_id,
                    max_tokens=max_tokens,
                    system=system_prompt,
                    messages=messages,
                )
                return response.content[0].text

            except RateLimitError as e:
                last_exception = e
                logger.warning(
                    f"Rate limit hit for {self.model_config.name}, "
                    f"attempt {attempt + 1}/{MAX_RETRIES}, retrying in {delay}s"
                )
                await asyncio.sleep(delay)
                delay *= RETRY_MULTIPLIER

            except APIConnectionError as e:
                last_exception = e
                logger.warning(
                    f"Connection error for {self.model_config.name}, "
                    f"attempt {attempt + 1}/{MAX_RETRIES}, retrying in {delay}s"
                )
                await asyncio.sleep(delay)
                delay *= RETRY_MULTIPLIER

            except APIError as e:
                # Check for content policy violations
                error_str = str(e).lower()
                if "content_policy_violation" in error_str or "content policy" in error_str:
                    raise ContentFilterError(
                        provider="anthropic",
                        model_name=self.model_config.name,
                        message=f"Content blocked by safety filter: {e}"
                    )
                logger.error(f"API error for {self.model_config.name}: {e}")
                raise

        logger.error(
            f"All {MAX_RETRIES} retries failed for {self.model_config.name}"
        )
        raise last_exception

    async def complete_with_usage(
        self,
        system_prompt: str,
        messages: list[dict],
        max_tokens: int = 1024,
    ) -> CompletionResult:
        """
        Generate a completion with full usage statistics.

        Returns:
            CompletionResult with content, token counts, latency, and cost
        """
        last_exception = None
        delay = RETRY_DELAY_SECONDS

        for attempt in range(MAX_RETRIES):
            try:
                start_time = time.perf_counter()
                response = await self.client.messages.create(
                    model=self.model_config.api_id,
                    max_tokens=max_tokens,
                    system=system_prompt,
                    messages=messages,
                )
                latency_ms = int((time.perf_counter() - start_time) * 1000)

                return CompletionResult.from_response(
                    content=response.content[0].text,
                    input_tokens=response.usage.input_tokens,
                    output_tokens=response.usage.output_tokens,
                    latency_ms=latency_ms,
                    model_config=self.model_config,
                )

            except RateLimitError as e:
                last_exception = e
                logger.warning(
                    f"Rate limit hit for {self.model_config.name}, "
                    f"attempt {attempt + 1}/{MAX_RETRIES}, retrying in {delay}s"
                )
                await asyncio.sleep(delay)
                delay *= RETRY_MULTIPLIER

            except APIConnectionError as e:
                last_exception = e
                logger.warning(
                    f"Connection error for {self.model_config.name}, "
                    f"attempt {attempt + 1}/{MAX_RETRIES}, retrying in {delay}s"
                )
                await asyncio.sleep(delay)
                delay *= RETRY_MULTIPLIER

            except APIError as e:
                # Check for content policy violations
                error_str = str(e).lower()
                if "content_policy_violation" in error_str or "content policy" in error_str:
                    raise ContentFilterError(
                        provider="anthropic",
                        model_name=self.model_config.name,
                        message=f"Content blocked by safety filter: {e}"
                    )
                logger.error(f"API error for {self.model_config.name}: {e}")
                raise

        logger.error(
            f"All {MAX_RETRIES} retries failed for {self.model_config.name}"
        )
        raise last_exception


# Pre-configured model configs for Anthropic models
ANTHROPIC_MODELS = {
    "claude-opus-4-5": ModelConfig(
        name="Claude Opus 4.5",
        provider="anthropic",
        api_id="claude-opus-4-5-20251101",
        input_cost_per_1m=5.0,
        output_cost_per_1m=25.0,
        tier="flagship",
    ),
    "claude-opus-4": ModelConfig(
        name="Claude Opus 4",
        provider="anthropic",
        api_id="claude-opus-4-20250514",
        input_cost_per_1m=15.0,
        output_cost_per_1m=75.0,
        tier="flagship",
    ),
    "claude-sonnet-4-5": ModelConfig(
        name="Claude Sonnet 4.5",
        provider="anthropic",
        api_id="claude-sonnet-4-5-20250929",
        input_cost_per_1m=3.0,
        output_cost_per_1m=15.0,
        tier="workhorse",
    ),
    "claude-sonnet-4": ModelConfig(
        name="Claude Sonnet 4",
        provider="anthropic",
        api_id="claude-sonnet-4-20250514",
        input_cost_per_1m=3.0,
        output_cost_per_1m=15.0,
        tier="workhorse",
    ),
    "claude-3-5-haiku": ModelConfig(
        name="Claude 3.5 Haiku",
        provider="anthropic",
        api_id="claude-3-5-haiku-20241022",
        input_cost_per_1m=0.80,
        output_cost_per_1m=4.0,
        tier="budget",
    ),
}
