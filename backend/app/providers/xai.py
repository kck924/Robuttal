import asyncio
import logging
import time

import openai
from openai import APIError, APIConnectionError, RateLimitError

from app.providers.base import BaseProvider, CompletionResult, ModelConfig

logger = logging.getLogger(__name__)

MAX_RETRIES = 3
RETRY_DELAY_SECONDS = 1.0
RETRY_MULTIPLIER = 2.0

XAI_BASE_URL = "https://api.x.ai/v1"


class XAIProvider(BaseProvider):
    """xAI API adapter for Grok models (OpenAI-compatible)."""

    def __init__(self, api_key: str, model_config: ModelConfig):
        super().__init__(api_key, model_config)
        self.client = openai.AsyncOpenAI(api_key=api_key, base_url=XAI_BASE_URL)

    async def complete(
        self,
        system_prompt: str,
        messages: list[dict],
        max_tokens: int = 1024,
    ) -> str:
        """
        Generate a completion using the xAI API.

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

        # Prepend system message to the messages list
        full_messages = [{"role": "system", "content": system_prompt}] + messages

        for attempt in range(MAX_RETRIES):
            try:
                response = await self.client.chat.completions.create(
                    model=self.model_config.api_id,
                    max_tokens=max_tokens,
                    messages=full_messages,
                )
                return response.choices[0].message.content

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

        # Prepend system message to the messages list
        full_messages = [{"role": "system", "content": system_prompt}] + messages

        for attempt in range(MAX_RETRIES):
            try:
                start_time = time.perf_counter()
                response = await self.client.chat.completions.create(
                    model=self.model_config.api_id,
                    max_tokens=max_tokens,
                    messages=full_messages,
                )
                latency_ms = int((time.perf_counter() - start_time) * 1000)

                return CompletionResult.from_response(
                    content=response.choices[0].message.content,
                    input_tokens=response.usage.prompt_tokens,
                    output_tokens=response.usage.completion_tokens,
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
                logger.error(f"API error for {self.model_config.name}: {e}")
                raise

        logger.error(
            f"All {MAX_RETRIES} retries failed for {self.model_config.name}"
        )
        raise last_exception


XAI_MODELS = {
    "grok-4": ModelConfig(
        name="Grok 4",
        provider="xai",
        api_id="grok-4-0709",
        input_cost_per_1m=2.00,
        output_cost_per_1m=10.00,
        tier="flagship",
    ),
    "grok-4-1-fast": ModelConfig(
        name="Grok 4.1 Fast",
        provider="xai",
        api_id="grok-4-1-fast-reasoning",
        input_cost_per_1m=0.20,
        output_cost_per_1m=0.50,
        tier="workhorse",
    ),
    "grok-4-fast": ModelConfig(
        name="Grok 4 Fast",
        provider="xai",
        api_id="grok-4-fast-reasoning",
        input_cost_per_1m=0.20,
        output_cost_per_1m=0.50,
        tier="workhorse",
    ),
}
