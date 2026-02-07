import os
from dotenv import load_dotenv

load_dotenv()


class Settings:
    ANTHROPIC_API_KEY: str = os.getenv("ANTHROPIC_API_KEY", "")
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./mindforge.db")
    FRONTEND_URL: str = os.getenv("FRONTEND_URL", "http://localhost:5173")
    BRAINSTORM_MODEL: str = "claude-sonnet-4-20250514"
    WHITEPAPER_MODEL: str = "claude-opus-4-6"
    MAX_QUESTIONS_PER_TURN: int = 7
    RULES_FILE: str = os.path.join(os.path.dirname(__file__), "rules", "brainstorm_rules.json")


settings = Settings()
