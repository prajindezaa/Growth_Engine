import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const businessId = searchParams.get("businessId");

  if (!businessId) {
    return NextResponse.json({ error: "businessId is required" }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Verify membership
  const { data: membership } = await supabase
    .from("business_members")
    .select("role")
    .eq("business_id", businessId)
    .eq("user_id", user.id)
    .single();

  if (!membership) {
    return NextResponse.json({ error: "Access denied" }, { status: 403 });
  }

  try {
    const today = new Date().toISOString().split("T")[0];

    // Fetch data in parallel for insights, recommendations, actions, and history
    const [
      invoicesRes,
      productsRes,
      customersRes,
      actionsRes,
      historyRes,
    ] = await Promise.all([
      // Invoices for outstanding & trend analysis
      supabase
        .from("invoices")
        .select("id, invoice_number, grand_total, amount_paid, payment_status, due_date, status, customer_id, customers(name, phone)")
        .eq("business_id", businessId)
        .order("created_at", { ascending: false })
        .limit(50),

      // Products for low-stock and inventory observations
      supabase
        .from("products")
        .select("id, name, sku, current_stock, min_stock, purchase_price, selling_price")
        .eq("business_id", businessId)
        .order("current_stock", { ascending: true })
        .limit(30),

      // Customers for dormancy checks
      supabase
        .from("customers")
        .select("id, name, phone, email, created_at")
        .eq("business_id", businessId)
        .limit(50),

      // Recent AI actions from audit table
      supabase
        .from("ai_action_audit")
        .select("*")
        .eq("business_id", businessId)
        .order("created_at", { ascending: false })
        .limit(20),

      // Past AI conversations from interactions table
      supabase
        .from("ai_interactions")
        .select("*")
        .eq("business_id", businessId)
        .order("created_at", { ascending: false })
        .limit(30),
    ]);

    const invoices = invoicesRes.data || [];
    const products = productsRes.data || [];
    const customers = customersRes.data || [];
    const actions = actionsRes.data || [];
    const history = historyRes.data || [];

    // ── Generate AI Insights ──
    const insights: Array<{
      id: string;
      title: string;
      description: string;
      category: "sales" | "inventory" | "finance";
      impact: "high" | "medium" | "low";
      icon: string;
    }> = [];

    // 1. Overdue invoices check
    const overdueInvoices = invoices.filter(
      (i) => i.due_date && i.due_date < today && i.payment_status !== "paid" && i.status !== "cancelled"
    );
    const overdueTotal = overdueInvoices.reduce(
      (sum, i) => sum + (Number(i.grand_total || 0) - Number(i.amount_paid || 0)),
      0
    );

    if (overdueInvoices.length > 0) {
      insights.push({
        id: "ins-overdue",
        title: `${overdueInvoices.length} Overdue Invoices Totaling ₹${overdueTotal.toLocaleString("en-IN")}`,
        description: "Multiple customer accounts have exceeded payment terms. Sending follow-ups can accelerate cash inflow.",
        category: "finance",
        impact: "high",
        icon: "⚠️",
      });
    }

    // 2. Low stock warning
    const lowStockItems = products.filter(
      (p) => Number(p.current_stock || 0) <= Number(p.min_stock || 5)
    );
    if (lowStockItems.length > 0) {
      insights.push({
        id: "ins-lowstock",
        title: `${lowStockItems.length} Products Approaching Depletion`,
        description: `Items including ${lowStockItems.slice(0, 2).map((p) => p.name).join(", ")} are at or below minimum buffer.`,
        category: "inventory",
        impact: "high",
        icon: "📦",
      });
    }

    // 3. Positive Sales Momentum
    const paidInvoices = invoices.filter((i) => i.payment_status === "paid");
    if (paidInvoices.length > 0) {
      const collected = paidInvoices.reduce((sum, i) => sum + Number(i.grand_total || 0), 0);
      insights.push({
        id: "ins-cashflow",
        title: `₹${collected.toLocaleString("en-IN")} Realized from Paid Invoices`,
        description: "Customer collections remain active. Healthy cash conversion across settled orders.",
        category: "sales",
        impact: "medium",
        icon: "📈",
      });
    }

    // ── Generate Actionable Recommendations ──
    const recommendations: Array<{
      id: string;
      title: string;
      description: string;
      actionText: string;
      prompt: string;
      type: "stock" | "payment" | "quotation";
      icon: string;
    }> = [];

    // Reorder recommendation
    if (lowStockItems.length > 0) {
      const target = lowStockItems[0];
      recommendations.push({
        id: `rec-stock-${target.id}`,
        title: `Restock ${target.name}`,
        description: `Current stock is ${target.current_stock} (Min: ${target.min_stock || 5}). Create purchase order to prevent lost sales.`,
        actionText: "Prepare Restock Order",
        prompt: `Create a purchase order for 20 units of ${target.name}`,
        type: "stock",
        icon: "🛒",
      });
    }

    // Overdue payment reminder recommendation
    if (overdueInvoices.length > 0) {
      const targetInv = overdueInvoices[0];
      const customerName = (targetInv.customers as any)?.name || "Customer";
      const balance = Number(targetInv.grand_total || 0) - Number(targetInv.amount_paid || 0);

      recommendations.push({
        id: `rec-pay-${targetInv.id}`,
        title: `Remind ${customerName} for Invoice ${targetInv.invoice_number}`,
        description: `Balance of ₹${balance.toLocaleString("en-IN")} is past due date (${targetInv.due_date}).`,
        actionText: "Send Payment Reminder",
        prompt: `Send invoice ${targetInv.invoice_number} reminder to ${customerName}`,
        type: "payment",
        icon: "💬",
      });
    }

    // Dormant customer quotation recommendation
    if (customers.length > 0) {
      const sampleCustomer = customers[0];
      recommendations.push({
        id: `rec-quote-${sampleCustomer.id}`,
        title: `Follow up with ${sampleCustomer.name}`,
        description: "Nurture customer engagement by preparing an updated quotation with trending items.",
        actionText: "Draft Quotation",
        prompt: `Create a quotation for ${sampleCustomer.name}`,
        type: "quotation",
        icon: "📝",
      });
    }

    return NextResponse.json({
      insights,
      recommendations,
      actions,
      history,
    });
  } catch (err: any) {
    console.error("AI Insights fetch error:", err);
    return NextResponse.json({ error: "Failed generating AI employee feed" }, { status: 500 });
  }
}
