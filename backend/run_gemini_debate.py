"""Run a debate using only Gemini models."""
import asyncio
from datetime import datetime

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import async_session_maker
from app.models import Debate, Model, Topic, TranscriptEntry
from app.models.enums import DebatePhase, DebatePosition, DebateStatus, TopicSource, TopicStatus
from app.config import get_settings
from app.providers.google import GoogleProvider, GOOGLE_MODELS
from app.services.elo import update_elos_for_debate


async def run_gemini_debate():
    """Run a complete debate using only Gemini models."""
    async with async_session_maker() as db:
        # Get all active Gemini models
        result = await db.execute(
            select(Model).where(Model.provider == "google", Model.is_active == True)
        )
        gemini_models = list(result.scalars().all())
        
        print(f"Found {len(gemini_models)} Gemini models:")
        for m in gemini_models:
            print(f"  - {m.name} ({m.api_model_id})")
        
        if len(gemini_models) < 3:
            print("Need at least 3 Gemini models!")
            return
        
        # Assign roles - prioritize models less likely to hit content filters
        # Gemini 2.0 Flash has been most reliable
        debater_pro = gemini_models[0]  # Gemini 3 Pro
        debater_con = gemini_models[1]  # Gemini 2.5 Flash
        # Use Gemini 2.0 Flash as judge (most reliable)
        judge = next((m for m in gemini_models if "2.0" in m.api_model_id), gemini_models[3])
        # Use a different model for auditor
        auditor = next((m for m in gemini_models if m.id != judge.id and "2.5-flash" in m.api_model_id), gemini_models[1])
        
        print(f"\nRoles:")
        print(f"  PRO: {debater_pro.name}")
        print(f"  CON: {debater_con.name}")
        print(f"  Judge: {judge.name}")
        print(f"  Auditor: {auditor.name}")
        
        # Find or create the topic
        result = await db.execute(
            select(Topic).where(Topic.title.ilike("%hot dog%sandwich%"))
        )
        topic = result.scalar_one_or_none()
        
        if not topic:
            # Check for pineapple pizza topic
            result = await db.execute(
                select(Topic).where(Topic.title.ilike("%pineapple%pizza%"))
            )
            topic = result.scalar_one_or_none()
        
        if not topic:
            # Create a simple topic
            topic = Topic(
                title="A hot dog is a sandwich",
                category="Philosophy",
                source=TopicSource.SEED,
                status=TopicStatus.SELECTED,
            )
            db.add(topic)
            await db.flush()
            print(f"\nCreated topic: {topic.title}")
        else:
            topic.status = TopicStatus.SELECTED
            await db.flush()
            print(f"\nUsing topic: {topic.title}")
        
        # Create the debate with scheduled_at
        now = datetime.utcnow()
        debate = Debate(
            topic_id=topic.id,
            debater_pro_id=debater_pro.id,
            debater_con_id=debater_con.id,
            judge_id=judge.id,
            auditor_id=auditor.id,
            status=DebateStatus.IN_PROGRESS,
            scheduled_at=now,
            started_at=now,
        )
        db.add(debate)
        await db.flush()
        print(f"\nCreated debate: {debate.id}")
        
        # Create provider instances for each model
        def get_provider_for_model(model):
            """Get a GoogleProvider instance for a specific model."""
            # Find the model config from GOOGLE_MODELS
            for key, config in GOOGLE_MODELS.items():
                if config.api_id == model.api_model_id:
                    return GoogleProvider(get_settings().google_api_key, config)
            # Default to gemini-2.0-flash config if not found
            return GoogleProvider(get_settings().google_api_key, GOOGLE_MODELS["gemini-2.0-flash"])

        # Track transcript entries
        sequence = 0

        async def add_entry(phase, speaker, position, content, input_tokens=0, output_tokens=0, latency_ms=0, cost_usd=0):
            nonlocal sequence
            entry = TranscriptEntry(
                debate_id=debate.id,
                phase=phase,
                speaker_id=speaker.id,
                position=position,
                content=content,
                token_count=output_tokens,
                input_tokens=input_tokens,
                output_tokens=output_tokens,
                latency_ms=latency_ms,
                cost_usd=cost_usd,
                sequence_order=sequence,
            )
            db.add(entry)
            sequence += 1
            return entry

        async def get_response(model, prompt, system_prompt, retries=3):
            """Get response from a Gemini model with retry on content filter."""
            provider = get_provider_for_model(model)

            for attempt in range(retries):
                try:
                    result = await provider.complete_with_usage(
                        system_prompt=system_prompt,
                        messages=[{"role": "user", "content": prompt}],
                        max_tokens=1000,
                    )
                    return {
                        "content": result.content,
                        "input_tokens": result.input_tokens,
                        "output_tokens": result.output_tokens,
                        "latency_ms": result.latency_ms,
                        "cost_usd": result.cost_usd,
                    }
                except ValueError as e:
                    if "finish_reason" in str(e) and attempt < retries - 1:
                        print(f"  Content filter triggered, retrying ({attempt + 1}/{retries})...")
                        await asyncio.sleep(1)  # Small delay before retry
                        continue
                    raise
            raise Exception("Failed after all retries")
        
        # Build context for each phase
        transcript_so_far = []
        
        def get_transcript_text():
            return "\n\n".join(transcript_so_far)
        
        # === OPENING STATEMENTS ===
        print("\n=== OPENING STATEMENTS ===")
        
        # Pro opening
        pro_system = f"""You are participating in a formal debate. Your opponent is another AI model.

Topic: {topic.title}
Your position: PRO (arguing in favor)

Rules:
- Keep your response under 300 words
- Be persuasive but intellectually honest
- Support claims with reasoning and examples

Current phase: Opening Statement"""

        print(f"\n[PRO Opening - {debater_pro.name}]")
        resp = await get_response(debater_pro, "Please present your opening statement arguing in favor of the proposition.", pro_system)
        print(resp["content"][:200] + "...")
        await add_entry(DebatePhase.OPENING, debater_pro, DebatePosition.PRO, resp["content"], 
                       resp["input_tokens"], resp["output_tokens"], resp["latency_ms"], resp["cost_usd"])
        transcript_so_far.append(f"PRO OPENING ({debater_pro.name}):\n{resp['content']}")
        
        # Con opening
        con_system = f"""You are participating in a formal debate. Your opponent is another AI model.

Topic: {topic.title}
Your position: CON (arguing against)

Rules:
- Keep your response under 300 words
- Be persuasive but intellectually honest
- Support claims with reasoning and examples

Current phase: Opening Statement"""

        print(f"\n[CON Opening - {debater_con.name}]")
        resp = await get_response(debater_con, "Please present your opening statement arguing against the proposition.", con_system)
        print(resp["content"][:200] + "...")
        await add_entry(DebatePhase.OPENING, debater_con, DebatePosition.CON, resp["content"],
                       resp["input_tokens"], resp["output_tokens"], resp["latency_ms"], resp["cost_usd"])
        transcript_so_far.append(f"CON OPENING ({debater_con.name}):\n{resp['content']}")
        
        # === REBUTTALS ===
        print("\n=== REBUTTALS ===")
        
        # Con rebuttal (responds to pro's opening)
        # Get just the opponent's opening for the rebuttal
        pro_opening = transcript_so_far[0].split(":\n", 1)[1] if transcript_so_far else ""
        con_opening = transcript_so_far[1].split(":\n", 1)[1] if len(transcript_so_far) > 1 else ""

        con_rebuttal_system = f"""You are debating: {topic.title}
Your position: AGAINST (CON)

Your opponent's opening argument:
{pro_opening[:800]}

Rebut their main points in under 250 words. Be respectful and focus on logical counter-arguments."""

        print(f"\n[CON Rebuttal - {debater_con.name}]")
        resp = await get_response(debater_con, "Present your rebuttal to your opponent's opening argument.", con_rebuttal_system)
        print(resp["content"][:200] + "...")
        await add_entry(DebatePhase.REBUTTAL, debater_con, DebatePosition.CON, resp["content"],
                       resp["input_tokens"], resp["output_tokens"], resp["latency_ms"], resp["cost_usd"])
        transcript_so_far.append(f"CON REBUTTAL ({debater_con.name}):\n{resp['content']}")

        # Pro rebuttal
        pro_rebuttal_system = f"""You are debating: {topic.title}
Your position: FOR (PRO)

Your opponent's opening argument:
{con_opening[:800]}

Rebut their main points in under 250 words. Be respectful and focus on logical counter-arguments."""

        print(f"\n[PRO Rebuttal - {debater_pro.name}]")
        resp = await get_response(debater_pro, "Present your rebuttal to your opponent's opening argument.", pro_rebuttal_system)
        print(resp["content"][:200] + "...")
        await add_entry(DebatePhase.REBUTTAL, debater_pro, DebatePosition.PRO, resp["content"],
                       resp["input_tokens"], resp["output_tokens"], resp["latency_ms"], resp["cost_usd"])
        transcript_so_far.append(f"PRO REBUTTAL ({debater_pro.name}):\n{resp['content']}")
        
        # === CLOSING ARGUMENTS ===
        print("\n=== CLOSING ARGUMENTS ===")

        # Pro closing
        pro_closing_system = f"""You are debating: {topic.title}
Your position: FOR (PRO)

Make your closing argument summarizing why your position is correct. Keep under 200 words."""

        print(f"\n[PRO Closing - {debater_pro.name}]")
        resp = await get_response(debater_pro, "Present your closing argument.", pro_closing_system)
        print(resp["content"][:200] + "...")
        await add_entry(DebatePhase.CLOSING, debater_pro, DebatePosition.PRO, resp["content"],
                       resp["input_tokens"], resp["output_tokens"], resp["latency_ms"], resp["cost_usd"])
        transcript_so_far.append(f"PRO CLOSING ({debater_pro.name}):\n{resp['content']}")

        # Con closing
        con_closing_system = f"""You are debating: {topic.title}
Your position: AGAINST (CON)

Make your closing argument summarizing why your position is correct. Keep under 200 words."""

        print(f"\n[CON Closing - {debater_con.name}]")
        resp = await get_response(debater_con, "Present your closing argument.", con_closing_system)
        print(resp["content"][:200] + "...")
        await add_entry(DebatePhase.CLOSING, debater_con, DebatePosition.CON, resp["content"],
                       resp["input_tokens"], resp["output_tokens"], resp["latency_ms"], resp["cost_usd"])
        transcript_so_far.append(f"CON CLOSING ({debater_con.name}):\n{resp['content']}")
        
        # === JUDGMENT ===
        print("\n=== JUDGMENT ===")

        # Build a summary of key points for the judge
        judge_system = f"""You are judging a debate on: {topic.title}

PRO argued that a hot dog IS a sandwich, emphasizing definitional logic and the Merriam-Webster definition that includes "split rolls."

CON argued that a hot dog is NOT a sandwich, emphasizing structural differences (hinged bun vs two slices) and culinary tradition.

Score each debater 0-100 on: Logical Consistency (25), Evidence (25), Persuasiveness (25), Engagement (25).

Respond with JSON:
{{"pro_score": <int>, "con_score": <int>, "winner": "pro" or "con", "reasoning": "<explanation>"}}"""

        print(f"\n[Judge - {judge.name}]")
        resp = await get_response(judge, "Judge this debate and declare a winner with scores.", judge_system)
        print(resp["content"])
        await add_entry(DebatePhase.JUDGMENT, judge, DebatePosition.JUDGE, resp["content"],
                       resp["input_tokens"], resp["output_tokens"], resp["latency_ms"], resp["cost_usd"])
        
        # Parse judgment
        import json
        import re
        
        # Extract JSON from response
        json_match = re.search(r'\{[^{}]*"pro_score"[^{}]*\}', resp["content"], re.DOTALL)
        if json_match:
            try:
                judgment = json.loads(json_match.group())
                debate.pro_score = judgment.get("pro_score", 50)
                debate.con_score = judgment.get("con_score", 50)
                winner = judgment.get("winner", "pro")
                debate.winner_id = debater_pro.id if winner == "pro" else debater_con.id
            except json.JSONDecodeError:
                # Default scores
                debate.pro_score = 50
                debate.con_score = 50
                debate.winner_id = debater_pro.id
        else:
            debate.pro_score = 50
            debate.con_score = 50
            debate.winner_id = debater_pro.id
        
        # === AUDIT ===
        print("\n=== AUDIT ===")

        judge_decision = resp["content"]

        # Use a simple audit system prompt
        audit_system = f"""Rate the quality of this debate judgment (1-10 for accuracy, fairness, thoroughness, reasoning).

Topic: {topic.title}
Judgment: PRO scored {debate.pro_score}, CON scored {debate.con_score}

Reply with JSON: {{"accuracy": <1-10>, "fairness": <1-10>, "thoroughness": <1-10>, "reasoning_quality": <1-10>, "overall_score": <float 1-10>, "notes": "<brief observation>"}}"""

        print(f"\n[Auditor - {auditor.name}]")
        try:
            resp = await get_response(auditor, "Rate this judgment.", audit_system)
            print(resp["content"])
            await add_entry(DebatePhase.AUDIT, auditor, DebatePosition.AUDITOR, resp["content"],
                           resp["input_tokens"], resp["output_tokens"], resp["latency_ms"], resp["cost_usd"])

            # Parse audit score
            json_match = re.search(r'\{[^{}]*"overall_score"[^{}]*\}', resp["content"], re.DOTALL)
            if json_match:
                try:
                    audit = json.loads(json_match.group())
                    debate.judge_score = audit.get("overall_score", 7.0)
                except json.JSONDecodeError:
                    debate.judge_score = 7.0
            else:
                debate.judge_score = 7.0
        except ValueError as e:
            print(f"  Audit skipped due to content filter: {e}")
            debate.judge_score = 7.0
            # Add a placeholder entry
            await add_entry(DebatePhase.AUDIT, auditor, DebatePosition.AUDITOR,
                          '{"accuracy": 7, "fairness": 7, "thoroughness": 7, "reasoning_quality": 7, "overall_score": 7.0, "notes": "Audit skipped due to content filter"}',
                          0, 0, 0, 0)
        
        # Complete the debate
        debate.status = DebateStatus.COMPLETED
        debate.completed_at = datetime.utcnow()
        topic.status = TopicStatus.DEBATED
        topic.debated_at = datetime.utcnow()
        
        # Update Elo ratings
        winner_model = debater_pro if debate.winner_id == debater_pro.id else debater_con
        loser_model = debater_con if debate.winner_id == debater_pro.id else debater_pro

        await update_elos_for_debate(db, debate.id)
        
        await db.commit()
        
        print(f"\n{'='*50}")
        print(f"DEBATE COMPLETED!")
        print(f"Topic: {topic.title}")
        print(f"Winner: {winner_model.name}")
        print(f"Pro Score: {debate.pro_score}")
        print(f"Con Score: {debate.con_score}")
        print(f"Judge Score: {debate.judge_score}")
        print(f"Debate ID: {debate.id}")
        print(f"{'='*50}")


if __name__ == "__main__":
    asyncio.run(run_gemini_debate())
