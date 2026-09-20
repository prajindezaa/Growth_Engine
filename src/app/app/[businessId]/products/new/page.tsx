"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Supplier } from "@/lib/types";

export default function NewProductPage() {
  const params = useParams();
  const router = useRouter();
  const businessId = params.businessId as string;

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [imageFile, setImageFile] = useState<File | null>(null);

  const [form, setForm] = useState({
    name: "", sku: "", barcode: "", category: "", unit: "pcs",
    purchase_price: 0, selling_price: 0, tax_rate: 18,
    current_stock: 0, min_stock: 0, max_stock: 0,
    supplier_id: "", hsn_sac: "", is_active: true,
  });

  useEffect(() => {
    const supabase = createClient();
    supabase.from("suppliers").select("id, name").eq("business_id", businessId).order("name").then(({ data }) => {
      if (data) setSuppliers(data as Supplier[]);
    });
  }, [businessId]);

  function update(f: Partial<typeof form>) { setForm((p) => ({ ...p, ...f })); }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) { setError("Product name is required."); return; }
    setError(null); setSaving(true);

    const supabase = createClient();
    let image_url: string | null = null;

    // Upload image if selected
    if (imageFile) {
      const ext = imageFile.name.split(".").pop();
      const path = `${businessId}/${crypto.randomUUID()}.${ext}`;
      const { error: uploadErr } = await supabase.storage.from("product-images").upload(path, imageFile);
      if (uploadErr) { setError(`Image upload failed: ${uploadErr.message}`); setSaving(false); return; }
      const { data: urlData } = supabase.storage.from("product-images").getPublicUrl(path);
      image_url = urlData.publicUrl;
    }

    const { data: product, error: err } = await supabase
      .from("products")
      .insert({
        business_id: businessId,
        name: form.name,
        sku: form.sku || null,
        barcode: form.barcode || null,
        category: form.category || null,
        unit: form.unit,
        purchase_price: form.purchase_price,
        selling_price: form.selling_price,
        tax_rate: form.tax_rate,
        current_stock: form.current_stock,
        min_stock: form.min_stock,
        max_stock: form.max_stock,
        supplier_id: form.supplier_id || null,
        hsn_sac: form.hsn_sac || null,
        image_url,
        is_active: form.is_active,
      })
      .select("id")
      .single();

    if (err) {
      if (err.message.includes("idx_products_sku_unique")) setError("This SKU is already in use.");
      else if (err.message.includes("idx_products_barcode_unique")) setError("This barcode is already in use.");
      else setError(err.message);
      setSaving(false);
      return;
    }

    if (product) {
      await supabase.rpc("insert_audit_log", {
        p_business_id: businessId, p_action: "create", p_entity_type: "product",
        p_entity_id: product.id, p_before: null,
        p_after: { name: form.name, sku: form.sku, selling_price: form.selling_price },
      });
    }

    router.push(`/app/${businessId}/products/${product?.id}`);
  }

  return (
    <div style={{ padding: "40px", maxWidth: "640px" }}>
      <div className="ge-animate-in">
        <h1 style={{ fontSize: "1.5rem", fontWeight: 700, color: "var(--ge-text-primary)", letterSpacing: "-0.02em", marginBottom: "4px" }}>New Product</h1>
        <p style={{ fontSize: "0.875rem", color: "var(--ge-text-secondary)", marginBottom: "32px" }}>Add a new product to your inventory.</p>

        {error && <div className="ge-error" style={{ marginBottom: "20px" }}>{error}</div>}

        <form onSubmit={handleSubmit}>
          <Section title="Basic Info">
            <div>
              <label className="ge-label">Product name *</label>
              <input type="text" value={form.name} onChange={(e) => update({ name: e.target.value })} placeholder="Product name" className="ge-input" autoFocus />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px" }}>
              <div>
                <label className="ge-label">SKU</label>
                <input type="text" value={form.sku} onChange={(e) => update({ sku: e.target.value })} placeholder="PRD-001" className="ge-input" />
              </div>
              <div>
                <label className="ge-label">Barcode</label>
                <input type="text" value={form.barcode} onChange={(e) => update({ barcode: e.target.value })} placeholder="8901234567890" className="ge-input" />
              </div>
              <div>
                <label className="ge-label">Unit</label>
                <select value={form.unit} onChange={(e) => update({ unit: e.target.value })} className="ge-input">
                  <option value="pcs">Pieces</option>
                  <option value="kg">Kilograms</option>
                  <option value="g">Grams</option>
                  <option value="l">Litres</option>
                  <option value="ml">Millilitres</option>
                  <option value="m">Metres</option>
                  <option value="box">Box</option>
                  <option value="pack">Pack</option>
                  <option value="dozen">Dozen</option>
                </select>
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
              <div>
                <label className="ge-label">Category</label>
                <input type="text" value={form.category} onChange={(e) => update({ category: e.target.value })} placeholder="e.g., Electronics" className="ge-input" />
              </div>
              <div>
                <label className="ge-label">HSN/SAC</label>
                <input type="text" value={form.hsn_sac} onChange={(e) => update({ hsn_sac: e.target.value })} placeholder="84713010" className="ge-input" />
              </div>
            </div>
          </Section>

          <Section title="Pricing">
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px" }}>
              <div>
                <label className="ge-label">Purchase price (₹)</label>
                <input type="number" value={form.purchase_price} onChange={(e) => update({ purchase_price: parseFloat(e.target.value) || 0 })} className="ge-input" min={0} step="0.01" />
              </div>
              <div>
                <label className="ge-label">Selling price (₹)</label>
                <input type="number" value={form.selling_price} onChange={(e) => update({ selling_price: parseFloat(e.target.value) || 0 })} className="ge-input" min={0} step="0.01" />
              </div>
              <div>
                <label className="ge-label">Tax rate (%)</label>
                <input type="number" value={form.tax_rate} onChange={(e) => update({ tax_rate: parseFloat(e.target.value) || 0 })} className="ge-input" min={0} max={100} step="0.5" />
              </div>
            </div>
            {form.selling_price > 0 && form.purchase_price > 0 && (
              <div style={{ fontSize: "0.8125rem", color: "var(--ge-success)", marginTop: "-4px" }}>
                Margin: ₹{(form.selling_price - form.purchase_price).toFixed(2)} ({((form.selling_price - form.purchase_price) / form.purchase_price * 100).toFixed(1)}%)
              </div>
            )}
          </Section>

          <Section title="Stock">
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px" }}>
              <div>
                <label className="ge-label">Current stock</label>
                <input type="number" value={form.current_stock} onChange={(e) => update({ current_stock: parseFloat(e.target.value) || 0 })} className="ge-input" min={0} />
              </div>
              <div>
                <label className="ge-label">Min stock (alert)</label>
                <input type="number" value={form.min_stock} onChange={(e) => update({ min_stock: parseFloat(e.target.value) || 0 })} className="ge-input" min={0} />
              </div>
              <div>
                <label className="ge-label">Max stock</label>
                <input type="number" value={form.max_stock} onChange={(e) => update({ max_stock: parseFloat(e.target.value) || 0 })} className="ge-input" min={0} />
              </div>
            </div>
          </Section>

          <Section title="Supplier & Image">
            <div>
              <label className="ge-label">Supplier</label>
              <select value={form.supplier_id} onChange={(e) => update({ supplier_id: e.target.value })} className="ge-input">
                <option value="">No supplier</option>
                {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <label className="ge-label">Product image</label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setImageFile(e.target.files?.[0] || null)}
                className="ge-input"
                style={{ padding: "10px" }}
              />
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <input
                type="checkbox"
                checked={form.is_active}
                onChange={(e) => update({ is_active: e.target.checked })}
                id="is_active"
                style={{ accentColor: "var(--ge-accent)" }}
              />
              <label htmlFor="is_active" style={{ fontSize: "0.875rem", color: "var(--ge-text-secondary)" }}>Active (visible in listings)</label>
            </div>
          </Section>

          <div style={{ display: "flex", gap: "12px", marginTop: "32px" }}>
            <button type="button" onClick={() => router.back()} className="ge-btn-secondary" style={{ flex: 1 }}>Cancel</button>
            <button type="submit" disabled={saving} className="ge-btn-primary" style={{ flex: 1 }}>
              <span>{saving ? "Saving…" : "Create product"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: "28px" }}>
      <h2 style={{ fontSize: "1rem", fontWeight: 600, color: "var(--ge-text-primary)", marginBottom: "16px", paddingBottom: "8px", borderBottom: "1px solid var(--ge-border)" }}>{title}</h2>
      <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>{children}</div>
    </div>
  );
}
