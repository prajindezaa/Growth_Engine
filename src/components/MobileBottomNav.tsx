"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

interface MobileBottomNavProps {
  businessId: string;
  onAIClick: () => void;
}

export default function MobileBottomNav({ businessId, onAIClick }: MobileBottomNavProps) {
  const pathname = usePathname();
  const [showMore, setShowMore] = useState(false);

  const base = `/app/${businessId}`;
  const isActive = (path: string) => {
    if (path === base) return pathname === base;
    return pathname.startsWith(path);
  };

  const tabs = [
    { href: base, icon: "📊", label: "Dashboard", match: base },
    { href: `${base}/sales`, icon: "🧾", label: "Sales", match: `${base}/sales` },
    { href: `${base}/customers`, icon: "👤", label: "Customers", match: `${base}/customers` },
    { action: "ai", icon: "✨", label: "AI" },
    { action: "more", icon: "☰", label: "More" },
  ];

  const moreItems = [
    { href: `${base}/products`, icon: "📦", label: "Products" },
    { href: `${base}/suppliers`, icon: "🏭", label: "Suppliers" },
    { href: `${base}/purchases`, icon: "🛒", label: "Purchases" },
    { href: `${base}/inventory`, icon: "📋", label: "Inventory" },
    { href: `${base}/team`, icon: "👥", label: "Team" },
    { href: `${base}/settings`, icon: "⚙️", label: "Settings" },
    { href: `${base}/subscription`, icon: "💎", label: "Subscription" },
  ];

  return (
    <>
      <nav className="ge-mobile-nav">
        <div className="ge-mobile-nav-inner">
          {tabs.map((tab) => {
            if (tab.action === "ai") {
              return (
                <button key="ai" className="ge-mobile-nav-item" onClick={onAIClick}>
                  <span style={{
                    width: "32px", height: "32px", borderRadius: "50%",
                    background: "var(--ge-ai-gradient)", display: "flex",
                    alignItems: "center", justifyContent: "center", fontSize: "0.9rem",
                  }}>✨</span>
                  <span>{tab.label}</span>
                </button>
              );
            }
            if (tab.action === "more") {
              return (
                <button key="more" className={`ge-mobile-nav-item ${showMore ? "active" : ""}`}
                  onClick={() => setShowMore(!showMore)}>
                  <span>{tab.icon}</span>
                  <span>{tab.label}</span>
                </button>
              );
            }
            return (
              <Link key={tab.href} href={tab.href!}
                className={`ge-mobile-nav-item ${isActive(tab.match!) ? "active" : ""}`}
                onClick={() => setShowMore(false)}>
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* More menu bottom sheet */}
      {showMore && (
        <>
          <div className="ge-bottom-sheet-overlay" onClick={() => setShowMore(false)} />
          <div className="ge-bottom-sheet">
            <div className="ge-bottom-sheet-handle" />
            <div style={{ padding: "8px 16px 16px" }}>
              {moreItems.map((item) => (
                <Link key={item.href} href={item.href}
                  onClick={() => setShowMore(false)}
                  style={{
                    display: "flex", alignItems: "center", gap: "14px",
                    padding: "14px 12px", borderRadius: "var(--ge-radius)",
                    textDecoration: "none", color: "var(--ge-text-primary)",
                    fontSize: "15px", fontWeight: 500,
                    transition: "background var(--ge-transition)",
                    minHeight: "44px",
                    background: pathname.startsWith(item.href) ? "var(--ge-accent-soft)" : "transparent",
                  }}>
                  <span style={{ fontSize: "1.25rem", width: "28px", textAlign: "center" }}>{item.icon}</span>
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
        </>
      )}
    </>
  );
}
