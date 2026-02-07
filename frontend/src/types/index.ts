export interface Session {
  id: string;
  name: string;
  niche_type?: string;
  current_phase?: number;
  created_at: string;
  updated_at: string;
  completion_pct: number;
  status: string;
}

export interface ConversationTurn {
  id: number;
  session_id: string;
  role: "user" | "assistant";
  raw_transcript?: string;
  cleaned_text?: string;
  analysis?: string;
  gaps?: string;
  insights?: string;
  questions?: string;
  whitepaper_updates?: string;
  created_at: string;
}

export interface WhitepaperData {
  session_id: string;
  sections: Record<string, string>;
  updated_at: string;
}

export interface SSEEvent {
  type: string;
  data: Record<string, unknown>;
}

export type OrbState = "idle" | "listening" | "processing" | "thinking";

export type ThinkingPhase = "analysis" | "gaps" | "insights" | "questions" | "whitepaper_update" | "new_rules" | "user_message";

export interface PhaseInfo {
  current_phase: number;
  phase_name: string;
  next_milestone: string;
}
