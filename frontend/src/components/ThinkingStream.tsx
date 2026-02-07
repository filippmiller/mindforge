import { useRef, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from "react-markdown";
import { useSessionStore } from "../stores/sessionStore";
import type { ThinkingBlock } from "../stores/sessionStore";

const PHASE_CONFIG: Record<string, { label: string; tagClass: string; icon: string }> = {
  analysis: { label: "ANALYZING", tagClass: "tag-analysis", icon: "◈" },
  gaps: { label: "GAPS FOUND", tagClass: "tag-gap", icon: "⚠" },
  insights: { label: "INSIGHT", tagClass: "tag-insight", icon: "✦" },
  questions: { label: "QUESTIONS", tagClass: "tag-question", icon: "?" },
  whitepaper_update: { label: "UPDATING SPEC", tagClass: "tag-analysis", icon: "📄" },
  new_rules: { label: "LEARNING", tagClass: "tag-insight", icon: "🧠" },
  user_message: { label: "YOU", tagClass: "tag-user", icon: "▸" },
};

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <button
      onClick={handleCopy}
      className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0 p-1 rounded text-forge-muted/50 hover:text-forge-text hover:bg-white/5"
      title="Copy to clipboard"
    >
      {copied ? (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M20 6L9 17l-5-5" />
        </svg>
      ) : (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
          <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
        </svg>
      )}
    </button>
  );
}

function ThinkingBlockItem({ block, defaultCollapsed }: { block: ThinkingBlock; defaultCollapsed: boolean }) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed);
  const config = PHASE_CONFIG[block.phase] || PHASE_CONFIG.analysis;
  const isUserMessage = block.phase === "user_message";

  if (isUserMessage) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
        className="flex justify-end"
      >
        <div className="max-w-[80%] px-4 py-3 rounded-2xl rounded-br-sm bg-forge-cyan/10 border border-forge-cyan/20 text-sm text-forge-text/90 leading-relaxed">
          {block.content}
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
      className="thinking-line group"
    >
      <div
        className="flex items-start gap-3 cursor-pointer"
        onClick={() => setCollapsed(!collapsed)}
      >
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-mono tracking-wider border ${config.tagClass} shrink-0 mt-0.5`}
        >
          <span>{config.icon}</span>
          {config.label}
          {collapsed && (
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="ml-1">
              <path d="M9 18l6-6-6-6" />
            </svg>
          )}
        </span>
        {!collapsed && (
          <div className="flex-1 min-w-0">
            <div className="text-sm leading-relaxed text-forge-text/90 thinking-markdown">
              <ReactMarkdown>{block.content}</ReactMarkdown>
            </div>
          </div>
        )}
        {collapsed && (
          <span className="text-xs text-forge-muted truncate flex-1">
            {block.content.slice(0, 80)}...
          </span>
        )}
        {!collapsed && <CopyButton text={block.content} />}
      </div>
    </motion.div>
  );
}

export function ThinkingStream() {
  const { streamingText, thinkingBlocks, orbState, phaseInfo } = useSessionStore();
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [streamingText, thinkingBlocks]);

  const isActive = orbState === "thinking" || orbState === "processing" || streamingText.length > 0;

  return (
    <div ref={scrollRef} className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
      {/* Phase indicator */}
      {phaseInfo && (
        <div className="flex items-center justify-center gap-3 py-1">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-forge-surface border border-forge-border text-[11px] font-mono">
            <span className="text-forge-cyan">Phase {phaseInfo.current_phase}</span>
            <span className="text-forge-muted">{phaseInfo.phase_name}</span>
          </div>
        </div>
      )}

      {/* Welcome state */}
      {!isActive && thinkingBlocks.length === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center justify-center h-full text-center"
        >
          <h2 className="text-2xl font-display text-forge-text mb-3">
            Tell me about your website idea
          </h2>
          <p className="text-forge-muted max-w-md leading-relaxed">
            I'll help you think it through — finding gaps, asking the right questions,
            and building a complete specification. Start by tapping the orb or typing below.
          </p>
        </motion.div>
      )}

      {/* Thinking blocks (user messages + AI blocks) */}
      <AnimatePresence>
        {thinkingBlocks.map((block, i) => {
          const isFromHistory = block.id.startsWith("hist-");
          const isOlderTurn = isFromHistory && i < thinkingBlocks.length - 8;
          return (
            <ThinkingBlockItem
              key={block.id}
              block={block}
              defaultCollapsed={isOlderTurn}
            />
          );
        })}
      </AnimatePresence>

      {/* Live streaming text */}
      {streamingText && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="glass-panel p-4"
        >
          <div className="flex items-center gap-2 mb-2">
            <motion.div
              className="w-2 h-2 rounded-full bg-forge-cyan"
              animate={{ opacity: [0.3, 1, 0.3] }}
              transition={{ duration: 1, repeat: Infinity }}
            />
            <span className="text-[11px] font-mono tracking-wider text-forge-cyan">
              THINKING
            </span>
          </div>
          <div className="text-sm text-forge-text/80 font-mono leading-relaxed whitespace-pre-wrap">
            {streamingText}
            <span className="typewriter-cursor" />
          </div>
        </motion.div>
      )}
    </div>
  );
}
