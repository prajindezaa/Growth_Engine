"use client";

import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";

interface Notification {
  id: string;
  type: string;
  title: string;
  body: string | null;
  reference_type: string | null;
  reference_id: string | null;
  is_read: boolean;
  created_at: string;
}

const TYPE_ICONS: Record<string, string> = {
  overdue_invoice: "🔴",
  due_today: "🟡",
  due_this_week: "🟠",
  low_stock: "📦",
  payment_received: "💰",
  staff_joined: "👤",
  general: "🔔",
};

export default function NotificationCenter({ businessId }: { businessId: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => { loadNotifications(); }, []);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) setIsOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  async function loadNotifications() {
    const supabase = createClient();
    const { data } = await supabase.from("notifications")
      .select("*").eq("business_id", businessId)
      .order("created_at", { ascending: false }).limit(30);
    if (data) {
      setNotifications(data as Notification[]);
      setUnreadCount(data.filter((n: Notification) => !n.is_read).length);
    }
  }

  async function markAllRead() {
    const supabase = createClient();
    await supabase.from("notifications").update({ is_read: true })
      .eq("business_id", businessId).eq("is_read", false);
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    setUnreadCount(0);
  }

  async function generateNotifications() {
    const supabase = createClient();
    await (supabase.rpc as Function)("generate_daily_notifications", { p_business_id: businessId });
    await loadNotifications();
  }

  function getLink(n: Notification): string | null {
    if (!n.reference_type || !n.reference_id) return null;
    switch (n.reference_type) {
      case "invoice": return `/app/${businessId}/sales/invoices/${n.reference_id}`;
      case "product": return `/app/${businessId}/products/${n.reference_id}`;
      default: return null;
    }
  }

  return (
    <div ref={panelRef} style={{ position: "relative" }}>
      {/* Bell button */}
      <button onClick={() => { setIsOpen(!isOpen); if (!isOpen) loadNotifications(); }} style={{
        background: "transparent", border: "none", cursor: "pointer", position: "relative",
        padding: "8px", borderRadius: "var(--ge-radius)", fontSize: "1.125rem",
      }}>
        🔔
        {unreadCount > 0 && (
          <span style={{
            position: "absolute", top: "2px", right: "2px", width: "18px", height: "18px",
            borderRadius: "50%", background: "var(--ge-error)", color: "#fff",
            fontSize: "0.625rem", fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center",
          }}>{unreadCount > 9 ? "9+" : unreadCount}</span>
        )}
      </button>

      {/* Dropdown panel */}
      {isOpen && (
        <div style={{
          position: "absolute", top: "calc(100% + 8px)", right: 0, width: "360px",
          background: "var(--ge-bg-card)", border: "1px solid var(--ge-border)",
          borderRadius: "var(--ge-radius-lg)", boxShadow: "0 16px 64px rgba(0,0,0,0.5)",
          backdropFilter: "blur(24px)", overflow: "hidden", zIndex: 100,
        }} className="ge-animate-in">
          {/* Header */}
          <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--ge-border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h4 style={{ margin: 0, fontSize: "0.875rem", fontWeight: 600, color: "var(--ge-text-primary)" }}>Notifications</h4>
            <div style={{ display: "flex", gap: "8px" }}>
              <button onClick={generateNotifications} style={{
                fontSize: "0.6875rem", padding: "4px 8px", borderRadius: "var(--ge-radius)",
                border: "1px solid var(--ge-border)", background: "transparent",
                color: "var(--ge-text-muted)", cursor: "pointer",
              }}>↻ Refresh</button>
              {unreadCount > 0 && (
                <button onClick={markAllRead} style={{
                  fontSize: "0.6875rem", padding: "4px 8px", borderRadius: "var(--ge-radius)",
                  border: "1px solid var(--ge-border)", background: "transparent",
                  color: "var(--ge-accent)", cursor: "pointer",
                }}>Mark all read</button>
              )}
            </div>
          </div>

          {/* List */}
          <div style={{ maxHeight: "400px", overflowY: "auto" }}>
            {notifications.length === 0 ? (
              <div style={{ padding: "32px 16px", textAlign: "center", color: "var(--ge-text-muted)", fontSize: "0.8125rem" }}>
                No notifications yet. Click Refresh to generate alerts.
              </div>
            ) : (
              notifications.map((n) => {
                const link = getLink(n);
                const itemStyle = {
                  display: "flex" as const, gap: "10px", padding: "10px 16px",
                  borderBottom: "1px solid var(--ge-border)", textDecoration: "none",
                  background: n.is_read ? "transparent" : "rgba(13,148,136,0.04)",
                  cursor: link ? "pointer" as const : "default" as const,
                };
                const inner = (
                  <>
                    <span style={{ fontSize: "1rem", flexShrink: 0, marginTop: "2px" }}>{TYPE_ICONS[n.type] || "🔔"}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: "0.8125rem", fontWeight: n.is_read ? 400 : 600, color: "var(--ge-text-primary)", marginBottom: "2px" }}>{n.title}</div>
                      {n.body && <div style={{ fontSize: "0.75rem", color: "var(--ge-text-muted)" }}>{n.body}</div>}
                      <div style={{ fontSize: "0.625rem", color: "var(--ge-text-muted)", marginTop: "2px" }}>
                        {new Date(n.created_at).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                      </div>
                    </div>
                    {!n.is_read && <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: "var(--ge-accent)", flexShrink: 0, marginTop: "6px" }} />}
                  </>
                );
                return link ? (
                  <Link key={n.id} href={link} style={itemStyle}>{inner}</Link>
                ) : (
                  <div key={n.id} style={itemStyle}>{inner}</div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
