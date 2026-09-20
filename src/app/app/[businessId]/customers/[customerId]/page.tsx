"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Customer } from "@/lib/types";
import Link from "next/link";

const TABS = [
  { key: "overview", label: "Overview", icon: "📋" },
  { key: "orders", label: "Orders", icon: "📦" },
  { key: "invoices", label: "Invoices", icon: "🧾" },
  { key: "payments", label: "Payments", icon: "💳" },
  { key: "outstanding", label: "Outstanding", icon: "⏳" },
  { key: "notes", label: "Notes", icon: "📝" },
];

export default function CustomerDetailPage() {
  const params = useParams();
  const router = useRouter();
  const businessId = params.businessId as string;
  const customerId = params.customerId as string;

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  const [notes, setNotes] = useState("");
  const [savingNotes, setSavingNotes] = useState(false);

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
      setCustomer(data as Customer);
      setNotes(data.notes || "");
    }
    setLoading(false);
  }

  async function saveNotes() {
    if (!customer) return;
    setSavingNotes(true);

    const supabase = createClient();
    const oldNotes = customer.notes;

    await supabase
      .from("customers")
      .update({ notes: notes || null })
      .eq("id", customerId);

    // Audit log
    await supabase.rpc("insert_audit_log", {
      p_business_id: businessId,
      p_action: "update",
      p_entity_type: "customer",
      p_entity_id: customerId,
      p_before: { notes: oldNotes },
      p_after: { notes },
    });

    setCustomer({ ...customer, notes: notes || null });
    setSavingNotes(false);
  }

  if (loading) {
    return (
      <div style={{ padding: "60px 40px", display: "flex", justifyContent: "center" }}>
        <span className="ge-spinner" />
      </div>
    );
  }

  if (!customer) {
    return (
      <div style={{ padding: "60px 40px", color: "var(--ge-text-muted)" }}>
        Customer not found.
      </div>
    );
  }

  return (
    <div style={{ padding: "40px" }}>
      <div className="ge-animate-in">
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            marginBottom: "32px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            {/* Avatar */}
            <div
              style={{
                width: "56px",
                height: "56px",
                borderRadius: "var(--ge-radius-full)",
                background: "var(--ge-gradient-subtle)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "1.125rem",
                fontWeight: 700,
                color: "var(--ge-accent)",
                flexShrink: 0,
              }}
            >
              {customer.name
                .split(" ")
                .map((w) => w[0])
                .join("")
                .toUpperCase()
                .slice(0, 2)}
            </div>
            <div>
              <h1
                style={{
                  fontSize: "1.5rem",
                  fontWeight: 700,
                  color: "var(--ge-text-primary)",
                  letterSpacing: "-0.02em",
                  marginBottom: "4px",
                }}
              >
                {customer.name}
              </h1>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <span
                  style={{
                    padding: "2px 10px",
                    borderRadius: "var(--ge-radius-full)",
                    fontSize: "0.6875rem",
                    fontWeight: 600,
                    textTransform: "capitalize",
                    background:
                      customer.customer_type === "wholesale"
                        ? "rgba(139,92,246,0.12)"
                        : customer.customer_type === "distributor"
                        ? "rgba(52,211,153,0.12)"
                        : "rgba(107,114,128,0.12)",
                    color:
                      customer.customer_type === "wholesale"
                        ? "#a78bfa"
                        : customer.customer_type === "distributor"
                        ? "#34d399"
                        : "#9ca3af",
                  }}
                >
                  {customer.customer_type}
                </span>
                {customer.outstanding_balance > 0 && (
                  <span
                    style={{
                      fontSize: "0.8125rem",
                      fontWeight: 600,
                      color: "var(--ge-error)",
                      fontFamily: "monospace",
                    }}
                  >
                    ₹{customer.outstanding_balance.toLocaleString("en-IN")} outstanding
                  </span>
                )}
              </div>
            </div>
          </div>

          <Link
            href={`/app/${businessId}/customers/${customerId}/edit`}
            className="ge-btn-secondary"
            style={{
              width: "auto",
              padding: "8px 16px",
              fontSize: "0.8125rem",
              textDecoration: "none",
            }}
          >
            Edit
          </Link>
        </div>

        {/* Tabs */}
        <div
          style={{
            display: "flex",
            gap: "2px",
            borderBottom: "1px solid var(--ge-border)",
            marginBottom: "24px",
            overflowX: "auto",
          }}
        >
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              style={{
                padding: "10px 16px",
                fontSize: "0.8125rem",
                fontWeight: 500,
                color: activeTab === tab.key ? "var(--ge-accent)" : "var(--ge-text-muted)",
                background: "transparent",
                border: "none",
                borderBottom:
                  activeTab === tab.key
                    ? "2px solid var(--ge-accent)"
                    : "2px solid transparent",
                cursor: "pointer",
                transition: "all var(--ge-transition)",
                whiteSpace: "nowrap",
                display: "flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              <span>{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="ge-animate-in" key={activeTab}>
          {activeTab === "overview" && (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "16px",
              }}
            >
              <InfoCard label="Phone" value={customer.phone || "—"} />
              <InfoCard label="Email" value={customer.email || "—"} />
              <InfoCard label="Address" value={customer.address || "—"} />
              <InfoCard label="GSTIN" value={customer.gstin || "—"} />
              <InfoCard label="State" value={customer.state || "—"} />
              <InfoCard label="Payment Terms" value={`${customer.payment_terms} days`} />
              <InfoCard
                label="Credit Limit"
                value={`₹${customer.credit_limit.toLocaleString("en-IN")}`}
              />
              <InfoCard
                label="Opening Balance"
                value={`₹${customer.opening_balance.toLocaleString("en-IN")}`}
              />
            </div>
          )}

          {activeTab === "orders" && <EmptyState icon="📦" title="No orders yet" desc="Orders will appear here once the sales module is active." />}
          {activeTab === "invoices" && <EmptyState icon="🧾" title="No invoices yet" desc="Invoices for this customer will appear here." />}
          {activeTab === "payments" && <EmptyState icon="💳" title="No payments yet" desc="Payment history will appear here." />}
          {activeTab === "outstanding" && <EmptyState icon="⏳" title="No outstanding items" desc="Outstanding balances and dues will be tracked here." />}

          {activeTab === "notes" && (
            <div>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add internal notes about this customer…"
                className="ge-input"
                rows={6}
                style={{ resize: "vertical", minHeight: "140px", marginBottom: "16px" }}
              />
              <button
                type="button"
                onClick={saveNotes}
                disabled={savingNotes || notes === (customer.notes || "")}
                className="ge-btn-primary"
                style={{ maxWidth: "160px" }}
              >
                <span>
                  {savingNotes ? "Saving…" : "Save notes"}
                </span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        background: "var(--ge-bg-card)",
        border: "1px solid var(--ge-border)",
        borderRadius: "var(--ge-radius)",
        padding: "16px",
        backdropFilter: "blur(20px)",
      }}
    >
      <div
        style={{
          fontSize: "0.6875rem",
          color: "var(--ge-text-muted)",
          textTransform: "uppercase",
          letterSpacing: "0.04em",
          marginBottom: "4px",
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: "0.9375rem",
          color: "var(--ge-text-primary)",
          fontWeight: 500,
          wordBreak: "break-word",
        }}
      >
        {value}
      </div>
    </div>
  );
}

function EmptyState({ icon, title, desc }: { icon: string; title: string; desc: string }) {
  return (
    <div
      style={{
        background: "var(--ge-bg-card)",
        border: "1px solid var(--ge-border)",
        borderRadius: "var(--ge-radius-lg)",
        padding: "48px 32px",
        textAlign: "center",
        backdropFilter: "blur(20px)",
      }}
    >
      <div style={{ fontSize: "2rem", marginBottom: "12px" }}>{icon}</div>
      <h3
        style={{
          fontSize: "1rem",
          fontWeight: 600,
          color: "var(--ge-text-primary)",
          marginBottom: "6px",
        }}
      >
        {title}
      </h3>
      <p
        style={{
          fontSize: "0.875rem",
          color: "var(--ge-text-secondary)",
        }}
      >
        {desc}
      </p>
    </div>
  );
}
