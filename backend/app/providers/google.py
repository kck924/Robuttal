import asyncio
import logging
import time

import google.generativeai as genai
from google.api_core import exceptions as google_exceptions
from google.generativeai.types import HarmCategory, HarmBlockThreshold

from app.providers.base import BaseProvider, CompletionResult, ContentFilterError, ModelConfig

logger = logging.getLogger(__name__)

MAX_RETRIES = 3
RETRY_DELAY_SECONDS = 1.0
RETRY_MULTIPLIER = 2.0

# Safety settings for debate content - allow controversial debate topics
# Using BLOCK_NONE for debate-relevant categories to maximize model flexibility
DEBATE_SAFETY_SETTINGS = {
    HarmCategory.HARM_CATEGORY_HARASSMENT: HarmBlockThreshold.BLOCK_NONE,
    HarmCategory.HARM_CATEGORY_HATE_SPEECH: HarmBlockThreshold.BLOCK_NONE,
    HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT: HarmBlockThreshold.BLOCK_ONLY_HIGH,
    HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT: HarmBlockThreshold.BLOCK_ONLY_HIGH,
}


class GoogleProvider(BaseProvider):
    """Google Generative AI adapter for Gemini models."""

    def __init__(self, api_key: str, model_config: ModelConfig):
        super().__init__(api_key, model_config)
        genai.configure(api_key=api_key)
        self.model = genai.GenerativeModel(
            model_name=model_config.api_id,
        )

    async def complete(
        self,
        system_prompt: str,
        messages: list[dict],
        max_tokens: int = 1024,
    ) -> str:
        """
        Generate a completion using the Google Generative AI API.

        Args:
            system_prompt: The system prompt to set context
            messages: List of message dicts with 'role' and 'content' keys
            max_tokens: Maximum tokens in the response

        Returns:
            The text content of the model's response

        Raises:
            Exception: If the API returns an error after all retries
        """
        last_exception = None
        delay = RETRY_DELAY_SECONDS

        # Convert messages to Gemini format
        # Gemini uses 'user' and 'model' roles
        gemini_messages = []
        for msg in messages:
            role = "model" if msg["role"] == "assistant" else "user"
            gemini_messages.append({"role": role, "parts": [msg["content"]]})

        # NOTE: Do NOT pass generation_config with max_output_tokens!
        # There's a bug in the Google SDK where setting max_output_tokens causes
        # finish_reason=SAFETY on completely benign content. Let Gemini use defaults.

        for attempt in range(MAX_RETRIES):
            try:
                # Create a new model instance with system instruction and safety settings
                model_with_system = genai.GenerativeModel(
                    model_name=self.model_config.api_id,
                    system_instruction=system_prompt,
                    safety_settings=DEBATE_SAFETY_SETTINGS,
                )

                response = await model_with_system.generate_content_async(
                    gemini_messages,
                )

                # Check for content filter (finish_reason 2 = SAFETY)
                if response.candidates and response.candidates[0].finish_reason == 2:
                    raise ContentFilterError(
                        provider="google",
                        model_name=self.model_config.name,
                        message="Content blocked by safety filter (finish_reason=SAFETY)"
                    )

                return response.text

            except ValueError as e:
                # The google SDK raises ValueError when trying to access response.text
                # if the content was filtered (finish_reason = 2)
                if "finish_reason" in str(e):
                    raise ContentFilterError(
                        provider="google",
                        model_name=self.model_config.name,
                        message=f"Content blocked by safety filter: {e}"
                    )
                raise

            except google_exceptions.ResourceExhausted as e:
                last_exception = e
                logger.warning(
                    f"Rate limit hit for {self.model_config.name}, "
                    f"attempt {attempt + 1}/{MAX_RETRIES}, retrying in {delay}s"
                )
                await asyncio.sleep(delay)
                delay *= RETRY_MULTIPLIER

            except google_exceptions.ServiceUnavailable as e:
                last_exception = e
                logger.warning(
                    f"Service unavailable for {self.model_config.name}, "
                    f"attempt {attempt + 1}/{MAX_RETRIES}, retrying in {delay}s"
                )
                await asyncio.sleep(delay)
                delay *= RETRY_MULTIPLIER

            except google_exceptions.GoogleAPIError as e:
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

        Raises:
            ContentFilterError: If the content filter blocks the response
        """
        last_exception = None
        delay = RETRY_DELAY_SECONDS

        # Convert messages to Gemini format
        gemini_messages = []
        for msg in messages:
            role = "model" if msg["role"] == "assistant" else "user"
            gemini_messages.append({"role": role, "parts": [msg["content"]]})

        # NOTE: Do NOT pass generation_config with max_output_tokens!
        # There's a bug in the Google SDK where setting max_output_tokens causes
        # finish_reason=SAFETY on completely benign content. Let Gemini use defaults.

        for attempt in range(MAX_RETRIES):
            try:
                model_with_system = genai.GenerativeModel(
                    model_name=self.model_config.api_id,
                    system_instruction=system_prompt,
                    safety_settings=DEBATE_SAFETY_SETTINGS,
                )

                start_time = time.perf_counter()
                response = await model_with_system.generate_content_async(
                    gemini_messages,
                )
                latency_ms = int((time.perf_counter() - start_time) * 1000)

                # Check for content filter (finish_reason 2 = SAFETY)
                if response.candidates and response.candidates[0].finish_reason == 2:
                    raise ContentFilterError(
                        provider="google",
                        model_name=self.model_config.name,
                        message="Content blocked by safety filter (finish_reason=SAFETY)"
                    )

                # Google's usage metadata
                usage = response.usage_metadata
                return CompletionResult.from_response(
                    content=response.text,
                    input_tokens=usage.prompt_token_count,
                    output_tokens=usage.candidates_token_count,
                    latency_ms=latency_ms,
                    model_config=self.model_config,
                )

            except ValueError as e:
                # The google SDK raises ValueError when trying to access response.text
                # if the content was filtered (finish_reason = 2)
                if "finish_reason" in str(e):
                    raise ContentFilterError(
                        provider="google",
                        model_name=self.model_config.name,
                        message=f"Content blocked by safety filter: {e}"
                    )
                raise

            except google_exceptions.ResourceExhausted as e:
                last_exception = e
                logger.warning(
                    f"Rate limit hit for {self.model_config.name}, "
                    f"attempt {attempt + 1}/{MAX_RETRIES}, retrying in {delay}s"
                )
                await asyncio.sleep(delay)
                delay *= RETRY_MULTIPLIER

            except google_exceptions.ServiceUnavailable as e:
                last_exception = e
                logger.warning(
                    f"Service unavailable for {self.model_config.name}, "
                    f"attempt {attempt + 1}/{MAX_RETRIES}, retrying in {delay}s"
                )
                await asyncio.sleep(delay)
                delay *= RETRY_MULTIPLIER

            except google_exceptions.GoogleAPIError as e:
                logger.error(f"API error for {self.model_config.name}: {e}")
                raise

        logger.error(
            f"All {MAX_RETRIES} retries failed for {self.model_config.name}"
        )
        raise last_exception


GOOGLE_MODELS = {
    "gemini-2.0-flash": ModelConfig(
        name="Gemini 2.0 Flash",
        provider="google",
        api_id="gemini-2.0-flash",
        input_cost_per_1m=0.10,
        output_cost_per_1m=0.40,
        tier="budget",
    ),
    "gemini-2.5-flash": ModelConfig(
        name="Gemini 2.5 Flash",
        provider="google",
        api_id="gemini-2.5-flash",
        input_cost_per_1m=0.15,
        output_cost_per_1m=0.60,
        tier="budget",
    ),
    "gemini-2.5-pro": ModelConfig(
        name="Gemini 2.5 Pro",
        provider="google",
        api_id="gemini-2.5-pro",
        input_cost_per_1m=1.25,
        output_cost_per_1m=10.0,
        tier="workhorse",
    ),
    "gemini-3-pro": ModelConfig(
        name="Gemini 3 Pro",
        provider="google",
        api_id="gemini-3-pro-preview",
        input_cost_per_1m=2.0,
        output_cost_per_1m=12.0,
        tier="flagship",
    ),
}
