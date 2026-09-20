"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Purchase, LineItem } from "@/lib/types";

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  draft: { bg: "rgba(107,114,128,0.12)", text: "#9ca3af" },
  finalized: { bg: "var(--ge-success-bg)", text: "var(--ge-success)" },
  cancelled: { bg: "var(--ge-error-bg)", text: "var(--ge-error)" },
};

export default function PurchaseDetailPage() {
  const params = useParams();
  const businessId = params.businessId as string;
  const purchaseId = params.id as string;

  const [purchase, setPurchase] = useState<Purchase | null>(null);
  const [lineItems, setLineItems] = useState<LineItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [finalizing, setFinalizing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => { loadData(); }, [purchaseId]);

  async function loadData() {
    const supabase = createClient();
    const [{ data: p }, { data: items }] = await Promise.all([
      supabase.from("purchases").select("*, suppliers(name)").eq("id", purchaseId).single(),
      supabase.from("line_items").select("*").eq("parent_type", "purchase").eq("parent_id", purchaseId).order("sort_order"),
    ]);
    if (p) setPurchase(p as Purchase);
    if (items) setLineItems(items as LineItem[]);
    setLoading(false);
  }

  async function handleFinalize() {
    setFinalizing(true); setError(null); setSuccess(null);
    const supabase = createClient();
    const { error: err } = await supabase.rpc("finalize_purchase", { p_purchase_id: purchaseId });
    if (err) { setError(err.message); setFinalizing(false); return; }
    setSuccess("Purchase finalized! Stock has been increased and purchase prices updated.");
    setFinalizing(false);
    await loadData();
  }

  if (loading) return <div style={{ padding: "60px 40px", display: "flex", justifyContent: "center" }}><span className="ge-spinner" /></div>;
  if (!purchase) return <div style={{ padding: "60px 40px", color: "var(--ge-text-muted)" }}>Purchase not found.</div>;

  const sc = STATUS_COLORS[purchase.status] || STATUS_COLORS.draft;

  return (
    <div style={{ padding: "40px" }}>
      <div className="ge-animate-in">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "32px" }}>
          <div>
            <h1 style={{ fontSize: "1.5rem", fontWeight: 700, color: "var(--ge-text-primary)", letterSpacing: "-0.02em", marginBottom: "4px" }}>{purchase.purchase_number}</h1>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <span style={{ fontSize: "0.875rem", color: "var(--ge-text-secondary)" }}>From: <strong>{purchase.suppliers?.name}</strong></span>
              <span style={{ padding: "2px 10px", borderRadius: "var(--ge-radius-full)", fontSize: "0.6875rem", fontWeight: 600, textTransform: "capitalize", background: sc.bg, color: sc.text }}>{purchase.status}</span>
            </div>
          </div>
          {purchase.status === "draft" && (
            <button onClick={handleFinalize} disabled={finalizing} className="ge-btn-primary" style={{ width: "auto", padding: "10px 20px", fontSize: "0.875rem" }}>
              <span>{finalizing ? "Finalizing…" : "✓ Finalize Purchase"}</span>
            </button>
          )}
        </div>

        {error && <div className="ge-error" style={{ marginBottom: "20px" }}>{error}</div>}
        {success && <div className="ge-success" style={{ marginBottom: "20px" }}>{success}</div>}

        {/* Stats */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "12px", marginBottom: "24px" }}>
          <StatCard label="Grand Total" value={`₹${purchase.grand_total.toFixed(2)}`} />
          <StatCard label="Status" value={purchase.status.charAt(0).toUpperCase() + purchase.status.slice(1)} color={purchase.status === "finalized" ? "var(--ge-success)" : undefined} />
          <StatCard label="Items" value={lineItems.length.toString()} />
        </div>

        <div style={{ background: "var(--ge-bg-card)", border: "1px solid var(--ge-border)", borderRadius: "var(--ge-radius-lg)", overflow: "hidden", marginBottom: "16px" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--ge-border)", fontSize: "0.75rem", color: "var(--ge-text-muted)", textTransform: "uppercase" }}>
                <th style={{ padding: "10px 12px", textAlign: "left" }}>Product</th>
                <th style={{ padding: "10px 12px", textAlign: "right" }}>Qty</th>
                <th style={{ padding: "10px 12px", textAlign: "right" }}>Unit Price</th>
                <th style={{ padding: "10px 12px", textAlign: "right" }}>Tax%</th>
                <th style={{ padding: "10px 12px", textAlign: "right" }}>Total</th>
              </tr>
            </thead>
            <tbody>
              {lineItems.map((item) => (
                <tr key={item.id} style={{ borderBottom: "1px solid var(--ge-border)" }}>
                  <td style={{ padding: "12px", fontSize: "0.875rem", fontWeight: 500, color: "var(--ge-text-primary)" }}>{item.product_name}</td>
                  <td style={{ padding: "12px", fontSize: "0.875rem", textAlign: "right", fontFamily: "monospace" }}>{item.quantity}</td>
                  <td style={{ padding: "12px", fontSize: "0.875rem", textAlign: "right", fontFamily: "monospace" }}>₹{item.unit_price.toLocaleString("en-IN")}</td>
                  <td style={{ padding: "12px", fontSize: "0.875rem", textAlign: "right" }}>{item.tax_rate}%</td>
                  <td style={{ padding: "12px", fontSize: "0.875rem", textAlign: "right", fontFamily: "monospace", fontWeight: 600 }}>₹{item.line_total.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <div style={{ background: "var(--ge-bg-card)", border: "1px solid var(--ge-border)", borderRadius: "var(--ge-radius)", padding: "16px 24px", minWidth: "280px" }}>
            <TRow label="Subtotal" value={purchase.subtotal} />
            <TRow label="Tax" value={purchase.tax_total} />
            {purchase.discount_total > 0 && <TRow label="Discount" value={-purchase.discount_total} />}
            <div style={{ borderTop: "1px solid var(--ge-border)", marginTop: "8px", paddingTop: "8px", display: "flex", justifyContent: "space-between" }}>
              <span style={{ fontWeight: 700, color: "var(--ge-text-primary)" }}>Grand Total</span>
              <span style={{ fontWeight: 700, color: "var(--ge-accent)", fontFamily: "monospace", fontSize: "1.125rem" }}>₹{purchase.grand_total.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div style={{ background: "var(--ge-bg-card)", border: "1px solid var(--ge-border)", borderRadius: "var(--ge-radius)", padding: "16px", backdropFilter: "blur(20px)" }}>
      <div style={{ fontSize: "0.6875rem", color: "var(--ge-text-muted)", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: "6px" }}>{label}</div>
      <div style={{ fontSize: "1.125rem", fontWeight: 700, color: color || "var(--ge-text-primary)", fontFamily: "monospace" }}>{value}</div>
    </div>
  );
}

function TRow({ label, value }: { label: string; value: number }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
      <span style={{ fontSize: "0.875rem", color: "var(--ge-text-secondary)" }}>{label}</span>
      <span style={{ fontSize: "0.875rem", color: "var(--ge-text-primary)", fontFamily: "monospace" }}>₹{value.toFixed(2)}</span>
    </div>
  );
}
