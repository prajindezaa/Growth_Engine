import { NextRequest, NextResponse } from "next/server";
import { detectIntentLocally } from "@/lib/ai/intent-detector";
import { executeRoute } from "@/lib/ai/route-executor";
import { logActionAudit } from "@/lib/calculations";
import { AIRouteId } from "@/types/ai-routes";

const ALLOWED_ROUTES: Set<AIRouteId> = new Set([
  "today_sales", "sales_by_period", "top_products", "top_customers", "sales_trend",
  "total_outstanding", "customers_above_threshold", "overdue_only", "supplier_payables", "send_payment_reminder",
  "low_stock", "out_of_stock", "stock_level_specific", "inventory_value", "create_stock_adjustment",
  "customer_lookup", "customer_last_order", "new_customers", "supplier_lookup",
  "recent_purchases", "pending_pos", "create_purchase_order",
  "create_quotation", "create_invoice", "record_payment", "cancel_invoice",
  "report_summary", "gst_summary", "profit_margin",
  "pending_approvals", "automation_status", "recent_notifications", "team_summary",
  "change_team_member_role", "remove_team_member",
  "capability_check", "greeting", "clarification_needed", "out_of_scope",
  "my_account_info", "my_business_info", "my_plan_subscription", "update_business_setting",
  "current_date_time", "app_help_navigation",
  "update_customer", "update_supplier", "update_product", "update_invoice_status", "create_automation_rule",
  "export_report_pdf", "export_report_excel", "export_data"
]);

export async function POST(req: NextRequest) {
  try {
    let prompt = "";
    let userRole: any = "owner";
    let businessId: string | undefined = undefined;
    let userId: string | undefined = undefined;
    let actionUpdate: { proposalId: string; status: "confirmed" | "cancelled" | "rejected"; route?: AIRouteId; targetEntity?: string } | undefined = undefined;

    try {
      const body = await req.json();
      prompt = body.prompt || "";
      if (body.userRole) userRole = body.userRole;
      if (body.businessId) businessId = body.businessId;
      if (body.userId) userId = body.userId;
      if (body.actionUpdate) actionUpdate = body.actionUpdate;
    } catch {
      const textBody = await req.text();
      prompt = textBody || "";
    }

    // Handle explicit user confirmation or rejection of an action
    if (actionUpdate) {
      const isHighRisk =
        actionUpdate.route === "cancel_invoice" ||
        actionUpdate.route === "change_team_member_role" ||
        actionUpdate.route === "remove_team_member";

      const audit = logActionAudit({
        route: actionUpdate.route || "action_update",
        actionType: "action_user_decision",
        targetEntity: actionUpdate.targetEntity || actionUpdate.proposalId,
        status: actionUpdate.status,
        details: {
          proposalId: actionUpdate.proposalId,
          decision: actionUpdate.status,
        },
        userRole,
        isHighRisk,
      });

      return NextResponse.json({
        success: true,
        status: actionUpdate.status,
        auditId: audit.id,
      });
    }

    if (!prompt.trim()) {
      return NextResponse.json({
        route: "out_of_scope",
        reply: "Please ask a question about your business sales, Khata, inventory, account, or settings.",
      });
    }

    // 1. Unified deterministic intent detection (handles typed text + voice transcripts in English/Tamil/Tanglish)
    const localDetection = detectIntentLocally(prompt);
    let detectedRoute: AIRouteId = localDetection.route;
    let detectedParams = localDetection.params;

    // 2. If locally marked out_of_scope, use Gemini API as a natural language Intent Classifier
    if (detectedRoute === "out_of_scope" && process.env.GEMINI_API_KEY) {
      try {
        const apiKey = process.env.GEMINI_API_KEY;
        // Candidate models in priority order for maximum reliability and uptime
        const candidateModels = ["gemini-flash-latest", "gemini-flash-lite-latest", "gemini-3.6-flash"];

        const classifierPrompt = `You are the Natural Language Intent Classifier for GrowthEngine Business Operating System.
Your job is to understand natural spoken and typed messages in Tamil (தமிழ்), Tanglish, or English, regardless of slang, colloquial speech, regional dialects, or informal phrasing, and map them to the corresponding app route.

[ALLOWED APP ROUTES]:
1. Sales & Revenue:
- today_sales: Today's sales, daily collection, today's cash received, how much came in today, earnings today, cash register, counter cash.
- sales_by_period: This month's sales, weekly sales, period comparison.
- top_products: Best selling products, most sold goods, fast moving items.
- top_customers: Biggest buyers, top parties, highest purchasing customers.
- sales_trend: Business growth, trend analysis, sales comparison.

2. Khata & Outstanding Receivables:
- total_outstanding: Who owes money, customer dues, pending collection, total market balance, udhar, baaki, credit due.
- customers_above_threshold: Customers owing more than a certain amount.
- overdue_only: Late payments, crossed due dates, overdue bills.
- supplier_payables: Vendor dues, money to pay suppliers/vendors.
- send_payment_reminder: Remind customer to pay via WhatsApp.

3. Inventory & Stock:
- low_stock: Items low in stock, reorder needed, stock running out, shortage.
- out_of_stock: Sold out items, zero stock, empty inventory.
- stock_level_specific: Check stock of a specific product (e.g. cement, wire, paint, steel).
- inventory_value: Total stock value, inventory valuation, total asset worth.
- create_stock_adjustment: Stock damage, breakage, wastage, transit loss.

4. Account, Profile & Settings:
- my_account_info: Current logged-in user profile, role, phone, name.
- my_business_info: Store name, GSTIN, business address, contact info.
- my_plan_subscription: Subscription plan, invoice quota used/remaining.
- update_business_setting: Update business address, GSTIN, or phone.

5. System, Help & Time:
- current_date_time: Today's date, current time, day, calendar.
- app_help_navigation: How to navigate to a section, where is invoices, POS, reports, products, etc.
- greeting: Casual greetings (hi, hello, vanakkam, namaste).
- capability_check: What can you do, help menu.

6. Action Workflows:
- create_quotation: Make quotation, draft estimate.
- create_invoice: Make bill, create invoice, bill customer.
- record_payment: Record cash or UPI received from customer.
- cancel_invoice: Cancel, void, or delete an invoice.
- update_customer: Change customer credit limit or details.
- update_product: Change product selling price.
- create_automation_rule: Set automated alerts.

Only return "out_of_scope" if the user query is completely unrelated to business, trade, inventory, or the app (e.g. weather, politics, jokes, movies, cinema).

USER MESSAGE: "${prompt}"

Respond strictly in JSON format:
{ "route": "<route_name>", "confidence": 0.0_to_1.0, "params": {} }`;

        for (const model of candidateModels) {
          try {
            const geminiRes = await fetch(
              `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  contents: [{ role: "user", parts: [{ text: classifierPrompt }] }],
                  generationConfig: { responseMimeType: "application/json", temperature: 0.0 },
                }),
              }
            );

            if (geminiRes.ok) {
              const gData = await geminiRes.json();
              const rawText = gData.candidates?.[0]?.content?.parts?.[0]?.text;
              if (rawText) {
                const parsed = JSON.parse(rawText.replace(/```json/g, "").replace(/```/g, "").trim());
                if (parsed.route && ALLOWED_ROUTES.has(parsed.route) && (parsed.confidence === undefined || parsed.confidence >= 0.5)) {
                  detectedRoute = parsed.route;
                  detectedParams = parsed.params || {};
                  break; // Success, break model loop
                }
              }
            }
          } catch (modelErr) {
            console.warn(`Gemini model ${model} error:`, modelErr);
          }
        }
      } catch (e) {
        console.warn("Gemini intent classifier fallback:", e);
      }
    }

    // 3. Execute the dedicated backend query/action function
    const result = await executeRoute(detectedRoute, detectedParams, {
      userRole,
      businessId,
      userId,
    });

    return NextResponse.json(result);
  } catch (err: any) {
    console.error("AI Router Error:", err);
    return NextResponse.json(
      {
        route: "out_of_scope",
        reply: "I encountered an error processing that question. Please try asking again.",
        details: err.message,
      },
      { status: 500 }
    );
  }
}
