import { motion } from "framer-motion";

interface ProgressIndicatorProps {
  percentage: number;
  size?: number;
}

export function ProgressIndicator({ percentage, size = 80 }: ProgressIndicatorProps) {
  const strokeWidth = 3;
  const radius = (size - strokeWidth * 2) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (percentage / 100) * circumference;

  const getColor = () => {
    if (percentage < 30) return "#ffaa00";
    if (percentage < 70) return "#00f0ff";
    return "#00ff88";
  };

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size}>
          {/* Background circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="rgba(255,255,255,0.05)"
            strokeWidth={strokeWidth}
          />
          {/* Progress circle */}
          <motion.circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={getColor()}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: offset }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="progress-ring-circle"
            style={{ filter: `drop-shadow(0 0 6px ${getColor()}40)` }}
          />
        </svg>
        {/* Center text */}
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-sm font-mono" style={{ color: getColor() }}>
            {Math.round(percentage)}%
          </span>
        </div>
      </div>
      <span className="text-[10px] font-mono tracking-widest text-forge-muted uppercase">
        Spec Progress
      </span>
    </div>
  );
}
