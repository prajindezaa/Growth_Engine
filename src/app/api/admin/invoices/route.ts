import { NextRequest, NextResponse } from "next/server";
import { verifyAdminAuth, supabaseAdmin } from "@/lib/admin/auth";

export async function GET(req: NextRequest) {
  const admin = await verifyAdminAuth(req);
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || "";
    const businessId = searchParams.get("businessId");
    const status = searchParams.get("status");
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "20", 10);
    const offset = (page - 1) * limit;

    let query = supabaseAdmin
      .from("invoices")
      .select(`
        *,
        businesses:business_id (id, name, city)
      `, { count: "exact" });

    if (businessId) {
      query = query.eq("business_id", businessId);
    }
    if (status) {
      query = query.eq("payment_status", status);
    }
    if (search) {
      query = query.or(`invoice_number.ilike.%${search}%,customer_name.ilike.%${search}%`);
    }

    query = query.order("created_at", { ascending: false }).range(offset, offset + limit - 1);

    const { data: invoices, count, error } = await query;

    if (error) throw error;

    return NextResponse.json({
      success: true,
      invoices: invoices || [],
      total: count || 0,
      page,
      limit,
    });
  } catch (err: any) {
    console.error("Admin invoices API error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
