import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI, Type, type FunctionDeclaration } from "@google/genai";
import { createClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/lib/supabase/server";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// ── Tool definitions for Gemini ──
const TOOL_DEFINITIONS: FunctionDeclaration[] = [
  {
    name: "get_dashboard_stats",
    description: "Get overall business statistics: today's sales, average daily sales, total receivable, total payable, overdue count & amount, due today, due this week, low stock count, pending orders, total products/customers/suppliers.",
    parameters: {
      type: Type.OBJECT,
      properties: {},
    },
  },
  {
    name: "get_sales_trend",
    description: "Get daily sales totals for the last N days. Returns array of {d: date, total: number}.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        days: { type: Type.NUMBER, description: "Number of days (default 30)" },
      },
    },
  },
  {
    name: "get_top_products",
    description: "Get top selling products this month by revenue. Returns array of {product_name, total_qty, total_revenue}.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        limit: { type: Type.NUMBER, description: "Number of products (default 5)" },
      },
    },
  },
  {
    name: "get_customer_outstanding",
    description: "Get customer-wise outstanding receivable amounts. Returns array of {id, name, outstanding}.",
    parameters: { type: Type.OBJECT, properties: {} },
  },
  {
    name: "get_supplier_outstanding",
    description: "Get supplier-wise outstanding payable amounts. Returns array of {id, name, outstanding}.",
    parameters: { type: Type.OBJECT, properties: {} },
  },
  {
    name: "get_low_stock_products",
    description: "Get products where current_stock <= min_stock. Returns array of {name, sku, current_stock, min_stock}.",
    parameters: { type: Type.OBJECT, properties: {} },
  },
  {
    name: "get_recent_invoices",
    description: "Get the most recent invoices with customer name and status.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        limit: { type: Type.NUMBER, description: "Number of invoices (default 10)" },
        status_filter: { type: Type.STRING, description: "Optional status filter: draft, finalized, paid, partially_paid, overdue, cancelled" },
      },
    },
  },
  {
    name: "get_customer_orders",
    description: "Get recent invoices/orders for a specific customer by name.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        customer_name: { type: Type.STRING, description: "Customer name to search (partial match)" },
        limit: { type: Type.NUMBER, description: "Number of results (default 10)" },
      },
      required: ["customer_name"],
    },
  },
  {
    name: "get_inventory_value",
    description: "Get total inventory valuation (sum of current_stock * purchase_price) and total units in stock.",
    parameters: { type: Type.OBJECT, properties: {} },
  },
  // ── ACTION TOOLS (return previews, not mutations) ──
  {
    name: "prepare_quotation",
    description: "Prepare a quotation for a customer. Looks up the customer and products, validates them, and returns a preview for user confirmation. Does NOT create anything yet.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        customer_name: { type: Type.STRING, description: "Customer name (partial match)" },
        items: { type: Type.ARRAY, description: "Array of {product_name, quantity}", items: {
          type: Type.OBJECT,
          properties: {
            product_name: { type: Type.STRING, description: "Product name (partial match)" },
            quantity: { type: Type.NUMBER, description: "Quantity" },
          },
          required: ["product_name", "quantity"],
        }},
      },
      required: ["customer_name", "items"],
    },
  },
  {
    name: "prepare_payment",
    description: "Prepare to record a customer payment against an invoice. Looks up the customer and their unpaid invoices, validates the amount, and returns a preview for user confirmation. Does NOT record anything yet.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        customer_name: { type: Type.STRING, description: "Customer name" },
        amount: { type: Type.NUMBER, description: "Payment amount in ₹" },
        method: { type: Type.STRING, description: "Payment method: cash, bank, upi, cheque (default: cash)" },
      },
      required: ["customer_name", "amount"],
    },
  },
  {
    name: "prepare_send_invoice",
    description: "Prepare to share/send the latest invoice to a customer via WhatsApp. Looks up the customer's latest finalized invoice and returns a preview for confirmation.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        customer_name: { type: Type.STRING, description: "Customer name" },
      },
      required: ["customer_name"],
    },
  },
];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySupabase = ReturnType<typeof createClient<any>>;

// ── Execute tool against Supabase ──
async function executeTool(
  toolName: string,
  args: Record<string, unknown>,
  businessId: string,
  supabase: AnySupabase
): Promise<unknown> {
  switch (toolName) {
    case "get_dashboard_stats": {
      const { data } = await (supabase.rpc as Function)("get_dashboard_stats", { p_business_id: businessId });
      return data;
    }
    case "get_sales_trend": {
      const { data } = await (supabase.rpc as Function)("get_sales_trend", {
        p_business_id: businessId,
        p_days: (args.days as number) || 30,
      });
      return data;
    }
    case "get_top_products": {
      const { data } = await (supabase.rpc as Function)("get_top_products", {
        p_business_id: businessId,
        p_limit: (args.limit as number) || 5,
      });
      return data;
    }
    case "get_customer_outstanding": {
      const { data } = await (supabase.rpc as Function)("get_customer_outstanding", { p_business_id: businessId });
      return data;
    }
    case "get_supplier_outstanding": {
      const { data } = await (supabase.rpc as Function)("get_supplier_outstanding", { p_business_id: businessId });
      return data;
    }
    case "get_low_stock_products": {
      const { data } = await supabase
        .from("products")
        .select("name, sku, current_stock, min_stock")
        .eq("business_id", businessId)
        .eq("is_active", true)
        .order("current_stock");
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const filtered = (data || []).filter((p: any) => p.current_stock <= p.min_stock);
      return filtered;
    }
    case "get_recent_invoices": {
      let query = supabase
        .from("invoices")
        .select("invoice_number, status, payment_status, grand_total, amount_paid, created_at, customers(name)")
        .eq("business_id", businessId)
        .order("created_at", { ascending: false })
        .limit((args.limit as number) || 10);
      if (args.status_filter) query = query.eq("status", args.status_filter);
      const { data } = await query;
      return data;
    }
    case "get_customer_orders": {
      const { data: customers } = await supabase
        .from("customers")
        .select("id, name")
        .eq("business_id", businessId)
        .ilike("name", `%${args.customer_name}%`);
      if (!customers?.length) return { message: "No customer found with that name" };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const customerIds = customers.map((c: any) => c.id);
      const { data: invoices } = await supabase
        .from("invoices")
        .select("invoice_number, status, payment_status, grand_total, amount_paid, created_at")
        .eq("business_id", businessId)
        .in("customer_id", customerIds)
        .order("created_at", { ascending: false })
        .limit((args.limit as number) || 10);
      return { customers, invoices };
    }
    case "get_inventory_value": {
      const { data } = await supabase
        .from("products")
        .select("current_stock, purchase_price")
        .eq("business_id", businessId)
        .eq("is_active", true);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const totalValue = (data || []).reduce((sum: number, p: any) => sum + p.current_stock * p.purchase_price, 0);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const totalUnits = (data || []).reduce((sum: number, p: any) => sum + p.current_stock, 0);
      return { total_value: totalValue, total_units: totalUnits, product_count: data?.length || 0 };
    }
    // ── ACTION TOOLS (return previews) ──
    case "prepare_quotation": {
      // Look up customer
      const { data: custs } = await supabase.from("customers").select("id, name, phone, email")
        .eq("business_id", businessId).ilike("name", `%${args.customer_name}%`).limit(1);
      if (!custs?.length) return { error: `No customer found matching "${args.customer_name}"` };
      const customer = custs[0] as { id: string; name: string; phone?: string; email?: string };

      // Look up products
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const requestedItems = args.items as any[];
      const resolvedItems = [];
      for (const item of requestedItems) {
        const { data: prods } = await supabase.from("products").select("id, name, selling_price, tax_rate, current_stock")
          .eq("business_id", businessId).eq("is_active", true).ilike("name", `%${item.product_name}%`).limit(1);
        if (!prods?.length) return { error: `Product "${item.product_name}" not found` };
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const prod = prods[0] as any;
        const lineTotal = item.quantity * prod.selling_price * (1 + (prod.tax_rate || 0) / 100);
        resolvedItems.push({
          product_id: prod.id, product_name: prod.name, quantity: item.quantity,
          unit_price: prod.selling_price, tax_rate: prod.tax_rate || 0,
          line_total: Math.round(lineTotal * 100) / 100, stock: prod.current_stock,
        });
      }

      const subtotal = resolvedItems.reduce((s, i) => s + i.quantity * i.unit_price, 0);
      const taxTotal = resolvedItems.reduce((s, i) => s + i.quantity * i.unit_price * i.tax_rate / 100, 0);
      const grandTotal = subtotal + taxTotal;

      return {
        __action__: "create_quotation",
        preview: {
          customer, items: resolvedItems,
          subtotal: Math.round(subtotal * 100) / 100,
          tax_total: Math.round(taxTotal * 100) / 100,
          grand_total: Math.round(grandTotal * 100) / 100,
        },
        confirm_message: `Create quotation for ${customer.name} with ${resolvedItems.length} item(s) totaling ₹${grandTotal.toFixed(2)}?`,
      };
    }
    case "prepare_payment": {
      const { data: custs } = await supabase.from("customers").select("id, name")
        .eq("business_id", businessId).ilike("name", `%${args.customer_name}%`).limit(1);
      if (!custs?.length) return { error: `No customer found matching "${args.customer_name}"` };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const customer = custs[0] as any;

      // Find unpaid invoices
      const { data: invoices } = await supabase.from("invoices")
        .select("id, invoice_number, grand_total, amount_paid, status, payment_status")
        .eq("business_id", businessId).eq("customer_id", customer.id)
        .neq("payment_status", "paid").neq("status", "cancelled").neq("status", "draft")
        .order("created_at", { ascending: true }).limit(5);

      if (!invoices?.length) return { error: `No unpaid invoices found for ${customer.name}` };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const invoice = invoices[0] as any;
      const balanceDue = invoice.grand_total - invoice.amount_paid;
      const payAmount = Math.min(args.amount as number, balanceDue);
      const isHighRisk = payAmount >= 50000;

      return {
        __action__: "record_payment",
        high_risk: isHighRisk,
        preview: {
          customer, invoice,
          amount: payAmount,
          method: (args.method as string) || "cash",
          balance_due: balanceDue,
          balance_after: balanceDue - payAmount,
        },
        confirm_message: `Record ₹${payAmount.toLocaleString("en-IN")} payment from ${customer.name} against ${invoice.invoice_number} (balance: ₹${balanceDue.toLocaleString("en-IN")})?${isHighRisk ? " ⚠️ HIGH VALUE — requires amount confirmation." : ""}`,
      };
    }
    case "prepare_send_invoice": {
      const { data: custs } = await supabase.from("customers").select("id, name, phone, email")
        .eq("business_id", businessId).ilike("name", `%${args.customer_name}%`).limit(1);
      if (!custs?.length) return { error: `No customer found matching "${args.customer_name}"` };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const customer = custs[0] as any;

      const { data: invoices } = await supabase.from("invoices")
        .select("id, invoice_number, grand_total, amount_paid, status")
        .eq("business_id", businessId).eq("customer_id", customer.id)
        .neq("status", "draft").neq("status", "cancelled")
        .order("created_at", { ascending: false }).limit(1);

      if (!invoices?.length) return { error: `No finalized invoices found for ${customer.name}` };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const invoice = invoices[0] as any;

      return {
        __action__: "send_invoice",
        preview: { customer, invoice },
        confirm_message: `Share ${invoice.invoice_number} (₹${invoice.grand_total.toLocaleString("en-IN")}) with ${customer.name} via WhatsApp?`,
      };
    }
    default:
      return { error: "Unknown tool" };
  }
}

export async function POST(req: NextRequest) {
  const startTime = Date.now();

  try {
    const { question, businessId, accessToken } = await req.json();

    if (!question || !businessId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "GEMINI_API_KEY not configured. Add it to .env.local" }, { status: 500 });
    }

    // Create authenticated Supabase client via cookie session or accessToken header
    let supabase;
    if (accessToken) {
      supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        global: { headers: { Authorization: `Bearer ${accessToken}` } },
      });
    } else {
      supabase = await createServerClient();
    }

    const ai = new GoogleGenAI({ apiKey });

    const systemPrompt = `You are GrowthEngine AI, a business assistant for an Indian SME.
You answer questions and can perform actions using ONLY the provided tools.

Rules:
- Always use tools to get real data. NEVER fabricate numbers.
- Format currency as ₹ with Indian number formatting.
- Keep answers concise (2-4 sentences) with key numbers highlighted.
- If a question can't be answered with available tools, say so honestly.
- Use a friendly, professional tone.

ACTION RULES:
- For actions (prepare_quotation, prepare_payment, prepare_send_invoice), you PREPARE a preview — you do NOT execute.
- The user will see a confirmation card with details. They must click Confirm to execute.
- When returning action previews, include all details clearly so the user can verify before confirming.
- For prepare_payment: always specify which invoice the payment applies to.
- NEVER skip the preview step. Always let the user confirm.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents: [{ role: "user", parts: [{ text: question }] }],
      config: {
        systemInstruction: systemPrompt,
        tools: [{ functionDeclarations: TOOL_DEFINITIONS }],
      },
    });

    let finalText = "";
    const toolsCalled: { name: string; args: Record<string, unknown>; result: unknown }[] = [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let pendingAction: any = null;

    const candidate = response.candidates?.[0];
    const parts = candidate?.content?.parts || [];
    const functionCalls = parts.filter((p) => p.functionCall);

    if (functionCalls.length > 0) {
      const functionResponses = [];
      for (const part of functionCalls) {
        const fc = part.functionCall!;
        const toolArgs = (fc.args || {}) as Record<string, unknown>;
        const result = await executeTool(fc.name!, toolArgs, businessId, supabase);
        toolsCalled.push({ name: fc.name!, args: toolArgs, result });

        // Check if this is an action preview
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const r = result as any;
        if (r?.__action__) {
          pendingAction = {
            action_type: r.__action__,
            preview: r.preview,
            confirm_message: r.confirm_message,
            high_risk: r.high_risk || false,
            business_id: businessId,
          };
        }

        functionResponses.push({
          functionResponse: {
            name: fc.name!,
            response: { output: result },
          },
        });
      }

      try {
        const followUp = await ai.models.generateContent({
          model: "gemini-3.6-flash",
          contents: [
            { role: "user", parts: [{ text: question }] },
            { role: "model", parts: functionCalls },
            { role: "user", parts: functionResponses },
          ],
          config: { systemInstruction: systemPrompt },
        });

        const followUpText = followUp.candidates?.[0]?.content?.parts?.map((p) => p.text).filter(Boolean).join("");
        if (followUpText) {
          finalText = followUpText;
        } else if (pendingAction) {
          finalText = pendingAction.confirm_message || "I have prepared the requested action. Please review and confirm below:";
        } else {
          finalText = "Here are the details based on your request:";
        }
      } catch (genErr) {
        console.warn("Follow-up generateContent error:", genErr);
        if (pendingAction) {
          finalText = pendingAction.confirm_message || "I have prepared the requested action. Please review and confirm below:";
        } else {
          finalText = "Action prepared based on your request:";
        }
      }
    } else {
      finalText = parts.map((p) => p.text).filter(Boolean).join("") ||
        "I'm not sure how to answer that with the data I have access to.";
    }

    const durationMs = Date.now() - startTime;

    // Log interaction (non-blocking)
    supabase.from("ai_interactions").insert({
      business_id: businessId,
      question,
      matched_intent: toolsCalled.map((t) => t.name).join(", ") || "none",
      tools_called: toolsCalled.map((t) => ({ name: t.name, args: t.args })),
      response: finalText,
      duration_ms: durationMs,
    }).then(() => {});

    // If there's a pending action, create an audit record
    if (pendingAction) {
      const { data: audit } = await supabase.from("ai_action_audit").insert({
        business_id: businessId,
        action_type: pendingAction.action_type,
        action_preview: pendingAction.preview,
        status: "pending",
      }).select("id").single();
      if (audit) pendingAction.audit_id = audit.id;
    }

    return NextResponse.json({
      response: finalText,
      answer: finalText,
      tools_called: toolsCalled.map((t) => t.name),
      toolsCalled: toolsCalled.map((t) => ({ name: t.name })),
      duration_ms: durationMs,
      duration: durationMs,
      ...(pendingAction ? { action: pendingAction } : {}),
    });
  } catch (err: unknown) {
    console.error("AI Chat error:", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
