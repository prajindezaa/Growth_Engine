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
  "update_customer", "update_supplier", "update_product", "update_invoice_status", "create_automation_rule"
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

    // 2. If locally marked out_of_scope, use Gemini API strictly as a constrained Intent Classifier
    if (detectedRoute === "out_of_scope" && process.env.GEMINI_API_KEY) {
      try {
        const apiKey = process.env.GEMINI_API_KEY;
        // Use active working model gemini-3.6-flash
        let model = process.env.GEMINI_MODEL || "gemini-3.6-flash";
        if (model === "gemini-1.5-flash" || model.includes("2.5") || model.includes("3.8") || !model.startsWith("gemini-")) {
          model = "gemini-3.6-flash";
        }

        const classifierPrompt = `You are the Intent Classifier for GrowthEngine Business Operating System.
Classify the user's message into EXACTLY ONE of these fixed routes, or "out_of_scope":

[ROUTES]:
today_sales, sales_by_period, top_products, top_customers, sales_trend,
total_outstanding, customers_above_threshold, overdue_only, supplier_payables, send_payment_reminder,
low_stock, out_of_stock, stock_level_specific, inventory_value, create_stock_adjustment,
customer_lookup, customer_last_order, new_customers, supplier_lookup,
recent_purchases, pending_pos, create_purchase_order,
create_quotation, create_invoice, record_payment, cancel_invoice,
report_summary, gst_summary, profit_margin,
pending_approvals, automation_status, recent_notifications, team_summary,
change_team_member_role, remove_team_member,
my_account_info, my_business_info, my_plan_subscription, update_business_setting,
current_date_time, app_help_navigation,
update_customer, update_supplier, update_product, update_invoice_status, create_automation_rule,
capability_check, greeting, out_of_scope

USER MESSAGE: "${prompt}"

CRITICAL RULE:
If the user's message is asking about business sales, Khata due, inventory, stock, accounts, profile, settings, team, date/time, help, or greetings, pick the best matching route.
Only if it is completely irrelevant (e.g. weather, politics, jokes, non-business general knowledge), return "out_of_scope".

Respond strictly in JSON format:
{ "route": "detected_route", "confidence": 0.0_to_1.0, "params": {} }`;

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
            
            if (parsed.route && ALLOWED_ROUTES.has(parsed.route) && (parsed.confidence === undefined || parsed.confidence >= 0.6)) {
              detectedRoute = parsed.route;
              detectedParams = parsed.params || {};
            } else {
              detectedRoute = "out_of_scope";
              detectedParams = {};
            }
          }
        }
      } catch (e) {
        console.warn("Gemini intent classifier fallback:", e);
        detectedRoute = "out_of_scope";
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
