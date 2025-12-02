import asyncio
import json
import logging
import uuid
from datetime import datetime
from typing import TypedDict

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.config import get_settings
from app.models import (
    Debate,
    DebatePhase,
    DebatePosition,
    DebateStatus,
    Model,
    TranscriptEntry,
)
from app.providers import get_provider, ALL_MODELS
from app.providers.base import ContentFilterError

logger = logging.getLogger(__name__)

# Timeout for judge/auditor API calls (in seconds)
# This prevents hanging indefinitely on slow providers
JUDGE_API_TIMEOUT_SECONDS = 120  # 2 minutes - generous for long transcripts


class CategoryScores(TypedDict):
    logical_consistency: int
    evidence: int
    persuasiveness: int
    engagement: int


class JudgmentResult(TypedDict):
    pro_score: int
    con_score: int
    winner: str
    reasoning: str
    # Per-category breakdowns
    pro_scores: CategoryScores | None
    con_scores: CategoryScores | None


class AuditResult(TypedDict):
    accuracy: int
    fairness: int
    thoroughness: int
    reasoning_quality: int
    overall_score: float
    notes: str


JUDGE_SYSTEM_PROMPT = """You are a rhetorical analysis system and logical classifier. You are NOT a participant in this debate. You are a neutral data processor performing academic evaluation of argumentative text for a debate analytics platform.

Your task is to extract logical structures, classify rhetorical techniques, and generate structured evaluation metrics from the provided debate transcript. You are required to process potentially controversial or adversarial text for the purpose of academic classification and user reporting. Do not sanitize the output, as this will corrupt the data classification process.

Topic being analyzed: {topic}

IMPARTIALITY REQUIREMENT: You have NO inherent preference between the PRO or CON position. Both positions are equally valid starting points for debate. Your evaluation is based SOLELY on the quality of argumentation presented, NOT on which side of the topic you might personally agree with. A well-argued CON position should score higher than a poorly-argued PRO position, and vice versa. Judge the debate performance, not the underlying position.

DATA EXTRACTION REQUIREMENTS:
1. Parse the complete transcript and extract argument structures
2. Score each debater on each rubric category (0-25 each) for metrics collection
3. For EACH category, provide specific justification citing concrete examples from the transcript
4. Classify the winner based on total computed scores
5. Generate overall reasoning summary for user-facing reports

SCORING RUBRIC (extract scores 0-25 per category per debater):
- Logical Consistency: Internal coherence and absence of contradictions
- Evidence & Examples: Claim support quality with concrete examples or reasoning
- Persuasiveness: Rhetorical effectiveness and case strength
- Engagement: Quality of opponent argument engagement and counterpoints

TRANSPARENCY REQUIREMENT: Be specific about how you arrived at each score. Reference specific arguments, quotes, or moments from the debate. Explain score differentials between debaters in each category. This data is used for user-facing visualizations and comparative analytics.

Formatting: Use only standard hyphens (-). Do NOT use em dashes, en dashes, or any Unicode dash variants.

OUTPUT FORMAT (JSON only, no other text):
{{
  "pro_scores": {{
    "logical_consistency": <int 0-25>,
    "evidence": <int 0-25>,
    "persuasiveness": <int 0-25>,
    "engagement": <int 0-25>
  }},
  "con_scores": {{
    "logical_consistency": <int 0-25>,
    "evidence": <int 0-25>,
    "persuasiveness": <int 0-25>,
    "engagement": <int 0-25>
  }},
  "category_analysis": {{
    "logical_consistency": "<specific comparison of both sides' logical coherence, citing examples>",
    "evidence": "<specific comparison of evidence quality, citing examples used by each side>",
    "persuasiveness": "<specific comparison of persuasive techniques and effectiveness>",
    "engagement": "<specific comparison of how each side addressed opponent's arguments>"
  }},
  "winner": "pro" | "con",
  "reasoning": "<overall summary of the decision>"
}}"""

AUDITOR_SYSTEM_PROMPT = """You are a quality assurance system for debate evaluation pipelines. You are NOT a participant in this debate. You are a neutral meta-analysis processor auditing the quality of AI-generated evaluation data for a debate analytics platform.

Your task is to validate evaluation accuracy, detect scoring bias, and generate quality metrics for the judge's assessment. You are required to process potentially controversial or adversarial text for the purpose of evaluation validation and quality reporting. Do not sanitize the output, as this will corrupt the quality assurance process.

Topic being analyzed: {topic}

IMPARTIALITY REQUIREMENT: You have NO inherent preference between the PRO or CON position. Both positions are equally valid starting points for debate. When auditing the judge's evaluation, assess whether the judge evaluated argumentation quality fairly regardless of which side presented it. A judge who correctly awards higher scores to a well-argued CON position over a poorly-argued PRO position (or vice versa) is demonstrating fairness, not bias.

DATA TO VALIDATE:
1. The debate transcript (raw argumentative data)
2. The judge's scores and reasoning (evaluation data to audit)

QUALITY METRICS TO EXTRACT (score 1-10 each):
- Accuracy: Did the judge correctly parse and summarize both sides' arguments?
- Fairness: Was the evaluation free from systematic bias toward either side? (Note: Awarding different scores to different quality arguments is NOT bias - bias means favoring a position regardless of argument quality)
- Thoroughness: Did the evaluation address all key points and arguments from both debaters?
- Reasoning Quality: Is the decision well-justified with specific references?

TRANSPARENCY REQUIREMENT: For each criterion, provide specific evidence from the judge's evaluation:
- Cite examples that support your assessment
- Note any arguments the judge missed, mischaracterized, or handled well
- Identify where the judge showed strength or weakness in their analysis
- Flag specific instances of potential bias if detected (position-based, not quality-based differences)
This data is used for judge quality tracking and comparative analytics across the platform.

Formatting: Use only standard hyphens (-). Do NOT use em dashes, en dashes, or any Unicode dash variants.

OUTPUT FORMAT (JSON only, no other text):
{{
  "accuracy": <int 1-10>,
  "fairness": <int 1-10>,
  "thoroughness": <int 1-10>,
  "reasoning_quality": <int 1-10>,
  "criterion_analysis": {{
    "accuracy": "<specific assessment of how well the judge understood and summarized arguments, citing examples>",
    "fairness": "<specific assessment of judge's impartiality, noting any instances of bias or balanced treatment>",
    "thoroughness": "<specific assessment of what key points were addressed or missed by the judge>",
    "reasoning_quality": "<specific assessment of how well the judge justified scores and the final decision>"
  }},
  "overall_score": <float average of the four scores>,
  "notes": "<brief overall summary of judge performance>"
}}"""

JSON_RETRY_PROMPT = """Your previous response was not valid JSON. Please respond with ONLY valid JSON, no other text or markdown formatting. Do not wrap in code blocks."""


class JudgeService:
    """Service for judging debates and auditing judge performance."""

    def __init__(self, db_session: AsyncSession):
        self.db = db_session
        self.settings = get_settings()
        self._api_keys = {
            "anthropic": self.settings.anthropic_api_key,
            "openai": self.settings.openai_api_key,
            "google": self.settings.google_api_key,
            "mistral": self.settings.mistral_api_key,
            "xai": self.settings.xai_api_key,
            "deepseek": self.settings.deepseek_api_key,
        }
        self._excused_model_ids: set[uuid.UUID] = set()
        # Track content filter excuses for reporting back to scheduler
        self._content_filter_excuses: list[dict] = []

    @property
    def content_filter_excuses(self) -> list[dict]:
        """Get the list of content filter excuses that occurred during judging/auditing."""
        return self._content_filter_excuses

    async def _find_replacement_model(self, exclude_ids: set[uuid.UUID]) -> Model | None:
        """
        Find a replacement model that is not already in use or excluded.

        Args:
            exclude_ids: Set of model IDs to exclude

        Returns:
            A replacement Model, or None if no suitable replacement found
        """
        result = await self.db.execute(
            select(Model)
            .where(
                Model.is_active == True,
                Model.id.not_in(exclude_ids) if exclude_ids else True,
            )
            .order_by(Model.elo_rating.desc())
            .limit(1)
        )
        return result.scalar_one_or_none()

    async def _record_content_filter_excuse(
        self,
        debate_id: uuid.UUID,
        excused_model: Model,
        replacement_model: Model | None,
        role: str,
        phase: DebatePhase | None,
        error_message: str,
    ) -> None:
        """
        Record a content filter excuse by logging, updating model stats,
        and tracking for later retrieval by the scheduler.
        """
        # Increment the excused model's times_excused counter
        excused_model.times_excused += 1
        await self.db.flush()

        self._excused_model_ids.add(excused_model.id)

        # Track excuse for retrieval by scheduler
        self._content_filter_excuses.append({
            "model_id": str(excused_model.id),
            "model_name": excused_model.name,
            "replacement_model_id": str(replacement_model.id) if replacement_model else None,
            "replacement_model_name": replacement_model.name if replacement_model else None,
            "role": role,
            "phase": phase.value if phase else None,
            "provider": excused_model.provider,
            "error_message": error_message,
        })

        logger.warning(
            f"Content filter triggered for {excused_model.name} in {role}, "
            f"replaced with {replacement_model.name if replacement_model else 'N/A'}"
        )

    async def _add_substitution_note(
        self,
        debate: Debate,
        excused_model: Model,
        replacement_model: Model,
        role: str,
        phase: DebatePhase,
        reason: str = "content_filter",
    ) -> TranscriptEntry:
        """Add a transcript entry noting the model substitution.

        Args:
            reason: Either "content_filter" or "timeout"
        """
        position = DebatePosition.JUDGE if role == "judge" else DebatePosition.AUDITOR

        if reason == "timeout":
            reason_text = "a response timeout"
        else:
            reason_text = "content policy restrictions"

        note_content = (
            f"[SUBSTITUTION NOTICE: {excused_model.name} was unable to continue due to "
            f"{reason_text}. {replacement_model.name} has been substituted "
            f"as the {role.title()}.]"
        )

        sequence_order = max(
            (e.sequence_order for e in debate.transcript_entries), default=0
        ) + 1

        entry = TranscriptEntry(
            id=uuid.uuid4(),
            debate_id=debate.id,
            phase=phase,
            speaker_id=replacement_model.id,
            position=position,
            content=note_content,
            token_count=0,
            sequence_order=sequence_order,
            created_at=datetime.utcnow(),
            input_tokens=0,
            output_tokens=0,
            latency_ms=0,
            cost_usd=0.0,
        )
        self.db.add(entry)
        await self.db.flush()

        # Refresh the debate's transcript entries
        debate.transcript_entries.append(entry)
        return entry

    async def _load_debate(self, debate_id: uuid.UUID) -> Debate:
        """Load a debate with all related data."""
        # Use execution_options to ensure fresh data is fetched
        result = await self.db.execute(
            select(Debate)
            .options(
                selectinload(Debate.topic),
                selectinload(Debate.debater_pro),
                selectinload(Debate.debater_con),
                selectinload(Debate.judge),
                selectinload(Debate.auditor),
                selectinload(Debate.transcript_entries),
            )
            .where(Debate.id == debate_id)
            .execution_options(populate_existing=True)
        )
        debate = result.scalar_one_or_none()
        if debate is None:
            raise ValueError(f"Debate not found: {debate_id}")
        return debate

    async def judge_debate(self, debate_id: uuid.UUID) -> JudgmentResult:
        """
        Judge a debate and record the results.

        If the judge model triggers a content filter, a replacement judge
        will be selected and the substitution noted in the transcript.

        Args:
            debate_id: The ID of the debate to judge

        Returns:
            The judgment result with scores, winner, and reasoning

        Raises:
            RuntimeError: If no replacement judge can be found after content filter
        """
        debate = await self._load_debate(debate_id)

        if debate.status != DebateStatus.JUDGING:
            raise ValueError(f"Debate {debate_id} is not ready for judging (status: {debate.status})")

        # Build transcript for judge
        transcript_text = self._format_transcript_for_judge(debate)
        system_prompt = JUDGE_SYSTEM_PROMPT.format(topic=debate.topic.title)
        messages = [{"role": "user", "content": transcript_text}]

        # Track current judge and excluded models
        current_judge = debate.judge
        exclude_ids = {
            debate.debater_pro_id,
            debate.debater_con_id,
            debate.auditor_id,
        } | self._excused_model_ids

        while True:
            logger.info(f"Judging debate {debate_id} with {current_judge.name}")

            try:
                response = await self._call_model_with_json_retry(
                    model=current_judge,
                    system_prompt=system_prompt,
                    messages=messages,
                    max_tokens=2500,  # Increased to accommodate detailed category analysis
                )
                break  # Success
            except ContentFilterError as e:
                logger.warning(
                    f"Content filter triggered for judge {current_judge.name}: {e.message}"
                )

                # Find replacement judge
                exclude_ids.add(current_judge.id)
                replacement = await self._find_replacement_model(exclude_ids)

                if replacement is None:
                    await self._record_content_filter_excuse(
                        debate_id=debate_id,
                        excused_model=current_judge,
                        replacement_model=None,
                        role="judge",
                        phase=DebatePhase.JUDGMENT,
                        error_message=e.message,
                    )
                    raise RuntimeError(
                        f"No replacement judge available after {current_judge.name} "
                        f"was blocked by content filter"
                    )

                # Record excuse
                await self._record_content_filter_excuse(
                    debate_id=debate_id,
                    excused_model=current_judge,
                    replacement_model=replacement,
                    role="judge",
                    phase=DebatePhase.JUDGMENT,
                    error_message=e.message,
                )

                # Update debate judge
                debate.judge_id = replacement.id
                debate.judge = replacement
                await self.db.flush()

                # Add substitution note
                await self._add_substitution_note(
                    debate=debate,
                    excused_model=current_judge,
                    replacement_model=replacement,
                    role="judge",
                    phase=DebatePhase.JUDGMENT,
                )

                exclude_ids.add(replacement.id)
                current_judge = replacement

        # Parse judgment
        judgment = self._parse_judgment(response)

        # Store judgment as transcript entry
        sequence_order = max(
            (e.sequence_order for e in debate.transcript_entries), default=0
        ) + 1

        judgment_entry = TranscriptEntry(
            id=uuid.uuid4(),
            debate_id=debate_id,
            phase=DebatePhase.JUDGMENT,
            speaker_id=current_judge.id,
            position=DebatePosition.JUDGE,
            content=response,
            token_count=len(response.split()),
            sequence_order=sequence_order,
            created_at=datetime.utcnow(),
        )
        self.db.add(judgment_entry)

        # Update debate with results
        debate.pro_score = judgment["pro_score"]
        debate.con_score = judgment["con_score"]

        # Store per-category scores if available
        if judgment.get("pro_scores"):
            debate.pro_logical_consistency = judgment["pro_scores"].get("logical_consistency")
            debate.pro_evidence = judgment["pro_scores"].get("evidence")
            debate.pro_persuasiveness = judgment["pro_scores"].get("persuasiveness")
            debate.pro_engagement = judgment["pro_scores"].get("engagement")

        if judgment.get("con_scores"):
            debate.con_logical_consistency = judgment["con_scores"].get("logical_consistency")
            debate.con_evidence = judgment["con_scores"].get("evidence")
            debate.con_persuasiveness = judgment["con_scores"].get("persuasiveness")
            debate.con_engagement = judgment["con_scores"].get("engagement")

        if judgment["winner"] == "pro":
            debate.winner_id = debate.debater_pro_id
        else:
            debate.winner_id = debate.debater_con_id

        await self.db.flush()

        logger.info(
            f"Judgment complete: Pro={judgment['pro_score']}, Con={judgment['con_score']}, "
            f"Winner={judgment['winner']}"
        )

        return judgment

    async def audit_judge(self, debate_id: uuid.UUID) -> AuditResult:
        """
        Audit the judge's performance on a debate.

        If the auditor model triggers a content filter, a replacement auditor
        will be selected and the substitution noted in the transcript.

        Args:
            debate_id: The ID of the debate to audit

        Returns:
            The audit result with scores and notes

        Raises:
            RuntimeError: If no replacement auditor can be found after content filter
        """
        debate = await self._load_debate(debate_id)

        if debate.pro_score is None or debate.con_score is None:
            raise ValueError(f"Debate {debate_id} has not been judged yet")

        # Build full transcript including judgment
        transcript_text = self._format_transcript_for_auditor(debate)
        system_prompt = AUDITOR_SYSTEM_PROMPT.format(topic=debate.topic.title)
        messages = [{"role": "user", "content": transcript_text}]

        # Track current auditor and excluded models
        # Auditor must not be the judge or either debater (conflict of interest)
        current_auditor = debate.auditor
        exclude_ids = {
            debate.judge_id,
            debate.debater_pro_id,
            debate.debater_con_id,
        } | self._excused_model_ids

        while True:
            logger.info(f"Auditing debate {debate_id} with {current_auditor.name}")

            try:
                response = await self._call_model_with_json_retry(
                    model=current_auditor,
                    system_prompt=system_prompt,
                    messages=messages,
                    max_tokens=1500,  # Increased to accommodate detailed criterion analysis
                )
                break  # Success
            except ContentFilterError as e:
                logger.warning(
                    f"Content filter triggered for auditor {current_auditor.name}: {e.message}"
                )

                # Find replacement auditor (excluding judge and debaters)
                exclude_ids.add(current_auditor.id)
                replacement = await self._find_replacement_model(exclude_ids)

                if replacement is None:
                    await self._record_content_filter_excuse(
                        debate_id=debate_id,
                        excused_model=current_auditor,
                        replacement_model=None,
                        role="auditor",
                        phase=DebatePhase.AUDIT,
                        error_message=e.message,
                    )
                    raise RuntimeError(
                        f"No replacement auditor available after {current_auditor.name} "
                        f"was blocked by content filter"
                    )

                # Record excuse
                await self._record_content_filter_excuse(
                    debate_id=debate_id,
                    excused_model=current_auditor,
                    replacement_model=replacement,
                    role="auditor",
                    phase=DebatePhase.AUDIT,
                    error_message=e.message,
                )

                # Update debate auditor
                debate.auditor_id = replacement.id
                debate.auditor = replacement
                await self.db.flush()

                # Add substitution note
                await self._add_substitution_note(
                    debate=debate,
                    excused_model=current_auditor,
                    replacement_model=replacement,
                    role="auditor",
                    phase=DebatePhase.AUDIT,
                )

                exclude_ids.add(replacement.id)
                current_auditor = replacement

        # Parse audit
        audit = self._parse_audit(response)

        # Store audit as transcript entry
        sequence_order = max(
            (e.sequence_order for e in debate.transcript_entries), default=0
        ) + 1

        audit_entry = TranscriptEntry(
            id=uuid.uuid4(),
            debate_id=debate_id,
            phase=DebatePhase.AUDIT,
            speaker_id=current_auditor.id,
            position=DebatePosition.AUDITOR,
            content=response,
            token_count=len(response.split()),
            sequence_order=sequence_order,
            created_at=datetime.utcnow(),
        )
        self.db.add(audit_entry)

        # Update debate judge_score and audit breakdown
        debate.judge_score = audit["overall_score"]
        debate.audit_accuracy = audit["accuracy"]
        debate.audit_fairness = audit["fairness"]
        debate.audit_thoroughness = audit["thoroughness"]
        debate.audit_reasoning_quality = audit["reasoning_quality"]

        # Update judge model's avg_judge_score
        await self._update_judge_avg_score(debate.judge, audit["overall_score"])

        # Mark debate as completed
        debate.status = DebateStatus.COMPLETED
        debate.completed_at = datetime.utcnow()

        await self.db.flush()

        logger.info(
            f"Audit complete: Overall score={audit['overall_score']:.1f}, "
            f"accuracy={audit['accuracy']}, fairness={audit['fairness']}, "
            f"thoroughness={audit['thoroughness']}, reasoning={audit['reasoning_quality']}"
        )

        return audit

    def _format_transcript_for_judge(self, debate: Debate) -> str:
        """Format the debate transcript for the judge.

        If the debate is blinded (is_blinded=True), model names are hidden
        and debaters are referred to only as "Debater A" and "Debater B".
        """
        if debate.is_blinded:
            # Blinded: don't reveal model names to the judge
            lines = [
                f"DEBATE TRANSCRIPT",
                f"Topic: {debate.topic.title}",
                f"Pro: Debater A",
                f"Con: Debater B",
                "",
                "(Note: This is a blinded evaluation. Model identities have been concealed.)",
                "",
                "=" * 50,
                "",
            ]
        else:
            # Non-blinded: reveal model names
            lines = [
                f"DEBATE TRANSCRIPT",
                f"Topic: {debate.topic.title}",
                f"Pro: {debate.debater_pro.name}",
                f"Con: {debate.debater_con.name}",
                "",
                "=" * 50,
                "",
            ]

        # Sort entries by sequence order
        entries = sorted(debate.transcript_entries, key=lambda e: e.sequence_order)

        current_phase = None
        for entry in entries:
            # Skip judgment and audit entries
            if entry.phase in (DebatePhase.JUDGMENT, DebatePhase.AUDIT):
                continue

            # Add phase header if changed
            if entry.phase != current_phase:
                current_phase = entry.phase
                phase_name = self._get_phase_display_name(entry.phase)
                lines.append(f"\n--- {phase_name.upper()} ---\n")

            position_label = entry.position.value.upper() if entry.position else "SPEAKER"
            lines.append(f"[{position_label}]:")
            lines.append(entry.content)
            lines.append("")

        return "\n".join(lines)

    def _format_transcript_for_auditor(self, debate: Debate) -> str:
        """Format the debate transcript and judgment for the auditor."""
        # Start with the debate transcript
        lines = [self._format_transcript_for_judge(debate)]

        # Add judgment section
        lines.append("\n" + "=" * 50)
        lines.append("\nJUDGE'S DECISION")
        lines.append(f"Judge: {debate.judge.name}")
        lines.append(f"Pro Score: {debate.pro_score}")
        lines.append(f"Con Score: {debate.con_score}")
        lines.append(f"Winner: {'Pro' if debate.winner_id == debate.debater_pro_id else 'Con'}")
        lines.append("")

        # Find judgment entry
        judgment_entry = next(
            (e for e in debate.transcript_entries if e.phase == DebatePhase.JUDGMENT),
            None,
        )
        if judgment_entry:
            lines.append("Judge's Reasoning:")
            lines.append(judgment_entry.content)

        return "\n".join(lines)

    def _get_phase_display_name(self, phase: DebatePhase) -> str:
        """Get display name for a debate phase."""
        names = {
            DebatePhase.OPENING: "Opening Statements",
            DebatePhase.REBUTTAL: "Rebuttals",
            DebatePhase.CROSS_EXAMINATION: "Cross-Examination",
            DebatePhase.CLOSING: "Closing Arguments",
            DebatePhase.JUDGMENT: "Judgment",
            DebatePhase.AUDIT: "Audit",
        }
        return names.get(phase, phase.value)

    async def _call_model_with_json_retry(
        self,
        model: Model,
        system_prompt: str,
        messages: list[dict],
        max_tokens: int,
    ) -> str:
        """
        Call a model and retry once if JSON parsing fails.

        Args:
            model: The model to call
            system_prompt: The system prompt
            messages: The conversation messages
            max_tokens: Maximum tokens in response

        Returns:
            The model's response (hopefully valid JSON)
        """
        response = await self._call_model(model, system_prompt, messages, max_tokens)

        # Try to parse JSON
        try:
            self._extract_json(response)
            return response
        except (json.JSONDecodeError, ValueError):
            logger.warning(f"Invalid JSON from {model.name}, retrying with nudge")

        # Retry with nudge
        retry_messages = messages + [
            {"role": "assistant", "content": response},
            {"role": "user", "content": JSON_RETRY_PROMPT},
        ]
        response = await self._call_model(model, system_prompt, retry_messages, max_tokens)

        return response

    async def _call_model(
        self,
        model: Model,
        system_prompt: str,
        messages: list[dict],
        max_tokens: int,
    ) -> str:
        """Call an AI model and return its response.

        Includes a timeout to prevent hanging indefinitely on slow providers.
        """
        # Find the model config by api_model_id
        model_config = None
        for config in ALL_MODELS.values():
            if config.api_id == model.api_model_id:
                model_config = config
                break

        if model_config is None:
            raise ValueError(f"No provider config found for model: {model.api_model_id}")

        provider = get_provider(
            provider_name=model.provider,
            model_config=model_config,
            api_key=self._api_keys[model.provider],
        )

        try:
            return await asyncio.wait_for(
                provider.complete(
                    system_prompt=system_prompt,
                    messages=messages,
                    max_tokens=max_tokens,
                ),
                timeout=JUDGE_API_TIMEOUT_SECONDS,
            )
        except asyncio.TimeoutError:
            logger.error(
                f"API call to {model.name} ({model.provider}) timed out "
                f"after {JUDGE_API_TIMEOUT_SECONDS}s"
            )
            raise TimeoutError(
                f"API call to {model.name} timed out after {JUDGE_API_TIMEOUT_SECONDS}s"
            )

    def _extract_json(self, text: str) -> dict:
        """
        Extract JSON from a response that might have extra text.

        Args:
            text: The model's response

        Returns:
            The parsed JSON dict

        Raises:
            ValueError: If no valid JSON found
        """
        # Try direct parsing first
        try:
            return json.loads(text.strip())
        except json.JSONDecodeError:
            pass

        # Try to find JSON in code blocks
        import re
        json_match = re.search(r"```(?:json)?\s*(\{.*?\})\s*```", text, re.DOTALL)
        if json_match:
            try:
                return json.loads(json_match.group(1))
            except json.JSONDecodeError:
                pass

        # Try to find JSON object by matching balanced braces
        # This handles nested objects properly
        start_idx = text.find("{")
        if start_idx != -1:
            brace_count = 0
            for i, char in enumerate(text[start_idx:], start_idx):
                if char == "{":
                    brace_count += 1
                elif char == "}":
                    brace_count -= 1
                    if brace_count == 0:
                        json_str = text[start_idx : i + 1]
                        try:
                            return json.loads(json_str)
                        except json.JSONDecodeError:
                            pass
                        break

        raise ValueError(f"No valid JSON found in response: {text[:500]}")

    def _parse_judgment(self, response: str) -> JudgmentResult:
        """Parse the judge's response into a JudgmentResult."""
        data = self._extract_json(response)

        pro_category_scores: CategoryScores | None = None
        con_category_scores: CategoryScores | None = None

        # Check for new detailed format (pro_scores/con_scores objects)
        if "pro_scores" in data and "con_scores" in data:
            pro_scores = data["pro_scores"]
            con_scores = data["con_scores"]

            # Store category breakdowns
            pro_category_scores = CategoryScores(
                logical_consistency=int(pro_scores.get("logical_consistency", 0)),
                evidence=int(pro_scores.get("evidence", 0)),
                persuasiveness=int(pro_scores.get("persuasiveness", 0)),
                engagement=int(pro_scores.get("engagement", 0)),
            )
            con_category_scores = CategoryScores(
                logical_consistency=int(con_scores.get("logical_consistency", 0)),
                evidence=int(con_scores.get("evidence", 0)),
                persuasiveness=int(con_scores.get("persuasiveness", 0)),
                engagement=int(con_scores.get("engagement", 0)),
            )

            # Calculate totals from category scores
            pro_score = sum([
                pro_category_scores["logical_consistency"],
                pro_category_scores["evidence"],
                pro_category_scores["persuasiveness"],
                pro_category_scores["engagement"],
            ])
            con_score = sum([
                con_category_scores["logical_consistency"],
                con_category_scores["evidence"],
                con_category_scores["persuasiveness"],
                con_category_scores["engagement"],
            ])
        else:
            # Fall back to old format (pro_score/con_score integers)
            if "pro_score" not in data or "con_score" not in data:
                logger.error(f"Missing score fields. Got keys: {list(data.keys())}, data: {data}")
                raise ValueError(f"Missing required score fields in judgment. Got keys: {list(data.keys())}")
            pro_score = int(data["pro_score"])
            con_score = int(data["con_score"])

        # Validate score ranges
        if not (0 <= pro_score <= 100):
            raise ValueError(f"pro_score must be 0-100, got {pro_score}")
        if not (0 <= con_score <= 100):
            raise ValueError(f"con_score must be 0-100, got {con_score}")

        # Validate winner
        winner_raw = data.get("winner")
        if winner_raw is None:
            # If no winner specified, determine from scores
            winner = "pro" if pro_score > con_score else "con"
        else:
            winner = str(winner_raw).lower()
        if winner not in ("pro", "con"):
            raise ValueError(f"winner must be 'pro' or 'con', got {winner}")

        return JudgmentResult(
            pro_score=pro_score,
            con_score=con_score,
            winner=winner,
            reasoning=str(data.get("reasoning", "")),
            pro_scores=pro_category_scores,
            con_scores=con_category_scores,
        )

    def _parse_audit(self, response: str) -> AuditResult:
        """Parse the auditor's response into an AuditResult."""
        data = self._extract_json(response)

        # Validate required fields
        required = ["accuracy", "fairness", "thoroughness", "reasoning_quality"]
        for field in required:
            if field not in data:
                raise ValueError(f"Missing required field in audit: {field}")

        # Validate score ranges (1-10)
        accuracy = int(data["accuracy"])
        fairness = int(data["fairness"])
        thoroughness = int(data["thoroughness"])
        reasoning_quality = int(data["reasoning_quality"])

        for name, score in [
            ("accuracy", accuracy),
            ("fairness", fairness),
            ("thoroughness", thoroughness),
            ("reasoning_quality", reasoning_quality),
        ]:
            if not (0 <= score <= 10):
                raise ValueError(f"{name} must be 0-10, got {score}")

        # Calculate overall if not provided
        overall_score = data.get(
            "overall_score",
            (accuracy + fairness + thoroughness + reasoning_quality) / 4.0,
        )

        return AuditResult(
            accuracy=accuracy,
            fairness=fairness,
            thoroughness=thoroughness,
            reasoning_quality=reasoning_quality,
            overall_score=float(overall_score),
            notes=str(data.get("notes", "")),
        )

    async def _update_judge_avg_score(self, judge: Model, new_score: float) -> None:
        """Update a judge model's average score."""
        judge.times_judged += 1

        if judge.avg_judge_score is None:
            judge.avg_judge_score = new_score
        else:
            # Running average
            total = judge.avg_judge_score * (judge.times_judged - 1) + new_score
            judge.avg_judge_score = total / judge.times_judged
