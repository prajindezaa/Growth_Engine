"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/components/Toast";

interface ApprovalRequest {
  id: string;
  request_type: string;
  title: string;
  description: string;
  requester_name: string;
  payload: Record<string, any>;
  risk_level: "low" | "medium" | "high";
  status: "pending" | "approved" | "rejected";
  decision_note?: string;
  decided_at?: string;
  created_at: string;
}

interface AutomationRule {
  id: string;
  name: string;
  description: string;
  trigger_type: string;
  condition_config: Record<string, any>;
  action_type: string;
  is_active: boolean;
  created_at: string;
}

interface AutomationLog {
  id: string;
  rule_name: string;
  trigger_event: string;
  action_taken: string;
  status: "success" | "failed" | "pending_approval";
  error_message?: string;
  created_at: string;
}

const DEFAULT_RULES: Omit<AutomationRule, "id" | "created_at">[] = [
  {
    name: "Overdue Invoice Alert",
    description: "Notify business owner whenever an invoice is overdue by more than 3 days.",
    trigger_type: "invoice_overdue",
    condition_config: { days_past_due: 3 },
    action_type: "notify_owner",
    is_active: true,
  },
  {
    name: "Low Stock Inventory Warning",
    description: "Automatically dispatch an alert when product inventory dips to or below safety minimum.",
    trigger_type: "low_stock",
    condition_config: { threshold: "min_stock" },
    action_type: "notify_manager",
    is_active: true,
  },
  {
    name: "High Discount Approval Gate",
    description: "Require owner or manager authorization for any quotation or order with discount over 15%.",
    trigger_type: "high_discount",
    condition_config: { discount_percent_gte: 15 },
    action_type: "require_approval",
    is_active: true,
  },
  {
    name: "Large Order Notification",
    description: "Notify management whenever an order exceeds ₹50,000 for VIP fulfillment attention.",
    trigger_type: "large_order",
    condition_config: { amount_gte: 50000 },
    action_type: "notify_owner",
    is_active: true,
  },
];

const DEFAULT_APPROVALS: Omit<ApprovalRequest, "id" | "created_at">[] = [
  {
    request_type: "high_discount",
    title: "18% Discount Request on Order #SO-0042",
    description: "Sales representative requested exceptional discount for bulk order.",
    requester_name: "Rahul Verma (Sales)",
    payload: { customer: "Sunrise Enterprises", items: 40, subtotal: 82000, discount_requested: 14760 },
    risk_level: "high",
    status: "pending",
  },
  {
    request_type: "stock_adjustment",
    title: "Damaged Stock Write-off (12 Units)",
    description: "Warehouse stock adjustment for water-damaged packaging.",
    requester_name: "Amit Patel (Inventory)",
    payload: { product: "Industrial Primer 5L", quantity: 12, cost_impact: 4800 },
    risk_level: "medium",
    status: "pending",
  },
];

export default function ApprovalsAndAutomationPage() {
  const params = useParams();
  const businessId = params.businessId as string;
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState<"approvals" | "rules" | "logs">("approvals");
  const [approvals, setApprovals] = useState<ApprovalRequest[]>([]);
  const [rules, setRules] = useState<AutomationRule[]>([]);
  const [logs, setLogs] = useState<AutomationLog[]>([]);
  const [loading, setLoading] = useState(true);

  // Decision Modal State
  const [selectedRequest, setSelectedRequest] = useState<ApprovalRequest | null>(null);
  const [decisionNote, setDecisionNote] = useState("");
  const [deciding, setDeciding] = useState(false);

  // Rule Creation Modal State
  const [showRuleModal, setShowRuleModal] = useState(false);
  const [newRuleName, setNewRuleName] = useState("");
  const [newRuleTrigger, setNewRuleTrigger] = useState("invoice_overdue");
  const [newRuleAction, setNewRuleAction] = useState("notify_owner");
  const [newRuleDesc, setNewRuleDesc] = useState("");

  useEffect(() => {
    loadData();
  }, [businessId]);

  async function loadData() {
    setLoading(true);
    const supabase = createClient();

    try {
      const [appRes, ruleRes, logRes] = await Promise.all([
        supabase
          .from("approval_requests")
          .select("*")
          .eq("business_id", businessId)
          .order("created_at", { ascending: false }),
        supabase
          .from("automation_rules")
          .select("*")
          .eq("business_id", businessId)
          .order("created_at", { ascending: false }),
        supabase
          .from("automation_logs")
          .select("*")
          .eq("business_id", businessId)
          .order("created_at", { ascending: false })
          .limit(30),
      ]);

      // Seed initial rules if empty
      if (!ruleRes.data || ruleRes.data.length === 0) {
        const seededRules = DEFAULT_RULES.map((r, idx) => ({
          ...r,
          id: `seed-rule-${idx}`,
          created_at: new Date().toISOString(),
        }));
        setRules(seededRules as AutomationRule[]);
      } else {
        setRules(ruleRes.data as AutomationRule[]);
      }

      // Seed initial sample approvals if empty
      if (!appRes.data || appRes.data.length === 0) {
        const seededApps = DEFAULT_APPROVALS.map((a, idx) => ({
          ...a,
          id: `seed-app-${idx}`,
          created_at: new Date(Date.now() - idx * 3600000).toISOString(),
        }));
        setApprovals(seededApps as ApprovalRequest[]);
      } else {
        setApprovals(appRes.data as ApprovalRequest[]);
      }

      if (logRes.data) setLogs(logRes.data as AutomationLog[]);
    } catch (err) {
      console.error("Failed loading approvals data:", err);
    } finally {
      setLoading(false);
    }
  }

  // Handle Decision (Approve / Reject)
  const handleDecision = async (decision: "approved" | "rejected") => {
    if (!selectedRequest) return;
    setDeciding(true);

    try {
      const supabase = createClient();

      if (!selectedRequest.id.startsWith("seed-")) {
        await (supabase.rpc as any)("decide_approval_request", {
          p_request_id: selectedRequest.id,
          p_decision: decision,
          p_note: decisionNote || (decision === "approved" ? "Approved by Management" : "Rejected"),
        });
      }

      // Local optimistic update
      setApprovals((prev) =>
        prev.map((r) =>
          r.id === selectedRequest.id
            ? {
                ...r,
                status: decision,
                decided_at: new Date().toISOString(),
                decision_note: decisionNote,
              }
            : r
        )
      );

      setSelectedRequest(null);
      setDecisionNote("");
      toast("success", `Request marked as ${decision}`);
    } catch (err: any) {
      console.error("Decision error:", err);
      toast("error", `Decision failed: ${err.message || "Unknown error"}`);
    } finally {
      setDeciding(false);
    }
  };

  // Toggle rule active status
  const handleToggleRule = async (ruleId: string, current: boolean) => {
    const supabase = createClient();
    setRules((prev) => prev.map((r) => (r.id === ruleId ? { ...r, is_active: !current } : r)));

    if (!ruleId.startsWith("seed-")) {
      await supabase.from("automation_rules").update({ is_active: !current }).eq("id", ruleId);
    }
  };

  // Create new rule
  const handleCreateRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRuleName.trim()) return;

    const newRule: AutomationRule = {
      id: `rule-${Date.now()}`,
      name: newRuleName,
      description: newRuleDesc || "Custom automated workflow",
      trigger_type: newRuleTrigger,
      condition_config: {},
      action_type: newRuleAction,
      is_active: true,
      created_at: new Date().toISOString(),
    };

    setRules((prev) => [newRule, ...prev]);
    setShowRuleModal(false);
    setNewRuleName("");
    setNewRuleDesc("");

    try {
      const supabase = createClient();
      await supabase.from("automation_rules").insert({
        business_id: businessId,
        name: newRule.name,
        description: newRule.description,
        trigger_type: newRule.trigger_type,
        action_type: newRule.action_type,
        is_active: true,
      });
    } catch (err) {
      console.warn("Could not persist to Supabase:", err);
    }
  };

  const pendingCount = approvals.filter((a) => a.status === "pending").length;

  return (
    <div style={{ padding: "24px 32px", maxWidth: "1200px", margin: "0 auto" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px", flexWrap: "wrap", gap: "16px" }}>
        <div>
          <h1 style={{ fontSize: "1.75rem", fontWeight: 700, color: "var(--ge-text-primary)", letterSpacing: "-0.02em" }}>
            ⚡ Automation & Approval Center
          </h1>
          <p style={{ fontSize: "0.875rem", color: "var(--ge-text-muted)", marginTop: "4px" }}>
            Configure automatic triggers, manage operational policies, and review management sign-offs.
          </p>
        </div>

        {activeTab === "rules" && (
          <button
            onClick={() => setShowRuleModal(true)}
            style={{
              padding: "9px 18px",
              borderRadius: "var(--ge-radius)",
              background: "var(--ge-accent)",
              color: "#fff",
              border: "none",
              fontWeight: 600,
              fontSize: "0.875rem",
              cursor: "pointer",
            }}
          >
            + Create New Rule
          </button>
        )}
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: "8px", borderBottom: "1px solid var(--ge-border)", paddingBottom: "12px", marginBottom: "24px" }}>
        {[
          { id: "approvals", label: `Pending Approvals (${pendingCount})`, icon: "🛡️" },
          { id: "rules", label: "Automation Rules", icon: "⚙️" },
          { id: "logs", label: "Execution Logs", icon: "📜" },
        ].map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              style={{
                padding: "8px 16px",
                borderRadius: "var(--ge-radius)",
                fontSize: "0.875rem",
                fontWeight: isActive ? 600 : 500,
                color: isActive ? "var(--ge-accent)" : "var(--ge-text-secondary)",
                background: isActive ? "var(--ge-accent-soft)" : "transparent",
                border: "none",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: "60px 0", color: "var(--ge-text-muted)" }}>Loading policies...</div>
      ) : (
        <>
          {/* TAB 1: APPROVALS QUEUE */}
          {activeTab === "approvals" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              {approvals.length === 0 ? (
                <div style={{ padding: "48px 16px", textAlign: "center", background: "var(--ge-bg-card)", border: "1px solid var(--ge-border)", borderRadius: "var(--ge-radius-lg)" }}>
                  <div style={{ fontSize: "2rem", marginBottom: "8px" }}>✅</div>
                  <div style={{ fontWeight: 600, color: "var(--ge-text-primary)" }}>All Caught Up!</div>
                  <div style={{ fontSize: "0.75rem", color: "var(--ge-text-muted)", marginTop: "4px" }}>No items currently require owner or manager approval.</div>
                </div>
              ) : (
                approvals.map((req) => {
                  const isPending = req.status === "pending";
                  const riskColor = req.risk_level === "high" ? "#ef4444" : req.risk_level === "medium" ? "#f59e0b" : "#10b981";

                  return (
                    <div
                      key={req.id}
                      style={{
                        background: "var(--ge-bg-card)",
                        border: "1px solid var(--ge-border)",
                        borderRadius: "var(--ge-radius-lg)",
                        padding: "18px 20px",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        flexWrap: "wrap",
                        gap: "16px",
                      }}
                    >
                      <div style={{ flex: 1, minWidth: "260px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "6px" }}>
                          <strong style={{ fontSize: "0.9375rem", color: "var(--ge-text-primary)" }}>{req.title}</strong>
                          <span
                            style={{
                              fontSize: "0.6875rem",
                              fontWeight: 700,
                              textTransform: "uppercase",
                              padding: "2px 8px",
                              borderRadius: "12px",
                              background: `${riskColor}18`,
                              color: riskColor,
                            }}
                          >
                            {req.risk_level} Risk
                          </span>
                        </div>
                        <div style={{ fontSize: "0.8125rem", color: "var(--ge-text-secondary)", marginBottom: "8px" }}>
                          {req.description}
                        </div>
                        <div style={{ fontSize: "0.75rem", color: "var(--ge-text-muted)", display: "flex", gap: "16px" }}>
                          <span>Requester: <strong>{req.requester_name}</strong></span>
                          <span>Created: {new Date(req.created_at).toLocaleDateString()}</span>
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div>
                        {isPending ? (
                          <div style={{ display: "flex", gap: "8px" }}>
                            <button
                              onClick={() => setSelectedRequest(req)}
                              style={{
                                padding: "8px 18px",
                                borderRadius: "var(--ge-radius)",
                                background: "var(--ge-accent)",
                                color: "#fff",
                                border: "none",
                                fontSize: "0.8125rem",
                                fontWeight: 600,
                                cursor: "pointer",
                              }}
                            >
                              Review & Sign-off
                            </button>
                          </div>
                        ) : (
                          <span
                            style={{
                              padding: "4px 12px",
                              borderRadius: "12px",
                              fontSize: "0.75rem",
                              fontWeight: 700,
                              textTransform: "uppercase",
                              background: req.status === "approved" ? "rgba(16,185,129,0.15)" : "rgba(239,68,68,0.15)",
                              color: req.status === "approved" ? "#10b981" : "#ef4444",
                            }}
                          >
                            {req.status}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* TAB 2: AUTOMATION RULES */}
          {activeTab === "rules" && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "16px" }}>
              {rules.map((r) => (
                <div
                  key={r.id}
                  style={{
                    background: "var(--ge-bg-card)",
                    border: "1px solid var(--ge-border)",
                    borderRadius: "var(--ge-radius-lg)",
                    padding: "20px",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                  }}
                >
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px" }}>
                      <strong style={{ fontSize: "1rem", color: "var(--ge-text-primary)" }}>{r.name}</strong>
                      <label style={{ display: "flex", alignItems: "center", cursor: "pointer" }}>
                        <input
                          type="checkbox"
                          checked={r.is_active}
                          onChange={() => handleToggleRule(r.id, r.is_active)}
                          style={{ accentColor: "var(--ge-accent)", cursor: "pointer" }}
                        />
                      </label>
                    </div>
                    <p style={{ fontSize: "0.8125rem", color: "var(--ge-text-muted)", lineHeight: "1.4", margin: "0 0 16px" }}>
                      {r.description}
                    </p>
                  </div>

                  <div style={{ borderTop: "1px solid var(--ge-border)", paddingTop: "12px", display: "flex", justifyContent: "space-between", fontSize: "0.75rem" }}>
                    <span style={{ color: "var(--ge-text-secondary)" }}>
                      Trigger: <strong>{r.trigger_type.replace(/_/g, " ")}</strong>
                    </span>
                    <span style={{ color: "var(--ge-accent)" }}>
                      Action: <strong>{r.action_type.replace(/_/g, " ")}</strong>
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* TAB 3: EXECUTION LOGS */}
          {activeTab === "logs" && (
            <div style={{ background: "var(--ge-bg-card)", border: "1px solid var(--ge-border)", borderRadius: "var(--ge-radius-lg)", overflow: "hidden" }}>
              {logs.length === 0 ? (
                <div style={{ padding: "40px", textAlign: "center", color: "var(--ge-text-muted)" }}>
                  No automated rule triggers logged yet. Rules run automatically when conditions are met.
                </div>
              ) : (
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.875rem", textAlign: "left" }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid var(--ge-border)", background: "var(--ge-bg-secondary)", fontSize: "0.75rem", color: "var(--ge-text-muted)", textTransform: "uppercase" }}>
                      <th style={{ padding: "12px 16px" }}>Rule</th>
                      <th style={{ padding: "12px 16px" }}>Trigger</th>
                      <th style={{ padding: "12px 16px" }}>Action</th>
                      <th style={{ padding: "12px 16px" }}>Status</th>
                      <th style={{ padding: "12px 16px" }}>Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.map((log) => (
                      <tr key={log.id} style={{ borderBottom: "1px solid var(--ge-border)" }}>
                        <td style={{ padding: "12px 16px", fontWeight: 600 }}>{log.rule_name}</td>
                        <td style={{ padding: "12px 16px", color: "var(--ge-text-secondary)" }}>{log.trigger_event}</td>
                        <td style={{ padding: "12px 16px", color: "var(--ge-text-secondary)" }}>{log.action_taken}</td>
                        <td style={{ padding: "12px 16px" }}>
                          <span style={{ padding: "2px 8px", borderRadius: "10px", fontSize: "0.75rem", fontWeight: 600, background: log.status === "success" ? "rgba(16,185,129,0.15)" : "rgba(239,68,68,0.15)", color: log.status === "success" ? "#10b981" : "#ef4444" }}>
                            {log.status.toUpperCase()}
                          </span>
                        </td>
                        <td style={{ padding: "12px 16px", color: "var(--ge-text-muted)", fontSize: "0.75rem" }}>
                          {new Date(log.created_at).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </>
      )}

      {/* DECISION MODAL */}
      {selectedRequest && (
        <div style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,0.65)", display: "flex", alignItems: "center", justifyContent: "center", padding: "16px" }}>
          <div style={{ width: "100%", maxWidth: "480px", background: "var(--ge-bg-card)", border: "1px solid var(--ge-border)", borderRadius: "var(--ge-radius-lg)", padding: "24px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <h2 style={{ fontSize: "1.25rem", fontWeight: 700, margin: 0 }}>Review Authorization</h2>
              <button onClick={() => setSelectedRequest(null)} style={{ background: "transparent", border: "none", fontSize: "1.2rem", cursor: "pointer" }}>✕</button>
            </div>

            <div style={{ background: "var(--ge-bg-secondary)", padding: "14px", borderRadius: "var(--ge-radius)", marginBottom: "16px" }}>
              <strong style={{ fontSize: "0.9375rem", color: "var(--ge-text-primary)" }}>{selectedRequest.title}</strong>
              <p style={{ fontSize: "0.8125rem", color: "var(--ge-text-muted)", margin: "4px 0 10px" }}>{selectedRequest.description}</p>
              <div style={{ fontSize: "0.75rem", color: "var(--ge-text-secondary)" }}>
                {Object.entries(selectedRequest.payload).map(([k, v]) => (
                  <div key={k}>
                    <strong>{k.replace(/_/g, " ")}:</strong> {typeof v === "object" ? JSON.stringify(v) : String(v)}
                  </div>
                ))}
              </div>
            </div>

            <label className="ge-label" style={{ marginBottom: "6px" }}>Decision Note / Reason</label>
            <textarea
              value={decisionNote}
              onChange={(e) => setDecisionNote(e.target.value)}
              placeholder="e.g. Approved per management margin policy"
              className="ge-input"
              style={{ minHeight: "80px", marginBottom: "20px" }}
            />

            <div style={{ display: "flex", gap: "10px" }}>
              <button
                onClick={() => handleDecision("approved")}
                disabled={deciding}
                style={{ flex: 1, padding: "12px", borderRadius: "var(--ge-radius)", background: "#10b981", color: "#fff", border: "none", fontWeight: 700, cursor: deciding ? "default" : "pointer" }}
              >
                ✓ Approve Request
              </button>
              <button
                onClick={() => handleDecision("rejected")}
                disabled={deciding}
                style={{ flex: 1, padding: "12px", borderRadius: "var(--ge-radius)", background: "#ef4444", color: "#fff", border: "none", fontWeight: 700, cursor: deciding ? "default" : "pointer" }}
              >
                ✕ Reject
              </button>
            </div>
          </div>
        </div>
      )}

      {/* NEW RULE MODAL */}
      {showRuleModal && (
        <div style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,0.65)", display: "flex", alignItems: "center", justifyContent: "center", padding: "16px" }}>
          <form onSubmit={handleCreateRule} style={{ width: "100%", maxWidth: "460px", background: "var(--ge-bg-card)", border: "1px solid var(--ge-border)", borderRadius: "var(--ge-radius-lg)", padding: "24px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <h2 style={{ fontSize: "1.25rem", fontWeight: 700, margin: 0 }}>Create Automation Rule</h2>
              <button type="button" onClick={() => setShowRuleModal(false)} style={{ background: "transparent", border: "none", fontSize: "1.2rem", cursor: "pointer" }}>✕</button>
            </div>

            <div style={{ marginBottom: "14px" }}>
              <label className="ge-label">Rule Name</label>
              <input type="text" required value={newRuleName} onChange={(e) => setNewRuleName(e.target.value)} placeholder="e.g. Alert when order exceeds ₹1,00,000" className="ge-input" />
            </div>

            <div style={{ marginBottom: "14px" }}>
              <label className="ge-label">When (Trigger)</label>
              <select value={newRuleTrigger} onChange={(e) => setNewRuleTrigger(e.target.value)} className="ge-input">
                <option value="invoice_overdue">Invoice is Overdue</option>
                <option value="low_stock">Product Reaches Low Stock</option>
                <option value="payment_received">Payment Received</option>
                <option value="large_order">Large Order Created</option>
                <option value="high_discount">High Discount Requested</option>
              </select>
            </div>

            <div style={{ marginBottom: "14px" }}>
              <label className="ge-label">Then (Action)</label>
              <select value={newRuleAction} onChange={(e) => setNewRuleAction(e.target.value)} className="ge-input">
                <option value="notify_owner">Notify Business Owner</option>
                <option value="notify_manager">Notify Branch Manager</option>
                <option value="require_approval">Require Manager Approval</option>
                <option value="send_reminder">Send Automated Reminder</option>
              </select>
            </div>

            <div style={{ marginBottom: "20px" }}>
              <label className="ge-label">Description (Optional)</label>
              <input type="text" value={newRuleDesc} onChange={(e) => setNewRuleDesc(e.target.value)} placeholder="Rule purpose" className="ge-input" />
            </div>

            <button type="submit" style={{ width: "100%", padding: "12px", borderRadius: "var(--ge-radius)", background: "var(--ge-accent)", color: "#fff", border: "none", fontWeight: 700, cursor: "pointer" }}>
              Activate Automation Rule
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
