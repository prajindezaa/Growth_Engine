"use client";

import React, { useState } from "react";
import { DesktopSidebar } from "@/components/layout/desktop-sidebar";
import { MobileBottomNav } from "@/components/layout/mobile-bottom-nav";
import { AIOrb } from "@/components/ai/ai-orb";
import { AIChatPanel } from "@/components/ai/ai-chat-panel";
import { useAIEmployee } from "@/hooks/use-ai-employee";
import { Bell, Store, ChevronDown } from "lucide-react";

export function AppShell({ children }: { children: React.ReactNode }) {
  const ai = useAIEmployee();

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col sm:flex-row antialiased">
      {/* Desktop Persistent Left Sidebar */}
      <DesktopSidebar onOpenAI={() => ai.setIsOpen(true)} />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 pb-20 sm:pb-6">
        {/* Top Orientation Bar (Clean, uncluttered, orientation only) */}
        <header className="h-14 sm:h-16 bg-white/90 backdrop-blur-md border-b border-slate-200/80 px-4 sm:px-8 flex items-center justify-between sticky top-0 z-20">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 bg-slate-100 px-2.5 py-1 rounded-xl text-xs font-semibold text-slate-800">
              <Store className="w-3.5 h-3.5 text-[#4F46E5]" />
              <span className="truncate max-w-[150px] sm:max-w-none">Sri Lakshmi Enterprises</span>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </div>
            <span className="text-[11px] font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/60 hidden sm:inline">
              Coimbatore Store • Active
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => ai.setIsOpen(true)}
              className="sm:hidden flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-ai-gradient text-white text-xs font-semibold shadow-xs"
            >
              <span>AI Employee</span>
            </button>
            <button className="p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 relative">
              <Bell className="w-4 h-4" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
            </button>
          </div>
        </header>

        {/* Page Content Viewport */}
        <main className="flex-1 px-4 sm:px-8 py-5 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>

      {/* Floating AI Orb */}
      <AIOrb onClick={() => ai.setIsOpen(true)} isThinking={ai.isThinking} />

      {/* AI Employee Chat Sheet / Panel */}
      <AIChatPanel isOpen={ai.isOpen} onClose={() => ai.setIsOpen(false)} ai={ai} />

      {/* Mobile 5-item Bottom Bar */}
      <MobileBottomNav onOpenAI={() => ai.setIsOpen(true)} />
    </div>
  );
}
