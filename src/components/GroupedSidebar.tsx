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

interface NavItemDef {
  href?: string;
  action?: string;
  label: string;
  icon: string;
  badgeCount?: number;
  badgeVariant?: "warning" | "danger" | "primary" | "neutral";
  isFlagship?: boolean;
  exact?: boolean;
}

interface NavGroupDef {
  id: string;
  label: string;
  items: NavItemDef[];
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

  // Collapsed sidebar state with persistence
  const [collapsed, setCollapsed] = useState(false);
  const [pendingApprovals, setPendingApprovals] = useState<number>(0);
  const [unreadNotifications, setUnreadNotifications] = useState<number>(0);

  useEffect(() => {
    const saved = localStorage.getItem("ge-sidebar-collapsed");
    if (saved !== null) {
      setCollapsed(saved === "true");
    }
  }, []);

  const toggleCollapse = () => {
    const next = !collapsed;
    setCollapsed(next);
    localStorage.setItem("ge-sidebar-collapsed", String(next));
  };

  // Load live counts for badges
  useEffect(() => {
    async function loadCounts() {
      try {
        const supabase = createClient();
        // Pending approvals count
        const { count: approvalCount } = await supabase
          .from("approval_requests")
          .select("*", { count: "exact", head: true })
          .eq("business_id", businessId)
          .eq("status", "pending");

        // Unread notifications count
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

  const initials = businessName
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  // Navigation Groups Definition (Role-aware)
  const navGroups: NavGroupDef[] = [
    {
      id: "workspace",
      label: "Workspace",
      items: [
        { href: base, label: "Dashboard", icon: "📊", exact: true },
        { action: "ai", label: "AI Employee", icon: "✨", isFlagship: true },
        { action: "search", label: "Global Search", icon: "🔍" },
      ],
    },
    {
      id: "sales",
      label: "Sales",
      items: [
        ...(canAccessSales
          ? [
              { href: `${base}/sales/quotations`, label: "Quotations", icon: "📝" },
              { href: `${base}/sales/orders`, label: "Orders", icon: "📦" },
              { href: `${base}/sales`, label: "Invoices", icon: "🧾" },
            ]
          : []),
        ...(canAccessPOS ? [{ href: `${base}/pos`, label: "POS Counter", icon: "🛍️" }] : []),
        ...(canAccessCustomers
          ? [{ href: `${base}/customers`, label: "Customers", icon: "👤" }]
          : []),
      ],
    },
    {
      id: "supply",
      label: "Supply",
      items: [
        ...(canAccessPurchases
          ? [{ href: `${base}/purchases`, label: "Purchases", icon: "🛒" }]
          : []),
        ...(canAccessSuppliers
          ? [{ href: `${base}/suppliers`, label: "Suppliers", icon: "🏭" }]
          : []),
        ...(canAccessProducts
          ? [{ href: `${base}/products`, label: "Products", icon: "🏷️" }]
          : []),
        ...(canAccessInventory
          ? [{ href: `${base}/inventory`, label: "Inventory", icon: "📋" }]
          : []),
      ],
    },
    {
      id: "money",
      label: "Money",
      items: [
        ...(canAccessSales
          ? [{ href: `${base}/sales?tab=payments`, label: "Payments", icon: "💳" }]
          : []),
        ...(canAccessReports
          ? [
              { href: `${base}/reports?tab=outstanding`, label: "Outstanding", icon: "⚖️" },
              { href: `${base}/reports`, label: "Reports", icon: "📈" },
            ]
          : []),
      ],
    },
    {
      id: "operations",
      label: "Operations",
      items: [
        ...(canManageAutomation
          ? [
              {
                href: `${base}/approvals`,
                label: "Approvals",
                icon: "⚡",
                badgeCount: pendingApprovals > 0 ? pendingApprovals : undefined,
                badgeVariant: "warning" as const,
              },
            ]
          : []),
        {
          action: "notifications",
          label: "Notifications",
          icon: "🔔",
          badgeCount: unreadNotifications > 0 ? unreadNotifications : undefined,
          badgeVariant: "danger" as const,
        },
      ],
    },
  ].filter((group) => group.items.length > 0);

  const isItemActive = (item: NavItemDef) => {
    if (!item.href) return false;
    if (item.exact || item.href === base) {
      return pathname === item.href;
    }
    return pathname.startsWith(item.href);
  };

  return (
    <aside
      className="ge-desktop-sidebar"
      style={{
        width: collapsed ? "68px" : "250px",
        minWidth: collapsed ? "68px" : "250px",
        borderRight: "1px solid var(--border-subtle)",
        backgroundColor: "var(--bg-primary)",
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        position: "sticky",
        top: 0,
        zIndex: 50,
        transition: "width 0.25s cubic-bezier(0.16, 1, 0.3, 1), min-width 0.25s cubic-bezier(0.16, 1, 0.3, 1)",
      }}
    >
      {/* Top Header: Business Identity & Switcher / Collapse */}
      <div
        style={{
          padding: collapsed ? "12px 0" : "14px var(--space-2)",
          borderBottom: "1px solid var(--border-subtle)",
          display: "flex",
          alignItems: "center",
          justifyContent: collapsed ? "center" : "space-between",
          gap: "8px",
          minHeight: "68px",
        }}
      >
        {!collapsed ? (
          <div style={{ display: "flex", alignItems: "center", gap: "10px", minWidth: 0 }}>
            {businessLogoUrl ? (
              <Image
                src={businessLogoUrl}
                alt={businessName}
                width={34}
                height={34}
                style={{
                  borderRadius: "var(--radius-sm)",
                  objectFit: "cover",
                  border: "1px solid var(--border-subtle)",
                  flexShrink: 0,
                }}
              />
            ) : (
              <div
                style={{
                  width: "34px",
                  height: "34px",
                  borderRadius: "var(--radius-sm)",
                  background: "var(--primary-soft)",
                  color: "var(--primary)",
                  fontWeight: 700,
                  fontSize: "var(--font-xs)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  border: "1px solid rgba(79, 70, 229, 0.3)",
                  flexShrink: 0,
                }}
              >
                {initials}
              </div>
            )}
            <div style={{ minWidth: 0 }}>
              {multipleBusinesses ? (
                <Link
                  href="/app"
                  title="Click to switch business"
                  style={{
                    fontSize: "var(--font-sm)",
                    fontWeight: 700,
                    color: "var(--text-primary)",
                    textDecoration: "none",
                    display: "flex",
                    alignItems: "center",
                    gap: "4px",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
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
                    fontSize: "var(--font-sm)",
                    fontWeight: 700,
                    color: "var(--text-primary)",
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
                  color: "var(--text-muted)",
                  textTransform: "uppercase",
                  fontWeight: 600,
                  letterSpacing: "0.04em",
                }}
              >
                {role}
              </div>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={toggleCollapse}
            title="Expand Sidebar"
            style={{
              background: "transparent",
              border: "none",
              color: "var(--text-primary)",
              cursor: "pointer",
              fontSize: "1.2rem",
              padding: "4px",
            }}
          >
            ▶
          </button>
        )}

        {!collapsed && (
          <button
            type="button"
            onClick={toggleCollapse}
            title="Collapse Sidebar"
            style={{
              background: "transparent",
              border: "1px solid var(--border-subtle)",
              borderRadius: "var(--radius-sm)",
              color: "var(--text-muted)",
              cursor: "pointer",
              fontSize: "12px",
              padding: "4px 8px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            ◀
          </button>
        )}
      </div>

      {/* Main Navigation Scroll Area */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          overflowX: "hidden",
          padding: collapsed ? "var(--space-2) 4px" : "var(--space-2) var(--space-1)",
          display: "flex",
          flexDirection: "column",
          gap: "18px",
        }}
      >
        {navGroups.map((group) => (
          <div key={group.id}>
            {!collapsed && (
              <div
                style={{
                  fontSize: "11px",
                  fontWeight: 700,
                  color: "var(--text-muted)",
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  padding: "0 10px 6px 10px",
                }}
              >
                {group.label}
              </div>
            )}

            <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
              {group.items.map((item, idx) => {
                const active = isItemActive(item);

                // Action buttons: AI Chat & Search & Notifications
                if (item.action) {
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        if (item.action === "ai") window.dispatchEvent(new Event("toggle-ai-chat"));
                        if (item.action === "search") window.dispatchEvent(new Event("open-global-search"));
                        if (item.action === "notifications") {
                          // Trigger notification dropdown/panel
                          window.dispatchEvent(new Event("open-notifications-panel"));
                        }
                      }}
                      title={collapsed ? item.label : undefined}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: collapsed ? "center" : "flex-start",
                        gap: "10px",
                        padding: collapsed ? "10px 0" : "8px 10px",
                        borderRadius: "var(--radius-sm)",
                        border: "none",
                        backgroundColor: item.isFlagship
                          ? "var(--ai-soft)"
                          : "transparent",
                        color: item.isFlagship ? "var(--primary)" : "var(--text-secondary)",
                        cursor: "pointer",
                        fontSize: "var(--font-sm)",
                        fontWeight: item.isFlagship ? 600 : 500,
                        transition: "all 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
                        width: "100%",
                        textAlign: "left",
                        position: "relative",
                      }}
                    >
                      <span
                        style={{
                          fontSize: "1.15rem",
                          display: "inline-flex",
                          background: item.isFlagship ? "var(--ai-accent)" : undefined,
                          WebkitBackgroundClip: item.isFlagship ? "text" : undefined,
                          WebkitTextFillColor: item.isFlagship ? "transparent" : undefined,
                        }}
                      >
                        {item.icon}
                      </span>
                      {!collapsed && <span style={{ flex: 1 }}>{item.label}</span>}
                      {!collapsed && item.action === "search" && (
                        <kbd
                          style={{
                            fontSize: "10px",
                            padding: "1px 5px",
                            background: "var(--bg-primary)",
                            border: "1px solid var(--border-subtle)",
                            borderRadius: "4px",
                            color: "var(--text-muted)",
                            fontWeight: 600,
                          }}
                        >
                          ⌘K
                        </kbd>
                      )}
                      {item.badgeCount !== undefined && item.badgeCount > 0 && (
                        <span
                          className={`ge-badge ge-badge-${item.badgeVariant || "danger"}`}
                          style={{
                            fontSize: "10px",
                            padding: collapsed ? "1px 4px" : "1px 6px",
                            position: collapsed ? "absolute" : "static",
                            top: collapsed ? "2px" : undefined,
                            right: collapsed ? "2px" : undefined,
                          }}
                        >
                          {item.badgeCount > 99 ? "99+" : item.badgeCount}
                        </span>
                      )}
                    </button>
                  );
                }

                // Standard link item with sliding pill animation
                return (
                  <Link
                    key={item.href!}
                    href={item.href!}
                    title={collapsed ? item.label : undefined}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: collapsed ? "center" : "flex-start",
                      gap: "10px",
                      padding: collapsed ? "10px 0" : "8px 10px",
                      borderRadius: "var(--radius-sm)",
                      textDecoration: "none",
                      fontSize: "var(--font-sm)",
                      fontWeight: active ? 600 : 500,
                      color: active ? "var(--primary)" : "var(--text-secondary)",
                      backgroundColor: active ? "var(--primary-soft)" : "transparent",
                      borderLeft: active ? "3px solid var(--primary)" : "3px solid transparent",
                      transition: "all 0.25s cubic-bezier(0.16, 1, 0.3, 1)",
                      position: "relative",
                    }}
                  >
                    <span style={{ fontSize: "1.1rem", display: "inline-flex" }}>{item.icon}</span>
                    {!collapsed && <span style={{ flex: 1 }}>{item.label}</span>}
                    {item.badgeCount !== undefined && item.badgeCount > 0 && (
                      <span
                        className={`ge-badge ge-badge-${item.badgeVariant || "warning"}`}
                        style={{
                          fontSize: "10px",
                          padding: collapsed ? "1px 4px" : "1px 6px",
                          position: collapsed ? "absolute" : "static",
                          top: collapsed ? "2px" : undefined,
                          right: collapsed ? "2px" : undefined,
                        }}
                      >
                        {item.badgeCount}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}

        {/* Pinned Management Links: Settings, Team, Subscription */}
        {(canEditSettings || canManageTeam) && (
          <div>
            {!collapsed && (
              <div
                style={{
                  fontSize: "11px",
                  fontWeight: 700,
                  color: "var(--text-muted)",
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  padding: "0 10px 6px 10px",
                }}
              >
                Management
              </div>
            )}
            <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
              {canManageTeam && (
                <Link
                  href={`${base}/team`}
                  title={collapsed ? "Team" : undefined}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: collapsed ? "center" : "flex-start",
                    gap: "10px",
                    padding: collapsed ? "10px 0" : "8px 10px",
                    borderRadius: "var(--radius-sm)",
                    textDecoration: "none",
                    fontSize: "var(--font-sm)",
                    fontWeight: pathname.startsWith(`${base}/team`) ? 600 : 500,
                    color: pathname.startsWith(`${base}/team`)
                      ? "var(--primary)"
                      : "var(--text-secondary)",
                    backgroundColor: pathname.startsWith(`${base}/team`)
                      ? "var(--primary-soft)"
                      : "transparent",
                    borderLeft: pathname.startsWith(`${base}/team`)
                      ? "3px solid var(--primary)"
                      : "3px solid transparent",
                    transition: "all 0.25s ease",
                  }}
                >
                  <span style={{ fontSize: "1.1rem" }}>👥</span>
                  {!collapsed && <span>Team</span>}
                </Link>
              )}

              {canEditSettings && (
                <>
                  <Link
                    href={`${base}/settings`}
                    title={collapsed ? "Settings" : undefined}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: collapsed ? "center" : "flex-start",
                      gap: "10px",
                      padding: collapsed ? "10px 0" : "8px 10px",
                      borderRadius: "var(--radius-sm)",
                      textDecoration: "none",
                      fontSize: "var(--font-sm)",
                      fontWeight: pathname.startsWith(`${base}/settings`) ? 600 : 500,
                      color: pathname.startsWith(`${base}/settings`)
                        ? "var(--primary)"
                        : "var(--text-secondary)",
                      backgroundColor: pathname.startsWith(`${base}/settings`)
                        ? "var(--primary-soft)"
                        : "transparent",
                      borderLeft: pathname.startsWith(`${base}/settings`)
                        ? "3px solid var(--primary)"
                        : "3px solid transparent",
                      transition: "all 0.25s ease",
                    }}
                  >
                    <span style={{ fontSize: "1.1rem" }}>⚙️</span>
                    {!collapsed && <span>Settings</span>}
                  </Link>

                  <Link
                    href={`${base}/subscription`}
                    title={collapsed ? "Subscription" : undefined}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: collapsed ? "center" : "flex-start",
                      gap: "10px",
                      padding: collapsed ? "10px 0" : "8px 10px",
                      borderRadius: "var(--radius-sm)",
                      textDecoration: "none",
                      fontSize: "var(--font-sm)",
                      fontWeight: pathname.startsWith(`${base}/subscription`) ? 600 : 500,
                      color: pathname.startsWith(`${base}/subscription`)
                        ? "var(--primary)"
                        : "var(--text-secondary)",
                      backgroundColor: pathname.startsWith(`${base}/subscription`)
                        ? "var(--primary-soft)"
                        : "transparent",
                      borderLeft: pathname.startsWith(`${base}/subscription`)
                        ? "3px solid var(--primary)"
                        : "3px solid transparent",
                      transition: "all 0.25s ease",
                    }}
                  >
                    <span style={{ fontSize: "1.1rem" }}>💎</span>
                    {!collapsed && <span>Subscription</span>}
                  </Link>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Pinned Bottom User Menu */}
      <div
        style={{
          padding: collapsed ? "10px 4px" : "12px var(--space-2)",
          borderTop: "1px solid var(--border-subtle)",
          backgroundColor: "var(--bg-primary)",
        }}
      >
        <UserMenu
          userEmail={userEmail}
          userName={userName}
          role={role}
          collapsed={collapsed}
        />
      </div>
    </aside>
  );
}
