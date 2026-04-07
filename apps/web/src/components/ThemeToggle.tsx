"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Avoid hydration mismatch
  useEffect(() => setMounted(true), []);
  if (!mounted) return <div className="w-9 h-9" />;

  const isDark = theme === "dark";

  return (
    <button
      onClick={() => setTheme(isDark ? "light" : "dark")}
      aria-label="Toggle theme"
      className="relative w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-200 border"
      style={{
        background: isDark ? "rgba(34,197,94,0.08)" : "rgba(34,197,94,0.10)",
        borderColor: "var(--border)",
        color: isDark ? "#4ade80" : "#15803d",
      }}
    >
      <span
        className="absolute inset-0 rounded-xl transition-opacity duration-300"
        style={{ opacity: isDark ? 0 : 1, background: "rgba(250,250,250,0.5)" }}
      />
      {isDark ? (
        <Sun className="w-4 h-4 relative z-10 transition-transform duration-300 rotate-0" />
      ) : (
        <Moon className="w-4 h-4 relative z-10 transition-transform duration-300 rotate-0" />
      )}
    </button>
  );
}
