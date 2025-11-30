"""
Seed script to populate the models table with initial AI models.

Usage:
    cd backend
    python -m scripts.seed_models
"""

import asyncio
import uuid
from datetime import datetime

from sqlalchemy import select

from app.database import async_session_maker
from app.models import Model

SEED_MODELS = [
    {
        "name": "Claude Opus 4.5",
        "provider": "anthropic",
        "api_model_id": "claude-opus-4-5-20251101",
    },
    {
        "name": "Claude Opus 4",
        "provider": "anthropic",
        "api_model_id": "claude-opus-4-20250514",
    },
    {
        "name": "Claude Sonnet 4.5",
        "provider": "anthropic",
        "api_model_id": "claude-sonnet-4-5-20250929",
    },
    {
        "name": "Claude Sonnet 4",
        "provider": "anthropic",
        "api_model_id": "claude-sonnet-4-20250514",
    },
    {
        "name": "GPT-4o",
        "provider": "openai",
        "api_model_id": "gpt-4o",
    },
    {
        "name": "Gemini 2.5 Pro",
        "provider": "google",
        "api_model_id": "gemini-2.5-pro",
    },
    {
        "name": "Gemini 2.5 Flash",
        "provider": "google",
        "api_model_id": "gemini-2.5-flash",
    },
    {
        "name": "Gemini 2.0 Flash",
        "provider": "google",
        "api_model_id": "gemini-2.0-flash",
    },
    {
        "name": "Mistral Large",
        "provider": "mistral",
        "api_model_id": "mistral-large-latest",
    },
    {
        "name": "Mistral Large 2",
        "provider": "mistral",
        "api_model_id": "mistral-large-2411",
    },
    {
        "name": "Gemini 3 Pro",
        "provider": "google",
        "api_model_id": "gemini-3-pro-preview",
    },
    {
        "name": "Grok 4",
        "provider": "xai",
        "api_model_id": "grok-4-0709",
    },
    {
        "name": "Grok 4.1 Fast",
        "provider": "xai",
        "api_model_id": "grok-4-1-fast-reasoning",
    },
    {
        "name": "Grok 4 Fast",
        "provider": "xai",
        "api_model_id": "grok-4-fast-reasoning",
    },
    {
        "name": "DeepSeek V3",
        "provider": "deepseek",
        "api_model_id": "deepseek-chat",
    },
    {
        "name": "DeepSeek R1",
        "provider": "deepseek",
        "api_model_id": "deepseek-reasoner",
    },
]


async def seed_models() -> None:
    """Seed the models table with initial AI models."""
    async with async_session_maker() as session:
        for model_data in SEED_MODELS:
            # Check if model already exists
            result = await session.execute(
                select(Model).where(Model.api_model_id == model_data["api_model_id"])
            )
            existing = result.scalar_one_or_none()

            if existing:
                print(f"Model '{model_data['name']}' already exists, skipping...")
                continue

            model = Model(
                id=uuid.uuid4(),
                name=model_data["name"],
                provider=model_data["provider"],
                api_model_id=model_data["api_model_id"],
                elo_rating=1500,
                debates_won=0,
                debates_lost=0,
                times_judged=0,
                avg_judge_score=None,
                is_active=True,
                created_at=datetime.utcnow(),
            )
            session.add(model)
            print(f"Added model: {model_data['name']}")

        await session.commit()
        print("\nSeeding complete!")


if __name__ == "__main__":
    asyncio.run(seed_models())
