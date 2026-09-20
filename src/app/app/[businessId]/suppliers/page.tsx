"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Supplier } from "@/lib/types";
import Link from "next/link";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { TableSkeleton } from "@/components/ui/Skeleton";
import { DataTable, Column } from "@/components/ui/DataTable";
import { DetailPanel } from "@/components/ui/DetailPanel";
import { MobileCardList } from "@/components/ui/MobileCardList";

export default function SuppliersPage() {
  const params = useParams();
  const router = useRouter();
  const businessId = params.businessId as string;

  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);

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

  const filtered = suppliers.filter((s) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      s.name.toLowerCase().includes(q) ||
      (s.phone || "").includes(q) ||
      (s.email || "").toLowerCase().includes(q)
    );
  });

  const columns: Column<Supplier>[] = [
    {
      header: "Supplier Name",
      accessor: (s) => (
        <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>
          {s.name}
        </span>
      ),
    },
    {
      header: "Phone",
      accessor: (s) => (
        <span style={{ color: "var(--text-secondary)", fontSize: "var(--font-sm)" }}>
          {s.phone || "—"}
        </span>
      ),
    },
    {
      header: "Email",
      accessor: (s) => (
        <span style={{ color: "var(--text-secondary)", fontSize: "var(--font-sm)" }}>
          {s.email || "—"}
        </span>
      ),
    },
    {
      header: "GSTIN",
      accessor: (s) => (
        <span style={{ fontFamily: "monospace", color: "var(--text-muted)", fontSize: "var(--font-xs)" }}>
          {s.gstin || "—"}
        </span>
      ),
    },
    {
      header: "Payable Balance",
      align: "right",
      accessor: (s) => (
        <span
          style={{
            fontFamily: "monospace",
            fontWeight: 700,
            fontSize: "var(--font-sm)",
            color: s.outstanding_balance > 0 ? "var(--warning)" : "var(--success)",
          }}
        >
          ₹{s.outstanding_balance.toLocaleString("en-IN")}
        </span>
      ),
    },
  ];

  return (
    <div className="ge-page-container">
      {/* Desktop Header */}
      <div className="ge-desktop-only">
        <PageHeader
          title="Suppliers"
          description={`${suppliers.length} vendor${suppliers.length !== 1 ? "s" : ""} and supplier profiles`}
          action={
            <Link href={`/app/${businessId}/suppliers/new`} style={{ textDecoration: "none" }}>
              <Button variant="primary" icon="＋">Add Supplier</Button>
            </Link>
          }
        />
      </div>

      {/* Table States */}
      {loading ? (
        <TableSkeleton rows={5} />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon="🏭"
          title={search ? "No suppliers found" : "No suppliers registered yet"}
          description={
            search
              ? "Try adjusting your search query or phone number filter."
              : "Keep track of supplier purchase bills, payment terms, and vendor ledgers."
          }
          actionLabel={search ? undefined : "Add First Supplier"}
          actionHref={search ? undefined : `/app/${businessId}/suppliers/new`}
        />
      ) : (
        <>
          {/* Desktop Table View */}
          <div className="ge-desktop-only">
            <div style={{ marginBottom: "var(--space-3)" }}>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search suppliers by name, phone, or email…"
                className="ge-input"
                style={{ maxWidth: "420px" }}
              />
            </div>
            <DataTable
              columns={columns}
              data={filtered}
              keyExtractor={(s) => s.id}
              onRowClick={(s) => setSelectedSupplier(s)}
            />
          </div>

          {/* Mobile Card List View */}
          <div className="ge-mobile-only">
            <div style={{ padding: "12px 0 6px 0" }}>
              <h1 style={{ fontSize: "1.35rem", fontWeight: 800, margin: 0, color: "var(--text-primary)" }}>
                Suppliers
              </h1>
              <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", margin: "2px 0 8px 0" }}>
                {filtered.length} registered vendor{filtered.length !== 1 ? "s" : ""}
              </p>
            </div>

            <MobileCardList
              items={filtered}
              keyExtractor={(s) => s.id}
              searchPlaceholder="Search vendor name or phone..."
              onSearchChange={(q) => setSearch(q)}
              onItemClick={(s) => setSelectedSupplier(s)}
              renderPrimary={(s) => s.name}
              renderSecondary={(s) => (
                <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                  <span>📞 {s.phone || "No phone"}</span>
                  {s.gstin && <span>• GST: {s.gstin}</span>}
                </div>
              )}
              renderMetric={(s) => (
                <span style={{ color: s.outstanding_balance > 0 ? "var(--warning)" : "var(--success)" }}>
                  ₹{s.outstanding_balance.toLocaleString("en-IN")}
                </span>
              )}
              fabAction={{
                label: "Add Supplier",
                href: `/app/${businessId}/suppliers/new`,
              }}
              actions={[
                {
                  label: "View Vendor Details",
                  icon: "🏭",
                  onClick: (s) => setSelectedSupplier(s),
                },
                {
                  label: "Open Full Page",
                  icon: "↗",
                  onClick: (s) => router.push(`/app/${businessId}/suppliers/${s.id}`),
                },
              ]}
            />
          </div>
        </>
      )}

      {/* Slide-in Detail Drawer for Supplier */}
      <DetailPanel
        isOpen={!!selectedSupplier}
        onClose={() => setSelectedSupplier(null)}
        title={selectedSupplier?.name || "Supplier Details"}
        subtitle={selectedSupplier?.email || selectedSupplier?.phone || "Vendor ledger"}
        statusBadge={{
          text: (selectedSupplier?.outstanding_balance || 0) > 0 ? "PAYABLE DUE" : "SETTLED",
          variant: (selectedSupplier?.outstanding_balance || 0) > 0 ? "warning" : "success",
        }}
        heroNumber={{
          label: "Payable Outstanding",
          value: `₹${(selectedSupplier?.outstanding_balance || 0).toLocaleString("en-IN")}`,
          color: (selectedSupplier?.outstanding_balance || 0) > 0 ? "var(--warning)" : "var(--success)",
          caption: (selectedSupplier?.outstanding_balance || 0) > 0 ? "Bill payments due to vendor" : "Zero balance",
        }}
        fullPageHref={selectedSupplier ? `/app/${businessId}/suppliers/${selectedSupplier.id}` : undefined}
        actions={[
          {
            label: "Create Purchase Order",
            variant: "primary",
            href: `/app/${businessId}/purchases/new?supplierId=${selectedSupplier?.id}`,
          },
          {
            label: "Full Vendor Ledger",
            variant: "secondary",
            href: `/app/${businessId}/suppliers/${selectedSupplier?.id}`,
          },
        ]}
      >
        {selectedSupplier && (
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
                  Phone
                </div>
                <div style={{ fontSize: "var(--font-sm)", fontWeight: 600, color: "var(--text-primary)" }}>
                  {selectedSupplier.phone ? (
                    <a
                      href={`tel:${selectedSupplier.phone}`}
                      style={{ color: "var(--primary)", textDecoration: "none" }}
                    >
                      {selectedSupplier.phone}
                    </a>
                  ) : (
                    "—"
                  )}
                </div>
              </div>

              <div>
                <div style={{ fontSize: "var(--font-xs)", color: "var(--text-muted)", marginBottom: "4px" }}>
                  GSTIN
                </div>
                <div style={{ fontSize: "var(--font-sm)", fontWeight: 600, color: "var(--text-primary)" }}>
                  {selectedSupplier.gstin || "Unregistered"}
                </div>
              </div>

              <div style={{ gridColumn: "span 2" }}>
                <div style={{ fontSize: "var(--font-xs)", color: "var(--text-muted)", marginBottom: "4px" }}>
                  Address
                </div>
                <div style={{ fontSize: "var(--font-sm)", color: "var(--text-secondary)", lineHeight: 1.4 }}>
                  {selectedSupplier.address || "No address on file."}
                </div>
              </div>

              {selectedSupplier.credit_terms ? (
                <div>
                  <div style={{ fontSize: "var(--font-xs)", color: "var(--text-muted)", marginBottom: "4px" }}>
                    Credit Terms
                  </div>
                  <div style={{ fontSize: "var(--font-sm)", fontWeight: 600, color: "var(--text-primary)" }}>
                    Net {selectedSupplier.credit_terms} Days
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        )}
      </DetailPanel>
    </div>
  );
}
