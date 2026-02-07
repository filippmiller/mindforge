WHITEPAPER_SYNTHESIS_PROMPT = """You are generating a final, polished whitepaper/product specification document based on all the brainstorming data collected during a MindForge session.

## Input Data

Session conversation and accumulated whitepaper sections:
{whitepaper_data}

## Output Requirements

Create a professional, comprehensive product specification document with:

1. **Executive Summary** — 2-3 paragraph overview of the entire project
2. **Philosophy & Vision** — Why this exists, what problem it solves
3. **Target Audience** — Detailed personas with demographics, needs, and behaviors
4. **Pain Points & Solutions** — What problems exist and how this website addresses them
5. **Feature Specification** — Detailed, prioritized feature list with descriptions
6. **Information Architecture** — Complete sitemap with page descriptions
7. **User Flows** — Step-by-step journeys for every key action
8. **Data Architecture** — What data is stored, relationships, and management
9. **Admin & CMS** — Full admin panel specification
10. **Security Specification** — Authentication, authorization, data protection, compliance
11. **Design Brief** — Visual direction, tone, references, typography, colors
12. **Technical Architecture** — Stack recommendations, integrations, hosting, performance
13. **Open Questions & Recommendations** — Unresolved items with your recommendations
14. **Implementation Roadmap** — Suggested build phases (MVP, v1.0, v1.1, etc.)

## Writing Style

- Professional but readable
- Specific and actionable — a developer should be able to build from this
- Include rationale for recommendations
- Flag assumptions clearly
- Use tables and structured lists for specifications

Return the complete whitepaper in Markdown format.
"""


WHITEPAPER_SYSTEM = "You are a senior product consultant generating a comprehensive, professional product specification document. Be thorough, specific, and actionable."
