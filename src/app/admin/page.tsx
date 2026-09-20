"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

interface AdminMetrics {
  total_businesses: number;
  active_trials: number;
  expired_trials: number;
  paid_businesses: number;
  weekly_active: number;
  total_invoices_this_month: number;
  total_ai_interactions: number;
}

export default function AdminDashboard() {
  const [metrics, setMetrics] = useState<AdminMetrics | null>(null);
  const [businesses, setBusinesses] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    const supabase = createClient();
    const [{ data: m }, { data: biz }] = await Promise.all([
      (supabase.rpc as Function)("get_admin_metrics"),
      supabase.from("businesses").select("id, name, plan, trial_ends_at, subscription_status, created_at")
        .order("created_at", { ascending: false }).limit(50),
    ]);
    if (m) setMetrics(m as AdminMetrics);
    if (biz) setBusinesses(biz as Record<string, unknown>[]);
    setLoading(false);
  }

  if (loading) return <div style={{ padding: "60px 40px", display: "flex", justifyContent: "center" }}><span className="ge-spinner" /></div>;

  const conversionRate = metrics && metrics.total_businesses > 0
    ? ((metrics.paid_businesses / metrics.total_businesses) * 100).toFixed(1)
    : "0";

  return (
    <div style={{ padding: "40px", maxWidth: "1200px", margin: "0 auto" }}>
      <div className="ge-animate-in">
        <h1 style={{ fontSize: "1.5rem", fontWeight: 700, color: "var(--ge-text-primary)", letterSpacing: "-0.02em", marginBottom: "24px" }}>Admin Dashboard</h1>

        {/* Metrics */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "16px", marginBottom: "28px" }}>
          <MetricCard label="Total Businesses" value={metrics?.total_businesses || 0} />
          <MetricCard label="Weekly Active" value={metrics?.weekly_active || 0} accent />
          <MetricCard label="Paid Businesses" value={metrics?.paid_businesses || 0} color="var(--ge-success)" />
          <MetricCard label="Trial→Paid %" value={`${conversionRate}%`} />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px", marginBottom: "28px" }}>
          <MetricCard label="Active Trials" value={metrics?.active_trials || 0} />
          <MetricCard label="Expired Trials" value={metrics?.expired_trials || 0} color="var(--ge-error)" />
          <MetricCard label="AI Interactions (month)" value={metrics?.total_ai_interactions || 0} />
        </div>

        {/* Business list */}
        <div style={{ background: "var(--ge-bg-card)", border: "1px solid var(--ge-border)", borderRadius: "var(--ge-radius-lg)", overflow: "hidden" }}>
          <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--ge-border)" }}>
            <h3 style={{ margin: 0, fontSize: "0.875rem", fontWeight: 600, color: "var(--ge-text-primary)" }}>All Businesses</h3>
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--ge-border)", fontSize: "0.75rem", color: "var(--ge-text-muted)", textTransform: "uppercase" }}>
                <th style={{ padding: "10px 16px", textAlign: "left" }}>Name</th>
                <th style={{ padding: "10px 16px", textAlign: "left" }}>Plan</th>
                <th style={{ padding: "10px 16px", textAlign: "left" }}>Status</th>
                <th style={{ padding: "10px 16px", textAlign: "left" }}>Joined</th>
              </tr>
            </thead>
            <tbody>
              {businesses.map((b) => {
                const isExpired = b.plan === "trial" && new Date(b.trial_ends_at as string) < new Date();
                return (
                  <tr key={b.id as string} style={{ borderBottom: "1px solid var(--ge-border)" }}>
                    <td style={{ padding: "12px 16px", fontSize: "0.875rem", fontWeight: 500, color: "var(--ge-text-primary)" }}>{b.name as string}</td>
                    <td style={{ padding: "12px 16px" }}>
                      <span style={{
                        padding: "2px 8px", borderRadius: "var(--ge-radius-full)", fontSize: "0.6875rem", fontWeight: 600, textTransform: "capitalize",
                        background: (b.plan as string) === "trial" ? "rgba(107,114,128,0.12)" : "rgba(13,148,136,0.12)",
                        color: (b.plan as string) === "trial" ? "#9ca3af" : "var(--ge-accent)",
                      }}>{b.plan as string}</span>
                    </td>
                    <td style={{ padding: "12px 16px", fontSize: "0.8125rem", color: isExpired ? "var(--ge-error)" : "var(--ge-success)" }}>
                      {isExpired ? "Expired" : b.subscription_status as string}
                    </td>
                    <td style={{ padding: "12px 16px", fontSize: "0.8125rem", color: "var(--ge-text-muted)" }}>
                      {new Date(b.created_at as string).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function MetricCard({ label, value, color, accent }: { label: string; value: number | string; color?: string; accent?: boolean }) {
  return (
    <div style={{
      background: accent ? "var(--ge-gradient-subtle)" : "var(--ge-bg-card)",
      border: "1px solid var(--ge-border)", borderRadius: "var(--ge-radius-lg)", padding: "20px",
    }}>
      <div style={{ fontSize: "0.6875rem", color: "var(--ge-text-muted)", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: "8px" }}>{label}</div>
      <div style={{ fontSize: "1.5rem", fontWeight: 700, color: color || (accent ? "var(--ge-accent)" : "var(--ge-text-primary)"), fontFamily: "monospace" }}>{value}</div>
    </div>
  );
}
