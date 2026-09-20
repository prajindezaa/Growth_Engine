"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";

interface ActionData {
  action_type: string;
  preview: Record<string, unknown>;
  confirm_message: string;
  high_risk: boolean;
  audit_id?: string;
  business_id: string;
}

interface Message {
  role: "user" | "assistant";
  content: string;
  tools?: string[];
  duration?: number;
  action?: ActionData;
  actionStatus?: "pending" | "confirmed" | "cancelled" | "executed" | "failed";
  actionResult?: string;
  streaming?: boolean;
}

interface AIInsight {
  id: string;
  title: string;
  description: string;
  category: "sales" | "inventory" | "finance";
  impact: "high" | "medium" | "low";
  icon: string;
}

interface AIRecommendation {
  id: string;
  title: string;
  description: string;
  actionText: string;
  prompt: string;
  type: "stock" | "payment" | "quotation";
  icon: string;
}

interface AIActionRecord {
  id: string;
  action_type: string;
  action_preview: Record<string, any>;
  action_result?: Record<string, any>;
  status: "pending" | "confirmed" | "executed" | "failed" | "cancelled";
  created_at: string;
  executed_at?: string;
}

interface AIInteractionRecord {
  id: string;
  question: string;
  response: string;
  matched_intent?: string;
  tools_called?: string[];
  duration_ms?: number;
  created_at: string;
}

type AITab = "ask" | "insights" | "actions" | "recommendations" | "history";

const SUGGESTIONS = [
  { icon: "💰", text: "How much did I sell today?" },
  { icon: "🔴", text: "Who owes me money?" },
  { icon: "📦", text: "Which products are low on stock?" },
  { icon: "📈", text: "Top-selling products this month" },
  { icon: "📝", text: "Create a quotation for..." },
  { icon: "💳", text: "Record a payment from..." },
];

export default function AIChatPanel({ businessId }: { businessId: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<AITab>("ask");

  // Chat State
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [confirmAmount, setConfirmAmount] = useState("");
  const messagesEnd = useRef<HTMLDivElement>(null);

  // Feed Data State
  const [insights, setInsights] = useState<AIInsight[]>([]);
  const [recommendations, setRecommendations] = useState<AIRecommendation[]>([]);
  const [actionsList, setActionsList] = useState<AIActionRecord[]>([]);
  const [historyList, setHistoryList] = useState<AIInteractionRecord[]>([]);
  const [feedLoading, setFeedLoading] = useState(false);

  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    messagesEnd.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Listen for mobile nav AI toggle
  useEffect(() => {
    const handler = () => setIsOpen((v) => !v);
    window.addEventListener("toggle-ai-chat", handler);
    return () => window.removeEventListener("toggle-ai-chat", handler);
  }, []);

  // Fetch insights, recommendations, actions, and history when panel opens
  useEffect(() => {
    if (!isOpen) return;

    async function loadAIFeed() {
      setFeedLoading(true);
      try {
        const res = await fetch(`/api/ai/insights?businessId=${encodeURIComponent(businessId)}`);
        if (res.ok) {
          const data = await res.json();
          setInsights(data.insights || []);
          setRecommendations(data.recommendations || []);
          setActionsList(data.actions || []);
          setHistoryList(data.history || []);
        }
      } catch (err) {
        console.error("Failed loading AI feed:", err);
      } finally {
        setFeedLoading(false);
      }
    }

    loadAIFeed();
  }, [isOpen, businessId]);

  // Streaming text effect
  const streamText = useCallback((fullText: string) => {
    let i = 0;
    const speed = Math.max(8, Math.min(25, 2000 / fullText.length));
    const interval = setInterval(() => {
      i += Math.ceil(fullText.length / 80);
      if (i >= fullText.length) {
        clearInterval(interval);
        setMessages((prev) => {
          if (prev.length === 0) return prev;
          const copy = [...prev];
          const lastIdx = copy.length - 1;
          copy[lastIdx] = { ...copy[lastIdx], content: fullText, streaming: false };
          return copy;
        });
      } else {
        setMessages((prev) => {
          if (prev.length === 0) return prev;
          const copy = [...prev];
          const lastIdx = copy.length - 1;
          copy[lastIdx] = { ...copy[lastIdx], content: fullText.slice(0, i), streaming: true };
          return copy;
        });
      }
    }, speed);
  }, []);

  async function sendMessage(textToSend?: string) {
    const text = textToSend || input.trim();
    if (!text || loading) return;

    setInput("");
    setActiveTab("ask");
    const userMsg: Message = { role: "user", content: text };
    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);

    try {
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: text,
          businessId,
          accessToken: session?.access_token,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: `Sorry, something went wrong: ${data.error || "Unknown error"}` },
        ]);
        return;
      }

      const answerText = data.answer || data.response || "No response received.";
      const msgIndex = messages.length + 1;
      const assistantMsg: Message = {
        role: "assistant",
        content: "",
        tools: (data.toolsCalled || data.tools_called)?.map((t: any) => (typeof t === "string" ? t : t.name)) || [],
        duration: data.duration || data.duration_ms,
        action: data.action || undefined,
        actionStatus: data.action ? "pending" : undefined,
        streaming: true,
      };

      setMessages((prev) => [...prev, assistantMsg]);
      streamText(answerText);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Failed to connect to GrowthEngine AI. Please check your connection." },
      ]);
    } finally {
      setLoading(false);
    }
  }

  async function confirmAction(msgIndex: number) {
    const msg = messages[msgIndex];
    if (!msg?.action) return;

    if (msg.action.high_risk) {
      const expected = String((msg.action.preview as Record<string, unknown>).amount || "");
      if (confirmAmount !== expected) {
        setMessages((prev) => {
          const copy = [...prev];
          copy[msgIndex] = { ...copy[msgIndex], actionResult: `Type "${expected}" to confirm.` };
          return copy;
        });
        return;
      }
    }
    setMessages((prev) => {
      const c = [...prev];
      c[msgIndex] = { ...c[msgIndex], actionStatus: "confirmed" };
      return c;
    });

    try {
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const res = await fetch("/api/ai/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action_type: msg.action.action_type,
          preview: msg.action.preview,
          audit_id: msg.action.audit_id,
          accessToken: session?.access_token,
          businessId,
        }),
      });
      const data = await res.json();
      setMessages((prev) => {
        const c = [...prev];
        c[msgIndex] = {
          ...c[msgIndex],
          actionStatus: data.success ? "executed" : "failed",
          actionResult: data.message || data.error,
        };
        if (data.whatsapp_url) window.open(data.whatsapp_url, "_blank");
        return c;
      });
    } catch {
      setMessages((prev) => {
        const c = [...prev];
        c[msgIndex] = { ...c[msgIndex], actionStatus: "failed", actionResult: "Failed execution" };
        return c;
      });
    }
  }

  function cancelAction(i: number) {
    setMessages((prev) => {
      const c = [...prev];
      c[i] = { ...c[i], actionStatus: "cancelled", actionResult: "Cancelled by user" };
      return c;
    });
  }

  if (!mounted) return null;

  return (
    <>
      {/* Floating AI Orb Trigger */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="ge-ai-orb"
        style={{
          position: "fixed",
          bottom: "24px",
          right: "24px",
          zIndex: 998,
          width: "56px",
          height: "56px",
          borderRadius: "50%",
          background: "var(--ai-accent)",
          border: "none",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "1.5rem",
          boxShadow: "0 4px 20px rgba(124, 58, 237, 0.45)",
          transition: "all 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
          transform: isOpen ? "rotate(90deg) scale(0.92)" : "scale(1)",
        }}
        aria-label="Toggle AI Employee"
      >
        {isOpen ? "✕" : "✨"}
      </button>

      {/* AI Employee Workspace Panel */}
      <div
        className="ge-ai-panel"
        style={{
          position: "fixed",
          bottom: "92px",
          right: "24px",
          zIndex: 999,
          width: "520px",
          maxWidth: "calc(100vw - 32px)",
          height: "680px",
          maxHeight: "calc(100vh - 120px)",
          background: "var(--ge-bg-card)",
          border: "1px solid var(--ge-border)",
          borderRadius: "var(--ge-radius-lg)",
          overflow: "hidden",
          backdropFilter: "blur(24px)",
          boxShadow: "var(--ge-shadow-lg)",
          transform: isOpen ? "translateY(0) scale(1)" : "translateY(16px) scale(0.96)",
          opacity: isOpen ? 1 : 0,
          pointerEvents: isOpen ? "auto" : "none",
          transition: "all 0.3s cubic-bezier(0.16,1,0.3,1)",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Workspace Top Header */}
        <div
          style={{
            padding: "14px 20px",
            borderBottom: "1px solid var(--ge-border)",
            background: "var(--ge-ai-soft)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div
              style={{
                width: "32px",
                height: "32px",
                borderRadius: "50%",
                background: "var(--ge-ai-gradient)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "0.9rem",
              }}
            >
              ✨
            </div>
            <div>
              <h3
                style={{
                  margin: 0,
                  fontSize: "0.875rem",
                  fontWeight: 700,
                  color: "var(--ge-text-primary)",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                GrowthEngine AI
                <span
                  style={{
                    fontSize: "0.6875rem",
                    padding: "2px 6px",
                    borderRadius: "4px",
                    background: "rgba(13, 148, 136, 0.2)",
                    color: "var(--ge-accent)",
                    fontWeight: 600,
                  }}
                >
                  Employee
                </span>
              </h3>
              <p style={{ margin: 0, fontSize: "0.75rem", color: "var(--ge-text-muted)" }}>
                Autonomous business assistant
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="ge-touch-target"
            style={{
              background: "transparent",
              border: "none",
              color: "var(--text-muted)",
              cursor: "pointer",
              fontSize: "1.25rem",
              padding: "8px",
            }}
            aria-label="Close AI Employee"
          >
            ✕
          </button>
        </div>

        {/* 5-Tab Navigation Bar */}
        <div
          style={{
            display: "flex",
            borderBottom: "1px solid var(--ge-border)",
            background: "var(--ge-bg-secondary)",
            padding: "4px 8px",
            gap: "4px",
            overflowX: "auto",
          }}
        >
          {[
            { id: "ask", label: "Ask", icon: "💬" },
            { id: "insights", label: "Insights", icon: "💡" },
            { id: "actions", label: "Actions", icon: "⚡" },
            { id: "recommendations", label: "Recommendations", icon: "🎯" },
            { id: "history", label: "History", icon: "📜" },
          ].map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as AITab)}
                style={{
                  flex: 1,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "6px",
                  padding: "8px 6px",
                  borderRadius: "var(--ge-radius)",
                  border: "none",
                  background: isActive ? "var(--ge-bg-card)" : "transparent",
                  color: isActive ? "var(--ge-accent)" : "var(--ge-text-secondary)",
                  fontSize: "0.75rem",
                  fontWeight: isActive ? 600 : 500,
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                  boxShadow: isActive ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
                  transition: "all 0.15s ease",
                }}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* ── SECTION 1: ASK (CHAT) ── */}
        {activeTab === "ask" && (
          <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
            <div
              style={{
                flex: 1,
                overflowY: "auto",
                padding: "16px",
                display: "flex",
                flexDirection: "column",
                gap: "12px",
              }}
            >
              {messages.length === 0 && (
                <div style={{ padding: "20px 0", textAlign: "center" }}>
                  <div
                    style={{
                      width: "48px",
                      height: "48px",
                      borderRadius: "50%",
                      margin: "0 auto 16px",
                      background: "var(--ge-ai-gradient)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "1.5rem",
                    }}
                  >
                    ✨
                  </div>
                  <p
                    style={{
                      fontSize: "0.875rem",
                      color: "var(--ge-text-secondary)",
                      marginBottom: "16px",
                    }}
                  >
                    Ask me anything about sales, outstanding, inventory, or prepare actions.
                  </p>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", justifyContent: "center" }}>
                    {SUGGESTIONS.map((s) => (
                      <button
                        key={s.text}
                        onClick={() => {
                          if (!s.text.endsWith("...")) sendMessage(s.text);
                          else setInput(s.text);
                        }}
                        style={{
                          padding: "6px 12px",
                          borderRadius: "var(--ge-radius-full)",
                          border: "1px solid var(--ge-border)",
                          background: "var(--ge-bg-card)",
                          color: "var(--ge-text-secondary)",
                          fontSize: "0.75rem",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          gap: "6px",
                        }}
                      >
                        <span>{s.icon}</span> {s.text}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {messages.map((msg, i) => (
                <div
                  key={i}
                  style={{
                    alignSelf: msg.role === "user" ? "flex-end" : "flex-start",
                    maxWidth: "90%",
                  }}
                >
                  <div
                    style={{
                      padding: "10px 14px",
                      borderRadius: "14px",
                      background: msg.role === "user" ? "var(--ge-accent)" : "var(--ge-bg-secondary)",
                      color: msg.role === "user" ? "#ffffff" : "var(--ge-text-primary)",
                      fontSize: "0.875rem",
                      lineHeight: "1.5",
                      border: msg.role === "assistant" ? "1px solid var(--ge-border)" : "none",
                      whiteSpace: "pre-wrap",
                    }}
                  >
                    {msg.content}
                    {msg.streaming && <span className="ge-cursor-blink">|</span>}
                  </div>

                  {msg.tools && msg.tools.length > 0 && (
                    <div style={{ display: "flex", gap: "4px", marginTop: "4px", flexWrap: "wrap" }}>
                      {msg.tools.map((t) => (
                        <span
                          key={t}
                          style={{
                            fontSize: "0.6875rem",
                            padding: "2px 6px",
                            borderRadius: "4px",
                            background: "var(--ge-bg-card)",
                            border: "1px solid var(--ge-border)",
                            color: "var(--ge-text-muted)",
                          }}
                        >
                          🔧 {t}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Confirm-before-execute Action Card */}
                  {msg.action && (
                    <div
                      style={{
                        marginTop: "10px",
                        padding: "14px",
                        borderRadius: "var(--ge-radius)",
                        background: "var(--ge-bg-card)",
                        border: "1px solid var(--ge-border)",
                      }}
                    >
                      <div
                        style={{
                          fontSize: "0.75rem",
                          fontWeight: 600,
                          textTransform: "uppercase",
                          color: "var(--ge-accent)",
                          marginBottom: "4px",
                        }}
                      >
                        Action Proposed
                      </div>
                      <div style={{ fontSize: "0.875rem", color: "var(--ge-text-primary)", marginBottom: "8px" }}>
                        {msg.action.confirm_message}
                      </div>

                      {msg.actionStatus === "pending" && (
                        <div style={{ display: "flex", gap: "8px", marginTop: "8px" }}>
                          <button
                            onClick={() => confirmAction(i)}
                            style={{
                              padding: "6px 14px",
                              borderRadius: "var(--ge-radius)",
                              background: "var(--ge-accent)",
                              color: "#fff",
                              border: "none",
                              fontSize: "0.8125rem",
                              fontWeight: 600,
                              cursor: "pointer",
                            }}
                          >
                            Confirm & Execute
                          </button>
                          <button
                            onClick={() => cancelAction(i)}
                            style={{
                              padding: "6px 14px",
                              borderRadius: "var(--ge-radius)",
                              background: "transparent",
                              color: "var(--ge-text-muted)",
                              border: "1px solid var(--ge-border)",
                              fontSize: "0.8125rem",
                              cursor: "pointer",
                            }}
                          >
                            Cancel
                          </button>
                        </div>
                      )}

                      {msg.actionResult && (
                        <div
                          style={{
                            marginTop: "8px",
                            fontSize: "0.75rem",
                            color: msg.actionStatus === "executed" ? "var(--ge-success)" : "var(--ge-text-muted)",
                          }}
                        >
                          {msg.actionStatus === "executed" ? "✓ " : "• "}
                          {msg.actionResult}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
              <div ref={messagesEnd} />
            </div>

            {/* Quick Prompt Chips (Horizontal Scroll Above Input) */}
            <div
              style={{
                display: "flex",
                gap: "6px",
                padding: "8px 16px",
                overflowX: "auto",
                borderTop: "1px solid var(--ge-border)",
                background: "var(--ge-bg-secondary)",
                whiteSpace: "nowrap",
                WebkitOverflowScrolling: "touch",
              }}
            >
              {SUGGESTIONS.map((s) => (
                <button
                  key={s.text}
                  type="button"
                  onClick={() => {
                    if (!s.text.endsWith("...")) sendMessage(s.text);
                    else setInput(s.text);
                  }}
                  style={{
                    padding: "6px 12px",
                    borderRadius: "var(--ge-radius-full)",
                    border: "1px solid var(--ge-border)",
                    background: "var(--ge-bg-card)",
                    color: "var(--ge-text-secondary)",
                    fontSize: "0.75rem",
                    fontWeight: 500,
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    flexShrink: 0,
                  }}
                >
                  <span>{s.icon}</span>
                  <span>{s.text}</span>
                </button>
              ))}
            </div>

            {/* Input Bar */}
            <div
              style={{
                padding: "12px 16px",
                borderTop: "1px solid var(--ge-border)",
                background: "var(--ge-bg-card)",
                display: "flex",
                gap: "8px",
              }}
            >
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage();
                  }
                }}
                placeholder="Ask GrowthEngine AI or prepare action..."
                style={{
                  flex: 1,
                  padding: "10px 14px",
                  borderRadius: "var(--ge-radius)",
                  background: "var(--ge-bg-secondary)",
                  border: "1px solid var(--ge-border)",
                  color: "var(--ge-text-primary)",
                  fontSize: "0.875rem",
                  outline: "none",
                }}
              />
              <button
                onClick={() => sendMessage()}
                disabled={loading || !input.trim()}
                style={{
                  padding: "10px 18px",
                  borderRadius: "var(--ge-radius)",
                  background: "var(--ge-accent)",
                  color: "#fff",
                  border: "none",
                  fontWeight: 600,
                  fontSize: "0.875rem",
                  cursor: loading || !input.trim() ? "default" : "pointer",
                  opacity: loading || !input.trim() ? 0.6 : 1,
                }}
              >
                Send
              </button>
            </div>
          </div>
        )}

        {/* ── SECTION 2: INSIGHTS ── */}
        {activeTab === "insights" && (
          <div style={{ flex: 1, overflowY: "auto", padding: "16px", display: "flex", flexDirection: "column", gap: "12px" }}>
            <div style={{ fontSize: "0.8125rem", color: "var(--ge-text-muted)", marginBottom: "4px" }}>
              Proactive observations generated across your business records:
            </div>
            {feedLoading ? (
              <div style={{ padding: "40px 0", textAlign: "center", color: "var(--ge-text-muted)" }}>Analyzing metrics...</div>
            ) : insights.length === 0 ? (
              <div style={{ padding: "40px 0", textAlign: "center", color: "var(--ge-text-muted)" }}>No critical observations right now. Business running smoothly!</div>
            ) : (
              insights.map((item) => (
                <div
                  key={item.id}
                  style={{
                    padding: "14px 16px",
                    background: "var(--ge-bg-card)",
                    border: "1px solid var(--ge-border)",
                    borderRadius: "var(--ge-radius)",
                    position: "relative",
                    overflow: "hidden",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
                    <span style={{ fontSize: "1.25rem" }}>{item.icon}</span>
                    <strong style={{ fontSize: "0.875rem", color: "var(--ge-text-primary)" }}>{item.title}</strong>
                  </div>
                  <div style={{ fontSize: "0.75rem", color: "var(--ge-text-muted)", lineHeight: "1.4" }}>
                    {item.description}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* ── SECTION 3: ACTIONS ── */}
        {activeTab === "actions" && (
          <div style={{ flex: 1, overflowY: "auto", padding: "16px", display: "flex", flexDirection: "column", gap: "12px" }}>
            <div style={{ fontSize: "0.8125rem", color: "var(--ge-text-muted)", marginBottom: "4px" }}>
              Audit trail of AI-proposed mutations and confirmations:
            </div>
            {feedLoading ? (
              <div style={{ padding: "40px 0", textAlign: "center", color: "var(--ge-text-muted)" }}>Loading action log...</div>
            ) : actionsList.length === 0 ? (
              <div style={{ padding: "40px 0", textAlign: "center", color: "var(--ge-text-muted)" }}>No AI actions recorded yet. Ask the assistant to create a quotation or record payment!</div>
            ) : (
              actionsList.map((act) => (
                <div
                  key={act.id}
                  style={{
                    padding: "12px 14px",
                    background: "var(--ge-bg-card)",
                    border: "1px solid var(--ge-border)",
                    borderRadius: "var(--ge-radius)",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                    <strong style={{ fontSize: "0.8125rem", color: "var(--ge-text-primary)", textTransform: "capitalize" }}>
                      {act.action_type.replace(/_/g, " ")}
                    </strong>
                    <span
                      style={{
                        fontSize: "0.6875rem",
                        fontWeight: 600,
                        padding: "2px 6px",
                        borderRadius: "4px",
                        background: act.status === "executed" ? "rgba(16,185,129,0.15)" : "rgba(245,158,11,0.15)",
                        color: act.status === "executed" ? "#10b981" : "#f59e0b",
                      }}
                    >
                      {act.status.toUpperCase()}
                    </span>
                  </div>
                  <div style={{ fontSize: "0.75rem", color: "var(--ge-text-muted)" }}>
                    {act.action_preview?.customer?.name ? `Customer: ${act.action_preview.customer.name}` : "System action"}
                  </div>
                  <div style={{ fontSize: "0.6875rem", color: "var(--ge-text-muted)", marginTop: "4px" }}>
                    {new Date(act.created_at).toLocaleString()}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* ── SECTION 4: RECOMMENDATIONS ── */}
        {activeTab === "recommendations" && (
          <div style={{ flex: 1, overflowY: "auto", padding: "16px", display: "flex", flexDirection: "column", gap: "12px" }}>
            <div style={{ fontSize: "0.8125rem", color: "var(--ge-text-muted)", marginBottom: "4px" }}>
              Actionable suggestions to drive business growth and operational efficiency:
            </div>
            {feedLoading ? (
              <div style={{ padding: "40px 0", textAlign: "center", color: "var(--ge-text-muted)" }}>Analyzing recommendations...</div>
            ) : recommendations.length === 0 ? (
              <div style={{ padding: "40px 0", textAlign: "center", color: "var(--ge-text-muted)" }}>No recommendations at this time.</div>
            ) : (
              recommendations.map((rec) => (
                <div
                  key={rec.id}
                  style={{
                    padding: "14px 16px",
                    background: "var(--ge-bg-card)",
                    border: "1px solid var(--ge-border)",
                    borderRadius: "var(--ge-radius)",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                    <span style={{ fontSize: "1.25rem" }}>{rec.icon}</span>
                    <strong style={{ fontSize: "0.875rem", color: "var(--ge-text-primary)" }}>{rec.title}</strong>
                  </div>
                  <p style={{ fontSize: "0.75rem", color: "var(--ge-text-muted)", margin: "4px 0 12px", lineHeight: "1.4" }}>
                    {rec.description}
                  </p>
                  <button
                    onClick={() => sendMessage(rec.prompt)}
                    style={{
                      padding: "6px 12px",
                      borderRadius: "var(--ge-radius)",
                      background: "var(--ge-accent)",
                      color: "#fff",
                      border: "none",
                      fontSize: "0.75rem",
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    ⚡ {rec.actionText}
                  </button>
                </div>
              ))
            )}
          </div>
        )}

        {/* ── SECTION 5: HISTORY ── */}
        {activeTab === "history" && (
          <div style={{ flex: 1, overflowY: "auto", padding: "16px", display: "flex", flexDirection: "column", gap: "12px" }}>
            <div style={{ fontSize: "0.8125rem", color: "var(--ge-text-muted)", marginBottom: "4px" }}>
              Log of questions asked to GrowthEngine AI:
            </div>
            {feedLoading ? (
              <div style={{ padding: "40px 0", textAlign: "center", color: "var(--ge-text-muted)" }}>Loading history...</div>
            ) : historyList.length === 0 ? (
              <div style={{ padding: "40px 0", textAlign: "center", color: "var(--ge-text-muted)" }}>No past conversations found.</div>
            ) : (
              historyList.map((h) => (
                <div
                  key={h.id}
                  style={{
                    padding: "12px 14px",
                    background: "var(--ge-bg-card)",
                    border: "1px solid var(--ge-border)",
                    borderRadius: "var(--ge-radius)",
                  }}
                >
                  <div style={{ fontSize: "0.8125rem", fontWeight: 600, color: "var(--ge-text-primary)", marginBottom: "4px" }}>
                    Q: {h.question}
                  </div>
                  <div
                    style={{
                      fontSize: "0.75rem",
                      color: "var(--ge-text-muted)",
                      maxHeight: "60px",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    A: {h.response}
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.6875rem", color: "var(--ge-text-muted)", marginTop: "6px" }}>
                    <span>{new Date(h.created_at).toLocaleString()}</span>
                    {h.duration_ms && <span>{h.duration_ms}ms</span>}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </>
  );
}
