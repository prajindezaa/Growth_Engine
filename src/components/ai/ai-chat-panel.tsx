"use client";

import React, { useState } from "react";
import { Sparkles, Send, X, Mic, Volume2, ArrowRight } from "lucide-react";
import { useAIEmployee } from "@/hooks/use-ai-employee";
import { AIActionCard } from "./ai-action-card";
import { StructuredCardsView } from "./structured-cards-view";
import { Button } from "@/components/ui/button";

interface AIChatPanelProps {
  isOpen: boolean;
  onClose: () => void;
  ai: ReturnType<typeof useAIEmployee>;
}

export function AIChatPanel({ isOpen, onClose, ai }: AIChatPanelProps) {
  const [inputText, setInputText] = useState("");
  const { messages, isThinking, sendMessage, confirmAction, cancelAction } = ai;

  if (!isOpen) return null;

  const quickPrompts = [
    "Today's sales?",
    "Who owes me money?",
    "What's low in stock?",
    "இன்னைக்கு எவ்வளவு சேல்ஸ்?",
  ];


  const handleSend = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim()) return;
    sendMessage(inputText.trim());
    setInputText("");
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden flex flex-col justify-end sm:justify-center sm:items-center">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* Floating Glass Chat Container */}
      <div className="relative z-10 w-full sm:max-w-lg h-[92vh] sm:h-[680px] bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-indigo-100 animate-in slide-in-from-bottom-8 duration-300">
        
        {/* Mobile handle */}
        <div className="flex justify-center pt-2.5 pb-1 sm:hidden">
          <div className="w-12 h-1.5 rounded-full bg-slate-300" />
        </div>

        {/* AI Header */}
        <div className="px-5 py-3.5 border-b border-indigo-100/80 bg-gradient-to-r from-indigo-50/80 via-white to-purple-50/50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className={`w-9 h-9 rounded-xl bg-ai-gradient flex items-center justify-center text-white shadow-md ${
                isThinking ? "animate-orb-thinking" : "animate-orb-breathe"
              }`}
            >
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="text-sm font-bold text-slate-900">AI Employee</h3>
                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-indigo-100 text-indigo-700">
                  Fixed Intent Engine
                </span>
              </div>
              <p className="text-xs text-slate-500">
                {isThinking ? "Accessing validated business logic..." : "English • தமிழ் • Tanglish Ready"}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Chat Stream Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 bg-slate-50/50">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex flex-col ${msg.sender === "user" ? "items-end" : "items-start"}`}
            >
              <div
                className={`max-w-[88%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                  msg.sender === "user"
                    ? "bg-[#4F46E5] text-white rounded-br-xs shadow-sm"
                    : "bg-white text-slate-900 border border-slate-200/90 rounded-bl-xs shadow-[0_1px_2px_rgba(0,0,0,0.04)]"
                }`}
              >
                {/* 1. Lead with direct answer in one sentence */}
                <p className="font-medium">{msg.text}</p>

                {/* 2. Structured Cards (Render as tappable cards, NOT text walls) */}
                {msg.structuredCards && (
                  <StructuredCardsView
                    title={msg.structuredCards.title}
                    items={msg.structuredCards.items}
                  />
                )}

                {/* 3. Clarification Options (Multi-match resolution) */}
                {msg.clarificationOptions && (
                  <div className="mt-2 pt-2 border-t border-slate-100 space-y-1">
                    <span className="text-[11px] font-semibold text-slate-500 block">
                      Please select the exact party:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {msg.clarificationOptions.map((opt) => (
                        <button
                          key={opt}
                          onClick={() => sendMessage(`Show me ${opt}`)}
                          className="px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 text-xs font-semibold hover:bg-indigo-100 border border-indigo-100 transition-all active:scale-95"
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* 4. One Offered Next Step Max */}
                {msg.offeredNextStep && msg.sender === "ai" && (
                  <div className="mt-2.5 pt-2 border-t border-slate-100/80 flex items-center justify-between text-xs text-indigo-700">
                    <span className="font-semibold">{msg.offeredNextStep}</span>
                    <button
                      onClick={() => sendMessage(msg.offeredNextStep!)}
                      className="ml-2 font-bold hover:underline flex items-center shrink-0"
                    >
                      <span>Yes</span>
                      <ArrowRight className="w-3 h-3 ml-0.5" />
                    </button>
                  </div>
                )}

                {/* Voice listen button for AI responses */}
                {msg.sender === "ai" && (
                  <button
                    onClick={() => {}}
                    className="mt-2 text-[11px] text-slate-400 hover:text-indigo-600 flex items-center gap-1 transition-colors"
                  >
                    <Volume2 className="w-3.5 h-3.5" />
                    <span>Listen (Tamil / English)</span>
                  </button>
                )}
              </div>

              {/* Action Preview Card if message includes an executable proposal */}
              {msg.actionProposal && (
                <div className="w-full max-w-[94%]">
                  <AIActionCard
                    proposal={msg.actionProposal}
                    onConfirm={confirmAction}
                    onCancel={cancelAction}
                  />
                </div>
              )}

              <span className="text-[10px] text-slate-400 mt-1 px-1">{msg.timestamp}</span>
            </div>
          ))}

          {isThinking && (
            <div className="flex items-center gap-2 p-3 bg-white border border-indigo-100 rounded-2xl w-fit shadow-xs animate-pulse">
              <div className="w-4 h-4 rounded-full bg-ai-gradient animate-spin" />
              <span className="text-xs font-medium text-slate-600">
                Checking validated business queries...
              </span>
            </div>
          )}
        </div>

        {/* Quick Suggestion Chips */}
        <div className="px-4 py-2 bg-white border-t border-slate-100 overflow-x-auto flex items-center gap-2 no-scrollbar">
          {quickPrompts.map((prompt) => (
            <button
              key={prompt}
              onClick={() => sendMessage(prompt)}
              className="whitespace-nowrap px-3 py-1.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 active:scale-95 transition-all shrink-0"
            >
              {prompt}
            </button>
          ))}
        </div>

        {/* Bottom Input Zone */}
        <form
          onSubmit={handleSend}
          className="p-3 sm:p-4 bg-white border-t border-slate-200 safe-bottom flex items-center gap-2"
        >
          <div className="relative flex-1">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Ask in English, Tamil, or Tanglish..."
              className="w-full h-11 pl-4 pr-10 rounded-xl bg-slate-100 border border-transparent focus:border-[#4F46E5] focus:bg-white text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none transition-all"
            />
            <button
              type="button"
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-indigo-600 p-1"
              title="Voice (Tamil & English)"
            >
              <Mic className="w-4 h-4" />
            </button>
          </div>

          <Button
            type="submit"
            variant="ai"
            size="md"
            disabled={!inputText.trim()}
            className="shrink-0 px-4 h-11"
          >
            <Send className="w-4 h-4" />
          </Button>
        </form>
      </div>
    </div>
  );
}
