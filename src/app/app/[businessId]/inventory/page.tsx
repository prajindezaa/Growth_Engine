"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Product } from "@/lib/types";
import Link from "next/link";

export default function InventoryPage() {
  const params = useParams();
  const businessId = params.businessId as string;

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadData(); }, [businessId]);

  async function loadData() {
    const supabase = createClient();
    const { data } = await supabase.from("products").select("*").eq("business_id", businessId).eq("is_active", true).order("name");
    if (data) setProducts(data as Product[]);
    setLoading(false);
  }

  const totalUnits = products.reduce((s, p) => s + p.current_stock, 0);
  const totalValuation = products.reduce((s, p) => s + p.current_stock * p.purchase_price, 0);
  const lowStock = products.filter((p) => p.current_stock <= p.min_stock);

  if (loading) return <div style={{ padding: "60px 40px", display: "flex", justifyContent: "center" }}><span className="ge-spinner" /></div>;

  return (
    <div style={{ padding: "40px" }}>
      <div className="ge-animate-in">
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "24px" }}>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 700, color: "var(--ge-text-primary)", letterSpacing: "-0.02em" }}>Inventory</h1>
          <Link href={`/app/${businessId}/inventory/adjust`} className="ge-btn-primary" style={{ width: "auto", padding: "10px 20px", fontSize: "0.875rem", textDecoration: "none", display: "inline-flex" }}>
            <span>± Stock Adjustment</span>
          </Link>
        </div>

        {/* Summary cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px", marginBottom: "32px" }}>
          <SummaryCard label="Total Products" value={products.length.toString()} icon="📦" />
          <SummaryCard label="Total Units in Stock" value={totalUnits.toLocaleString("en-IN")} icon="📊" />
          <SummaryCard label="Total Valuation" value={`₹${totalValuation.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`} icon="💎" accent />
        </div>

        {/* Low stock alerts */}
        {lowStock.length > 0 && (
          <div style={{ marginBottom: "32px" }}>
            <h2 style={{ fontSize: "1.125rem", fontWeight: 600, color: "var(--ge-error)", marginBottom: "12px", display: "flex", alignItems: "center", gap: "8px" }}>
              ⚠ Low Stock Alerts <span style={{ fontSize: "0.75rem", padding: "2px 8px", borderRadius: "var(--ge-radius-full)", background: "var(--ge-error-bg)", fontWeight: 700 }}>{lowStock.length}</span>
            </h2>
            <div style={{ background: "var(--ge-bg-card)", border: "1px solid rgba(248,113,113,0.2)", borderRadius: "var(--ge-radius-lg)", overflow: "hidden" }}>
              {lowStock.map((p) => (
                <Link key={p.id} href={`/app/${businessId}/products/${p.id}`} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", borderBottom: "1px solid var(--ge-border)", textDecoration: "none", transition: "background var(--ge-transition)" }} className="ge-table-row">
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <span style={{ fontSize: "0.875rem", fontWeight: 500, color: "var(--ge-text-primary)" }}>{p.name}</span>
                    {p.sku && <span style={{ fontSize: "0.75rem", color: "var(--ge-text-muted)", fontFamily: "monospace" }}>{p.sku}</span>}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                    <span style={{ fontSize: "0.8125rem", fontFamily: "monospace", color: "var(--ge-error)", fontWeight: 600 }}>{p.current_stock} / {p.min_stock} {p.unit}</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* All products stock table */}
        <h2 style={{ fontSize: "1.125rem", fontWeight: 600, color: "var(--ge-text-primary)", marginBottom: "12px" }}>Stock by Product</h2>
        <div style={{ background: "var(--ge-bg-card)", border: "1px solid var(--ge-border)", borderRadius: "var(--ge-radius-lg)", overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--ge-border)", fontSize: "0.75rem", color: "var(--ge-text-muted)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                <th style={thStyle}>Product</th>
                <th style={thStyle}>SKU</th>
                <th style={thStyle}>Current Stock</th>
                <th style={thStyle}>Purchase Price</th>
                <th style={thStyle}>Stock Value</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => {
                const isLow = p.current_stock <= p.min_stock;
                return (
                  <tr key={p.id} style={{ borderBottom: "1px solid var(--ge-border)" }}>
                    <td style={tdStyle}><span style={{ fontWeight: 500, color: "var(--ge-text-primary)" }}>{p.name}</span></td>
                    <td style={{ ...tdStyle, fontFamily: "monospace", fontSize: "0.8125rem" }}>{p.sku || "—"}</td>
                    <td style={tdStyle}>
                      <span style={{ fontFamily: "monospace", fontWeight: 500, color: isLow ? "var(--ge-error)" : "var(--ge-text-primary)" }}>
                        {p.current_stock} {p.unit}
                      </span>
                      {isLow && <span style={{ marginLeft: "6px", fontSize: "0.6875rem", color: "var(--ge-error)" }}>⚠</span>}
                    </td>
                    <td style={{ ...tdStyle, fontFamily: "monospace" }}>₹{p.purchase_price.toLocaleString("en-IN")}</td>
                    <td style={{ ...tdStyle, fontFamily: "monospace", fontWeight: 600, color: "var(--ge-accent)" }}>₹{(p.current_stock * p.purchase_price).toLocaleString("en-IN", { maximumFractionDigits: 0 })}</td>
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

function SummaryCard({ label, value, icon, accent }: { label: string; value: string; icon: string; accent?: boolean }) {
  return (
    <div style={{ background: accent ? "var(--ge-gradient-subtle)" : "var(--ge-bg-card)", border: "1px solid var(--ge-border)", borderRadius: "var(--ge-radius-lg)", padding: "20px", backdropFilter: "blur(20px)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
        <span style={{ fontSize: "1.25rem" }}>{icon}</span>
        <span style={{ fontSize: "0.6875rem", color: "var(--ge-text-muted)", textTransform: "uppercase", letterSpacing: "0.04em" }}>{label}</span>
      </div>
      <div style={{ fontSize: "1.5rem", fontWeight: 700, color: accent ? "var(--ge-accent)" : "var(--ge-text-primary)", fontFamily: "monospace" }}>{value}</div>
    </div>
  );
}

const thStyle: React.CSSProperties = { padding: "12px 16px", textAlign: "left", fontWeight: 500 };
const tdStyle: React.CSSProperties = { padding: "14px 16px", fontSize: "0.875rem", color: "var(--ge-text-secondary)" };
