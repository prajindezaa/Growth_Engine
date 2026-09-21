import { NextRequest, NextResponse } from "next/server";
import { detectIntentLocally } from "@/lib/ai/intent-detector";
import { executeRoute } from "@/lib/ai/route-executor";
import { logActionAudit } from "@/lib/calculations";
import { AIRouteId } from "@/types/ai-routes";
import { checkLimit, recordUsage } from "@/lib/billing/entitlements";
import { supabaseAdmin } from "@/lib/admin/auth";

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

    // ========================================================
    // SERVER-SIDE SUBSCRIPTION & AI USAGE LIMIT ENFORCEMENT
    // ========================================================
    if (businessId) {
      const limitCheck = await checkLimit(businessId, "ai_monthly_requests");
      if (!limitCheck.allowed) {
        return NextResponse.json({
          route: "out_of_scope",
          reply: `⚠️ Monthly AI Limit Reached (${limitCheck.currentUsage} / ${limitCheck.limit} requests).\n\nPlease upgrade your store subscription to Growth or Pro to continue using unlimited AI insights.`,
          requiresUpgrade: true,
          limitDetails: limitCheck,
        });
      }
    }

    // 1. Fast local regex detection (< 1ms)
    const localIntent = detectIntentLocally(prompt);
    let detectedRoute: AIRouteId = localIntent.route;
    let detectedParams: Record<string, any> = localIntent.params || {};

    // 2. High-precision Gemini flash route classifier if local matcher needs nuance
    if (detectedRoute === "clarification_needed" || detectedRoute === "out_of_scope") {
      try {
        const apiKey = process.env.GEMINI_API_KEY;
        const candidateModels = [
          process.env.GEMINI_MODEL || "gemini-3.6-flash",
          "gemini-2.5-flash",
          "gemini-1.5-flash",
        ];

        const classifierPrompt = `You are the intent router for GrowthEngine MSME Operating System.
Route this user question to EXACTLY ONE route ID from this allowed list:
[today_sales, sales_by_period, top_products, top_customers, sales_trend, total_outstanding, customers_above_threshold, overdue_only, supplier_payables, send_payment_reminder, low_stock, out_of_stock, stock_level_specific, inventory_value, create_stock_adjustment, customer_lookup, customer_last_order, new_customers, supplier_lookup, recent_purchases, pending_pos, create_purchase_order, create_quotation, create_invoice, record_payment, cancel_invoice, report_summary, gst_summary, profit_margin, pending_approvals, automation_status, recent_notifications, team_summary, change_team_member_role, remove_team_member, capability_check, greeting, clarification_needed, out_of_scope, my_account_info, my_business_info, my_plan_subscription, update_business_setting, current_date_time, app_help_navigation, update_customer, update_supplier, update_product, update_invoice_status, create_automation_rule, export_report_pdf, export_report_excel, export_data]

User Query: "${prompt}"

Return pure JSON: { "route": "route_id", "confidence": 0.95, "params": {} }`;

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
                  break;
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

    // 4. Record usage in both AI usage audit trail and business usage records
    if (businessId) {
      recordUsage(businessId, "ai_monthly_requests", 1, userId);
      try {
        const promptTokens = Math.max(12, Math.round(prompt.length / 4));
        const completionTokens = Math.max(25, Math.round((result.reply?.length || 50) / 4));
        const totalTokens = promptTokens + completionTokens;

        await supabaseAdmin.from("ai_usage").insert({
          business_id: businessId,
          user_id: userId || null,
          feature: detectedRoute || "AI Assistant",
          model: "gemini-3.6-flash",
          prompt_tokens: promptTokens,
          completion_tokens: completionTokens,
          total_tokens: totalTokens,
          estimated_cost: (totalTokens / 1000000) * 85.0, // ₹85 per 1M tokens
          status: "success",
        });
      } catch (logErr) {
        console.warn("AI usage log insert notice:", logErr);
      }
    }

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
