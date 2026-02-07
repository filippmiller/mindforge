import json
from config import settings

NICHE_TEMPLATES_PATH = settings.BASE_DIR / "rules" / "niche_templates.json"


def load_niche_templates() -> dict:
    with open(NICHE_TEMPLATES_PATH, "r", encoding="utf-8") as f:
        return json.load(f)


def get_niche_context(niche_key: str) -> str | None:
    """Build a context string for a specific niche to inject into the system prompt."""
    templates = load_niche_templates()
    niche = templates["niches"].get(niche_key)
    if not niche:
        return None

    lines = []
    lines.append(f"## NICHE INTELLIGENCE: {niche['label']}\n")
    lines.append(f"Business type: {niche['description']}\n")

    lines.append("### Suggested Pages")
    lines.append("Present these as YOUR recommendation. Say: 'Based on businesses like yours, I recommend these pages:'")
    for page in niche["suggested_pages"]:
        priority_tag = {"must": "MUST", "should": "RECOMMENDED", "nice": "OPTIONAL"}[page["priority"]]
        lines.append(f"- **{page['name']}** [{priority_tag}] — {page['purpose']}")

    lines.append("\n### Suggested Features")
    lines.append("Present these as YOUR recommendation. Group by priority:")
    for feat in niche["suggested_features"]:
        priority_tag = {"must": "ESSENTIAL", "should": "RECOMMENDED", "nice": "OPTIONAL"}[feat["priority"]]
        lines.append(f"- **{feat['name']}** [{priority_tag}] (complexity: {feat['complexity']})")

    lines.append("\n### Key Questions for This Niche")
    lines.append("These are the MOST VALUABLE questions for this business type. Prioritize these:")
    for q in niche["key_questions"]:
        lines.append(f"- {q}")

    lines.append("\n### Design Direction Hints")
    hints = niche["design_hints"]
    lines.append(f"- Mood: {hints['mood']}")
    lines.append(f"- Colors: {hints['colors']}")
    lines.append(f"- Typography: {hints['typography']}")
    lines.append(f"- Key element: {hints['key_element']}")
    lines.append(f"- Imagery: {hints['imagery']}")

    lines.append("\n### Admin Needs for This Type")
    for need in niche["admin_needs"]:
        lines.append(f"- {need}")

    lines.append("\n### Common Integrations")
    lines.append(", ".join(niche["common_integrations"]))

    lines.append("\n### SEO Focus")
    for seo in niche["seo_focus"]:
        lines.append(f"- {seo}")

    return "\n".join(lines)


def get_all_niche_keywords() -> dict[str, list[str]]:
    """Return a mapping of niche_key -> keywords for classification."""
    templates = load_niche_templates()
    return {
        key: niche["keywords"]
        for key, niche in templates["niches"].items()
    }


def get_niche_labels() -> dict[str, str]:
    """Return niche_key -> human-readable label."""
    templates = load_niche_templates()
    return {
        key: niche["label"]
        for key, niche in templates["niches"].items()
    }
