import type { Session, WhitepaperData } from "../types";

const API_BASE = import.meta.env.VITE_API_URL || "/api";

export async function createSession(name?: string): Promise<Session> {
  const res = await fetch(`${API_BASE}/sessions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: name || "Untitled Project" }),
  });
  return res.json();
}

export async function listSessions(): Promise<{ sessions: Session[] }> {
  const res = await fetch(`${API_BASE}/sessions`);
  return res.json();
}

export async function getSession(id: string): Promise<Session> {
  const res = await fetch(`${API_BASE}/sessions/${id}`);
  return res.json();
}

export async function deleteSession(id: string): Promise<void> {
  await fetch(`${API_BASE}/sessions/${id}`, { method: "DELETE" });
}

export async function getWhitepaper(sessionId: string): Promise<WhitepaperData> {
  const res = await fetch(`${API_BASE}/whitepaper/${sessionId}`);
  return res.json();
}

export async function generateFinalWhitepaper(sessionId: string): Promise<{ whitepaper_markdown: string }> {
  const res = await fetch(`${API_BASE}/whitepaper/${sessionId}/generate`, { method: "POST" });
  return res.json();
}

export async function getHistory(sessionId: string) {
  const res = await fetch(`${API_BASE}/brainstorm/${sessionId}/history`);
  return res.json();
}

export function streamBrainstorm(
  sessionId: string,
  text: string,
  isVoice: boolean,
  rawTranscript?: string,
  onEvent: (event: { type: string; data: string }) => void = () => {},
  onDone: () => void = () => {},
  onError: (err: Error) => void = () => {},
) {
  const abortController = new AbortController();

  fetch(`${API_BASE}/brainstorm/${sessionId}/message`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      text,
      is_voice: isVoice,
      raw_transcript: rawTranscript,
    }),
    signal: abortController.signal,
  })
    .then(async (response) => {
      if (!response.ok) throw new Error("Stream failed");
      const reader = response.body?.getReader();
      if (!reader) throw new Error("No reader");

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        let currentEvent = "";
        for (const line of lines) {
          if (line.startsWith("event: ")) {
            currentEvent = line.slice(7).trim();
          } else if (line.startsWith("data: ") && currentEvent) {
            onEvent({ type: currentEvent, data: line.slice(6) });
            currentEvent = "";
          }
        }
      }

      onDone();
    })
    .catch((err) => {
      if (err.name !== "AbortError") onError(err);
    });

  return () => abortController.abort();
}
