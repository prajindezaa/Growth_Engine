"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { PurchaseOrder, Purchase } from "@/lib/types";
import Link from "next/link";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { TableSkeleton } from "@/components/ui/Skeleton";
import { DataTable, Column } from "@/components/ui/DataTable";

type Tab = "orders" | "purchases";

export default function PurchasesPage() {
  const params = useParams();
  const router = useRouter();
  const businessId = params.businessId as string;

  const [activeTab, setActiveTab] = useState<Tab>("orders");
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAll();
  }, [businessId]);

  async function loadAll() {
    const supabase = createClient();
    const [o, p] = await Promise.all([
      supabase.from("purchase_orders").select("*, suppliers(name)").eq("business_id", businessId).order("created_at", { ascending: false }),
      supabase.from("purchases").select("*, suppliers(name)").eq("business_id", businessId).order("created_at", { ascending: false }),
    ]);
    if (o.data) setOrders(o.data as PurchaseOrder[]);
    if (p.data) setPurchases(p.data as Purchase[]);
    setLoading(false);
  }

  const renderBadge = (status: string) => {
    let cls = "ge-badge-neutral";
    if (["paid", "confirmed", "finalized"].includes(status.toLowerCase())) {
      cls = "ge-badge-success";
    } else if (["partial", "draft", "converted"].includes(status.toLowerCase())) {
      cls = "ge-badge-warning";
    } else if (["cancelled", "unpaid"].includes(status.toLowerCase())) {
      cls = "ge-badge-danger";
    }
    return <span className={`ge-badge ${cls}`} style={{ textTransform: "capitalize" }}>{status}</span>;
  };

  const getColumns = (): Column<any>[] => [
    {
      header: "PO / Bill Number",
      accessor: (row) => (
        <span style={{ fontWeight: 600, color: "var(--text-primary)", fontFamily: "monospace" }}>
          {row.po_number || row.purchase_number}
        </span>
      ),
    },
    {
      header: "Vendor / Supplier",
      accessor: (row) => (
        <span style={{ color: "var(--text-primary)" }}>
          {row.suppliers?.name || "General Supplier"}
        </span>
      ),
    },
    {
      header: "Status",
      accessor: (row) => renderBadge(row.payment_status || row.status),
    },
    {
      header: "Created Date",
      accessor: (row) => (
        <span style={{ color: "var(--text-muted)", fontSize: "var(--font-xs)" }}>
          {new Date(row.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
        </span>
      ),
    },
    {
      header: "Total Cost",
      align: "right",
      accessor: (row) => (
        <span style={{ fontFamily: "monospace", fontWeight: 700, fontSize: "var(--font-sm)", color: "var(--text-primary)" }}>
          ₹{row.grand_total.toLocaleString("en-IN")}
        </span>
      ),
    },
  ];

  return (
    <div className="ge-page-container">
      <PageHeader
        title="Purchases & Procurement"
        description="Vendor purchase orders, inventory receiving bills, and payable expenses"
        action={
          <Link href={`/app/${businessId}/purchases/orders/new`} style={{ textDecoration: "none" }}>
            <Button variant="primary" icon="＋">New Purchase Order</Button>
          </Link>
        }
      />

      {/* Strict Tab Selection */}
      <div
        style={{
          display: "flex",
          gap: "8px",
          borderBottom: "1px solid var(--border-subtle)",
          marginBottom: "var(--space-3)",
        }}
      >
        {[
          { key: "orders" as Tab, label: "Purchase Orders", count: orders.length },
          { key: "purchases" as Tab, label: "Purchases & Inward Bills", count: purchases.length },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
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
              transition: "all 0.15s ease",
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

      {/* Tab Contents */}
      {loading ? (
        <TableSkeleton rows={5} />
      ) : activeTab === "orders" ? (
        orders.length === 0 ? (
          <EmptyState
            icon="🛒"
            title="No purchase orders drafted yet"
            description="Create formal purchase orders to procure materials and restock products from your suppliers."
            actionLabel="Create Purchase Order"
            actionHref={`/app/${businessId}/purchases/orders/new`}
          />
        ) : (
          <DataTable
            columns={getColumns()}
            data={orders}
            keyExtractor={(o) => o.id}
            onRowClick={(o) => router.push(`/app/${businessId}/purchases/orders/${o.id}`)}
          />
        )
      ) : purchases.length === 0 ? (
        <EmptyState
          icon="📦"
          title="No purchases finalized yet"
          description="Finalized purchases automatically increment warehouse stock and register credit payables."
        />
      ) : (
        <DataTable
          columns={getColumns()}
          data={purchases}
          keyExtractor={(p) => p.id}
          onRowClick={(p) => router.push(`/app/${businessId}/purchases/${p.id}`)}
        />
      )}
    </div>
  );
}
