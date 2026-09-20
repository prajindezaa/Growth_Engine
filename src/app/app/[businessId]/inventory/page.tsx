"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Product } from "@/lib/types";
import Link from "next/link";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { StatsCard } from "@/components/ui/StatsCard";
import { TableSkeleton } from "@/components/ui/Skeleton";
import { DataTable, Column } from "@/components/ui/DataTable";

export default function InventoryPage() {
  const params = useParams();
  const businessId = params.businessId as string;

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [businessId]);

  async function loadData() {
    const supabase = createClient();
    const { data } = await supabase
      .from("products")
      .select("*")
      .eq("business_id", businessId)
      .eq("is_active", true)
      .order("name");
    if (data) setProducts(data as Product[]);
    setLoading(false);
  }

  const totalUnits = products.reduce((s, p) => s + p.current_stock, 0);
  const totalValuation = products.reduce((s, p) => s + p.current_stock * p.purchase_price, 0);
  const lowStock = products.filter((p) => p.current_stock <= p.min_stock);

  const columns: Column<Product>[] = [
    {
      header: "Product",
      accessor: (p) => (
        <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>{p.name}</span>
      ),
    },
    {
      header: "SKU",
      accessor: (p) => (
        <span style={{ fontFamily: "monospace", color: "var(--text-muted)", fontSize: "var(--font-xs)" }}>
          {p.sku || "—"}
        </span>
      ),
    },
    {
      header: "Current Stock",
      accessor: (p) => {
        const isLow = p.current_stock <= p.min_stock;
        return (
          <span
            style={{
              fontFamily: "monospace",
              fontWeight: 700,
              fontSize: "var(--font-sm)",
              color: isLow ? "var(--danger)" : "var(--text-primary)",
            }}
          >
            {p.current_stock} {p.unit}
            {isLow && <span style={{ marginLeft: "6px" }}>⚠</span>}
          </span>
        );
      },
    },
    {
      header: "Unit Cost",
      accessor: (p) => (
        <span style={{ fontFamily: "monospace", color: "var(--text-secondary)" }}>
          ₹{p.purchase_price.toLocaleString("en-IN")}
        </span>
      ),
    },
    {
      header: "Stock Valuation",
      align: "right",
      accessor: (p) => (
        <span style={{ fontFamily: "monospace", fontWeight: 700, color: "var(--primary)" }}>
          ₹{(p.current_stock * p.purchase_price).toLocaleString("en-IN", { maximumFractionDigits: 0 })}
        </span>
      ),
    },
  ];

  return (
    <div className="ge-page-container">
      <PageHeader
        title="Inventory"
        description="Warehouse stock ledger, real-time levels, and valuation balance"
        action={
          <Link href={`/app/${businessId}/inventory/adjust`} style={{ textDecoration: "none" }}>
            <Button variant="primary" icon="±">Stock Adjustment</Button>
          </Link>
        }
      />

      {/* Top Dominant Hero Numbers */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: "var(--space-2)",
          marginBottom: "var(--space-4)",
        }}
      >
        <StatsCard
          label="Total Inventory Value"
          value={`₹${totalValuation.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`}
          subValue="At purchase cost"
          icon="💎"
          isHero
        />
        <StatsCard
          label="Total Units in Stock"
          value={totalUnits.toLocaleString("en-IN")}
          subValue={`Across ${products.length} catalog items`}
          icon="📊"
        />
        <StatsCard
          label="Low Stock Warnings"
          value={lowStock.length}
          subValue={lowStock.length > 0 ? "Requires restock purchase" : "All products healthy"}
          subColor={lowStock.length > 0 ? "var(--danger)" : "var(--success)"}
          icon="⚠"
        />
      </div>

      {/* Low Stock Callout Card */}
      {lowStock.length > 0 && (
        <div
          style={{
            backgroundColor: "var(--danger-bg)",
            border: "1px solid rgba(239, 68, 68, 0.3)",
            borderRadius: "var(--radius-md)",
            padding: "var(--space-3)",
            marginBottom: "var(--space-4)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
            <div style={{ fontWeight: 700, color: "var(--danger)", display: "flex", alignItems: "center", gap: "8px" }}>
              <span>⚠</span> Critical Low Stock Items ({lowStock.length})
            </div>
            <Link href={`/app/${businessId}/purchases/orders/new`} style={{ textDecoration: "none" }}>
              <Button size="sm" variant="destructive">Create Purchase Order</Button>
            </Link>
          </div>
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            {lowStock.map((p) => (
              <span
                key={p.id}
                className="ge-badge ge-badge-danger"
                style={{ padding: "4px 10px", fontSize: "var(--font-xs)" }}
              >
                {p.name}: {p.current_stock}/{p.min_stock} {p.unit}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Stock Table */}
      <h2 style={{ fontSize: "var(--font-md)", fontWeight: 700, color: "var(--text-primary)", marginBottom: "var(--space-2)" }}>
        All Products Stock Ledger
      </h2>

      {loading ? (
        <TableSkeleton rows={5} />
      ) : (
        <DataTable
          columns={columns}
          data={products}
          keyExtractor={(p) => p.id}
        />
      )}
    </div>
  );
}
