"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

interface SidebarNavProps {
  businessId: string;
  role: string;
  canAccessCustomers: boolean;
  canAccessSuppliers: boolean;
  canAccessProducts: boolean;
  canAccessInventory: boolean;
  canAccessSales: boolean;
  canAccessPOS: boolean;
  canAccessPurchases: boolean;
  canAccessReports: boolean;
  canManageAutomation: boolean;
  canManageTeam: boolean;
  canEditSettings: boolean;
}

export default function SidebarNav({
  businessId,
  canAccessCustomers,
  canAccessSuppliers,
  canAccessProducts,
  canAccessInventory,
  canAccessSales,
  canAccessPOS,
  canAccessPurchases,
  canAccessReports,
  canManageAutomation,
  canManageTeam,
  canEditSettings,
}: SidebarNavProps) {
  const pathname = usePathname();
  const base = `/app/${businessId}`;

  const navItems = [
    { href: base, icon: "📊", label: "Dashboard", exact: true },
    ...(canAccessCustomers
      ? [{ href: `${base}/customers`, icon: "👤", label: "Customers" }]
      : []),
    ...(canAccessSuppliers
      ? [{ href: `${base}/suppliers`, icon: "🏭", label: "Suppliers" }]
      : []),
    ...(canAccessProducts
      ? [{ href: `${base}/products`, icon: "📦", label: "Products" }]
      : []),
    ...(canAccessInventory
      ? [{ href: `${base}/inventory`, icon: "📋", label: "Inventory" }]
      : []),
    ...(canAccessSales
      ? [{ href: `${base}/sales`, icon: "💰", label: "Sales" }]
      : []),
    ...(canAccessPOS
      ? [{ href: `${base}/pos`, icon: "🛍️", label: "POS Counter" }]
      : []),
    ...(canAccessPurchases
      ? [{ href: `${base}/purchases`, icon: "🛒", label: "Purchases" }]
      : []),
    ...(canAccessReports
      ? [{ href: `${base}/reports`, icon: "📈", label: "Reports" }]
      : []),
    ...(canManageAutomation
      ? [{ href: `${base}/approvals`, icon: "⚡", label: "Approvals" }]
      : []),
    ...(canManageTeam
      ? [{ href: `${base}/team`, icon: "👥", label: "Team" }]
      : []),
    ...(canEditSettings
      ? [
          { href: `${base}/settings`, icon: "⚙️", label: "Settings" },
          { href: `${base}/subscription`, icon: "💎", label: "Subscription" },
        ]
      : []),
  ];

  const isItemActive = (href: string, exact?: boolean) => {
    if (exact || href === base) {
      return pathname === href;
    }
    return pathname.startsWith(href);
  };

  return (
    <nav
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "4px",
        padding: "0 var(--space-1)",
      }}
    >
      {navItems.map((item) => {
        const active = isItemActive(item.href, item.exact);
        return (
          <Link
            key={item.href}
            href={item.href}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              padding: "10px 12px",
              borderRadius: "var(--radius-sm)",
              textDecoration: "none",
              fontSize: "var(--font-sm)",
              fontWeight: active ? 600 : 500,
              color: active ? "var(--primary)" : "var(--text-secondary)",
              backgroundColor: active ? "var(--primary-soft)" : "transparent",
              borderLeft: active ? "3px solid var(--primary)" : "3px solid transparent",
              transition: "all 0.15s ease",
            }}
            className="ge-sidebar-nav-link"
          >
            <span style={{ fontSize: "1.1rem", display: "inline-flex" }}>{item.icon}</span>
            <span style={{ flex: 1 }}>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
