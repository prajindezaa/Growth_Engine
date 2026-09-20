"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Supplier, Product } from "@/lib/types";

interface DraftLine {
  key: string;
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  tax_rate: number;
  discount: number;
}

function computeLineTotal(l: DraftLine) {
  return (l.quantity * l.unit_price - l.discount) * (1 + l.tax_rate / 100);
}

export default function NewPurchaseOrderPage() {
  const params = useParams();
  const router = useRouter();
  const businessId = params.businessId as string;

  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [supplierId, setSupplierId] = useState("");
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<DraftLine[]>([]);
  const [productSearch, setProductSearch] = useState("");

  useEffect(() => {
    const supabase = createClient();
    supabase.from("suppliers").select("id, name").eq("business_id", businessId).order("name").then(({ data }) => {
      if (data) setSuppliers(data as Supplier[]);
    });
    supabase.from("products").select("*").eq("business_id", businessId).eq("is_active", true).order("name").then(({ data }) => {
      if (data) setProducts(data as Product[]);
    });
  }, [businessId]);

  function addProduct(p: Product) {
    setLines((prev) => [...prev, {
      key: crypto.randomUUID(), product_id: p.id, product_name: p.name,
      quantity: 1, unit_price: p.purchase_price, tax_rate: p.tax_rate, discount: 0,
    }]);
    setProductSearch("");
  }

  function updateLine(key: string, fields: Partial<DraftLine>) {
    setLines((prev) => prev.map((l) => l.key === key ? { ...l, ...fields } : l));
  }

  function removeLine(key: string) {
    setLines((prev) => prev.filter((l) => l.key !== key));
  }

  const subtotal = lines.reduce((s, l) => s + l.quantity * l.unit_price, 0);
  const taxTotal = lines.reduce((s, l) => s + l.quantity * l.unit_price * l.tax_rate / 100, 0);
  const discountTotal = lines.reduce((s, l) => s + l.discount, 0);
  const grandTotal = lines.reduce((s, l) => s + computeLineTotal(l), 0);

  const filteredProducts = productSearch.trim()
    ? products.filter((p) => p.name.toLowerCase().includes(productSearch.toLowerCase()) || (p.sku || "").toLowerCase().includes(productSearch.toLowerCase()))
    : [];

  async function handleSubmit() {
    if (!supplierId) { setError("Select a supplier."); return; }
    if (lines.length === 0) { setError("Add at least one line item."); return; }
    setError(null); setSaving(true);

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const { data: numData } = await supabase.rpc("next_document_number", {
      p_business_id: businessId, p_prefix: "PO", p_table: "purchase_orders",
    });
    const orderNumber = numData || `PO-${Date.now()}`;

    const { data: po, error: err } = await supabase.from("purchase_orders").insert({
      business_id: businessId, supplier_id: supplierId, order_number: orderNumber,
      status: "confirmed", subtotal, tax_total: taxTotal, discount_total: discountTotal,
      grand_total: grandTotal, notes: notes || null, created_by: user?.id,
    }).select("id").single();

    if (err) { setError(err.message); setSaving(false); return; }
    if (!po) { setError("Failed to create PO."); setSaving(false); return; }

    const lineItems = lines.map((l, i) => ({
      business_id: businessId, parent_type: "purchase_order" as const, parent_id: po.id,
      product_id: l.product_id, product_name: l.product_name, quantity: l.quantity,
      unit_price: l.unit_price, tax_rate: l.tax_rate, discount: l.discount,
      line_total: computeLineTotal(l), sort_order: i,
    }));

    await supabase.from("line_items").insert(lineItems);
    await supabase.rpc("compute_document_totals", { p_parent_type: "purchase_order", p_parent_id: po.id });

    router.push(`/app/${businessId}/purchases/orders/${po.id}`);
  }

  return (
    <div style={{ padding: "40px" }}>
      <div className="ge-animate-in">
        <h1 style={{ fontSize: "1.5rem", fontWeight: 700, color: "var(--ge-text-primary)", letterSpacing: "-0.02em", marginBottom: "4px" }}>New Purchase Order</h1>
        <p style={{ fontSize: "0.875rem", color: "var(--ge-text-secondary)", marginBottom: "32px" }}>Create a purchase order for a supplier.</p>

        {error && <div className="ge-error" style={{ marginBottom: "20px" }}>{error}</div>}

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "28px" }}>
          <div>
            <label className="ge-label">Supplier *</label>
            <select value={supplierId} onChange={(e) => setSupplierId(e.target.value)} className="ge-input">
              <option value="">Select supplier</option>
              {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
        </div>

        {/* Line items */}
        <div style={{ marginBottom: "28px" }}>
          <h2 style={{ fontSize: "1rem", fontWeight: 600, color: "var(--ge-text-primary)", marginBottom: "16px", paddingBottom: "8px", borderBottom: "1px solid var(--ge-border)" }}>Line Items</h2>
          <div style={{ position: "relative", marginBottom: "16px" }}>
            <input type="text" value={productSearch} onChange={(e) => setProductSearch(e.target.value)} placeholder="Search products to add…" className="ge-input" style={{ maxWidth: "400px" }} />
            {filteredProducts.length > 0 && (
              <div style={{ position: "absolute", top: "100%", left: 0, maxWidth: "400px", maxHeight: "200px", overflow: "auto", background: "var(--ge-bg-card)", border: "1px solid var(--ge-border)", borderRadius: "var(--ge-radius)", zIndex: 10, marginTop: "4px" }}>
                {filteredProducts.map((p) => (
                  <button key={p.id} type="button" onClick={() => addProduct(p)} style={{ display: "flex", justifyContent: "space-between", width: "100%", padding: "10px 12px", border: "none", borderBottom: "1px solid var(--ge-border)", background: "transparent", color: "var(--ge-text-primary)", fontSize: "0.875rem", cursor: "pointer", textAlign: "left" }}>
                    <span>{p.name} {p.sku ? `(${p.sku})` : ""}</span>
                    <span style={{ fontSize: "0.75rem", color: "var(--ge-text-muted)", fontFamily: "monospace" }}>₹{p.purchase_price}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {lines.length > 0 ? (
            <div style={{ background: "var(--ge-bg-card)", border: "1px solid var(--ge-border)", borderRadius: "var(--ge-radius-lg)", overflow: "hidden", marginBottom: "16px" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--ge-border)", fontSize: "0.75rem", color: "var(--ge-text-muted)", textTransform: "uppercase" }}>
                    <th style={{ padding: "10px 12px", textAlign: "left" }}>Product</th>
                    <th style={{ padding: "10px 12px", textAlign: "right", width: "90px" }}>Qty</th>
                    <th style={{ padding: "10px 12px", textAlign: "right", width: "110px" }}>Price</th>
                    <th style={{ padding: "10px 12px", textAlign: "right", width: "70px" }}>Tax%</th>
                    <th style={{ padding: "10px 12px", textAlign: "right", width: "110px" }}>Total</th>
                    <th style={{ padding: "10px 12px", width: "40px" }}></th>
                  </tr>
                </thead>
                <tbody>
                  {lines.map((l) => (
                    <tr key={l.key} style={{ borderBottom: "1px solid var(--ge-border)" }}>
                      <td style={{ padding: "8px 12px", fontSize: "0.875rem", color: "var(--ge-text-primary)", fontWeight: 500 }}>{l.product_name}</td>
                      <td style={{ padding: "8px 4px" }}><input type="number" value={l.quantity} onChange={(e) => updateLine(l.key, { quantity: parseFloat(e.target.value) || 0 })} className="ge-input" style={{ textAlign: "right", padding: "6px 8px", fontSize: "0.8125rem" }} min={0.01} step="1" /></td>
                      <td style={{ padding: "8px 4px" }}><input type="number" value={l.unit_price} onChange={(e) => updateLine(l.key, { unit_price: parseFloat(e.target.value) || 0 })} className="ge-input" style={{ textAlign: "right", padding: "6px 8px", fontSize: "0.8125rem" }} min={0} /></td>
                      <td style={{ padding: "8px 4px" }}><input type="number" value={l.tax_rate} onChange={(e) => updateLine(l.key, { tax_rate: parseFloat(e.target.value) || 0 })} className="ge-input" style={{ textAlign: "right", padding: "6px 8px", fontSize: "0.8125rem" }} min={0} max={100} /></td>
                      <td style={{ padding: "8px 12px", fontSize: "0.875rem", fontFamily: "monospace", fontWeight: 600, textAlign: "right", color: "var(--ge-text-primary)" }}>₹{computeLineTotal(l).toFixed(2)}</td>
                      <td style={{ padding: "8px 8px" }}><button type="button" onClick={() => removeLine(l.key)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "1rem", color: "var(--ge-error)" }}>✕</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div style={{ padding: "32px", textAlign: "center", color: "var(--ge-text-muted)", fontSize: "0.875rem", background: "var(--ge-bg-card)", border: "1px solid var(--ge-border)", borderRadius: "var(--ge-radius-lg)" }}>
              Search and add products above.
            </div>
          )}
        </div>

        {lines.length > 0 && (
          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "28px" }}>
            <div style={{ background: "var(--ge-bg-card)", border: "1px solid var(--ge-border)", borderRadius: "var(--ge-radius)", padding: "16px 24px", minWidth: "280px" }}>
              <TRow label="Subtotal" value={subtotal} />
              <TRow label="Tax" value={taxTotal} />
              {discountTotal > 0 && <TRow label="Discount" value={-discountTotal} />}
              <div style={{ borderTop: "1px solid var(--ge-border)", marginTop: "8px", paddingTop: "8px", display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontWeight: 700, color: "var(--ge-text-primary)" }}>Grand Total</span>
                <span style={{ fontWeight: 700, color: "var(--ge-accent)", fontFamily: "monospace", fontSize: "1.125rem" }}>₹{grandTotal.toFixed(2)}</span>
              </div>
            </div>
          </div>
        )}

        <div style={{ marginBottom: "32px" }}>
          <label className="ge-label">Notes</label>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Additional notes…" className="ge-input" rows={3} style={{ resize: "vertical", minHeight: "80px" }} />
        </div>

        <div style={{ display: "flex", gap: "12px", maxWidth: "400px" }}>
          <button type="button" onClick={() => router.back()} className="ge-btn-secondary" style={{ flex: 1 }}>Cancel</button>
          <button type="button" onClick={handleSubmit} disabled={saving} className="ge-btn-primary" style={{ flex: 1 }}>
            <span>{saving ? "Creating…" : "Create PO"}</span>
          </button>
        </div>
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
