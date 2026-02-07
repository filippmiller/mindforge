import { motion } from "framer-motion";
import { useSessionStore } from "../stores/sessionStore";

const SECTIONS = [
  { key: "project_overview", label: "Overview", icon: "📋" },
  { key: "philosophy_vision", label: "Vision", icon: "🎯" },
  { key: "target_audience", label: "Audience", icon: "👥" },
  { key: "pain_points", label: "Pain Points", icon: "💢" },
  { key: "core_features", label: "Features", icon: "⚡" },
  { key: "pages_navigation", label: "Pages", icon: "🗺" },
  { key: "user_flows", label: "User Flows", icon: "🔄" },
  { key: "data_model", label: "Data", icon: "🗄" },
  { key: "admin_cms", label: "Admin", icon: "🔧" },
  { key: "security", label: "Security", icon: "🔒" },
  { key: "design_direction", label: "Design", icon: "🎨" },
  { key: "technical_considerations", label: "Technical", icon: "⚙️" },
  { key: "open_questions", label: "Open Qs", icon: "❓" },
];

interface WhitepaperPreviewProps {
  expanded?: boolean;
  onToggleExpand?: () => void;
}

export function WhitepaperPreview({ expanded = false, onToggleExpand }: WhitepaperPreviewProps) {
  const { whitepaperSections } = useSessionStore();

  const filledCount = SECTIONS.filter((s) => whitepaperSections[s.key]).length;

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-3 border-b border-forge-border">
        <h3 className="text-xs font-mono tracking-widest text-forge-muted uppercase">
          Whitepaper
        </h3>
        <span className="text-[10px] font-mono text-forge-cyan">
          {filledCount}/{SECTIONS.length}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto py-2">
        {SECTIONS.map((section, i) => {
          const hasContent = !!whitepaperSections[section.key];
          return (
            <motion.div
              key={section.key}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.03 }}
              className={`flex items-center gap-2.5 px-4 py-2 text-sm cursor-default transition-colors ${
                hasContent
                  ? "text-forge-text"
                  : "text-forge-muted/50"
              }`}
            >
              <span className="text-xs">{section.icon}</span>
              <span className="flex-1 truncate text-xs">{section.label}</span>
              {hasContent ? (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="w-1.5 h-1.5 rounded-full bg-forge-green"
                  style={{ boxShadow: "0 0 6px rgba(0, 255, 136, 0.4)" }}
                />
              ) : (
                <div className="w-1.5 h-1.5 rounded-full bg-forge-border" />
              )}
            </motion.div>
          );
        })}
      </div>

      {expanded && (
        <div className="p-4 border-t border-forge-border">
          {SECTIONS.filter((s) => whitepaperSections[s.key]).map((section) => (
            <div key={section.key} className="mb-4">
              <h4 className="text-xs font-mono text-forge-cyan mb-1">{section.label}</h4>
              <p className="text-xs text-forge-text/70 leading-relaxed">
                {whitepaperSections[section.key]?.slice(0, 200)}
                {(whitepaperSections[section.key]?.length || 0) > 200 && "..."}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
