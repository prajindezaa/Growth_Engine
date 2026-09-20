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
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [confirmAmount, setConfirmAmount] = useState("");
  const messagesEnd = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEnd.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Listen for mobile nav AI toggle
  useEffect(() => {
    const handler = () => setIsOpen((v) => !v);
    window.addEventListener("toggle-ai-chat", handler);
    return () => window.removeEventListener("toggle-ai-chat", handler);
  }, []);

  // Streaming text effect
  const streamText = useCallback((fullText: string, msgIndex: number) => {
    let i = 0;
    const speed = Math.max(8, Math.min(25, 2000 / fullText.length));
    const interval = setInterval(() => {
      i += Math.ceil(fullText.length / 80);
      if (i >= fullText.length) {
        clearInterval(interval);
        setMessages((prev) => {
          const copy = [...prev];
          copy[msgIndex] = { ...copy[msgIndex], content: fullText, streaming: false };
          return copy;
        });
      } else {
        setMessages((prev) => {
          const copy = [...prev];
          copy[msgIndex] = { ...copy[msgIndex], content: fullText.slice(0, i), streaming: true };
          return copy;
        });
      }
    }, speed);
  }, []);

  async function sendMessage(text?: string) {
    const question = (text || input).trim();
    if (!question || loading) return;
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: question }]);
    setLoading(true);

    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question, businessId, accessToken: session?.access_token }),
      });
      const data = await res.json();

      if (data.error) {
        setMessages((prev) => [...prev, { role: "assistant", content: `⚠️ ${data.error}` }]);
      } else {
        const newIdx = messages.length + 1; // +1 for user msg
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant", content: "", streaming: true,
            tools: data.tools_called, duration: data.duration_ms,
            action: data.action || undefined,
            actionStatus: data.action ? "pending" : undefined,
          },
        ]);
        streamText(data.response, newIdx);
      }
    } catch {
      setMessages((prev) => [...prev, { role: "assistant", content: "⚠️ Something went wrong." }]);
    }
    setLoading(false);
  }

  async function executeAction(msgIndex: number) {
    const msg = messages[msgIndex];
    if (!msg?.action) return;
    if (msg.action.high_risk) {
      const expected = String(msg.action.preview.amount);
      if (confirmAmount !== expected) {
        setMessages((prev) => {
          const copy = [...prev];
          copy[msgIndex] = { ...copy[msgIndex], actionResult: `Type "${expected}" to confirm.` };
          return copy;
        });
        return;
      }
    }
    setMessages((prev) => { const c = [...prev]; c[msgIndex] = { ...c[msgIndex], actionStatus: "confirmed" }; return c; });

    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch("/api/ai/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action_type: msg.action.action_type, preview: msg.action.preview,
          audit_id: msg.action.audit_id, accessToken: session?.access_token, businessId,
        }),
      });
      const data = await res.json();
      setMessages((prev) => {
        const c = [...prev];
        c[msgIndex] = { ...c[msgIndex], actionStatus: data.success ? "executed" : "failed", actionResult: data.message || data.error };
        if (data.whatsapp_url) window.open(data.whatsapp_url, "_blank");
        return c;
      });
    } catch {
      setMessages((prev) => { const c = [...prev]; c[msgIndex] = { ...c[msgIndex], actionStatus: "failed", actionResult: "Failed" }; return c; });
    }
  }

  function cancelAction(i: number) {
    setMessages((prev) => { const c = [...prev]; c[i] = { ...c[i], actionStatus: "cancelled", actionResult: "Cancelled" }; return c; });
  }

  return (
    <>
      {/* AI Orb Button */}
      <button onClick={() => setIsOpen(!isOpen)} className={`ge-ai-orb-wrap ${isOpen ? "" : "ge-ai-orb"}`} style={{
        position: "fixed", bottom: "24px", right: "24px", zIndex: 1000,
        width: "56px", height: "56px", borderRadius: "50%",
        background: isOpen ? "var(--ge-bg-elevated)" : undefined,
        border: isOpen ? "1px solid var(--ge-border)" : "none",
        cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: "1.25rem", transition: "all 0.3s ease",
        transform: isOpen ? "scale(0.9)" : "none",
      }} title="Ask GrowthEngine AI">
        {isOpen ? "✕" : "✨"}
      </button>

      {/* Chat Panel */}
      <div className="ge-ai-panel" style={{
        position: "fixed", bottom: "92px", right: "24px", zIndex: 999,
        width: "440px", maxHeight: "640px",
        background: "var(--ge-bg-card)", border: "1px solid var(--ge-border)",
        borderRadius: "var(--ge-radius-lg)", overflow: "hidden",
        backdropFilter: "blur(24px)", boxShadow: "var(--ge-shadow-lg)",
        transform: isOpen ? "translateY(0) scale(1)" : "translateY(16px) scale(0.96)",
        opacity: isOpen ? 1 : 0, pointerEvents: isOpen ? "auto" : "none",
        transition: "all 0.3s cubic-bezier(0.16,1,0.3,1)",
        display: "flex", flexDirection: "column",
      }}>
        {/* Header */}
        <div style={{
          padding: "14px 20px", borderBottom: "1px solid var(--ge-border)",
          background: "var(--ge-ai-soft)", display: "flex", alignItems: "center", gap: "10px",
        }}>
          <div style={{
            width: "28px", height: "28px", borderRadius: "50%",
            background: "var(--ge-ai-gradient)", display: "flex",
            alignItems: "center", justifyContent: "center", fontSize: "0.8rem",
          }}>✨</div>
          <div>
            <h3 style={{ margin: 0, fontSize: "var(--ge-text-sm)", fontWeight: 700, color: "var(--ge-text-primary)" }}>GrowthEngine AI</h3>
            <p style={{ margin: 0, fontSize: "var(--ge-text-xs)", color: "var(--ge-text-muted)" }}>Your business assistant</p>
          </div>
        </div>

        {/* Messages */}
        <div style={{
          flex: 1, overflowY: "auto", padding: "16px", minHeight: "320px",
          display: "flex", flexDirection: "column", gap: "12px",
        }}>
          {messages.length === 0 && (
            <div style={{ padding: "20px 0" }} className="ge-animate-in">
              <div style={{
                width: "48px", height: "48px", borderRadius: "50%", margin: "0 auto 16px",
                background: "var(--ge-ai-gradient)", display: "flex", alignItems: "center",
                justifyContent: "center", fontSize: "1.5rem",
              }}>✨</div>
              <p style={{ textAlign: "center", fontSize: "var(--ge-text-sm)", color: "var(--ge-text-secondary)", marginBottom: "20px" }}>
                Ask me anything about your business
              </p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", justifyContent: "center" }}>
                {SUGGESTIONS.map((s) => (
                  <button key={s.text} onClick={() => { if (!s.text.endsWith("...")) sendMessage(s.text); else setInput(s.text); }} style={{
                    padding: "6px 12px", borderRadius: "var(--ge-radius-full)",
                    border: "1px solid var(--ge-border)", background: "transparent",
                    color: "var(--ge-text-secondary)", fontSize: "var(--ge-text-xs)", cursor: "pointer",
                    transition: "all var(--ge-transition)", display: "flex", alignItems: "center", gap: "4px",
                  }}><span>{s.icon}</span> {s.text}</button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg, i) => (
            <div key={i} style={{ alignSelf: msg.role === "user" ? "flex-end" : "flex-start", maxWidth: "92%" }} className="ge-animate-in">
              {msg.role === "assistant" && (
                <div style={{ display: "flex", alignItems: "flex-start", gap: "8px" }}>
                  {/* AI avatar */}
                  <div style={{
                    width: "24px", height: "24px", borderRadius: "50%", flexShrink: 0,
                    background: "var(--ge-ai-gradient)", display: "flex", alignItems: "center",
                    justifyContent: "center", fontSize: "0.65rem", marginTop: "4px",
                  }}>✨</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="ge-ai-bubble" style={{ padding: "10px 14px", fontSize: "var(--ge-text-sm)", lineHeight: 1.6, color: "var(--ge-text-primary)" }}>
                      {msg.content}
                      {msg.streaming && <span className="ge-typing-cursor" />}
                    </div>

                    {/* Tool badges */}
                    {msg.tools && msg.tools.length > 0 && !msg.streaming && (
                      <div style={{ display: "flex", gap: "4px", marginTop: "4px", flexWrap: "wrap", alignItems: "center" }}>
                        {msg.tools.map((t, j) => (
                          <span key={j} style={{
                            fontSize: "10px", padding: "1px 6px", borderRadius: "var(--ge-radius-full)",
                            background: "var(--ge-ai-soft)", color: "#8B5CF6", fontFamily: "monospace",
                          }}>{t.replace("get_", "").replace("prepare_", "→ ")}</span>
                        ))}
                        {msg.duration && <span style={{ fontSize: "10px", color: "var(--ge-text-muted)", fontFamily: "monospace" }}>{(msg.duration / 1000).toFixed(1)}s</span>}
                      </div>
                    )}

                    {/* Action card */}
                    {msg.action && msg.actionStatus === "pending" && !msg.streaming && (
                      <div className="ge-ai-action-card" style={{ marginTop: "8px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "8px" }}>
                          <span style={{ fontSize: "10px", padding: "1px 8px", borderRadius: "var(--ge-radius-full)", background: "var(--ge-ai-gradient)", color: "#fff", fontWeight: 600 }}>AI-suggested action</span>
                          {msg.action.high_risk && <span style={{ fontSize: "10px", padding: "1px 8px", borderRadius: "var(--ge-radius-full)", background: "var(--ge-error-bg)", color: "var(--ge-error)", fontWeight: 600 }}>High Risk</span>}
                        </div>
                        <p style={{ fontSize: "var(--ge-text-sm)", color: "var(--ge-text-primary)", margin: "0 0 10px", fontWeight: 500 }}>{msg.action.confirm_message}</p>
                        <ActionPreview action={msg.action} />
                        {msg.action.high_risk && (
                          <div style={{ marginBottom: "8px" }}>
                            <label style={{ fontSize: "var(--ge-text-xs)", color: "var(--ge-text-muted)", display: "block", marginBottom: "4px" }}>
                              Type the amount to confirm: ₹{String(msg.action.preview.amount)}
                            </label>
                            <input type="text" value={confirmAmount} onChange={(e) => setConfirmAmount(e.target.value)}
                              placeholder={String(msg.action.preview.amount)} className="ge-input"
                              style={{ margin: 0, padding: "6px 10px", fontSize: "var(--ge-text-sm)", fontFamily: "monospace" }} />
                          </div>
                        )}
                        {msg.actionResult && <p style={{ fontSize: "var(--ge-text-xs)", color: "var(--ge-error)", margin: "0 0 8px" }}>{msg.actionResult}</p>}
                        <div style={{ display: "flex", gap: "8px" }}>
                          <button onClick={() => executeAction(i)} className="ge-btn-primary" style={{ width: "auto", padding: "7px 16px", fontSize: "var(--ge-text-xs)", margin: 0 }}><span>✓ Confirm</span></button>
                          <button onClick={() => cancelAction(i)} className="ge-btn-secondary" style={{ width: "auto", padding: "7px 16px", fontSize: "var(--ge-text-xs)", margin: 0 }}>Cancel</button>
                        </div>
                      </div>
                    )}

                    {/* Status badges */}
                    {msg.action && msg.actionStatus === "executed" && (
                      <div style={{ marginTop: "6px", padding: "8px 12px", borderRadius: "var(--ge-radius)", background: "var(--ge-success-bg)", border: "1px solid rgba(22,163,74,0.2)" }}>
                        <p style={{ fontSize: "var(--ge-text-xs)", color: "var(--ge-success)", margin: 0 }}>✓ {msg.actionResult}</p>
                      </div>
                    )}
                    {msg.action && msg.actionStatus === "cancelled" && (
                      <div style={{ marginTop: "6px", padding: "8px 12px", borderRadius: "var(--ge-radius)", background: "rgba(100,116,139,0.08)", border: "1px solid var(--ge-border)" }}>
                        <p style={{ fontSize: "var(--ge-text-xs)", color: "var(--ge-text-muted)", margin: 0 }}>✕ {msg.actionResult}</p>
                      </div>
                    )}
                    {msg.action && msg.actionStatus === "failed" && (
                      <div style={{ marginTop: "6px", padding: "8px 12px", borderRadius: "var(--ge-radius)", background: "var(--ge-error-bg)", border: "1px solid rgba(239,68,68,0.2)" }}>
                        <p style={{ fontSize: "var(--ge-text-xs)", color: "var(--ge-error)", margin: 0 }}>⚠️ {msg.actionResult}</p>
                      </div>
                    )}
                    {msg.action && msg.actionStatus === "confirmed" && (
                      <div style={{ marginTop: "6px", padding: "8px 12px", borderRadius: "var(--ge-radius)", background: "var(--ge-ai-soft)" }}>
                        <p style={{ fontSize: "var(--ge-text-xs)", color: "#8B5CF6", margin: 0, display: "flex", alignItems: "center", gap: "6px" }}>
                          Executing… <span className="ge-spinner" style={{ width: "12px", height: "12px", borderWidth: "2px" }} />
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {msg.role === "user" && (
                <div style={{
                  padding: "10px 14px", borderRadius: "var(--ge-radius-lg)",
                  background: "var(--ge-accent)", color: "#fff",
                  fontSize: "var(--ge-text-sm)", lineHeight: 1.5,
                }}>{msg.content}</div>
              )}
            </div>
          ))}

          {loading && (
            <div style={{ display: "flex", alignItems: "flex-start", gap: "8px" }} className="ge-animate-in">
              <div style={{ width: "24px", height: "24px", borderRadius: "50%", flexShrink: 0, background: "var(--ge-ai-gradient)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.65rem" }}>✨</div>
              <div className="ge-ai-bubble" style={{ padding: "12px 16px" }}>
                <div style={{ display: "flex", gap: "4px" }}>
                  <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#8B5CF6", animation: "ge-blink 1s ease-in-out infinite" }} />
                  <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#8B5CF6", animation: "ge-blink 1s ease-in-out infinite 0.2s" }} />
                  <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#8B5CF6", animation: "ge-blink 1s ease-in-out infinite 0.4s" }} />
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEnd} />
        </div>

        {/* Input */}
        <div style={{ padding: "12px 16px", borderTop: "1px solid var(--ge-border)", display: "flex", gap: "8px" }}>
          <input type="text" value={input} onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendMessage()}
            placeholder="Ask about your business…" className="ge-input"
            style={{ flex: 1, margin: 0, fontSize: "var(--ge-text-sm)", padding: "10px 14px" }}
            disabled={loading} />
          <button onClick={() => sendMessage()} disabled={loading || !input.trim()} style={{
            padding: "10px 14px", borderRadius: "var(--ge-radius)", border: "none", cursor: "pointer",
            background: "var(--ge-ai-gradient)", color: "#fff", fontSize: "var(--ge-text-sm)",
            fontWeight: 600, transition: "all var(--ge-transition)",
            opacity: loading || !input.trim() ? 0.5 : 1,
          }}>→</button>
        </div>
      </div>
    </>
  );
}

function ActionPreview({ action }: { action: ActionData }) {
  const p = action.preview;
  switch (action.action_type) {
    case "create_quotation": {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const items = p.items as any[];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const cust = p.customer as any;
      return (
        <div style={{ marginBottom: "10px", fontSize: "var(--ge-text-xs)" }}>
          <div style={{ color: "var(--ge-text-muted)", marginBottom: "4px" }}>Customer: <strong style={{ color: "var(--ge-text-primary)" }}>{cust?.name}</strong></div>
          {items?.map((item, i) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "2px 0", color: "var(--ge-text-secondary)" }}>
              <span>{item.product_name} × {item.quantity}</span>
              <span style={{ fontVariantNumeric: "tabular-nums" }}>₹{item.line_total?.toFixed(2)}</span>
            </div>
          ))}
          <div style={{ borderTop: "1px solid var(--ge-ai-border)", marginTop: "6px", paddingTop: "4px", display: "flex", justifyContent: "space-between", fontWeight: 600, color: "#8B5CF6" }}>
            <span>Total</span><span style={{ fontVariantNumeric: "tabular-nums" }}>₹{(p.grand_total as number)?.toFixed(2)}</span>
          </div>
        </div>
      );
    }
    case "record_payment": {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const cust = p.customer as any;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const inv = p.invoice as any;
      return (
        <div style={{ marginBottom: "10px", fontSize: "var(--ge-text-xs)" }}>
          <div style={{ color: "var(--ge-text-muted)", marginBottom: "2px" }}>Customer: <strong style={{ color: "var(--ge-text-primary)" }}>{cust?.name}</strong></div>
          <div style={{ color: "var(--ge-text-muted)", marginBottom: "2px" }}>Invoice: <strong style={{ color: "var(--ge-text-primary)" }}>{inv?.invoice_number}</strong></div>
          <div style={{ color: "var(--ge-text-muted)", marginBottom: "2px" }}>Amount: <strong style={{ color: "#8B5CF6", fontVariantNumeric: "tabular-nums" }}>₹{(p.amount as number)?.toLocaleString("en-IN")}</strong> ({p.method as string})</div>
          <div style={{ color: "var(--ge-text-muted)" }}>Balance after: <strong style={{ fontVariantNumeric: "tabular-nums" }}>₹{(p.balance_after as number)?.toFixed(2)}</strong></div>
        </div>
      );
    }
    case "send_invoice": {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const cust = p.customer as any;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const inv = p.invoice as any;
      return (
        <div style={{ marginBottom: "10px", fontSize: "var(--ge-text-xs)" }}>
          <div style={{ color: "var(--ge-text-muted)", marginBottom: "2px" }}>To: <strong style={{ color: "var(--ge-text-primary)" }}>{cust?.name}</strong> ({cust?.phone || "no phone"})</div>
          <div style={{ color: "var(--ge-text-muted)" }}>Invoice: <strong style={{ color: "var(--ge-text-primary)" }}>{inv?.invoice_number}</strong> — ₹{inv?.grand_total?.toLocaleString("en-IN")}</div>
        </div>
      );
    }
    default: return null;
  }
}
