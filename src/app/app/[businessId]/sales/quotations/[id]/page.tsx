"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Quotation, LineItem } from "@/lib/types";
import { DocumentTemplate, useDocumentPDF, ShareActions } from "@/components/DocumentTemplate";

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  draft: { bg: "rgba(107,114,128,0.12)", text: "#9ca3af" },
  sent: { bg: "rgba(59,130,246,0.12)", text: "#60a5fa" },
  accepted: { bg: "var(--ge-success-bg)", text: "var(--ge-success)" },
  rejected: { bg: "var(--ge-error-bg)", text: "var(--ge-error)" },
  converted: { bg: "rgba(139,92,246,0.12)", text: "#a78bfa" },
};

export default function QuotationDetailPage() {
  const params = useParams();
  const router = useRouter();
  const businessId = params.businessId as string;
  const quotationId = params.id as string;

  const [quotation, setQuotation] = useState<Quotation | null>(null);
  const [lineItems, setLineItems] = useState<LineItem[]>([]);
  const [business, setBusiness] = useState<Record<string, string | null> | null>(null);
  const [loading, setLoading] = useState(true);
  const [converting, setConverting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { templateRef, generatePDF, generating } = useDocumentPDF();

  useEffect(() => { loadData(); }, [quotationId]);

  async function loadData() {
    const supabase = createClient();
    const [{ data: q }, { data: items }, { data: biz }] = await Promise.all([
      supabase.from("quotations").select("*, customers(name, phone, email, address, gstin)").eq("id", quotationId).single(),
      supabase.from("line_items").select("*").eq("parent_type", "quotation").eq("parent_id", quotationId).order("sort_order"),
      supabase.from("businesses").select("name, address, phone, email, gstin, logo_url").eq("id", businessId).single(),
    ]);
    if (q) setQuotation(q as Quotation);
    if (items) setLineItems(items as LineItem[]);
    if (biz) setBusiness(biz as Record<string, string | null>);
    setLoading(false);
  }

  async function convertToOrder() {
    setConverting(true); setError(null);
    const supabase = createClient();
    const { data: orderId, error: err } = await supabase.rpc("convert_quotation_to_order", { p_quotation_id: quotationId });
    if (err) { setError(err.message); setConverting(false); return; }
    router.push(`/app/${businessId}/sales/orders/${orderId}`);
  }

  if (loading) return <div style={{ padding: "60px 40px", display: "flex", justifyContent: "center" }}><span className="ge-spinner" /></div>;
  if (!quotation) return <div style={{ padding: "60px 40px", color: "var(--ge-text-muted)" }}>Quotation not found.</div>;

  const sc = STATUS_COLORS[quotation.status] || STATUS_COLORS.draft;
  const cust = quotation.customers as Record<string, string | null> | undefined;

  return (
    <>
    {/* Hidden PDF template */}
    <div style={{ position: "absolute", left: "-9999px", top: 0 }}>
      <div ref={templateRef}>
        {business && (
          <DocumentTemplate data={{
            type: "quotation", number: quotation.quotation_number, date: quotation.created_at, status: quotation.status,
            business_name: business.name || "", business_address: business.address, business_phone: business.phone, business_email: business.email, business_gstin: business.gstin, business_logo_url: business.logo_url,
            party_name: cust?.name || "—", party_phone: cust?.phone, party_email: cust?.email, party_address: cust?.address, party_gstin: cust?.gstin,
            subtotal: quotation.subtotal, tax_total: quotation.tax_total, discount_total: quotation.discount_total, grand_total: quotation.grand_total,
            line_items: lineItems, notes: quotation.notes,
          }} />
        )}
      </div>
    </div>
    <div style={{ padding: "40px" }}>
      <div className="ge-animate-in">
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "32px" }}>
          <div>
            <h1 style={{ fontSize: "1.5rem", fontWeight: 700, color: "var(--ge-text-primary)", letterSpacing: "-0.02em", marginBottom: "4px" }}>{quotation.quotation_number}</h1>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <span style={{ fontSize: "0.875rem", color: "var(--ge-text-secondary)" }}>To: <strong>{quotation.customers?.name}</strong></span>
              <span style={{ padding: "2px 10px", borderRadius: "var(--ge-radius-full)", fontSize: "0.6875rem", fontWeight: 600, textTransform: "capitalize", background: sc.bg, color: sc.text }}>{quotation.status}</span>
            </div>
          </div>
          {quotation.status !== "converted" && quotation.status !== "rejected" && (
            <button onClick={convertToOrder} disabled={converting} className="ge-btn-primary" style={{ width: "auto", padding: "10px 20px", fontSize: "0.875rem" }}>
              <span>{converting ? "Converting…" : "→ Convert to Sales Order"}</span>
            </button>
          )}
        </div>

        {error && <div className="ge-error" style={{ marginBottom: "20px" }}>{error}</div>}

        {/* Share actions */}
        <div style={{ marginBottom: "20px" }}>
          <ShareActions
            docType="Quotation" docNumber={quotation.quotation_number}
            partyName={cust?.name || ""} partyEmail={cust?.email}
            total={quotation.grand_total} businessName={business?.name || ""}
            onDownloadPDF={() => generatePDF(quotation.quotation_number)}
            generating={generating}
          />
        </div>

        {/* Line items */}
        <LineItemsTable items={lineItems} />

        {/* Totals */}
        <TotalsCard subtotal={quotation.subtotal} taxTotal={quotation.tax_total} discountTotal={quotation.discount_total} grandTotal={quotation.grand_total} />

        {quotation.notes && (
          <div style={{ marginTop: "24px" }}>
            <h3 style={{ fontSize: "0.875rem", fontWeight: 600, color: "var(--ge-text-primary)", marginBottom: "8px" }}>Notes</h3>
            <p style={{ fontSize: "0.875rem", color: "var(--ge-text-secondary)", whiteSpace: "pre-wrap" }}>{quotation.notes}</p>
          </div>
        )}
      </div>
    </div>
    </>
  );
}

function LineItemsTable({ items }: { items: LineItem[] }) {
  return (
    <div style={{ background: "var(--ge-bg-card)", border: "1px solid var(--ge-border)", borderRadius: "var(--ge-radius-lg)", overflow: "hidden", marginBottom: "16px" }}>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ borderBottom: "1px solid var(--ge-border)", fontSize: "0.75rem", color: "var(--ge-text-muted)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
            <th style={{ padding: "10px 12px", textAlign: "left" }}>Product</th>
            <th style={{ padding: "10px 12px", textAlign: "right" }}>Qty</th>
            <th style={{ padding: "10px 12px", textAlign: "right" }}>Unit Price</th>
            <th style={{ padding: "10px 12px", textAlign: "right" }}>Tax%</th>
            <th style={{ padding: "10px 12px", textAlign: "right" }}>Discount</th>
            <th style={{ padding: "10px 12px", textAlign: "right" }}>Total</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id} style={{ borderBottom: "1px solid var(--ge-border)" }}>
              <td style={{ padding: "12px", fontSize: "0.875rem", fontWeight: 500, color: "var(--ge-text-primary)" }}>{item.product_name}</td>
              <td style={{ padding: "12px", fontSize: "0.875rem", textAlign: "right", fontFamily: "monospace" }}>{item.quantity}</td>
              <td style={{ padding: "12px", fontSize: "0.875rem", textAlign: "right", fontFamily: "monospace" }}>₹{item.unit_price.toLocaleString("en-IN")}</td>
              <td style={{ padding: "12px", fontSize: "0.875rem", textAlign: "right" }}>{item.tax_rate}%</td>
              <td style={{ padding: "12px", fontSize: "0.875rem", textAlign: "right", fontFamily: "monospace" }}>{item.discount > 0 ? `₹${item.discount}` : "—"}</td>
              <td style={{ padding: "12px", fontSize: "0.875rem", textAlign: "right", fontFamily: "monospace", fontWeight: 600, color: "var(--ge-text-primary)" }}>₹{item.line_total.toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TotalsCard({ subtotal, taxTotal, discountTotal, grandTotal }: { subtotal: number; taxTotal: number; discountTotal: number; grandTotal: number }) {
  return (
    <div style={{ display: "flex", justifyContent: "flex-end" }}>
      <div style={{ background: "var(--ge-bg-card)", border: "1px solid var(--ge-border)", borderRadius: "var(--ge-radius)", padding: "16px 24px", minWidth: "280px" }}>
        <Row label="Subtotal" value={subtotal} />
        <Row label="Tax" value={taxTotal} />
        {discountTotal > 0 && <Row label="Discount" value={-discountTotal} />}
        <div style={{ borderTop: "1px solid var(--ge-border)", marginTop: "8px", paddingTop: "8px", display: "flex", justifyContent: "space-between" }}>
          <span style={{ fontWeight: 700, color: "var(--ge-text-primary)" }}>Grand Total</span>
          <span style={{ fontWeight: 700, color: "var(--ge-accent)", fontFamily: "monospace", fontSize: "1.125rem" }}>₹{grandTotal.toFixed(2)}</span>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: number }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
      <span style={{ fontSize: "0.875rem", color: "var(--ge-text-secondary)" }}>{label}</span>
      <span style={{ fontSize: "0.875rem", color: "var(--ge-text-primary)", fontFamily: "monospace" }}>₹{value.toFixed(2)}</span>
    </div>
  );
}
