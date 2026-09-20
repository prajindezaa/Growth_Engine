"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import UserMenu from "./UserMenu";

interface GroupedSidebarProps {
  businessId: string;
  businessName: string;
  businessLogoUrl: string | null;
  role: string;
  userEmail: string;
  userName?: string;
  multipleBusinesses?: boolean;
  canAccessSales: boolean;
  canAccessPurchases: boolean;
  canAccessInventory: boolean;
  canAccessCustomers: boolean;
  canAccessSuppliers: boolean;
  canAccessProducts: boolean;
  canAccessReports: boolean;
  canAccessPOS: boolean;
  canManageAutomation: boolean;
  canManageTeam: boolean;
  canEditSettings: boolean;
}

interface SubItemDef {
  href: string;
  label: string;
  badge?: number | string;
  badgeColor?: string;
}

interface NavSectionDef {
  id: string;
  title: string;
  href?: string;
  action?: string;
  icon: React.ReactNode;
  badge?: number | string;
  badgeColor?: string;
  subItems?: SubItemDef[];
  isAction?: boolean;
  isFlagship?: boolean;
}

export default function GroupedSidebar({
  businessId,
  businessName,
  businessLogoUrl,
  role,
  userEmail,
  userName,
  multipleBusinesses = false,
  canAccessSales,
  canAccessPurchases,
  canAccessInventory,
  canAccessCustomers,
  canAccessSuppliers,
  canAccessProducts,
  canAccessReports,
  canAccessPOS,
  canManageAutomation,
  canManageTeam,
  canEditSettings,
}: GroupedSidebarProps) {
  const pathname = usePathname();
  const base = `/app/${businessId}`;

  // Collapsible parent sections state
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    product: true,
    sales: true,
    money: false,
    customers: false,
  });

  const [pendingApprovals, setPendingApprovals] = useState<number>(0);
  const [unreadNotifications, setUnreadNotifications] = useState<number>(0);

  // Load badge counts
  useEffect(() => {
    async function loadCounts() {
      try {
        const supabase = createClient();
        const { count: approvalCount } = await supabase
          .from("approval_requests")
          .select("*", { count: "exact", head: true })
          .eq("business_id", businessId)
          .eq("status", "pending");

        const { count: notifCount } = await supabase
          .from("notifications")
          .select("*", { count: "exact", head: true })
          .eq("business_id", businessId)
          .eq("is_read", false);

        setPendingApprovals(approvalCount || 0);
        setUnreadNotifications(notifCount || 0);
      } catch (e) {
        console.error("Failed to load badge counts", e);
      }
    }
    loadCounts();
  }, [businessId]);

  const toggleSection = (id: string) => {
    setOpenSections((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const initials = businessName
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  // Navigation schema modeled after Core 2.0 reference:
  // Clean, modern, light-aesthetic pill tree with connected branch lines
  const sections: NavSectionDef[] = [
    // 1. Dashboard (Single Pill)
    {
      id: "dashboard",
      title: "Dashboard",
      href: base,
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="7" height="7" rx="2" />
          <rect x="14" y="3" width="7" height="7" rx="2" />
          <rect x="14" y="14" width="7" height="7" rx="2" />
          <rect x="3" y="14" width="7" height="7" rx="2" />
        </svg>
      ),
    },

    // 2. Product & Inventory (Branching Tree with sub-items)
    ...(canAccessProducts || canAccessInventory
      ? [
          {
            id: "product",
            title: "Product",
            icon: (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="7" width="20" height="14" rx="2" />
                <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
              </svg>
            ),
            subItems: [
              ...(canAccessProducts
                ? [{ href: `${base}/products`, label: "Overview" }]
                : []),
              ...(canAccessInventory
                ? [
                    { href: `${base}/inventory`, label: "Stock Items" },
                    { href: `${base}/inventory?tab=batches`, label: "Batches", badge: 3, badgeColor: "#FFB020" },
                    { href: `${base}/inventory?tab=alerts`, label: "Low Stock", badge: 8, badgeColor: "#00BA88" },
                  ]
                : []),
            ],
          },
        ]
      : []),

    // 3. Customers & CRM
    ...(canAccessCustomers
      ? [
          {
            id: "customers",
            title: "Customers",
            icon: (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
            ),
            subItems: [
              { href: `${base}/customers`, label: "All Customers" },
              { href: `${base}/customers?filter=active`, label: "Active Buyers" },
            ],
          },
        ]
      : []),

    // 4. Shop / POS & Orders
    ...(canAccessSales || canAccessPOS
      ? [
          {
            id: "sales",
            title: "Sales & Shop",
            icon: (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
                <line x1="3" y1="6" x2="21" y2="6" />
                <path d="M16 10a4 4 0 0 1-8 0" />
              </svg>
            ),
            subItems: [
              ...(canAccessPOS
                ? [{ href: `${base}/pos`, label: "POS Counter", badge: "Live", badgeColor: "#4F46E5" }]
                : []),
              ...(canAccessSales
                ? [
                    { href: `${base}/sales/quotations`, label: "Quotations" },
                    { href: `${base}/sales/orders`, label: "Orders" },
                    { href: `${base}/sales`, label: "Invoices" },
                  ]
                : []),
            ],
          },
        ]
      : []),

    // 5. Purchases & Suppliers
    ...(canAccessPurchases || canAccessSuppliers
      ? [
          {
            id: "supply",
            title: "Supply Chain",
            icon: (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
                <circle cx="10" cy="21" r="1" />
                <circle cx="20" cy="21" r="1" />
              </svg>
            ),
            subItems: [
              ...(canAccessPurchases ? [{ href: `${base}/purchases`, label: "Purchases" }] : []),
              ...(canAccessSuppliers ? [{ href: `${base}/suppliers`, label: "Suppliers" }] : []),
            ],
          },
        ]
      : []),

    // 6. Income & Finance (Reports & Payments)
    ...(canAccessReports || canAccessSales
      ? [
          {
            id: "money",
            title: "Income & GST",
            icon: (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="4" width="20" height="16" rx="2" />
                <line x1="2" y1="10" x2="22" y2="10" />
                <path d="M7 15h.01" />
                <path d="M11 15h2" />
              </svg>
            ),
            subItems: [
              { href: `${base}/sales?tab=payments`, label: "Payments Recorded" },
              ...(canAccessReports
                ? [
                    { href: `${base}/reports?tab=outstanding`, label: "Receivables" },
                    { href: `${base}/reports`, label: "P&L Reports" },
                  ]
                : []),
            ],
          },
        ]
      : []),

    // 7. Approvals & Operations
    ...(canManageAutomation
      ? [
          {
            id: "approvals",
            title: "Approvals",
            href: `${base}/approvals`,
            icon: (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
              </svg>
            ),
            badge: pendingApprovals > 0 ? pendingApprovals : undefined,
            badgeColor: "#F59E0B",
          },
        ]
      : []),

    // 8. GrowthEngine AI Employee (Flagship trigger)
    {
      id: "ai",
      title: "AI Employee",
      action: "ai",
      isAction: true,
      isFlagship: true,
      badge: "PRO",
      badgeColor: "#8B5CF6",
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
        </svg>
      ),
    },

    // 9. Global Search
    {
      id: "search",
      title: "Search (⌘K)",
      action: "search",
      isAction: true,
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
      ),
    },
  ];

  const isExactActive = (href: string) => {
    if (href === base) return pathname === base;
    return pathname === href;
  };

  const isSectionActive = (sec: NavSectionDef) => {
    if (sec.href) return isExactActive(sec.href);
    if (sec.subItems) {
      return sec.subItems.some((sub) => pathname.startsWith(sub.href.split("?")[0]));
    }
    return false;
  };

  return (
    <aside
      className="ge-desktop-sidebar"
      style={{
        width: "260px",
        minWidth: "260px",
        backgroundColor: "var(--bg-primary, #F8FAFC)",
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        position: "sticky",
        top: 0,
        zIndex: 50,
        borderRight: "1px solid var(--border-subtle, #E2E8F0)",
        userSelect: "none",
      }}
    >
      {/* Top Header: Circular Emblem Brand & Business Switcher */}
      <div
        style={{
          padding: "24px 20px 20px 24px",
          display: "flex",
          alignItems: "center",
          gap: "14px",
        }}
      >
        {businessLogoUrl ? (
          <Image
            src={businessLogoUrl}
            alt={businessName}
            width={40}
            height={40}
            style={{
              borderRadius: "12px",
              objectFit: "cover",
              border: "1px solid var(--border-subtle)",
              flexShrink: 0,
            }}
          />
        ) : (
          /* Geometric circular quad-badge matching user reference */
          <div
            style={{
              width: "42px",
              height: "42px",
              borderRadius: "14px",
              background: "#1E293B",
              color: "#FFFFFF",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 800,
              fontSize: "15px",
              boxShadow: "0 4px 12px rgba(0, 0, 0, 0.12)",
              flexShrink: 0,
              position: "relative",
              overflow: "hidden",
            }}
          >
            {/* Geometric quadrants pattern */}
            <div
              style={{
                position: "absolute",
                inset: 0,
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gridTemplateRows: "1fr 1fr",
                gap: "2px",
                padding: "7px",
                opacity: 0.9,
              }}
            >
              <div style={{ background: "#475569", borderRadius: "3px" }} />
              <div style={{ background: "#64748B", borderRadius: "3px" }} />
              <div style={{ background: "#334155", borderRadius: "3px" }} />
              <div style={{ background: "#94A3B8", borderRadius: "3px" }} />
            </div>
            <span style={{ position: "relative", zIndex: 2, textShadow: "0 1px 2px rgba(0,0,0,0.4)" }}>
              {initials}
            </span>
          </div>
        )}

        <div style={{ minWidth: 0, flex: 1 }}>
          {multipleBusinesses ? (
            <Link
              href="/app"
              title="Switch business"
              style={{
                fontSize: "15px",
                fontWeight: 700,
                color: "var(--text-primary, #0F172A)",
                textDecoration: "none",
                display: "flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {businessName}
              </span>
              <span style={{ fontSize: "10px", color: "var(--text-muted)" }}>▼</span>
            </Link>
          ) : (
            <div
              style={{
                fontSize: "15px",
                fontWeight: 700,
                color: "var(--text-primary, #0F172A)",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {businessName}
            </div>
          )}
          <div
            style={{
              fontSize: "11px",
              color: "var(--text-muted, #64748B)",
              textTransform: "capitalize",
              fontWeight: 600,
              marginTop: "2px",
            }}
          >
            {role} workspace
          </div>
        </div>
      </div>

      {/* Primary Action Button (+ Create Invoice) matching Daftra reference */}
      <div style={{ padding: "0 16px 14px 16px" }}>
        <Link
          href={`${base}/sales/invoices/new`}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "8px",
            width: "100%",
            padding: "11px 16px",
            borderRadius: "14px",
            background: "linear-gradient(135deg, #6B0F24 0%, #881337 100%)",
            color: "#FFFFFF",
            fontSize: "13.5px",
            fontWeight: 700,
            textDecoration: "none",
            boxShadow: "0 4px 14px rgba(107, 15, 36, 0.35)",
            transition: "all 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = "translateY(-1px)";
            e.currentTarget.style.boxShadow = "0 6px 18px rgba(107, 15, 36, 0.45)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = "translateY(0)";
            e.currentTarget.style.boxShadow = "0 4px 14px rgba(107, 15, 36, 0.35)";
          }}
        >
          <span style={{ fontSize: "16px", fontWeight: 800 }}>+</span>
          <span>Create Invoice</span>
        </Link>
      </div>

      {/* Main Navigation Tree Scroll Area */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "8px 16px 16px 16px",
          display: "flex",
          flexDirection: "column",
          gap: "6px",
        }}
      >
        {sections.map((sec) => {
          const active = isSectionActive(sec);
          const hasSubItems = Boolean(sec.subItems && sec.subItems.length > 0);
          const isOpen = openSections[sec.id] ?? false;

          // Single Action Button (AI Employee / Search)
          if (sec.isAction) {
            return (
              <button
                key={sec.id}
                type="button"
                onClick={() => {
                  if (sec.action === "ai") window.dispatchEvent(new Event("toggle-ai-chat"));
                  if (sec.action === "search") window.dispatchEvent(new Event("open-global-search"));
                }}
                className="ge-sidebar-nav-btn"
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  width: "100%",
                  padding: "10px 14px",
                  borderRadius: "12px",
                  background: sec.isFlagship
                    ? "linear-gradient(135deg, rgba(79, 70, 229, 0.08), rgba(124, 58, 237, 0.14))"
                    : "transparent",
                  border: sec.isFlagship ? "1px solid rgba(124, 58, 237, 0.25)" : "none",
                  color: sec.isFlagship ? "var(--primary, #4F46E5)" : "var(--text-secondary, #475569)",
                  cursor: "pointer",
                  fontSize: "14px",
                  fontWeight: 600,
                  transition: "all 0.18s ease",
                  textAlign: "left",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <span style={{ opacity: sec.isFlagship ? 1 : 0.85, display: "flex" }}>{sec.icon}</span>
                  <span>{sec.title}</span>
                </div>
                {sec.badge && (
                  <span
                    style={{
                      fontSize: "10px",
                      fontWeight: 700,
                      padding: "2px 6px",
                      borderRadius: "6px",
                      background: sec.badgeColor,
                      color: "#FFFFFF",
                    }}
                  >
                    {sec.badge}
                  </span>
                )}
              </button>
            );
          }

          // Direct Link Item (like Dashboard or Approvals)
          if (!hasSubItems && sec.href) {
            const isCurrent = isExactActive(sec.href);
            return (
              <Link
                key={sec.id}
                href={sec.href}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "10px 14px",
                  borderRadius: "12px",
                  textDecoration: "none",
                  fontSize: "14px",
                  fontWeight: isCurrent ? 700 : 500,
                  color: isCurrent ? "var(--text-primary, #0F172A)" : "var(--text-secondary, #475569)",
                  background: isCurrent ? "#FFFFFF" : "transparent",
                  boxShadow: isCurrent ? "0 2px 8px rgba(0, 0, 0, 0.06)" : "none",
                  transition: "all 0.15s ease",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <span style={{ opacity: isCurrent ? 1 : 0.75, display: "flex" }}>{sec.icon}</span>
                  <span>{sec.title}</span>
                </div>
                {sec.badge && (
                  <span
                    style={{
                      fontSize: "11px",
                      fontWeight: 700,
                      padding: "2px 7px",
                      borderRadius: "10px",
                      background: sec.badgeColor || "#00BA88",
                      color: "#FFFFFF",
                    }}
                  >
                    {sec.badge}
                  </span>
                )}
              </Link>
            );
          }

          // Expandable Section with Connected Tree Lines (Core 2.0 reference design)
          return (
            <div key={sec.id} style={{ display: "flex", flexDirection: "column" }}>
              {/* Parent Accordion Header */}
              <button
                type="button"
                onClick={() => toggleSection(sec.id)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  width: "100%",
                  padding: "10px 14px",
                  borderRadius: "12px",
                  background: "transparent",
                  border: "none",
                  color: active ? "var(--text-primary, #0F172A)" : "var(--text-secondary, #475569)",
                  cursor: "pointer",
                  fontSize: "14px",
                  fontWeight: active ? 700 : 600,
                  textAlign: "left",
                  transition: "all 0.15s ease",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <span style={{ opacity: active ? 1 : 0.75, display: "flex" }}>{sec.icon}</span>
                  <span>{sec.title}</span>
                </div>
                {/* Chevron icon */}
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{
                    transform: isOpen ? "rotate(0deg)" : "rotate(180deg)",
                    transition: "transform 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
                    opacity: 0.6,
                  }}
                >
                  <polyline points="18 15 12 9 6 15" />
                </svg>
              </button>

              {/* Connected Sub-Items Tree */}
              {isOpen && sec.subItems && (
                <div
                  style={{
                    position: "relative",
                    marginLeft: "23px",
                    paddingLeft: "16px",
                    display: "flex",
                    flexDirection: "column",
                    gap: "4px",
                    marginTop: "2px",
                    marginBottom: "6px",
                  }}
                >
                  {/* Subtle vertical connector guide line */}
                  <div
                    style={{
                      position: "absolute",
                      left: 0,
                      top: "4px",
                      bottom: "12px",
                      width: "1.5px",
                      backgroundColor: "var(--border-subtle, #E2E8F0)",
                    }}
                  />

                  {sec.subItems.map((sub, idx) => {
                    const isSubCurrent = pathname.startsWith(sub.href.split("?")[0]);
                    return (
                      <Link
                        key={idx}
                        href={sub.href}
                        style={{
                          position: "relative",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          padding: "8px 14px",
                          borderRadius: "10px",
                          textDecoration: "none",
                          fontSize: "13.5px",
                          fontWeight: isSubCurrent ? 700 : 500,
                          color: isSubCurrent
                            ? "var(--text-primary, #0F172A)"
                            : "var(--text-muted, #64748B)",
                          backgroundColor: isSubCurrent ? "#FFFFFF" : "transparent",
                          boxShadow: isSubCurrent ? "0 2px 8px rgba(0, 0, 0, 0.06)" : "none",
                          transition: "all 0.15s ease",
                        }}
                      >
                        <span>{sub.label}</span>
                        {sub.badge && (
                          <span
                            style={{
                              fontSize: "10.5px",
                              fontWeight: 700,
                              minWidth: "18px",
                              height: "18px",
                              padding: "0 6px",
                              borderRadius: "9px",
                              display: "inline-flex",
                              alignItems: "center",
                              justifyContent: "center",
                              backgroundColor: sub.badgeColor || "#FFB020",
                              color: "#FFFFFF",
                            }}
                          >
                            {sub.badge}
                          </span>
                        )}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}

        {/* Team & Settings Quick Links */}
        {(canManageTeam || canEditSettings) && (
          <div
            style={{
              marginTop: "auto",
              paddingTop: "12px",
              borderTop: "1px solid var(--border-subtle, #E2E8F0)",
              display: "flex",
              flexDirection: "column",
              gap: "2px",
            }}
          >
            {canManageTeam && (
              <Link
                href={`${base}/team`}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  padding: "8px 14px",
                  borderRadius: "10px",
                  textDecoration: "none",
                  fontSize: "13.5px",
                  fontWeight: pathname.startsWith(`${base}/team`) ? 700 : 500,
                  color: pathname.startsWith(`${base}/team`) ? "var(--primary)" : "var(--text-secondary)",
                }}
              >
                <span style={{ fontSize: "16px" }}>👥</span>
                <span>Team & Staff</span>
              </Link>
            )}

            {canEditSettings && (
              <Link
                href={`${base}/settings`}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  padding: "8px 14px",
                  borderRadius: "10px",
                  textDecoration: "none",
                  fontSize: "13.5px",
                  fontWeight: pathname.startsWith(`${base}/settings`) ? 700 : 500,
                  color: pathname.startsWith(`${base}/settings`) ? "var(--primary)" : "var(--text-secondary)",
                }}
              >
                <span style={{ fontSize: "16px" }}>⚙️</span>
                <span>Settings</span>
              </Link>
            )}
          </div>
        )}
      </div>

      {/* Pinned Bottom Area: Upgrade to Pro Banner + User Menu */}
      <div
        style={{
          padding: "14px 16px 12px 16px",
          borderTop: "1px solid var(--border-subtle, #E2E8F0)",
          backgroundColor: "var(--bg-card, #FFFFFF)",
          display: "flex",
          flexDirection: "column",
          gap: "12px",
          flexShrink: 0,
        }}
      >
        {/* Full-width, prominent Pro Access Card directly inside the User Box area */}
        <div
          style={{
            width: "100%",
            background: "linear-gradient(135deg, #18181B 0%, #09090B 100%)",
            borderRadius: "14px",
            padding: "14px 16px",
            color: "#FFFFFF",
            boxShadow: "0 6px 20px rgba(0, 0, 0, 0.22)",
            border: "1px solid rgba(255, 255, 255, 0.1)",
            position: "relative",
            overflow: "hidden",
          }}
        >
          {/* Subtle Burgundy Glow */}
          <div
            style={{
              position: "absolute",
              top: "-15px",
              right: "-15px",
              width: "60px",
              height: "60px",
              borderRadius: "50%",
              background: "radial-gradient(circle, rgba(136, 19, 55, 0.45) 0%, transparent 70%)",
              pointerEvents: "none",
            }}
          />

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "6px" }}>
            <span style={{ fontSize: "13px", fontWeight: 700, letterSpacing: "-0.01em" }}>
              Become a Pro access
            </span>
            <span style={{ fontSize: "10px", fontWeight: 700, background: "rgba(255,255,255,0.15)", padding: "1px 6px", borderRadius: "6px" }}>
              PRO
            </span>
          </div>

          <p style={{ fontSize: "11px", color: "#A1A1AA", lineHeight: 1.4, margin: "0 0 10px 0" }}>
            Automated GST filings, AI Copilot, and unlimited store reports.
          </p>

          <Link
            href={`${base}/subscription`}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "6px",
              width: "100%",
              padding: "7px 12px",
              borderRadius: "8px",
              background: "#FFFFFF",
              color: "#09090B",
              fontSize: "12px",
              fontWeight: 700,
              textDecoration: "none",
              transition: "all 0.15s ease",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "#F4F4F5")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "#FFFFFF")}
          >
            <span>✦</span>
            <span>Upgrade Pro</span>
          </Link>
        </div>

        {/* User Profile Trigger */}
        <UserMenu
          userEmail={userEmail}
          userName={userName}
          role={role}
          collapsed={false}
        />
      </div>
    </aside>
  );
}
