import { useState, useEffect, useCallback } from "react";
import { useSessionStore } from "./stores/sessionStore";
import { useVoiceInput } from "./hooks/useVoiceInput";
import { VoiceOrb } from "./components/VoiceOrb";
import { ThinkingStream } from "./components/ThinkingStream";
import { WhitepaperPreview } from "./components/WhitepaperPreview";
import { WhitepaperModal } from "./components/WhitepaperModal";
import { ProgressIndicator } from "./components/ProgressIndicator";
import { SessionSidebar } from "./components/SessionSidebar";
import { TranscriptDisplay } from "./components/TranscriptDisplay";
import { ToastContainer, toast } from "./components/Toast";
import {
  createSession,
  listSessions,
  deleteSession,
  streamBrainstorm,
  getWhitepaper,
} from "./services/api";
import type { Session } from "./types";

export default function App() {
  const store = useSessionStore();
  const [showSidebar, setShowSidebar] = useState(true);
  const [textInput, setTextInput] = useState("");
  const [showTextInput, setShowTextInput] = useState(false);
  const [showWhitepaperModal, setShowWhitepaperModal] = useState(false);

  const voice = useVoiceInput({
    language: "en-US",
    continuous: true,
  });

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

  const handleNewSession = useCallback(async () => {
    const session = await createSession();
    store.setCurrentSession(session);
    store.setSessions([session, ...store.sessions]);
    store.clearThinkingBlocks();
    store.clearStreamingText();
    store.clearConversation();
    store.setWhitepaperSections({});
    store.setCompletionPct(0);
  }, [store]);

  const handleSelectSession = useCallback(
    async (session: Session) => {
      store.setCurrentSession(session);
      store.clearThinkingBlocks();
      store.clearStreamingText();
      store.setCompletionPct(session.completion_pct);
    },
    [store],
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
      if (!store.currentSession || !text.trim()) return;

      // Double-submit prevention
      if (store.orbState !== "idle") return;

      store.setOrbState("thinking");
      store.clearStreamingText();
      store.addConversationEntry("user", text);

      streamBrainstorm(
        store.currentSession.id,
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
              case "status":
                // Could show status indicators
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
        },
        // onError
        (err) => {
          console.error("Stream error:", err);
          store.setOrbState("idle");
          store.clearStreamingText();
          toast("Something went wrong. Please try again.", "error");
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
    (e: React.FormEvent) => {
      e.preventDefault();
      if (textInput.trim()) {
        sendMessage(textInput, false);
        setTextInput("");
      }
    },
    [textInput, sendMessage],
  );

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <div className="bg-mesh" />

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
          {/* Progress indicator */}
          {store.currentSession && (
            <div className="flex justify-center py-3 border-b border-forge-border/30">
              <ProgressIndicator percentage={store.completionPct} size={60} />
            </div>
          )}

          {/* Thinking stream */}
          <ThinkingStream />

          {/* Transcript display */}
          <TranscriptDisplay
            transcript={voice.transcript}
            interimTranscript={voice.interimTranscript}
            isListening={voice.isListening}
          />

          {/* Text input (toggle) */}
          {showTextInput && (
            <form onSubmit={handleTextSubmit} className="px-6 pb-2">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={textInput}
                  onChange={(e) => setTextInput(e.target.value)}
                  placeholder="Or type your thoughts here..."
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
          <div className="flex justify-center py-6 pb-8">
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
