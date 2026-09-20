"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Supplier } from "@/lib/types";
import Link from "next/link";

const TABS = [
  { key: "overview", label: "Overview", icon: "📋" },
  { key: "purchases", label: "Purchases", icon: "🛒" },
  { key: "payments", label: "Payments", icon: "💳" },
  { key: "outstanding", label: "Outstanding", icon: "⏳" },
];

export default function SupplierDetailPage() {
  const params = useParams();
  const router = useRouter();
  const businessId = params.businessId as string;
  const supplierId = params.supplierId as string;

  const [supplier, setSupplier] = useState<Supplier | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  const [notes, setNotes] = useState("");
  const [savingNotes, setSavingNotes] = useState(false);

  useEffect(() => { loadSupplier(); }, [supplierId]);

  async function loadSupplier() {
    const supabase = createClient();
    const { data } = await supabase.from("suppliers").select("*").eq("id", supplierId).eq("business_id", businessId).single();
    if (data) { setSupplier(data as Supplier); setNotes(data.notes || ""); }
    setLoading(false);
  }

  async function saveNotes() {
    if (!supplier) return;
    setSavingNotes(true);
    const supabase = createClient();
    await supabase.from("suppliers").update({ notes: notes || null }).eq("id", supplierId);
    await supabase.rpc("insert_audit_log", {
      p_business_id: businessId, p_action: "update", p_entity_type: "supplier",
      p_entity_id: supplierId, p_before: { notes: supplier.notes }, p_after: { notes },
    });
    setSupplier({ ...supplier, notes: notes || null });
    setSavingNotes(false);
  }

  if (loading) return <div style={{ padding: "60px 40px", display: "flex", justifyContent: "center" }}><span className="ge-spinner" /></div>;
  if (!supplier) return <div style={{ padding: "60px 40px", color: "var(--ge-text-muted)" }}>Supplier not found.</div>;

  return (
    <div style={{ padding: "40px" }}>
      <div className="ge-animate-in">
        {/* Header */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "32px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            <div style={{ width: "56px", height: "56px", borderRadius: "var(--ge-radius-full)", background: "var(--ge-gradient-subtle)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.125rem", fontWeight: 700, color: "var(--ge-accent)", flexShrink: 0 }}>
              {supplier.name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2)}
            </div>
            <div>
              <h1 style={{ fontSize: "1.5rem", fontWeight: 700, color: "var(--ge-text-primary)", letterSpacing: "-0.02em", marginBottom: "4px" }}>{supplier.name}</h1>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <span style={{ padding: "2px 10px", borderRadius: "var(--ge-radius-full)", fontSize: "0.6875rem", fontWeight: 600, background: "rgba(139,92,246,0.12)", color: "#a78bfa" }}>Supplier</span>
                {supplier.outstanding_balance > 0 && (
                  <span style={{ fontSize: "0.8125rem", fontWeight: 600, color: "var(--ge-error)", fontFamily: "monospace" }}>
                    ₹{supplier.outstanding_balance.toLocaleString("en-IN")} outstanding
                  </span>
                )}
              </div>
            </div>
          </div>
          <Link href={`/app/${businessId}/suppliers/${supplierId}/edit`} className="ge-btn-secondary" style={{ width: "auto", padding: "8px 16px", fontSize: "0.8125rem", textDecoration: "none" }}>Edit</Link>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: "2px", borderBottom: "1px solid var(--ge-border)", marginBottom: "24px", overflowX: "auto" }}>
          {TABS.map((tab) => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)} style={{
              padding: "10px 16px", fontSize: "0.8125rem", fontWeight: 500,
              color: activeTab === tab.key ? "var(--ge-accent)" : "var(--ge-text-muted)",
              background: "transparent", border: "none",
              borderBottom: activeTab === tab.key ? "2px solid var(--ge-accent)" : "2px solid transparent",
              cursor: "pointer", transition: "all var(--ge-transition)", whiteSpace: "nowrap",
              display: "flex", alignItems: "center", gap: "6px",
            }}>
              <span>{tab.icon}</span>{tab.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="ge-animate-in" key={activeTab}>
          {activeTab === "overview" && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
              <InfoCard label="Phone" value={supplier.phone || "—"} />
              <InfoCard label="Email" value={supplier.email || "—"} />
              <InfoCard label="Address" value={supplier.address || "—"} />
              <InfoCard label="GSTIN" value={supplier.gstin || "—"} />
              <InfoCard label="Credit Terms" value={`${supplier.credit_terms} days`} />
              <InfoCard label="Opening Balance" value={`₹${supplier.opening_balance.toLocaleString("en-IN")}`} />
            </div>
          )}
          {activeTab === "purchases" && <EmptyState icon="🛒" title="No purchases yet" desc="Purchase orders from this supplier will appear here." />}
          {activeTab === "payments" && <EmptyState icon="💳" title="No payments yet" desc="Payment history for this supplier will appear here." />}
          {activeTab === "outstanding" && <EmptyState icon="⏳" title="No outstanding items" desc="Outstanding balances and dues will be tracked here." />}
        </div>

        {/* Notes section below tabs */}
        <div style={{ marginTop: "32px" }}>
          <h3 style={{ fontSize: "1rem", fontWeight: 600, color: "var(--ge-text-primary)", marginBottom: "12px" }}>Notes</h3>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Add internal notes about this supplier…" className="ge-input" rows={4} style={{ resize: "vertical", minHeight: "100px", marginBottom: "12px" }} />
          <button type="button" onClick={saveNotes} disabled={savingNotes || notes === (supplier.notes || "")} className="ge-btn-primary" style={{ maxWidth: "160px" }}>
            <span>{savingNotes ? "Saving…" : "Save notes"}</span>
          </button>
        </div>
      </div>
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

function EmptyState({ icon, title, desc }: { icon: string; title: string; desc: string }) {
  return (
    <div style={{ background: "var(--ge-bg-card)", border: "1px solid var(--ge-border)", borderRadius: "var(--ge-radius-lg)", padding: "48px 32px", textAlign: "center", backdropFilter: "blur(20px)" }}>
      <div style={{ fontSize: "2rem", marginBottom: "12px" }}>{icon}</div>
      <h3 style={{ fontSize: "1rem", fontWeight: 600, color: "var(--ge-text-primary)", marginBottom: "6px" }}>{title}</h3>
      <p style={{ fontSize: "0.875rem", color: "var(--ge-text-secondary)" }}>{desc}</p>
    </div>
  );
}
