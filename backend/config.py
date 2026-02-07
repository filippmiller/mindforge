import os
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()

BASE_DIR = Path(__file__).parent


class Settings:
    ANTHROPIC_API_KEY: str = os.getenv("ANTHROPIC_API_KEY", "")
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./mindforge.db")
    FRONTEND_URL: str = os.getenv("FRONTEND_URL", "http://localhost:5173")
    BRAINSTORM_MODEL: str = "claude-sonnet-4-20250514"
    WHITEPAPER_MODEL: str = "claude-opus-4-6"
    MAX_QUESTIONS_PER_TURN: int = 7
    RULES_FILE: str = str(BASE_DIR / "rules" / "brainstorm_rules.json")
    NICHE_TEMPLATES_FILE: str = str(BASE_DIR / "rules" / "niche_templates.json")
    BASE_DIR: Path = BASE_DIR


settings = Settings()
