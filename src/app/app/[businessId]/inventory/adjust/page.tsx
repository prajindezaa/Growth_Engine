"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Product } from "@/lib/types";

export default function StockAdjustPage() {
  const params = useParams();
  const router = useRouter();
  const businessId = params.businessId as string;

  const [products, setProducts] = useState<Product[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const [form, setForm] = useState({
    product_id: "",
    type: "in" as "in" | "out" | "adjustment",
    quantity: 0,
    note: "",
  });

  useEffect(() => {
    const supabase = createClient();
    supabase.from("products").select("id, name, sku, current_stock, unit").eq("business_id", businessId).eq("is_active", true).order("name").then(({ data }) => {
      if (data) setProducts(data as Product[]);
    });
  }, [businessId]);

  const selectedProduct = products.find((p) => p.id === form.product_id);

  const filteredProducts = search.trim()
    ? products.filter((p) => p.name.toLowerCase().includes(search.toLowerCase()) || (p.sku || "").toLowerCase().includes(search.toLowerCase()))
    : products;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.product_id) { setError("Select a product."); return; }
    if (form.quantity <= 0) { setError("Quantity must be positive."); return; }
    setError(null); setSuccess(null); setSaving(true);

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    // quantity is always stored as the actual delta
    const actualQty = form.type === "out" ? -form.quantity : form.quantity;

    const { error: err } = await supabase.from("stock_movements").insert({
      business_id: businessId,
      product_id: form.product_id,
      type: form.type,
      quantity: actualQty,
      reference_type: "manual",
      note: form.note || null,
      created_by: user?.id,
    });

    if (err) { setError(err.message); setSaving(false); return; }

    await supabase.rpc("insert_audit_log", {
      p_business_id: businessId, p_action: "stock_" + form.type, p_entity_type: "product",
      p_entity_id: form.product_id, p_before: null,
      p_after: { type: form.type, quantity: form.quantity, note: form.note },
    });

    setSuccess(`Stock ${form.type === "out" ? "decreased" : "increased"} by ${form.quantity} for ${selectedProduct?.name}`);
    setForm({ product_id: "", type: "in", quantity: 0, note: "" });
    setSaving(false);

    // Refresh product data
    const { data } = await supabase.from("products").select("id, name, sku, current_stock, unit").eq("business_id", businessId).eq("is_active", true).order("name");
    if (data) setProducts(data as Product[]);
  }

  return (
    <div style={{ padding: "40px", maxWidth: "640px" }}>
      <div className="ge-animate-in">
        <h1 style={{ fontSize: "1.5rem", fontWeight: 700, color: "var(--ge-text-primary)", letterSpacing: "-0.02em", marginBottom: "4px" }}>Stock Adjustment</h1>
        <p style={{ fontSize: "0.875rem", color: "var(--ge-text-secondary)", marginBottom: "32px" }}>Record manual stock in, stock out, or inventory adjustment.</p>

        {error && <div className="ge-error" style={{ marginBottom: "20px" }}>{error}</div>}
        {success && <div className="ge-success" style={{ marginBottom: "20px" }}>{success}</div>}

        <form onSubmit={handleSubmit}>
          {/* Type selector */}
          <div style={{ marginBottom: "24px" }}>
            <label className="ge-label">Movement type</label>
            <div style={{ display: "flex", gap: "8px" }}>
              {(["in", "out", "adjustment"] as const).map((t) => (
                <button key={t} type="button" onClick={() => setForm((f) => ({ ...f, type: t }))} style={{
                  flex: 1, padding: "10px", borderRadius: "var(--ge-radius)", border: form.type === t ? "2px solid var(--ge-accent)" : "1px solid var(--ge-border)",
                  background: form.type === t ? "var(--ge-accent-soft)" : "transparent", color: form.type === t ? "var(--ge-accent)" : "var(--ge-text-secondary)",
                  fontSize: "0.875rem", fontWeight: 600, cursor: "pointer", transition: "all var(--ge-transition)", textTransform: "capitalize",
                }}>
                  {t === "in" ? "📥 Stock In" : t === "out" ? "📤 Stock Out" : "🔄 Adjustment"}
                </button>
              ))}
            </div>
          </div>

          {/* Product selector */}
          <div style={{ marginBottom: "20px" }}>
            <label className="ge-label">Product</label>
            <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search products…" className="ge-input" style={{ marginBottom: "8px" }} />
            {(search || !form.product_id) && (
              <div style={{ maxHeight: "200px", overflow: "auto", border: "1px solid var(--ge-border)", borderRadius: "var(--ge-radius)", background: "var(--ge-bg-card)" }}>
                {filteredProducts.map((p) => (
                  <button key={p.id} type="button" onClick={() => { setForm((f) => ({ ...f, product_id: p.id })); setSearch(""); }} style={{
                    display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%", padding: "10px 12px", border: "none",
                    borderBottom: "1px solid var(--ge-border)", background: form.product_id === p.id ? "var(--ge-accent-soft)" : "transparent",
                    color: "var(--ge-text-primary)", fontSize: "0.875rem", cursor: "pointer", textAlign: "left",
                  }}>
                    <span>{p.name} {p.sku ? `(${p.sku})` : ""}</span>
                    <span style={{ fontSize: "0.75rem", color: "var(--ge-text-muted)", fontFamily: "monospace" }}>{p.current_stock} {p.unit}</span>
                  </button>
                ))}
              </div>
            )}
            {selectedProduct && !search && (
              <div style={{ padding: "10px 12px", border: "1px solid var(--ge-accent)", borderRadius: "var(--ge-radius)", background: "var(--ge-accent-soft)", display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontWeight: 500, color: "var(--ge-text-primary)" }}>{selectedProduct.name}</span>
                <span style={{ fontFamily: "monospace", color: "var(--ge-accent)" }}>Current: {selectedProduct.current_stock} {selectedProduct.unit}</span>
              </div>
            )}
          </div>

          {/* Quantity */}
          <div style={{ marginBottom: "20px" }}>
            <label className="ge-label">Quantity</label>
            <input type="number" value={form.quantity || ""} onChange={(e) => setForm((f) => ({ ...f, quantity: parseFloat(e.target.value) || 0 }))} placeholder="0" className="ge-input" min={0} step="1" />
            {selectedProduct && form.quantity > 0 && (
              <div style={{ fontSize: "0.8125rem", marginTop: "6px", color: form.type === "out" ? "var(--ge-error)" : "var(--ge-success)" }}>
                New stock: {selectedProduct.current_stock + (form.type === "out" ? -form.quantity : form.quantity)} {selectedProduct.unit}
              </div>
            )}
          </div>

          {/* Note */}
          <div style={{ marginBottom: "24px" }}>
            <label className="ge-label">Note (optional)</label>
            <input type="text" value={form.note} onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))} placeholder="Reason for adjustment" className="ge-input" />
          </div>

          <div style={{ display: "flex", gap: "12px" }}>
            <button type="button" onClick={() => router.back()} className="ge-btn-secondary" style={{ flex: 1 }}>Cancel</button>
            <button type="submit" disabled={saving} className="ge-btn-primary" style={{ flex: 1 }}>
              <span>{saving ? "Saving…" : "Record movement"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
