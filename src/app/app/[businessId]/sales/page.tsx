"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Quotation, SalesOrder, Invoice } from "@/lib/types";
import Link from "next/link";

type Tab = "quotations" | "orders" | "invoices";

export default function SalesPage() {
  const params = useParams();
  const router = useRouter();
  const businessId = params.businessId as string;

  const [activeTab, setActiveTab] = useState<Tab>("quotations");
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [orders, setOrders] = useState<SalesOrder[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadAll(); }, [businessId]);

  async function loadAll() {
    const supabase = createClient();
    const [q, o, i] = await Promise.all([
      supabase.from("quotations").select("*, customers(name)").eq("business_id", businessId).order("created_at", { ascending: false }),
      supabase.from("sales_orders").select("*, customers(name)").eq("business_id", businessId).order("created_at", { ascending: false }),
      supabase.from("invoices").select("*, customers(name)").eq("business_id", businessId).order("created_at", { ascending: false }),
    ]);
    if (q.data) setQuotations(q.data as Quotation[]);
    if (o.data) setOrders(o.data as SalesOrder[]);
    if (i.data) setInvoices(i.data as Invoice[]);
    setLoading(false);
  }

  if (loading) return <div style={{ padding: "60px 40px", display: "flex", justifyContent: "center" }}><span className="ge-spinner" /></div>;

  return (
    <div style={{ padding: "40px" }}>
      <div className="ge-animate-in">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "24px" }}>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 700, color: "var(--ge-text-primary)", letterSpacing: "-0.02em" }}>Sales</h1>
          <Link href={`/app/${businessId}/sales/quotations/new`} className="ge-btn-primary" style={{ width: "auto", padding: "10px 20px", fontSize: "0.875rem", textDecoration: "none", display: "inline-flex" }}>
            <span>+ New Quotation</span>
          </Link>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: "2px", borderBottom: "1px solid var(--ge-border)", marginBottom: "24px" }}>
          {([
            { key: "quotations" as Tab, label: "Quotations", count: quotations.length },
            { key: "orders" as Tab, label: "Sales Orders", count: orders.length },
            { key: "invoices" as Tab, label: "Invoices", count: invoices.length },
          ]).map((tab) => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)} style={{
              padding: "10px 16px", fontSize: "0.8125rem", fontWeight: 500,
              color: activeTab === tab.key ? "var(--ge-accent)" : "var(--ge-text-muted)",
              background: "transparent", border: "none",
              borderBottom: activeTab === tab.key ? "2px solid var(--ge-accent)" : "2px solid transparent",
              cursor: "pointer", transition: "all var(--ge-transition)", display: "flex", alignItems: "center", gap: "6px",
            }}>
              {tab.label}
              <span style={{ fontSize: "0.6875rem", padding: "1px 6px", borderRadius: "var(--ge-radius-full)", background: "rgba(255,255,255,0.06)" }}>{tab.count}</span>
            </button>
          ))}
        </div>

        <div key={activeTab} className="ge-animate-in">
          {activeTab === "quotations" && (
            quotations.length === 0 ? <EmptyState icon="📝" title="No quotations yet" desc="Create your first quotation to get started." /> : (
              <DocTable
                rows={quotations.map((q) => ({
                  id: q.id, number: q.quotation_number, customer: q.customers?.name || "—",
                  status: q.status, total: q.grand_total, date: q.created_at,
                  href: `/app/${businessId}/sales/quotations/${q.id}`,
                }))}
                onRowClick={(href) => router.push(href)}
              />
            )
          )}
          {activeTab === "orders" && (
            orders.length === 0 ? <EmptyState icon="📦" title="No sales orders yet" desc="Convert a quotation to create a sales order." /> : (
              <DocTable
                rows={orders.map((o) => ({
                  id: o.id, number: o.order_number, customer: o.customers?.name || "—",
                  status: o.status, total: o.grand_total, date: o.created_at,
                  href: `/app/${businessId}/sales/orders/${o.id}`,
                }))}
                onRowClick={(href) => router.push(href)}
              />
            )
          )}
          {activeTab === "invoices" && (
            invoices.length === 0 ? <EmptyState icon="🧾" title="No invoices yet" desc="Convert a sales order to create an invoice." /> : (
              <DocTable
                rows={invoices.map((inv) => ({
                  id: inv.id, number: inv.invoice_number, customer: inv.customers?.name || "—",
                  status: inv.payment_status === "paid" ? "paid" : inv.status,
                  total: inv.grand_total, date: inv.created_at,
                  href: `/app/${businessId}/sales/invoices/${inv.id}`,
                }))}
                onRowClick={(href) => router.push(href)}
              />
            )
          )}
        </div>
      </div>
    </div>
  );
}

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  draft: { bg: "rgba(107,114,128,0.12)", text: "#9ca3af" },
  sent: { bg: "rgba(59,130,246,0.12)", text: "#60a5fa" },
  accepted: { bg: "var(--ge-success-bg)", text: "var(--ge-success)" },
  rejected: { bg: "var(--ge-error-bg)", text: "var(--ge-error)" },
  converted: { bg: "rgba(139,92,246,0.12)", text: "#a78bfa" },
  confirmed: { bg: "var(--ge-success-bg)", text: "var(--ge-success)" },
  cancelled: { bg: "var(--ge-error-bg)", text: "var(--ge-error)" },
  finalized: { bg: "var(--ge-success-bg)", text: "var(--ge-success)" },
  unpaid: { bg: "var(--ge-error-bg)", text: "var(--ge-error)" },
  partial: { bg: "rgba(251,191,36,0.12)", text: "#fbbf24" },
  paid: { bg: "var(--ge-success-bg)", text: "var(--ge-success)" },
};

function DocTable({ rows, onRowClick }: { rows: { id: string; number: string; customer: string; status: string; total: number; date: string; href: string }[]; onRowClick: (href: string) => void }) {
  return (
    <div style={{ background: "var(--ge-bg-card)", border: "1px solid var(--ge-border)", borderRadius: "var(--ge-radius-lg)", overflow: "hidden" }}>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ borderBottom: "1px solid var(--ge-border)", fontSize: "0.75rem", color: "var(--ge-text-muted)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
            <th style={thStyle}>Number</th>
            <th style={thStyle}>Customer</th>
            <th style={thStyle}>Status</th>
            <th style={thStyle}>Total</th>
            <th style={thStyle}>Date</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const sc = STATUS_COLORS[r.status] || STATUS_COLORS.draft;
            return (
              <tr key={r.id} onClick={() => onRowClick(r.href)} className="ge-table-row" style={{ borderBottom: "1px solid var(--ge-border)", cursor: "pointer", transition: "background var(--ge-transition)" }}>
                <td style={tdStyle}><span style={{ fontWeight: 600, color: "var(--ge-accent)", fontFamily: "monospace" }}>{r.number}</span></td>
                <td style={tdStyle}><span style={{ fontWeight: 500, color: "var(--ge-text-primary)" }}>{r.customer}</span></td>
                <td style={tdStyle}>
                  <span style={{ padding: "2px 8px", borderRadius: "var(--ge-radius-full)", fontSize: "0.6875rem", fontWeight: 600, textTransform: "capitalize", background: sc.bg, color: sc.text }}>{r.status}</span>
                </td>
                <td style={{ ...tdStyle, fontFamily: "monospace", fontWeight: 600 }}>₹{r.total.toLocaleString("en-IN")}</td>
                <td style={tdStyle}>{new Date(r.date).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function EmptyState({ icon, title, desc }: { icon: string; title: string; desc: string }) {
  return (
    <div style={{ background: "var(--ge-bg-card)", border: "1px solid var(--ge-border)", borderRadius: "var(--ge-radius-lg)", padding: "48px 32px", textAlign: "center" }}>
      <div style={{ fontSize: "2rem", marginBottom: "12px" }}>{icon}</div>
      <h3 style={{ fontSize: "1rem", fontWeight: 600, color: "var(--ge-text-primary)", marginBottom: "6px" }}>{title}</h3>
      <p style={{ fontSize: "0.875rem", color: "var(--ge-text-secondary)" }}>{desc}</p>
    </div>
  );
}

const thStyle: React.CSSProperties = { padding: "12px 16px", textAlign: "left", fontWeight: 500 };
const tdStyle: React.CSSProperties = { padding: "14px 16px", fontSize: "0.875rem", color: "var(--ge-text-secondary)" };
