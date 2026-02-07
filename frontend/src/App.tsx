import { useState, useEffect, useCallback } from "react";
import { useSessionStore } from "./stores/sessionStore";
import { useVoiceInput } from "./hooks/useVoiceInput";
import { VoiceOrb } from "./components/VoiceOrb";
import { ThinkingStream } from "./components/ThinkingStream";
import { WhitepaperPreview } from "./components/WhitepaperPreview";
import { WhitepaperModal } from "./components/WhitepaperModal";
import { NeuralBackground } from "./components/NeuralBackground";
import { PhaseIndicator } from "./components/PhaseIndicator";
import { SessionSidebar } from "./components/SessionSidebar";
import { TranscriptDisplay } from "./components/TranscriptDisplay";
import { ToastContainer, toast } from "./components/Toast";
import {
  createSession,
  listSessions,
  deleteSession,
  streamBrainstorm,
  getWhitepaper,
  getHistory,
  renameSession,
} from "./services/api";
import type { Session } from "./types";
import type { ThinkingBlock } from "./stores/sessionStore";

export default function App() {
  const store = useSessionStore();
  const [showSidebar, setShowSidebar] = useState(true);
  const [textInput, setTextInput] = useState("");
  const [showTextInput, setShowTextInput] = useState(true);
  const [showWhitepaperModal, setShowWhitepaperModal] = useState(false);
  const [hasError, setHasError] = useState(false);

  const voice = useVoiceInput({
    language: navigator.language || "en-US",
    continuous: true,
  });

  // Neural background state derived from orb state
  const neuralState =
    store.orbState === "thinking"
      ? "thinking"
      : store.orbState === "processing"
        ? "processing"
        : "idle";

  // Load sessions on mount
  useEffect(() => {
    listSessions().then((data) => store.setSessions(data.sessions));
  }, []);

  // Load whitepaper when session changes
  useEffect(() => {
    if (store.currentSession) {
      getWhitepaper(store.currentSession.id)
        .then((data) => store.setWhitepaperSections(data.sections))
        .catch(() => store.setWhitepaperSections({}));
    }
  }, [store.currentSession?.id]);

  // Reconstruct thinking blocks from conversation history
  const loadSessionHistory = useCallback(
    async (sessionId: string) => {
      try {
        const data = await getHistory(sessionId);
        const blocks: ThinkingBlock[] = [];
        let counter = 0;

        for (const turn of data.turns) {
          if (turn.role === "user" && turn.cleaned_text) {
            blocks.push({
              id: `hist-${counter++}`,
              phase: "user_message",
              content: turn.cleaned_text,
              timestamp: new Date(turn.created_at).getTime(),
            });
          } else if (turn.role === "assistant") {
            const ts = new Date(turn.created_at).getTime();
            if (turn.analysis) {
              blocks.push({ id: `hist-${counter++}`, phase: "analysis", content: turn.analysis, timestamp: ts });
            }
            if (turn.gaps) {
              blocks.push({ id: `hist-${counter++}`, phase: "gaps", content: turn.gaps, timestamp: ts });
            }
            if (turn.insights) {
              blocks.push({ id: `hist-${counter++}`, phase: "insights", content: turn.insights, timestamp: ts });
            }
            if (turn.questions) {
              blocks.push({ id: `hist-${counter++}`, phase: "questions", content: turn.questions, timestamp: ts });
            }
          }
        }

        store.setThinkingBlocks(blocks);
      } catch {
        store.clearThinkingBlocks();
      }
    },
    [store],
  );

  const handleNewSession = useCallback(async () => {
    const session = await createSession();
    store.setCurrentSession(session);
    store.setSessions([session, ...store.sessions]);
    store.clearThinkingBlocks();
    store.clearStreamingText();
    store.clearConversation();
    store.setWhitepaperSections({});
    store.setCompletionPct(0);
    store.setPhaseInfo(null);
    store.setLastMessage(null);
    setHasError(false);
  }, [store]);

  const handleSelectSession = useCallback(
    async (session: Session) => {
      store.setCurrentSession(session);
      store.clearStreamingText();
      store.setCompletionPct(session.completion_pct);
      store.setLastMessage(null);
      setHasError(false);
      // Restore phase from session if available
      if (session.current_phase) {
        store.setPhaseInfo({
          current_phase: session.current_phase,
          phase_name: getPhaseNameByNumber(session.current_phase),
          next_milestone: "",
        });
      }
      // Load conversation history and rebuild thinking blocks
      await loadSessionHistory(session.id);
    },
    [store, loadSessionHistory],
  );

  const handleDeleteSession = useCallback(
    async (session: Session) => {
      try {
        await deleteSession(session.id);
        store.setSessions(store.sessions.filter((s) => s.id !== session.id));
        if (store.currentSession?.id === session.id) {
          store.setCurrentSession(null);
          store.clearThinkingBlocks();
          store.clearStreamingText();
          store.clearConversation();
          store.setWhitepaperSections({});
          store.setCompletionPct(0);
          store.setPhaseInfo(null);
        }
        toast("Project deleted", "info");
      } catch {
        toast("Failed to delete project", "error");
      }
    },
    [store],
  );

  const sendMessage = useCallback(
    async (text: string, isVoice: boolean, rawTranscript?: string) => {
      // Read fresh state to avoid stale closures after session creation
      const currentState = useSessionStore.getState();
      if (!currentState.currentSession || !text.trim()) return;

      // Double-submit prevention
      if (currentState.orbState !== "idle") return;

      currentState.setOrbState("thinking");
      currentState.clearStreamingText();
      currentState.addConversationEntry("user", text);
      currentState.addThinkingBlock({ phase: "user_message", content: text });
      currentState.setLastMessage({ text, isVoice, rawTranscript });
      setHasError(false);

      const sessionId = currentState.currentSession.id;
      const isFirstMessage = currentState.thinkingBlocks.filter(b => b.phase === "user_message").length <= 1;

      streamBrainstorm(
        sessionId,
        text,
        isVoice,
        rawTranscript,
        // onEvent
        (event) => {
          try {
            const data = JSON.parse(event.data);

            switch (event.type) {
              case "token":
                store.appendStreamToken(data.text);
                break;
              case "analysis":
                store.addThinkingBlock({ phase: "analysis", content: data.content });
                store.clearStreamingText();
                break;
              case "gaps":
                store.addThinkingBlock({ phase: "gaps", content: data.content });
                break;
              case "insights":
                store.addThinkingBlock({ phase: "insights", content: data.content });
                break;
              case "questions":
                store.addThinkingBlock({ phase: "questions", content: data.content });
                break;
              case "whitepaper_update":
                Object.entries(data).forEach(([key, value]) => {
                  store.updateWhitepaperSection(key, value as string);
                });
                store.addThinkingBlock({ phase: "whitepaper_update", content: "Spec updated" });
                break;
              case "new_rules":
                if (data.count > 0) {
                  store.addThinkingBlock({
                    phase: "new_rules",
                    content: `Learned ${data.count} new rule(s) from this conversation`,
                  });
                }
                break;
              case "completion":
                store.setCompletionPct(data.pct);
                break;
              case "phase_info":
                store.setPhaseInfo(data);
                break;
              case "niche_classified":
                if (store.currentSession) {
                  store.updateSession({ id: store.currentSession.id, niche_type: data.niche });
                }
                toast(`Business type identified: ${data.niche}`, "info");
                break;
              case "status":
                // Status indicators handled by orb state
                break;
            }
          } catch {
            // Skip unparseable events
          }
        },
        // onDone
        () => {
          store.setOrbState("idle");
          store.clearStreamingText();

          // Auto-name: if this was the first message and session is still "Untitled Project"
          if (isFirstMessage) {
            const currentName = store.sessions.find(s => s.id === sessionId)?.name;
            if (currentName === "Untitled Project") {
              const words = text.trim().split(/\s+/).slice(0, 8).join(" ");
              const autoName = words.length > 50 ? words.slice(0, words.lastIndexOf(" ", 50)) : words;
              renameSession(sessionId, autoName).then((updated) => {
                store.updateSession({ id: sessionId, name: updated.name });
              }).catch(() => {});
            }
          }
        },
        // onError
        (err) => {
          console.error("Stream error:", err);
          store.setOrbState("idle");
          store.clearStreamingText();
          setHasError(true);
          toast("Something went wrong. Use the retry button to try again.", "error");
        },
      );
    },
    [store],
  );

  const handleOrbClick = useCallback(async () => {
    // Auto-create session if none
    if (!store.currentSession) {
      await handleNewSession();
    }

    if (voice.isListening) {
      // Stop listening and send
      voice.stopListening();
      const rawTranscript = voice.transcript;
      if (rawTranscript.trim()) {
        store.setOrbState("processing");
        sendMessage(rawTranscript, true, rawTranscript);
      }
      voice.resetTranscript();
    } else {
      // Start listening
      voice.startListening();
      store.setOrbState("listening");
    }
  }, [voice, store, handleNewSession, sendMessage]);

  const handleTextSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (textInput.trim()) {
        if (!store.currentSession) {
          await handleNewSession();
        }
        sendMessage(textInput, false);
        setTextInput("");
      }
    },
    [textInput, sendMessage, store, handleNewSession],
  );

  const handleRetry = useCallback(() => {
    if (store.lastMessage) {
      // Remove the last user_message block to avoid duplication
      const blocks = store.thinkingBlocks;
      let lastUserIdx = -1;
      for (let i = blocks.length - 1; i >= 0; i--) {
        if (blocks[i].phase === "user_message") { lastUserIdx = i; break; }
      }
      if (lastUserIdx >= 0) {
        store.setThinkingBlocks(blocks.slice(0, lastUserIdx));
      }
      setHasError(false);
      sendMessage(store.lastMessage.text, store.lastMessage.isVoice, store.lastMessage.rawTranscript);
    }
  }, [store, sendMessage]);

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      {/* Neural Forge animated background */}
      <NeuralBackground state={neuralState} />

      {/* Toast notifications */}
      <ToastContainer />

      {/* Whitepaper modal */}
      <WhitepaperModal
        isOpen={showWhitepaperModal}
        onClose={() => setShowWhitepaperModal(false)}
      />

      {/* Header */}
      <header className="relative z-10 flex items-center justify-between px-6 py-3 border-b border-forge-border/50">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowSidebar(!showSidebar)}
            className="text-forge-muted hover:text-forge-text transition-colors p-1"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>
          <h1 className="text-lg font-display font-semibold tracking-tight">
            <span className="text-forge-cyan">Mind</span>
            <span className="text-forge-text">Forge</span>
          </h1>
        </div>

        <div className="flex items-center gap-4">
          {store.currentSession?.niche_type && (
            <span className="px-2 py-0.5 text-[10px] font-mono border border-forge-cyan/20 bg-forge-cyan/5 rounded text-forge-cyan/70 uppercase tracking-wider">
              {store.currentSession.niche_type.replace("_", " ")}
            </span>
          )}
          {store.currentSession && (
            <span className="text-xs font-mono text-forge-muted">
              {store.currentSession.name}
            </span>
          )}
          {store.completionPct > 0 && (
            <button
              onClick={() => setShowWhitepaperModal(true)}
              className="px-3 py-1.5 text-xs font-mono border border-forge-cyan/30 bg-forge-cyan/10 rounded-md text-forge-cyan hover:bg-forge-cyan/20 transition-colors"
            >
              Generate Whitepaper
            </button>
          )}
          <button
            onClick={() => setShowTextInput(!showTextInput)}
            className="text-forge-muted hover:text-forge-text transition-colors p-1"
            title="Toggle text input"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M17 10H3M21 6H3M21 14H3M17 18H3" />
            </svg>
          </button>
        </div>
      </header>

      {/* Main content */}
      <div className="relative z-10 flex flex-1 overflow-hidden">
        {/* Left sidebar -- sessions + whitepaper */}
        {showSidebar && (
          <aside className="w-56 border-r border-forge-border/50 flex flex-col shrink-0">
            <div className="flex-1 border-b border-forge-border/50 overflow-hidden">
              <SessionSidebar
                sessions={store.sessions}
                currentSessionId={store.currentSession?.id || null}
                onSelectSession={handleSelectSession}
                onNewSession={handleNewSession}
                onDeleteSession={handleDeleteSession}
              />
            </div>
            <div className="h-[45%] overflow-hidden">
              <WhitepaperPreview />
            </div>
          </aside>
        )}

        {/* Center -- thinking stream + orb */}
        <main className="flex-1 flex flex-col overflow-hidden">
          {/* Phase indicator (replaces old progress indicator) */}
          {store.currentSession && (
            <div className="border-b border-forge-border/30">
              <PhaseIndicator
                currentPhase={store.phaseInfo?.current_phase || 1}
                phaseName={store.phaseInfo?.phase_name || "Introduction"}
                percentage={store.completionPct}
                nextMilestone={store.phaseInfo?.next_milestone}
              />
            </div>
          )}

          {/* Thinking stream */}
          <ThinkingStream />

          {/* Retry button on error */}
          {hasError && store.lastMessage && (
            <div className="flex justify-center px-6 pb-2">
              <button
                onClick={handleRetry}
                className="px-4 py-2 text-xs font-mono border border-red-500/30 bg-red-500/10 rounded-lg text-red-300 hover:bg-red-500/20 transition-colors flex items-center gap-2"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M1 4v6h6M23 20v-6h-6" />
                  <path d="M20.49 9A9 9 0 005.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 013.51 15" />
                </svg>
                Retry last message
              </button>
            </div>
          )}

          {/* Transcript display */}
          <TranscriptDisplay
            transcript={voice.transcript}
            interimTranscript={voice.interimTranscript}
            isListening={voice.isListening}
          />

          {/* Text input (always visible by default now) */}
          {showTextInput && (
            <form onSubmit={handleTextSubmit} className="px-6 pb-2">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={textInput}
                  onChange={(e) => setTextInput(e.target.value)}
                  placeholder="Type your thoughts here..."
                  className="flex-1 bg-forge-surface border border-forge-border rounded-lg px-4 py-2.5 text-sm text-forge-text placeholder-forge-muted/50 focus:outline-none focus:border-forge-cyan/30"
                />
                <button
                  type="submit"
                  disabled={store.orbState !== "idle"}
                  className="px-4 py-2.5 bg-forge-cyan/10 border border-forge-cyan/30 rounded-lg text-forge-cyan text-sm font-mono hover:bg-forge-cyan/20 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Send
                </button>
              </div>
            </form>
          )}

          {/* Voice orb */}
          <div className="flex justify-center py-4 pb-6">
            <VoiceOrb
              state={store.orbState}
              onClick={handleOrbClick}
            />
          </div>
        </main>
      </div>

      {/* Voice not supported warning */}
      {!voice.isSupported && (
        <div className="fixed bottom-4 right-4 z-50 glass-panel px-4 py-3 text-xs text-forge-amber">
          Voice input not supported in this browser. Use text input instead.
        </div>
      )}
    </div>
  );
}

function getPhaseNameByNumber(phase: number): string {
  const names: Record<number, string> = {
    1: "Introduction",
    2: "Foundation",
    3: "Structure",
    4: "Details",
    5: "Design & Tech",
    6: "Finalization",
  };
  return names[phase] || "Unknown";
}
