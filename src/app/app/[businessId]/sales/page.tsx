"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Quotation, SalesOrder, Invoice } from "@/lib/types";
import Link from "next/link";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { TableSkeleton } from "@/components/ui/Skeleton";
import { DataTable, Column } from "@/components/ui/DataTable";
import { DetailPanel } from "@/components/ui/DetailPanel";
import { MobileCardList } from "@/components/ui/MobileCardList";

type Tab = "quotations" | "orders" | "invoices";

export default function SalesPage() {
  const params = useParams();
  const router = useRouter();
  const businessId = params.businessId as string;

  const [activeTab, setActiveTab] = useState<Tab>("quotations");
  const [quotations, setQuotations] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Selected document for Drawer
  const [selectedDoc, setSelectedDoc] = useState<{
    type: "quotation" | "order" | "invoice";
    item: any;
  } | null>(null);

  useEffect(() => {
    loadAll();
  }, [businessId]);

  async function loadAll() {
    const supabase = createClient();
    const [q, o, i] = await Promise.all([
      supabase.from("quotations").select("*, customers(name)").eq("business_id", businessId).order("created_at", { ascending: false }),
      supabase.from("sales_orders").select("*, customers(name)").eq("business_id", businessId).order("created_at", { ascending: false }),
      supabase.from("invoices").select("*, customers(name)").eq("business_id", businessId).order("created_at", { ascending: false }),
    ]);
    if (q.data) setQuotations(q.data);
    if (o.data) setOrders(o.data);
    if (i.data) setInvoices(i.data);
    setLoading(false);
  }

  const renderBadge = (status: string) => {
    let cls = "ge-badge-neutral";
    const s = (status || "").toLowerCase();
    if (["paid", "approved", "confirmed", "finalized"].includes(s)) {
      cls = "ge-badge-success";
    } else if (["pending", "partial", "draft"].includes(s)) {
      cls = "ge-badge-warning";
    } else if (["cancelled", "rejected", "overdue", "unpaid"].includes(s)) {
      cls = "ge-badge-danger";
    }
    return <span className={`ge-badge ${cls}`} style={{ textTransform: "capitalize" }}>{status || "Draft"}</span>;
  };

  const getColumns = (): Column<any>[] => [
    {
      header: "Document #",
      accessor: (row) => (
        <span style={{ fontWeight: 600, color: "var(--text-primary)", fontFamily: "monospace" }}>
          {row.quotation_number || row.order_number || row.invoice_number}
        </span>
      ),
    },
    {
      header: "Customer",
      accessor: (row) => (
        <span style={{ color: "var(--text-primary)" }}>
          {row.customers?.name || "Walk-in Customer"}
        </span>
      ),
    },
    {
      header: "Status",
      accessor: (row) => renderBadge(row.payment_status || row.status),
    },
    {
      header: "Date",
      accessor: (row) => (
        <span style={{ color: "var(--text-muted)", fontSize: "var(--font-xs)" }}>
          {new Date(row.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
        </span>
      ),
    },
    {
      header: "Grand Total",
      align: "right",
      accessor: (row) => (
        <span style={{ fontFamily: "monospace", fontWeight: 700, fontSize: "var(--font-sm)", color: "var(--primary)" }}>
          ₹{row.grand_total.toLocaleString("en-IN")}
        </span>
      ),
    },
  ];

  const currentList = activeTab === "quotations" ? quotations : activeTab === "orders" ? orders : invoices;

  return (
    <div className="ge-page-container">
      {/* Desktop Header */}
      <div className="ge-desktop-only">
        <PageHeader
          title="Sales Pipeline"
          description="Quotations, confirmed sales orders, and finalized tax invoices"
          action={
            <Link href={`/app/${businessId}/sales/quotations/new`} style={{ textDecoration: "none" }}>
              <Button variant="primary" icon="＋">New Quotation</Button>
            </Link>
          }
        />
      </div>

      {/* Mobile Title */}
      <div className="ge-mobile-only" style={{ padding: "12px 0 6px 0" }}>
        <h1 style={{ fontSize: "1.35rem", fontWeight: 800, margin: 0, color: "var(--text-primary)" }}>
          Sales Pipeline
        </h1>
      </div>

      {/* Tab Navigation (Large Touch Stepper on Mobile) */}
      <div
        style={{
          display: "flex",
          gap: "8px",
          borderBottom: "1px solid var(--border-subtle)",
          marginBottom: "var(--space-3)",
          overflowX: "auto",
        }}
      >
        {[
          { key: "quotations" as Tab, label: "Quotations", count: quotations.length },
          { key: "orders" as Tab, label: "Orders", count: orders.length },
          { key: "invoices" as Tab, label: "Invoices", count: invoices.length },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className="ge-touch-target"
            style={{
              padding: "10px 16px",
              fontSize: "var(--font-sm)",
              fontWeight: 600,
              color: activeTab === tab.key ? "var(--primary)" : "var(--text-muted)",
              background: "transparent",
              border: "none",
              borderBottom: activeTab === tab.key ? "2px solid var(--primary)" : "2px solid transparent",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              whiteSpace: "nowrap",
            }}
          >
            {tab.label}
            <span
              style={{
                fontSize: "var(--font-xs)",
                padding: "2px 8px",
                borderRadius: "var(--radius-full)",
                backgroundColor: activeTab === tab.key ? "var(--primary-soft)" : "rgba(100, 116, 139, 0.12)",
                color: activeTab === tab.key ? "var(--primary)" : "var(--text-muted)",
              }}
            >
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Loading Skeleton */}
      {loading ? (
        <TableSkeleton rows={5} />
      ) : currentList.length === 0 ? (
        <EmptyState
          icon={activeTab === "quotations" ? "📝" : activeTab === "orders" ? "📦" : "🧾"}
          title={`No ${activeTab} recorded yet`}
          description={`Start creating ${activeTab} to manage client pricing, order delivery, and collect payments.`}
          actionLabel={activeTab === "quotations" ? "Create Quotation" : undefined}
          actionHref={activeTab === "quotations" ? `/app/${businessId}/sales/quotations/new` : undefined}
        />
      ) : (
        <>
          {/* Desktop Table View */}
          <div className="ge-desktop-only">
            <DataTable
              columns={getColumns()}
              data={currentList}
              keyExtractor={(item) => item.id}
              onRowClick={(item) => setSelectedDoc({ type: activeTab === "quotations" ? "quotation" : activeTab === "orders" ? "order" : "invoice", item })}
            />
          </div>

          {/* Mobile Card List View */}
          <div className="ge-mobile-only">
            <MobileCardList
              items={currentList}
              keyExtractor={(item) => item.id}
              searchPlaceholder={`Search ${activeTab}...`}
              onItemClick={(item) => setSelectedDoc({ type: activeTab === "quotations" ? "quotation" : activeTab === "orders" ? "order" : "invoice", item })}
              renderPrimary={(item) => (
                <div style={{ display: "flex", flexDirection: "column" }}>
                  <span style={{ fontSize: "0.85rem", fontFamily: "monospace", color: "var(--text-muted)" }}>
                    {item.quotation_number || item.order_number || item.invoice_number}
                  </span>
                  <span style={{ fontSize: "1rem", fontWeight: 700, color: "var(--text-primary)" }}>
                    {item.customers?.name || "Walk-in Customer"}
                  </span>
                </div>
              )}
              renderSecondary={(item) => (
                <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                  <span>{new Date(item.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</span>
                  <span>•</span>
                  {renderBadge(item.payment_status || item.status)}
                </div>
              )}
              renderMetric={(item) => (
                <span style={{ color: "var(--primary)" }}>
                  ₹{(item.grand_total || 0).toLocaleString("en-IN")}
                </span>
              )}
              fabAction={
                activeTab === "quotations"
                  ? { label: "New Quotation", href: `/app/${businessId}/sales/quotations/new` }
                  : undefined
              }
              actions={[
                {
                  label: "Open Drawer",
                  icon: "📑",
                  onClick: (item) => setSelectedDoc({ type: activeTab === "quotations" ? "quotation" : activeTab === "orders" ? "order" : "invoice", item }),
                },
                {
                  label: "View Full Page",
                  icon: "↗",
                  onClick: (item) => {
                    const sub = activeTab === "quotations" ? "quotations" : activeTab === "orders" ? "orders" : "invoices";
                    router.push(`/app/${businessId}/sales/${sub}/${item.id}`);
                  },
                },
              ]}
            />
          </div>
        </>
      )}

      {/* Document Detail Drawer */}
      <DetailPanel
        isOpen={!!selectedDoc}
        onClose={() => setSelectedDoc(null)}
        title={
          selectedDoc
            ? `${selectedDoc.item.quotation_number || selectedDoc.item.order_number || selectedDoc.item.invoice_number}`
            : "Sales Document"
        }
        subtitle={selectedDoc?.item.customers?.name || "Walk-in Customer"}
        statusBadge={{
          text: (selectedDoc?.item.payment_status || selectedDoc?.item.status || "DRAFT").toUpperCase(),
          variant: "primary",
        }}
        heroNumber={{
          label: "Document Total",
          value: `₹${(selectedDoc?.item.grand_total || 0).toLocaleString("en-IN")}`,
          color: "var(--primary)",
          caption: `Issued on ${selectedDoc ? new Date(selectedDoc.item.created_at).toLocaleDateString("en-IN", { dateStyle: "medium" }) : ""}`,
        }}
        fullPageHref={
          selectedDoc
            ? `/app/${businessId}/sales/${selectedDoc.type === "quotation" ? "quotations" : selectedDoc.type === "order" ? "orders" : "invoices"}/${selectedDoc.item.id}`
            : undefined
        }
        actions={[
          {
            label: "Open Full Page",
            variant: "primary",
            onClick: () => {
              if (selectedDoc) {
                const sub = selectedDoc.type === "quotation" ? "quotations" : selectedDoc.type === "order" ? "orders" : "invoices";
                router.push(`/app/${businessId}/sales/${sub}/${selectedDoc.item.id}`);
              }
            },
          },
        ]}
      >
        {selectedDoc && (
          <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            <div
              style={{
                backgroundColor: "var(--bg-secondary)",
                borderRadius: "var(--radius-md)",
                padding: "14px",
                display: "grid",
                gridTemplateColumns: "repeat(2, 1fr)",
                gap: "12px",
              }}
            >
              <div>
                <div style={{ fontSize: "var(--font-xs)", color: "var(--text-muted)" }}>Subtotal</div>
                <div style={{ fontSize: "var(--font-sm)", fontWeight: 600 }}>
                  ₹{(selectedDoc.item.subtotal || 0).toLocaleString("en-IN")}
                </div>
              </div>
              <div>
                <div style={{ fontSize: "var(--font-xs)", color: "var(--text-muted)" }}>Tax Total</div>
                <div style={{ fontSize: "var(--font-sm)", fontWeight: 600 }}>
                  ₹{(selectedDoc.item.tax_total || 0).toLocaleString("en-IN")}
                </div>
              </div>
              {selectedDoc.item.discount_amount ? (
                <div>
                  <div style={{ fontSize: "var(--font-xs)", color: "var(--text-muted)" }}>Discount</div>
                  <div style={{ fontSize: "var(--font-sm)", fontWeight: 600, color: "var(--danger)" }}>
                    -₹{(selectedDoc.item.discount_amount || 0).toLocaleString("en-IN")}
                  </div>
                </div>
              ) : null}
              {selectedDoc.item.payment_method && (
                <div>
                  <div style={{ fontSize: "var(--font-xs)", color: "var(--text-muted)" }}>Payment Method</div>
                  <div style={{ fontSize: "var(--font-sm)", fontWeight: 600, textTransform: "uppercase" }}>
                    {selectedDoc.item.payment_method}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </DetailPanel>
    </div>
  );
}
