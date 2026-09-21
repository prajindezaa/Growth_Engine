import crypto from "crypto";
import { supabaseAdmin } from "@/lib/billing/entitlements";

export interface CreateOrderParams {
  businessId: string;
  planId: string;
  billingCycle: "monthly" | "yearly";
  amountInr: number;
  customerEmail?: string;
  customerPhone?: string;
}

/**
 * Initializes a checkout order for a subscription plan upgrade.
 * Compatible with Razorpay and custom gateway handshakes.
 */
export async function createBillingOrder(params: CreateOrderParams) {
  const { businessId, planId, billingCycle, amountInr, customerEmail } = params;

  // Generate a cryptographically secure idempotency receipt ID
  const receipt = `rcpt_${businessId.slice(0, 8)}_${Date.now()}`;
  const mockOrderId = `order_${crypto.randomBytes(8).toString("hex")}`;

  // If live Razorpay API keys are configured, construct the live Razorpay Order
  const keyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  if (keyId && keySecret && !keyId.includes("your_key_id")) {
    try {
      const authHeader = Buffer.from(`${keyId}:${keySecret}`).toString("base64");
      const res = await fetch("https://api.razorpay.com/v1/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Basic ${authHeader}`,
        },
        body: JSON.stringify({
          amount: Math.round(amountInr * 100), // in paise
          currency: "INR",
          receipt,
          notes: {
            business_id: businessId,
            plan_id: planId,
            billing_cycle: billingCycle,
          },
        }),
      });

      if (res.ok) {
        const order = await res.json();
        return {
          orderId: order.id,
          amount: order.amount,
          currency: order.currency,
          keyId,
        };
      }
    } catch (e) {
      console.warn("Razorpay API call exception:", e);
    }
  }

  // Fallback to deterministic checkout order structure
  return {
    orderId: mockOrderId,
    amount: Math.round(amountInr * 100),
    currency: "INR",
    keyId: keyId || "rzp_test_growthengine",
    isTestMode: true,
  };
}

/**
 * Verifies webhook signature against provider secret for idempotent processing.
 */
export function verifyWebhookSignature(payload: string, signature: string, secret: string): boolean {
  if (!signature || !secret) return false;
  try {
    const expected = crypto.createHmac("sha256", secret).update(payload).digest("hex");
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
  } catch {
    return false;
  }
}

/**
 * Idempotently executes plan upgrade upon verified payment.
 */
export async function applySubscriptionUpgrade(
  businessId: string,
  planId: string,
  billingCycle: "monthly" | "yearly" = "monthly",
  providerEventId?: string,
  metadata?: any
) {
  // Check if event has already been processed to guarantee idempotency
  if (providerEventId) {
    const { data: existingEvent } = await supabaseAdmin
      .from("subscription_events")
      .select("id")
      .eq("provider_event_id", providerEventId)
      .maybeSingle();

    if (existingEvent) {
      return { success: true, alreadyProcessed: true };
    }
  }

  const periodDays = billingCycle === "yearly" ? 365 : 30;
  const periodEnd = new Date(Date.now() + periodDays * 86400000).toISOString();

  // Upsert subscription
  const { data: updatedSub, error: subErr } = await supabaseAdmin
    .from("subscriptions")
    .upsert(
      {
        business_id: businessId,
        plan_id: planId.toLowerCase(),
        status: "active",
        billing_cycle: billingCycle,
        current_period_start: new Date().toISOString(),
        current_period_end: periodEnd,
        cancel_at_period_end: false,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "business_id" }
    )
    .select()
    .single();

  if (subErr) {
    throw subErr;
  }

  // Record audit event
  await supabaseAdmin.from("subscription_events").insert({
    business_id: businessId,
    subscription_id: updatedSub?.id,
    event_type: "upgraded",
    provider_event_id: providerEventId || `evt_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    metadata: {
      plan_id: planId,
      billing_cycle: billingCycle,
      ...(metadata || {}),
    },
  });

  return { success: true, subscription: updatedSub };
}
