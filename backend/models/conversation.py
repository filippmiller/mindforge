from pydantic import BaseModel
from typing import Optional


class MessageInput(BaseModel):
    text: str
    is_voice: bool = False
    raw_transcript: Optional[str] = None


class QuestionItem(BaseModel):
    id: int
    category: str
    question: str
    why: str


class ThinkingChunk(BaseModel):
    type: str  # analysis, gap, insight, question, whitepaper_update
    content: str
    metadata: Optional[dict] = None
