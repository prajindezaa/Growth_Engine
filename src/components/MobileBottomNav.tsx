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
      <div className="ge-mobile-nav-wrapper">
        {/* Curved Floating Bar with Smooth Center Notch */}
        <div className="ge-mobile-nav-bar">
          {/* SVG Background Path with smooth organic scoop/cutout */}
          <div className="ge-mobile-nav-bg">
            <svg
              viewBox="0 0 400 68"
              preserveAspectRatio="none"
              className="ge-mobile-nav-svg"
            >
              <defs>
                <filter id="ge-nav-shadow" x="-8%" y="-15%" width="116%" height="135%">
                  <feDropShadow dx="0" dy="8" stdDeviation="12" floodColor="rgba(0, 0, 0, 0.18)" />
                </filter>
              </defs>
              {/*
                Smooth continuous shape:
                Top left rounded corner -> flat top -> smooth curve down to cradle center button (radius ~32px) -> curve back up -> flat top -> top right rounded corner -> flat bottom
              */}
              <path
                d="M 28 8 
                   L 142 8 
                   C 160 8 168 18 174 28 
                   C 181 40 188 46 200 46 
                   C 212 46 219 40 226 28 
                   C 232 18 240 8 258 8 
                   L 372 8 
                   A 20 20 0 0 1 392 28 
                   L 392 48 
                   A 20 20 0 0 1 372 68 
                   L 28 68 
                   A 20 20 0 0 1 8 48 
                   L 8 28 
                   A 20 20 0 0 1 28 8 
                   Z"
                className="ge-mobile-nav-path"
              />
            </svg>
          </div>

          {/* Nav Items Container */}
          <nav className="ge-mobile-nav-content" aria-label="Mobile Navigation">
            {/* Slot 1: Dashboard */}
            {(() => {
              const active = isActive(base);
              return (
                <Link
                  href={base}
                  className={`ge-nav-tab ${active ? "active" : ""}`}
                  onClick={() => setShowMore(false)}
                  aria-label="Dashboard"
                >
                  <div className="ge-nav-icon-wrap">
                    {/* Minimalist List / Dashboard Icon matching slot 1 in image */}
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="3" width="18" height="18" rx="4" />
                      <line x1="7" y1="8" x2="13" y2="8" />
                      <line x1="7" y1="12" x2="17" y2="12" />
                      <line x1="7" y1="16" x2="13" y2="16" />
                    </svg>
                    {active && <span className="ge-nav-active-dot" />}
                  </div>
                  <span className="ge-nav-label">Dashboard</span>
                </Link>
              );
            })()}

            {/* Slot 2: Sales or POS */}
            {(() => {
              const targetHref = isCashier && canAccessPOS(role) ? `${base}/pos` : `${base}/sales`;
              const targetLabel = isCashier && canAccessPOS(role) ? "POS" : "Sales";
              const active = isActive(targetHref);
              return (
                <Link
                  href={targetHref}
                  className={`ge-nav-tab ${active ? "active" : ""}`}
                  onClick={() => setShowMore(false)}
                  aria-label={targetLabel}
                >
                  <div className="ge-nav-icon-wrap">
                    {/* Sprout / Leaf icon matching slot 2 in user reference */}
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M7 20h10" />
                      <path d="M10 20c0-4 1.5-7.5 4-10" />
                      <path d="M14 10c1-3.5 4.5-5 7-5 0 2.5-1.5 6-5 7" />
                      <path d="M11 15c-2.5-1-4-3.5-4-6 2.5 0 5 1.5 6 4" />
                    </svg>
                    {active && <span className="ge-nav-active-dot" />}
                  </div>
                  <span className="ge-nav-label">{targetLabel}</span>
                </Link>
              );
            })()}

            {/* Center Slot: Elevated Floating Circular AI Action Button */}
            <div className="ge-nav-center-slot">
              <button
                type="button"
                className="ge-nav-center-btn"
                onClick={() => window.dispatchEvent(new Event("toggle-ai-chat"))}
                aria-label="GrowthEngine AI Assistant"
              >
                <div className="ge-nav-center-icon">
                  {/* Triple leaf / Lotus emblem matching image center */}
                  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 3c-2 4-2 7 0 10 2-3 2-6 0-10z" />
                    <path d="M12 13c-4-1-6.5.5-8 3 2.5 2 6 1.5 8-3z" />
                    <path d="M12 13c4-1 6.5.5 8 3-2.5 2-6 1.5-8-3z" />
                    <circle cx="12" cy="18" r="1.5" fill="currentColor" />
                  </svg>
                </div>
              </button>
            </div>

            {/* Slot 4: Customers / Bookmark */}
            {(() => {
              const active = isActive(`${base}/customers`);
              return (
                <Link
                  href={`${base}/customers`}
                  className={`ge-nav-tab ${active ? "active" : ""}`}
                  onClick={() => setShowMore(false)}
                  aria-label="Customers"
                >
                  <div className="ge-nav-icon-wrap">
                    {/* Bookmark ribbon icon matching slot 4 in image */}
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
                    </svg>
                    {active && <span className="ge-nav-active-dot" />}
                  </div>
                  <span className="ge-nav-label">Customers</span>
                </Link>
              );
            })()}

            {/* Slot 5: More / Tools (Circle wrench icon matching slot 5 in image) */}
            <button
              type="button"
              className={`ge-nav-tab ${showMore ? "active" : ""}`}
              onClick={() => setShowMore(!showMore)}
              aria-label="All features and settings"
            >
              <div className="ge-nav-icon-wrap">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="9" />
                  <path d="M14.7 9.3a2.5 2.5 0 0 0-3.5 0l-3.9 3.9a1 1 0 0 0 0 1.4l1.4 1.4a1 1 0 0 0 1.4 0l3.9-3.9a2.5 2.5 0 0 0 0-3.5" />
                  <line x1="9" y1="15" x2="11" y2="17" />
                </svg>
                {showMore && <span className="ge-nav-active-dot" />}
              </div>
              <span className="ge-nav-label">More</span>
            </button>
          </nav>
        </div>
      </div>

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

