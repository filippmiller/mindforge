import uuid
import json
import aiosqlite
from fastapi import APIRouter

from database.db import DB_PATH
from models.session import SessionCreate, SessionResponse, SessionList

router = APIRouter(prefix="/api/sessions", tags=["sessions"])


@router.post("", response_model=SessionResponse)
async def create_session(data: SessionCreate):
    session_id = str(uuid.uuid4())
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute(
            "INSERT INTO sessions (id, name) VALUES (?, ?)",
            (session_id, data.name),
        )
        # Create empty whitepaper
        await db.execute(
            "INSERT INTO whitepapers (session_id, content) VALUES (?, ?)",
            (session_id, json.dumps({})),
        )
        await db.commit()

        db.row_factory = aiosqlite.Row
        cursor = await db.execute("SELECT * FROM sessions WHERE id = ?", (session_id,))
        row = await cursor.fetchone()

    return SessionResponse(**dict(row))


@router.get("", response_model=SessionList)
async def list_sessions():
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        cursor = await db.execute("SELECT * FROM sessions ORDER BY updated_at DESC")
        rows = await cursor.fetchall()

    return SessionList(sessions=[SessionResponse(**dict(row)) for row in rows])


@router.get("/{session_id}", response_model=SessionResponse)
async def get_session(session_id: str):
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        cursor = await db.execute("SELECT * FROM sessions WHERE id = ?", (session_id,))
        row = await cursor.fetchone()

    if not row:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Session not found")

    return SessionResponse(**dict(row))


@router.patch("/{session_id}")
async def rename_session(session_id: str, data: SessionCreate):
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute(
            "UPDATE sessions SET name = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
            (data.name, session_id),
        )
        await db.commit()
        db.row_factory = aiosqlite.Row
        cursor = await db.execute("SELECT * FROM sessions WHERE id = ?", (session_id,))
        row = await cursor.fetchone()
    if not row:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Session not found")
    return SessionResponse(**dict(row))


@router.delete("/{session_id}")
async def delete_session(session_id: str):
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute("DELETE FROM conversation_turns WHERE session_id = ?", (session_id,))
        await db.execute("DELETE FROM whitepapers WHERE session_id = ?", (session_id,))
        await db.execute("DELETE FROM sessions WHERE id = ?", (session_id,))
        await db.commit()
    return {"status": "deleted"}
