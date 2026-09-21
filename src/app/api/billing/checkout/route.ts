import { NextRequest, NextResponse } from "next/server";
import { createBillingOrder, applySubscriptionUpgrade } from "@/lib/billing/provider";
import { supabaseAdmin } from "@/lib/admin/auth";

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    let userId: string | null = null;
    let userEmail: string | null = null;

    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.replace("Bearer ", "").trim();
      const { data } = await supabaseAdmin.auth.getUser(token);
      if (data?.user) {
        userId = data.user.id;
        userEmail = data.user.email || null;
      }
    }

    const body = await req.json();
    const { businessId, planId, billingCycle = "monthly", action = "create_order" } = body;

    if (!businessId || !planId) {
      return NextResponse.json({ error: "businessId and planId are required" }, { status: 400 });
    }

    // Verify user belongs to business with owner/admin privileges
    if (userId) {
      const { data: member } = await supabaseAdmin
        .from("business_members")
        .select("role")
        .eq("business_id", businessId)
        .eq("user_id", userId)
        .maybeSingle();

      if (!member || (member.role !== "owner" && member.role !== "admin")) {
        return NextResponse.json({ error: "Only the business owner can manage subscriptions" }, { status: 403 });
      }
    }

    // Free plan downgrade / activation
    if (planId === "free") {
      const res = await applySubscriptionUpgrade(businessId, "free", "monthly", `free_${Date.now()}`);
      return NextResponse.json({
        success: res.success,
        subscription: res.subscription,
        message: "Switched to Free plan",
      });
    }

    // Pricing rates table
    const PRICING: Record<string, { monthly: number; yearly: number }> = {
      starter: { monthly: 499, yearly: 4990 },
      growth: { monthly: 999, yearly: 9990 },
      pro: { monthly: 1999, yearly: 19990 },
    };

    const targetPrice = PRICING[planId]?.[billingCycle as "monthly" | "yearly"] || 999;

    // Handle immediate simulated verification or Razorpay checkout order
    if (action === "create_order") {
      const order = await createBillingOrder({
        businessId,
        planId,
        billingCycle,
        amountInr: targetPrice,
        customerEmail: userEmail || undefined,
      });

      return NextResponse.json({ success: true, order });
    } else if (action === "confirm_payment") {
      // Direct confirmation for test mode / sandbox transitions
      const paymentId = body.paymentId || `pay_${Date.now()}`;
      const upgradeResult = await applySubscriptionUpgrade(
        businessId,
        planId,
        billingCycle,
        paymentId,
        { confirmed_by: userId, amount: targetPrice }
      );

      return NextResponse.json({
        success: upgradeResult.success,
        subscription: upgradeResult.subscription,
        message: `Plan successfully upgraded to ${planId.toUpperCase()}!`,
      });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (err: any) {
    console.error("Checkout API error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
