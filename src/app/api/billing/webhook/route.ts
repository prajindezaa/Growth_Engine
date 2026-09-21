import { NextRequest, NextResponse } from "next/server";
import { verifyWebhookSignature, applySubscriptionUpgrade } from "@/lib/billing/provider";
import { supabaseAdmin } from "@/lib/admin/auth";

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get("x-razorpay-signature") || req.headers.get("x-signature") || "";
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || process.env.RAZORPAY_KEY_SECRET || "";

    // Signature verification if secret configured
    if (webhookSecret && !webhookSecret.includes("your_razorpay")) {
      const isValid = verifyWebhookSignature(rawBody, signature, webhookSecret);
      if (!isValid) {
        return NextResponse.json({ error: "Invalid webhook signature" }, { status: 400 });
      }
    }

    let payload: any = {};
    try {
      payload = JSON.parse(rawBody);
    } catch {
      return NextResponse.json({ error: "Malformed JSON payload" }, { status: 400 });
    }

    const event = payload.event || payload.type || "payment.captured";
    const entity = payload.payload?.payment?.entity || payload.payload?.subscription?.entity || payload;
    const providerEventId = payload.id || entity.id || `evt_${Date.now()}`;
    const notes = entity.notes || {};
    const businessId = notes.business_id || payload.businessId;
    const planId = notes.plan_id || payload.planId;
    const billingCycle = notes.billing_cycle || payload.billingCycle || "monthly";

    if (!businessId) {
      return NextResponse.json({ received: true, note: "No businessId in webhook notes" });
    }

    switch (event) {
      case "payment.captured":
      case "subscription.charged":
      case "order.paid":
        if (planId) {
          await applySubscriptionUpgrade(businessId, planId, billingCycle, providerEventId, payload);
        }
        break;

      case "subscription.cancelled":
        await supabaseAdmin
          .from("subscriptions")
          .update({
            status: "cancelled",
            cancel_at_period_end: true,
            updated_at: new Date().toISOString(),
          })
          .eq("business_id", businessId);
        break;

      case "payment.failed":
        await supabaseAdmin
          .from("subscriptions")
          .update({
            status: "past_due",
            updated_at: new Date().toISOString(),
          })
          .eq("business_id", businessId);
        break;

      default:
        console.log(`Unhandled webhook event: ${event}`);
    }

    return NextResponse.json({ received: true, event });
  } catch (err: any) {
    console.error("Webhook processing error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
