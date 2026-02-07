import { motion, AnimatePresence } from "framer-motion";

const PHASES = [
  "Introduction",
  "Foundation",
  "Structure",
  "Details",
  "Design & Tech",
  "Finalization",
] as const;

interface PhaseIndicatorProps {
  currentPhase: number; // 1-6
  phaseName: string;
  percentage: number; // 0-100
  nextMilestone?: string;
}

export function PhaseIndicator({
  currentPhase,
  phaseName,
  percentage,
  nextMilestone,
}: PhaseIndicatorProps) {
  // Clamp to valid range
  const phase = Math.max(1, Math.min(6, currentPhase));

  // Derive how far we are within the current phase (for the connecting line fill).
  // Each phase spans ~16.67% of the total. We compute the fractional progress
  // within the current segment so the connector line partially fills.
  const segmentSize = 100 / PHASES.length;
  const phaseStart = (phase - 1) * segmentSize;
  const withinPhasePct = Math.max(
    0,
    Math.min(1, (percentage - phaseStart) / segmentSize),
  );

  return (
    <div className="w-full px-4 py-2 select-none">
      {/* Step track */}
      <div className="flex items-center justify-between relative">
        {PHASES.map((label, i) => {
          const stepNum = i + 1;
          const isCompleted = stepNum < phase;
          const isCurrent = stepNum === phase;
          const isFuture = stepNum > phase;

          return (
            <div key={label} className="flex items-center flex-1 last:flex-none">
              {/* Node */}
              <div className="relative flex flex-col items-center z-10">
                <motion.div
                  className="flex items-center justify-center rounded-full border"
                  style={{
                    width: isCurrent ? 28 : 20,
                    height: isCurrent ? 28 : 20,
                    borderColor: isCompleted
                      ? "#22c55e"
                      : isCurrent
                        ? "#00f0ff"
                        : "#4a4a5a",
                    backgroundColor: isCompleted
                      ? "rgba(34, 197, 94, 0.15)"
                      : isCurrent
                        ? "rgba(0, 240, 255, 0.1)"
                        : "rgba(74, 74, 90, 0.1)",
                    boxShadow: isCurrent
                      ? "0 0 12px rgba(0, 240, 255, 0.35)"
                      : isCompleted
                        ? "0 0 8px rgba(34, 197, 94, 0.2)"
                        : "none",
                  }}
                  initial={false}
                  animate={{
                    scale: isCurrent ? [1, 1.1, 1] : 1,
                  }}
                  transition={
                    isCurrent
                      ? { duration: 2, repeat: Infinity, ease: "easeInOut" }
                      : { duration: 0.3 }
                  }
                >
                  {isCompleted ? (
                    <motion.svg
                      width="12"
                      height="12"
                      viewBox="0 0 12 12"
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ type: "spring", stiffness: 300, damping: 20 }}
                    >
                      <path
                        d="M2.5 6L5 8.5L9.5 3.5"
                        fill="none"
                        stroke="#22c55e"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </motion.svg>
                  ) : isCurrent ? (
                    <motion.div
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: "#00f0ff" }}
                      animate={{ opacity: [0.6, 1, 0.6] }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                    />
                  ) : (
                    <div
                      className="w-1.5 h-1.5 rounded-full"
                      style={{ backgroundColor: "#4a4a5a" }}
                    />
                  )}
                </motion.div>

                {/* Phase label below the node */}
                <span
                  className="absolute top-full mt-1.5 whitespace-nowrap text-center font-mono leading-none"
                  style={{
                    fontSize: "9px",
                    letterSpacing: "0.05em",
                    color: isCompleted
                      ? "#22c55e"
                      : isCurrent
                        ? "#00f0ff"
                        : "#4a4a5a",
                    fontWeight: isCurrent ? 600 : 400,
                  }}
                >
                  {isCurrent ? (
                    <span className="flex flex-col items-center gap-0.5">
                      <span>{phaseName || label}</span>
                      <motion.span
                        className="text-[10px] font-mono tabular-nums"
                        style={{ color: "#00f0ff" }}
                        key={percentage}
                        initial={{ opacity: 0.5, y: 2 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3 }}
                      >
                        {Math.round(percentage)}%
                      </motion.span>
                    </span>
                  ) : (
                    label
                  )}
                </span>
              </div>

              {/* Connector line between nodes (not after the last node) */}
              {i < PHASES.length - 1 && (
                <div className="flex-1 h-px mx-1 relative" style={{ minWidth: 16 }}>
                  {/* Track background */}
                  <div
                    className="absolute inset-0 rounded-full"
                    style={{ backgroundColor: "#4a4a5a", opacity: 0.3 }}
                  />

                  {/* Filled portion */}
                  <motion.div
                    className="absolute inset-y-0 left-0 rounded-full"
                    style={{
                      backgroundColor: isCompleted
                        ? "#22c55e"
                        : isCurrent
                          ? "#00f0ff"
                          : "transparent",
                    }}
                    initial={false}
                    animate={{
                      width: isCompleted
                        ? "100%"
                        : isCurrent
                          ? `${withinPhasePct * 100}%`
                          : "0%",
                    }}
                    transition={{ duration: 0.6, ease: "easeOut" }}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Next milestone hint */}
      <AnimatePresence mode="wait">
        {nextMilestone && (
          <motion.div
            className="mt-6 text-center"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.3 }}
          >
            <span
              className="font-mono"
              style={{ fontSize: "9px", letterSpacing: "0.08em", color: "#6b6b80" }}
            >
              NEXT:{" "}
              <span style={{ color: "#e0e0e8" }}>{nextMilestone}</span>
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
