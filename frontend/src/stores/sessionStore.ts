import { create } from "zustand";
import type { Session, OrbState, ThinkingPhase } from "../types";

interface ThinkingBlock {
  id: string;
  phase: ThinkingPhase;
  content: string;
  timestamp: number;
}

interface StreamToken {
  text: string;
}

interface SessionStore {
  // Session state
  currentSession: Session | null;
  sessions: Session[];
  setCurrentSession: (session: Session | null) => void;
  setSessions: (sessions: Session[]) => void;
  updateSession: (session: Partial<Session> & { id: string }) => void;

  // Orb state
  orbState: OrbState;
  setOrbState: (state: OrbState) => void;

  // Streaming state
  streamingText: string;
  appendStreamToken: (text: string) => void;
  clearStreamingText: () => void;

  // Thinking blocks
  thinkingBlocks: ThinkingBlock[];
  addThinkingBlock: (block: Omit<ThinkingBlock, "id" | "timestamp">) => void;
  clearThinkingBlocks: () => void;

  // Whitepaper
  whitepaperSections: Record<string, string>;
  updateWhitepaperSection: (key: string, content: string) => void;
  setWhitepaperSections: (sections: Record<string, string>) => void;

  // Completion
  completionPct: number;
  setCompletionPct: (pct: number) => void;

  // Conversation
  conversationHistory: Array<{ role: string; text: string; timestamp: number }>;
  addConversationEntry: (role: string, text: string) => void;
  clearConversation: () => void;
}

export const useSessionStore = create<SessionStore>((set) => ({
  currentSession: null,
  sessions: [],
  setCurrentSession: (session) => set({ currentSession: session }),
  setSessions: (sessions) => set({ sessions }),
  updateSession: (partial) =>
    set((state) => ({
      sessions: state.sessions.map((s) => (s.id === partial.id ? { ...s, ...partial } : s)),
      currentSession:
        state.currentSession?.id === partial.id
          ? { ...state.currentSession, ...partial }
          : state.currentSession,
    })),

  orbState: "idle",
  setOrbState: (orbState) => set({ orbState }),

  streamingText: "",
  appendStreamToken: (text) => set((state) => ({ streamingText: state.streamingText + text })),
  clearStreamingText: () => set({ streamingText: "" }),

  thinkingBlocks: [],
  addThinkingBlock: (block) =>
    set((state) => ({
      thinkingBlocks: [
        ...state.thinkingBlocks,
        { ...block, id: crypto.randomUUID(), timestamp: Date.now() },
      ],
    })),
  clearThinkingBlocks: () => set({ thinkingBlocks: [] }),

  whitepaperSections: {},
  updateWhitepaperSection: (key, content) =>
    set((state) => ({
      whitepaperSections: { ...state.whitepaperSections, [key]: content },
    })),
  setWhitepaperSections: (sections) => set({ whitepaperSections: sections }),

  completionPct: 0,
  setCompletionPct: (pct) => set({ completionPct: pct }),

  conversationHistory: [],
  addConversationEntry: (role, text) =>
    set((state) => ({
      conversationHistory: [
        ...state.conversationHistory,
        { role, text, timestamp: Date.now() },
      ],
    })),
  clearConversation: () => set({ conversationHistory: [] }),
}));
