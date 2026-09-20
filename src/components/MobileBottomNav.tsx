"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

import type { Role } from "@/lib/roles";
import {
  canAccessSales,
  canAccessCustomers,
  canAccessProducts,
  canAccessSuppliers,
  canAccessPurchases,
  canAccessInventory,
  canAccessReports,
  canAccessPOS,
  canManageAutomation,
  canManageTeam,
  canEditSettings,
} from "@/lib/roles";

interface MobileBottomNavProps {
  businessId: string;
  role?: Role;
}

export default function MobileBottomNav({ businessId, role = "sales" }: MobileBottomNavProps) {
  const pathname = usePathname();
  const [showMore, setShowMore] = useState(false);

  const base = `/app/${businessId}`;
  const isActive = (path: string) => {
    if (path === base) return pathname === base;
    return pathname.startsWith(path);
  };

  const isCashier = role === "cashier";

  const tabs: Array<{
    href?: string;
    icon: string;
    label: string;
    match?: string;
    action?: string;
  }> = [
    { href: base, icon: "📊", label: "Dashboard", match: base },
    // Cashier role prioritizes POS Counter as primary 2nd tab
    ...(isCashier && canAccessPOS(role)
      ? [{ href: `${base}/pos`, icon: "🛍️", label: "POS", match: `${base}/pos` }]
      : canAccessSales(role)
      ? [{ href: `${base}/sales`, icon: "🧾", label: "Sales", match: `${base}/sales` }]
      : []),
    ...(canAccessCustomers(role)
      ? [{ href: `${base}/customers`, icon: "👤", label: "Customers", match: `${base}/customers` }]
      : []),
    { action: "ai", icon: "✨", label: "AI" },
    { action: "more", icon: "☰", label: "More" },
  ];

  const moreItems: Array<{ href: string; icon: string; label: string; desc?: string }> = [
    ...(!isCashier && canAccessPOS(role)
      ? [{ href: `${base}/pos`, icon: "🛍️", label: "POS Counter", desc: "Fast billing & scanner" }]
      : []),
    ...(canAccessProducts(role)
      ? [{ href: `${base}/products`, icon: "🏷️", label: "Products", desc: "Catalog & price rules" }]
      : []),
    ...(canAccessSuppliers(role)
      ? [{ href: `${base}/suppliers`, icon: "🏭", label: "Suppliers", desc: "Vendors & credit accounts" }]
      : []),
    ...(canAccessPurchases(role)
      ? [{ href: `${base}/purchases`, icon: "🛒", label: "Purchases", desc: "Vendor orders & bills" }]
      : []),
    ...(canAccessInventory(role)
      ? [{ href: `${base}/inventory`, icon: "📋", label: "Inventory", desc: "Stock batches & movements" }]
      : []),
    ...(canAccessReports(role)
      ? [{ href: `${base}/reports`, icon: "📈", label: "Reports & GST", desc: "Profit & loss, sales analysis" }]
      : []),
    ...(canManageAutomation(role)
      ? [{ href: `${base}/approvals`, icon: "⚡", label: "Approvals", desc: "Pending autonomous actions" }]
      : []),
    ...(canManageTeam(role)
      ? [{ href: `${base}/team`, icon: "👥", label: "Team & Staff", desc: "Permissions & cashiers" }]
      : []),
    ...(canEditSettings(role)
      ? [
          { href: `${base}/settings`, icon: "⚙️", label: "Business Settings", desc: "GSTIN, invoices & print" },
          { href: `${base}/subscription`, icon: "💎", label: "Subscription", desc: "Plan & features" },
        ]
      : []),
  ];

  return (
    <>
      <nav className="ge-mobile-nav" aria-label="Mobile Navigation">
        <div className="ge-mobile-nav-inner">
          {tabs.map((tab) => {
            if (tab.action === "ai") {
              return (
                <button
                  key="ai"
                  className="ge-mobile-nav-item ge-touch-target"
                  onClick={() => window.dispatchEvent(new Event("toggle-ai-chat"))}
                  aria-label="Toggle GrowthEngine AI"
                >
                  <span
                    style={{
                      width: "30px",
                      height: "30px",
                      borderRadius: "50%",
                      background: "var(--ai-accent)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "0.85rem",
                      boxShadow: "0 2px 8px rgba(124, 58, 237, 0.4)",
                      color: "#fff",
                    }}
                  >
                    ✨
                  </span>
                  <span style={{ fontSize: "11px", fontWeight: 600, color: "var(--ai-accent)" }}>
                    {tab.label}
                  </span>
                </button>
              );
            }
            if (tab.action === "more") {
              const moreActive = showMore;
              return (
                <button
                  key="more"
                  className={`ge-mobile-nav-item ge-touch-target ${moreActive ? "active" : ""}`}
                  onClick={() => setShowMore(!showMore)}
                  aria-label="Open More Menu"
                >
                  <span style={{ fontSize: "1.2rem", lineHeight: 1 }}>{tab.icon}</span>
                  <span style={{ fontSize: "11px" }}>{tab.label}</span>
                </button>
              );
            }

            const active = isActive(tab.match!);
            return (
              <Link
                key={tab.href}
                href={tab.href!}
                className={`ge-mobile-nav-item ge-touch-target ${active ? "active" : ""}`}
                onClick={() => setShowMore(false)}
              >
                <div style={{ position: "relative", display: "flex", flexDirection: "column", alignItems: "center" }}>
                  <span style={{ fontSize: "1.2rem", lineHeight: 1 }}>{tab.icon}</span>
                  <span style={{ fontSize: "11px", marginTop: "2px" }}>{tab.label}</span>
                  {active && (
                    <span
                      style={{
                        position: "absolute",
                        bottom: "-4px",
                        width: "16px",
                        height: "2px",
                        borderRadius: "2px",
                        backgroundColor: "var(--primary)",
                      }}
                    />
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* More menu bottom sheet / full-screen drawer */}
      {showMore && (
        <>
          <div
            className="ge-bottom-sheet-overlay"
            onClick={() => setShowMore(false)}
            aria-hidden="true"
          />
          <div
            className="ge-bottom-sheet"
            style={{
              maxHeight: "90vh",
              display: "flex",
              flexDirection: "column",
            }}
          >
            {/* Grab handle for swipe down affordance */}
            <div
              className="ge-bottom-sheet-handle"
              onClick={() => setShowMore(false)}
              title="Close menu"
            />

            {/* Header with quick close */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "8px 20px 12px 20px",
                borderBottom: "1px solid var(--border-subtle)",
              }}
            >
              <div>
                <h3 style={{ margin: 0, fontSize: "1rem", fontWeight: 700, color: "var(--text-primary)" }}>
                  All Features
                </h3>
                <p style={{ margin: "2px 0 0 0", fontSize: "0.75rem", color: "var(--text-muted)" }}>
                  Quickly switch workspace areas
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowMore(false)}
                style={{
                  background: "transparent",
                  border: "none",
                  fontSize: "1.25rem",
                  color: "var(--text-muted)",
                  cursor: "pointer",
                  padding: "6px",
                }}
              >
                ✕
              </button>
            </div>

            <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px 32px" }}>
              {/* Search Shortcut Button */}
              <button
                type="button"
                onClick={() => {
                  setShowMore(false);
                  window.dispatchEvent(new Event("open-global-search"));
                }}
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "14px 16px",
                  marginBottom: "16px",
                  borderRadius: "var(--radius-md)",
                  border: "1px solid var(--border-subtle)",
                  background: "var(--bg-secondary)",
                  color: "var(--text-primary)",
                  fontSize: "var(--font-sm)",
                  fontWeight: 500,
                  cursor: "pointer",
                  minHeight: "50px",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <span style={{ fontSize: "1.25rem" }}>🔍</span>
                  <span>Search customers, invoices, products...</span>
                </div>
                <span
                  style={{
                    fontSize: "var(--font-xs)",
                    padding: "3px 8px",
                    borderRadius: "4px",
                    background: "var(--bg-primary)",
                    border: "1px solid var(--border-subtle)",
                    color: "var(--text-muted)",
                    fontWeight: 600,
                  }}
                >
                  ⌘K
                </span>
              </button>

              {/* Grid / List of features */}
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                {moreItems.map((item) => {
                  const isCurrent = pathname.startsWith(item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setShowMore(false)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "14px",
                        padding: "12px 14px",
                        borderRadius: "var(--radius-md)",
                        textDecoration: "none",
                        color: "var(--text-primary)",
                        minHeight: "52px",
                        background: isCurrent ? "var(--primary-soft)" : "transparent",
                        border: isCurrent ? "1px solid var(--primary)" : "1px solid transparent",
                        transition: "background-color 0.15s ease",
                      }}
                    >
                      <span
                        style={{
                          fontSize: "1.4rem",
                          width: "36px",
                          height: "36px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          background: "var(--bg-card)",
                          border: "1px solid var(--border-subtle)",
                          borderRadius: "var(--radius-sm)",
                          flexShrink: 0,
                        }}
                      >
                        {item.icon}
                      </span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: "0.9375rem", fontWeight: 600, color: "var(--text-primary)" }}>
                          {item.label}
                        </div>
                        {item.desc && (
                          <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "2px" }}>
                            {item.desc}
                          </div>
                        )}
                      </div>
                      <span style={{ color: "var(--text-muted)", fontSize: "0.875rem" }}>→</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}

