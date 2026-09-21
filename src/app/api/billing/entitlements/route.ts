import { NextRequest, NextResponse } from "next/server";
import { getBusinessEntitlements, checkLimit } from "@/lib/billing/entitlements";
import { supabaseAdmin } from "@/lib/admin/auth";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const businessId = searchParams.get("businessId");

    if (!businessId) {
      return NextResponse.json({ error: "businessId is required" }, { status: 400 });
    }

    // Resolve live entitlements
    const entitlements = await getBusinessEntitlements(businessId);

    // Compute live resource counts
    const [usersUsage, productsUsage, customersUsage, aiUsage] = await Promise.all([
      checkLimit(businessId, "users"),
      checkLimit(businessId, "products"),
      checkLimit(businessId, "customers"),
      checkLimit(businessId, "ai_monthly_requests"),
    ]);

    return NextResponse.json({
      success: true,
      entitlements,
      usage: {
        users: usersUsage,
        products: productsUsage,
        customers: customersUsage,
        ai: aiUsage,
      },
    });
  } catch (err: any) {
    console.error("Entitlements API error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
