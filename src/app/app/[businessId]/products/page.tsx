"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Product } from "@/lib/types";
import Link from "next/link";

export default function ProductsPage() {
  const params = useParams();
  const router = useRouter();
  const businessId = params.businessId as string;

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState("");
  const [showLowStock, setShowLowStock] = useState(false);
  const [sortBy, setSortBy] = useState<"name" | "selling_price" | "current_stock">("name");
  const [sortAsc, setSortAsc] = useState(true);

  useEffect(() => { loadProducts(); }, [businessId]);

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

  function handleSort(col: typeof sortBy) {
    if (sortBy === col) setSortAsc(!sortAsc);
    else { setSortBy(col); setSortAsc(true); }
  }

  // Unique categories
  const categories = [...new Set(products.map((p) => p.category).filter(Boolean))] as string[];

  const filtered = products
    .filter((p) => {
      if (search.trim()) {
        const q = search.toLowerCase();
        if (!p.name.toLowerCase().includes(q) && !(p.sku || "").toLowerCase().includes(q) && !(p.barcode || "").toLowerCase().includes(q)) return false;
      }
      if (catFilter && p.category !== catFilter) return false;
      if (showLowStock && p.current_stock > p.min_stock) return false;
      return true;
    })
    .sort((a, b) => {
      let cmp = 0;
      if (sortBy === "name") cmp = a.name.localeCompare(b.name);
      else if (sortBy === "selling_price") cmp = a.selling_price - b.selling_price;
      else cmp = a.current_stock - b.current_stock;
      return sortAsc ? cmp : -cmp;
    });

  const lowStockCount = products.filter((p) => p.current_stock <= p.min_stock && p.is_active).length;

  if (loading) return <div style={{ padding: "60px 40px", display: "flex", justifyContent: "center" }}><span className="ge-spinner" /></div>;

  return (
    <div style={{ padding: "40px" }}>
      <div className="ge-animate-in">
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "24px" }}>
          <div>
            <h1 style={{ fontSize: "1.5rem", fontWeight: 700, color: "var(--ge-text-primary)", letterSpacing: "-0.02em", marginBottom: "4px" }}>Products</h1>
            <p style={{ fontSize: "0.875rem", color: "var(--ge-text-secondary)" }}>
              {products.length} product{products.length !== 1 ? "s" : ""}
              {lowStockCount > 0 && <span style={{ color: "var(--ge-error)", marginLeft: "8px" }}>• {lowStockCount} low stock</span>}
            </p>
          </div>
          <Link href={`/app/${businessId}/products/new`} className="ge-btn-primary" style={{ width: "auto", padding: "10px 20px", fontSize: "0.875rem", textDecoration: "none", display: "inline-flex", alignItems: "center" }}>
            <span>+ Add product</span>
          </Link>
        </div>

        {/* Filters */}
        <div style={{ display: "flex", gap: "12px", marginBottom: "20px", flexWrap: "wrap", alignItems: "center" }}>
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name, SKU, or barcode…" className="ge-input" style={{ maxWidth: "300px", flex: 1 }} />
          {categories.length > 0 && (
            <select value={catFilter} onChange={(e) => setCatFilter(e.target.value)} className="ge-input" style={{ maxWidth: "180px" }}>
              <option value="">All categories</option>
              {categories.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          )}
          <button
            type="button"
            onClick={() => setShowLowStock(!showLowStock)}
            style={{
              padding: "8px 14px",
              borderRadius: "var(--ge-radius-full)",
              border: showLowStock ? "1px solid var(--ge-error)" : "1px solid var(--ge-border)",
              background: showLowStock ? "var(--ge-error-bg)" : "transparent",
              color: showLowStock ? "var(--ge-error)" : "var(--ge-text-secondary)",
              fontSize: "0.8125rem",
              fontWeight: 500,
              cursor: "pointer",
              transition: "all var(--ge-transition)",
            }}
          >
            ⚠ Low stock{showLowStock ? " ✕" : ""}
          </button>
        </div>

        {/* Table */}
        {filtered.length === 0 ? (
          <div style={{ background: "var(--ge-bg-card)", border: "1px solid var(--ge-border)", borderRadius: "var(--ge-radius-lg)", padding: "48px", textAlign: "center", backdropFilter: "blur(20px)" }}>
            <div style={{ fontSize: "2rem", marginBottom: "12px" }}>📦</div>
            <h2 style={{ fontSize: "1.125rem", fontWeight: 600, color: "var(--ge-text-primary)", marginBottom: "8px" }}>{search || catFilter || showLowStock ? "No products found" : "No products yet"}</h2>
            <p style={{ fontSize: "0.875rem", color: "var(--ge-text-secondary)", marginBottom: "20px" }}>{search || catFilter || showLowStock ? "Try adjusting your filters." : "Add your first product to get started."}</p>
            {!(search || catFilter || showLowStock) && <Link href={`/app/${businessId}/products/new`} className="ge-btn-primary" style={{ width: "auto", padding: "10px 24px", display: "inline-flex", textDecoration: "none" }}><span>+ Add product</span></Link>}
          </div>
        ) : (
          <div style={{ background: "var(--ge-bg-card)", border: "1px solid var(--ge-border)", borderRadius: "var(--ge-radius-lg)", overflow: "hidden", backdropFilter: "blur(20px)" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--ge-border)", fontSize: "0.75rem", color: "var(--ge-text-muted)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                  <SortTh label="Product" col="name" current={sortBy} asc={sortAsc} onClick={handleSort} />
                  <th style={thStyle}>SKU</th>
                  <th style={thStyle}>Category</th>
                  <SortTh label="Price" col="selling_price" current={sortBy} asc={sortAsc} onClick={handleSort} />
                  <SortTh label="Stock" col="current_stock" current={sortBy} asc={sortAsc} onClick={handleSort} />
                  <th style={thStyle}>Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => {
                  const isLow = p.current_stock <= p.min_stock && p.is_active;
                  return (
                    <tr key={p.id} onClick={() => router.push(`/app/${businessId}/products/${p.id}`)} style={{ borderBottom: "1px solid var(--ge-border)", cursor: "pointer", transition: "background var(--ge-transition)" }} className="ge-table-row">
                      <td style={tdStyle}>
                        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                          {p.image_url ? (
                            <img src={p.image_url} alt="" style={{ width: "32px", height: "32px", borderRadius: "var(--ge-radius)", objectFit: "cover" }} />
                          ) : (
                            <div style={{ width: "32px", height: "32px", borderRadius: "var(--ge-radius)", background: "var(--ge-gradient-subtle)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.75rem" }}>📦</div>
                          )}
                          <span style={{ fontWeight: 500, color: "var(--ge-text-primary)" }}>{p.name}</span>
                        </div>
                      </td>
                      <td style={{ ...tdStyle, fontFamily: "monospace", fontSize: "0.8125rem" }}>{p.sku || "—"}</td>
                      <td style={tdStyle}>{p.category || "—"}</td>
                      <td style={{ ...tdStyle, fontFamily: "monospace", fontWeight: 500 }}>₹{p.selling_price.toLocaleString("en-IN")}</td>
                      <td style={tdStyle}>
                        <span style={{ fontFamily: "monospace", fontWeight: 500, color: isLow ? "var(--ge-error)" : "var(--ge-text-primary)" }}>
                          {p.current_stock} {p.unit}
                        </span>
                        {isLow && <span style={{ marginLeft: "6px", fontSize: "0.6875rem", color: "var(--ge-error)" }}>⚠ LOW</span>}
                      </td>
                      <td style={tdStyle}>
                        <span style={{
                          padding: "2px 8px", borderRadius: "var(--ge-radius-full)", fontSize: "0.6875rem", fontWeight: 600,
                          background: p.is_active ? "var(--ge-success-bg)" : "rgba(107,114,128,0.12)",
                          color: p.is_active ? "var(--ge-success)" : "#9ca3af",
                        }}>
                          {p.is_active ? "Active" : "Inactive"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

const thStyle: React.CSSProperties = { padding: "12px 16px", textAlign: "left", fontWeight: 500 };
const tdStyle: React.CSSProperties = { padding: "14px 16px", fontSize: "0.875rem", color: "var(--ge-text-secondary)" };

function SortTh({ label, col, current, asc, onClick }: { label: string; col: string; current: string; asc: boolean; onClick: (c: any) => void }) {
  return <th style={{ ...thStyle, cursor: "pointer", userSelect: "none" }} onClick={() => onClick(col)}>{label} {current === col ? (asc ? "↑" : "↓") : ""}</th>;
}
