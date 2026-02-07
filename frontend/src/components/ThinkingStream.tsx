import { useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useSessionStore } from "../stores/sessionStore";

const PHASE_CONFIG: Record<string, { label: string; tagClass: string; icon: string }> = {
  analysis: { label: "ANALYZING", tagClass: "tag-analysis", icon: "◈" },
  gaps: { label: "GAPS FOUND", tagClass: "tag-gap", icon: "⚠" },
  insights: { label: "INSIGHT", tagClass: "tag-insight", icon: "✦" },
  questions: { label: "QUESTIONS", tagClass: "tag-question", icon: "?" },
  whitepaper_update: { label: "UPDATING SPEC", tagClass: "tag-analysis", icon: "📄" },
  new_rules: { label: "LEARNING", tagClass: "tag-insight", icon: "🧠" },
};

export function ThinkingStream() {
  const { streamingText, thinkingBlocks, orbState } = useSessionStore();
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [streamingText, thinkingBlocks]);

  const isActive = orbState === "thinking" || orbState === "processing" || streamingText.length > 0;

  return (
    <div ref={scrollRef} className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
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
            and building a complete specification. Start by tapping the orb below and speaking.
          </p>
        </motion.div>
      )}

      {/* Parsed thinking blocks */}
      <AnimatePresence>
        {thinkingBlocks.map((block) => {
          const config = PHASE_CONFIG[block.phase] || PHASE_CONFIG.analysis;
          return (
            <motion.div
              key={block.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4 }}
              className="thinking-line"
            >
              <div className="flex items-start gap-3">
                <span
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-mono tracking-wider border ${config.tagClass} shrink-0 mt-0.5`}
                >
                  <span>{config.icon}</span>
                  {config.label}
                </span>
                <div className="text-sm leading-relaxed text-forge-text/90 whitespace-pre-wrap">
                  {block.content}
                </div>
              </div>
            </motion.div>
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
