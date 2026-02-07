# 🧠 MindForge — Think Before You Build

AI-powered voice-first brainstorming engine that helps you think through website ideas before building them.

## Quick Start

### 1. Backend

```bash
cd backend
pip install -r requirements.txt
cp ../.env.example ../.env
# Edit .env and add your ANTHROPIC_API_KEY
python main.py
```

Backend runs at http://localhost:8000

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend runs at http://localhost:5173

### 3. Use It

1. Click the glowing orb
2. Speak your website idea
3. Watch MindForge think — it'll analyze, find gaps, and ask targeted questions
4. Respond with voice or text
5. Watch the whitepaper build in the sidebar
6. When complete, generate a full specification document

## Architecture

- **Frontend:** React + Vite + TypeScript + Tailwind + Framer Motion
- **Backend:** FastAPI + SQLite + Anthropic Claude API
- **Voice:** Browser Web Speech API
- **Streaming:** Server-Sent Events (SSE)
- **Self-Learning:** Rules engine that grows from conversations

## Key Features

- 🎙 Voice-first interaction
- 🧠 Visible AI thinking process
- 📋 Auto-building whitepaper/specification
- 🔄 Self-learning question bank
- 📊 Completion tracking
- 💾 Session persistence
