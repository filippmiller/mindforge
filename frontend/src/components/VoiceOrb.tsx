import { motion } from "framer-motion";
import type { OrbState } from "../types";

interface VoiceOrbProps {
  state: OrbState;
  onClick: () => void;
  audioLevel?: number; // 0-1
}

export function VoiceOrb({ state, onClick, audioLevel = 0 }: VoiceOrbProps) {
  const isListening = state === "listening";
  const isProcessing = state === "processing" || state === "thinking";

  const orbScale = isListening ? 1 + audioLevel * 0.3 : 1;
  const glowIntensity = isListening ? 0.4 + audioLevel * 0.4 : 0.2;

  return (
    <div className="relative flex items-center justify-center">
      {/* Outer rings */}
      <motion.div
        className="absolute rounded-full border"
        style={{
          width: 120,
          height: 120,
          borderColor: isListening
            ? `rgba(0, 240, 255, ${0.2 + audioLevel * 0.3})`
            : isProcessing
            ? "rgba(255, 170, 0, 0.15)"
            : "rgba(0, 240, 255, 0.08)",
        }}
        animate={{
          scale: isListening ? [1, 1.15, 1] : [1, 1.05, 1],
        }}
        transition={{ duration: isListening ? 1.5 : 3, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute rounded-full border"
        style={{
          width: 140,
          height: 140,
          borderColor: isListening
            ? `rgba(0, 240, 255, ${0.1 + audioLevel * 0.2})`
            : "rgba(0, 240, 255, 0.04)",
        }}
        animate={{
          scale: isListening ? [1, 1.2, 1] : [1, 1.08, 1],
        }}
        transition={{ duration: isListening ? 2 : 4, repeat: Infinity, ease: "easeInOut", delay: 0.3 }}
      />

      {/* Main orb */}
      <motion.button
        onClick={onClick}
        className={`voice-orb relative z-10 flex items-center justify-center ${
          isListening ? "listening" : isProcessing ? "processing" : ""
        }`}
        animate={{ scale: orbScale }}
        transition={{ duration: 0.1 }}
        whileHover={{ scale: state === "idle" ? 1.05 : orbScale }}
        whileTap={{ scale: 0.95 }}
        style={{
          boxShadow: `0 0 ${30 + glowIntensity * 50}px rgba(${
            isProcessing ? "255, 170, 0" : "0, 240, 255"
          }, ${glowIntensity})`,
        }}
      >
        {/* Icon */}
        {state === "idle" && (
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
            <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
            <line x1="12" y1="19" x2="12" y2="23" />
            <line x1="8" y1="23" x2="16" y2="23" />
          </svg>
        )}
        {isListening && (
          <motion.div
            className="flex items-center gap-1"
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          >
            {[0, 1, 2, 3, 4].map((i) => (
              <motion.div
                key={i}
                className="w-1 rounded-full bg-forge-cyan"
                animate={{
                  height: [8, 8 + audioLevel * 24, 8],
                }}
                transition={{
                  duration: 0.4,
                  repeat: Infinity,
                  delay: i * 0.1,
                }}
              />
            ))}
          </motion.div>
        )}
        {isProcessing && (
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          >
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
            </svg>
          </motion.div>
        )}
      </motion.button>

      {/* State label */}
      <motion.span
        className="absolute -bottom-8 text-xs font-mono tracking-wider"
        style={{
          color: isListening ? "#00f0ff" : isProcessing ? "#ffaa00" : "#6b6b80",
        }}
        animate={{ opacity: [0.6, 1, 0.6] }}
        transition={{ duration: 2, repeat: Infinity }}
      >
        {state === "idle" && "TAP TO SPEAK"}
        {state === "listening" && "LISTENING..."}
        {state === "processing" && "PROCESSING..."}
        {state === "thinking" && "THINKING..."}
      </motion.span>
    </div>
  );
}
