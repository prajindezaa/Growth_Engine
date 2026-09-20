"use client";

import { useState, useEffect } from "react";

export default function ThemeToggle() {
  const [theme, setTheme] = useState<"dark" | "light">("dark");

  useEffect(() => {
    const saved = localStorage.getItem("ge-theme");
    if (saved === "light" || saved === "dark") {
      setTheme(saved);
      document.documentElement.setAttribute("data-theme", saved);
    } else if (window.matchMedia("(prefers-color-scheme: light)").matches) {
      setTheme("light");
      document.documentElement.setAttribute("data-theme", "light");
    }
  }, []);

  function toggle() {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    localStorage.setItem("ge-theme", next);
    document.documentElement.setAttribute("data-theme", next);
  }

  return (
    <button
      onClick={toggle}
      title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
      style={{
        background: "transparent",
        border: "none",
        cursor: "pointer",
        padding: "6px 8px",
        borderRadius: "var(--radius-sm)",
        fontSize: "1.1rem",
        color: "var(--text-muted)",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        transition: "color 0.15s ease",
      }}
    >
      {theme === "dark" ? "☀️" : "🌙"}
    </button>
  );
}
