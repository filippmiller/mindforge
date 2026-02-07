/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        forge: {
          bg: "#0a0a0f",
          surface: "#12121a",
          border: "#1e1e2e",
          cyan: "#00f0ff",
          amber: "#ffaa00",
          green: "#00ff88",
          text: "#e0e0e8",
          muted: "#6b6b80",
        },
      },
      fontFamily: {
        mono: ['"JetBrains Mono"', "monospace"],
        sans: ['"DM Sans"', "sans-serif"],
        display: ['"Fraunces"', "serif"],
      },
      animation: {
        "pulse-glow": "pulseGlow 2s ease-in-out infinite",
        "fade-in-up": "fadeInUp 0.5s ease-out",
        "typewriter": "typewriter 0.05s steps(1) infinite",
      },
      keyframes: {
        pulseGlow: {
          "0%, 100%": { boxShadow: "0 0 20px rgba(0, 240, 255, 0.3)" },
          "50%": { boxShadow: "0 0 60px rgba(0, 240, 255, 0.6)" },
        },
        fadeInUp: {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
    },
  },
  plugins: [],
};
