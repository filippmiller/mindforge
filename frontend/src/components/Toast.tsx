import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface ToastItem {
  id: string;
  message: string;
  type: "error" | "success" | "info";
}

let addToastFn: ((message: string, type: ToastItem["type"]) => void) | null = null;

export function toast(message: string, type: ToastItem["type"] = "info") {
  addToastFn?.(message, type);
}

export function ToastContainer() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const addToast = useCallback((message: string, type: ToastItem["type"]) => {
    const id = crypto.randomUUID();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 5000);
  }, []);

  useEffect(() => {
    addToastFn = addToast;
    return () => {
      addToastFn = null;
    };
  }, [addToast]);

  const colorMap = {
    error: "border-red-500/50 bg-red-500/10 text-red-300",
    success: "border-forge-green/50 bg-forge-green/10 text-forge-green",
    info: "border-forge-cyan/50 bg-forge-cyan/10 text-forge-cyan",
  };

  return (
    <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 max-w-sm">
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            initial={{ opacity: 0, x: 50, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 50, scale: 0.95 }}
            className={`px-4 py-3 rounded-lg border backdrop-blur-md text-sm font-mono ${colorMap[t.type]}`}
          >
            {t.message}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
