import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI, Type, type FunctionDeclaration } from "@google/genai";
import { createClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/lib/supabase/server";
import {
  type Role,
  canAccessSales,
  canCreateSales,
  canAccessPurchases,
  canAccessInventory,
  canAccessCustomers,
  canAccessSuppliers,
  canAccessProducts,
} from "@/lib/roles";

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

// ── Execute tool against Supabase with User Role Scoping ──
async function executeTool(
  toolName: string,
  args: Record<string, unknown>,
  businessId: string,
  role: Role,
  supabase: AnySupabase
): Promise<unknown> {
  // Permission checks before executing any backend query or action
  switch (toolName) {
    case "get_dashboard_stats": {
      // Cashier and delivery shouldn't access full business P&L dashboard
      if (role === "cashier" || role === "delivery") {
        return { error: `PERMISSION_DENIED: Your role (${role}) does not have permission to view overall business financial stats.` };
      }
      const { data, error } = await (supabase.rpc as Function)("get_dashboard_stats", { p_business_id: businessId });
      if (error) return { error: error.message };
      return data;
    }
    case "get_sales_trend": {
      if (role === "cashier" || role === "delivery") {
        return { error: `PERMISSION_DENIED: Your role (${role}) cannot access historical sales trend analytics.` };
      }
      const { data, error } = await (supabase.rpc as Function)("get_sales_trend", {
        p_business_id: businessId,
        p_days: (args.days as number) || 30,
      });
      if (error) return { error: error.message };
      return data;
    }
    case "get_top_products": {
      if (!canAccessProducts(role)) {
        return { error: `PERMISSION_DENIED: Your role (${role}) cannot access product revenue rankings.` };
      }
      const { data, error } = await (supabase.rpc as Function)("get_top_products", {
        p_business_id: businessId,
        p_limit: (args.limit as number) || 5,
      });
      if (error) return { error: error.message };
      return data;
    }
    case "get_customer_outstanding": {
      if (role === "delivery") {
        return { error: `PERMISSION_DENIED: Your role (${role}) cannot view customer financial balances.` };
      }
      const { data, error } = await (supabase.rpc as Function)("get_customer_outstanding", { p_business_id: businessId });
      if (error) return { error: error.message };
      return data;
    }
    case "get_supplier_outstanding": {
      if (!canAccessSuppliers(role)) {
        return { error: `PERMISSION_DENIED: Your role (${role}) cannot view supplier accounts payable.` };
      }
      const { data, error } = await (supabase.rpc as Function)("get_supplier_outstanding", { p_business_id: businessId });
      if (error) return { error: error.message };
      return data;
    }
    case "get_low_stock_products": {
      if (!canAccessInventory(role)) {
        return { error: `PERMISSION_DENIED: Your role (${role}) does not have permission to inspect inventory levels.` };
      }
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
      if (!canAccessSales(role)) {
        return { error: `PERMISSION_DENIED: Your role (${role}) cannot view invoice history.` };
      }
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
      if (!canAccessCustomers(role)) {
        return { error: `PERMISSION_DENIED: Your role (${role}) cannot access customer order history.` };
      }
      const { data: customers } = await supabase
        .from("customers")
        .select("id, name")
        .eq("business_id", businessId)
        .ilike("name", `%${args.customer_name}%`);
      if (!customers?.length) return { not_found: true, message: `I couldn't find any customer matching "${args.customer_name}".` };
      if (customers.length > 1) {
        return {
          multiple_matches: true,
          options: customers.map((c: any) => c.name),
          message: `I found ${customers.length} customers matching "${args.customer_name}": ${customers.map((c: any) => c.name).join(", ")}. Which one did you mean?`
        };
      }
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
      if (role !== "owner" && role !== "admin" && role !== "manager" && role !== "accountant") {
        return { error: `PERMISSION_DENIED: Your role (${role}) cannot view total inventory valuation.` };
      }
      const { data } = await supabase
        .from("products")
        .select("current_stock, purchase_price")
        .eq("business_id", businessId)
        .eq("is_active", true);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const totalValue = (data || []).reduce((sum: number, p: any) => sum + (p.current_stock || 0) * (p.purchase_price || 0), 0);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const totalUnits = (data || []).reduce((sum: number, p: any) => sum + (p.current_stock || 0), 0);
      return { total_value: totalValue, total_units: totalUnits, product_count: data?.length || 0 };
    }
    // ── ACTION TOOLS (return previews, never direct mutations) ──
    case "prepare_quotation": {
      if (!canCreateSales(role)) {
        return { error: `PERMISSION_DENIED: Your role (${role}) does not have permission to create sales quotations.` };
      }
      // Look up customer
      const { data: custs } = await supabase.from("customers").select("id, name, phone, email")
        .eq("business_id", businessId).ilike("name", `%${args.customer_name}%`).limit(5);
      if (!custs?.length) return { not_found: true, error: `Customer matching "${args.customer_name}" was not found.` };
      if (custs.length > 1) {
        return {
          multiple_matches: true,
          options: custs.map((c: any) => c.name),
          message: `Found multiple customers matching "${args.customer_name}": ${custs.map((c: any) => c.name).join(", ")}. Please specify which customer.`
        };
      }
      const customer = custs[0] as { id: string; name: string; phone?: string; email?: string };

      // Look up products
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const requestedItems = (args.items as any[]) || [];
      if (requestedItems.length === 0) {
        return { error: "Please specify at least one product and quantity to prepare a quotation." };
      }
      const resolvedItems = [];
      for (const item of requestedItems) {
        const { data: prods } = await supabase.from("products").select("id, name, selling_price, tax_rate, current_stock")
          .eq("business_id", businessId).eq("is_active", true).ilike("name", `%${item.product_name}%`).limit(5);
        if (!prods?.length) return { not_found: true, error: `Product "${item.product_name}" was not found in catalog.` };
        if (prods.length > 1) {
          return {
            multiple_matches: true,
            options: prods.map((p: any) => p.name),
            message: `Found multiple products matching "${item.product_name}": ${prods.map((p: any) => p.name).join(", ")}. Which one would you like to add?`
          };
        }
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
      const taxTotal = resolvedItems.reduce((s, i) => s + i.quantity * i.unit_price * (i.tax_rate / 100), 0);
      const grandTotal = subtotal + taxTotal;

      return {
        __action__: "create_quotation",
        preview: {
          customer, items: resolvedItems,
          subtotal: Math.round(subtotal * 100) / 100,
          tax_total: Math.round(taxTotal * 100) / 100,
          grand_total: Math.round(grandTotal * 100) / 100,
        },
        confirm_message: `Create quotation for ${customer.name} with ${resolvedItems.length} item(s) totaling ₹${grandTotal.toLocaleString("en-IN")}?`,
      };
    }
    case "prepare_payment": {
      if (!canAccessSales(role)) {
        return { error: `PERMISSION_DENIED: Your role (${role}) does not have permission to record customer payments.` };
      }
      const { data: custs } = await supabase.from("customers").select("id, name")
        .eq("business_id", businessId).ilike("name", `%${args.customer_name}%`).limit(5);
      if (!custs?.length) return { not_found: true, error: `Customer matching "${args.customer_name}" was not found.` };
      if (custs.length > 1) {
        return {
          multiple_matches: true,
          options: custs.map((c: any) => c.name),
          message: `Found multiple customers matching "${args.customer_name}": ${custs.map((c: any) => c.name).join(", ")}. Which one are you recording payment for?`
        };
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const customer = custs[0] as any;

      // Find unpaid invoices
      const { data: invoices } = await supabase.from("invoices")
        .select("id, invoice_number, grand_total, amount_paid, status, payment_status")
        .eq("business_id", businessId).eq("customer_id", customer.id)
        .neq("payment_status", "paid").neq("status", "cancelled").neq("status", "draft")
        .order("created_at", { ascending: true }).limit(5);

      if (!invoices?.length) return { not_found: true, error: `No unpaid invoices found for ${customer.name}.` };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const invoice = invoices[0] as any;
      const balanceDue = invoice.grand_total - (invoice.amount_paid || 0);
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
      if (!canAccessSales(role)) {
        return { error: `PERMISSION_DENIED: Your role (${role}) cannot share customer invoices.` };
      }
      const { data: custs } = await supabase.from("customers").select("id, name, phone, email")
        .eq("business_id", businessId).ilike("name", `%${args.customer_name}%`).limit(5);
      if (!custs?.length) return { not_found: true, error: `Customer matching "${args.customer_name}" was not found.` };
      if (custs.length > 1) {
        return {
          multiple_matches: true,
          options: custs.map((c: any) => c.name),
          message: `Found multiple customers matching "${args.customer_name}": ${custs.map((c: any) => c.name).join(", ")}. Which customer's invoice should I send?`
        };
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const customer = custs[0] as any;

      const { data: invoices } = await supabase.from("invoices")
        .select("id, invoice_number, grand_total, amount_paid, status")
        .eq("business_id", businessId).eq("customer_id", customer.id)
        .neq("status", "draft").neq("status", "cancelled")
        .order("created_at", { ascending: false }).limit(1);

      if (!invoices?.length) return { not_found: true, error: `No finalized invoices found for ${customer.name}.` };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const invoice = invoices[0] as any;

      return {
        __action__: "send_invoice",
        preview: { customer, invoice },
        confirm_message: `Share ${invoice.invoice_number} (₹${invoice.grand_total.toLocaleString("en-IN")}) with ${customer.name} via WhatsApp?`,
      };
    }
    default:
      return { error: "Unknown tool or action request." };
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
      return NextResponse.json({ error: "Something went wrong on my end — please try again." }, { status: 500 });
    }

    // Authenticated Supabase client
    let supabase;
    if (accessToken) {
      supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        global: { headers: { Authorization: `Bearer ${accessToken}` } },
      });
    } else {
      supabase = await createServerClient();
    }

    // Verify user & role membership (AI operates strictly AS the logged-in user)
    const { data: { user } } = await supabase.auth.getUser();
    let userRole: Role = "sales";
    if (user) {
      const { data: member } = await supabase
        .from("business_members")
        .select("role")
        .eq("business_id", businessId)
        .eq("user_id", user.id)
        .single();
      if (member?.role) userRole = member.role as Role;
    }

    // AI Employee Operating Contract System Prompt
    const systemPrompt = `You are GrowthEngine AI, the autonomous AI Employee for an Indian MSME.
You operate under a STRICT PERMANENT OPERATING CONTRACT:

1. TRUTH & DETERMINISM:
- Always use tools to get REAL data. NEVER fabricate, estimate, or guess numbers, customers, or products.
- All financial calculations (totals, tax, balances) are deterministic and computed by tools/database. Only narrate them.
- Format all money values as ₹ with Indian numbering (e.g. ₹1,42,500, not ₹142,500). Round to whole rupees unless paise is specifically requested.
- State confidence/grounding plainly: e.g. "Based on your invoices from the last 30 days..."

2. ROLE PERMISSION & SCOPE:
- The current user's role is: "${userRole}".
- NEVER bypass role permissions. If a user asks for something outside their role (e.g., cashier asking for full P&L, or delivery asking for financial balance), decline politely in one clear sentence explaining why.
- NEVER access or reference data from another business. All operations are strictly bound to business_id.

3. RESPONSE STRUCTURE:
- Sentence 1: Lead directly with the answer/number. No fluff or preamble like "I'd be happy to help".
- Sentence 2: One short supporting sentence with context or trend if useful.
- Sentence 3: Exactly ONE natural next step offer (e.g. "Want me to list the overdue customers?"). Do not provide a wall of suggestions.

4. AMBIGUITY & MULTIPLE MATCHES:
- When a request is ambiguous or there are multiple matches (e.g. two customers named "Ravi"), ask ONE clarifying question or present the choices. Never guess.

5. CONFIRM-BEFORE-EXECUTE:
- For actions (prepare_quotation, prepare_payment, prepare_send_invoice), you PREPARE a preview. You NEVER mutate or execute directly.
- The UI will present an interactive Confirm / Cancel card to the user.
- If data is not found or cannot be answered, state plainly what was missing. Never invent answers.`;

    const ai = new GoogleGenAI({ apiKey });

    let response;
    try {
      response = await ai.models.generateContent({
        model: "gemini-3.6-flash",
        contents: [{ role: "user", parts: [{ text: question }] }],
        config: {
          systemInstruction: systemPrompt,
          tools: [{ functionDeclarations: TOOL_DEFINITIONS }],
        },
      });
    } catch (apiErr) {
      console.error("Gemini API generation error:", apiErr);
      return NextResponse.json({
        response: "Something went wrong on my end — please try again.",
        answer: "Something went wrong on my end — please try again.",
      }, { status: 200 });
    }

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
        const result = await executeTool(fc.name!, toolArgs, businessId, userRole, supabase);
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
          finalText = pendingAction.confirm_message || "I have prepared the action preview. Please review and confirm below:";
        } else {
          finalText = "Here are the details based on your request:";
        }
      } catch (genErr) {
        console.warn("Follow-up generateContent error:", genErr);
        if (pendingAction) {
          finalText = pendingAction.confirm_message || "I have prepared the action preview. Please review and confirm below:";
        } else {
          finalText = "Here are the details based on your request:";
        }
      }
    } else {
      finalText = parts.map((p) => p.text).filter(Boolean).join("") ||
        "I'm not sure how to answer that with the data I have access to.";
    }

    const durationMs = Date.now() - startTime;

    // Log interaction to AI history
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
    return NextResponse.json({
      response: "Something went wrong on my end — please try again.",
      answer: "Something went wrong on my end — please try again.",
    }, { status: 200 });
  }
}
