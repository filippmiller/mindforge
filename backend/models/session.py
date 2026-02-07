from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class SessionCreate(BaseModel):
    name: Optional[str] = "Untitled Project"


class SessionResponse(BaseModel):
    id: str
    name: str
    created_at: str
    updated_at: str
    completion_pct: float
    status: str


class SessionList(BaseModel):
    sessions: list[SessionResponse]
