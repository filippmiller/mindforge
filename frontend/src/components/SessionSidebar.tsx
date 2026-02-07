import { useState } from "react";
import { motion } from "framer-motion";
import type { Session } from "../types";

interface SessionSidebarProps {
  sessions: Session[];
  currentSessionId: string | null;
  onSelectSession: (session: Session) => void;
  onNewSession: () => void;
  onDeleteSession: (session: Session) => void;
}

export function SessionSidebar({
  sessions,
  currentSessionId,
  onSelectSession,
  onNewSession,
  onDeleteSession,
}: SessionSidebarProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const handleDelete = (e: React.MouseEvent, session: Session) => {
    e.stopPropagation();
    const confirmed = window.confirm(
      `Delete "${session.name}"? This cannot be undone.`
    );
    if (confirmed) {
      onDeleteSession(session);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-3 border-b border-forge-border">
        <button
          onClick={onNewSession}
          className="w-full py-2 px-3 rounded-lg border border-forge-cyan/30 text-forge-cyan text-xs font-mono tracking-wider hover:bg-forge-cyan/10 transition-colors"
        >
          + NEW PROJECT
        </button>
      </div>

      <div className="flex-1 overflow-y-auto py-2">
        {sessions.map((session) => (
          <motion.button
            key={session.id}
            onClick={() => onSelectSession(session)}
            onMouseEnter={() => setHoveredId(session.id)}
            onMouseLeave={() => setHoveredId(null)}
            className={`group relative w-full text-left px-4 py-3 border-b border-forge-border/50 transition-colors ${
              session.id === currentSessionId
                ? "bg-forge-cyan/5 border-l-2 border-l-forge-cyan"
                : "hover:bg-white/[0.02]"
            }`}
            whileHover={{ x: 2 }}
          >
            <div className="flex items-center justify-between">
              <div className="text-sm text-forge-text truncate pr-2">
                {session.name}
              </div>
              {hoveredId === session.id && (
                <button
                  onClick={(e) => handleDelete(e, session)}
                  className="shrink-0 p-1 rounded text-forge-muted/50 hover:text-red-400 hover:bg-red-400/10 transition-colors"
                  title="Delete project"
                >
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
                    <line x1="10" y1="11" x2="10" y2="17" />
                    <line x1="14" y1="11" x2="14" y2="17" />
                  </svg>
                </button>
              )}
            </div>
            <div className="flex items-center gap-2 mt-1">
              <div className="flex-1 h-1 rounded-full bg-forge-border overflow-hidden">
                <motion.div
                  className="h-full rounded-full"
                  style={{
                    backgroundColor:
                      session.completion_pct < 30
                        ? "#ffaa00"
                        : session.completion_pct < 70
                        ? "#00f0ff"
                        : "#00ff88",
                  }}
                  initial={{ width: 0 }}
                  animate={{ width: `${session.completion_pct}%` }}
                />
              </div>
              <span className="text-[10px] font-mono text-forge-muted">
                {Math.round(session.completion_pct)}%
              </span>
            </div>
          </motion.button>
        ))}

        {sessions.length === 0 && (
          <div className="px-4 py-8 text-center text-forge-muted text-xs">
            No projects yet. Start a new one!
          </div>
        )}
      </div>
    </div>
  );
}
