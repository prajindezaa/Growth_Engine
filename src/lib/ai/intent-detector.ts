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
    /how\s+much\s+did\s+i\s+sell\s+today|today'?s\s+sales|today\s+sales|today\s+collection/i.test(lower) ||
    /(இன்னைக்கு|இன்று|innaiku).*(சேல்ஸ்|விற்பனை|sales|collection)/i.test(lower) ||
    /(சேல்ஸ்|விற்பனை|sales).*(இன்னைக்கு|இன்று|innaiku|எவ்வள[வு|ோ]|evalo|evvalavu)/i.test(lower)
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
  // G) REPORTS & EXPORTS (READ-ONLY / DOWNLOAD)
  // ============================================================
  if (
    /export.*(pdf|print)|download.*(pdf|report\s+pdf)|send.*(pdf|report\s+pdf)|அறிக்கை\s+பிடிஎப்|report\s+pdf/i.test(lower)
  ) {
    return { route: "export_report_pdf", params: {} };
  }

  if (
    /export.*(excel|csv|sheet|spreadsheet)|download.*(excel|csv)|அறிக்கை\s+எக்செல்|report\s+excel/i.test(lower)
  ) {
    return { route: "export_report_excel", params: {} };
  }

  if (
    /export.*(data|backup|records|ledgers)|download.*(all\s+data|customers\s+data|products\s+data)/i.test(lower)
  ) {
    let entity = "all";
    if (/customer/i.test(lower)) entity = "customers";
    else if (/product|stock/i.test(lower)) entity = "products";
    else if (/invoice|sales/i.test(lower)) entity = "invoices";
    else if (/khata|ledger/i.test(lower)) entity = "khata";
    return { route: "export_data", params: { entity } };
  }

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
  // I) TEAM & ROLES (READ-ONLY + HIGH RISK ACTIONS)
  // ============================================================
  // Action (HIGH RISK): Remove Team Member
  if (
    /remove.*(team\s+member|staff|employee|from\s+the\s+team)|delete.*(team\s+member|staff)|வேலையாளை\s+நீக்கு|staff\s+remove/i.test(lower)
  ) {
    const memberName = extractMemberName(lower) || "Senthil Nathan";
    return {
      route: "remove_team_member",
      params: { memberName },
    };
  }

  // Action (HIGH RISK): Change Team Member Role
  if (
    /make.*(a\s+manager|an\s+admin|cashier|sales)|promote.*to|change.*role|assign.*role|ரோல்\s+மாற்று/i.test(lower)
  ) {
    const memberName = extractMemberName(lower) || "Senthil Nathan";
    const newRole = /admin/i.test(lower)
      ? "admin"
      : /manager/i.test(lower)
      ? "manager"
      : /cashier/i.test(lower)
      ? "cashier"
      : /accountant/i.test(lower)
      ? "accountant"
      : "manager";
    return {
      route: "change_team_member_role",
      params: { memberName, newRole },
    };
  }

  if (
    /who'?s\s+on\s+my\s+team|how\s+many\s+staff\s+do\s+i\s+have|team\s+summary|staff\s+list|வேலையாட்கள்/i.test(lower)
  ) {
    return { route: "team_summary", params: {} };
  }

  // ============================================================
  // L) ACCOUNT & PROFILE (READ-ONLY + ACTIONS)
  // ============================================================
  if (
    /what'?s\s+my\s+account|show\s+(my\s+)?profile|who\s+am\s+i\s+logged\s+in\s+as|my\s+account(\s+info)?|என்\s+அக்கவுன்ட்(\s+தகவல்)?|en\s+account|profile\s+details/i.test(lower)
  ) {
    return { route: "my_account_info", params: {} };
  }

  // Action (STANDARD CONFIRMATION): Update Business Setting
  if (
    /change.*business\s+address|update.*(business\s+address|gst\s+number|gstin|store\s+address|business\s+phone)|முகவரி\s+மாற்று|கடை\s+விலாசம்/i.test(lower)
  ) {
    let field = "address";
    let newValue = "142, Cross Cut Road, Gandhipuram, Coimbatore - 641012";
    if (/gst|gstin/i.test(lower)) {
      field = "gstin";
      const gstMatch = lower.match(/[0-9]{2}[a-z]{5}[0-9]{4}[a-z]{1}[1-9a-z]{1}z[0-9a-z]{1}/i);
      newValue = gstMatch ? gstMatch[0].toUpperCase() : "33AABCS1429B1ZB";
    } else if (/address/i.test(lower)) {
      field = "address";
      const addrMatch = raw.match(/(?:to|as)\s+([^.]+)/i);
      if (addrMatch && addrMatch[1]) newValue = addrMatch[1].trim();
    }
    return {
      route: "update_business_setting",
      params: { field, newValue },
    };
  }

  if (
    /what'?s\s+my\s+business\s+gstin|show\s+my\s+business\s+details|business\s+info|business\s+gstin|store\s+details|என்\s+கடை\s+விவரம்|கடை\s+ஜிஎஸ்டி|business\s+details/i.test(lower)
  ) {
    return { route: "my_business_info", params: {} };
  }

  if (
    /what\s+plan\s+am\s+i\s+on|my\s+subscription|how\s+many\s+invoices\s+have\s+i\s+used|plan\s+status|subscription\s+details|என்\s+பிளான்/i.test(lower)
  ) {
    return { route: "my_plan_subscription", params: {} };
  }

  // ============================================================
  // M) SYSTEM / ORIENTATION (READ-ONLY, ALWAYS AVAILABLE)
  // ============================================================
  if (
    /what'?s\s+today'?s\s+date|what\s+is\s+today'?s\s+date|இன்னைக்கு\s+என்ன\s+தேதி|என்ன\s+தேதி\s+இன்னைக்கு|innaiku\s+enna\s+thethi|innaiku\s+enna\s+date|current\s+date|today\s+date\b/i.test(lower)
  ) {
    return { route: "current_date_time", params: {} };
  }

  if (
    /where\s+do\s+i\s+find|how\s+do\s+i\s+add|where\s+is\s+the|take\s+me\s+to|open\s+(reports|pos|invoices|khata|products|suppliers|settings)|எங்கு\s+இருக்கு|எப்படி\s+போவது/i.test(lower)
  ) {
    let section = "reports";
    if (/pos|billing/i.test(lower)) section = "pos";
    else if (/invoice/i.test(lower)) section = "invoices";
    else if (/khata|ledger/i.test(lower)) section = "khata";
    else if (/product|item|stock/i.test(lower)) section = "products";
    else if (/supplier|vendor/i.test(lower)) section = "suppliers";
    else if (/setting/i.test(lower)) section = "settings";
    else if (/report/i.test(lower)) section = "reports";

    return { route: "app_help_navigation", params: { section } };
  }

  // ============================================================
  // N) EXPANDED ACTION COVERAGE ACROSS EXISTING MODULES
  // ============================================================
  // Action: Update Customer (e.g. credit limit, phone)
  if (
    /change.*(credit\s+limit|customer\s+phone|customer\s+details)|update.*(credit\s+limit|customer)/i.test(lower)
  ) {
    const cust = extractCustomer(lower) || "Ravi Traders";
    const limitMatch = lower.match(/(?:₹|rs\.?|inr)?\s*([0-9]+(?:,[0-9]+)*(?:\.[0-9]+)?k?)/i);
    let newLimit = 60000;
    if (limitMatch && limitMatch[1]) {
      const rawVal = limitMatch[1].replace(/,/g, "");
      if (rawVal.toLowerCase().endsWith("k")) newLimit = parseFloat(rawVal) * 1000;
      else newLimit = parseFloat(rawVal);
    }
    return {
      route: "update_customer",
      params: { customer: cust, creditLimit: newLimit },
    };
  }

  // Action: Update Supplier
  if (
    /update.*supplier|change.*supplier/i.test(lower)
  ) {
    const supName = /south\s+india/i.test(lower) ? "South India Cement Corp" : "Coimbatore Spares Ltd";
    return {
      route: "update_supplier",
      params: { supplier: supName, contactPerson: "K. Subramanian", phone: "98421 77665" },
    };
  }

  // Action: Update Product Price / Details
  if (
    /update.*price\s+of|change.*price\s+of|set.*price.*to|விலை\s+மாற்று/i.test(lower)
  ) {
    const prodName = /ultratech/i.test(lower)
      ? "UltraTech Cement 50kg"
      : /asian\s+paints/i.test(lower)
      ? "Asian Paints Apex Ultima"
      : "UltraTech Cement 50kg";
    const priceMatch = lower.match(/(?:₹|rs\.?|inr|to)?\s*([0-9]+(?:\.[0-9]+)?)/i);
    const newPrice = priceMatch ? parseFloat(priceMatch[1]) : 390;
    return {
      route: "update_product",
      params: { product: prodName, newSellingPrice: newPrice },
    };
  }

  // Action: Update Invoice Status (e.g. mark as sent / paid)
  if (
    /mark.*invoice.*as\s+(sent|paid|delivered)|mark\s+(inv-?[0-9]+)\s+as\s+(sent|paid)|bill.*mark\s+as\s+sent/i.test(lower)
  ) {
    const invMatch = lower.match(/inv-?[0-9]+/i);
    const invoiceNumber = invMatch ? invMatch[0].toUpperCase() : "INV-105";
    const status = /paid/i.test(lower) ? "paid" : "sent";
    return {
      route: "update_invoice_status",
      params: { invoiceNumber, status },
    };
  }

  // Action: Create Automation Rule
  if (
    /create.*(automation|rule|alert)|alert\s+me\s+if|notify\s+me\s+when|விதி\s+உருவாக்கு/i.test(lower)
  ) {
    const threshMatch = lower.match(/(?:₹|rs\.?|inr)?\s*([0-9]+(?:,[0-9]+)*k?)/i);
    let thresh = 50000;
    if (threshMatch && threshMatch[1]) {
      const clean = threshMatch[1].replace(/,/g, "");
      thresh = clean.toLowerCase().endsWith("k") ? parseFloat(clean) * 1000 : parseFloat(clean);
    }
    return {
      route: "create_automation_rule",
      params: {
        title: `Alert on Customer Balance > ₹${thresh.toLocaleString("en-IN")}`,
        trigger: `outstanding_balance > ${thresh}`,
        action: "Send WhatsApp & In-App Notification",
      },
    };
  }

  // ============================================================
  // CONVERSATIONAL & KEYWORD-BASED CATCH-ALLS FOR NATURAL SPEECH
  // ============================================================
  // Sales / Revenue keywords (including cash, money, collection, earnings)
  if (
    /\b(sale|sales|selling|revenue|turnover|kolekshan|collection|cash|income|earnings)\b/i.test(lower) ||
    /(வியாபாரம்|விற்பனை|சேல்ஸ்|காசு|வருமானம்|வசூல்)/i.test(lower)
  ) {
    if (/\b(month|week|period|monthly)\b|மாத/i.test(lower)) {
      return { route: "sales_by_period", params: {} };
    }
    if (/\b(trend|growth|growing)\b|வளர்/i.test(lower)) {
      return { route: "sales_trend", params: {} };
    }
    if (/\b(top|best|highest|item|items)\b|அதிகம்|முக்கிய/i.test(lower)) {
      return { route: "top_products", params: {} };
    }
    return { route: "today_sales", params: {} };
  }

  // Khata / Outstanding / Due / Receivables / Udhar keywords
  if (
    /\b(khata|udhar|jama|due|dues|owes|owing|outstanding|receivable|receivables|balance)\b/i.test(lower) ||
    /(பாக்கி|கடன்|தரணும்|கொடுக்கணும்)/i.test(lower)
  ) {
    if (/\b(supplier|vendor|payables?|tharanum)\b|சப்ளையர்/i.test(lower)) {
      return { route: "supplier_payables", params: {} };
    }
    if (/\b(overdue|late|crossed)\b|தாமதம்|லேட்/i.test(lower)) {
      return { route: "overdue_only", params: {} };
    }
    return { route: "total_outstanding", params: {} };
  }

  // Inventory / Stock / Products keywords
  if (
    /\b(stock|inventory|item|items|product|products|goods)\b/i.test(lower) ||
    /(சரக்கு|இருப்பு|பொருள்|ப்ராடக்ட்|தீர்ந்து)/i.test(lower)
  ) {
    if (/\b(low|reorder|shortage|kuraiva|koraiva)\b|குறைவ|தீர்ந்து|கம்மி/i.test(lower)) {
      return { route: "low_stock", params: {} };
    }
    if (/\b(out|zero|empty|mudinjiducha)\b|முடிஞ்சி|காலி/i.test(lower)) {
      return { route: "out_of_stock", params: {} };
    }
    if (/\b(value|worth|valuation|cost)\b|மதிப்பு|விலை|மதிப்பீடு/i.test(lower)) {
      return { route: "inventory_value", params: {} };
    }
    return { route: "low_stock", params: {} };
  }

  // Customers / Parties keywords
  if (
    /\b(customer|customers|party|parties|buyer|buyers|client|clients)\b/i.test(lower) ||
    /(கஸ்டமர்|வாடிக்கையாளர்)/i.test(lower)
  ) {
    if (/\b(new|recent|add)\b|புது/i.test(lower)) {
      return { route: "new_customers", params: {} };
    }
    if (/\b(top|best|biggest|large)\b|பெரிய|முக்கிய/i.test(lower)) {
      return { route: "top_customers", params: {} };
    }
    const cust = extractCustomer(lower);
    if (cust) return { route: "customer_lookup", params: { customer: cust } };
    return { route: "top_customers", params: {} };
  }

  // Suppliers / Vendors keywords
  if (
    /\b(supplier|suppliers|vendor|vendors|dealer|dealers)\b/i.test(lower) ||
    /(சப்ளையர்)/i.test(lower)
  ) {
    return { route: "supplier_lookup", params: { supplier: "South India Cement Corp" } };
  }

  // Invoice / Bill / Billing keywords
  if (
    /\b(invoice|invoices|bill|bills|billing)\b/i.test(lower) ||
    /(ரசீது|பில்|இன்வாய்ஸ்)/i.test(lower)
  ) {
    if (/\b(create|make|generate|podu|new)\b|போடு|உருவாக்கு|புது/i.test(lower)) {
      return { route: "create_invoice", params: { customer: "Ravi Traders" } };
    }
    return { route: "app_help_navigation", params: { section: "invoices" } };
  }

  // POS / Counter keywords
  if (/\b(pos|counter|cashier|fast billing)\b|கவுண்டர்/i.test(lower)) {
    return { route: "app_help_navigation", params: { section: "pos" } };
  }

  // Reports / Profit / Margin / GST keywords
  if (/\b(profit|margin|earnings|gain)\b|லாபம்/i.test(lower)) {
    return { route: "profit_margin", params: {} };
  }
  if (/\b(gst|gstin|tax|taxes|gstr)\b|வரி|ஜிஎஸ்டி/i.test(lower)) {
    if (/\b(my|number|business|store|details|what)\b|கடை|என்/i.test(lower)) {
      return { route: "my_business_info", params: {} };
    }
    return { route: "gst_summary", params: {} };
  }
  if (/\b(report|reports|summary|analytics|performance)\b|அறிக்கை|சுருக்கம்/i.test(lower)) {
    return { route: "report_summary", params: {} };
  }

  // Account / Profile / Business / Plan / Settings keywords
  if (/\b(account|profile|user|login|owner)\b|அக்கவுன்ட்|சுயவிவரம்/i.test(lower)) {
    return { route: "my_account_info", params: {} };
  }
  if (/\b(business|shop|store|company|enterprise)\b|கடை|நிறுவனம்/i.test(lower)) {
    return { route: "my_business_info", params: {} };
  }
  if (/\b(plan|subscription|limit|tier|renew|renews|upgrade)\b|பிளான்|சந்தா/i.test(lower)) {
    return { route: "my_plan_subscription", params: {} };
  }
  if (/\b(setting|settings|configuration|setup)\b|அமைப்புகள்|செட்டிங்/i.test(lower)) {
    return { route: "app_help_navigation", params: { section: "settings" } };
  }

  // Date / Time / Calendar / Today keywords
  if (/\b(date|today|time|calendar|day|innaiku)\b|தேதி|இன்னைக்கு|இன்று|நேரம்/i.test(lower)) {
    return { route: "current_date_time", params: {} };
  }

  // Help / Guide / Ask / What can you do / Orientation
  if (/\b(help|guide|can you|support|assist|how to|who are you)\b|உதவி|வழிகாட்ட/i.test(lower)) {
    return { route: "capability_check", params: {} };
  }

  // Fallback: OUT OF SCOPE (only for truly unrelated topics like weather/jokes)
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

function extractMemberName(text: string): string | null {
  if (/senthil(\s+nathan)?/i.test(text)) return "Senthil Nathan";
  if (/mani(\s+v)?/i.test(text)) return "Mani V";
  if (/ramasamy/i.test(text)) return "Ramasamy S";
  if (/kumar/i.test(text)) return "Kumar P";
  return null;
}

