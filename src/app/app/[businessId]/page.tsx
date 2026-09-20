"use client";

import { useState, useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";

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
      <div style={{ padding: "32px 40px" }}>
        <div className="ge-skeleton" style={{ width: "180px", height: "28px", marginBottom: "24px" }} />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "16px", marginBottom: "24px" }}>
          {[1, 2, 3, 4].map((n) => (
            <div key={n} className="ge-metric-card" style={{ padding: "20px" }}>
              <div className="ge-skeleton" style={{ width: "80px", height: "12px", marginBottom: "12px" }} />
              <div className="ge-skeleton" style={{ width: "120px", height: "24px", marginBottom: "8px" }} />
              <div className="ge-skeleton" style={{ width: "100px", height: "12px" }} />
            </div>
          ))}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "16px" }}>
          <div className="ge-metric-card" style={{ padding: "20px" }}><div className="ge-skeleton" style={{ width: "100%", height: "140px" }} /></div>
          <div className="ge-metric-card" style={{ padding: "20px" }}><div className="ge-skeleton" style={{ width: "100%", height: "140px" }} /></div>
        </div>
      </div>
    );
  }

  if (!stats) return <div style={{ padding: "60px 40px", color: "var(--ge-text-muted)" }}>Could not load dashboard.</div>;

  const salesComparison = stats.avg_daily_sales > 0
    ? ((stats.today_sales - stats.avg_daily_sales) / stats.avg_daily_sales * 100).toFixed(0) : null;
  const maxTrend = Math.max(...trend.map((t) => t.total), 1);

  return (
    <div style={{ padding: "32px 40px" }}>
      {/* Header */}
      <div className="ge-page-header ge-animate-in">
        <div>
          <h1 className="ge-page-title">Dashboard</h1>
          <p className="ge-page-desc">Real-time overview of your business</p>
        </div>
      </div>

      {/* Top metrics */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "16px", marginBottom: "24px" }}>
        <MetricCard label="Today's Sales" value={stats.today_sales} prefix="₹" format
          sub={salesComparison ? `${Number(salesComparison) >= 0 ? "↑" : "↓"} ${Math.abs(Number(salesComparison))}% vs avg` : "—"}
          subColor={Number(salesComparison || 0) >= 0 ? "var(--ge-success)" : "var(--ge-error)"}
          highlight delay={0} />
        <MetricCard label="Receivable" value={stats.total_receivable} prefix="₹" format
          sub={stats.overdue_count > 0 ? `${stats.overdue_count} overdue` : "All current"}
          subColor={stats.overdue_count > 0 ? "var(--ge-error)" : "var(--ge-success)"}
          badge={stats.overdue_count > 0 ? "danger" : undefined} delay={1} />
        <MetricCard label="Payable" value={stats.total_payable} prefix="₹" format
          sub={`${stats.total_suppliers} suppliers`} delay={2} />
        <MetricCard label="Alerts" value={stats.low_stock_count + stats.due_today_count}
          sub={`${stats.due_today_count} due today · ${stats.low_stock_count} low stock`}
          subColor={stats.low_stock_count > 0 ? "var(--ge-warning)" : "var(--ge-text-muted)"}
          badge={stats.low_stock_count > 0 ? "warning" : undefined} delay={3} />
      </div>

      {/* Quick links */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "12px", marginBottom: "24px" }}>
        <QuickLink href={`/app/${businessId}/customers`} icon="👤" label="Customers" count={stats.total_customers} />
        <QuickLink href={`/app/${businessId}/suppliers`} icon="🏭" label="Suppliers" count={stats.total_suppliers} />
        <QuickLink href={`/app/${businessId}/products`} icon="📦" label="Products" count={stats.total_products} />
        <QuickLink href={`/app/${businessId}/inventory`} icon="📋" label="Inventory"
          count={stats.low_stock_count}
          badge={stats.low_stock_count > 0 ? "warning" : undefined}
          badgeText={stats.low_stock_count > 0 ? "Low" : undefined} />
      </div>

      {/* Charts row */}
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "16px", marginBottom: "24px" }}>
        {/* Sales trend */}
        <div className="ge-metric-card" style={{ padding: "20px" }}>
          <h3 style={{ fontSize: "var(--ge-text-sm)", fontWeight: 600, color: "var(--ge-text-primary)", marginBottom: "16px" }}>Sales Trend <span style={{ color: "var(--ge-text-muted)", fontWeight: 400 }}>· 30 days</span></h3>
          <div style={{ display: "flex", alignItems: "flex-end", gap: "2px", height: "120px" }}>
            {trend.map((t, i) => {
              const h = maxTrend > 0 ? (t.total / maxTrend * 100) : 0;
              return (
                <div key={i} title={`${new Date(t.d).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}: ₹${t.total.toLocaleString("en-IN")}`} style={{
                  flex: 1, height: `${Math.max(h, 2)}%`, borderRadius: "3px 3px 0 0",
                  background: t.total > 0
                    ? `linear-gradient(180deg, var(--ge-accent) 0%, rgba(79,70,229,0.3) 100%)`
                    : "rgba(255,255,255,0.03)",
                  opacity: t.total > 0 ? 0.6 + (h / 250) : 1,
                  transition: "all 0.4s ease", cursor: "pointer",
                }} />
              );
            })}
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: "8px" }}>
            <span style={{ fontSize: "var(--ge-text-xs)", color: "var(--ge-text-muted)" }}>30 days ago</span>
            <span style={{ fontSize: "var(--ge-text-xs)", color: "var(--ge-text-muted)" }}>Today</span>
          </div>
        </div>

        {/* Top products */}
        <div className="ge-metric-card" style={{ padding: "20px" }}>
          <h3 style={{ fontSize: "var(--ge-text-sm)", fontWeight: 600, color: "var(--ge-text-primary)", marginBottom: "16px" }}>Top Products <span style={{ color: "var(--ge-text-muted)", fontWeight: 400 }}>· This Month</span></h3>
          {topProducts.length === 0 ? (
            <div className="ge-empty-state" style={{ padding: "20px 0" }}>
              <div className="ge-empty-icon">📊</div>
              <p className="ge-empty-desc">No sales data this month yet</p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {topProducts.map((p, i) => {
                const maxRev = topProducts[0].total_revenue || 1;
                return (
                  <div key={i}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                      <span style={{ fontSize: "var(--ge-text-sm)", color: "var(--ge-text-primary)", fontWeight: 500 }}>{p.product_name}</span>
                      <span style={{ fontSize: "var(--ge-text-xs)", fontVariantNumeric: "tabular-nums", color: "var(--ge-accent)", fontWeight: 600 }}>₹{p.total_revenue.toLocaleString("en-IN")}</span>
                    </div>
                    <div style={{ height: "4px", borderRadius: "2px", background: "var(--ge-bg-secondary)" }}>
                      <div style={{
                        height: "100%", borderRadius: "2px", width: `${(p.total_revenue / maxRev * 100)}%`,
                        background: "var(--ge-gradient)", transition: "width 0.6s ease",
                      }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Outstanding tables */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
        <OutstandingTable title="Customer Receivable" rows={custOutstanding} linkBase={`/app/${businessId}/customers`} emptyMsg="No outstanding receivables" type="danger" />
        <OutstandingTable title="Supplier Payable" rows={suppOutstanding} linkBase={`/app/${businessId}/suppliers`} emptyMsg="No outstanding payables" type="warning" />
      </div>
    </div>
  );
}

// Count-up metric card
function MetricCard({ label, value, prefix, sub, subColor, format, highlight, badge, delay }: {
  label: string; value: number; prefix?: string; sub?: string; subColor?: string;
  format?: boolean; highlight?: boolean; badge?: "success" | "warning" | "danger"; delay?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [display, setDisplay] = useState("0");

  useEffect(() => {
    let start = 0;
    const end = value;
    const duration = 500;
    const startTime = Date.now() + (delay || 0) * 80;

    function step() {
      const now = Date.now();
      if (now < startTime) { requestAnimationFrame(step); return; }
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      start = Math.round(eased * end);
      setDisplay(format ? start.toLocaleString("en-IN") : String(start));
      if (progress < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }, [value, format, delay]);

  return (
    <div ref={ref} className={`ge-metric-card ge-animate-in ge-animate-delay-${delay || 0}`}
      style={highlight ? { background: "var(--ge-gradient-subtle)", borderColor: "rgba(79,70,229,0.2)" } : {}}>
      <div className="ge-metric-label">{label}</div>
      <div className="ge-metric-value ge-count-up" style={{ display: "flex", alignItems: "baseline", gap: "2px" }}>
        {prefix && <span style={{ fontSize: "var(--ge-text-sm)", fontWeight: 500, opacity: 0.7 }}>{prefix}</span>}
        {display}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "4px" }}>
        {sub && <span style={{ fontSize: "var(--ge-text-xs)", color: subColor || "var(--ge-text-muted)" }}>{sub}</span>}
        {badge && <span className={`ge-badge ge-badge-${badge}`} style={{ fontSize: "10px", padding: "1px 6px" }}>{badge === "danger" ? "Overdue" : badge === "warning" ? "Alert" : "OK"}</span>}
      </div>
    </div>
  );
}

function QuickLink({ href, icon, label, count, badge, badgeText }: { href: string; icon: string; label: string; count: number; badge?: string; badgeText?: string }) {
  return (
    <Link href={href} style={{
      background: "var(--ge-bg-card)", border: "1px solid var(--ge-border)",
      borderRadius: "var(--ge-radius)", padding: "14px 16px", textDecoration: "none",
      display: "flex", alignItems: "center", gap: "10px", transition: "all var(--ge-transition)",
    }} className="ge-table-row">
      <span style={{ fontSize: "1.25rem" }}>{icon}</span>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: "var(--ge-text-sm)", fontWeight: 500, color: "var(--ge-text-primary)" }}>{label}</div>
        <div style={{ fontSize: "var(--ge-text-xs)", color: "var(--ge-text-muted)", fontVariantNumeric: "tabular-nums" }}>{count}</div>
      </div>
      {badge && <span className={`ge-badge ge-badge-${badge}`}>{badgeText}</span>}
    </Link>
  );
}

function OutstandingTable({ title, rows, linkBase, emptyMsg, type }: { title: string; rows: OutstandingRow[]; linkBase: string; emptyMsg: string; type: "danger" | "warning" }) {
  return (
    <div className="ge-metric-card" style={{ padding: "20px" }}>
      <h3 style={{ fontSize: "var(--ge-text-sm)", fontWeight: 600, color: "var(--ge-text-primary)", marginBottom: "12px" }}>{title}</h3>
      {rows.length === 0 ? (
        <div className="ge-empty-state" style={{ padding: "20px 0" }}>
          <div className="ge-empty-icon">✅</div>
          <p className="ge-empty-desc">{emptyMsg}</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column" }}>
          {rows.slice(0, 8).map((r) => (
            <Link key={r.id} href={`${linkBase}/${r.id}`} style={{
              display: "flex", justifyContent: "space-between", alignItems: "center",
              padding: "8px 0", borderBottom: "1px solid var(--ge-border)", textDecoration: "none",
              transition: "all var(--ge-transition)",
            }}>
              <span style={{ fontSize: "var(--ge-text-sm)", color: "var(--ge-text-primary)", fontWeight: 500 }}>{r.name}</span>
              <span style={{
                fontSize: "var(--ge-text-sm)", fontVariantNumeric: "tabular-nums", fontWeight: 600,
                color: type === "danger" ? "var(--ge-error)" : "var(--ge-warning)",
              }}>₹{r.outstanding.toLocaleString("en-IN")}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
