import { AIRouteId } from "@/types/ai-routes";

export interface IntentDetectionResult {
  route: AIRouteId;
  params: Record<string, any>;
  confidence?: number;
}

/**
 * Single, unified intent detection engine for GrowthEngine.
 * Handles both typed text and voice transcripts in English, தமிழ் (Tamil), and Tanglish.
 * Maps strictly to the fixed routes specification or returns out_of_scope / clarification_needed.
 */
export function detectIntentLocally(input: string, context?: { lastMentionedInvoice?: string; lastMentionedCustomer?: string }): IntentDetectionResult {
  const raw = input.trim();
  const lower = raw.toLowerCase().trim();

  if (!lower) {
    return { route: "out_of_scope", params: {} };
  }

  // ============================================================
  // J) META / GREETING / CAPABILITY
  // ============================================================
  if (/^(hi|hello|hey|vanakkam|வணக்கம்|namaste|good\s+morning|good\s+afternoon|good\s+evening|nalliravu|start)$/i.test(lower) ||
      /^(hi|hello|hey|vanakkam|வணக்கம்|namaste)\b/i.test(lower) && lower.length < 15) {
    return { route: "greeting", params: {} };
  }

  if (
    /what\s+can\s+you\s+do|what\s+can\s+i\s+ask|help\b|need\s+help|உன்னால்\s+என்ன\s+செய்ய\s+முடியும்|ennala\s+enna\s+kekka\s+mudiyum|features|who\s+are\s+you/i.test(lower)
  ) {
    return { route: "capability_check", params: {} };
  }

  // ============================================================
  // K) AMBIGUITY / CLARIFYING RESOLUTION
  // ============================================================
  // Check for ambiguous single name without intent or context
  if (/^(show\s+)?(ravi|ravi\s+traders\s+or\s+hardware)$/i.test(lower)) {
    return {
      route: "clarification_needed",
      params: {
        clarifyingQuestion: "Multiple parties match 'Ravi'. Which one do you mean?",
        options: ["Ravi Traders (Tiruppur)", "Ravi Hardware (Salem)"],
      },
    };
  }

  // Vague action reference e.g. "cancel that invoice" with no clear number
  if (/cancel\s+(that|the|this)\s+invoice/i.test(lower) && !/inv-?[0-9]+/i.test(lower)) {
    if (context?.lastMentionedInvoice) {
      return {
        route: "clarification_needed",
        params: {
          clarifyingQuestion: `Do you mean invoice ${context.lastMentionedInvoice} from earlier?`,
          options: [`Yes, cancel ${context.lastMentionedInvoice}`, "No, different invoice"],
        },
      };
    }
    return {
      route: "clarification_needed",
      params: {
        clarifyingQuestion: "Which invoice number would you like to cancel? (e.g. INV-105)",
        options: ["INV-105 (Ravi Traders)", "INV-2026-0891"],
      },
    };
  }

  // ============================================================
  // F) SALES DOCUMENTS (ACTION ROUTES)
  // ============================================================

  // HIGH RISK: Cancel Invoice
  if (
    /cancel.*invoice|void.*invoice|delete.*invoice|இன்வாய்ஸ்\s+ரத்து|invoice\s+cancel/i.test(lower)
  ) {
    const match = lower.match(/inv-?[0-9]+/i);
    const invoiceNumber = match ? match[0].toUpperCase() : "INV-105";
    return {
      route: "cancel_invoice",
      params: { invoiceNumber },
    };
  }

  // Action: Create Quotation / Estimate
  if (
    /create.*(quotation|quote|estimate)|draft.*(quotation|estimate)|send.*(quotation|estimate)|கொட்டேஷன்\s+போடு|quotation\s+podu|make.*quotation/i.test(lower)
  ) {
    const custMatch = extractCustomer(lower);
    return {
      route: "create_quotation",
      params: { customer: custMatch || "Ravi Traders" },
    };
  }

  // Action: Create Invoice / Bill
  if (
    /convert.*(quotation|quote).*to.*invoice|create.*invoice|generate.*invoice|make.*(invoice|bill)|bill.*customer|இன்வாய்ஸ்\s+போடு|bill\s+podu|புது\s+பில்/i.test(lower)
  ) {
    const custMatch = extractCustomer(lower);
    return {
      route: "create_invoice",
      params: { customer: custMatch || "Ravi Traders" },
    };
  }

  // Action: Record Payment / Jama
  if (
    /record.*payment|customer\s+paid|paid\s+by\s+upi|paid\s+by\s+cash|got.*payment|received.*payment|பணம்\s+வந்தது|panam\s+vandhuchu|jama\s+entry|collect.*payment/i.test(lower)
  ) {
    const amountMatch = lower.match(/(?:₹|rs\.?|inr)?\s*([0-9]+(?:,[0-9]+)*(?:\.[0-9]+)?k?)/i);
    let amount = 34500;
    if (amountMatch && amountMatch[1]) {
      let rawAmt = amountMatch[1].replace(/,/g, "");
      if (rawAmt.toLowerCase().endsWith("k")) {
        amount = parseFloat(rawAmt) * 1000;
      } else {
        amount = parseFloat(rawAmt);
      }
    }
    const custMatch = extractCustomer(lower);
    return {
      route: "record_payment",
      params: {
        customer: custMatch || "Ravi Traders",
        amount,
        method: /upi/i.test(lower) ? "UPI" : /cash/i.test(lower) ? "Cash" : "UPI (GPay / PhonePe)",
      },
    };
  }

  // Action: Send Payment Reminder
  if (
    /remind.*to\s+pay|send.*payment.*reminder|whatsapp.*reminder|remind.*overdue|ரிமைண்டர்\s+அனுப்பு|reminder\s+anuppu|payment.*remind/i.test(lower)
  ) {
    const custMatch = extractCustomer(lower);
    return {
      route: "send_payment_reminder",
      params: { customer: custMatch || "Ravi Traders" },
    };
  }

  // Action: Create Purchase Order (PO)
  if (
    /create.*(purchase\s+order|\bpo\b)|draft.*(purchase\s+order|\bpo\b)|reorder.*supplier|order.*bags.*from|சப்ளையர்.*ஆர்டர்|supplier.*order.*podu/i.test(lower)
  ) {
    return {
      route: "create_purchase_order",
      params: {
        supplier: "South India Cement Corp",
        product: "UltraTech Cement 50kg",
        quantity: 100,
      },
    };
  }

  // Action: Stock Adjustment
  if (
    /reduce\s+stock|adjust\s+stock|stock\s+adjustment|damaged?\s+goods?|damage.*item|உடைந்த.*சரக்கு|damage\s+stock|broken\s+stock/i.test(lower)
  ) {
    const qtyMatch = lower.match(/(?:by\s+)?([0-9]+)\s*(?:bags?|units?|buckets?|rolls?|pieces?)?/i);
    const qty = qtyMatch ? parseInt(qtyMatch[1], 10) : 5;
    return {
      route: "create_stock_adjustment",
      params: {
        product: "UltraTech Cement 50kg",
        qty,
        reason: "Damaged in transit",
      },
    };
  }

  // ============================================================
  // B) OUTSTANDING / KHATA (READ-ONLY)
  // ============================================================
  if (
    /who\s+owes.*more\s+than|overdue.*over|owes\s+over|above.*2[05]k|who\s+owes\s+more/i.test(lower)
  ) {
    const matchAmt = lower.match(/(?:25000|25k|20000|20k|[0-9]+k?)/i);
    let threshold = 25000;
    if (matchAmt) {
      const val = matchAmt[0].toLowerCase();
      if (val.includes("20")) threshold = 20000;
      else if (val.includes("25")) threshold = 25000;
    }
    return { route: "customers_above_threshold", params: { threshold } };
  }

  if (
    /which\s+invoices?\s+are\s+overdue|who.*late\s+on\s+payment|late\s+payment|overdue\s+only|யாரு\s+லேட்|due\s+crossed|due\s+date\s+over/i.test(lower)
  ) {
    return { route: "overdue_only", params: {} };
  }

  if (
    /how\s+much.*owe\s+supplier|what.*total\s+payable|supplier\s+payables?|vendor\s+due|சப்ளையருக்கு\s+எவ்வளவு\s+தரணும்|supplier.*evalo\s+tharanum/i.test(lower)
  ) {
    return { route: "supplier_payables", params: {} };
  }

  if (
    /who\s+owes\s+me|total\s+outstanding|how\s+much.*outstanding|what.*outstanding|khata\s+balance|எவ்வளவு\s+கலெக்ட்\s+பண்ணணும்|evalo\s+collect\s+pannanum|pending\s+collection|kadai\s+baaki/i.test(lower)
  ) {
    return { route: "total_outstanding", params: {} };
  }

  // ============================================================
  // C) INVENTORY & STOCK (READ-ONLY)
  // ============================================================
  if (
    /what.*out\s+of\s+stock|anything\s+sold\s+out|sold\s+out|zero\s+stock|முடிஞ்சிடுச்சா|stok\s+mudinjiducha/i.test(lower)
  ) {
    return { route: "out_of_stock", params: {} };
  }

  if (
    /how\s+much.*do\s+i\s+have|check\s+stock\s+for|stock\s+level|how\s+many\s+bags|ultratech.*cement.*stock|stock\s+of\s+[a-z]+/i.test(lower)
  ) {
    const prod = /ultratech/i.test(lower)
      ? "UltraTech Cement 50kg"
      : /asian\s+paints/i.test(lower)
      ? "Asian Paints Apex Ultima"
      : /wire|finolex/i.test(lower)
      ? "Finolex 2.5 sq mm Copper Wire"
      : "UltraTech Cement 50kg";
    return { route: "stock_level_specific", params: { product: prod } };
  }

  if (
    /what.*total\s+inventory\s+worth|stock\s+valuation|inventory\s+value|மொத்த\s+சரக்கு\s+மதிப்பு|total\s+stock\s+value/i.test(lower)
  ) {
    return { route: "inventory_value", params: {} };
  }

  if (
    /what.*low\s+in\s+stock|which\s+products.*low\s+in\s+stock|low\s+stock|reorder\s+level|என்ன\s+ப்ராடக்ட்\s+ஸ்டாக்\s+குறைவா|stock\s+koraiva\s+iruku|kuraiva\s+irukku/i.test(lower)
  ) {
    return { route: "low_stock", params: {} };
  }

  // ============================================================
  // A) SALES & REVENUE (READ-ONLY)
  // ============================================================
  if (
    /how\s+much\s+did\s+i\s+sell\s+today|today'?s\s+sales|today\s+sales|இன்னைக்கு\s+எவ்வளவு\s+சேல்ஸ்|innaiku\s+evalo\s+sales|today\s+collection/i.test(lower)
  ) {
    return { route: "today_sales", params: {} };
  }

  if (
    /how\s+much\s+did\s+i\s+sell\s+this\s+(week|month)|last\s+month'?s\s+total\s+sales|this\s+month'?s?\s+sales|sales\s+by\s+period|indha\s+maasam\s+sales|மாத\s+விற்பனை/i.test(lower)
  ) {
    return { route: "sales_by_period", params: {} };
  }

  if (
    /what\s+sold\s+the\s+most|best\s+selling\s+products?|top\s+products?|most\s+sold|எந்த\s+பொருள்\s+அதிகம்\s+விற்றது|adhigam\s+vithathu|highest\s+selling/i.test(lower)
  ) {
    return { route: "top_products", params: {} };
  }

  if (
    /who\s+are\s+my\s+biggest\s+customers?|top\s+customers?|top\s+buyers?|best\s+customers?|பெரிய\s+கஸ்டமர்\s+யார்|top\s+party/i.test(lower)
  ) {
    return { route: "top_customers", params: {} };
  }

  if (
    /how\s+are\s+sales\s+trending|is\s+business\s+growing|sales\s+trend|growth\s+trend|வியாபாரம்\s+வளருதா|business\s+growth/i.test(lower)
  ) {
    return { route: "sales_trend", params: {} };
  }

  // ============================================================
  // D) CUSTOMERS & SUPPLIERS (READ-ONLY)
  // ============================================================
  if (
    /when\s+did.*last\s+order|last\s+order\s+from|last\s+ordered/i.test(lower)
  ) {
    const custMatch = extractCustomer(lower);
    return { route: "customer_last_order", params: { customer: custMatch || "Ravi Traders" } };
  }

  if (
    /how\s+many\s+new\s+customers|new\s+customers\s+this\s+month|புது\s+கஸ்டமர்|puthu\s+customer/i.test(lower)
  ) {
    return { route: "new_customers", params: {} };
  }

  if (
    /show\s+me\s+(south\s+india|supplier)|what\s+do\s+i\s+owe\s+\[?supplier\]?|supplier\s+lookup|show\s+supplier/i.test(lower)
  ) {
    return { route: "supplier_lookup", params: { supplier: "South India Cement Corp" } };
  }

  if (
    /show\s+me\s+ravi\s+traders|what'?s\s+ravi\s+traders'?\s+order\s+history|customer\s+lookup|order\s+history|customer\s+details/i.test(lower)
  ) {
    return { route: "customer_lookup", params: { customer: "Ravi Traders" } };
  }

  // ============================================================
  // E) PURCHASES (READ-ONLY)
  // ============================================================
  if (
    /which\s+pos\s+are\s+still\s+pending|pending\s+delivery|pos\s+pending|expected\s+delivery|purchase\s+order\s+pending/i.test(lower)
  ) {
    return { route: "pending_pos", params: {} };
  }

  if (
    /what\s+have\s+i\s+purchased\s+recently|show\s+recent\s+purchase|recent\s+purchases?|recent\s+pos/i.test(lower)
  ) {
    return { route: "recent_purchases", params: {} };
  }

  // ============================================================
  // G) REPORTS (READ-ONLY)
  // ============================================================
  if (
    /how'?s\s+this\s+month\s+going\s+overall|give\s+me\s+a\s+business\s+summary|business\s+summary|report\s+summary|overall\s+performance|மாத\s+சுருக்கம்/i.test(lower)
  ) {
    return { route: "report_summary", params: {} };
  }

  if (
    /what'?s\s+my\s+gst\s+liability|gstr?\s+summary|gst\s+summary|output\s+tax|ஜிஎஸ்டி\s+எவ்வளவு|gst\s+evalo/i.test(lower)
  ) {
    return { route: "gst_summary", params: {} };
  }

  if (
    /what'?s\s+my\s+profit\s+this\s+month|margin\s+on|profit\s+margin|gross\s+margin|லாபம்\s+எவ்வளவு/i.test(lower)
  ) {
    return { route: "profit_margin", params: {} };
  }

  // ============================================================
  // H) NOTIFICATIONS & APPROVALS (READ-ONLY)
  // ============================================================
  if (
    /what\s+needs\s+my\s+approval|any\s+pending\s+approvals?|pending\s+approvals?|approval\s+center/i.test(lower)
  ) {
    return { route: "pending_approvals", params: {} };
  }

  if (
    /what\s+automations\s+are\s+active|show\s+my\s+alert\s+rules|active\s+automations?|alert\s+rules/i.test(lower)
  ) {
    return { route: "automation_status", params: {} };
  }

  if (
    /any\s+important\s+alerts\s+today|what\s+happened\s+today|recent\s+notifications|alerts\s+today/i.test(lower)
  ) {
    return { route: "recent_notifications", params: {} };
  }

  // ============================================================
  // I) TEAM & ROLES (READ-ONLY, PERMISSION-GATED)
  // ============================================================
  if (
    /who'?s\s+on\s+my\s+team|how\s+many\s+staff\s+do\s+i\s+have|team\s+summary|staff\s+list|வேலையாட்கள்/i.test(lower)
  ) {
    return { route: "team_summary", params: {} };
  }

  // Fallback: OUT OF SCOPE (never guess)
  return { route: "out_of_scope", params: {} };
}

function extractCustomer(text: string): string | null {
  if (/ravi\s+traders/i.test(text)) return "Ravi Traders";
  if (/ravi\s+hardware/i.test(text)) return "Ravi Hardware";
  if (/murugan\s+traders/i.test(text)) return "Murugan Traders";
  if (/kavitha\s+electricals/i.test(text)) return "Kavitha Electricals";
  if (/balaji\s+motors/i.test(text)) return "Balaji Motors";
  if (/anand\s+agencies/i.test(text)) return "Anand Agencies";
  if (/raja\s+engineering/i.test(text)) return "Raja Engineering";
  return null;
}
