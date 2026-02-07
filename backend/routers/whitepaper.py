import json
import aiosqlite
from fastapi import APIRouter, HTTPException

from database.db import DB_PATH
from services.ai_engine import generate_final_whitepaper

router = APIRouter(prefix="/api/whitepaper", tags=["whitepaper"])


@router.get("/{session_id}")
async def get_whitepaper(session_id: str):
    """Get the current whitepaper state for a session."""
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        cursor = await db.execute(
            "SELECT content, updated_at FROM whitepapers WHERE session_id = ?",
            (session_id,),
        )
        row = await cursor.fetchone()

    if not row:
        raise HTTPException(status_code=404, detail="Whitepaper not found")

    return {
        "session_id": session_id,
        "sections": json.loads(row["content"]),
        "updated_at": row["updated_at"],
    }


@router.post("/{session_id}/generate")
async def generate_whitepaper(session_id: str):
    """Generate the final polished whitepaper using Opus."""
    result = await generate_final_whitepaper(session_id)
    return {
        "session_id": session_id,
        "whitepaper_markdown": result,
    }
