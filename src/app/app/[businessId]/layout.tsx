import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Image from "next/image";
import Link from "next/link";
import { canManageTeam, canEditSettings, canEditData } from "@/lib/roles";
import type { Role } from "@/lib/roles";
import AIChatPanel from "@/components/AIChatPanel";
import NotificationCenter from "@/components/NotificationCenter";
import ThemeToggle from "@/components/ThemeToggle";
import { ToastProvider } from "@/components/Toast";

export default async function BusinessLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ businessId: string }>;
}) {
  const { businessId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Verify user is a member of this business
  const { data: membership } = await supabase
    .from("business_members")
    .select("role")
    .eq("business_id", businessId)
    .eq("user_id", user.id)
    .single();

  if (!membership) {
    notFound();
  }

  const role = membership.role as Role;

  // Fetch business details for the nav
  const { data: business } = await supabase
    .from("businesses")
    .select("name, logo_url")
    .eq("id", businessId)
    .single();

  if (!business) {
    notFound();
  }

  const initials = business.name
    .split(" ")
    .map((w: string) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div style={{ display: "flex", flex: 1 }}>
      {/* Sidebar */}
      <aside
        style={{
          width: "240px",
          borderRight: "1px solid var(--ge-border)",
          background: "var(--ge-bg-secondary)",
          padding: "20px 0",
          display: "flex",
          flexDirection: "column",
          flexShrink: 0,
        }}
      >
        {/* Business identity */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            padding: "0 16px 20px",
            borderBottom: "1px solid var(--ge-border)",
            marginBottom: "16px",
          }}
        >
          {business.logo_url ? (
            <Image
              src={business.logo_url}
              alt={business.name}
              width={36}
              height={36}
              style={{
                borderRadius: "10px",
                objectFit: "cover",
              }}
            />
          ) : (
            <div
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "10px",
                background: "var(--ge-gradient-subtle)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "0.8125rem",
                fontWeight: 700,
                color: "var(--ge-accent)",
                flexShrink: 0,
              }}
            >
              {initials}
            </div>
          )}
          <div style={{ minWidth: 0 }}>
            <div
              style={{
                fontSize: "0.875rem",
                fontWeight: 600,
                color: "var(--ge-text-primary)",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {business.name}
            </div>
            <div
              style={{
                fontSize: "0.6875rem",
                color: "var(--ge-text-muted)",
                textTransform: "uppercase",
                letterSpacing: "0.04em",
              }}
            >
              {membership.role}
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "2px" }}>
            <ThemeToggle />
            <NotificationCenter businessId={businessId} />
          </div>
        </div>

        {/* Nav links */}
        <nav style={{ display: "flex", flexDirection: "column", gap: "2px", padding: "0 8px" }}>
          <SidebarLink href={`/app/${businessId}`} icon="📊" label="Dashboard" />
          {canEditData(role) && (
            <SidebarLink href={`/app/${businessId}/customers`} icon="👤" label="Customers" />
          )}
          {canEditData(role) && (
            <SidebarLink href={`/app/${businessId}/suppliers`} icon="🏭" label="Suppliers" />
          )}
          {canEditData(role) && (
            <SidebarLink href={`/app/${businessId}/products`} icon="📦" label="Products" />
          )}
          {canEditData(role) && (
            <SidebarLink href={`/app/${businessId}/inventory`} icon="📋" label="Inventory" />
          )}
          {canEditData(role) && (
            <SidebarLink href={`/app/${businessId}/sales`} icon="💰" label="Sales" />
          )}
          {canEditData(role) && (
            <SidebarLink href={`/app/${businessId}/purchases`} icon="🛒" label="Purchases" />
          )}
          {canManageTeam(role) && (
            <SidebarLink href={`/app/${businessId}/team`} icon="👥" label="Team" />
          )}
          {canEditSettings(role) && (
            <SidebarLink href={`/app/${businessId}/settings`} icon="⚙️" label="Settings" />
          )}
          {canEditSettings(role) && (
            <SidebarLink href={`/app/${businessId}/subscription`} icon="💎" label="Subscription" />
          )}
        </nav>

        {/* Bottom: switch business */}
        <div style={{ marginTop: "auto", padding: "16px" }}>
          <Link
            href="/app"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              fontSize: "0.8125rem",
              color: "var(--ge-text-muted)",
              textDecoration: "none",
              padding: "8px 12px",
              borderRadius: "var(--ge-radius)",
              transition: "all var(--ge-transition)",
            }}
            className="ge-sidebar-link"
          >
            ← All businesses
          </Link>
        </div>
      </aside>

      {/* Content */}
      <div style={{ flex: 1, overflow: "auto" }}>
        <ToastProvider>{children}</ToastProvider>
      </div>

      {/* AI Chat */}
      <AIChatPanel businessId={businessId} />
    </div>
  );
}

function SidebarLink({
  href,
  icon,
  label,
}: {
  href: string;
  icon: string;
  label: string;
}) {
  return (
    <Link
      href={href}
      style={{
        display: "flex",
        alignItems: "center",
        gap: "10px",
        padding: "10px 12px",
        borderRadius: "var(--ge-radius)",
        textDecoration: "none",
        fontSize: "0.875rem",
        color: "var(--ge-text-secondary)",
        transition: "all var(--ge-transition)",
      }}
      className="ge-sidebar-link"
    >
      <span>{icon}</span>
      {label}
    </Link>
  );
}
