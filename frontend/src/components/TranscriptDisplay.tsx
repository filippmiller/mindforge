import { motion, AnimatePresence } from "framer-motion";

interface TranscriptDisplayProps {
  transcript: string;
  interimTranscript: string;
  isListening: boolean;
}

export function TranscriptDisplay({ transcript, interimTranscript, isListening }: TranscriptDisplayProps) {
  const hasContent = transcript || interimTranscript;

  if (!hasContent && !isListening) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 10 }}
        className="glass-panel px-4 py-3 mx-6 mb-3"
      >
        <div className="flex items-center gap-2 mb-1.5">
          {isListening && (
            <motion.div
              className="w-2 h-2 rounded-full bg-red-500"
              animate={{ opacity: [1, 0.3, 1] }}
              transition={{ duration: 1, repeat: Infinity }}
            />
          )}
          <span className="text-[10px] font-mono tracking-widest text-forge-muted uppercase">
            {isListening ? "Recording" : "Transcript"}
          </span>
        </div>
        <p className="text-sm text-forge-text/80 leading-relaxed">
          {transcript}
          {interimTranscript && (
            <span className="text-forge-muted italic"> {interimTranscript}</span>
          )}
        </p>
      </motion.div>
    </AnimatePresence>
  );
}
