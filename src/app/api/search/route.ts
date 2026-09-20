import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export interface SearchResultItem {
  id: string;
  type: "customer" | "product" | "invoice" | "order" | "quotation" | "purchase" | "supplier";
  title: string;
  subtitle: string;
  badge?: string;
  url: string;
}

export interface GroupedSearchResults {
  customers: SearchResultItem[];
  products: SearchResultItem[];
  invoices: SearchResultItem[];
  orders: SearchResultItem[];
  quotations: SearchResultItem[];
  purchases: SearchResultItem[];
  suppliers: SearchResultItem[];
  total: number;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const businessId = searchParams.get("businessId");
  const query = searchParams.get("q")?.trim();

  if (!businessId) {
    return NextResponse.json({ error: "businessId is required" }, { status: 400 });
  }

  if (!query || query.length < 1) {
    return NextResponse.json({
      customers: [],
      products: [],
      invoices: [],
      orders: [],
      quotations: [],
      purchases: [],
      suppliers: [],
      total: 0,
    });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Verify business membership
  const { data: membership } = await supabase
    .from("business_members")
    .select("role")
    .eq("business_id", businessId)
    .eq("user_id", user.id)
    .single();

  if (!membership) {
    return NextResponse.json({ error: "Access denied" }, { status: 403 });
  }

  const pattern = `%${query}%`;
  const base = `/app/${businessId}`;

  try {
    // Run parallel entity searches
    const [
      customersRes,
      productsRes,
      invoicesRes,
      ordersRes,
      quotationsRes,
      purchasesRes,
      suppliersRes,
    ] = await Promise.all([
      // 1. Customers
      supabase
        .from("customers")
        .select("id, name, phone, email, gstin")
        .eq("business_id", businessId)
        .or(`name.ilike.${pattern},phone.ilike.${pattern},email.ilike.${pattern},gstin.ilike.${pattern}`)
        .limit(5),

      // 2. Products
      supabase
        .from("products")
        .select("id, name, sku, barcode, category, selling_price")
        .eq("business_id", businessId)
        .or(`name.ilike.${pattern},sku.ilike.${pattern},barcode.ilike.${pattern},category.ilike.${pattern}`)
        .limit(5),

      // 3. Invoices
      supabase
        .from("invoices")
        .select("id, invoice_number, grand_total, payment_status, status, customers(name)")
        .eq("business_id", businessId)
        .or(`invoice_number.ilike.${pattern},notes.ilike.${pattern}`)
        .limit(5),

      // 4. Sales Orders
      supabase
        .from("sales_orders")
        .select("id, order_number, grand_total, status, customers(name)")
        .eq("business_id", businessId)
        .or(`order_number.ilike.${pattern},notes.ilike.${pattern}`)
        .limit(5),

      // 5. Quotations
      supabase
        .from("quotations")
        .select("id, quotation_number, grand_total, status, customers(name)")
        .eq("business_id", businessId)
        .or(`quotation_number.ilike.${pattern},notes.ilike.${pattern}`)
        .limit(5),

      // 6. Purchases
      supabase
        .from("purchases")
        .select("id, purchase_number, grand_total, status, suppliers(name)")
        .eq("business_id", businessId)
        .or(`purchase_number.ilike.${pattern},notes.ilike.${pattern}`)
        .limit(5),

      // 7. Suppliers
      supabase
        .from("suppliers")
        .select("id, name, phone, email, contact_person")
        .eq("business_id", businessId)
        .or(`name.ilike.${pattern},phone.ilike.${pattern},email.ilike.${pattern},contact_person.ilike.${pattern}`)
        .limit(5),
    ]);

    // Format Customers
    const customers: SearchResultItem[] = (customersRes.data || []).map((c: any) => ({
      id: c.id,
      type: "customer",
      title: c.name,
      subtitle: [c.phone, c.email].filter(Boolean).join(" • ") || "Customer",
      badge: c.gstin ? "GST" : undefined,
      url: `${base}/customers/${c.id}`,
    }));

    // Format Products
    const products: SearchResultItem[] = (productsRes.data || []).map((p: any) => ({
      id: p.id,
      type: "product",
      title: p.name,
      subtitle: [p.sku ? `SKU: ${p.sku}` : null, p.category, `₹${p.selling_price}`]
        .filter(Boolean)
        .join(" • "),
      badge: p.category || undefined,
      url: `${base}/products/${p.id}`,
    }));

    // Format Invoices
    const invoices: SearchResultItem[] = (invoicesRes.data || []).map((inv: any) => {
      const customerName = inv.customers?.name || "Customer";
      return {
        id: inv.id,
        type: "invoice",
        title: `Invoice ${inv.invoice_number}`,
        subtitle: `${customerName} • ₹${Number(inv.grand_total || 0).toLocaleString("en-IN")}`,
        badge: inv.payment_status?.toUpperCase() || inv.status?.toUpperCase(),
        url: `${base}/sales/invoices/${inv.id}`,
      };
    });

    // Format Sales Orders
    const orders: SearchResultItem[] = (ordersRes.data || []).map((o: any) => {
      const customerName = o.customers?.name || "Customer";
      return {
        id: o.id,
        type: "order",
        title: `Order ${o.order_number}`,
        subtitle: `${customerName} • ₹${Number(o.grand_total || 0).toLocaleString("en-IN")}`,
        badge: o.status?.toUpperCase(),
        url: `${base}/sales/orders/${o.id}`,
      };
    });

    // Format Quotations
    const quotations: SearchResultItem[] = (quotationsRes.data || []).map((q: any) => {
      const customerName = q.customers?.name || "Customer";
      return {
        id: q.id,
        type: "quotation",
        title: `Quotation ${q.quotation_number}`,
        subtitle: `${customerName} • ₹${Number(q.grand_total || 0).toLocaleString("en-IN")}`,
        badge: q.status?.toUpperCase(),
        url: `${base}/sales/quotations/${q.id}`,
      };
    });

    // Format Purchases
    const purchases: SearchResultItem[] = (purchasesRes.data || []).map((pu: any) => {
      const supplierName = pu.suppliers?.name || "Supplier";
      return {
        id: pu.id,
        type: "purchase",
        title: `Purchase ${pu.purchase_number}`,
        subtitle: `${supplierName} • ₹${Number(pu.grand_total || 0).toLocaleString("en-IN")}`,
        badge: pu.status?.toUpperCase(),
        url: `${base}/purchases/${pu.id}`,
      };
    });

    // Format Suppliers
    const suppliers: SearchResultItem[] = (suppliersRes.data || []).map((s: any) => ({
      id: s.id,
      type: "supplier",
      title: s.name,
      subtitle: [s.contact_person, s.phone, s.email].filter(Boolean).join(" • ") || "Supplier",
      url: `${base}/suppliers/${s.id}`,
    }));

    const total =
      customers.length +
      products.length +
      invoices.length +
      orders.length +
      quotations.length +
      purchases.length +
      suppliers.length;

    return NextResponse.json({
      customers,
      products,
      invoices,
      orders,
      quotations,
      purchases,
      suppliers,
      total,
    });
  } catch (err: any) {
    console.error("Global search error:", err);
    return NextResponse.json({ error: "Search failed" }, { status: 500 });
  }
}
