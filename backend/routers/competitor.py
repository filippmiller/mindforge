from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from services.competitor_analyzer import stream_competitor_analysis


router = APIRouter(prefix="/api/competitor")


class CompetitorRequest(BaseModel):
    query: str
    urls: list[str] | None = None


@router.post("/{session_id}/analyze")
async def analyze_competitors(session_id: str, request: CompetitorRequest):
    """
    Analyze competitor websites for a brainstorming session.
    Accepts either a search query or specific URLs to analyze.
    Returns SSE stream with analysis progress and results.
    """
    if not request.query and not request.urls:
        raise HTTPException(status_code=400, detail="Provide a query or list of URLs")

    return StreamingResponse(
        stream_competitor_analysis(session_id, request.query, request.urls),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
