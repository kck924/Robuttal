#!/usr/bin/env python3
"""
Script to run multiple debates for testing/development.

Usage:
    python scripts/run_debates.py --count 10
"""

import argparse
import asyncio
import logging
import sys

# Add parent directory to path for imports
sys.path.insert(0, "/Users/kevinklein/Desktop/Robuttal/backend")

from app.database import async_session_maker
from app.services.scheduler import run_single_debate

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)


async def run_debates(count: int):
    """Run multiple debates sequentially."""
    logger.info(f"Starting {count} debates...")

    successful = 0
    failed = 0

    for i in range(count):
        logger.info(f"\n{'='*60}")
        logger.info(f"Starting debate {i + 1} of {count}")
        logger.info(f"{'='*60}\n")

        try:
            async with async_session_maker() as db:
                debate = await run_single_debate(db)
                if debate:
                    await db.commit()
                    logger.info(f"Debate {i + 1} completed successfully: {debate.id}")
                    successful += 1
                else:
                    logger.warning(f"Debate {i + 1} skipped (no topic available)")
                    failed += 1
        except Exception as e:
            logger.error(f"Debate {i + 1} failed: {e}", exc_info=True)
            failed += 1

    logger.info(f"\n{'='*60}")
    logger.info(f"Completed: {successful} successful, {failed} failed")
    logger.info(f"{'='*60}")


def main():
    parser = argparse.ArgumentParser(description="Run multiple debates")
    parser.add_argument(
        "--count", "-c",
        type=int,
        default=10,
        help="Number of debates to run (default: 10)"
    )
    args = parser.parse_args()

    asyncio.run(run_debates(args.count))


if __name__ == "__main__":
    main()
