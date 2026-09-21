"use client";

import React, { useState, useRef, useEffect } from "react";
import { Sparkles, Send, X, Mic, MicOff, Volume2, ArrowRight, Globe, RotateCcw, Zap, CheckCircle2, AlertCircle } from "lucide-react";
import { useAIEmployee } from "@/hooks/use-ai-employee";
import { AIActionCard } from "./ai-action-card";
import { StructuredCardsView } from "./structured-cards-view";
import { Button } from "@/components/ui/button";
import { voiceController, SpeechLanguage } from "@/lib/speech";

interface AIChatPanelProps {
  isOpen: boolean;
  onClose: () => void;
  ai: ReturnType<typeof useAIEmployee>;
}

export function AIChatPanel({ isOpen, onClose, ai }: AIChatPanelProps) {
  const [inputText, setInputText] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [voiceLang, setVoiceLang] = useState<SpeechLanguage>("ta-IN");
  const [voiceStatus, setVoiceStatus] = useState<string>("");
  const [audioFeedbackActive, setAudioFeedbackActive] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { messages, isThinking, sendMessage, confirmAction, cancelAction } = ai;

  // Auto scroll to latest message smoothly
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isThinking, isListening, isOpen]);

  if (!isOpen) return null;

  const quickPrompts = [
    { label: "Today's sales", query: "Today's sales?", icon: "💰" },
    { label: "Who owes money?", query: "Who owes me money?", icon: "📋" },
    { label: "Low stock items", query: "What's low in stock?", icon: "📦" },
    { label: "இன்னைக்கு சேல்ஸ்?", query: "இன்னைக்கு சேல்ஸ் எவ்வளோ?", icon: "🇮🇳" },
    { label: "என் கடை விவரம்", query: "என் கடை விவரம் காட்டு", icon: "🏬" },
    { label: "Today's date", query: "What's today's date?", icon: "📅" },
  ];

  const handleSend = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim()) return;
    sendMessage(inputText.trim());
    setInputText("");
  };

  const toggleListening = () => {
    if (isListening) {
      voiceController.stopListening();
      setIsListening(false);
      setVoiceStatus("");
      return;
    }

    setIsListening(true);
    setVoiceStatus(voiceLang === "ta-IN" ? "கேட்கிறது... (Speak Tamil)..." : "Listening (Speak English)...");

    voiceController.startListening(voiceLang, {
      onStart: () => {
        setIsListening(true);
      },
      onInterim: (text) => {
        setInputText(text);
      },
      onResult: (finalText) => {
        setIsListening(false);
        setVoiceStatus("");
        setInputText("");
        sendMessage(finalText, { isVoice: true, lang: voiceLang });
      },
      onError: (err) => {
        console.warn("Voice error:", err);
        setIsListening(false);
        setVoiceStatus("");
      },
      onEnd: () => {
        setIsListening(false);
        setVoiceStatus("");
      },
    });
  };

  const handleListenText = (text: string) => {
    setAudioFeedbackActive(true);
    const isTa = /[\u0B80-\u0BFF]/.test(text);
    voiceController.speak(text, isTa ? "ta-IN" : "en-IN");
    setTimeout(() => setAudioFeedbackActive(false), 3000);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden flex flex-col justify-end sm:justify-end sm:items-end sm:p-6 pointer-events-auto">
      {/* Dimmed backdrop on mobile, subtle blur on desktop */}
      <div
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity duration-300"
        onClick={onClose}
      />

      {/* Modern Floating Container (Mobile Bottom Sheet / Desktop Floating Glass Card) */}
      <div className="relative z-10 w-full sm:w-[460px] h-[92vh] sm:h-[680px] bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-slate-200/80 sm:border-indigo-100/90 animate-in slide-in-from-bottom-6 sm:slide-in-from-bottom-4 duration-300">
        
        {/* Mobile drag handle */}
        <div className="flex justify-center pt-2.5 pb-1 sm:hidden bg-slate-50/80">
          <div className="w-10 h-1 rounded-full bg-slate-300" />
        </div>

        {/* AI Top Header */}
        <div className="px-4 sm:px-5 py-3.5 border-b border-indigo-100/60 bg-gradient-to-r from-indigo-50/90 via-white to-purple-50/60 flex items-center justify-between shrink-0 shadow-2xs">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div
                className={`w-10 h-10 rounded-2xl bg-ai-gradient p-0.5 flex items-center justify-center text-white shadow-md transition-all ${
                  isThinking ? "animate-orb-thinking" : isListening ? "animate-pulse" : "animate-orb-breathe"
                }`}
              >
                <div className="w-full h-full rounded-[14px] bg-slate-900/10 flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-white drop-shadow-xs" />
                </div>
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 border-2 border-white shadow-2xs" />
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-900 tracking-tight">AI Employee</h3>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100/80 text-indigo-700 border border-indigo-200/60">
                  <Zap className="w-2.5 h-2.5 fill-indigo-600 text-indigo-600" />
                  Live Sync
                </span>
              </div>
              <p className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                {isListening ? (
                  <span className="text-indigo-600 font-semibold flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
                    {voiceStatus}
                  </span>
                ) : isThinking ? (
                  <span className="text-indigo-600 font-medium">Checking business data...</span>
                ) : (
                  <span>Tamil • Tanglish • English</span>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Language Switcher Button */}
            <button
              onClick={() => setVoiceLang((prev) => (prev === "ta-IN" ? "en-IN" : "ta-IN"))}
              className="px-2.5 py-1.5 rounded-xl text-xs font-bold bg-white text-indigo-600 hover:bg-indigo-50 border border-indigo-200/80 shadow-2xs transition-all active:scale-95 flex items-center gap-1.5"
              title="Toggle Voice Language (Tamil / English)"
            >
              <Globe className="w-3.5 h-3.5 text-indigo-500" />
              <span>{voiceLang === "ta-IN" ? "தமிழ்" : "English"}</span>
            </button>

            {/* Close Button */}
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100/80 transition-colors"
              aria-label="Close AI Employee"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Chat Stream Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 bg-slate-50/40">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex flex-col ${msg.sender === "user" ? "items-end" : "items-start"}`}
            >
              <div
                className={`max-w-[88%] rounded-2xl px-4 py-3 text-sm leading-relaxed transition-all duration-200 ${
                  msg.sender === "user"
                    ? "bg-gradient-to-r from-indigo-600 to-indigo-700 text-white rounded-br-xs shadow-sm font-medium"
                    : "bg-white text-slate-900 border border-slate-200/80 rounded-bl-xs shadow-xs"
                }`}
              >
                {/* 1. Primary AI Text Message */}
                <p className="font-normal text-[13.5px] leading-relaxed">{msg.text}</p>

                {/* 2. Structured Cards (Visual list, NOT wall of text) */}
                {msg.structuredCards && (
                  <StructuredCardsView
                    title={msg.structuredCards.title}
                    items={msg.structuredCards.items}
                  />
                )}

                {/* 3. Clarification Options (Multi-Match Resolution) */}
                {msg.clarificationOptions && (
                  <div className="mt-2.5 pt-2.5 border-t border-slate-100 space-y-1.5">
                    <span className="text-[11px] font-bold text-slate-500 block">
                      Choose party to view:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {msg.clarificationOptions.map((opt) => (
                        <button
                          key={opt}
                          onClick={() => sendMessage(`Show me ${opt}`)}
                          className="px-3 py-1.5 rounded-xl bg-indigo-50/90 text-indigo-700 text-xs font-bold hover:bg-indigo-100 border border-indigo-200/60 transition-all active:scale-95 shadow-2xs"
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* 4. One Offered Next Step Max */}
                {msg.offeredNextStep && msg.sender === "ai" && (
                  <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs text-indigo-700 bg-indigo-50/50 p-2 rounded-xl">
                    <span className="font-semibold">{msg.offeredNextStep}</span>
                    <button
                      onClick={() => sendMessage(msg.offeredNextStep!)}
                      className="ml-2 font-bold px-2 py-0.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 flex items-center shrink-0 shadow-2xs active:scale-95 transition-all"
                    >
                      <span>Yes</span>
                      <ArrowRight className="w-3 h-3 ml-1" />
                    </button>
                  </div>
                )}

                {/* Audio Readout button */}
                {msg.sender === "ai" && (
                  <div className="mt-2 pt-1 flex items-center justify-between">
                    <button
                      onClick={() => handleListenText(msg.text)}
                      className="text-[11px] font-medium text-slate-400 hover:text-indigo-600 flex items-center gap-1.5 transition-colors"
                      title="Read aloud"
                    >
                      <Volume2 className="w-3.5 h-3.5" />
                      <span>Listen</span>
                    </button>
                    <span className="text-[10px] text-slate-400">{msg.timestamp}</span>
                  </div>
                )}
              </div>

              {/* Action Proposal Preview Card */}
              {msg.actionProposal && (
                <div className="w-full max-w-[95%]">
                  <AIActionCard
                    proposal={msg.actionProposal}
                    onConfirm={confirmAction}
                    onCancel={cancelAction}
                  />
                </div>
              )}
            </div>
          ))}

          {/* Voice Listening Active Waveform */}
          {isListening && (
            <div className="flex items-center gap-3 p-3.5 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-2xl w-fit shadow-md animate-pulse">
              <div className="flex items-center gap-1 h-5">
                <span className="w-1 bg-white rounded-full wave-bar-1" />
                <span className="w-1 bg-white rounded-full wave-bar-2" />
                <span className="w-1 bg-white rounded-full wave-bar-3" />
                <span className="w-1 bg-white rounded-full wave-bar-4" />
                <span className="w-1 bg-white rounded-full wave-bar-5" />
              </div>
              <span className="text-xs font-bold tracking-wide">
                {voiceStatus || "Listening to speech..."}
              </span>
            </div>
          )}

          {/* AI Thinking Shimmer */}
          {isThinking && (
            <div className="flex items-center gap-3 p-3.5 bg-white border border-indigo-100 rounded-2xl w-fit shadow-xs">
              <div className="w-4 h-4 rounded-full bg-ai-gradient animate-spin" />
              <div className="space-y-1">
                <span className="text-xs font-semibold text-slate-700 block">
                  Analyzing business data...
                </span>
                <span className="text-[10px] text-slate-400 block font-mono">
                  Checking PostgreSQL ledger & stock movements
                </span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Quick Suggestion Chips */}
        <div className="px-3 py-2 bg-white/95 border-t border-slate-100 overflow-x-auto flex items-center gap-1.5 no-scrollbar shrink-0">
          {quickPrompts.map((p) => (
            <button
              key={p.label}
              onClick={() => sendMessage(p.query)}
              className="whitespace-nowrap px-3 py-1.5 rounded-full text-xs font-semibold bg-slate-100/90 text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 border border-slate-200/60 active:scale-95 transition-all shrink-0 flex items-center gap-1"
            >
              <span>{p.icon}</span>
              <span>{p.label}</span>
            </button>
          ))}
        </div>

        {/* Bottom Speech / Typing Bar */}
        <form
          onSubmit={handleSend}
          className="p-3 sm:p-4 bg-white border-t border-slate-200/80 safe-bottom flex items-center gap-2 shrink-0"
        >
          <div className="relative flex-1">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder={
                isListening
                  ? "Listening to voice..."
                  : `Ask in ${voiceLang === "ta-IN" ? "தமிழ் (Tamil)" : "English"}...`
              }
              className="w-full h-11 pl-4 pr-11 rounded-2xl bg-slate-100/90 border border-slate-200/80 focus:border-indigo-500 focus:bg-white text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all font-medium"
            />

            {/* Mic Toggle Button */}
            <button
              type="button"
              onClick={toggleListening}
              className={`absolute right-1.5 top-1/2 -translate-y-1/2 p-2 rounded-xl transition-all duration-200 active:scale-90 cursor-pointer ${
                isListening
                  ? "bg-rose-500 text-white shadow-md animate-pulse"
                  : "text-slate-400 hover:text-indigo-600 hover:bg-slate-200/60"
              }`}
              title={isListening ? "Stop listening" : `Start Voice (${voiceLang === "ta-IN" ? "தமிழ்" : "English"})`}
            >
              {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </button>
          </div>

          <Button
            type="submit"
            variant="ai"
            size="md"
            disabled={!inputText.trim()}
            className="shrink-0 px-4 h-11 rounded-2xl shadow-sm active:scale-95 transition-all"
          >
            <Send className="w-4 h-4" />
          </Button>
        </form>
      </div>
    </div>
  );
}
