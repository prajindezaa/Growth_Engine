"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Customer } from "@/lib/types";

const INDIAN_STATES = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh",
  "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka",
  "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram",
  "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu",
  "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal",
  "Delhi", "Jammu and Kashmir", "Ladakh", "Puducherry", "Chandigarh",
];

export default function EditCustomerPage() {
  const params = useParams();
  const router = useRouter();
  const businessId = params.businessId as string;
  const customerId = params.customerId as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [original, setOriginal] = useState<Customer | null>(null);

  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    address: "",
    gstin: "",
    state: "",
    credit_limit: 0,
    payment_terms: 30,
    opening_balance: 0,
    customer_type: "regular",
    notes: "",
  });

  useEffect(() => {
    loadCustomer();
  }, [customerId]);

  async function loadCustomer() {
    const supabase = createClient();
    const { data } = await supabase
      .from("customers")
      .select("*")
      .eq("id", customerId)
      .eq("business_id", businessId)
      .single();

    if (data) {
      const c = data as Customer;
      setOriginal(c);
      setForm({
        name: c.name,
        phone: c.phone || "",
        email: c.email || "",
        address: c.address || "",
        gstin: c.gstin || "",
        state: c.state || "",
        credit_limit: c.credit_limit,
        payment_terms: c.payment_terms,
        opening_balance: c.opening_balance,
        customer_type: c.customer_type,
        notes: c.notes || "",
      });
    }
    setLoading(false);
  }

  function update(fields: Partial<typeof form>) {
    setForm((prev) => ({ ...prev, ...fields }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) {
      setError("Customer name is required.");
      return;
    }

    setError(null);
    setSuccess(null);
    setSaving(true);

    const supabase = createClient();

    const updates = {
      name: form.name,
      phone: form.phone || null,
      email: form.email || null,
      address: form.address || null,
      gstin: form.gstin || null,
      state: form.state || null,
      credit_limit: form.credit_limit,
      payment_terms: form.payment_terms,
      opening_balance: form.opening_balance,
      customer_type: form.customer_type,
      notes: form.notes || null,
    };

    const { error: err } = await supabase
      .from("customers")
      .update(updates)
      .eq("id", customerId);

    if (err) {
      setError(err.message);
      setSaving(false);
      return;
    }

    // Audit log
    await supabase.rpc("insert_audit_log", {
      p_business_id: businessId,
      p_action: "update",
      p_entity_type: "customer",
      p_entity_id: customerId,
      p_before: original ? { name: original.name, phone: original.phone, email: original.email } : null,
      p_after: { name: form.name, phone: form.phone, email: form.email },
    });

    setSuccess("Customer updated successfully.");
    setSaving(false);
    router.refresh();
  }

  if (loading) {
    return (
      <div style={{ padding: "60px 40px", display: "flex", justifyContent: "center" }}>
        <span className="ge-spinner" />
      </div>
    );
  }

  return (
    <div style={{ padding: "40px", maxWidth: "640px" }}>
      <div className="ge-animate-in">
        <h1
          style={{
            fontSize: "1.5rem",
            fontWeight: 700,
            color: "var(--ge-text-primary)",
            letterSpacing: "-0.02em",
            marginBottom: "4px",
          }}
        >
          Edit Customer
        </h1>
        <p
          style={{
            fontSize: "0.875rem",
            color: "var(--ge-text-secondary)",
            marginBottom: "32px",
          }}
        >
          Update {original?.name || "customer"} details.
        </p>

        {error && <div className="ge-error" style={{ marginBottom: "20px" }}>{error}</div>}
        {success && <div className="ge-success" style={{ marginBottom: "20px" }}>{success}</div>}

        <form onSubmit={handleSubmit}>
          <Section title="Basic Info">
            <div>
              <label className="ge-label">Customer name *</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => update({ name: e.target.value })}
                className="ge-input"
              />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
              <div>
                <label className="ge-label">Phone</label>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={(e) => update({ phone: e.target.value })}
                  className="ge-input"
                />
              </div>
              <div>
                <label className="ge-label">Email</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => update({ email: e.target.value })}
                  className="ge-input"
                />
              </div>
            </div>
            <div>
              <label className="ge-label">Address</label>
              <textarea
                value={form.address}
                onChange={(e) => update({ address: e.target.value })}
                className="ge-input"
                rows={3}
                style={{ resize: "vertical", minHeight: "80px" }}
              />
            </div>
            <div>
              <label className="ge-label">Customer type</label>
              <select
                value={form.customer_type}
                onChange={(e) => update({ customer_type: e.target.value })}
                className="ge-input"
              >
                <option value="regular">Regular</option>
                <option value="wholesale">Wholesale</option>
                <option value="distributor">Distributor</option>
              </select>
            </div>
          </Section>

          <Section title="GST Details">
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
              <div>
                <label className="ge-label">GSTIN</label>
                <input
                  type="text"
                  value={form.gstin}
                  onChange={(e) => update({ gstin: e.target.value.toUpperCase() })}
                  className="ge-input"
                  maxLength={15}
                />
              </div>
              <div>
                <label className="ge-label">State</label>
                <select
                  value={form.state}
                  onChange={(e) => update({ state: e.target.value })}
                  className="ge-input"
                >
                  <option value="">Select state</option>
                  {INDIAN_STATES.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
            </div>
          </Section>

          <Section title="Financial">
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px" }}>
              <div>
                <label className="ge-label">Credit limit (₹)</label>
                <input
                  type="number"
                  value={form.credit_limit}
                  onChange={(e) => update({ credit_limit: parseFloat(e.target.value) || 0 })}
                  className="ge-input"
                  min={0}
                />
              </div>
              <div>
                <label className="ge-label">Payment terms (days)</label>
                <input
                  type="number"
                  value={form.payment_terms}
                  onChange={(e) => update({ payment_terms: parseInt(e.target.value) || 30 })}
                  className="ge-input"
                  min={0}
                />
              </div>
              <div>
                <label className="ge-label">Opening balance (₹)</label>
                <input
                  type="number"
                  value={form.opening_balance}
                  onChange={(e) => update({ opening_balance: parseFloat(e.target.value) || 0 })}
                  className="ge-input"
                />
              </div>
            </div>
          </Section>

          <Section title="Notes">
            <div>
              <textarea
                value={form.notes}
                onChange={(e) => update({ notes: e.target.value })}
                placeholder="Internal notes"
                className="ge-input"
                rows={3}
                style={{ resize: "vertical", minHeight: "80px" }}
              />
            </div>
          </Section>

          <div style={{ display: "flex", gap: "12px", marginTop: "32px" }}>
            <button
              type="button"
              onClick={() => router.back()}
              className="ge-btn-secondary"
              style={{ flex: 1 }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="ge-btn-primary"
              style={{ flex: 1 }}
            >
              <span>
                {saving ? (
                  <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
                    <span className="ge-spinner" />Saving…
                  </span>
                ) : (
                  "Save changes"
                )}
              </span>
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
      <h2
        style={{
          fontSize: "1rem",
          fontWeight: 600,
          color: "var(--ge-text-primary)",
          marginBottom: "16px",
          paddingBottom: "8px",
          borderBottom: "1px solid var(--ge-border)",
        }}
      >
        {title}
      </h2>
      <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
        {children}
      </div>
    </div>
  );
}
