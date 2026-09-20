"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Supplier } from "@/lib/types";
import Link from "next/link";

export default function SuppliersPage() {
  const params = useParams();
  const router = useRouter();
  const businessId = params.businessId as string;

  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<"name" | "outstanding_balance" | "created_at">("name");
  const [sortAsc, setSortAsc] = useState(true);

  useEffect(() => {
    loadSuppliers();
  }, [businessId]);

  async function loadSuppliers() {
    const supabase = createClient();
    const { data } = await supabase
      .from("suppliers")
      .select("*")
      .eq("business_id", businessId)
      .order("name", { ascending: true });

    if (data) setSuppliers(data as Supplier[]);
    setLoading(false);
  }

  function handleSort(col: typeof sortBy) {
    if (sortBy === col) setSortAsc(!sortAsc);
    else { setSortBy(col); setSortAsc(true); }
  }

  const filtered = suppliers
    .filter((s) => {
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return s.name.toLowerCase().includes(q) || (s.phone || "").includes(q) || (s.email || "").toLowerCase().includes(q);
    })
    .sort((a, b) => {
      let cmp = 0;
      if (sortBy === "name") cmp = a.name.localeCompare(b.name);
      else if (sortBy === "outstanding_balance") cmp = a.outstanding_balance - b.outstanding_balance;
      else cmp = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      return sortAsc ? cmp : -cmp;
    });

  if (loading) return <div style={{ padding: "60px 40px", display: "flex", justifyContent: "center" }}><span className="ge-spinner" /></div>;

  return (
    <div style={{ padding: "40px" }}>
      <div className="ge-animate-in">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "24px" }}>
          <div>
            <h1 style={{ fontSize: "1.5rem", fontWeight: 700, color: "var(--ge-text-primary)", letterSpacing: "-0.02em", marginBottom: "4px" }}>Suppliers</h1>
            <p style={{ fontSize: "0.875rem", color: "var(--ge-text-secondary)" }}>{suppliers.length} supplier{suppliers.length !== 1 ? "s" : ""}</p>
          </div>
          <Link href={`/app/${businessId}/suppliers/new`} className="ge-btn-primary" style={{ width: "auto", padding: "10px 20px", fontSize: "0.875rem", textDecoration: "none", display: "inline-flex", alignItems: "center" }}>
            <span>+ Add supplier</span>
          </Link>
        </div>

        <div style={{ marginBottom: "20px" }}>
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name, phone, or email…" className="ge-input" style={{ maxWidth: "400px" }} />
        </div>

        {filtered.length === 0 ? (
          <div style={{ background: "var(--ge-bg-card)", border: "1px solid var(--ge-border)", borderRadius: "var(--ge-radius-lg)", padding: "48px", textAlign: "center", backdropFilter: "blur(20px)" }}>
            <div style={{ fontSize: "2rem", marginBottom: "12px" }}>🏭</div>
            <h2 style={{ fontSize: "1.125rem", fontWeight: 600, color: "var(--ge-text-primary)", marginBottom: "8px" }}>{search ? "No suppliers found" : "No suppliers yet"}</h2>
            <p style={{ fontSize: "0.875rem", color: "var(--ge-text-secondary)", marginBottom: "20px" }}>{search ? "Try a different search term." : "Add your first supplier to get started."}</p>
            {!search && <Link href={`/app/${businessId}/suppliers/new`} className="ge-btn-primary" style={{ width: "auto", padding: "10px 24px", display: "inline-flex", textDecoration: "none" }}><span>+ Add supplier</span></Link>}
          </div>
        ) : (
          <div style={{ background: "var(--ge-bg-card)", border: "1px solid var(--ge-border)", borderRadius: "var(--ge-radius-lg)", overflow: "hidden", backdropFilter: "blur(20px)" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--ge-border)", fontSize: "0.75rem", color: "var(--ge-text-muted)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                  <SortTh label="Name" col="name" current={sortBy} asc={sortAsc} onClick={handleSort} />
                  <th style={thStyle}>Phone</th>
                  <th style={thStyle}>Email</th>
                  <th style={thStyle}>Credit Terms</th>
                  <SortTh label="Outstanding" col="outstanding_balance" current={sortBy} asc={sortAsc} onClick={handleSort} />
                </tr>
              </thead>
              <tbody>
                {filtered.map((s) => (
                  <tr key={s.id} onClick={() => router.push(`/app/${businessId}/suppliers/${s.id}`)} style={{ borderBottom: "1px solid var(--ge-border)", cursor: "pointer", transition: "background var(--ge-transition)" }} className="ge-table-row">
                    <td style={tdStyle}><span style={{ fontWeight: 500, color: "var(--ge-text-primary)" }}>{s.name}</span></td>
                    <td style={tdStyle}>{s.phone || "—"}</td>
                    <td style={tdStyle}>{s.email || "—"}</td>
                    <td style={tdStyle}>{s.credit_terms} days</td>
                    <td style={{ ...tdStyle, fontFamily: "monospace", fontWeight: 500 }}>
                      {s.outstanding_balance > 0 ? <span style={{ color: "var(--ge-error)" }}>₹{s.outstanding_balance.toLocaleString("en-IN")}</span> : <span style={{ color: "var(--ge-success)" }}>₹0</span>}
                    </td>
                  </tr>
                ))}
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
