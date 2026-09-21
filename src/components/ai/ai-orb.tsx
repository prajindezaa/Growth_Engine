"use client";

import React from "react";
import { Sparkles } from "lucide-react";

interface AIOrbProps {
  onClick: () => void;
  isThinking?: boolean;
}

export function AIOrb({ onClick, isThinking = false }: AIOrbProps) {
  return (
    <button
      onClick={onClick}
      aria-label="Open AI Employee"
      className="fixed right-4 bottom-20 sm:bottom-6 z-40 group flex items-center justify-center cursor-pointer focus:outline-none"
    >
      <div
        className={`w-14 h-14 rounded-full bg-ai-gradient p-0.5 flex items-center justify-center text-white shadow-xl transition-transform active:scale-95 ${
          isThinking ? "animate-orb-thinking" : "animate-orb-breathe"
        }`}
      >
        <div className="w-full h-full rounded-full bg-white/10 backdrop-blur-xs flex items-center justify-center">
          <Sparkles className="w-6 h-6 text-white drop-shadow" />
        </div>
      </div>

      {/* Pulsing indicator tag */}
      <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
        <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500 border-2 border-white"></span>
      </span>
    </button>
  );
}
