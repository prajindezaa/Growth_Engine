import { NextRequest, NextResponse } from "next/server";
import { verifyAdminAuth, supabaseAdmin } from "@/lib/admin/auth";

export async function GET(req: NextRequest) {
  const admin = await verifyAdminAuth(req);
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const range = searchParams.get("range") || "30d"; // today, 7d, 30d, 3m, 12m, all

    // 1. Fetch total counts across existing tables
    const [
      usersCount,
      businessesCount,
      customersCount,
      productsCount,
      invoicesRes,
      aiRes,
      subRes,
    ] = await Promise.all([
      supabaseAdmin.from("profiles").select("id", { count: "exact", head: true }),
      supabaseAdmin.from("businesses").select("id", { count: "exact", head: true }),
      supabaseAdmin.from("customers").select("id", { count: "exact", head: true }),
      supabaseAdmin.from("products").select("id", { count: "exact", head: true }),
      supabaseAdmin.from("invoices").select("id, grand_total, amount_paid, payment_status, created_at, type"),
      supabaseAdmin.from("ai_usage").select("*"),
      supabaseAdmin.from("subscriptions").select("*"),
    ]);

    const invoices = invoicesRes.data || [];
    const aiUsage = aiRes.data || [];
    const subscriptions = subRes.data || [];

    // Calculate Financial Aggregates
    const actualInvoices = invoices.filter((i) => i.type !== "quotation");
    const totalSales = actualInvoices.reduce((sum, i) => sum + Number(i.grand_total || 0), 0);
    const totalCollected = actualInvoices.reduce((sum, i) => sum + Number(i.amount_paid || 0), 0);
    const totalOutstanding = totalSales - totalCollected;

    // AI Aggregates
    const totalAiTokens = aiUsage.reduce((sum: number, u: any) => sum + Number(u.total_tokens || u.tokens_used || 0), 0);
    const totalAiRequests = aiUsage.length;
    const totalAiCost = aiUsage.reduce((sum: number, u: any) => sum + Number(u.estimated_cost || 0), 0);

    // Subscriptions
    const activeSubs = subscriptions.filter((s: any) => s.status === "active").length;
    const subscriptionRevenue = activeSubs * 2499; // Baseline pro tier revenue calculation

    return NextResponse.json({
      success: true,
      stats: {
        totalUsers: usersCount.count || 0,
        totalBusinesses: businessesCount.count || 0,
        totalCustomers: customersCount.count || 0,
        totalProducts: productsCount.count || 0,
        totalInvoices: actualInvoices.length,
        totalSales,
        totalCollected,
        totalOutstanding,
        totalAiRequests,
        totalAiTokens,
        totalAiCost,
        activeSubscriptions: activeSubs,
        subscriptionRevenue,
      },
      range,
    });
  } catch (err: any) {
    console.error("Admin stats error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
