import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from "react-markdown";
import { generateFinalWhitepaper } from "../services/api";
import { useSessionStore } from "../stores/sessionStore";
import { toast } from "./Toast";

interface WhitepaperModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function WhitepaperModal({ isOpen, onClose }: WhitepaperModalProps) {
  const { currentSession } = useSessionStore();
  const [markdown, setMarkdown] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerate = async () => {
    if (!currentSession) return;
    setIsGenerating(true);
    try {
      const result = await generateFinalWhitepaper(currentSession.id);
      setMarkdown(result.whitepaper_markdown);
      toast("Whitepaper generated successfully", "success");
    } catch {
      toast("Failed to generate whitepaper", "error");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = async () => {
    if (markdown) {
      await navigator.clipboard.writeText(markdown);
      toast("Copied to clipboard", "success");
    }
  };

  const handleDownload = () => {
    if (!markdown) return;
    const blob = new Blob([markdown], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${currentSession?.name || "whitepaper"}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="w-[90vw] max-w-3xl max-h-[85vh] glass-panel rounded-xl flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-forge-border">
              <h2 className="text-lg font-display font-semibold text-forge-text">
                Final Whitepaper
              </h2>
              <div className="flex items-center gap-2">
                {markdown && (
                  <>
                    <button
                      onClick={handleCopy}
                      className="px-3 py-1.5 text-xs font-mono border border-forge-border rounded-md text-forge-muted hover:text-forge-text hover:border-forge-cyan/30 transition-colors"
                    >
                      Copy
                    </button>
                    <button
                      onClick={handleDownload}
                      className="px-3 py-1.5 text-xs font-mono border border-forge-cyan/30 bg-forge-cyan/10 rounded-md text-forge-cyan hover:bg-forge-cyan/20 transition-colors"
                    >
                      Download .md
                    </button>
                  </>
                )}
                <button
                  onClick={onClose}
                  className="p-1.5 text-forge-muted hover:text-forge-text transition-colors"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M18 6L6 18M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-6">
              {!markdown && !isGenerating && (
                <div className="text-center py-12">
                  <p className="text-forge-muted text-sm mb-4">
                    Generate a polished, comprehensive whitepaper from your brainstorming session.
                  </p>
                  <button
                    onClick={handleGenerate}
                    className="px-6 py-3 bg-forge-cyan/10 border border-forge-cyan/30 rounded-lg text-forge-cyan font-mono text-sm hover:bg-forge-cyan/20 transition-colors"
                  >
                    Generate Whitepaper
                  </button>
                </div>
              )}
              {isGenerating && (
                <div className="text-center py-12">
                  <div className="inline-block w-8 h-8 border-2 border-forge-cyan/30 border-t-forge-cyan rounded-full animate-spin mb-4" />
                  <p className="text-forge-muted text-sm">Synthesizing your whitepaper with Opus...</p>
                  <p className="text-forge-muted/50 text-xs mt-1">This may take 30-60 seconds</p>
                </div>
              )}
              {markdown && (
                <div className="prose prose-invert prose-sm max-w-none prose-headings:text-forge-text prose-p:text-forge-text/80 prose-a:text-forge-cyan prose-strong:text-forge-text prose-code:text-forge-cyan/80 prose-li:text-forge-text/80">
                  <ReactMarkdown>{markdown}</ReactMarkdown>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
