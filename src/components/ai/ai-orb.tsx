"use client";

import React from "react";
import { Sparkles, Mic } from "lucide-react";

interface AIOrbProps {
  onClick: () => void;
  isThinking?: boolean;
}

export function AIOrb({ onClick, isThinking = false }: AIOrbProps) {
  return (
    <button
      onClick={onClick}
      aria-label="Open AI Employee"
      className="fixed right-4 sm:right-7 bottom-20 sm:bottom-7 z-40 group flex items-center cursor-pointer focus:outline-none transition-all duration-300 active:scale-95"
    >
      {/* Desktop Expander Pill (Appears on hover) */}
      <div className="hidden sm:flex items-center gap-2 mr-3 px-3.5 py-2 rounded-full bg-slate-900/90 text-white shadow-xl backdrop-blur-md border border-slate-700/60 opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all duration-200 pointer-events-none">
        <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
        <span className="text-xs font-semibold tracking-wide">Ask AI Employee</span>
        <span className="text-[10px] text-slate-400 font-mono px-1.5 py-0.5 rounded bg-slate-800">Voice / Text</span>
      </div>

      {/* Main Orb */}
      <div className="relative">
        {/* Outer Glow Halo */}
        <div
          className={`absolute -inset-1.5 rounded-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 blur-md opacity-70 group-hover:opacity-100 transition-opacity ${
            isThinking ? "animate-spin" : "animate-pulse"
          }`}
        />

        {/* Core Button */}
        <div
          className={`relative w-14 h-14 sm:w-15 sm:h-15 rounded-full bg-ai-gradient p-0.5 flex items-center justify-center text-white shadow-2xl transition-transform ${
            isThinking ? "animate-orb-thinking" : "animate-orb-breathe"
          }`}
        >
          <div className="w-full h-full rounded-full bg-slate-950/20 backdrop-blur-xs flex items-center justify-center group-hover:bg-transparent transition-colors">
            <Sparkles className="w-6 h-6 text-white drop-shadow-md group-hover:rotate-12 transition-transform duration-300" />
          </div>
        </div>

        {/* Live Status Pip */}
        <span className="absolute top-0 right-0 flex h-4 w-4">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-80"></span>
          <span className="relative inline-flex rounded-full h-4 w-4 bg-emerald-500 border-2 border-white shadow-xs"></span>
        </span>
      </div>
    </button>
  );
}
