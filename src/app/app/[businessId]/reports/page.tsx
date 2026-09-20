"use client";

import { useState, useEffect, useMemo } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";

type ReportType =
  | "sales"
  | "purchases"
  | "inventory"
  | "outstanding"
  | "customers"
  | "products";

type DateRangePreset = "today" | "7d" | "30d" | "this_month" | "all";

export default function ReportsPage() {
  const params = useParams();
  const businessId = params.businessId as string;

  const [activeTab, setActiveTab] = useState<ReportType>("sales");
  const [datePreset, setDatePreset] = useState<DateRangePreset>("30d");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const [loading, setLoading] = useState(true);

  // Data sets
  const [invoices, setInvoices] = useState<any[]>([]);
  const [purchases, setPurchases] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [lineItems, setLineItems] = useState<any[]>([]);

  // Calculate preset dates
  useEffect(() => {
    const today = new Date();
    const formatDate = (d: Date) => d.toISOString().split("T")[0];

    setToDate(formatDate(today));

    if (datePreset === "today") {
      setFromDate(formatDate(today));
    } else if (datePreset === "7d") {
      const d = new Date();
      d.setDate(d.getDate() - 7);
      setFromDate(formatDate(d));
    } else if (datePreset === "30d") {
      const d = new Date();
      d.setDate(d.getDate() - 30);
      setFromDate(formatDate(d));
    } else if (datePreset === "this_month") {
      const d = new Date(today.getFullYear(), today.getMonth(), 1);
      setFromDate(formatDate(d));
    } else if (datePreset === "all") {
      setFromDate("2020-01-01");
    }
  }, [datePreset]);

  // Load business records
  useEffect(() => {
    async function loadData() {
      setLoading(true);
      const supabase = createClient();

      try {
        const [invRes, purRes, prodRes, custRes, itemsRes] = await Promise.all([
          supabase
            .from("invoices")
            .select("*, customers(name, phone, gstin)")
            .eq("business_id", businessId)
            .order("created_at", { ascending: false }),
          supabase
            .from("purchases")
            .select("*, suppliers(name, phone, gstin)")
            .eq("business_id", businessId)
            .order("created_at", { ascending: false }),
          supabase
            .from("products")
            .select("*")
            .eq("business_id", businessId)
            .order("name", { ascending: true }),
          supabase
            .from("customers")
            .select("*")
            .eq("business_id", businessId)
            .order("name", { ascending: true }),
          supabase
            .from("line_items")
            .select("*")
            .eq("business_id", businessId)
            .eq("parent_type", "invoice"),
        ]);

        if (invRes.data) setInvoices(invRes.data);
        if (purRes.data) setPurchases(purRes.data);
        if (prodRes.data) setProducts(prodRes.data);
        if (custRes.data) setCustomers(custRes.data);
        if (itemsRes.data) setLineItems(itemsRes.data);
      } catch (err) {
        console.error("Failed loading report data:", err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [businessId]);

  // Helper date filter
  const isWithinDateRange = (dateStr?: string) => {
    if (!dateStr) return true;
    const date = dateStr.split("T")[0];
    if (fromDate && date < fromDate) return false;
    if (toDate && date > toDate) return false;
    return true;
  };

  // Filtered sets
  const filteredInvoices = useMemo(
    () => invoices.filter((i) => isWithinDateRange(i.created_at)),
    [invoices, fromDate, toDate]
  );

  const filteredPurchases = useMemo(
    () => purchases.filter((p) => isWithinDateRange(p.created_at)),
    [purchases, fromDate, toDate]
  );

  // Sales metrics
  const salesMetrics = useMemo(() => {
    const totalRevenue = filteredInvoices.reduce((acc, i) => acc + Number(i.grand_total || 0), 0);
    const totalTax = filteredInvoices.reduce((acc, i) => acc + Number(i.tax_total || 0), 0);
    const totalCollected = filteredInvoices.reduce((acc, i) => acc + Number(i.amount_paid || 0), 0);
    const totalOutstanding = totalRevenue - totalCollected;
    const count = filteredInvoices.length;
    const aov = count > 0 ? totalRevenue / count : 0;

    return { totalRevenue, totalTax, totalCollected, totalOutstanding, count, aov };
  }, [filteredInvoices]);

  // Purchases metrics
  const purchaseMetrics = useMemo(() => {
    const totalSpend = filteredPurchases.reduce((acc, p) => acc + Number(p.grand_total || 0), 0);
    const totalTax = filteredPurchases.reduce((acc, p) => acc + Number(p.tax_total || 0), 0);
    const totalPaid = filteredPurchases.reduce((acc, p) => acc + Number(p.amount_paid || 0), 0);
    const totalPayable = totalSpend - totalPaid;
    const count = filteredPurchases.length;

    return { totalSpend, totalTax, totalPaid, totalPayable, count };
  }, [filteredPurchases]);

  // Inventory valuation metrics
  const inventoryMetrics = useMemo(() => {
    let totalStockQty = 0;
    let totalSellingValuation = 0;
    let totalCostValuation = 0;
    let lowStockCount = 0;
    let outOfStockCount = 0;

    products.forEach((p) => {
      const stock = Number(p.current_stock || 0);
      const sellPrice = Number(p.selling_price || 0);
      const costPrice = Number(p.purchase_price || 0);

      totalStockQty += stock;
      totalSellingValuation += stock * sellPrice;
      totalCostValuation += stock * costPrice;

      if (stock <= 0) outOfStockCount++;
      else if (stock <= Number(p.min_stock || 5)) lowStockCount++;
    });

    const potentialMargin =
      totalSellingValuation > 0
        ? ((totalSellingValuation - totalCostValuation) / totalSellingValuation) * 100
        : 0;

    return {
      totalStockQty,
      totalSellingValuation,
      totalCostValuation,
      lowStockCount,
      outOfStockCount,
      potentialMargin,
    };
  }, [products]);

  // Outstanding metrics
  const outstandingMetrics = useMemo(() => {
    const customerOutstanding = invoices
      .filter((i) => i.status !== "cancelled" && i.payment_status !== "paid")
      .reduce((acc, i) => acc + (Number(i.grand_total || 0) - Number(i.amount_paid || 0)), 0);

    const supplierPayable = purchases
      .filter((p) => p.status !== "cancelled" && p.payment_status !== "paid")
      .reduce((acc, p) => acc + (Number(p.grand_total || 0) - Number(p.amount_paid || 0)), 0);

    return { customerOutstanding, supplierPayable, netCashPosition: customerOutstanding - supplierPayable };
  }, [invoices, purchases]);

  // Customer rankings
  const customerRankings = useMemo(() => {
    const map = new Map<string, { name: string; phone?: string; invoiceCount: number; totalSpend: number; outstanding: number }>();

    customers.forEach((c) => {
      map.set(c.id, {
        name: c.name,
        phone: c.phone,
        invoiceCount: 0,
        totalSpend: 0,
        outstanding: 0,
      });
    });

    filteredInvoices.forEach((inv) => {
      const rec = map.get(inv.customer_id);
      if (rec) {
        rec.invoiceCount += 1;
        rec.totalSpend += Number(inv.grand_total || 0);
        rec.outstanding += Math.max(0, Number(inv.grand_total || 0) - Number(inv.amount_paid || 0));
      }
    });

    return Array.from(map.values())
      .filter((c) => c.invoiceCount > 0 || c.outstanding > 0)
      .sort((a, b) => b.totalSpend - a.totalSpend);
  }, [customers, filteredInvoices]);

  // Product sales performance
  const productRankings = useMemo(() => {
    const map = new Map<string, { name: string; sku?: string; qtySold: number; revenue: number; cost: number }>();

    products.forEach((p) => {
      map.set(p.name.toLowerCase().trim(), {
        name: p.name,
        sku: p.sku,
        qtySold: 0,
        revenue: 0,
        cost: Number(p.purchase_price || 0),
      });
    });

    // Match filtered line items
    const relevantInvoiceIds = new Set(filteredInvoices.map((i) => i.id));
    lineItems.forEach((item) => {
      if (relevantInvoiceIds.has(item.parent_id)) {
        const key = (item.description || item.product_name || "").toLowerCase().trim();
        const existing = map.get(key);
        const qty = Number(item.quantity || 0);
        const total = Number(item.total || item.line_total || 0);

        if (existing) {
          existing.qtySold += qty;
          existing.revenue += total;
        } else if (key) {
          map.set(key, {
            name: item.description || item.product_name,
            qtySold: qty,
            revenue: total,
            cost: 0,
          });
        }
      }
    });

    return Array.from(map.values())
      .filter((p) => p.qtySold > 0)
      .sort((a, b) => b.revenue - a.revenue);
  }, [products, filteredInvoices, lineItems]);

  // CSV Export utility
  const handleExportCSV = () => {
    let headers: string[] = [];
    let rows: (string | number)[][] = [];
    const filename = `GrowthEngine_${activeTab}_report_${new Date().toISOString().split("T")[0]}.csv`;

    if (activeTab === "sales") {
      headers = ["Invoice Number", "Date", "Customer", "Subtotal", "Tax", "Grand Total", "Amount Paid", "Status"];
      rows = filteredInvoices.map((i) => [
        i.invoice_number,
        i.created_at?.split("T")[0] || "",
        i.customers?.name || "Customer",
        i.subtotal,
        i.tax_total,
        i.grand_total,
        i.amount_paid,
        i.payment_status || i.status,
      ]);
    } else if (activeTab === "purchases") {
      headers = ["Purchase Number", "Date", "Supplier", "Subtotal", "Tax", "Grand Total", "Amount Paid", "Status"];
      rows = filteredPurchases.map((p) => [
        p.purchase_number,
        p.created_at?.split("T")[0] || "",
        p.suppliers?.name || "Supplier",
        p.subtotal,
        p.tax_total,
        p.grand_total,
        p.amount_paid,
        p.payment_status || p.status,
      ]);
    } else if (activeTab === "inventory") {
      headers = ["Product Name", "SKU", "Category", "Current Stock", "Min Stock", "Cost Price", "Selling Price", "Stock Value (Sell)"];
      rows = products.map((p) => [
        p.name,
        p.sku || "",
        p.category || "",
        p.current_stock,
        p.min_stock,
        p.purchase_price || 0,
        p.selling_price || 0,
        Number(p.current_stock || 0) * Number(p.selling_price || 0),
      ]);
    } else if (activeTab === "outstanding") {
      headers = ["Type", "Party", "Reference", "Due Date", "Total Amount", "Amount Paid", "Outstanding Balance"];
      const invRows = invoices
        .filter((i) => i.status !== "cancelled" && i.payment_status !== "paid")
        .map((i) => [
          "Receivable (Customer)",
          i.customers?.name || "Customer",
          i.invoice_number,
          i.due_date || "",
          i.grand_total,
          i.amount_paid,
          Number(i.grand_total || 0) - Number(i.amount_paid || 0),
        ]);
      const purRows = purchases
        .filter((p) => p.status !== "cancelled" && p.payment_status !== "paid")
        .map((p) => [
          "Payable (Supplier)",
          p.suppliers?.name || "Supplier",
          p.purchase_number,
          p.due_date || "",
          p.grand_total,
          p.amount_paid,
          Number(p.grand_total || 0) - Number(p.amount_paid || 0),
        ]);
      rows = [...invRows, ...purRows];
    } else if (activeTab === "customers") {
      headers = ["Customer Name", "Phone", "Invoices Count", "Total Revenue", "Outstanding Balance"];
      rows = customerRankings.map((c) => [c.name, c.phone || "", c.invoiceCount, c.totalSpend, c.outstanding]);
    } else if (activeTab === "products") {
      headers = ["Product Name", "SKU", "Units Sold", "Total Revenue", "Unit Cost", "Est. Gross Margin %"];
      rows = productRankings.map((p) => {
        const margin = p.revenue > 0 && p.cost > 0 ? (((p.revenue - p.cost * p.qtySold) / p.revenue) * 100).toFixed(1) + "%" : "N/A";
        return [p.name, p.sku || "", p.qtySold, p.revenue, p.cost, margin];
      });
    }

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.map((val) => `"${String(val).replace(/"/g, '""')}"`).join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="ge-page-container">
      {/* Top Header */}
      <PageHeader
        title="Reports & Analytics"
        subtitle="Real-time business performance, revenue streams, margins, and accounts breakdown"
        action={
          <div style={{ display: "flex", gap: "var(--space-1)", alignItems: "center" }}>
            <Button
              variant="secondary"
              size="sm"
              onClick={handleExportCSV}
              icon={<span>📥</span>}
            >
              Export CSV
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => window.print()}
              icon={<span>🖨️</span>}
            >
              Print / PDF
            </Button>
          </div>
        }
      />

      {/* Tabs */}
      <div
        style={{
          display: "flex",
          gap: "var(--space-1)",
          borderBottom: "1px solid var(--border-subtle)",
          paddingBottom: "var(--space-1)",
          marginBottom: "var(--space-3)",
          overflowX: "auto",
        }}
      >
        {[
          { id: "sales", label: "💰 Sales Report" },
          { id: "purchases", label: "🛒 Purchases Report" },
          { id: "inventory", label: "📦 Inventory Report" },
          { id: "outstanding", label: "⚖️ Outstanding Report" },
          { id: "customers", label: "👤 Customer Report" },
          { id: "products", label: "🏷️ Product Performance" },
        ].map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as ReportType)}
              style={{
                padding: "8px 16px",
                borderRadius: "var(--radius-sm)",
                fontSize: "var(--font-sm)",
                fontWeight: isActive ? 600 : 500,
                color: isActive ? "var(--primary)" : "var(--text-secondary)",
                background: isActive ? "var(--primary-soft)" : "transparent",
                border: "none",
                cursor: "pointer",
                whiteSpace: "nowrap",
                transition: "all 0.15s ease",
              }}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Date Filter Bar (Only active on time-based tabs) */}
      {activeTab !== "inventory" && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "12px",
            padding: "12px 16px",
            background: "var(--ge-bg-card)",
            border: "1px solid var(--ge-border)",
            borderRadius: "var(--ge-radius-lg)",
            marginBottom: "24px",
          }}
        >
          <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
            <span style={{ fontSize: "0.8125rem", color: "var(--ge-text-muted)", marginRight: "6px" }}>Period:</span>
            {[
              { id: "today", label: "Today" },
              { id: "7d", label: "Last 7D" },
              { id: "30d", label: "Last 30D" },
              { id: "this_month", label: "This Month" },
              { id: "all", label: "All Time" },
            ].map((p) => (
              <button
                key={p.id}
                onClick={() => setDatePreset(p.id as DateRangePreset)}
                style={{
                  padding: "4px 10px",
                  borderRadius: "var(--ge-radius-full)",
                  background: datePreset === p.id ? "var(--ge-accent)" : "transparent",
                  color: datePreset === p.id ? "#ffffff" : "var(--ge-text-secondary)",
                  border: datePreset === p.id ? "none" : "1px solid var(--ge-border)",
                  fontSize: "0.75rem",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                {p.label}
              </button>
            ))}
          </div>

          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => {
                setFromDate(e.target.value);
                setDatePreset("all");
              }}
              className="ge-input"
              style={{ width: "135px", padding: "6px 10px", fontSize: "0.75rem" }}
            />
            <span style={{ color: "var(--ge-text-muted)", fontSize: "0.75rem" }}>to</span>
            <input
              type="date"
              value={toDate}
              onChange={(e) => {
                setToDate(e.target.value);
                setDatePreset("all");
              }}
              className="ge-input"
              style={{ width: "135px", padding: "6px 10px", fontSize: "0.75rem" }}
            />
          </div>
        </div>
      )}

      {loading ? (
        <div style={{ padding: "60px 0", textAlign: "center", color: "var(--ge-text-muted)" }}>
          <div
            style={{
              width: "32px",
              height: "32px",
              border: "3px solid var(--ge-border)",
              borderTopColor: "var(--ge-accent)",
              borderRadius: "50%",
              animation: "spin 0.8s linear infinite",
              margin: "0 auto 12px",
            }}
          />
          <div>Aggregating report data...</div>
        </div>
      ) : (
        <>
          {/* TAB 1: SALES REPORT */}
          {activeTab === "sales" && (
            <div>
              {/* KPI Summary Cards */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                  gap: "16px",
                  marginBottom: "24px",
                }}
              >
                <MetricCard title="Gross Sales Revenue" value={`₹${salesMetrics.totalRevenue.toLocaleString("en-IN")}`} subtitle={`${salesMetrics.count} invoices`} accent="#06b6d4" />
                <MetricCard title="Collected Amount" value={`₹${salesMetrics.totalCollected.toLocaleString("en-IN")}`} subtitle="Paid into accounts" accent="#10b981" />
                <MetricCard title="Pending Outstanding" value={`₹${salesMetrics.totalOutstanding.toLocaleString("en-IN")}`} subtitle="Unpaid receivables" accent="#f59e0b" />
                <MetricCard title="Tax Collected (GST)" value={`₹${salesMetrics.totalTax.toLocaleString("en-IN")}`} subtitle="Output liability" accent="#8b5cf6" />
                <MetricCard title="Average Order Value" value={`₹${Math.round(salesMetrics.aov).toLocaleString("en-IN")}`} subtitle="Per transaction" accent="#ec4899" />
              </div>

              {/* Data Table */}
              <ReportTable
                headers={["Invoice", "Date", "Customer", "Subtotal", "Tax", "Grand Total", "Collected", "Status"]}
                rows={filteredInvoices.map((inv) => [
                  <span key="num" style={{ fontWeight: 600 }}>{inv.invoice_number}</span>,
                  inv.created_at?.split("T")[0],
                  inv.customers?.name || "Customer",
                  `₹${Number(inv.subtotal || 0).toLocaleString("en-IN")}`,
                  `₹${Number(inv.tax_total || 0).toLocaleString("en-IN")}`,
                  <strong key="total">₹{Number(inv.grand_total || 0).toLocaleString("en-IN")}</strong>,
                  `₹${Number(inv.amount_paid || 0).toLocaleString("en-IN")}`,
                  <span
                    key="status"
                    style={{
                      padding: "2px 8px",
                      borderRadius: "12px",
                      fontSize: "0.75rem",
                      fontWeight: 600,
                      background: inv.payment_status === "paid" ? "rgba(16,185,129,0.15)" : "rgba(245,158,11,0.15)",
                      color: inv.payment_status === "paid" ? "#10b981" : "#f59e0b",
                    }}
                  >
                    {(inv.payment_status || inv.status).toUpperCase()}
                  </span>,
                ])}
              />
            </div>
          )}

          {/* TAB 2: PURCHASES REPORT */}
          {activeTab === "purchases" && (
            <div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                  gap: "16px",
                  marginBottom: "24px",
                }}
              >
                <MetricCard title="Total Purchase Spend" value={`₹${purchaseMetrics.totalSpend.toLocaleString("en-IN")}`} subtitle={`${purchaseMetrics.count} bills`} accent="#3b82f6" />
                <MetricCard title="Amount Paid" value={`₹${purchaseMetrics.totalPaid.toLocaleString("en-IN")}`} subtitle="Disbursed" accent="#10b981" />
                <MetricCard title="Pending Payables" value={`₹${purchaseMetrics.totalPayable.toLocaleString("en-IN")}`} subtitle="Supplier credit due" accent="#ef4444" />
                <MetricCard title="Input Tax (GST)" value={`₹${purchaseMetrics.totalTax.toLocaleString("en-IN")}`} subtitle="Input tax credit" accent="#8b5cf6" />
              </div>

              <ReportTable
                headers={["Purchase #", "Date", "Supplier", "Subtotal", "Tax", "Grand Total", "Paid", "Status"]}
                rows={filteredPurchases.map((p) => [
                  <span key="num" style={{ fontWeight: 600 }}>{p.purchase_number}</span>,
                  p.created_at?.split("T")[0],
                  p.suppliers?.name || "Supplier",
                  `₹${Number(p.subtotal || 0).toLocaleString("en-IN")}`,
                  `₹${Number(p.tax_total || 0).toLocaleString("en-IN")}`,
                  <strong key="total">₹{Number(p.grand_total || 0).toLocaleString("en-IN")}</strong>,
                  `₹${Number(p.amount_paid || 0).toLocaleString("en-IN")}`,
                  <span
                    key="status"
                    style={{
                      padding: "2px 8px",
                      borderRadius: "12px",
                      fontSize: "0.75rem",
                      fontWeight: 600,
                      background: p.payment_status === "paid" ? "rgba(16,185,129,0.15)" : "rgba(239,68,68,0.15)",
                      color: p.payment_status === "paid" ? "#10b981" : "#ef4444",
                    }}
                  >
                    {(p.payment_status || p.status).toUpperCase()}
                  </span>,
                ])}
              />
            </div>
          )}

          {/* TAB 3: INVENTORY REPORT */}
          {activeTab === "inventory" && (
            <div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                  gap: "16px",
                  marginBottom: "24px",
                }}
              >
                <MetricCard title="Total Stock In Hand" value={`${inventoryMetrics.totalStockQty} units`} subtitle={`${products.length} SKUs`} accent="#06b6d4" />
                <MetricCard title="Stock Value (Selling)" value={`₹${inventoryMetrics.totalSellingValuation.toLocaleString("en-IN")}`} subtitle="Retail worth" accent="#10b981" />
                <MetricCard title="Stock Value (Cost)" value={`₹${inventoryMetrics.totalCostValuation.toLocaleString("en-IN")}`} subtitle="Acquisition cost" accent="#3b82f6" />
                <MetricCard title="Potential Margin" value={`${inventoryMetrics.potentialMargin.toFixed(1)}%`} subtitle="Expected markup" accent="#8b5cf6" />
                <MetricCard title="Low / Out of Stock" value={`${inventoryMetrics.lowStockCount} / ${inventoryMetrics.outOfStockCount}`} subtitle="Action needed" accent="#ef4444" />
              </div>

              <ReportTable
                headers={["Product", "SKU", "Category", "Current Stock", "Min Alert", "Cost", "Selling", "Total Value"]}
                rows={products.map((p) => {
                  const stock = Number(p.current_stock || 0);
                  const isLow = stock <= Number(p.min_stock || 5);
                  return [
                    <span key="name" style={{ fontWeight: 600 }}>{p.name}</span>,
                    p.sku || "—",
                    p.category || "General",
                    <span key="stock" style={{ color: isLow ? "var(--ge-error)" : "inherit", fontWeight: isLow ? 600 : 400 }}>
                      {stock} {isLow ? "⚠️" : ""}
                    </span>,
                    p.min_stock || 5,
                    `₹${p.purchase_price || 0}`,
                    `₹${p.selling_price || 0}`,
                    <strong key="val">₹{(stock * Number(p.selling_price || 0)).toLocaleString("en-IN")}</strong>,
                  ];
                })}
              />
            </div>
          )}

          {/* TAB 4: OUTSTANDING REPORT */}
          {activeTab === "outstanding" && (
            <div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                  gap: "16px",
                  marginBottom: "24px",
                }}
              >
                <MetricCard title="Total Receivables" value={`₹${outstandingMetrics.customerOutstanding.toLocaleString("en-IN")}`} subtitle="Customers owe you" accent="#10b981" />
                <MetricCard title="Total Payables" value={`₹${outstandingMetrics.supplierPayable.toLocaleString("en-IN")}`} subtitle="You owe suppliers" accent="#ef4444" />
                <MetricCard
                  title="Net Credit Position"
                  value={`₹${outstandingMetrics.netCashPosition.toLocaleString("en-IN")}`}
                  subtitle={outstandingMetrics.netCashPosition >= 0 ? "Positive receivable" : "Net payable deficit"}
                  accent={outstandingMetrics.netCashPosition >= 0 ? "#10b981" : "#f59e0b"}
                />
              </div>

              <h2 style={{ fontSize: "1rem", fontWeight: 600, color: "var(--ge-text-primary)", marginBottom: "12px" }}>
                Unpaid Customer Invoices
              </h2>
              <ReportTable
                headers={["Customer", "Invoice #", "Due Date", "Total", "Paid", "Outstanding"]}
                rows={invoices
                  .filter((i) => i.status !== "cancelled" && i.payment_status !== "paid")
                  .map((i) => [
                    i.customers?.name || "Customer",
                    i.invoice_number,
                    i.due_date || "—",
                    `₹${Number(i.grand_total || 0).toLocaleString("en-IN")}`,
                    `₹${Number(i.amount_paid || 0).toLocaleString("en-IN")}`,
                    <strong key="out" style={{ color: "#f59e0b" }}>
                      ₹{(Number(i.grand_total || 0) - Number(i.amount_paid || 0)).toLocaleString("en-IN")}
                    </strong>,
                  ])}
              />
            </div>
          )}

          {/* TAB 5: CUSTOMERS REPORT */}
          {activeTab === "customers" && (
            <div>
              <ReportTable
                headers={["Customer Name", "Phone", "Invoices", "Total Spend", "Outstanding"]}
                rows={customerRankings.map((c) => [
                  <span key="name" style={{ fontWeight: 600 }}>{c.name}</span>,
                  c.phone || "—",
                  c.invoiceCount,
                  <strong key="spend" style={{ color: "var(--ge-accent)" }}>
                    ₹{c.totalSpend.toLocaleString("en-IN")}
                  </strong>,
                  c.outstanding > 0 ? (
                    <span key="out" style={{ color: "#ef4444", fontWeight: 600 }}>
                      ₹{c.outstanding.toLocaleString("en-IN")}
                    </span>
                  ) : (
                    <span key="out" style={{ color: "#10b981" }}>Settled</span>
                  ),
                ])}
              />
            </div>
          )}

          {/* TAB 6: PRODUCTS PERFORMANCE */}
          {activeTab === "products" && (
            <div>
              <ReportTable
                headers={["Product Name", "SKU", "Units Sold", "Revenue Generated", "Unit Cost", "Est. Gross Margin"]}
                rows={productRankings.map((p) => {
                  const estProfit = p.revenue - p.cost * p.qtySold;
                  const marginPct = p.revenue > 0 && p.cost > 0 ? ((estProfit / p.revenue) * 100).toFixed(1) + "%" : "—";
                  return [
                    <span key="name" style={{ fontWeight: 600 }}>{p.name}</span>,
                    p.sku || "—",
                    <strong key="qty">{p.qtySold}</strong>,
                    <strong key="rev" style={{ color: "var(--ge-accent)" }}>
                      ₹{p.revenue.toLocaleString("en-IN")}
                    </strong>,
                    p.cost > 0 ? `₹${p.cost}` : "—",
                    <span key="margin" style={{ color: estProfit >= 0 ? "#10b981" : "#ef4444", fontWeight: 600 }}>
                      {marginPct}
                    </span>,
                  ];
                })}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}

function MetricCard({
  title,
  value,
  subtitle,
  accent,
}: {
  title: string;
  value: string;
  subtitle: string;
  accent: string;
}) {
  return (
    <div
      style={{
        background: "var(--ge-bg-card)",
        border: "1px solid var(--ge-border)",
        borderRadius: "var(--ge-radius-lg)",
        padding: "16px 20px",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "4px",
          bottom: 0,
          background: accent,
        }}
      />
      <div style={{ fontSize: "0.75rem", color: "var(--ge-text-muted)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
        {title}
      </div>
      <div
        style={{
          fontSize: "1.5rem",
          fontWeight: 700,
          color: "var(--ge-text-primary)",
          margin: "6px 0 2px",
          letterSpacing: "-0.02em",
        }}
      >
        {value}
      </div>
      <div style={{ fontSize: "0.75rem", color: "var(--ge-text-muted)" }}>{subtitle}</div>
    </div>
  );
}

function ReportTable({
  headers,
  rows,
}: {
  headers: string[];
  rows: (React.ReactNode | string | number)[][];
}) {
  if (rows.length === 0) {
    return (
      <div
        style={{
          background: "var(--ge-bg-card)",
          border: "1px solid var(--ge-border)",
          borderRadius: "var(--ge-radius-lg)",
          padding: "48px 16px",
          textAlign: "center",
          color: "var(--ge-text-muted)",
        }}
      >
        <div style={{ fontSize: "1.75rem", marginBottom: "8px" }}>📊</div>
        <div style={{ fontWeight: 600, color: "var(--ge-text-primary)" }}>No data available for this range</div>
        <div style={{ fontSize: "0.75rem", marginTop: "4px" }}>Try selecting a broader date range or recording new transactions.</div>
      </div>
    );
  }

  return (
    <div
      style={{
        background: "var(--ge-bg-card)",
        border: "1px solid var(--ge-border)",
        borderRadius: "var(--ge-radius-lg)",
        overflow: "hidden",
      }}
    >
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "0.875rem" }}>
          <thead>
            <tr
              style={{
                borderBottom: "1px solid var(--ge-border)",
                background: "var(--ge-bg-secondary)",
                fontSize: "0.75rem",
                color: "var(--ge-text-muted)",
                textTransform: "uppercase",
                letterSpacing: "0.04em",
              }}
            >
              {headers.map((h, idx) => (
                <th key={idx} style={{ padding: "12px 16px", fontWeight: 600 }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rIdx) => (
              <tr
                key={rIdx}
                style={{
                  borderBottom: rIdx < rows.length - 1 ? "1px solid var(--ge-border)" : "none",
                  transition: "background 0.15s ease",
                }}
              >
                {row.map((cell, cIdx) => (
                  <td key={cIdx} style={{ padding: "12px 16px", color: "var(--ge-text-secondary)" }}>
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
