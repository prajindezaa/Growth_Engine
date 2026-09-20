"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Invoice, LineItem, Payment } from "@/lib/types";
import { DocumentTemplate, useDocumentPDF, ShareActions } from "@/components/DocumentTemplate";
import { ConfirmationDialog } from "@/components/ui/ConfirmationDialog";
import { Button } from "@/components/ui/Button";

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  draft: { bg: "rgba(107,114,128,0.12)", text: "#9ca3af" },
  sent: { bg: "rgba(59,130,246,0.12)", text: "#60a5fa" },
  finalized: { bg: "var(--ge-success-bg)", text: "var(--ge-success)" },
  paid: { bg: "var(--ge-success-bg)", text: "var(--ge-success)" },
  partially_paid: { bg: "rgba(251,191,36,0.12)", text: "#fbbf24" },
  overdue: { bg: "var(--ge-error-bg)", text: "var(--ge-error)" },
  cancelled: { bg: "rgba(107,114,128,0.12)", text: "#6b7280" },
};

const PAYMENT_COLORS: Record<string, { bg: string; text: string }> = {
  unpaid: { bg: "var(--ge-error-bg)", text: "var(--ge-error)" },
  partial: { bg: "rgba(251,191,36,0.12)", text: "#fbbf24" },
  paid: { bg: "var(--ge-success-bg)", text: "var(--ge-success)" },
};

export default function InvoiceDetailPage() {
  const params = useParams();
  const businessId = params.businessId as string;
  const invoiceId = params.id as string;

  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [lineItems, setLineItems] = useState<LineItem[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [business, setBusiness] = useState<Record<string, string | null> | null>(null);
  const [loading, setLoading] = useState(true);
  const [finalizing, setFinalizing] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showCancelDialog, setShowCancelDialog] = useState(false);

  // Payment form
  const [showPayForm, setShowPayForm] = useState(false);
  const [payForm, setPayForm] = useState({ amount: 0, method: "cash", reference: "", note: "" });
  const { templateRef, generatePDF, generating } = useDocumentPDF();
  const [payingSaving, setPayingSaving] = useState(false);

  useEffect(() => { loadData(); }, [invoiceId]);

  async function loadData() {
    const supabase = createClient();
    const [{ data: inv }, { data: items }, { data: pays }, { data: biz }] = await Promise.all([
      supabase.from("invoices").select("*, customers(name, phone, email, address, gstin)").eq("id", invoiceId).single(),
      supabase.from("line_items").select("*").eq("parent_type", "invoice").eq("parent_id", invoiceId).order("sort_order"),
      supabase.from("payments").select("*").eq("invoice_id", invoiceId).order("paid_at", { ascending: false }),
      supabase.from("businesses").select("name, address, phone, email, gstin, logo_url").eq("id", businessId).single(),
    ]);
    if (inv) setInvoice(inv as Invoice);
    if (items) setLineItems(items as LineItem[]);
    if (pays) setPayments(pays as Payment[]);
    if (biz) setBusiness(biz as Record<string, string | null>);
    setLoading(false);
  }

  async function handleFinalize() {
    setFinalizing(true); setError(null); setSuccess(null);
    const supabase = createClient();
    const { error: err } = await supabase.rpc("finalize_invoice", { p_invoice_id: invoiceId });
    if (err) { setError(err.message); setFinalizing(false); return; }
    setSuccess("Invoice finalized! Stock has been deducted.");
    setFinalizing(false);
    await loadData();
  }

  async function executeCancel() {
    setShowCancelDialog(false);
    setCancelling(true); setError(null); setSuccess(null);
    const supabase = createClient();
    const { error: err } = await supabase.rpc("cancel_invoice", { p_invoice_id: invoiceId });
    if (err) { setError(err.message); setCancelling(false); return; }
    setSuccess("Invoice cancelled. Stock has been restored.");
    setCancelling(false);
    await loadData();
  }

  async function handleRecordPayment(e: React.FormEvent) {
    e.preventDefault();
    if (payForm.amount <= 0) { setError("Amount must be positive."); return; }
    setPayingSaving(true); setError(null); setSuccess(null);
    const supabase = createClient();
    const { error: err } = await supabase.rpc("record_payment", {
      p_invoice_id: invoiceId,
      p_amount: payForm.amount,
      p_method: payForm.method,
      p_reference: payForm.reference || null,
      p_note: payForm.note || null,
    });
    if (err) { setError(err.message); setPayingSaving(false); return; }
    setSuccess("Payment recorded.");
    setPayForm({ amount: 0, method: "cash", reference: "", note: "" });
    setShowPayForm(false);
    setPayingSaving(false);
    await loadData();
  }

  if (loading) return <div style={{ padding: "60px 40px", display: "flex", justifyContent: "center" }}><span className="ge-spinner" /></div>;
  if (!invoice) return <div style={{ padding: "60px 40px", color: "var(--ge-text-muted)" }}>Invoice not found.</div>;

  const sc = STATUS_COLORS[invoice.status] || STATUS_COLORS.draft;
  const pc = PAYMENT_COLORS[invoice.payment_status] || PAYMENT_COLORS.unpaid;
  const balanceDue = invoice.grand_total - invoice.amount_paid;
  const isOverdue = invoice.due_date && new Date(invoice.due_date) < new Date() && invoice.payment_status !== "paid" && invoice.status !== "cancelled";
  const canPay = invoice.status !== "cancelled" && invoice.payment_status !== "paid";
  const canFinalize = invoice.status === "draft";
  const canCancel = invoice.status !== "cancelled";
  const cust = invoice.customers as Record<string, string | null> | undefined;

  return (
    <>
    {/* Hidden PDF template */}
    <div style={{ position: "absolute", left: "-9999px", top: 0 }}>
      <div ref={templateRef}>
        {business && (
          <DocumentTemplate data={{
            type: "invoice", number: invoice.invoice_number, date: invoice.created_at, due_date: invoice.due_date, status: invoice.status,
            business_name: business.name || "", business_address: business.address, business_phone: business.phone, business_email: business.email, business_gstin: business.gstin, business_logo_url: business.logo_url,
            party_name: cust?.name || "—", party_phone: cust?.phone, party_email: cust?.email, party_address: cust?.address, party_gstin: cust?.gstin,
            subtotal: invoice.subtotal, tax_total: invoice.tax_total, discount_total: invoice.discount_total, grand_total: invoice.grand_total, amount_paid: invoice.amount_paid,
            line_items: lineItems, notes: invoice.notes,
          }} />
        )}
      </div>
    </div>
    <div style={{ padding: "40px" }}>
      <div className="ge-animate-in">
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "32px" }}>
          <div>
            <h1 style={{ fontSize: "1.5rem", fontWeight: 700, color: "var(--ge-text-primary)", letterSpacing: "-0.02em", marginBottom: "4px" }}>{invoice.invoice_number}</h1>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
              <span style={{ fontSize: "0.875rem", color: "var(--ge-text-secondary)" }}>To: <strong>{invoice.customers?.name}</strong></span>
              <span style={{ padding: "2px 10px", borderRadius: "var(--ge-radius-full)", fontSize: "0.6875rem", fontWeight: 600, textTransform: "capitalize", background: sc.bg, color: sc.text }}>{invoice.status.replace("_", " ")}</span>
              <span style={{ padding: "2px 10px", borderRadius: "var(--ge-radius-full)", fontSize: "0.6875rem", fontWeight: 600, textTransform: "capitalize", background: pc.bg, color: pc.text }}>{invoice.payment_status}</span>
              {isOverdue && <span style={{ padding: "2px 10px", borderRadius: "var(--ge-radius-full)", fontSize: "0.6875rem", fontWeight: 600, background: "var(--ge-error-bg)", color: "var(--ge-error)" }}>⚠ Overdue</span>}
            </div>
          </div>
          <div style={{ display: "flex", gap: "8px" }}>
            {canPay && (
              <button onClick={() => setShowPayForm(!showPayForm)} className="ge-btn-primary" style={{ width: "auto", padding: "10px 16px", fontSize: "0.8125rem" }}>
                <span>💳 Record Payment</span>
              </button>
            )}
            {canFinalize && (
              <button onClick={handleFinalize} disabled={finalizing} className="ge-btn-primary" style={{ width: "auto", padding: "10px 16px", fontSize: "0.8125rem" }}>
                <span>{finalizing ? "…" : "✓ Finalize"}</span>
              </button>
            )}
            {canCancel && (
              <Button
                variant="destructive"
                size="sm"
                loading={cancelling}
                onClick={() => setShowCancelDialog(true)}
              >
                Cancel Invoice
              </Button>
            )}
          </div>
        </div>

        {/* Invoice Cancellation Confirmation Dialog */}
        <ConfirmationDialog
          isOpen={showCancelDialog}
          title="Cancel Tax Invoice"
          message={`Are you sure you want to cancel invoice ${invoice.invoice_number}? All stock movements previously deducted will be restored to inventory immediately.`}
          confirmLabel="Yes, Cancel Invoice"
          isDestructive={true}
          loading={cancelling}
          onConfirm={executeCancel}
          onCancel={() => setShowCancelDialog(false)}
        />

        {error && <div className="ge-error" style={{ marginBottom: "20px" }}>{error}</div>}
        {success && <div className="ge-success" style={{ marginBottom: "20px" }}>{success}</div>}

        {/* Share actions */}
        <div style={{ marginBottom: "20px" }}>
          <ShareActions
            docType="Invoice" docNumber={invoice.invoice_number}
            partyName={cust?.name || ""} partyEmail={cust?.email}
            total={invoice.grand_total} businessName={business?.name || ""}
            onDownloadPDF={() => generatePDF(invoice.invoice_number)}
            generating={generating}
          />
        </div>

        {/* Stats */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "12px", marginBottom: "24px" }}>
          <StatCard label="Grand Total" value={`₹${invoice.grand_total.toFixed(2)}`} />
          <StatCard label="Amount Paid" value={`₹${invoice.amount_paid.toFixed(2)}`} color="var(--ge-success)" />
          <StatCard label="Balance Due" value={`₹${balanceDue.toFixed(2)}`} color={balanceDue > 0 ? "var(--ge-error)" : "var(--ge-success)"} />
          <StatCard label="Due Date" value={invoice.due_date ? new Date(invoice.due_date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—"} color={isOverdue ? "var(--ge-error)" : undefined} />
        </div>

        {/* Payment form */}
        {showPayForm && (
          <div style={{ background: "var(--ge-bg-card)", border: "1px solid var(--ge-accent)", borderRadius: "var(--ge-radius-lg)", padding: "20px", marginBottom: "24px" }} className="ge-animate-in">
            <h3 style={{ fontSize: "0.9375rem", fontWeight: 600, color: "var(--ge-text-primary)", marginBottom: "16px" }}>Record Payment</h3>
            <form onSubmit={handleRecordPayment}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: "12px", marginBottom: "12px" }}>
                <div>
                  <label className="ge-label">Amount *</label>
                  <input type="number" value={payForm.amount || ""} onChange={(e) => setPayForm((f) => ({ ...f, amount: parseFloat(e.target.value) || 0 }))} className="ge-input" min={0.01} step="0.01" max={balanceDue} placeholder={`Max: ₹${balanceDue.toFixed(2)}`} />
                </div>
                <div>
                  <label className="ge-label">Method</label>
                  <select value={payForm.method} onChange={(e) => setPayForm((f) => ({ ...f, method: e.target.value }))} className="ge-input">
                    <option value="cash">Cash</option>
                    <option value="bank">Bank Transfer</option>
                    <option value="upi">UPI</option>
                    <option value="cheque">Cheque</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="ge-label">Reference</label>
                  <input type="text" value={payForm.reference} onChange={(e) => setPayForm((f) => ({ ...f, reference: e.target.value }))} className="ge-input" placeholder="Txn ID / Cheque #" />
                </div>
                <div>
                  <label className="ge-label">Note</label>
                  <input type="text" value={payForm.note} onChange={(e) => setPayForm((f) => ({ ...f, note: e.target.value }))} className="ge-input" placeholder="Optional" />
                </div>
              </div>
              <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
                <button type="button" onClick={() => setShowPayForm(false)} className="ge-btn-secondary" style={{ width: "auto", padding: "8px 16px" }}>Cancel</button>
                <button type="submit" disabled={payingSaving} className="ge-btn-primary" style={{ width: "auto", padding: "8px 16px" }}>
                  <span>{payingSaving ? "Saving…" : "Save Payment"}</span>
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Line items */}
        <div style={{ background: "var(--ge-bg-card)", border: "1px solid var(--ge-border)", borderRadius: "var(--ge-radius-lg)", overflow: "hidden", marginBottom: "16px" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--ge-border)", fontSize: "0.75rem", color: "var(--ge-text-muted)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                <th style={{ padding: "10px 12px", textAlign: "left" }}>Product</th>
                <th style={{ padding: "10px 12px", textAlign: "right" }}>Qty</th>
                <th style={{ padding: "10px 12px", textAlign: "right" }}>Unit Price</th>
                <th style={{ padding: "10px 12px", textAlign: "right" }}>Tax%</th>
                <th style={{ padding: "10px 12px", textAlign: "right" }}>Total</th>
              </tr>
            </thead>
            <tbody>
              {lineItems.map((item) => (
                <tr key={item.id} style={{ borderBottom: "1px solid var(--ge-border)" }}>
                  <td style={{ padding: "12px", fontSize: "0.875rem", fontWeight: 500, color: "var(--ge-text-primary)" }}>{item.product_name}</td>
                  <td style={{ padding: "12px", fontSize: "0.875rem", textAlign: "right", fontFamily: "monospace" }}>{item.quantity}</td>
                  <td style={{ padding: "12px", fontSize: "0.875rem", textAlign: "right", fontFamily: "monospace" }}>₹{item.unit_price.toLocaleString("en-IN")}</td>
                  <td style={{ padding: "12px", fontSize: "0.875rem", textAlign: "right" }}>{item.tax_rate}%</td>
                  <td style={{ padding: "12px", fontSize: "0.875rem", textAlign: "right", fontFamily: "monospace", fontWeight: 600, color: "var(--ge-text-primary)" }}>₹{item.line_total.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals */}
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "32px" }}>
          <div style={{ background: "var(--ge-bg-card)", border: "1px solid var(--ge-border)", borderRadius: "var(--ge-radius)", padding: "16px 24px", minWidth: "280px" }}>
            <TRow label="Subtotal" value={invoice.subtotal} />
            <TRow label="Tax" value={invoice.tax_total} />
            {invoice.discount_total > 0 && <TRow label="Discount" value={-invoice.discount_total} />}
            <div style={{ borderTop: "1px solid var(--ge-border)", marginTop: "8px", paddingTop: "8px", display: "flex", justifyContent: "space-between" }}>
              <span style={{ fontWeight: 700, color: "var(--ge-text-primary)" }}>Grand Total</span>
              <span style={{ fontWeight: 700, color: "var(--ge-accent)", fontFamily: "monospace", fontSize: "1.125rem" }}>₹{invoice.grand_total.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Payment history */}
        {payments.length > 0 && (
          <div style={{ marginBottom: "24px" }}>
            <h3 style={{ fontSize: "1rem", fontWeight: 600, color: "var(--ge-text-primary)", marginBottom: "12px" }}>Payment History</h3>
            <div style={{ background: "var(--ge-bg-card)", border: "1px solid var(--ge-border)", borderRadius: "var(--ge-radius-lg)", overflow: "hidden" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--ge-border)", fontSize: "0.75rem", color: "var(--ge-text-muted)", textTransform: "uppercase" }}>
                    <th style={{ padding: "10px 12px", textAlign: "left" }}>Date</th>
                    <th style={{ padding: "10px 12px", textAlign: "right" }}>Amount</th>
                    <th style={{ padding: "10px 12px", textAlign: "left" }}>Method</th>
                    <th style={{ padding: "10px 12px", textAlign: "left" }}>Reference</th>
                    <th style={{ padding: "10px 12px", textAlign: "left" }}>Note</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((p) => (
                    <tr key={p.id} style={{ borderBottom: "1px solid var(--ge-border)" }}>
                      <td style={{ padding: "12px", fontSize: "0.875rem", color: "var(--ge-text-secondary)" }}>{new Date(p.paid_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</td>
                      <td style={{ padding: "12px", fontSize: "0.875rem", textAlign: "right", fontFamily: "monospace", fontWeight: 600, color: "var(--ge-success)" }}>₹{p.amount.toFixed(2)}</td>
                      <td style={{ padding: "12px", fontSize: "0.875rem", textTransform: "capitalize" }}>{p.method}</td>
                      <td style={{ padding: "12px", fontSize: "0.875rem", fontFamily: "monospace" }}>{p.reference || "—"}</td>
                      <td style={{ padding: "12px", fontSize: "0.875rem", color: "var(--ge-text-secondary)" }}>{p.note || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {invoice.notes && (
          <div>
            <h3 style={{ fontSize: "0.875rem", fontWeight: 600, color: "var(--ge-text-primary)", marginBottom: "8px" }}>Notes</h3>
            <p style={{ fontSize: "0.875rem", color: "var(--ge-text-secondary)", whiteSpace: "pre-wrap" }}>{invoice.notes}</p>
          </div>
        )}
      </div>
    </div>
    </>
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

function TRow({ label, value }: { label: string; value: number }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
      <span style={{ fontSize: "0.875rem", color: "var(--ge-text-secondary)" }}>{label}</span>
      <span style={{ fontSize: "0.875rem", color: "var(--ge-text-primary)", fontFamily: "monospace" }}>₹{value.toFixed(2)}</span>
    </div>
  );
}
