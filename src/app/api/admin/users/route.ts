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

    // Fetch users with their business memberships
    let query = supabaseAdmin
      .from("profiles")
      .select(`
        id,
        full_name,
        email,
        phone,
        default_business_id,
        created_at,
        updated_at,
        businesses:default_business_id (id, name, city, state)
      `, { count: "exact" });

    if (search) {
      query = query.or(`full_name.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%`);
    }

    query = query.order("created_at", { ascending: false }).range(offset, offset + limit - 1);

    const { data: users, count, error } = await query;

    if (error) throw error;

    return NextResponse.json({
      success: true,
      users: users || [],
      total: count || 0,
      page,
      limit,
    });
  } catch (err: any) {
    console.error("Admin users API error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
