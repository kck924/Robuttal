"""DeepSeek AI provider - uses OpenAI-compatible API."""

import asyncio
import logging
import time

from openai import AsyncOpenAI

from app.providers.base import BaseProvider, CompletionResult, ContentFilterError, ModelConfig

logger = logging.getLogger(__name__)

MAX_RETRIES = 3
RETRY_DELAY_SECONDS = 1.0
RETRY_MULTIPLIER = 2.0

# DeepSeek API base URL
DEEPSEEK_BASE_URL = "https://api.deepseek.com"


class DeepSeekProvider(BaseProvider):
    """DeepSeek AI adapter using OpenAI-compatible API."""

    def __init__(self, api_key: str, model_config: ModelConfig):
        super().__init__(api_key, model_config)
        self.client = AsyncOpenAI(
            api_key=api_key,
            base_url=DEEPSEEK_BASE_URL,
        )

    async def complete(
        self,
        system_prompt: str,
        messages: list[dict],
        max_tokens: int = 1024,
    ) -> str:
        """
        Generate a completion using the DeepSeek API.

        Args:
            system_prompt: The system prompt to set context
            messages: List of message dicts with 'role' and 'content' keys
            max_tokens: Maximum tokens in the response

        Returns:
            The text content of the model's response
        """
        last_exception = None
        delay = RETRY_DELAY_SECONDS

        full_messages = [{"role": "system", "content": system_prompt}] + messages

        for attempt in range(MAX_RETRIES):
            try:
                response = await self.client.chat.completions.create(
                    model=self.model_config.api_id,
                    messages=full_messages,
                    max_tokens=max_tokens,
                )
                return response.choices[0].message.content

            except Exception as e:
                error_str = str(e).lower()

                # Check for rate limiting
                if "rate" in error_str or "429" in str(e):
                    last_exception = e
                    logger.warning(
                        f"Rate limit hit for {self.model_config.name}, "
                        f"attempt {attempt + 1}/{MAX_RETRIES}, retrying in {delay}s"
                    )
                    await asyncio.sleep(delay)
                    delay *= RETRY_MULTIPLIER
                # Check for content filter
                elif "content" in error_str or "filter" in error_str or "moderation" in error_str:
                    raise ContentFilterError(
                        provider="deepseek",
                        model_name=self.model_config.name,
                        message=f"Content blocked by safety filter: {e}"
                    )
                # Check for service errors
                elif "502" in str(e) or "503" in str(e) or "504" in str(e):
                    last_exception = e
                    logger.warning(
                        f"Service error for {self.model_config.name}, "
                        f"attempt {attempt + 1}/{MAX_RETRIES}, retrying in {delay}s"
                    )
                    await asyncio.sleep(delay)
                    delay *= RETRY_MULTIPLIER
                else:
                    logger.error(f"API error for {self.model_config.name}: {e}")
                    raise

        logger.error(f"All {MAX_RETRIES} retries failed for {self.model_config.name}")
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

        full_messages = [{"role": "system", "content": system_prompt}] + messages

        for attempt in range(MAX_RETRIES):
            try:
                start_time = time.perf_counter()
                response = await self.client.chat.completions.create(
                    model=self.model_config.api_id,
                    messages=full_messages,
                    max_tokens=max_tokens,
                )
                latency_ms = int((time.perf_counter() - start_time) * 1000)

                return CompletionResult.from_response(
                    content=response.choices[0].message.content,
                    input_tokens=response.usage.prompt_tokens,
                    output_tokens=response.usage.completion_tokens,
                    latency_ms=latency_ms,
                    model_config=self.model_config,
                )

            except Exception as e:
                error_str = str(e).lower()

                if "rate" in error_str or "429" in str(e):
                    last_exception = e
                    logger.warning(
                        f"Rate limit hit for {self.model_config.name}, "
                        f"attempt {attempt + 1}/{MAX_RETRIES}, retrying in {delay}s"
                    )
                    await asyncio.sleep(delay)
                    delay *= RETRY_MULTIPLIER
                elif "content" in error_str or "filter" in error_str or "moderation" in error_str:
                    raise ContentFilterError(
                        provider="deepseek",
                        model_name=self.model_config.name,
                        message=f"Content blocked by safety filter: {e}"
                    )
                elif "502" in str(e) or "503" in str(e) or "504" in str(e):
                    last_exception = e
                    logger.warning(
                        f"Service error for {self.model_config.name}, "
                        f"attempt {attempt + 1}/{MAX_RETRIES}, retrying in {delay}s"
                    )
                    await asyncio.sleep(delay)
                    delay *= RETRY_MULTIPLIER
                else:
                    logger.error(f"API error for {self.model_config.name}: {e}")
                    raise

        logger.error(f"All {MAX_RETRIES} retries failed for {self.model_config.name}")
        raise last_exception


# DeepSeek pricing as of Sept 2025: $0.56/1M input (cache miss), $1.68/1M output
DEEPSEEK_MODELS = {
    "deepseek-chat": ModelConfig(
        name="DeepSeek V3",
        provider="deepseek",
        api_id="deepseek-chat",
        input_cost_per_1m=0.56,
        output_cost_per_1m=1.68,
        tier="budget",
    ),
    "deepseek-reasoner": ModelConfig(
        name="DeepSeek R1",
        provider="deepseek",
        api_id="deepseek-reasoner",
        input_cost_per_1m=0.56,
        output_cost_per_1m=1.68,
        tier="flagship",
    ),
}
