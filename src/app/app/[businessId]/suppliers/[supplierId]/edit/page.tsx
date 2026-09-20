"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Supplier } from "@/lib/types";

export default function EditSupplierPage() {
  const params = useParams();
  const router = useRouter();
  const businessId = params.businessId as string;
  const supplierId = params.supplierId as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [original, setOriginal] = useState<Supplier | null>(null);
  const [form, setForm] = useState({
    name: "", phone: "", email: "", address: "", gstin: "",
    credit_terms: 30, opening_balance: 0, notes: "",
  });

  useEffect(() => { loadSupplier(); }, [supplierId]);

  async function loadSupplier() {
    const supabase = createClient();
    const { data } = await supabase.from("suppliers").select("*").eq("id", supplierId).eq("business_id", businessId).single();
    if (data) {
      const s = data as Supplier;
      setOriginal(s);
      setForm({
        name: s.name, phone: s.phone || "", email: s.email || "",
        address: s.address || "", gstin: s.gstin || "",
        credit_terms: s.credit_terms, opening_balance: s.opening_balance,
        notes: s.notes || "",
      });
    }
    setLoading(false);
  }

  function update(f: Partial<typeof form>) { setForm((p) => ({ ...p, ...f })); }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) { setError("Supplier name is required."); return; }
    setError(null); setSaving(true);

    const supabase = createClient();
    const { error: err } = await supabase.from("suppliers").update({
      name: form.name, phone: form.phone || null, email: form.email || null,
      address: form.address || null, gstin: form.gstin || null,
      credit_terms: form.credit_terms, opening_balance: form.opening_balance,
      notes: form.notes || null,
    }).eq("id", supplierId);

    if (err) { setError(err.message); setSaving(false); return; }

    await supabase.rpc("insert_audit_log", {
      p_business_id: businessId, p_action: "update", p_entity_type: "supplier",
      p_entity_id: supplierId,
      p_before: original ? { name: original.name, phone: original.phone } : null,
      p_after: { name: form.name, phone: form.phone },
    });

    router.push(`/app/${businessId}/suppliers/${supplierId}`);
  }

  if (loading) return <div style={{ padding: "60px 40px", display: "flex", justifyContent: "center" }}><span className="ge-spinner" /></div>;

  return (
    <div style={{ padding: "40px", maxWidth: "640px" }}>
      <div className="ge-animate-in">
        <h1 style={{ fontSize: "1.5rem", fontWeight: 700, color: "var(--ge-text-primary)", letterSpacing: "-0.02em", marginBottom: "4px" }}>Edit Supplier</h1>
        <p style={{ fontSize: "0.875rem", color: "var(--ge-text-secondary)", marginBottom: "32px" }}>Update {original?.name || "supplier"} details.</p>

        {error && <div className="ge-error" style={{ marginBottom: "20px" }}>{error}</div>}

        <form onSubmit={handleSubmit}>
          <Section title="Basic Info">
            <div>
              <label className="ge-label">Supplier name *</label>
              <input type="text" value={form.name} onChange={(e) => update({ name: e.target.value })} className="ge-input" />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
              <div>
                <label className="ge-label">Phone</label>
                <input type="tel" value={form.phone} onChange={(e) => update({ phone: e.target.value })} className="ge-input" />
              </div>
              <div>
                <label className="ge-label">Email</label>
                <input type="email" value={form.email} onChange={(e) => update({ email: e.target.value })} className="ge-input" />
              </div>
            </div>
            <div>
              <label className="ge-label">Address</label>
              <textarea value={form.address} onChange={(e) => update({ address: e.target.value })} className="ge-input" rows={3} style={{ resize: "vertical", minHeight: "80px" }} />
            </div>
          </Section>

          <Section title="GST & Terms">
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
              <div>
                <label className="ge-label">GSTIN</label>
                <input type="text" value={form.gstin} onChange={(e) => update({ gstin: e.target.value.toUpperCase() })} className="ge-input" maxLength={15} />
              </div>
              <div>
                <label className="ge-label">Credit terms (days)</label>
                <input type="number" value={form.credit_terms} onChange={(e) => update({ credit_terms: parseInt(e.target.value) || 30 })} className="ge-input" min={0} />
              </div>
            </div>
            <div>
              <label className="ge-label">Opening balance (₹)</label>
              <input type="number" value={form.opening_balance} onChange={(e) => update({ opening_balance: parseFloat(e.target.value) || 0 })} className="ge-input" />
            </div>
          </Section>

          <Section title="Notes">
            <textarea value={form.notes} onChange={(e) => update({ notes: e.target.value })} placeholder="Internal notes" className="ge-input" rows={3} style={{ resize: "vertical", minHeight: "80px" }} />
          </Section>

          <div style={{ display: "flex", gap: "12px", marginTop: "32px" }}>
            <button type="button" onClick={() => router.back()} className="ge-btn-secondary" style={{ flex: 1 }}>Cancel</button>
            <button type="submit" disabled={saving} className="ge-btn-primary" style={{ flex: 1 }}>
              <span>{saving ? "Saving…" : "Save changes"}</span>
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
