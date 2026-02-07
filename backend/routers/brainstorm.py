import json
import aiosqlite
from fastapi import APIRouter
from fastapi.responses import StreamingResponse

from database.db import DB_PATH
from models.conversation import MessageInput
from services.ai_engine import stream_brainstorm

router = APIRouter(prefix="/api/brainstorm", tags=["brainstorm"])


@router.post("/{session_id}/message")
async def process_message(session_id: str, message: MessageInput):
    """
    Process a user message through the brainstorming engine.
    Returns SSE stream with thinking visualization.
    """
    return StreamingResponse(
        stream_brainstorm(
            session_id=session_id,
            user_text=message.text,
            is_voice=message.is_voice,
            raw_transcript=message.raw_transcript,
        ),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@router.get("/{session_id}/history")
async def get_history(session_id: str):
    """Get full conversation history for a session."""
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        cursor = await db.execute(
            "SELECT * FROM conversation_turns WHERE session_id = ? ORDER BY created_at",
            (session_id,),
        )
        rows = await cursor.fetchall()

    return {
        "session_id": session_id,
        "turns": [dict(row) for row in rows],
    }
