from app.providers.base import BaseProvider, CompletionResult, ModelConfig
from app.providers.anthropic import AnthropicProvider, ANTHROPIC_MODELS
from app.providers.openai import OpenAIProvider, OPENAI_MODELS
from app.providers.google import GoogleProvider, GOOGLE_MODELS
from app.providers.mistral import MistralProvider, MISTRAL_MODELS
from app.providers.xai import XAIProvider, XAI_MODELS
from app.providers.deepseek import DeepSeekProvider, DEEPSEEK_MODELS

# Combined model registry
ALL_MODELS = {
    **ANTHROPIC_MODELS,
    **OPENAI_MODELS,
    **GOOGLE_MODELS,
    **MISTRAL_MODELS,
    **XAI_MODELS,
    **DEEPSEEK_MODELS,
}


def get_provider(
    provider_name: str,
    model_config: ModelConfig,
    api_key: str,
) -> BaseProvider:
    """
    Factory function to get the appropriate provider adapter.

    Args:
        provider_name: The provider name ("anthropic", "openai", "google", "mistral")
        model_config: The model configuration
        api_key: The API key for the provider

    Returns:
        An instance of the appropriate provider adapter

    Raises:
        ValueError: If the provider name is not recognized
    """
    providers = {
        "anthropic": AnthropicProvider,
        "openai": OpenAIProvider,
        "google": GoogleProvider,
        "mistral": MistralProvider,
        "xai": XAIProvider,
        "deepseek": DeepSeekProvider,
    }

    provider_class = providers.get(provider_name)
    if provider_class is None:
        raise ValueError(f"Unknown provider: {provider_name}")

    return provider_class(api_key=api_key, model_config=model_config)


def get_provider_for_model(model_key: str, api_keys: dict[str, str]) -> BaseProvider:
    """
    Get a provider instance for a model by its key.

    Args:
        model_key: The model key (e.g., "claude-sonnet-4", "gpt-4o")
        api_keys: Dict mapping provider names to API keys

    Returns:
        An instance of the appropriate provider adapter

    Raises:
        ValueError: If the model key is not recognized
        KeyError: If the API key for the provider is not provided
    """
    model_config = ALL_MODELS.get(model_key)
    if model_config is None:
        raise ValueError(f"Unknown model: {model_key}")

    api_key = api_keys.get(model_config.provider)
    if api_key is None:
        raise KeyError(f"No API key provided for provider: {model_config.provider}")

    return get_provider(model_config.provider, model_config, api_key)


__all__ = [
    "BaseProvider",
    "CompletionResult",
    "ModelConfig",
    "AnthropicProvider",
    "OpenAIProvider",
    "GoogleProvider",
    "MistralProvider",
    "XAIProvider",
    "DeepSeekProvider",
    "ANTHROPIC_MODELS",
    "OPENAI_MODELS",
    "GOOGLE_MODELS",
    "MISTRAL_MODELS",
    "XAI_MODELS",
    "DEEPSEEK_MODELS",
    "ALL_MODELS",
    "get_provider",
    "get_provider_for_model",
]
