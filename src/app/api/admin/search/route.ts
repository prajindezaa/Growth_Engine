import { NextRequest, NextResponse } from "next/server";
import { verifyAdminAuth, supabaseAdmin } from "@/lib/admin/auth";

export async function GET(req: NextRequest) {
  const admin = await verifyAdminAuth(req);
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const q = (searchParams.get("q") || "").trim();

    if (!q || q.length < 2) {
      return NextResponse.json({ results: [] });
    }

    const [usersRes, businessesRes, invoicesRes, productsRes, customersRes] = await Promise.all([
      supabaseAdmin.from("profiles").select("id, full_name, email, phone").or(`full_name.ilike.%${q}%,email.ilike.%${q}%`).limit(5),
      supabaseAdmin.from("businesses").select("id, name, city, gstin").or(`name.ilike.%${q}%,city.ilike.%${q}%,gstin.ilike.%${q}%`).limit(5),
      supabaseAdmin.from("invoices").select("id, invoice_number, customer_name, grand_total").or(`invoice_number.ilike.%${q}%,customer_name.ilike.%${q}%`).limit(5),
      supabaseAdmin.from("products").select("id, name, sku, category").or(`name.ilike.%${q}%,sku.ilike.%${q}%`).limit(5),
      supabaseAdmin.from("customers").select("id, name, phone, city").or(`name.ilike.%${q}%,phone.ilike.%${q}%`).limit(5),
    ]);

    return NextResponse.json({
      success: true,
      results: {
        users: usersRes.data || [],
        businesses: businessesRes.data || [],
        invoices: invoicesRes.data || [],
        products: productsRes.data || [],
        customers: customersRes.data || [],
      },
    });
  } catch (err: any) {
    console.error("Global search API error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
