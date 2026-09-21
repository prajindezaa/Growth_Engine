import { formatIndianCurrency } from "@/lib/utils";
import { AIRouteId, AIResponsePayload } from "@/types/ai-routes";
import { calculateLineItem, calculateDocumentTotals, logActionAudit } from "@/lib/calculations";
import { AnalyticsService } from "@/lib/services/analytics";
import { supabase } from "@/lib/supabase/client";

export interface RouteExecutorOptions {
  userRole?: "owner" | "admin" | "manager" | "sales" | "cashier" | "accountant";
  actionStatus?: "proposed" | "confirmed" | "rejected" | "cancelled";
  businessId?: string;
  userId?: string;
}

export async function executeRoute(
  route: AIRouteId,
  params: Record<string, any> = {},
  options: RouteExecutorOptions = {}
): Promise<AIResponsePayload> {
  const role = options.userRole || "owner";
  const bizId = options.businessId;

  switch (route) {
    // ============================================================
    // A) SALES & REVENUE (read-only)
    // ============================================================
    case "today_sales": {
      const today = new Date().toISOString().split("T")[0];
      const summary = await AnalyticsService.getSalesSummary(bizId, today);
      const todaySales = summary.totalSales;
      const count = summary.invoicesCount;
      const growth = "12%";
      return {
        route,
        reply: `Today's sales are ${formatIndianCurrency(todaySales)} across ${count} invoices. That's up ${growth} from yesterday.`,
        offeredNextStep: "Want me to show the top selling items today?",
      };
    }

    case "sales_by_period": {
      const summary = await AnalyticsService.getSalesSummary(bizId);
      const periodSales = summary.totalSales;
      return {
        route,
        reply: `This month's sales are ${formatIndianCurrency(periodSales)} so far, tracking about 6% ahead of last month at the same point.`,
        offeredNextStep: "Want to check your GSTR-3B tax estimate on this turnover?",
      };
    }

    case "top_products": {
      const topProduct = "UltraTech Cement 50kg";
      const bags = 580;
      const revenue = 223300;
      return {
        route,
        reply: `${topProduct} is your top seller this month — ${bags} bags, ${formatIndianCurrency(revenue)}.`,
        structuredCards: {
          type: "product_list",
          title: "Top 5 Products This Month",
          items: [
            {
              id: "prod_01",
              title: "UltraTech Cement 50kg",
              subtitle: "580 bags sold • Avg ₹385/bag",
              primaryValue: formatIndianCurrency(223300),
              badge: { text: "Rank #1", variant: "primary" },
              linkHref: "/products",
            },
            {
              id: "prod_02",
              title: "Asian Paints Apex Ultima (20L)",
              subtitle: "64 buckets sold • ₹4,200/bucket",
              primaryValue: formatIndianCurrency(268800),
              badge: { text: "Rank #2", variant: "neutral" },
              linkHref: "/products",
            },
            {
              id: "prod_03",
              title: "Havells 16A Switch Pack (10s)",
              subtitle: "140 packs sold • ₹950/pack",
              primaryValue: formatIndianCurrency(133000),
              badge: { text: "Rank #3", variant: "neutral" },
              linkHref: "/products",
            },
            {
              id: "prod_04",
              title: "Finolex 2.5 sq mm Copper Wire",
              subtitle: "85 coils sold • ₹1,240/coil",
              primaryValue: formatIndianCurrency(105400),
              badge: { text: "Rank #4", variant: "neutral" },
              linkHref: "/products",
            },
            {
              id: "prod_05",
              title: "Supreme PVC Pipe 4-inch (6m)",
              subtitle: "210 lengths • ₹530/length",
              primaryValue: formatIndianCurrency(111300),
              badge: { text: "Rank #5", variant: "neutral" },
              linkHref: "/products",
            },
          ],
        },
        offeredNextStep: "Want me to check reorder levels for these items?",
      };
    }

    case "top_customers": {
      const topCustomer = "Ravi Traders";
      const revenue = 118000;
      const orders = 6;
      return {
        route,
        reply: `${topCustomer} is your top customer this month at ${formatIndianCurrency(revenue)} across ${orders} orders.`,
        structuredCards: {
          type: "customer_list",
          title: "Top Buying Parties This Month",
          items: [
            {
              id: "cust_ravi",
              title: "Ravi Traders",
              subtitle: "Tiruppur • 6 orders this month",
              primaryValue: formatIndianCurrency(118000),
              badge: { text: "Top Buyer", variant: "primary" },
              linkHref: "/customers",
            },
            {
              id: "cust_murugan",
              title: "Murugan Traders",
              subtitle: "Coimbatore • 4 orders this month",
              primaryValue: formatIndianCurrency(84500),
              badge: { text: "Rank #2", variant: "neutral" },
              linkHref: "/customers",
            },
            {
              id: "cust_kavitha",
              title: "Kavitha Electricals & Hardware",
              subtitle: "Erode • 3 orders this month",
              primaryValue: formatIndianCurrency(62000),
              badge: { text: "Rank #3", variant: "neutral" },
              linkHref: "/customers",
            },
            {
              id: "cust_anand",
              title: "Anand Agencies",
              subtitle: "Pollachi • 2 orders this month",
              primaryValue: formatIndianCurrency(41200),
              badge: { text: "Rank #4", variant: "neutral" },
              linkHref: "/customers",
            },
          ],
        },
        offeredNextStep: "Want me to inspect their outstanding Khata balance?",
      };
    }

    case "sales_trend": {
      return {
        route,
        reply: `Sales are up 12% over the last 30 days compared to the 30 days before.`,
        offeredNextStep: "Want to open the full Reports & Trends page?",
      };
    }

    // ============================================================
    // B) OUTSTANDING / KHATA (read-only + one action route)
    // ============================================================
    case "total_outstanding": {
      const khataSummary = await AnalyticsService.getKhataSummary(bizId);
      const total = khataSummary.totalReceivables;
      const count = khataSummary.topDebtors.length;
      const topParty = khataSummary.topDebtors[0]?.name || "Ravi Traders";
      const topDue = khataSummary.topDebtors[0]?.outstandingBalance || 34500;
      const topDays = 8;
      return {
        route,
        reply: `You have ${formatIndianCurrency(total)} outstanding from ${count} customers. The largest is ${topParty} at ${formatIndianCurrency(topDue)}, overdue by ${topDays} days.`,
        offeredNextStep: "Want me to list all 6?",
      };
    }

    case "customers_above_threshold": {
      const threshold = params.threshold || 25000;
      const matchingCount = 3;
      const totalAbove = 94200;
      return {
        route,
        reply: `${matchingCount} customers owe more than ${formatIndianCurrency(threshold)}, totaling ${formatIndianCurrency(totalAbove)}.`,
        structuredCards: {
          type: "customer_list",
          title: `Overdue Customers > ${formatIndianCurrency(threshold)}`,
          items: [
            {
              id: "cust_ravi",
              title: "Ravi Traders",
              subtitle: "Tiruppur • Due 8 days ago • +91 98421 09876",
              primaryValue: formatIndianCurrency(34500),
              badge: { text: "Overdue 8d", variant: "danger" },
              linkHref: "/customers",
            },
            {
              id: "cust_kavitha",
              title: "Kavitha Electricals & Hardware",
              subtitle: "Erode • Due 5 days ago • +91 94432 11223",
              primaryValue: formatIndianCurrency(31200),
              badge: { text: "Overdue 5d", variant: "danger" },
              linkHref: "/customers",
            },
            {
              id: "cust_raja",
              title: "Raja Engineering Works",
              subtitle: "Coimbatore • Due 12 days ago • +91 99441 23890",
              primaryValue: formatIndianCurrency(28500),
              badge: { text: "Overdue 12d", variant: "danger" },
              linkHref: "/customers",
            },
          ],
        },
        offeredNextStep: "Want me to draft a reminder for Ravi Traders?",
      };
    }

    case "overdue_only": {
      const count = 4;
      const totalOverdue = 58300;
      const topParty = "Ravi Traders";
      const topDays = 8;
      return {
        route,
        reply: `${count} invoices are overdue, totaling ${formatIndianCurrency(totalOverdue)}. ${topParty} is the longest overdue at ${topDays} days.`,
        structuredCards: {
          type: "invoice_list",
          title: "Overdue Tax Invoices",
          items: [
            {
              id: "inv_101",
              title: "INV-101 • Ravi Traders",
              subtitle: "Due on 13 Sep 2026 (8 days overdue)",
              primaryValue: formatIndianCurrency(34500),
              badge: { text: "Overdue 8d", variant: "danger" },
              linkHref: "/invoices",
            },
            {
              id: "inv_102",
              title: "INV-102 • Kavitha Electricals",
              subtitle: "Due on 16 Sep 2026 (5 days overdue)",
              primaryValue: formatIndianCurrency(12400),
              badge: { text: "Overdue 5d", variant: "warning" },
              linkHref: "/invoices",
            },
            {
              id: "inv_103",
              title: "INV-103 • Raja Engineering",
              subtitle: "Due on 17 Sep 2026 (4 days overdue)",
              primaryValue: formatIndianCurrency(6800),
              badge: { text: "Overdue 4d", variant: "warning" },
              linkHref: "/invoices",
            },
            {
              id: "inv_104",
              title: "INV-104 • Anand Agencies",
              subtitle: "Due on 18 Sep 2026 (3 days overdue)",
              primaryValue: formatIndianCurrency(4600),
              badge: { text: "Overdue 3d", variant: "warning" },
              linkHref: "/invoices",
            },
          ],
        },
        offeredNextStep: "Should I send a payment reminder to Ravi Traders?",
      };
    }

    case "supplier_payables": {
      const totalOwed = 86400;
      const suppliersCount = 4;
      const topSupplier = "South India Cement Corp";
      const topOwed = 39680;
      return {
        route,
        reply: `You owe ${formatIndianCurrency(totalOwed)} across ${suppliersCount} suppliers. ${topSupplier} is the largest at ${formatIndianCurrency(topOwed)}.`,
        offeredNextStep: "Want me to list all supplier payables?",
      };
    }

    case "send_payment_reminder": {
      const customer = params.customer || "Ravi Traders";
      const amount = 34500;
      const daysOverdue = 8;
      const messageText = `Vanakkam Ravi Traders, polite reminder regarding pending invoice amount of ${formatIndianCurrency(amount)} overdue by ${daysOverdue} days. Click to pay via UPI: upi://pay?pa=lakshmi@upi&am=${amount}`;

      // 1. Audit Log: Log proposed action
      const audit = logActionAudit({
        route: "send_payment_reminder",
        actionType: "whatsapp_payment_reminder",
        targetEntity: customer,
        status: options.actionStatus || "proposed",
        details: {
          customer,
          amount: formatIndianCurrency(amount),
          daysOverdue,
          channel: "WhatsApp",
        },
        userRole: role,
        isHighRisk: false,
      });

      return {
        route,
        reply: `Send a WhatsApp payment reminder to ${customer} for ${formatIndianCurrency(amount)}, overdue ${daysOverdue} days?`,
        actionProposal: {
          id: `act_${Date.now()}`,
          type: "send_payment_reminder",
          route: "send_payment_reminder",
          title: `WhatsApp Payment Reminder: ${customer}`,
          targetEntity: customer,
          what: `Send official payment reminder message to party on WhatsApp with dynamic UPI QR payment link.`,
          details: {
            "Party": customer,
            "Amount Due": formatIndianCurrency(amount),
            "Days Overdue": `${daysOverdue} days`,
            "Message Preview": `"${messageText}"`,
          },
          consequences: "Party will receive notification on WhatsApp. No ledger balances are changed until payment is logged.",
          status: "pending",
          auditId: audit.id,
        },
        offeredNextStep: "Confirm above to dispatch the reminder.",
        auditId: audit.id,
      };
    }

    // ============================================================
    // C) INVENTORY & STOCK (read-only + one action route)
    // ============================================================
    case "low_stock": {
      const invSummary = await AnalyticsService.getInventorySummary(bizId);
      const count = invSummary.lowStockCount;
      const firstCrit = invSummary.criticalProducts[0];
      const previewText = firstCrit ? `${firstCrit.name} (${firstCrit.stock} left)` : "several fast-moving items";
      return {
        route,
        reply: `${count} products are low in stock, including ${previewText}.`,
        structuredCards: {
          type: "product_list",
          title: "Low Inventory Alert",
          items: invSummary.criticalProducts.map((p) => ({
            id: p.id,
            title: p.name,
            subtitle: `Min threshold: ${p.minStockAlert} ${p.unit}`,
            primaryValue: `${p.stock} left`,
            badge: { text: p.status === "out_of_stock" ? "Out of Stock" : "Low Stock", variant: p.status === "out_of_stock" ? "danger" : "warning" },
            linkHref: "/products",
          })),
        },
        offeredNextStep: "Should I draft a purchase order for restocking?",
      };
    }

    case "out_of_stock": {
      const count = 3;
      return {
        route,
        reply: `${count} products are out of stock: Finolex 2.5 sq mm Copper Wire and 2 others.`,
        structuredCards: {
          type: "product_list",
          title: "Sold Out Products",
          items: [
            {
              id: "prod_wire",
              title: "Finolex 2.5 sq mm Copper Wire",
              subtitle: "SKU: WIRE-COP-25",
              primaryValue: "0 Coils",
              badge: { text: "Sold Out", variant: "danger" },
              linkHref: "/products",
            },
            {
              id: "prod_bearing",
              title: "Industrial Ball Bearing 6205-2RS",
              subtitle: "SKU: BRG-IND-6205",
              primaryValue: "0 Units",
              badge: { text: "Sold Out", variant: "danger" },
              linkHref: "/products",
            },
            {
              id: "prod_tape",
              title: "Steelgrip Insulation Tape (Black)",
              subtitle: "SKU: TAPE-INS-BLK",
              primaryValue: "0 Packs",
              badge: { text: "Sold Out", variant: "danger" },
              linkHref: "/products",
            },
          ],
        },
        offeredNextStep: "Want me to draft a restock PO for Finolex?",
      };
    }

    case "stock_level_specific": {
      const prod = params.product || "UltraTech Cement 50kg";
      const bags = 580;
      const unitCost = 385;
      const totalVal = bags * unitCost; // ₹2,23,300
      return {
        route,
        reply: `You have ${bags} bags of ${prod} in stock, worth about ${formatIndianCurrency(totalVal)} at cost.`,
        offeredNextStep: "Would you like to adjust stock or check recent bills for this item?",
      };
    }

    case "inventory_value": {
      const totalVal = 1842000;
      const skus = 148;
      return {
        route,
        reply: `Your total inventory is valued at approximately ${formatIndianCurrency(totalVal)} across ${skus} SKUs.`,
        offeredNextStep: "Want to inspect items near minimum stock threshold?",
      };
    }

    case "create_stock_adjustment": {
      const product = params.product || "UltraTech Cement 50kg";
      const currentStock = 580;
      const adjustmentQty = params.qty || 5;
      const newStock = currentStock - adjustmentQty;
      const reason = params.reason || "Damaged in transit";

      const audit = logActionAudit({
        route: "create_stock_adjustment",
        actionType: "inventory_adjustment",
        targetEntity: product,
        status: options.actionStatus || "proposed",
        details: {
          product,
          currentStock,
          adjustmentQty: `-${adjustmentQty}`,
          newStock,
          reason,
        },
        userRole: role,
        isHighRisk: false,
      });

      return {
        route,
        reply: `Reduce stock of ${product} by ${adjustmentQty} bags due to ${reason}?`,
        actionProposal: {
          id: `act_${Date.now()}`,
          type: "create_stock_adjustment",
          route: "create_stock_adjustment",
          title: `Stock Adjustment: ${product}`,
          targetEntity: product,
          what: `Reduce inventory stock by ${adjustmentQty} bags due to damage.`,
          details: {
            "Product": product,
            "Current Stock": `${currentStock} bags`,
            "Adjustment Amount": `-${adjustmentQty} bags`,
            "New Resulting Stock": `${newStock} bags`,
            "Reason": reason,
          },
          consequences: "Inventory count will be reduced immediately in database and logged to Stock Movement ledger.",
          status: "pending",
          auditId: audit.id,
        },
        offeredNextStep: "Confirm above to write this stock adjustment to the ledger.",
        auditId: audit.id,
      };
    }

    // ============================================================
    // D) CUSTOMERS & SUPPLIERS (read-only)
    // ============================================================
    case "customer_lookup": {
      const cust = params.customer || "Ravi Traders";
      const orders = 6;
      const totalBilled = 118000;
      const outstanding = 34500;
      return {
        route,
        reply: `${cust} has ordered ${orders} times this month, total ${formatIndianCurrency(totalBilled)}, with ${formatIndianCurrency(outstanding)} currently outstanding.`,
        structuredCards: {
          type: "customer_list",
          title: "Customer Profile",
          items: [
            {
              id: "cust_ravi",
              title: cust,
              subtitle: "Tiruppur • GST: 33AABCT9981A1Z1 • Ph: +91 98421 09876",
              primaryValue: formatIndianCurrency(outstanding),
              badge: { text: "Overdue 8d", variant: "danger" },
              linkHref: "/customers",
            },
          ],
        },
        offeredNextStep: "Want to call or send a statement via WhatsApp?",
      };
    }

    case "customer_last_order": {
      const cust = params.customer || "Ravi Traders";
      const daysAgo = 3;
      const invoiceAmt = 12400;
      return {
        route,
        reply: `${cust}'s last order was ${daysAgo} days ago, an invoice for ${formatIndianCurrency(invoiceAmt)}.`,
        offeredNextStep: "Want me to open that invoice?",
      };
    }

    case "new_customers": {
      const count = 4;
      return {
        route,
        reply: `You've added ${count} new customers this month.`,
        offeredNextStep: "Want to review your full customer directory?",
      };
    }

    case "supplier_lookup": {
      const supplier = params.supplier || "South India Cement Corp";
      const owed = 39680;
      const lastPaymentDays = 12;
      return {
        route,
        reply: `${supplier} — you owe ${formatIndianCurrency(owed)}, last payment made ${lastPaymentDays} days ago.`,
        offeredNextStep: "Would you like to draft a new Purchase Order to this supplier?",
      };
    }

    // ============================================================
    // E) PURCHASES (read-only + one action route)
    // ============================================================
    case "recent_purchases": {
      const count = 3;
      const totalPurchases = 112000;
      return {
        route,
        reply: `You've placed ${count} purchase orders this week, totaling ${formatIndianCurrency(totalPurchases)}.`,
        structuredCards: {
          type: "stats_list",
          title: "Recent Purchase Orders",
          items: [
            {
              id: "po_101",
              title: "PO-2026-0045 • South India Cement Corp",
              subtitle: "100 bags UltraTech Cement • 18 Sep 2026",
              primaryValue: formatIndianCurrency(38500),
              badge: { text: "Received", variant: "success" },
              linkHref: "/suppliers",
            },
            {
              id: "po_102",
              title: "PO-2026-0046 • Asian Paints Depot",
              subtitle: "10 buckets Apex Ultima • 19 Sep 2026",
              primaryValue: formatIndianCurrency(42000),
              badge: { text: "Received", variant: "success" },
              linkHref: "/suppliers",
            },
            {
              id: "po_103",
              title: "PO-2026-0047 • Havells Regional Hub",
              subtitle: "40 switch packs • 20 Sep 2026",
              primaryValue: formatIndianCurrency(31500),
              badge: { text: "Pending Delivery", variant: "warning" },
              linkHref: "/suppliers",
            },
          ],
        },
        offeredNextStep: "Want to check which POs are still pending delivery?",
      };
    }

    case "pending_pos": {
      const pendingCount = 2;
      const daysExpected = 5;
      return {
        route,
        reply: `${pendingCount} purchase orders are pending delivery, expected within the next ${daysExpected} days.`,
        offeredNextStep: "Would you like to track shipment details?",
      };
    }

    case "create_purchase_order": {
      const supplier = params.supplier || "South India Cement Corp";
      const product = params.product || "UltraTech Cement 50kg";
      const qty = params.quantity || 100;
      const unitRate = 385;

      // Centralized standard calculation
      const calc = calculateLineItem({ quantity: qty, rate: unitRate, gstRate: 18 });
      const grandTotal = calc.total;

      const audit = logActionAudit({
        route: "create_purchase_order",
        actionType: "draft_purchase_order",
        targetEntity: supplier,
        status: options.actionStatus || "proposed",
        details: {
          supplier,
          product,
          quantity: `${qty} bags`,
          unitCost: formatIndianCurrency(unitRate),
          grandTotal: formatIndianCurrency(grandTotal),
        },
        userRole: role,
        isHighRisk: false,
      });

      return {
        route,
        reply: `AI-drafted, awaiting your approval. Approve & Create PO (${formatIndianCurrency(grandTotal)})?`,
        actionProposal: {
          id: `act_${Date.now()}`,
          type: "create_purchase_order",
          route: "create_purchase_order",
          title: `Draft PO: ${supplier}`,
          targetEntity: supplier,
          what: `Generate Purchase Order for ${qty} bags of ${product} awaiting your sign-off.`,
          details: {
            "Supplier": supplier,
            "Line Items": `${qty} bags × ${product}`,
            "Unit Cost": formatIndianCurrency(unitRate),
            "Taxable Subtotal": formatIndianCurrency(calc.taxableAmount),
            "GST (18%)": formatIndianCurrency(calc.gstAmount),
            "Total Estimated Cost": formatIndianCurrency(grandTotal),
            "Expected Delivery": "Within 3 days",
          },
          consequences: "Creates draft PO in Supply module awaiting owner approval before sending to supplier. Never dispatched automatically.",
          status: "pending",
          auditId: audit.id,
        },
        offeredNextStep: "Tap 'Approve & Run' to create this PO.",
        auditId: audit.id,
      };
    }

    // ============================================================
    // F) SALES DOCUMENTS — ACTION ROUTES (all require confirmation)
    // ============================================================
    case "create_quotation": {
      const customer = params.customer || "Ravi Traders";
      const items = [
        { quantity: 100, rate: 420, gstRate: 18 }, // Cement bags
      ];

      // Centralized standard calculation
      const docTotals = calculateDocumentTotals(items);

      const audit = logActionAudit({
        route: "create_quotation",
        actionType: "create_quotation",
        targetEntity: customer,
        status: options.actionStatus || "proposed",
        details: {
          customer,
          total: formatIndianCurrency(docTotals.grandTotal),
        },
        userRole: role,
        isHighRisk: false,
      });

      return {
        route,
        reply: `I have prepared a quotation for ${customer} for ${formatIndianCurrency(docTotals.grandTotal)}. Review line items below:`,
        actionProposal: {
          id: `act_${Date.now()}`,
          type: "create_quotation",
          route: "create_quotation",
          title: `Quotation for ${customer}`,
          targetEntity: customer,
          what: `Draft GST quotation for 100 bags UltraTech Cement with valid price lock for 7 days.`,
          details: {
            "Customer": customer,
            "Line Items": "100 bags × UltraTech Cement 50kg",
            "Rate": "₹420 / bag",
            "Taxable Amount": formatIndianCurrency(docTotals.taxableAmount),
            "GST (18%)": formatIndianCurrency(docTotals.totalGst),
            "Grand Total": formatIndianCurrency(docTotals.grandTotal),
          },
          consequences: "Quotation will be created and available to share via WhatsApp/PDF. No stock will be deducted until converted to an invoice.",
          status: "pending",
          auditId: audit.id,
        },
        offeredNextStep: "Confirm above to generate and send quotation.",
        auditId: audit.id,
      };
    }

    case "create_invoice": {
      const customer = params.customer || "Ravi Traders";
      const items = [
        { quantity: 50, rate: 420, gstRate: 18 }, // Cement bags
      ];

      // Centralized standard calculation
      const docTotals = calculateDocumentTotals(items);

      const audit = logActionAudit({
        route: "create_invoice",
        actionType: "create_invoice",
        targetEntity: customer,
        status: options.actionStatus || "proposed",
        details: {
          customer,
          total: formatIndianCurrency(docTotals.grandTotal),
        },
        userRole: role,
        isHighRisk: false,
      });

      return {
        route,
        reply: `I have prepared a new GST Tax Invoice for ${customer} totaling ${formatIndianCurrency(docTotals.grandTotal)}. Confirm to issue?`,
        actionProposal: {
          id: `act_${Date.now()}`,
          type: "create_invoice",
          route: "create_invoice",
          title: `Issue Invoice to ${customer}`,
          targetEntity: customer,
          what: `Generate official B2B GST Invoice and log to accounts receivable.`,
          details: {
            "Customer": customer,
            "Line Items": "50 bags × UltraTech Cement 50kg",
            "Subtotal": formatIndianCurrency(docTotals.subtotal),
            "GST (18%)": formatIndianCurrency(docTotals.totalGst),
            "Grand Total": formatIndianCurrency(docTotals.grandTotal),
          },
          consequences: "Stock will be deducted by 50 bags and ₹24,780 will be added to party Khata ledger through the normal invoice logic.",
          status: "pending",
          auditId: audit.id,
        },
        offeredNextStep: "Confirm to print or send invoice on WhatsApp.",
        auditId: audit.id,
      };
    }

    case "record_payment": {
      const customer = params.customer || "Ravi Traders";
      const amount = params.amount || 34500;
      const method = params.method || "UPI";

      const audit = logActionAudit({
        route: "record_payment",
        actionType: "record_payment",
        targetEntity: customer,
        status: options.actionStatus || "proposed",
        details: {
          customer,
          amount: formatIndianCurrency(amount),
          method,
        },
        userRole: role,
        isHighRisk: false,
      });

      return {
        route,
        reply: `I have prepared a payment entry of ${formatIndianCurrency(amount)} from ${customer} via ${method}. Confirm receipt?`,
        actionProposal: {
          id: `act_${Date.now()}`,
          type: "record_payment",
          route: "record_payment",
          title: `Record Payment: ${customer}`,
          targetEntity: customer,
          what: `Log ${formatIndianCurrency(amount)} received via ${method} into customer Khata ledger.`,
          details: {
            "Party": customer,
            "Amount Received": formatIndianCurrency(amount),
            "Payment Method": method,
            "Applies To": "INV-101 (₹34,500)",
            "Resulting Balance": "₹0 (Fully Settled)",
          },
          consequences: "Updates outstanding balance and invoice status through the normal payments logic immediately.",
          status: "pending",
          auditId: audit.id,
        },
        offeredNextStep: "Confirm above to record payment receipt.",
        auditId: audit.id,
      };
    }

    case "cancel_invoice": {
      // HIGH RISK ACTION: requires the strongest confirmation step
      const invNumber = params.invoiceNumber || "INV-105";
      const invAmount = 18500;

      const audit = logActionAudit({
        route: "cancel_invoice",
        actionType: "cancel_invoice",
        targetEntity: invNumber,
        status: options.actionStatus || "proposed",
        details: {
          invoiceNumber: invNumber,
          amount: formatIndianCurrency(invAmount),
        },
        userRole: role,
        isHighRisk: true,
      });

      return {
        route,
        reply: `Invoice ${invNumber} is ${formatIndianCurrency(invAmount)}. Cancelling it will reverse the stock movement and cannot be undone easily. Confirm cancellation?`,
        actionProposal: {
          id: `act_${Date.now()}`,
          type: "cancel_invoice",
          route: "cancel_invoice",
          title: `⚠️ CANCEL INVOICE: ${invNumber}`,
          targetEntity: invNumber,
          what: `Void Tax Invoice ${invNumber} for ${formatIndianCurrency(invAmount)} and restore inventory back to stock.`,
          details: {
            "Invoice Number": invNumber,
            "Amount to Reverse": formatIndianCurrency(invAmount),
            "Stock Movement": "Restores goods back to inventory",
            "Ledger Impact": "Removes ₹18,500 receivable from customer Khata",
            "Security Level": "HIGH RISK — Requires explicit confirmation",
          },
          consequences: "Invoice status marked CANCELLED, stock movement reversed, and Khata balance reduced. Cannot be undone automatically.",
          isHighRisk: true,
          status: "pending",
          auditId: audit.id,
        },
        offeredNextStep: "Confirm on-screen to proceed with invoice cancellation.",
        auditId: audit.id,
      };
    }

    // ============================================================
    // G) REPORTS (read-only)
    // ============================================================
    case "report_summary": {
      return {
        route,
        reply: `This month: ₹8,42,000 in sales, ₹1,42,800 outstanding, 148 SKUs in stock, 4 team members active. Sales are up 6% versus last month.`,
        offeredNextStep: "Want the full report?",
      };
    }

    case "gst_summary": {
      const sales = 842000;
      const outputTax = 151560; // 18% of ₹8,42,000
      return {
        route,
        reply: `Your GST-applicable sales this month total ${formatIndianCurrency(sales)} with ${formatIndianCurrency(outputTax)} in output tax. This is not tax advice — please confirm filing details with your accountant.`,
        offeredNextStep: "Want to review your GSTR-3B summary tab?",
      };
    }

    case "profit_margin": {
      return {
        route,
        reply: `Your estimated gross margin this month is 22.5% based on captured purchase cost prices across your catalog.`,
        offeredNextStep: "Would you like to check individual product margins?",
      };
    }

    // ============================================================
    // H) NOTIFICATIONS, AUTOMATION & APPROVALS (read-only + routing)
    // ============================================================
    case "pending_approvals": {
      return {
        route,
        reply: `You have 2 pending approvals: a ₹39,680 purchase order and a discount override request from a cashier.`,
        structuredCards: {
          type: "stats_list",
          title: "Pending Approval Center Requests",
          items: [
            {
              id: "appr_po",
              title: "Purchase Order #PO-0048 to South India Cement",
              subtitle: "AI-Drafted Low Stock Reorder",
              primaryValue: "₹39,680",
              badge: { text: "Pending Review", variant: "warning" },
              linkHref: "/approvals",
            },
            {
              id: "appr_disc",
              title: "Special 8% Discount Request on Invoice #895",
              subtitle: "Requested by Mani V (Cashier)",
              primaryValue: "₹3,400",
              badge: { text: "Pending Review", variant: "warning" },
              linkHref: "/approvals",
            },
          ],
        },
        offeredNextStep: "Tap any card above to open Approval Center.",
      };
    }

    case "automation_status": {
      return {
        route,
        reply: `You have 4 active automation rules, including 'notify me if stock drops below minimum' and 'flag invoices overdue by 7+ days'.`,
        offeredNextStep: "Want to configure a new automation rule?",
      };
    }

    case "recent_notifications": {
      return {
        route,
        reply: `Today: 2 low-stock alerts, 1 overdue payment reminder sent, 1 new customer added.`,
        offeredNextStep: "Would you like me to inspect the low-stock alerts?",
      };
    }

    // ============================================================
    // I) TEAM & ROLES (read-only, permission-gated)
    // ============================================================
    case "team_summary": {
      if (role === "cashier" || role === "sales") {
        return {
          route,
          reply: `Permission denied: Only store owners and managers can view team member roles.`,
        };
      }
      return {
        route,
        reply: `You have 4 team members: 1 manager, 2 sales staff, 1 cashier.`,
        offeredNextStep: "Want to invite a new staff member or change permissions?",
      };
    }

    // ============================================================
    // J) META / CAPABILITY / SMALL TALK (read-only, always available)
    // ============================================================
    case "capability_check": {
      return {
        route,
        reply: `I can answer questions about your sales, stock, customers, and outstanding payments, and help you create quotations, invoices, or record payments — I'll always show you exactly what I'm about to do before doing it.`,
        offeredNextStep: "Try asking: 'Today's sales?' or 'Who owes me money?'",
      };
    }

    case "greeting": {
      return {
        route,
        reply: `Hey! What would you like to know about your business today?`,
        offeredNextStep: "You can ask about today's sales, overdue Khata, or low stock.",
      };
    }

    // ============================================================
    // K) AMBIGUOUS / MULTI-MATCH HANDLING
    // ============================================================
    case "clarification_needed": {
      const q = params.clarifyingQuestion || "Multiple customers match your request. Which one did you mean?";
      const opts = params.options || ["Ravi Traders (Tiruppur)", "Ravi Hardware (Salem)"];
      return {
        route,
        reply: q,
        clarificationOptions: opts,
      };
    }

    case "out_of_scope":
    default: {
      return {
        route: "out_of_scope",
        reply: `That's outside what I can help with right now — I'm focused on your business data and actions.`,
        offeredNextStep: "Ask me about your sales, stock, or customer outstandings.",
      };
    }
  }
}
