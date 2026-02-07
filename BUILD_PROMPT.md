# 🧠 MINDFORGE — AI Brainstorming Engine MVP

## BUILD INSTRUCTIONS FOR CLAUDE

You are building **MindForge** — a voice-first AI brainstorming platform that helps people think through website ideas before building them. This is the MVP: brainstorming engine only, no website generation yet.

---

## PROJECT OVERVIEW

MindForge is fundamentally different from Lovable/Bolt/v0. Instead of blindly generating code from vague prompts, MindForge forces critical thinking FIRST. The user speaks their idea, and the AI systematically deconstructs it, identifies gaps, asks targeted questions, and iterates until a polished whitepaper/spec emerges.

### Core Philosophy
- **Think first, build later.** Never rush to solutions.
- **Voice-first interaction.** People speak, not type.
- **Visible thinking.** Show the AI reasoning process in real-time — make it futuristic and intriguing.
- **Structured output.** Every session produces a professional whitepaper.

---

## TECH STACK

- **Frontend:** React + Vite + TypeScript
- **Styling:** Tailwind CSS + custom CSS for animations/effects
- **Backend:** FastAPI (Python)
- **AI:** Anthropic Claude API (claude-sonnet-4-20250514 for brainstorming, claude-opus-4-6 for final whitepaper synthesis)
- **Voice:** Browser Web Speech API for STT, with fallback consideration for Whisper API
- **Streaming:** Server-Sent Events (SSE) for real-time AI thinking visualization
- **State:** SQLite for session persistence (MVP), upgrade path to PostgreSQL

---

## PROJECT STRUCTURE

```
mindforge/
├── frontend/
│   ├── src/
│   │   ├── main.tsx
│   │   ├── App.tsx
│   │   ├── index.css
│   │   ├── components/
│   │   │   ├── VoiceOrb.tsx              # Animated voice input button
│   │   │   ├── ThinkingStream.tsx         # Real-time AI thinking visualization
│   │   │   ├── ConversationFlow.tsx       # Main conversation display
│   │   │   ├── QuestionCards.tsx          # AI-generated questions display
│   │   │   ├── WhitepaperPreview.tsx      # Live whitepaper being built
│   │   │   ├── SessionSidebar.tsx         # Session history & navigation
│   │   │   ├── ProgressIndicator.tsx      # How "complete" the brainstorm is
│   │   │   ├── MindMap.tsx               # Visual mind map of ideas (optional v1.1)
│   │   │   └── Layout.tsx                # Main layout wrapper
│   │   ├── hooks/
│   │   │   ├── useVoiceInput.ts          # Web Speech API hook
│   │   │   ├── useSSE.ts                 # Server-Sent Events hook
│   │   │   ├── useSession.ts             # Session management
│   │   │   └── useAudioVisualization.ts  # Microphone waveform visualization
│   │   ├── services/
│   │   │   ├── api.ts                    # API client
│   │   │   └── speechToText.ts           # STT abstraction
│   │   ├── stores/
│   │   │   └── sessionStore.ts           # Zustand store for session state
│   │   └── types/
│   │       └── index.ts                  # TypeScript interfaces
│   ├── package.json
│   ├── vite.config.ts
│   ├── tailwind.config.js
│   └── tsconfig.json
├── backend/
│   ├── main.py                           # FastAPI app entry
│   ├── config.py                         # Settings & env vars
│   ├── routers/
│   │   ├── brainstorm.py                 # Brainstorming session endpoints
│   │   ├── sessions.py                   # Session CRUD
│   │   └── whitepaper.py                 # Whitepaper generation endpoint
│   ├── services/
│   │   ├── ai_engine.py                  # Core Claude interaction logic
│   │   ├── thinking_pipeline.py          # Structured thinking & analysis
│   │   ├── question_generator.py         # Gap analysis & question generation
│   │   ├── whitepaper_builder.py         # Whitepaper assembly
│   │   └── voice_processor.py            # Voice transcript cleanup
│   ├── models/
│   │   ├── session.py                    # Session data models
│   │   ├── conversation.py               # Conversation turn models
│   │   └── whitepaper.py                 # Whitepaper structure models
│   ├── prompts/
│   │   ├── brainstorm_system.py          # System prompt for brainstorming
│   │   ├── analysis_prompt.py            # Prompt for analyzing user input
│   │   ├── question_prompt.py            # Prompt for generating questions
│   │   └── whitepaper_prompt.py          # Prompt for whitepaper synthesis
│   ├── database/
│   │   ├── db.py                         # Database connection
│   │   └── migrations.py                 # Schema setup
│   └── requirements.txt
├── .env.example
├── README.md
└── docker-compose.yml (optional)
```

---

## DETAILED BUILD INSTRUCTIONS

### PHASE 1: Backend Foundation

#### 1.1 — FastAPI Setup (`backend/main.py`)

```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="MindForge API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

#### 1.2 — Core AI Engine (`backend/services/ai_engine.py`)

This is the HEART of MindForge. The AI engine must:

1. **Receive raw voice transcript** (messy, with errors)
2. **Clean and interpret** the transcript (extract intent, fix speech-to-text errors)
3. **Analyze against current session state** — what do we know, what's missing?
4. **Generate structured thinking output** — visible to user via SSE stream
5. **Produce targeted questions** — specific, not generic
6. **Update the evolving whitepaper** — incrementally build the document

**SSE Streaming Format:**
The backend must stream the AI's thinking process as Server-Sent Events:

```
event: thinking
data: {"type": "analysis", "content": "User wants an e-commerce platform..."}

event: thinking
data: {"type": "gap_identified", "content": "No mention of payment processing..."}

event: thinking
data: {"type": "insight", "content": "Target audience suggests B2C model..."}

event: questions
data: {"questions": [...]}

event: whitepaper_update
data: {"section": "overview", "content": "..."}

event: done
data: {"session_id": "..."}
```

#### 1.3 — Brainstorming System Prompt (`backend/prompts/brainstorm_system.py`)

This is CRITICAL. The system prompt must make Claude act as a senior product strategist:

```python
BRAINSTORM_SYSTEM_PROMPT = """
You are MindForge — a senior product strategist and critical thinker. Your job is to help someone transform a vague website idea into a crystal-clear product specification.

## YOUR APPROACH

You NEVER just accept what someone says at face value. You:
1. ANALYZE — Break down what was said. What's the core idea? What assumptions are being made?
2. IDENTIFY GAPS — What hasn't been mentioned? What's ambiguous? What contradicts itself?
3. THINK CRITICALLY — Challenge assumptions. Consider edge cases. Think about the user's users.
4. ASK TARGETED QUESTIONS — Not generic questions. Specific, insightful questions that force clarity.
5. BUILD INCREMENTALLY — Each interaction adds to the evolving whitepaper.

## YOUR THINKING PROCESS (shown to user)

You must structure your response in clearly labeled sections:

<analysis>
What you understood from the user's input. Key themes, ideas, and intentions you identified.
</analysis>

<gaps>
What's missing. Ambiguities. Contradictions. Unstated assumptions.
</gaps>

<insights>
Connections you see. Patterns. Opportunities the user may not have considered.
Potential problems or risks.
</insights>

<questions>
Numbered, specific questions. Each question should:
- Target a specific gap or ambiguity
- Be answerable (not too broad)
- Push the user to think deeper
- Include WHY you're asking (brief context)
Group questions by theme (e.g., "About your users:", "About functionality:", "About business model:")
</questions>

<whitepaper_update>
The section(s) of the whitepaper that should be updated based on this interaction.
Format as JSON with section name and content.
</whitepaper_update>

## WHITEPAPER STRUCTURE

The whitepaper you're building has these sections (populate as information becomes available):

1. **Project Overview** — What is this? One paragraph summary.
2. **Philosophy & Vision** — Why does this exist? What problem does it solve?
3. **Target Audience** — Who are the users? Personas if possible.
4. **Pain Points Addressed** — What specific problems does this solve for users?
5. **Core Features** — What can users DO? Prioritized feature list.
6. **Pages & Navigation** — Site map. What pages exist and how do they connect?
7. **User Flows** — Key journeys (signup, main action, admin tasks, etc.)
8. **Data Model** — What data does this website store and manage?
9. **Admin & Content Management** — How does the owner manage the site?
10. **Security Requirements** — Authentication, authorization, data protection.
11. **Design Direction** — Look, feel, tone, brand personality.
12. **Technical Considerations** — Integrations, APIs, performance needs.
13. **Open Questions** — Things still unresolved.

## RULES

- NEVER ask more than 5-7 questions at once. Quality over quantity.
- ALWAYS explain WHY you're asking something. Users learn from your thinking.
- Be conversational but sharp. You're a consultant, not a chatbot.
- If the user's idea has fundamental problems, say so diplomatically but clearly.
- Track what you know vs. what you don't. Be explicit about confidence levels.
- Each interaction should feel like progress — never spinning wheels.
"""
```

#### 1.4 — Voice Transcript Processor (`backend/services/voice_processor.py`)

Voice transcripts are messy. Build a cleanup pipeline:

```python
VOICE_CLEANUP_PROMPT = """
You are a voice transcript interpreter. The following text was captured via speech-to-text
and may contain errors, filler words, repetitions, and unclear segments.

Your job:
1. Clean up obvious speech-to-text errors
2. Remove filler words (um, uh, like, you know) unless they add meaning
3. Preserve the speaker's intent and meaning — do NOT add your own interpretation
4. Flag segments that are genuinely unclear with [UNCLEAR: best guess]
5. Return clean, readable text that faithfully represents what the person meant

Raw transcript:
{transcript}

Return ONLY the cleaned text. No commentary.
"""
```

#### 1.5 — SSE Streaming Endpoint (`backend/routers/brainstorm.py`)

```python
from fastapi import APIRouter
from fastapi.responses import StreamingResponse

router = APIRouter(prefix="/api/brainstorm")

@router.post("/{session_id}/message")
async def process_message(session_id: str, message: MessageInput):
    """
    Receives user message (from voice transcript), processes through AI engine,
    streams thinking process back via SSE.
    """
    return StreamingResponse(
        ai_engine.stream_thinking(session_id, message.text),
        media_type="text/event-stream"
    )
```

---

### PHASE 2: Frontend — The Experience

#### 2.1 — Design Direction

**Aesthetic: DARK FUTURISTIC INTELLIGENCE**

Think: mission control meets neural network visualization. The user should feel like they're watching an advanced AI think in real-time.

- **Background:** Deep dark (#0a0a0f) with subtle animated gradient mesh (dark blues, teals, deep purples)
- **Primary accent:** Electric cyan (#00f0ff) — used for active states, thinking indicators
- **Secondary accent:** Warm amber (#ffaa00) — used for questions, attention items
- **Text:** Light gray (#e0e0e8) on dark, high contrast
- **Typography:**
  - Display: "Space Mono" or "JetBrains Mono" for thinking/code-like elements
  - Body: "DM Sans" or "Outfit" for readable content
  - Accent: A distinctive serif like "Fraunces" for whitepaper headings
- **Effects:**
  - Glassmorphism panels with subtle blur
  - Particle effects or neural network lines in background
  - Text that "types" in real-time for thinking output
  - Glowing orb for voice input that pulses with audio levels
  - Questions that materialize with staggered animations
  - Progress ring that fills as whitepaper sections are completed

#### 2.2 — Voice Orb Component (`VoiceOrb.tsx`)

The centerpiece interaction element:
- Large, animated orb/sphere at center-bottom of screen
- **Idle state:** Subtle breathing animation, soft glow
- **Listening state:** Pulsates with microphone input levels, electric cyan glow intensifies, particle effects emanate outward
- **Processing state:** Orb contracts, rotates, "thinking" animation
- Click/tap to toggle recording
- Real-time transcript appears above the orb as user speaks

#### 2.3 — Thinking Stream (`ThinkingStream.tsx`)

This is what makes MindForge FUTURISTIC. As the AI processes:

1. **Analysis phase** — Text streams in with a typewriter effect, tagged as "ANALYZING..."
   - Show key concepts being extracted, highlighted in cyan
   - Brief visual: concepts appear as nodes

2. **Gap identification** — Gaps appear with amber warning styling
   - Each gap has a subtle pulse animation
   - Icon: ⚠️ or custom warning indicator

3. **Insights** — Appear with a "lightbulb" moment effect
   - Brief flash/glow animation
   - Styled distinctly from analysis

4. **Questions** — Materialize one by one with staggered delay
   - Each question is a card that slides in
   - Grouped by theme
   - User can click to respond to specific questions
   - Or just hit the voice button and answer naturally

#### 2.4 — Whitepaper Preview (`WhitepaperPreview.tsx`)

A side panel or toggleable view showing the whitepaper being built:
- Sections listed with completion indicators (empty → partial → complete)
- Content updates in real-time as AI processes new information
- Highlighted/animated when a section gets updated
- Can be expanded to full view
- Export to PDF/Markdown when "done"

#### 2.5 — Progress Indicator (`ProgressIndicator.tsx`)

Visual indicator of brainstorming completeness:
- Circular or arc progress showing sections completed
- Color transitions from amber (early) → cyan (progressing) → green (ready)
- Shows which sections need more information
- Helps user understand "we're X% done thinking through your idea"

#### 2.6 — Main Layout

```
┌─────────────────────────────────────────────────────┐
│  MindForge Logo          [Sessions]  [Whitepaper]   │
├──────────────┬──────────────────────────────────────┤
│              │                                       │
│  Progress    │     Thinking Stream                   │
│  Indicator   │     (main content area)               │
│              │                                       │
│  Whitepaper  │     - Analysis                        │
│  Sections    │     - Gaps Found                      │
│  (sidebar)   │     - Insights                        │
│              │     - Question Cards                  │
│              │                                       │
│              │                                       │
│              ├──────────────────────────────────────┤
│              │  ┌─────────────────────────────┐     │
│              │  │    Live Transcript           │     │
│              │  └─────────────────────────────┘     │
│              │         🔵 Voice Orb                  │
└──────────────┴──────────────────────────────────────┘
```

---

### PHASE 3: Integration & Flow

#### 3.1 — Complete User Flow

1. User lands on MindForge → sees dark, atmospheric UI with glowing Voice Orb
2. Brief intro text: "Tell me about the website you want to build. I'll help you think it through."
3. User clicks Voice Orb → starts speaking
4. Real-time transcript appears above orb
5. User stops speaking → transcript is sent to backend
6. **Thinking Stream activates:**
   - "ANALYZING..." with typewriter effect
   - Key concepts highlighted
   - Gaps identified with amber markers
   - Insights appear with glow effects
   - Questions materialize as cards
7. Whitepaper sidebar updates with new information
8. Progress indicator advances
9. User reviews questions → clicks Voice Orb → responds
10. Cycle repeats, each time deepening the spec
11. When progress reaches ~90%+ → "GENERATE WHITEPAPER" button appears
12. Final whitepaper is synthesized (using Opus for quality) and presented

#### 3.2 — Session Persistence

- Every session saved with full conversation history
- User can leave and come back
- Session list in sidebar for switching between projects
- Each session shows: project name, last active, completion %

---

### PHASE 4: Environment & Config

#### `.env.example`
```
ANTHROPIC_API_KEY=sk-ant-...
DATABASE_URL=sqlite:///./mindforge.db
FRONTEND_URL=http://localhost:5173
# Optional: for Whisper fallback
# OPENAI_API_KEY=sk-...
```

#### `requirements.txt`
```
fastapi>=0.104.0
uvicorn>=0.24.0
anthropic>=0.40.0
python-dotenv>=1.0.0
aiosqlite>=0.19.0
pydantic>=2.5.0
```

#### `package.json` (key dependencies)
```json
{
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "zustand": "^4.4.0",
    "framer-motion": "^10.16.0"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^4.2.0",
    "tailwindcss": "^3.3.0",
    "typescript": "^5.3.0",
    "vite": "^5.0.0"
  }
}
```

---

## BUILD ORDER

Execute in this exact order:

1. **Backend skeleton** — FastAPI app, config, database setup
2. **AI prompts** — All prompt files (this is the brain)
3. **AI engine** — Core processing pipeline with SSE streaming
4. **API routes** — Brainstorm, sessions, whitepaper endpoints
5. **Frontend skeleton** — Vite + React + Tailwind setup
6. **Voice Orb** — The main interaction element
7. **Thinking Stream** — Real-time AI visualization
8. **Conversation Flow** — Full conversation display
9. **Question Cards** — Interactive question display
10. **Whitepaper Preview** — Side panel with live updates
11. **Progress Indicator** — Completion tracking
12. **Session management** — Persistence, sidebar, switching
13. **Whitepaper export** — PDF/Markdown generation
14. **Polish** — Animations, transitions, edge cases

---

## CODING STANDARDS

- **One function per file** where practical. No god files.
- **TypeScript strict mode** on frontend.
- **Type hints everywhere** on backend.
- **No hardcoded values** — use env vars and config.
- **Error handling** — every API call wrapped, user-friendly error states.
- **Security headers** — CORS properly configured, input sanitization.
- **Accessible** — keyboard navigation, screen reader friendly voice controls.
- **Mobile responsive** — voice-first means mobile-first.

---

## IMPORTANT NOTES

- The SSE streaming is CRITICAL for the "visible thinking" experience. Do not use WebSockets — SSE is simpler and sufficient for this one-directional stream.
- The Voice Orb must feel ALIVE. Spend time on the animations. This is the first thing users interact with.
- The thinking stream must be genuinely interesting to watch. Not just text appearing — it should feel like watching an intelligence work.
- Every session interaction should feel like PROGRESS. The user should feel the whitepaper growing.
- Start simple, iterate. Get the voice → transcript → AI analysis → questions loop working first. Polish after.
