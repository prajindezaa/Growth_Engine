/**
 * Standard business calculation module for GrowthEngine
 * Centralizes invoice, quotation, tax, and inventory calculations.
 * Used by POS, Invoices, Approvals, and AI Route Executor.
 */

export interface LineItemCalculationInput {
  quantity: number;
  rate: number;
  gstRate?: number; // percentage, e.g. 18
  discountPercent?: number; // percentage, e.g. 5
}

export interface LineItemCalculationResult {
  taxableAmount: number;
  discountAmount: number;
  gstAmount: number;
  total: number;
}

export interface InvoiceCalculationResult {
  subtotal: number;
  totalDiscount: number;
  taxableAmount: number;
  totalGst: number;
  grandTotal: number;
}

/**
 * Computes standard line item breakdown (taxable amount, GST, line total).
 */
export function calculateLineItem(input: LineItemCalculationInput): LineItemCalculationResult {
  const gross = input.quantity * input.rate;
  const discountAmount = input.discountPercent ? (gross * input.discountPercent) / 100 : 0;
  const taxableAmount = gross - discountAmount;
  const gstRate = input.gstRate ?? 18;
  const gstAmount = (taxableAmount * gstRate) / 100;
  const total = taxableAmount + gstAmount;

  return {
    taxableAmount: Math.round(taxableAmount * 100) / 100,
    discountAmount: Math.round(discountAmount * 100) / 100,
    gstAmount: Math.round(gstAmount * 100) / 100,
    total: Math.round(total * 100) / 100,
  };
}

/**
 * Computes official document totals from line items.
 */
export function calculateDocumentTotals(items: LineItemCalculationInput[]): InvoiceCalculationResult {
  let subtotal = 0;
  let totalDiscount = 0;
  let taxableAmount = 0;
  let totalGst = 0;

  for (const item of items) {
    const res = calculateLineItem(item);
    subtotal += item.quantity * item.rate;
    totalDiscount += res.discountAmount;
    taxableAmount += res.taxableAmount;
    totalGst += res.gstAmount;
  }

  const grandTotal = taxableAmount + totalGst;

  return {
    subtotal: Math.round(subtotal * 100) / 100,
    totalDiscount: Math.round(totalDiscount * 100) / 100,
    taxableAmount: Math.round(taxableAmount * 100) / 100,
    totalGst: Math.round(totalGst * 100) / 100,
    grandTotal: Math.round(grandTotal * 100) / 100,
  };
}

// ============================================================================
// AUDIT LOGS PIPELINE
// Records an entry for EVERY action route (proposed, confirmed, rejected, cancelled)
// ============================================================================

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  route: string;
  actionType: string;
  targetEntity: string;
  status: "proposed" | "confirmed" | "rejected" | "cancelled" | "executed";
  details: Record<string, string | number>;
  userRole?: string;
  isHighRisk?: boolean;
}

// In-memory persistent array across server lifecycle
const AUDIT_LOGS_STORE: AuditLogEntry[] = [
  {
    id: "audit_init_01",
    timestamp: new Date().toISOString(),
    route: "send_payment_reminder",
    actionType: "send_payment_reminder",
    targetEntity: "Murugan Traders",
    status: "proposed",
    details: { amount: "₹1,42,500", channel: "WhatsApp" },
    userRole: "owner",
    isHighRisk: false,
  },
];

export function logActionAudit(entry: Omit<AuditLogEntry, "id" | "timestamp">): AuditLogEntry {
  const newLog: AuditLogEntry = {
    id: `audit_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    timestamp: new Date().toISOString(),
    ...entry,
  };
  AUDIT_LOGS_STORE.unshift(newLog);
  return newLog;
}

export function getAuditLogs(): AuditLogEntry[] {
  return [...AUDIT_LOGS_STORE];
}
