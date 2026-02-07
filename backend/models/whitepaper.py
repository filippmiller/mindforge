from pydantic import BaseModel
from typing import Optional


WHITEPAPER_SECTIONS = [
    "project_overview",
    "philosophy_vision",
    "target_audience",
    "pain_points",
    "core_features",
    "pages_navigation",
    "user_flows",
    "data_model",
    "admin_cms",
    "security",
    "design_direction",
    "technical_considerations",
    "open_questions",
]

SECTION_LABELS = {
    "project_overview": "Project Overview",
    "philosophy_vision": "Philosophy & Vision",
    "target_audience": "Target Audience",
    "pain_points": "Pain Points Addressed",
    "core_features": "Core Features",
    "pages_navigation": "Pages & Navigation",
    "user_flows": "User Flows",
    "data_model": "Data Model",
    "admin_cms": "Admin & Content Management",
    "security": "Security Requirements",
    "design_direction": "Design Direction",
    "technical_considerations": "Technical Considerations",
    "open_questions": "Open Questions",
}


class WhitepaperSection(BaseModel):
    key: str
    label: str
    content: Optional[str] = None
    completion: float = 0.0  # 0.0 to 1.0


class Whitepaper(BaseModel):
    session_id: str
    sections: dict[str, WhitepaperSection] = {}

    @classmethod
    def create_empty(cls, session_id: str) -> "Whitepaper":
        sections = {}
        for key in WHITEPAPER_SECTIONS:
            sections[key] = WhitepaperSection(
                key=key,
                label=SECTION_LABELS[key],
            )
        return cls(session_id=session_id, sections=sections)
