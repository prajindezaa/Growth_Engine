"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Customer } from "@/lib/types";
import Link from "next/link";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { TableSkeleton } from "@/components/ui/Skeleton";
import { DataTable, Column } from "@/components/ui/DataTable";
import { DetailPanel } from "@/components/ui/DetailPanel";
import { MobileCardList } from "@/components/ui/MobileCardList";

export default function CustomersPage() {
  const params = useParams();
  const router = useRouter();
  const businessId = params.businessId as string;

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  useEffect(() => {
    loadCustomers();
  }, [businessId]);

  async function loadCustomers() {
    const supabase = createClient();
    const { data } = await supabase
      .from("customers")
      .select("*")
      .eq("business_id", businessId)
      .order("name", { ascending: true });

    if (data) setCustomers(data as Customer[]);
    setLoading(false);
  }

  const filtered = customers.filter((c) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      c.name.toLowerCase().includes(q) ||
      (c.phone || "").toLowerCase().includes(q) ||
      (c.email || "").toLowerCase().includes(q)
    );
  });

  const columns: Column<Customer>[] = [
    {
      header: "Customer Name",
      accessor: (c) => (
        <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>
          {c.name}
        </span>
      ),
    },
    {
      header: "Phone",
      accessor: (c) => (
        <span style={{ color: "var(--text-secondary)", fontSize: "var(--font-sm)" }}>
          {c.phone || "—"}
        </span>
      ),
    },
    {
      header: "Email",
      accessor: (c) => (
        <span style={{ color: "var(--text-secondary)", fontSize: "var(--font-sm)" }}>
          {c.email || "—"}
        </span>
      ),
    },
    {
      header: "Type",
      accessor: (c) => (
        <span
          className="ge-badge ge-badge-neutral"
          style={{ textTransform: "capitalize" }}
        >
          {c.customer_type}
        </span>
      ),
    },
    {
      header: "Outstanding Balance",
      align: "right",
      accessor: (c) => (
        <span
          style={{
            fontFamily: "monospace",
            fontWeight: 700,
            fontSize: "var(--font-sm)",
            color: c.outstanding_balance > 0 ? "var(--danger)" : "var(--success)",
          }}
        >
          ₹{c.outstanding_balance.toLocaleString("en-IN")}
        </span>
      ),
    },
  ];

  return (
    <div className="ge-page-container">
      {/* Desktop Header */}
      <div className="ge-desktop-only">
        <PageHeader
          title="Customers"
          description={`${customers.length} registered business account${customers.length !== 1 ? "s" : ""}`}
          action={
            <Link href={`/app/${businessId}/customers/new`} style={{ textDecoration: "none" }}>
              <Button variant="primary" icon="＋">Add Customer</Button>
            </Link>
          }
        />
      </div>

      {/* Content State */}
      {loading ? (
        <TableSkeleton rows={6} />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon="👤"
          title={search ? "No customers found" : "No customers registered yet"}
          description={
            search
              ? "No customer matches your query. Try a different search term or phone number."
              : "Keep track of all your buyers, credit balances, and order histories in one place."
          }
          actionLabel={search ? undefined : "Add Your First Customer"}
          actionHref={search ? undefined : `/app/${businessId}/customers/new`}
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
                placeholder="Search customers by name, phone, or email…"
                className="ge-input"
                style={{ maxWidth: "420px" }}
              />
            </div>
            <DataTable
              columns={columns}
              data={filtered}
              keyExtractor={(c) => c.id}
              onRowClick={(c) => setSelectedCustomer(c)}
            />
          </div>

          {/* Mobile Card List View (Thumb Optimized, Reachable) */}
          <div className="ge-mobile-only">
            <div style={{ padding: "12px 0 6px 0" }}>
              <h1 style={{ fontSize: "1.35rem", fontWeight: 800, margin: 0, color: "var(--text-primary)" }}>
                Customers
              </h1>
              <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", margin: "2px 0 8px 0" }}>
                {filtered.length} client{filtered.length !== 1 ? "s" : ""}
              </p>
            </div>

            <MobileCardList
              items={filtered}
              keyExtractor={(c) => c.id}
              searchPlaceholder="Search name or phone..."
              onSearchChange={(q) => setSearch(q)}
              onItemClick={(c) => setSelectedCustomer(c)}
              renderPrimary={(c) => c.name}
              renderSecondary={(c) => (
                <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                  <span>📞 {c.phone || "No phone"}</span>
                  <span style={{ textTransform: "capitalize" }}>• {c.customer_type}</span>
                </div>
              )}
              renderMetric={(c) => (
                <span
                  style={{
                    color: c.outstanding_balance > 0 ? "var(--danger)" : "var(--success)",
                  }}
                >
                  ₹{c.outstanding_balance.toLocaleString("en-IN")}
                </span>
              )}
              fabAction={{
                label: "Add Customer",
                href: `/app/${businessId}/customers/new`,
              }}
              actions={[
                {
                  label: "View Profile",
                  icon: "👤",
                  onClick: (c) => setSelectedCustomer(c),
                },
                {
                  label: "Open Full Page",
                  icon: "↗",
                  onClick: (c) => router.push(`/app/${businessId}/customers/${c.id}`),
                },
                {
                  label: "Call Customer",
                  icon: "📞",
                  onClick: (c) => {
                    if (c.phone) window.location.href = `tel:${c.phone}`;
                  },
                },
              ]}
            />
          </div>
        </>
      )}

      {/* Slide-in Detail Drawer for Customer */}
      <DetailPanel
        isOpen={!!selectedCustomer}
        onClose={() => setSelectedCustomer(null)}
        title={selectedCustomer?.name || "Customer Details"}
        subtitle={selectedCustomer?.email || selectedCustomer?.phone || "Customer record"}
        statusBadge={{
          text: (selectedCustomer?.customer_type || "individual").toUpperCase(),
          variant: "neutral",
        }}
        heroNumber={{
          label: "Outstanding Balance",
          value: `₹${(selectedCustomer?.outstanding_balance || 0).toLocaleString("en-IN")}`,
          color: (selectedCustomer?.outstanding_balance || 0) > 0 ? "var(--danger)" : "var(--success)",
          caption: (selectedCustomer?.outstanding_balance || 0) > 0 ? "Credit pending collection" : "All cleared",
        }}
        fullPageHref={selectedCustomer ? `/app/${businessId}/customers/${selectedCustomer.id}` : undefined}
        actions={[
          {
            label: "Create Invoice",
            variant: "primary",
            href: `/app/${businessId}/sales/new?customerId=${selectedCustomer?.id}`,
          },
          {
            label: "Full Profile",
            variant: "secondary",
            href: `/app/${businessId}/customers/${selectedCustomer?.id}`,
          },
        ]}
      >
        {selectedCustomer && (
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
                  {selectedCustomer.phone ? (
                    <a
                      href={`tel:${selectedCustomer.phone}`}
                      style={{ color: "var(--primary)", textDecoration: "none" }}
                    >
                      {selectedCustomer.phone}
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
                  {selectedCustomer.gstin || "Unregistered"}
                </div>
              </div>

              <div style={{ gridColumn: "span 2" }}>
                <div style={{ fontSize: "var(--font-xs)", color: "var(--text-muted)", marginBottom: "4px" }}>
                  Address
                </div>
                <div style={{ fontSize: "var(--font-sm)", color: "var(--text-secondary)", lineHeight: 1.4 }}>
                  {selectedCustomer.address || "No address on file."}
                </div>
              </div>

              {selectedCustomer.credit_limit ? (
                <div>
                  <div style={{ fontSize: "var(--font-xs)", color: "var(--text-muted)", marginBottom: "4px" }}>
                    Credit Limit
                  </div>
                  <div style={{ fontSize: "var(--font-sm)", fontWeight: 600, color: "var(--text-primary)" }}>
                    ₹{selectedCustomer.credit_limit.toLocaleString("en-IN")}
                  </div>
                </div>
              ) : null}

              {selectedCustomer.payment_terms ? (
                <div>
                  <div style={{ fontSize: "var(--font-xs)", color: "var(--text-muted)", marginBottom: "4px" }}>
                    Payment Terms
                  </div>
                  <div style={{ fontSize: "var(--font-sm)", fontWeight: 600, color: "var(--text-primary)" }}>
                    Net {selectedCustomer.payment_terms} Days
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
