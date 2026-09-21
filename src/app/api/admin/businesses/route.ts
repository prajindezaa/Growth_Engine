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
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "20", 10);
    const offset = (page - 1) * limit;

    let query = supabaseAdmin
      .from("businesses")
      .select("*, business_members(id, role, status, user_id)", { count: "exact" });

    if (search) {
      query = query.or(`name.ilike.%${search}%,phone.ilike.%${search}%,city.ilike.%${search}%,gstin.ilike.%${search}%`);
    }

    query = query.order("created_at", { ascending: false }).range(offset, offset + limit - 1);

    const { data: businesses, count, error } = await query;

    if (error) throw error;

    return NextResponse.json({
      success: true,
      businesses: businesses || [],
      total: count || 0,
      page,
      limit,
    });
  } catch (err: any) {
    console.error("Admin businesses API error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
