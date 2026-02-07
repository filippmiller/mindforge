from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from config import settings
from database.db import init_db
from routers import sessions, brainstorm, whitepaper, competitor


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    yield


app = FastAPI(
    title="MindForge API",
    description="AI-powered brainstorming engine for website creation",
    version="0.1.0",
    lifespan=lifespan,
)

origins = [settings.FRONTEND_URL, "http://localhost:5173"]
# Filter out empty strings
origins = [o for o in origins if o]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(sessions.router)
app.include_router(brainstorm.router)
app.include_router(whitepaper.router)
app.include_router(competitor.router)


@app.get("/api/health")
async def health():
    return {"status": "ok", "service": "mindforge"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
