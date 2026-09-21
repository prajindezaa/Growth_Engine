import { NextRequest, NextResponse } from "next/server";
import { verifyAdminAuth, supabaseAdmin } from "@/lib/admin/auth";

export async function GET(req: NextRequest) {
  const admin = await verifyAdminAuth(req);
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const feature = searchParams.get("feature");
    const businessId = searchParams.get("businessId");
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "25", 10);
    const offset = (page - 1) * limit;

    let query = supabaseAdmin
      .from("ai_usage")
      .select(`
        *,
        businesses:business_id (id, name, city)
      `, { count: "exact" });

    if (businessId) query = query.eq("business_id", businessId);
    if (feature) query = query.eq("feature", feature);

    query = query.order("created_at", { ascending: false }).range(offset, offset + limit - 1);

    const { data: usageLogs, count, error } = await query;

    if (error) throw error;

    // Fetch aggregate totals for KPI cards
    const { data: allUsage } = await supabaseAdmin
      .from("ai_usage")
      .select("total_tokens, tokens_used, estimated_cost, response_time, status, feature");

    const logs = allUsage || [];
    const totalRequests = logs.length;
    const totalTokens = logs.reduce((sum, item: any) => sum + Number(item.total_tokens || item.tokens_used || 0), 0);
    const totalCost = logs.reduce((sum, item: any) => sum + Number(item.estimated_cost || 0), 0);
    const avgResponseTime = totalRequests > 0
      ? Math.round(logs.reduce((sum, item: any) => sum + Number(item.response_time || 0), 0) / totalRequests)
      : 0;

    return NextResponse.json({
      success: true,
      logs: usageLogs || [],
      total: count || 0,
      page,
      limit,
      metrics: {
        totalRequests,
        totalTokens,
        totalCost,
        avgResponseTime,
      },
    });
  } catch (err: any) {
    console.error("Admin AI usage API error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
