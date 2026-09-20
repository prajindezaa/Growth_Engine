"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Product, StockMovement } from "@/lib/types";
import Link from "next/link";

const TABS = [
  { key: "details", label: "Details", icon: "📋" },
  { key: "ledger", label: "Stock Ledger", icon: "📊" },
];

export default function ProductDetailPage() {
  const params = useParams();
  const businessId = params.businessId as string;
  const productId = params.productId as string;

  const [product, setProduct] = useState<Product | null>(null);
  const [supplierName, setSupplierName] = useState<string | null>(null);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("details");

  useEffect(() => { loadProduct(); }, [productId]);

  async function loadProduct() {
    const supabase = createClient();
    const { data } = await supabase.from("products").select("*").eq("id", productId).eq("business_id", businessId).single();
    if (data) {
      setProduct(data as Product);
      if (data.supplier_id) {
        const { data: s } = await supabase.from("suppliers").select("name").eq("id", data.supplier_id).single();
        if (s) setSupplierName(s.name);
      }
      // Load movements
      const { data: mvs } = await supabase.from("stock_movements").select("*").eq("product_id", productId).order("created_at", { ascending: false }).limit(100);
      if (mvs) setMovements(mvs as StockMovement[]);
    }
    setLoading(false);
  }

  if (loading) return <div style={{ padding: "60px 40px", display: "flex", justifyContent: "center" }}><span className="ge-spinner" /></div>;
  if (!product) return <div style={{ padding: "60px 40px", color: "var(--ge-text-muted)" }}>Product not found.</div>;

  const isLow = product.current_stock <= product.min_stock && product.is_active;
  const margin = product.selling_price - product.purchase_price;
  const marginPct = product.purchase_price > 0 ? (margin / product.purchase_price * 100).toFixed(1) : "—";

  return (
    <div style={{ padding: "40px" }}>
      <div className="ge-animate-in">
        {/* Header */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "32px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            {product.image_url ? (
              <img src={product.image_url} alt={product.name} style={{ width: "64px", height: "64px", borderRadius: "var(--ge-radius)", objectFit: "cover" }} />
            ) : (
              <div style={{ width: "64px", height: "64px", borderRadius: "var(--ge-radius)", background: "var(--ge-gradient-subtle)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.5rem" }}>📦</div>
            )}
            <div>
              <h1 style={{ fontSize: "1.5rem", fontWeight: 700, color: "var(--ge-text-primary)", letterSpacing: "-0.02em", marginBottom: "4px" }}>{product.name}</h1>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                {product.sku && <span style={{ fontSize: "0.8125rem", color: "var(--ge-text-muted)", fontFamily: "monospace" }}>SKU: {product.sku}</span>}
                <span style={{ padding: "2px 10px", borderRadius: "var(--ge-radius-full)", fontSize: "0.6875rem", fontWeight: 600, background: product.is_active ? "var(--ge-success-bg)" : "rgba(107,114,128,0.12)", color: product.is_active ? "var(--ge-success)" : "#9ca3af" }}>
                  {product.is_active ? "Active" : "Inactive"}
                </span>
                {isLow && <span style={{ padding: "2px 10px", borderRadius: "var(--ge-radius-full)", fontSize: "0.6875rem", fontWeight: 600, background: "var(--ge-error-bg)", color: "var(--ge-error)" }}>⚠ Low Stock</span>}
              </div>
            </div>
          </div>
          <Link href={`/app/${businessId}/products/${productId}/edit`} className="ge-btn-secondary" style={{ width: "auto", padding: "8px 16px", fontSize: "0.8125rem", textDecoration: "none" }}>Edit</Link>
        </div>

        {/* Stats row */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "12px", marginBottom: "24px" }}>
          <StatCard label="Selling Price" value={`₹${product.selling_price.toLocaleString("en-IN")}`} />
          <StatCard label="Purchase Price" value={`₹${product.purchase_price.toLocaleString("en-IN")}`} />
          <StatCard label="Margin" value={`₹${margin.toFixed(2)} (${marginPct}%)`} color={margin > 0 ? "var(--ge-success)" : margin < 0 ? "var(--ge-error)" : undefined} />
          <StatCard label="Current Stock" value={`${product.current_stock} ${product.unit}`} color={isLow ? "var(--ge-error)" : undefined} />
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: "2px", borderBottom: "1px solid var(--ge-border)", marginBottom: "24px" }}>
          {TABS.map((tab) => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)} style={{
              padding: "10px 16px", fontSize: "0.8125rem", fontWeight: 500,
              color: activeTab === tab.key ? "var(--ge-accent)" : "var(--ge-text-muted)",
              background: "transparent", border: "none",
              borderBottom: activeTab === tab.key ? "2px solid var(--ge-accent)" : "2px solid transparent",
              cursor: "pointer", transition: "all var(--ge-transition)", display: "flex", alignItems: "center", gap: "6px",
            }}>
              <span>{tab.icon}</span>{tab.label}
            </button>
          ))}
        </div>

        <div className="ge-animate-in" key={activeTab}>
          {activeTab === "details" && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
              <InfoCard label="Barcode" value={product.barcode || "—"} />
              <InfoCard label="Category" value={product.category || "—"} />
              <InfoCard label="HSN/SAC" value={product.hsn_sac || "—"} />
              <InfoCard label="Tax Rate" value={`${product.tax_rate}%`} />
              <InfoCard label="Min Stock (Alert)" value={`${product.min_stock} ${product.unit}`} />
              <InfoCard label="Max Stock" value={`${product.max_stock} ${product.unit}`} />
              <InfoCard label="Supplier" value={supplierName || "—"} />
              <InfoCard label="Unit" value={product.unit} />
            </div>
          )}

          {activeTab === "ledger" && (
            <>
              {movements.length === 0 ? (
                <div style={{ background: "var(--ge-bg-card)", border: "1px solid var(--ge-border)", borderRadius: "var(--ge-radius-lg)", padding: "48px 32px", textAlign: "center" }}>
                  <div style={{ fontSize: "2rem", marginBottom: "12px" }}>📊</div>
                  <h3 style={{ fontSize: "1rem", fontWeight: 600, color: "var(--ge-text-primary)", marginBottom: "6px" }}>No stock movements yet</h3>
                  <p style={{ fontSize: "0.875rem", color: "var(--ge-text-secondary)" }}>Stock movements will appear here as inventory changes.</p>
                </div>
              ) : (
                <div style={{ background: "var(--ge-bg-card)", border: "1px solid var(--ge-border)", borderRadius: "var(--ge-radius-lg)", overflow: "hidden" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr style={{ borderBottom: "1px solid var(--ge-border)", fontSize: "0.75rem", color: "var(--ge-text-muted)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                        <th style={thStyle}>Date</th>
                        <th style={thStyle}>Type</th>
                        <th style={thStyle}>Quantity</th>
                        <th style={thStyle}>Reference</th>
                        <th style={thStyle}>Note</th>
                      </tr>
                    </thead>
                    <tbody>
                      {movements.map((m) => (
                        <tr key={m.id} style={{ borderBottom: "1px solid var(--ge-border)" }}>
                          <td style={tdStyle}>{new Date(m.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</td>
                          <td style={tdStyle}>
                            <span style={{
                              padding: "2px 8px", borderRadius: "var(--ge-radius-full)", fontSize: "0.6875rem", fontWeight: 600, textTransform: "capitalize",
                              background: m.type === "in" ? "var(--ge-success-bg)" : m.type === "out" ? "var(--ge-error-bg)" : "rgba(107,114,128,0.12)",
                              color: m.type === "in" ? "var(--ge-success)" : m.type === "out" ? "var(--ge-error)" : "#9ca3af",
                            }}>
                              {m.type === "in" ? "📥 In" : m.type === "out" ? "📤 Out" : `🔄 ${m.type}`}
                            </span>
                          </td>
                          <td style={{ ...tdStyle, fontFamily: "monospace", fontWeight: 600, color: m.quantity > 0 ? "var(--ge-success)" : "var(--ge-error)" }}>
                            {m.quantity > 0 ? "+" : ""}{m.quantity}
                          </td>
                          <td style={tdStyle}><span style={{ textTransform: "capitalize" }}>{m.reference_type}</span></td>
                          <td style={tdStyle}>{m.note || "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
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

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ background: "var(--ge-bg-card)", border: "1px solid var(--ge-border)", borderRadius: "var(--ge-radius)", padding: "16px", backdropFilter: "blur(20px)" }}>
      <div style={{ fontSize: "0.6875rem", color: "var(--ge-text-muted)", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: "4px" }}>{label}</div>
      <div style={{ fontSize: "0.9375rem", color: "var(--ge-text-primary)", fontWeight: 500, wordBreak: "break-word" }}>{value}</div>
    </div>
  );
}

const thStyle: React.CSSProperties = { padding: "12px 16px", textAlign: "left", fontWeight: 500 };
const tdStyle: React.CSSProperties = { padding: "14px 16px", fontSize: "0.875rem", color: "var(--ge-text-secondary)" };
