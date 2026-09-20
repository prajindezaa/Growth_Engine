"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Product } from "@/lib/types";
import Link from "next/link";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { TableSkeleton } from "@/components/ui/Skeleton";
import { DataTable, Column } from "@/components/ui/DataTable";
import { DetailPanel } from "@/components/ui/DetailPanel";
import { MobileCardList } from "@/components/ui/MobileCardList";

export default function ProductsPage() {
  const params = useParams();
  const router = useRouter();
  const businessId = params.businessId as string;

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState("");
  const [showLowStock, setShowLowStock] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  useEffect(() => {
    loadProducts();
  }, [businessId]);

  async function loadProducts() {
    const supabase = createClient();
    const { data } = await supabase
      .from("products")
      .select("*")
      .eq("business_id", businessId)
      .order("name", { ascending: true });
    if (data) setProducts(data as Product[]);
    setLoading(false);
  }

  const categories = [...new Set(products.map((p) => p.category).filter(Boolean))] as string[];

  const filtered = products.filter((p) => {
    if (search.trim()) {
      const q = search.toLowerCase();
      if (
        !p.name.toLowerCase().includes(q) &&
        !(p.sku || "").toLowerCase().includes(q) &&
        !(p.barcode || "").toLowerCase().includes(q)
      )
        return false;
    }
    if (catFilter && p.category !== catFilter) return false;
    if (showLowStock && p.current_stock > p.min_stock) return false;
    return true;
  });

  const lowStockCount = products.filter((p) => p.current_stock <= p.min_stock && p.is_active).length;

  const columns: Column<Product>[] = [
    {
      header: "Product Name",
      accessor: (p) => (
        <div>
          <div style={{ fontWeight: 600, color: "var(--text-primary)" }}>{p.name}</div>
          {p.sku && (
            <div style={{ fontSize: "var(--font-xs)", color: "var(--text-muted)", fontFamily: "monospace" }}>
              SKU: {p.sku}
            </div>
          )}
        </div>
      ),
    },
    {
      header: "Category",
      accessor: (p) => (
        <span className="ge-badge ge-badge-neutral">{p.category || "General"}</span>
      ),
    },
    {
      header: "Selling Price",
      accessor: (p) => (
        <span style={{ fontFamily: "monospace", fontWeight: 600, color: "var(--text-primary)" }}>
          ₹{p.selling_price.toLocaleString("en-IN")}
        </span>
      ),
    },
    {
      header: "Cost Price",
      accessor: (p) => (
        <span style={{ fontFamily: "monospace", color: "var(--text-secondary)" }}>
          ₹{p.purchase_price.toLocaleString("en-IN")}
        </span>
      ),
    },
    {
      header: "Stock Level",
      align: "right",
      accessor: (p) => {
        const isLow = p.current_stock <= p.min_stock;
        return (
          <span
            style={{
              fontFamily: "monospace",
              fontWeight: 700,
              fontSize: "var(--font-sm)",
              color: isLow ? "var(--danger)" : "var(--success)",
              display: "inline-flex",
              alignItems: "center",
              gap: "4px",
            }}
          >
            {isLow && <span>⚠</span>}
            {p.current_stock} {p.unit}
          </span>
        );
      },
    },
  ];

  return (
    <div className="ge-page-container">
      {/* Desktop Header */}
      <div className="ge-desktop-only">
        <PageHeader
          title="Products"
          description={`${products.length} catalog SKU${products.length !== 1 ? "s" : ""}`}
          action={
            <Link href={`/app/${businessId}/products/new`} style={{ textDecoration: "none" }}>
              <Button variant="primary" icon="＋">Add Product</Button>
            </Link>
          }
        />
      </div>

      {/* State Rendering */}
      {loading ? (
        <TableSkeleton rows={6} />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon="📦"
          title={search ? "No products match criteria" : "No products in inventory"}
          description={
            search
              ? "Try adjusting your search terms or clearing active category filters."
              : "Create product listings to start making sales, tracking stock, and invoicing customers."
          }
          actionLabel={search ? undefined : "Add First Product"}
          actionHref={search ? undefined : `/app/${businessId}/products/new`}
        />
      ) : (
        <>
          {/* Desktop Table View */}
          <div className="ge-desktop-only">
            <div
              style={{
                display: "flex",
                gap: "var(--space-2)",
                marginBottom: "var(--space-3)",
                flexWrap: "wrap",
                alignItems: "center",
              }}
            >
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name, SKU, or barcode…"
                className="ge-input"
                style={{ maxWidth: "340px" }}
              />

              {categories.length > 0 && (
                <select
                  value={catFilter}
                  onChange={(e) => setCatFilter(e.target.value)}
                  className="ge-input"
                  style={{ maxWidth: "200px" }}
                >
                  <option value="">All Categories</option>
                  {categories.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              )}

              {lowStockCount > 0 && (
                <Button
                  variant={showLowStock ? "destructive" : "secondary"}
                  size="sm"
                  onClick={() => setShowLowStock(!showLowStock)}
                >
                  ⚠ Low Stock ({lowStockCount})
                </Button>
              )}
            </div>

            <DataTable
              columns={columns}
              data={filtered}
              keyExtractor={(p) => p.id}
              onRowClick={(p) => setSelectedProduct(p)}
            />
          </div>

          {/* Mobile Card List View (Thumb Optimized, Reachable) */}
          <div className="ge-mobile-only">
            <div style={{ padding: "12px 0 6px 0" }}>
              <h1 style={{ fontSize: "1.35rem", fontWeight: 800, margin: 0, color: "var(--text-primary)" }}>
                Products
              </h1>
              <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", margin: "2px 0 8px 0" }}>
                {filtered.length} product{filtered.length !== 1 ? "s" : ""} • {lowStockCount > 0 ? `⚠ ${lowStockCount} low stock` : "Stock healthy"}
              </p>
            </div>

            {/* Mobile Category Horizontal Scroll */}
            {categories.length > 0 && (
              <div
                style={{
                  display: "flex",
                  gap: "6px",
                  overflowX: "auto",
                  paddingBottom: "10px",
                  marginBottom: "4px",
                }}
              >
                <button
                  type="button"
                  onClick={() => setCatFilter("")}
                  style={{
                    padding: "6px 12px",
                    borderRadius: "var(--radius-full)",
                    border: "none",
                    background: catFilter === "" ? "var(--primary)" : "var(--bg-card)",
                    color: catFilter === "" ? "#fff" : "var(--text-secondary)",
                    fontSize: "0.75rem",
                    fontWeight: 600,
                    whiteSpace: "nowrap",
                    cursor: "pointer",
                  }}
                >
                  All
                </button>
                {categories.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setCatFilter(catFilter === cat ? "" : cat)}
                    style={{
                      padding: "6px 12px",
                      borderRadius: "var(--radius-full)",
                      border: "none",
                      background: catFilter === cat ? "var(--primary)" : "var(--bg-card)",
                      color: catFilter === cat ? "#fff" : "var(--text-secondary)",
                      fontSize: "0.75rem",
                      fontWeight: 600,
                      whiteSpace: "nowrap",
                      cursor: "pointer",
                    }}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            )}

            <MobileCardList
              items={filtered}
              keyExtractor={(p) => p.id}
              searchPlaceholder="Search products or SKU..."
              onSearchChange={(q) => setSearch(q)}
              onItemClick={(p) => setSelectedProduct(p)}
              renderPrimary={(p) => p.name}
              renderSecondary={(p) => (
                <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
                  <span>{p.category || "General"}</span>
                  {p.sku && <span>• SKU: {p.sku}</span>}
                  <span
                    style={{
                      fontWeight: 600,
                      color: p.current_stock <= p.min_stock ? "var(--danger)" : "var(--text-secondary)",
                    }}
                  >
                    • {p.current_stock} {p.unit} left
                  </span>
                </div>
              )}
              renderMetric={(p) => (
                <span style={{ color: "var(--text-primary)" }}>
                  ₹{p.selling_price.toLocaleString("en-IN")}
                </span>
              )}
              fabAction={{
                label: "Add Product",
                href: `/app/${businessId}/products/new`,
              }}
              actions={[
                {
                  label: "View Stock Details",
                  icon: "🏷️",
                  onClick: (p) => setSelectedProduct(p),
                },
                {
                  label: "Open Full Page",
                  icon: "↗",
                  onClick: (p) => router.push(`/app/${businessId}/products/${p.id}`),
                },
              ]}
            />
          </div>
        </>
      )}

      {/* Slide-in Detail Drawer for Product */}
      <DetailPanel
        isOpen={!!selectedProduct}
        onClose={() => setSelectedProduct(null)}
        title={selectedProduct?.name || "Product Details"}
        subtitle={selectedProduct?.sku ? `SKU: ${selectedProduct.sku}` : (selectedProduct?.category || "Product")}
        statusBadge={{
          text: (selectedProduct?.current_stock || 0) <= (selectedProduct?.min_stock || 0) ? "LOW STOCK" : "IN STOCK",
          variant: (selectedProduct?.current_stock || 0) <= (selectedProduct?.min_stock || 0) ? "danger" : "success",
        }}
        heroNumber={{
          label: "Selling Price",
          value: `₹${(selectedProduct?.selling_price || 0).toLocaleString("en-IN")}`,
          color: "var(--primary)",
          caption: `Current Stock: ${selectedProduct?.current_stock || 0} ${selectedProduct?.unit || "units"}`,
        }}
        fullPageHref={selectedProduct ? `/app/${businessId}/products/${selectedProduct.id}` : undefined}
        actions={[
          {
            label: "Edit Product",
            variant: "primary",
            href: `/app/${businessId}/products/${selectedProduct?.id}`,
          },
        ]}
      >
        {selectedProduct && (
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div
              style={{
                backgroundColor: "var(--bg-secondary)",
                borderRadius: "var(--radius-md)",
                padding: "16px",
                display: "grid",
                gridTemplateColumns: "repeat(2, 1fr)",
                gap: "14px",
              }}
            >
              <div>
                <div style={{ fontSize: "var(--font-xs)", color: "var(--text-muted)", marginBottom: "4px" }}>
                  Cost / Purchase Price
                </div>
                <div style={{ fontSize: "var(--font-sm)", fontWeight: 600, color: "var(--text-primary)" }}>
                  ₹{(selectedProduct.purchase_price || 0).toLocaleString("en-IN")}
                </div>
              </div>

              <div>
                <div style={{ fontSize: "var(--font-xs)", color: "var(--text-muted)", marginBottom: "4px" }}>
                  GST / Tax Rate
                </div>
                <div style={{ fontSize: "var(--font-sm)", fontWeight: 600, color: "var(--text-primary)" }}>
                  {selectedProduct.tax_rate !== undefined ? `${selectedProduct.tax_rate}%` : "Default"}
                </div>
              </div>

              <div>
                <div style={{ fontSize: "var(--font-xs)", color: "var(--text-muted)", marginBottom: "4px" }}>
                  Barcode
                </div>
                <div style={{ fontSize: "var(--font-sm)", fontFamily: "monospace", color: "var(--text-secondary)" }}>
                  {selectedProduct.barcode || "—"}
                </div>
              </div>

              <div>
                <div style={{ fontSize: "var(--font-xs)", color: "var(--text-muted)", marginBottom: "4px" }}>
                  Minimum Stock Alert
                </div>
                <div style={{ fontSize: "var(--font-sm)", fontWeight: 600, color: "var(--text-primary)" }}>
                  {selectedProduct.min_stock} {selectedProduct.unit}
                </div>
              </div>

              {selectedProduct.hsn_sac && (
                <div style={{ gridColumn: "span 2" }}>
                  <div style={{ fontSize: "var(--font-xs)", color: "var(--text-muted)", marginBottom: "4px" }}>
                    HSN / SAC Code
                  </div>
                  <div style={{ fontSize: "var(--font-sm)", fontFamily: "monospace", color: "var(--text-secondary)" }}>
                    {selectedProduct.hsn_sac}
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
