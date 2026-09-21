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
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "20", 10);
    const offset = (page - 1) * limit;

    let query = supabaseAdmin
      .from("products")
      .select(`
        *,
        businesses:business_id (id, name, city)
      `, { count: "exact" });

    if (businessId) {
      query = query.eq("business_id", businessId);
    }
    if (search) {
      query = query.or(`name.ilike.%${search}%,sku.ilike.%${search}%,category.ilike.%${search}%`);
    }

    query = query.order("created_at", { ascending: false }).range(offset, offset + limit - 1);

    const { data: products, count, error } = await query;

    if (error) throw error;

    return NextResponse.json({
      success: true,
      products: products || [],
      total: count || 0,
      page,
      limit,
    });
  } catch (err: any) {
    console.error("Admin products API error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
