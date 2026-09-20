"use client";

import { useState, useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";

import { PageHeader } from "@/components/ui/PageHeader";
import { StatsCard } from "@/components/ui/StatsCard";
import { Skeleton } from "@/components/ui/Skeleton";

interface DashboardStats {
  today_sales: number;
  avg_daily_sales: number;
  total_receivable: number;
  total_payable: number;
  overdue_count: number;
  overdue_amount: number;
  due_today_count: number;
  due_week_count: number;
  low_stock_count: number;
  pending_orders: number;
  total_products: number;
  total_customers: number;
  total_suppliers: number;
}

interface SalesTrendPoint { d: string; total: number }
interface TopProduct { product_name: string; total_qty: number; total_revenue: number }
interface OutstandingRow { id: string; name: string; outstanding: number }

export default function DashboardPage() {
  const params = useParams();
  const businessId = params.businessId as string;

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [trend, setTrend] = useState<SalesTrendPoint[]>([]);
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [custOutstanding, setCustOutstanding] = useState<OutstandingRow[]>([]);
  const [suppOutstanding, setSuppOutstanding] = useState<OutstandingRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadAll(); }, [businessId]);

  async function loadAll() {
    const supabase = createClient();
    const [s, t, tp, co, so] = await Promise.all([
      supabase.rpc("get_dashboard_stats", { p_business_id: businessId }),
      supabase.rpc("get_sales_trend", { p_business_id: businessId, p_days: 30 }),
      supabase.rpc("get_top_products", { p_business_id: businessId, p_limit: 5 }),
      supabase.rpc("get_customer_outstanding", { p_business_id: businessId }),
      supabase.rpc("get_supplier_outstanding", { p_business_id: businessId }),
    ]);
    if (s.data) setStats(s.data as DashboardStats);
    if (t.data) setTrend(t.data as SalesTrendPoint[]);
    if (tp.data) setTopProducts(tp.data as TopProduct[]);
    if (co.data) setCustOutstanding(co.data as OutstandingRow[]);
    if (so.data) setSuppOutstanding(so.data as OutstandingRow[]);
    setLoading(false);
  }

  // Skeleton loader
  if (loading) {
    return (
      <div className="ge-page-container">
        <div style={{ marginBottom: "var(--space-3)" }}>
          <Skeleton width="200px" height="32px" className="mb-2" />
          <Skeleton width="300px" height="18px" />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "var(--space-2)", marginBottom: "var(--space-3)" }}>
          {[1, 2, 3, 4].map((n) => (
            <div key={n} className="ge-card" style={{ padding: "var(--space-3)" }}>
              <Skeleton width="80px" height="14px" className="mb-3" />
              <Skeleton width="120px" height="28px" className="mb-2" />
              <Skeleton width="100px" height="14px" />
            </div>
          ))}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "var(--space-2)" }}>
          <div className="ge-card" style={{ height: "200px" }} />
          <div className="ge-card" style={{ height: "200px" }} />
        </div>
      </div>
    );
  }

  if (!stats) return <div className="ge-page-container" style={{ color: "var(--text-muted)" }}>Could not load dashboard.</div>;

  const salesComparison = stats.avg_daily_sales > 0
    ? ((stats.today_sales - stats.avg_daily_sales) / stats.avg_daily_sales * 100).toFixed(0) : null;
  const maxTrend = Math.max(...trend.map((t) => t.total), 1);

  return (
    <div className="ge-page-container">
      {/* Header */}
      <PageHeader
        title="Dashboard"
        subtitle="Real-time financial and operations overview"
      />

      {/* Top metrics with Hero Dominance */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "var(--space-2)", marginBottom: "var(--space-3)" }}>
        <StatsCard
          label="Today's Sales"
          value={`₹${stats.today_sales.toLocaleString("en-IN")}`}
          subValue={salesComparison ? `${Number(salesComparison) >= 0 ? "↑" : "↓"} ${Math.abs(Number(salesComparison))}% vs 30d avg` : "Average daily benchmark"}
          subColor={Number(salesComparison || 0) >= 0 ? "var(--success)" : "var(--danger)"}
          icon="💰"
          isHero={true}
        />
        <StatsCard
          label="Total Receivable"
          value={`₹${stats.total_receivable.toLocaleString("en-IN")}`}
          subValue={stats.overdue_count > 0 ? `${stats.overdue_count} invoices overdue` : "All invoices current"}
          subColor={stats.overdue_count > 0 ? "var(--danger)" : "var(--success)"}
          icon="📥"
          badge={stats.overdue_count > 0 ? { text: `${stats.overdue_count} Overdue`, variant: "danger" } : undefined}
        />
        <StatsCard
          label="Total Payable"
          value={`₹${stats.total_payable.toLocaleString("en-IN")}`}
          subValue={`${stats.total_suppliers} active suppliers`}
          icon="📤"
        />
        <StatsCard
          label="Action Alerts"
          value={stats.low_stock_count + stats.due_today_count}
          subValue={`${stats.due_today_count} due today · ${stats.low_stock_count} low stock items`}
          subColor={stats.low_stock_count > 0 ? "var(--warning)" : "var(--text-muted)"}
          icon="⚡"
          badge={stats.low_stock_count > 0 ? { text: "Attention", variant: "warning" } : undefined}
        />
      </div>

      {/* Quick Navigation Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "var(--space-2)", marginBottom: "var(--space-3)" }}>
        <QuickLink href={`/app/${businessId}/customers`} icon="👤" label="Customers" count={stats.total_customers} />
        <QuickLink href={`/app/${businessId}/suppliers`} icon="🏭" label="Suppliers" count={stats.total_suppliers} />
        <QuickLink href={`/app/${businessId}/products`} icon="📦" label="Products" count={stats.total_products} />
        <QuickLink
          href={`/app/${businessId}/inventory`}
          icon="📋"
          label="Inventory"
          count={stats.low_stock_count}
          badgeText={stats.low_stock_count > 0 ? "Low Stock" : undefined}
          badgeVariant={stats.low_stock_count > 0 ? "warning" : undefined}
        />
      </div>

      {/* Charts & Analytics row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "var(--space-2)", marginBottom: "var(--space-3)" }}>
        {/* Sales trend */}
        <div className="ge-card">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "var(--space-2)" }}>
            <h3 style={{ fontSize: "var(--font-base)", fontWeight: 600, color: "var(--text-primary)" }}>
              Sales Trend
            </h3>
            <span style={{ fontSize: "var(--font-xs)", color: "var(--text-muted)", fontWeight: 500 }}>
              Last 30 days
            </span>
          </div>

          <div style={{ display: "flex", alignItems: "flex-end", gap: "3px", height: "140px", padding: "8px 0" }}>
            {trend.map((t, i) => {
              const h = maxTrend > 0 ? (t.total / maxTrend * 100) : 0;
              return (
                <div
                  key={i}
                  title={`${new Date(t.d).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}: ₹${t.total.toLocaleString("en-IN")}`}
                  style={{
                    flex: 1,
                    height: `${Math.max(h, 3)}%`,
                    borderRadius: "4px 4px 0 0",
                    backgroundColor: t.total > 0 ? "var(--primary)" : "var(--border-subtle)",
                    opacity: t.total > 0 ? 0.7 + (h / 300) : 0.4,
                    transition: "height 0.3s ease, opacity 0.2s ease",
                    cursor: "pointer",
                  }}
                />
              );
            })}
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: "var(--space-1)", borderTop: "1px solid var(--border-subtle)", paddingTop: "8px" }}>
            <span style={{ fontSize: "var(--font-xs)", color: "var(--text-muted)" }}>30 days ago</span>
            <span style={{ fontSize: "var(--font-xs)", color: "var(--text-muted)" }}>Today</span>
          </div>
        </div>

        {/* Top products */}
        <div className="ge-card">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "var(--space-2)" }}>
            <h3 style={{ fontSize: "var(--font-base)", fontWeight: 600, color: "var(--text-primary)" }}>
              Top Products
            </h3>
            <span style={{ fontSize: "var(--font-xs)", color: "var(--text-muted)", fontWeight: 500 }}>
              This Month
            </span>
          </div>

          {topProducts.length === 0 ? (
            <div style={{ padding: "var(--space-4) 0", textAlign: "center", color: "var(--text-muted)" }}>
              <div style={{ fontSize: "2rem", marginBottom: "8px" }}>📊</div>
              <p style={{ fontSize: "var(--font-sm)" }}>No sales recorded this month yet</p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
              {topProducts.map((p, i) => {
                const maxRev = topProducts[0].total_revenue || 1;
                return (
                  <div key={i}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                      <span style={{ fontSize: "var(--font-sm)", color: "var(--text-primary)", fontWeight: 500 }}>
                        {p.product_name}
                      </span>
                      <span style={{ fontSize: "var(--font-sm)", fontVariantNumeric: "tabular-nums", color: "var(--primary)", fontWeight: 600 }}>
                        ₹{p.total_revenue.toLocaleString("en-IN")}
                      </span>
                    </div>
                    <div style={{ height: "6px", borderRadius: "var(--radius-full)", backgroundColor: "var(--bg-elevated)", overflow: "hidden" }}>
                      <div
                        style={{
                          height: "100%",
                          borderRadius: "var(--radius-full)",
                          width: `${(p.total_revenue / maxRev * 100)}%`,
                          backgroundColor: "var(--primary)",
                          transition: "width 0.4s ease",
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Outstanding balance cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "var(--space-2)" }}>
        <OutstandingTable
          title="Customer Receivables"
          rows={custOutstanding}
          linkBase={`/app/${businessId}/customers`}
          emptyMsg="No pending customer receivables"
          type="danger"
        />
        <OutstandingTable
          title="Supplier Payables"
          rows={suppOutstanding}
          linkBase={`/app/${businessId}/suppliers`}
          emptyMsg="No pending supplier payables"
          type="warning"
        />
      </div>
    </div>
  );
}

function QuickLink({
  href,
  icon,
  label,
  count,
  badgeText,
  badgeVariant,
}: {
  href: string;
  icon: string;
  label: string;
  count: number;
  badgeText?: string;
  badgeVariant?: "success" | "warning" | "danger" | "neutral" | "primary";
}) {
  return (
    <Link
      href={href}
      className="ge-card"
      style={{
        textDecoration: "none",
        display: "flex",
        alignItems: "center",
        gap: "12px",
        padding: "var(--space-2)",
        transition: "border-color 0.15s ease",
      }}
    >
      <span style={{ fontSize: "1.5rem" }}>{icon}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: "var(--font-sm)", fontWeight: 600, color: "var(--text-primary)" }}>{label}</div>
        <div style={{ fontSize: "var(--font-xs)", color: "var(--text-muted)", fontVariantNumeric: "tabular-nums" }}>{count} Total</div>
      </div>
      {badgeText && (
        <span className={`ge-badge ge-badge-${badgeVariant || "neutral"}`}>
          {badgeText}
        </span>
      )}
    </Link>
  );
}

function OutstandingTable({
  title,
  rows,
  linkBase,
  emptyMsg,
  type,
}: {
  title: string;
  rows: OutstandingRow[];
  linkBase: string;
  emptyMsg: string;
  type: "danger" | "warning";
}) {
  return (
    <div className="ge-card">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "var(--space-2)" }}>
        <h3 style={{ fontSize: "var(--font-base)", fontWeight: 600, color: "var(--text-primary)" }}>
          {title}
        </h3>
        <span className={`ge-badge ge-badge-${type === "danger" ? "danger" : "warning"}`}>
          {rows.length} pending
        </span>
      </div>

      {rows.length === 0 ? (
        <div style={{ padding: "var(--space-3) 0", textAlign: "center", color: "var(--text-muted)" }}>
          <p style={{ fontSize: "var(--font-sm)" }}>{emptyMsg}</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column" }}>
          {rows.slice(0, 6).map((r) => (
            <Link
              key={r.id}
              href={`${linkBase}/${r.id}`}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "10px 0",
                borderBottom: "1px solid var(--border-subtle)",
                textDecoration: "none",
                transition: "background-color 0.15s ease",
              }}
            >
              <span style={{ fontSize: "var(--font-sm)", color: "var(--text-primary)", fontWeight: 500 }}>
                {r.name}
              </span>
              <span
                style={{
                  fontSize: "var(--font-sm)",
                  fontVariantNumeric: "tabular-nums",
                  fontWeight: 600,
                  color: type === "danger" ? "var(--danger)" : "var(--warning)",
                }}
              >
                ₹{r.outstanding.toLocaleString("en-IN")}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
