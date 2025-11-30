from abc import ABC, abstractmethod
from dataclasses import dataclass


class ContentFilterError(Exception):
    """
    Raised when a provider's content filter blocks the request.

    This allows the orchestrator to catch this specific error and
    substitute a different model for the debate.
    """

    def __init__(self, provider: str, model_name: str, message: str = "Content filter triggered"):
        self.provider = provider
        self.model_name = model_name
        self.message = message
        super().__init__(f"{provider}/{model_name}: {message}")


@dataclass
class ModelConfig:
    """Configuration for an AI model."""

    name: str
    provider: str
    api_id: str
    input_cost_per_1m: float
    output_cost_per_1m: float
    tier: str  # "flagship", "workhorse", "budget"


@dataclass
class CompletionResult:
    """Result from an AI model completion, including token usage."""

    content: str
    input_tokens: int
    output_tokens: int
    latency_ms: int
    cost_usd: float

    @classmethod
    def from_response(
        cls,
        content: str,
        input_tokens: int,
        output_tokens: int,
        latency_ms: int,
        model_config: "ModelConfig",
    ) -> "CompletionResult":
        """Create a CompletionResult and calculate cost based on model pricing."""
        cost_usd = (
            (input_tokens / 1_000_000) * model_config.input_cost_per_1m +
            (output_tokens / 1_000_000) * model_config.output_cost_per_1m
        )
        return cls(
            content=content,
            input_tokens=input_tokens,
            output_tokens=output_tokens,
            latency_ms=latency_ms,
            cost_usd=cost_usd,
        )


class BaseProvider(ABC):
    """Abstract base class for AI provider adapters."""

    def __init__(self, api_key: str, model_config: ModelConfig):
        self.api_key = api_key
        self.model_config = model_config

    @abstractmethod
    async def complete(
        self,
        system_prompt: str,
        messages: list[dict],
        max_tokens: int = 1024,
    ) -> str:
        """
        Generate a completion from the model.

        Args:
            system_prompt: The system prompt to set context
            messages: List of message dicts with 'role' and 'content' keys
            max_tokens: Maximum tokens in the response

        Returns:
            The text content of the model's response
        """
        pass

    @abstractmethod
    async def complete_with_usage(
        self,
        system_prompt: str,
        messages: list[dict],
        max_tokens: int = 1024,
    ) -> CompletionResult:
        """
        Generate a completion and return full usage information.

        Args:
            system_prompt: The system prompt to set context
            messages: List of message dicts with 'role' and 'content' keys
            max_tokens: Maximum tokens in the response

        Returns:
            CompletionResult with content, token counts, latency, and cost
        """
        pass
