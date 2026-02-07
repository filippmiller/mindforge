import json
import re
import anthropic
import aiosqlite
from typing import AsyncGenerator

from config import settings
from database.db import DB_PATH
from services.rules_engine import get_full_rules_context, add_learned_rule
from services.niche_classifier import get_niche_context
from services.voice_processor import clean_transcript
from prompts.brainstorm_system import build_system_prompt
from prompts.whitepaper_prompt import WHITEPAPER_SYNTHESIS_PROMPT, WHITEPAPER_SYSTEM


async def get_session_niche(session_id: str) -> str | None:
    """Get the niche type for a session, if classified."""
    async with aiosqlite.connect(DB_PATH) as db:
        cursor = await db.execute(
            "SELECT niche_type FROM sessions WHERE id = ?", (session_id,)
        )
        row = await cursor.fetchone()
    return row[0] if row and row[0] else None


async def set_session_niche(session_id: str, niche_type: str):
    """Set the niche type for a session."""
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute(
            "UPDATE sessions SET niche_type = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
            (niche_type, session_id),
        )
        await db.commit()


async def update_session_phase(session_id: str, phase: int):
    """Update the current conversation phase."""
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute(
            "UPDATE sessions SET current_phase = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
            (phase, session_id),
        )
        await db.commit()


async def get_session_state(session_id: str) -> str:
    """Build current session state string for the system prompt."""
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row

        # Get session info
        cursor = await db.execute(
            "SELECT niche_type, current_phase FROM sessions WHERE id = ?", (session_id,)
        )
        session_row = await cursor.fetchone()
        niche_type = session_row["niche_type"] if session_row else None
        current_phase = session_row["current_phase"] if session_row else 1

        # Get whitepaper state
        cursor = await db.execute(
            "SELECT content FROM whitepapers WHERE session_id = ?", (session_id,)
        )
        row = await cursor.fetchone()
        whitepaper_content = json.loads(row["content"]) if row else {}

        # Get conversation history
        cursor = await db.execute(
            "SELECT role, cleaned_text FROM conversation_turns WHERE session_id = ? ORDER BY created_at",
            (session_id,),
        )
        turns = await cursor.fetchall()

    lines = []

    # Session metadata
    if niche_type:
        lines.append(f"**Classified niche**: {niche_type}")
    lines.append(f"**Current phase**: {current_phase}")
    lines.append(f"**Conversation turns so far**: {len(turns)}")
    lines.append("")

    lines.append("## Current Whitepaper State\n")
    if whitepaper_content:
        for section, content in whitepaper_content.items():
            status = "HAS CONTENT" if content else "EMPTY"
            lines.append(f"- **{section}**: {status}")
            if content:
                lines.append(f"  Current: {content[:200]}...")
    else:
        lines.append("All sections are empty — this is a new session.")

    lines.append("\n## Conversation History\n")
    if turns:
        for turn in turns:
            role = "User" if turn["role"] == "user" else "MindForge"
            text = turn["cleaned_text"] or ""
            lines.append(f"**{role}:** {text[:500]}")
    else:
        lines.append("No conversation yet — this is the first message.")

    return "\n".join(lines)


async def build_messages(session_id: str, new_message: str) -> list[dict]:
    """Build the messages array from conversation history."""
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        cursor = await db.execute(
            "SELECT role, cleaned_text FROM conversation_turns WHERE session_id = ? ORDER BY created_at",
            (session_id,),
        )
        turns = await cursor.fetchall()

    messages = []
    for turn in turns:
        messages.append({
            "role": turn["role"] if turn["role"] in ("user", "assistant") else "user",
            "content": turn["cleaned_text"] or "",
        })

    messages.append({"role": "user", "content": new_message})
    return messages


def parse_section(text: str, tag: str) -> str | None:
    """Extract content from XML-style tags in the response."""
    pattern = rf"<{tag}>(.*?)</{tag}>"
    match = re.search(pattern, text, re.DOTALL)
    return match.group(1).strip() if match else None


async def stream_brainstorm(
    session_id: str, user_text: str, is_voice: bool = False, raw_transcript: str | None = None
) -> AsyncGenerator[str, None]:
    """
    Main brainstorming pipeline with SSE streaming.
    Yields SSE-formatted events as the AI thinks.
    """
    try:
        # Step 1: Clean transcript if from voice
        cleaned_text = user_text
        if is_voice and raw_transcript:
            yield f"event: status\ndata: {json.dumps({'status': 'cleaning_transcript'})}\n\n"
            cleaned_text = await clean_transcript(raw_transcript)
            yield f"event: transcript\ndata: {json.dumps({'raw': raw_transcript, 'cleaned': cleaned_text})}\n\n"

        # Step 2: Save user turn
        async with aiosqlite.connect(DB_PATH) as db:
            await db.execute(
                "INSERT INTO conversation_turns (session_id, role, raw_transcript, cleaned_text) VALUES (?, 'user', ?, ?)",
                (session_id, raw_transcript, cleaned_text),
            )
            await db.commit()

        # Step 3: Build system prompt with rules + state + niche context
        yield f"event: status\ndata: {json.dumps({'status': 'loading_rules'})}\n\n"
        rules_context = await get_full_rules_context()
        session_state = await get_session_state(session_id)

        # Load niche context if session has been classified
        niche_type = await get_session_niche(session_id)
        niche_context = ""
        if niche_type:
            niche_context = get_niche_context(niche_type) or ""

        system_prompt = build_system_prompt(rules_context, session_state, niche_context)

        # Step 4: Build messages
        messages = await build_messages(session_id, cleaned_text)

        # Step 5: Stream from Claude
        yield f"event: status\ndata: {json.dumps({'status': 'thinking'})}\n\n"

        client = anthropic.AsyncAnthropic(api_key=settings.ANTHROPIC_API_KEY)

        full_response = ""

        try:
            async with client.messages.stream(
                model=settings.BRAINSTORM_MODEL,
                max_tokens=4000,
                system=system_prompt,
                messages=messages,
            ) as stream:
                async for text in stream.text_stream:
                    full_response += text
                    yield f"event: token\ndata: {json.dumps({'text': text})}\n\n"
        except Exception as e:
            yield f"event: error\ndata: {json.dumps({'message': str(e)})}\n\n"
            return

        # Step 6: Parse structured response
        yield f"event: status\ndata: {json.dumps({'status': 'processing'})}\n\n"

        analysis = parse_section(full_response, "analysis")
        gaps = parse_section(full_response, "gaps")
        insights = parse_section(full_response, "insights")
        questions = parse_section(full_response, "questions")
        wp_update_raw = parse_section(full_response, "whitepaper_update")
        new_rules_raw = parse_section(full_response, "new_rules")
        phase_info_raw = parse_section(full_response, "phase_info")

        # Send parsed sections
        if analysis:
            yield f"event: analysis\ndata: {json.dumps({'content': analysis})}\n\n"
        if gaps:
            yield f"event: gaps\ndata: {json.dumps({'content': gaps})}\n\n"
        if insights:
            yield f"event: insights\ndata: {json.dumps({'content': insights})}\n\n"
        if questions:
            yield f"event: questions\ndata: {json.dumps({'content': questions})}\n\n"

        # Step 7: Update whitepaper
        if wp_update_raw:
            try:
                wp_updates = json.loads(wp_update_raw)
                await update_whitepaper(session_id, wp_updates)
                yield f"event: whitepaper_update\ndata: {json.dumps(wp_updates)}\n\n"
            except json.JSONDecodeError:
                pass

        # Step 8: Learn new rules
        if new_rules_raw:
            try:
                new_rules = json.loads(new_rules_raw)
                for rule in new_rules:
                    if "category" in rule and "rule_text" in rule:
                        await add_learned_rule(rule["category"], rule["rule_text"], session_id)
                if new_rules:
                    yield f"event: new_rules\ndata: {json.dumps({'count': len(new_rules), 'rules': new_rules})}\n\n"
            except json.JSONDecodeError:
                pass

        # Step 9: Process phase info and niche classification
        if phase_info_raw:
            try:
                phase_info = json.loads(phase_info_raw)
                current_phase = phase_info.get("current_phase", 1)
                await update_session_phase(session_id, current_phase)
                yield f"event: phase_info\ndata: {json.dumps(phase_info)}\n\n"
            except json.JSONDecodeError:
                pass

        # Auto-detect niche from analysis on first message (if not already set)
        if not niche_type and analysis:
            detected_niche = detect_niche_from_analysis(analysis)
            if detected_niche:
                await set_session_niche(session_id, detected_niche)
                yield f"event: niche_classified\ndata: {json.dumps({'niche': detected_niche})}\n\n"

        # Step 10: Save assistant turn
        async with aiosqlite.connect(DB_PATH) as db:
            await db.execute(
                """INSERT INTO conversation_turns
                (session_id, role, cleaned_text, analysis, gaps, insights, questions, whitepaper_updates)
                VALUES (?, 'assistant', ?, ?, ?, ?, ?, ?)""",
                (session_id, full_response, analysis, gaps, insights, questions, wp_update_raw),
            )
            await db.commit()

        # Step 11: Calculate and update completion
        completion = await calculate_completion(session_id)
        async with aiosqlite.connect(DB_PATH) as db:
            await db.execute(
                "UPDATE sessions SET completion_pct = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
                (completion, session_id),
            )
            await db.commit()

        yield f"event: completion\ndata: {json.dumps({'pct': completion})}\n\n"
        yield f"event: done\ndata: {json.dumps({'session_id': session_id})}\n\n"

    except Exception as e:
        yield f"event: error\ndata: {json.dumps({'message': str(e)})}\n\n"


def detect_niche_from_analysis(analysis_text: str) -> str | None:
    """Try to detect the niche type from the AI's analysis text."""
    from services.niche_classifier import get_all_niche_keywords

    analysis_lower = analysis_text.lower()
    niche_keywords = get_all_niche_keywords()

    scores: dict[str, int] = {}
    for niche_key, keywords in niche_keywords.items():
        score = sum(1 for kw in keywords if kw in analysis_lower)
        if score > 0:
            scores[niche_key] = score

    if not scores:
        return None

    return max(scores, key=scores.get)


async def update_whitepaper(session_id: str, updates: dict):
    """Update whitepaper sections with new content."""
    async with aiosqlite.connect(DB_PATH) as db:
        cursor = await db.execute(
            "SELECT content FROM whitepapers WHERE session_id = ?", (session_id,)
        )
        row = await cursor.fetchone()

        if row:
            current = json.loads(row[0])
        else:
            current = {}

        current.update(updates)

        if row:
            await db.execute(
                "UPDATE whitepapers SET content = ?, updated_at = CURRENT_TIMESTAMP WHERE session_id = ?",
                (json.dumps(current), session_id),
            )
        else:
            await db.execute(
                "INSERT INTO whitepapers (session_id, content) VALUES (?, ?)",
                (session_id, json.dumps(current)),
            )
        await db.commit()


async def calculate_completion(session_id: str) -> float:
    """Calculate whitepaper completion percentage."""
    from models.whitepaper import WHITEPAPER_SECTIONS

    async with aiosqlite.connect(DB_PATH) as db:
        cursor = await db.execute(
            "SELECT content FROM whitepapers WHERE session_id = ?", (session_id,)
        )
        row = await cursor.fetchone()

    if not row:
        return 0.0

    content = json.loads(row[0])
    filled = sum(1 for key in WHITEPAPER_SECTIONS if content.get(key))
    return round((filled / len(WHITEPAPER_SECTIONS)) * 100, 1)


async def generate_final_whitepaper(session_id: str) -> str:
    """Generate the final polished whitepaper using Opus."""
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        cursor = await db.execute(
            "SELECT content FROM whitepapers WHERE session_id = ?", (session_id,)
        )
        row = await cursor.fetchone()

    if not row:
        return "No whitepaper data found for this session."

    whitepaper_data = row["content"]

    client = anthropic.AsyncAnthropic(api_key=settings.ANTHROPIC_API_KEY)

    response = await client.messages.create(
        model=settings.WHITEPAPER_MODEL,
        max_tokens=8000,
        system=WHITEPAPER_SYSTEM,
        messages=[
            {
                "role": "user",
                "content": WHITEPAPER_SYNTHESIS_PROMPT.format(whitepaper_data=whitepaper_data),
            }
        ],
    )

    return response.content[0].text
