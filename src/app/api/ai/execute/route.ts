import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export async function POST(req: NextRequest) {
  try {
    const { action_type, preview, audit_id, accessToken, businessId } = await req.json();

    if (!action_type || !preview || !accessToken || !businessId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Authenticated client — operates as the logged-in user, respecting RLS
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${accessToken}` } },
    });

    let result: Record<string, unknown> = {};

    switch (action_type) {
      case "create_quotation": {
        const { customer, items, subtotal, tax_total, grand_total } = preview;

        // Use existing create_quotation RPC or insert directly
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: qId, error: qErr } = await (supabase.rpc as Function)("create_quotation", {
          p_business_id: businessId,
          p_customer_id: customer.id,
          p_subtotal: subtotal,
          p_tax_total: tax_total,
          p_discount_total: 0,
          p_grand_total: grand_total,
          p_notes: "Created via AI Assistant",
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          p_items: items.map((i: any, idx: number) => ({
            product_id: i.product_id,
            product_name: i.product_name,
            quantity: i.quantity,
            unit_price: i.unit_price,
            tax_rate: i.tax_rate,
            discount: 0,
            line_total: i.line_total,
            sort_order: idx,
          })),
        });

        if (qErr) return NextResponse.json({ error: qErr.message }, { status: 400 });
        result = { quotation_id: qId, message: `Quotation created successfully for ${customer.name}` };
        break;
      }

      case "record_payment": {
        const { customer, invoice, amount, method } = preview;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: payId, error: payErr } = await (supabase.rpc as Function)("record_customer_payment", {
          p_business_id: businessId,
          p_customer_id: customer.id,
          p_invoice_id: invoice.id,
          p_amount: amount,
          p_method: method || "cash",
          p_note: "Recorded via AI Assistant",
        });

        if (payErr) return NextResponse.json({ error: payErr.message }, { status: 400 });
        result = { payment_id: payId, message: `₹${amount.toLocaleString("en-IN")} payment recorded against ${invoice.invoice_number}` };
        break;
      }

      case "send_invoice": {
        const { customer, invoice } = preview;
        const phone = customer.phone?.replace(/\D/g, "");
        const msg = `Hi ${customer.name}, please find your invoice ${invoice.invoice_number} for ₹${invoice.grand_total.toLocaleString("en-IN")}. Thank you!`;
        const waUrl = phone
          ? `https://wa.me/${phone.startsWith("91") ? phone : "91" + phone}?text=${encodeURIComponent(msg)}`
          : `https://wa.me/?text=${encodeURIComponent(msg)}`;

        result = { whatsapp_url: waUrl, message: `WhatsApp link generated for ${customer.name}` };
        break;
      }

      default:
        return NextResponse.json({ error: "Unknown action type" }, { status: 400 });
    }

    // Update audit log
    if (audit_id) {
      await supabase.from("ai_action_audit").update({
        status: "executed",
        action_result: result,
        executed_at: new Date().toISOString(),
      }).eq("id", audit_id);
    }

    return NextResponse.json({ success: true, ...result });
  } catch (err: unknown) {
    console.error("AI Execute error:", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
