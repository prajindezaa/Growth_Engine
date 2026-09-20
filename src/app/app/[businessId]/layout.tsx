import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Image from "next/image";
import Link from "next/link";
import {
  canManageTeam,
  canEditSettings,
  canAccessSales,
  canAccessPurchases,
  canAccessInventory,
  canAccessCustomers,
  canAccessSuppliers,
  canAccessProducts,
  canAccessReports,
  canAccessPOS,
  canManageAutomation,
} from "@/lib/roles";
import type { Role } from "@/lib/roles";
import AIChatPanel from "@/components/AIChatPanel";
import NotificationCenter from "@/components/NotificationCenter";
import ThemeToggle from "@/components/ThemeToggle";
import { ToastProvider } from "@/components/Toast";
import MobileBottomNav from "@/components/MobileBottomNav";
import GlobalSearchModal from "@/components/GlobalSearchModal";
import SearchTriggerButton from "@/components/SearchTriggerButton";

import GroupedSidebar from "@/components/GroupedSidebar";

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

  // Fetch count of businesses user belongs to (for switcher affordance)
  const { count: membershipCount } = await supabase
    .from("business_members")
    .select("business_id", { count: "exact", head: true })
    .eq("user_id", user.id);

  return (
    <div style={{ display: "flex", flex: 1, minHeight: "100vh", backgroundColor: "var(--bg-primary)" }}>
      {/* Desktop Grouped Sidebar */}
      <GroupedSidebar
        businessId={businessId}
        businessName={business.name}
        businessLogoUrl={business.logo_url}
        role={role}
        userEmail={user.email || ""}
        userName={user.user_metadata?.full_name}
        multipleBusinesses={(membershipCount || 0) > 1}
        canAccessSales={canAccessSales(role)}
        canAccessPurchases={canAccessPurchases(role)}
        canAccessInventory={canAccessInventory(role)}
        canAccessCustomers={canAccessCustomers(role)}
        canAccessSuppliers={canAccessSuppliers(role)}
        canAccessProducts={canAccessProducts(role)}
        canAccessReports={canAccessReports(role)}
        canAccessPOS={canAccessPOS(role)}
        canManageAutomation={canManageAutomation(role)}
        canManageTeam={canManageTeam(role)}
        canEditSettings={canEditSettings(role)}
      />

      {/* Content */}
      <div className="ge-main-content" style={{ flex: 1, overflow: "auto", minHeight: "100vh" }}>
        <ToastProvider>{children}</ToastProvider>
      </div>

      {/* AI Chat */}
      <AIChatPanel businessId={businessId} />

      {/* Global Search Modal (Cmd+K) */}
      <GlobalSearchModal businessId={businessId} />

      {/* Mobile Bottom Nav */}
      <MobileBottomNav businessId={businessId} role={role} />
    </div>
  );
}
