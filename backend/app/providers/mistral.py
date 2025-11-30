import asyncio
import logging
import time

from mistralai import Mistral
from mistralai.models import SDKError

from app.providers.base import BaseProvider, CompletionResult, ContentFilterError, ModelConfig

logger = logging.getLogger(__name__)

MAX_RETRIES = 3
RETRY_DELAY_SECONDS = 1.0
RETRY_MULTIPLIER = 2.0


class MistralProvider(BaseProvider):
    """Mistral AI adapter for Mistral models."""

    def __init__(self, api_key: str, model_config: ModelConfig):
        super().__init__(api_key, model_config)
        self.client = Mistral(api_key=api_key)

    async def complete(
        self,
        system_prompt: str,
        messages: list[dict],
        max_tokens: int = 1024,
    ) -> str:
        """
        Generate a completion using the Mistral API.

        Args:
            system_prompt: The system prompt to set context
            messages: List of message dicts with 'role' and 'content' keys
            max_tokens: Maximum tokens in the response

        Returns:
            The text content of the model's response

        Raises:
            SDKError: If the API returns an error after all retries
        """
        last_exception = None
        delay = RETRY_DELAY_SECONDS

        # Prepend system message to the messages list
        full_messages = [{"role": "system", "content": system_prompt}] + messages

        for attempt in range(MAX_RETRIES):
            try:
                response = await self.client.chat.complete_async(
                    model=self.model_config.api_id,
                    max_tokens=max_tokens,
                    messages=full_messages,
                )
                return response.choices[0].message.content

            except SDKError as e:
                # Check if it's a rate limit error (status code 429)
                if hasattr(e, "status_code") and e.status_code == 429:
                    last_exception = e
                    logger.warning(
                        f"Rate limit hit for {self.model_config.name}, "
                        f"attempt {attempt + 1}/{MAX_RETRIES}, retrying in {delay}s"
                    )
                    await asyncio.sleep(delay)
                    delay *= RETRY_MULTIPLIER
                elif hasattr(e, "status_code") and e.status_code in (502, 503, 504):
                    last_exception = e
                    logger.warning(
                        f"Service error for {self.model_config.name}, "
                        f"attempt {attempt + 1}/{MAX_RETRIES}, retrying in {delay}s"
                    )
                    await asyncio.sleep(delay)
                    delay *= RETRY_MULTIPLIER
                else:
                    # Check for content policy violations
                    error_str = str(e).lower()
                    if "moderation" in error_str or "content" in error_str or "safety" in error_str:
                        raise ContentFilterError(
                            provider="mistral",
                            model_name=self.model_config.name,
                            message=f"Content blocked by safety filter: {e}"
                        )
                    logger.error(f"API error for {self.model_config.name}: {e}")
                    raise

            except Exception as e:
                logger.error(f"Unexpected error for {self.model_config.name}: {e}")
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
                response = await self.client.chat.complete_async(
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

            except SDKError as e:
                # Check if it's a rate limit error (status code 429)
                if hasattr(e, "status_code") and e.status_code == 429:
                    last_exception = e
                    logger.warning(
                        f"Rate limit hit for {self.model_config.name}, "
                        f"attempt {attempt + 1}/{MAX_RETRIES}, retrying in {delay}s"
                    )
                    await asyncio.sleep(delay)
                    delay *= RETRY_MULTIPLIER
                elif hasattr(e, "status_code") and e.status_code in (502, 503, 504):
                    last_exception = e
                    logger.warning(
                        f"Service error for {self.model_config.name}, "
                        f"attempt {attempt + 1}/{MAX_RETRIES}, retrying in {delay}s"
                    )
                    await asyncio.sleep(delay)
                    delay *= RETRY_MULTIPLIER
                else:
                    # Check for content policy violations
                    error_str = str(e).lower()
                    if "moderation" in error_str or "content" in error_str or "safety" in error_str:
                        raise ContentFilterError(
                            provider="mistral",
                            model_name=self.model_config.name,
                            message=f"Content blocked by safety filter: {e}"
                        )
                    logger.error(f"API error for {self.model_config.name}: {e}")
                    raise

            except Exception as e:
                logger.error(f"Unexpected error for {self.model_config.name}: {e}")
                raise

        logger.error(
            f"All {MAX_RETRIES} retries failed for {self.model_config.name}"
        )
        raise last_exception


MISTRAL_MODELS = {
    "mistral-large": ModelConfig(
        name="Mistral Large",
        provider="mistral",
        api_id="mistral-large-latest",
        input_cost_per_1m=2.0,
        output_cost_per_1m=6.0,
        tier="workhorse",
    ),
    "mistral-large-2": ModelConfig(
        name="Mistral Large 2",
        provider="mistral",
        api_id="mistral-large-2411",
        input_cost_per_1m=2.0,
        output_cost_per_1m=6.0,
        tier="flagship",
    ),
}
