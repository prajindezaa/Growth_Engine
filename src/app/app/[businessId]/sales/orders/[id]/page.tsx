"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { SalesOrder, LineItem } from "@/lib/types";

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  draft: { bg: "rgba(107,114,128,0.12)", text: "#9ca3af" },
  confirmed: { bg: "var(--ge-success-bg)", text: "var(--ge-success)" },
  converted: { bg: "rgba(139,92,246,0.12)", text: "#a78bfa" },
  cancelled: { bg: "var(--ge-error-bg)", text: "var(--ge-error)" },
};

export default function SalesOrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const businessId = params.businessId as string;
  const orderId = params.id as string;

  const [order, setOrder] = useState<SalesOrder | null>(null);
  const [lineItems, setLineItems] = useState<LineItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [converting, setConverting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { loadData(); }, [orderId]);

  async function loadData() {
    const supabase = createClient();
    const [{ data: o }, { data: items }] = await Promise.all([
      supabase.from("sales_orders").select("*, customers(name)").eq("id", orderId).single(),
      supabase.from("line_items").select("*").eq("parent_type", "sales_order").eq("parent_id", orderId).order("sort_order"),
    ]);
    if (o) setOrder(o as SalesOrder);
    if (items) setLineItems(items as LineItem[]);
    setLoading(false);
  }

  async function convertToInvoice() {
    setConverting(true); setError(null);
    const supabase = createClient();
    const { data: invId, error: err } = await supabase.rpc("convert_order_to_invoice", { p_order_id: orderId });
    if (err) { setError(err.message); setConverting(false); return; }
    router.push(`/app/${businessId}/sales/invoices/${invId}`);
  }

  if (loading) return <div style={{ padding: "60px 40px", display: "flex", justifyContent: "center" }}><span className="ge-spinner" /></div>;
  if (!order) return <div style={{ padding: "60px 40px", color: "var(--ge-text-muted)" }}>Sales order not found.</div>;

  const sc = STATUS_COLORS[order.status] || STATUS_COLORS.draft;

  return (
    <div style={{ padding: "40px" }}>
      <div className="ge-animate-in">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "32px" }}>
          <div>
            <h1 style={{ fontSize: "1.5rem", fontWeight: 700, color: "var(--ge-text-primary)", letterSpacing: "-0.02em", marginBottom: "4px" }}>{order.order_number}</h1>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <span style={{ fontSize: "0.875rem", color: "var(--ge-text-secondary)" }}>To: <strong>{order.customers?.name}</strong></span>
              <span style={{ padding: "2px 10px", borderRadius: "var(--ge-radius-full)", fontSize: "0.6875rem", fontWeight: 600, textTransform: "capitalize", background: sc.bg, color: sc.text }}>{order.status}</span>
            </div>
          </div>
          {order.status !== "converted" && order.status !== "cancelled" && (
            <button onClick={convertToInvoice} disabled={converting} className="ge-btn-primary" style={{ width: "auto", padding: "10px 20px", fontSize: "0.875rem" }}>
              <span>{converting ? "Converting…" : "→ Convert to Invoice"}</span>
            </button>
          )}
        </div>

        {error && <div className="ge-error" style={{ marginBottom: "20px" }}>{error}</div>}

        {/* Line items */}
        <div style={{ background: "var(--ge-bg-card)", border: "1px solid var(--ge-border)", borderRadius: "var(--ge-radius-lg)", overflow: "hidden", marginBottom: "16px" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--ge-border)", fontSize: "0.75rem", color: "var(--ge-text-muted)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
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
                  <td style={{ padding: "12px", fontSize: "0.875rem", textAlign: "right", fontFamily: "monospace", fontWeight: 600, color: "var(--ge-text-primary)" }}>₹{item.line_total.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals */}
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <div style={{ background: "var(--ge-bg-card)", border: "1px solid var(--ge-border)", borderRadius: "var(--ge-radius)", padding: "16px 24px", minWidth: "280px" }}>
            <TRow label="Subtotal" value={order.subtotal} />
            <TRow label="Tax" value={order.tax_total} />
            {order.discount_total > 0 && <TRow label="Discount" value={-order.discount_total} />}
            <div style={{ borderTop: "1px solid var(--ge-border)", marginTop: "8px", paddingTop: "8px", display: "flex", justifyContent: "space-between" }}>
              <span style={{ fontWeight: 700, color: "var(--ge-text-primary)" }}>Grand Total</span>
              <span style={{ fontWeight: 700, color: "var(--ge-accent)", fontFamily: "monospace", fontSize: "1.125rem" }}>₹{order.grand_total.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {order.notes && (
          <div style={{ marginTop: "24px" }}>
            <h3 style={{ fontSize: "0.875rem", fontWeight: 600, color: "var(--ge-text-primary)", marginBottom: "8px" }}>Notes</h3>
            <p style={{ fontSize: "0.875rem", color: "var(--ge-text-secondary)", whiteSpace: "pre-wrap" }}>{order.notes}</p>
          </div>
        )}
      </div>
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
