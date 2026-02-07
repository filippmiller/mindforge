import json
import os
import aiosqlite
from config import settings
from database.db import DB_PATH


def load_base_rules() -> dict:
    with open(settings.RULES_FILE, "r") as f:
        return json.load(f)


async def get_active_learned_rules() -> list[dict]:
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        cursor = await db.execute(
            "SELECT category, rule_text, times_applied FROM learned_rules WHERE active = 1 ORDER BY times_applied DESC"
        )
        rows = await cursor.fetchall()
        return [dict(row) for row in rows]


async def get_full_rules_context() -> str:
    """Build the complete rules context for the AI engine — base rules + learned rules merged."""
    base = load_base_rules()
    learned = await get_active_learned_rules()

    lines = []
    lines.append("## BRAINSTORMING RULES & QUESTION BANK\n")

    for cat_key, cat_data in base["categories"].items():
        lines.append(f"### {cat_data['label']}")
        lines.append("**Questions to consider:**")
        for q in cat_data["base_questions"]:
            lines.append(f"- {q}")

        lines.append("**Thinking rules:**")
        for r in cat_data["thinking_rules"]:
            lines.append(f"- {r}")

        # Append learned rules for this category
        cat_learned = [r for r in learned if r["category"] == cat_key]
        if cat_learned:
            lines.append("**Learned from past sessions:**")
            for r in cat_learned:
                lines.append(f"- {r['rule_text']} (applied {r['times_applied']}x)")

        lines.append("")

    lines.append("### Meta Rules")
    for section_key, rules in base["meta_rules"].items():
        lines.append(f"**{section_key.replace('_', ' ').title()}:**")
        for r in rules:
            lines.append(f"- {r}")
        lines.append("")

    return "\n".join(lines)


async def add_learned_rule(category: str, rule_text: str, source_session_id: str | None = None):
    """Add a new learned rule discovered during a brainstorming session."""
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute(
            "INSERT INTO learned_rules (category, rule_text, source_session_id) VALUES (?, ?, ?)",
            (category, rule_text, source_session_id),
        )
        await db.commit()


async def increment_rule_usage(rule_id: int):
    """Track that a learned rule was useful in a session."""
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute(
            "UPDATE learned_rules SET times_applied = times_applied + 1 WHERE id = ?",
            (rule_id,),
        )
        await db.commit()


RULE_EXTRACTION_PROMPT = """
You are analyzing a brainstorming conversation to extract NEW universal rules and questions that should be added to the brainstorming knowledge base.

The conversation revealed concerns, questions, or insights that are NOT already in our existing rules.

Existing rule categories: audience, purpose, features, pages, user_flows, design, data, security, admin, technical, business

For each new rule or question you identify:
1. It must be UNIVERSAL — useful for future projects, not specific to this one
2. It must be NOVEL — not already covered by existing rules
3. Assign it to the most fitting category

Current conversation excerpt:
{conversation}

Current rules (don't duplicate these):
{current_rules}

Return JSON array of new rules. If none found, return empty array [].
Format:
[
  {"category": "security", "rule_text": "Always consider rate limiting on public-facing forms to prevent spam and abuse."},
  {"category": "user_flows", "rule_text": "Ask about what happens when a user's session expires mid-action — data loss is a common pain point."}
]

Return ONLY the JSON array, no other text.
"""
