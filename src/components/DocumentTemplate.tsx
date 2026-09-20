"use client";

import { useRef, useState } from "react";
import html2canvas from "html2canvas-pro";
import { jsPDF } from "jspdf";

interface LineItemData {
  product_name: string;
  quantity: number;
  unit_price: number;
  tax_rate: number;
  discount: number;
  line_total: number;
}

interface DocumentData {
  type: "invoice" | "quotation";
  number: string;
  date: string;
  due_date?: string | null;
  status: string;
  // Business
  business_name: string;
  business_address?: string | null;
  business_phone?: string | null;
  business_email?: string | null;
  business_gstin?: string | null;
  business_logo_url?: string | null;
  // Party
  party_name: string;
  party_phone?: string | null;
  party_email?: string | null;
  party_address?: string | null;
  party_gstin?: string | null;
  // Totals
  subtotal: number;
  tax_total: number;
  discount_total: number;
  grand_total: number;
  amount_paid?: number;
  // Items
  line_items: LineItemData[];
  notes?: string | null;
}

export function DocumentTemplate({ data }: { data: DocumentData }) {
  const isInvoice = data.type === "invoice";
  const balanceDue = isInvoice ? data.grand_total - (data.amount_paid || 0) : null;

  return (
    <div style={{
      width: "794px", minHeight: "1123px", background: "#fff", color: "#1a1a2e",
      fontFamily: "'Inter', 'Segoe UI', sans-serif", padding: "48px", boxSizing: "border-box",
      position: "relative",
    }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "40px", borderBottom: "3px solid #0d9488", paddingBottom: "24px" }}>
        <div>
          {data.business_logo_url && (
            <img src={data.business_logo_url} alt="" style={{ height: "48px", marginBottom: "8px", objectFit: "contain" }} crossOrigin="anonymous" />
          )}
          <h1 style={{ fontSize: "20px", fontWeight: 700, color: "#1a1a2e", margin: "0 0 4px" }}>{data.business_name}</h1>
          {data.business_address && <p style={{ fontSize: "11px", color: "#64748b", margin: "0 0 2px" }}>{data.business_address}</p>}
          {data.business_phone && <p style={{ fontSize: "11px", color: "#64748b", margin: "0 0 2px" }}>📞 {data.business_phone}</p>}
          {data.business_email && <p style={{ fontSize: "11px", color: "#64748b", margin: "0 0 2px" }}>✉ {data.business_email}</p>}
          {data.business_gstin && <p style={{ fontSize: "11px", color: "#64748b", margin: "0", fontWeight: 600 }}>GSTIN: {data.business_gstin}</p>}
        </div>
        <div style={{ textAlign: "right" }}>
          <h2 style={{ fontSize: "28px", fontWeight: 800, color: "#0d9488", margin: "0 0 8px", textTransform: "uppercase", letterSpacing: "2px" }}>
            {isInvoice ? "Invoice" : "Quotation"}
          </h2>
          <p style={{ fontSize: "14px", fontWeight: 600, color: "#1a1a2e", margin: "0 0 4px", fontFamily: "monospace" }}>{data.number}</p>
          <p style={{ fontSize: "11px", color: "#64748b", margin: "0 0 2px" }}>
            Date: {new Date(data.date).toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" })}
          </p>
          {data.due_date && (
            <p style={{ fontSize: "11px", color: "#64748b", margin: "0" }}>
              Due: {new Date(data.due_date).toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" })}
            </p>
          )}
        </div>
      </div>

      {/* Bill To */}
      <div style={{ background: "#f8fafc", borderRadius: "8px", padding: "16px 20px", marginBottom: "28px", border: "1px solid #e2e8f0" }}>
        <p style={{ fontSize: "10px", textTransform: "uppercase", color: "#94a3b8", letterSpacing: "1px", margin: "0 0 6px", fontWeight: 600 }}>Bill To</p>
        <p style={{ fontSize: "14px", fontWeight: 600, color: "#1a1a2e", margin: "0 0 4px" }}>{data.party_name}</p>
        {data.party_address && <p style={{ fontSize: "11px", color: "#64748b", margin: "0 0 2px" }}>{data.party_address}</p>}
        {data.party_phone && <p style={{ fontSize: "11px", color: "#64748b", margin: "0 0 2px" }}>📞 {data.party_phone}</p>}
        {data.party_email && <p style={{ fontSize: "11px", color: "#64748b", margin: "0 0 2px" }}>✉ {data.party_email}</p>}
        {data.party_gstin && <p style={{ fontSize: "11px", color: "#64748b", margin: "0", fontWeight: 600 }}>GSTIN: {data.party_gstin}</p>}
      </div>

      {/* Line Items Table */}
      <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "24px", fontSize: "12px" }}>
        <thead>
          <tr style={{ background: "#0d9488", color: "#fff" }}>
            <th style={{ padding: "10px 12px", textAlign: "left", fontWeight: 600, borderRadius: "4px 0 0 0" }}>#</th>
            <th style={{ padding: "10px 12px", textAlign: "left", fontWeight: 600 }}>Item</th>
            <th style={{ padding: "10px 12px", textAlign: "right", fontWeight: 600 }}>Qty</th>
            <th style={{ padding: "10px 12px", textAlign: "right", fontWeight: 600 }}>Price</th>
            <th style={{ padding: "10px 12px", textAlign: "right", fontWeight: 600 }}>Tax</th>
            <th style={{ padding: "10px 12px", textAlign: "right", fontWeight: 600, borderRadius: "0 4px 0 0" }}>Total</th>
          </tr>
        </thead>
        <tbody>
          {data.line_items.map((item, i) => (
            <tr key={i} style={{ borderBottom: "1px solid #e2e8f0", background: i % 2 === 0 ? "#fff" : "#f8fafc" }}>
              <td style={{ padding: "10px 12px", color: "#64748b" }}>{i + 1}</td>
              <td style={{ padding: "10px 12px", fontWeight: 500, color: "#1a1a2e" }}>{item.product_name}</td>
              <td style={{ padding: "10px 12px", textAlign: "right", fontFamily: "monospace" }}>{item.quantity}</td>
              <td style={{ padding: "10px 12px", textAlign: "right", fontFamily: "monospace" }}>₹{item.unit_price.toLocaleString("en-IN")}</td>
              <td style={{ padding: "10px 12px", textAlign: "right" }}>{item.tax_rate}%</td>
              <td style={{ padding: "10px 12px", textAlign: "right", fontFamily: "monospace", fontWeight: 600 }}>₹{item.line_total.toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Totals */}
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "32px" }}>
        <div style={{ width: "280px" }}>
          <Row label="Subtotal" value={data.subtotal} />
          <Row label="Tax" value={data.tax_total} />
          {data.discount_total > 0 && <Row label="Discount" value={-data.discount_total} />}
          <div style={{ borderTop: "2px solid #0d9488", marginTop: "8px", paddingTop: "8px", display: "flex", justifyContent: "space-between" }}>
            <span style={{ fontSize: "14px", fontWeight: 700, color: "#1a1a2e" }}>Grand Total</span>
            <span style={{ fontSize: "16px", fontWeight: 800, color: "#0d9488", fontFamily: "monospace" }}>₹{data.grand_total.toFixed(2)}</span>
          </div>
          {isInvoice && data.amount_paid !== undefined && data.amount_paid > 0 && (
            <>
              <Row label="Paid" value={data.amount_paid} color="#16a34a" />
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: "4px" }}>
                <span style={{ fontSize: "12px", fontWeight: 700, color: "#dc2626" }}>Balance Due</span>
                <span style={{ fontSize: "14px", fontWeight: 700, color: "#dc2626", fontFamily: "monospace" }}>₹{(balanceDue || 0).toFixed(2)}</span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Notes */}
      {data.notes && (
        <div style={{ borderTop: "1px solid #e2e8f0", paddingTop: "16px", marginBottom: "24px" }}>
          <p style={{ fontSize: "10px", textTransform: "uppercase", color: "#94a3b8", letterSpacing: "1px", margin: "0 0 6px", fontWeight: 600 }}>Notes</p>
          <p style={{ fontSize: "11px", color: "#64748b", margin: 0, whiteSpace: "pre-wrap" }}>{data.notes}</p>
        </div>
      )}

      {/* Footer */}
      <div style={{ position: "absolute", bottom: "32px", left: "48px", right: "48px", borderTop: "1px solid #e2e8f0", paddingTop: "12px", display: "flex", justifyContent: "space-between" }}>
        <p style={{ fontSize: "9px", color: "#94a3b8", margin: 0 }}>Generated by GrowthEngine</p>
        <p style={{ fontSize: "9px", color: "#94a3b8", margin: 0 }}>Thank you for your business!</p>
      </div>
    </div>
  );
}

function Row({ label, value, color }: { label: string; value: number; color?: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
      <span style={{ fontSize: "12px", color: "#64748b" }}>{label}</span>
      <span style={{ fontSize: "12px", color: color || "#1a1a2e", fontFamily: "monospace" }}>₹{value.toFixed(2)}</span>
    </div>
  );
}

// ── PDF Download hook ──
export function useDocumentPDF() {
  const templateRef = useRef<HTMLDivElement>(null);
  const [generating, setGenerating] = useState(false);

  async function generatePDF(filename: string) {
    const el = templateRef.current;
    if (!el) return;
    setGenerating(true);

    try {
      const canvas = await html2canvas(el, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
        logging: false,
      });

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

      pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
      pdf.save(`${filename}.pdf`);
    } catch (err) {
      console.error("PDF generation failed:", err);
    }
    setGenerating(false);
  }

  return { templateRef, generatePDF, generating };
}

// ── Share helpers ──
export function getWhatsAppLink(docType: string, docNumber: string, partyName: string, total: number, pageUrl: string) {
  const msg = `Hi ${partyName},\n\nPlease find your ${docType} *${docNumber}* for ₹${total.toLocaleString("en-IN")}.\n\nView: ${pageUrl}\n\nThank you!`;
  return `https://wa.me/?text=${encodeURIComponent(msg)}`;
}

export function getEmailLink(to: string, docType: string, docNumber: string, businessName: string, total: number) {
  const subject = `${docType} ${docNumber} from ${businessName}`;
  const body = `Dear Customer,\n\nPlease find your ${docType.toLowerCase()} ${docNumber} for ₹${total.toLocaleString("en-IN")}.\n\nThank you for your business!\n\n${businessName}`;
  return `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

// ── Share Actions Bar ──
export function ShareActions({
  docType, docNumber, partyName, partyEmail, total, businessName,
  onDownloadPDF, generating,
}: {
  docType: string; docNumber: string; partyName: string; partyEmail?: string | null;
  total: number; businessName: string;
  onDownloadPDF: () => void; generating: boolean;
}) {
  const pageUrl = typeof window !== "undefined" ? window.location.href : "";

  return (
    <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
      <ActionBtn onClick={onDownloadPDF} disabled={generating} icon="📄" label={generating ? "Generating…" : "Download PDF"} />
      <ActionBtn onClick={() => window.open(getWhatsAppLink(docType, docNumber, partyName, total, pageUrl), "_blank")} icon="💬" label="WhatsApp" color="#25D366" />
      <ActionBtn onClick={() => window.location.href = getEmailLink(partyEmail || "", docType, docNumber, businessName, total)} icon="✉" label="Email" color="#4A90D9" />
      <ActionBtn onClick={() => { window.print(); }} icon="🖨" label="Print" />
    </div>
  );
}

function ActionBtn({ onClick, disabled, icon, label, color }: { onClick: () => void; disabled?: boolean; icon: string; label: string; color?: string }) {
  return (
    <button onClick={onClick} disabled={disabled} style={{
      display: "inline-flex", alignItems: "center", gap: "6px", padding: "8px 14px",
      borderRadius: "var(--ge-radius)", fontSize: "0.8125rem", fontWeight: 500,
      background: color ? `${color}18` : "rgba(255,255,255,0.06)",
      color: color || "var(--ge-text-primary)",
      border: `1px solid ${color ? `${color}30` : "var(--ge-border)"}`,
      cursor: disabled ? "default" : "pointer", opacity: disabled ? 0.5 : 1,
      transition: "all var(--ge-transition)",
    }}>
      <span>{icon}</span> {label}
    </button>
  );
}
