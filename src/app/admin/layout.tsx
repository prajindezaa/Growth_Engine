"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/context/auth-context";
import {
  LayoutDashboard,
  Users,
  Building2,
  Receipt,
  ShoppingCart,
  Package,
  UserCheck,
  TrendingUp,
  ShoppingBag,
  Boxes,
  CreditCard,
  Layers,
  Bot,
  BarChart3,
  Activity,
  Bell,
  Headphones,
  Settings,
  ShieldCheck,
  Search,
  LogOut,
  ChevronRight,
  Sparkles,
  ExternalLink,
} from "lucide-react";

interface AdminLayoutProps {
  children: React.ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, session, loading, signOut } = useAuth();
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any>(null);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    async function checkAuth() {
      if (loading) return;
      if (!user) {
        router.replace("/login");
        return;
      }

      try {
        const token = session?.access_token;
        const res = await fetch("/api/admin/check-auth", {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });

        if (res.ok) {
          const data = await res.json();
          if (data.authorized) {
            setIsAuthorized(true);
            return;
          }
        }
        setIsAuthorized(false);
      } catch (err) {
        console.error("Admin layout auth check error:", err);
        setIsAuthorized(false);
      }
    }

    checkAuth();
  }, [user, session, loading, router]);

  // Global search debouncing
  useEffect(() => {
    if (!searchQuery || searchQuery.length < 2) {
      setSearchResults(null);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const token = session?.access_token;
        const res = await fetch(`/api/admin/search?q=${encodeURIComponent(searchQuery)}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (res.ok) {
          const data = await res.json();
          setSearchResults(data.results);
        }
      } catch (e) {
        console.error("Search error:", e);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, session]);

  if (loading || isAuthorized === null) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white">
        <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400 mb-4 animate-pulse">
          <ShieldCheck className="w-6 h-6" />
        </div>
        <h2 className="text-base font-bold">Verifying Super Admin Authorization</h2>
        <p className="text-xs text-slate-400 mt-1">Connecting to server security registry...</p>
      </div>
    );
  }

  if (isAuthorized === false) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white p-4">
        <div className="w-16 h-16 rounded-3xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400 mb-4">
          <ShieldCheck className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-black text-rose-400">Access Denied (403)</h2>
        <p className="text-xs text-slate-400 mt-2 max-w-md text-center leading-relaxed">
          Your account is not registered as an authorized Super Admin for GrowthEngine. This incident has been logged.
        </p>
        <button
          onClick={() => router.replace("/")}
          className="mt-6 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold transition-all"
        >
          Return to Business Dashboard
        </button>
      </div>
    );
  }

  const navGroups = [
    {
      title: "OVERVIEW",
      items: [
        { label: "Dashboard", href: "/admin", icon: LayoutDashboard },
        { label: "Platform Analytics", href: "/admin/analytics", icon: BarChart3 },
        { label: "AI Usage & Costs", href: "/admin/ai-usage", icon: Bot, badge: "LIVE" },
      ],
    },
    {
      title: "TENANTS & CORE DATA",
      items: [
        { label: "Users & Accounts", href: "/admin/users", icon: Users },
        { label: "Businesses", href: "/admin/businesses", icon: Building2 },
        { label: "Customers (Parties)", href: "/admin/customers", icon: UserCheck },
        { label: "Products Catalog", href: "/admin/products", icon: Package },
      ],
    },
    {
      title: "TRANSACTIONS & COMMERCE",
      items: [
        { label: "Invoices", href: "/admin/invoices", icon: Receipt },
        { label: "Orders", href: "/admin/orders", icon: ShoppingCart },
        { label: "Sales", href: "/admin/sales", icon: TrendingUp },
        { label: "Purchases", href: "/admin/purchases", icon: ShoppingBag },
        { label: "Inventory", href: "/admin/inventory", icon: Boxes },
        { label: "Expenses", href: "/admin/expenses", icon: CreditCard },
        { label: "Payments", href: "/admin/payments", icon: Layers },
      ],
    },
    {
      title: "OPERATIONS & SECURITY",
      items: [
        { label: "Subscriptions", href: "/admin/subscriptions", icon: Layers },
        { label: "Activity Audit Logs", href: "/admin/activity", icon: Activity },
        { label: "Admin Notifications", href: "/admin/notifications", icon: Bell },
        { label: "Support Tickets", href: "/admin/support", icon: Headphones },
        { label: "Security & Sessions", href: "/admin/security", icon: ShieldCheck },
        { label: "Platform Settings", href: "/admin/settings", icon: Settings },
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-[#0B0F19] text-slate-100 flex selection:bg-indigo-500 selection:text-white">
      {/* Sidebar */}
      <aside className="w-64 bg-[#0F172A] border-r border-slate-800 flex flex-col shrink-0 select-none">
        {/* Brand */}
        <div className="h-16 px-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-black text-sm shadow-md shadow-indigo-500/30">
              G
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-black tracking-tight text-white">GrowthEngine</span>
                <span className="text-[10px] font-bold bg-indigo-500/20 text-indigo-400 px-1.5 py-0.5 rounded border border-indigo-500/30">
                  ADMIN
                </span>
              </div>
              <p className="text-[10px] text-slate-400 font-medium">Control Plane</p>
            </div>
          </div>
        </div>

        {/* Navigation list */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
          {navGroups.map((grp) => (
            <div key={grp.title}>
              <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider px-3 mb-1.5">
                {grp.title}
              </div>
              <div className="space-y-0.5">
                {grp.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                        isActive
                          ? "bg-indigo-600 text-white font-bold shadow-md shadow-indigo-600/30"
                          : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <Icon className="w-4 h-4 shrink-0" />
                        <span>{item.label}</span>
                      </div>
                      {item.badge && (
                        <span className="text-[9px] font-extrabold px-1.5 py-0.2 bg-emerald-500/20 text-emerald-400 rounded-full border border-emerald-500/30">
                          {item.badge}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Footer info & Return to store */}
        <div className="p-3 border-t border-slate-800 bg-slate-900/50">
          <Link
            href="/"
            className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 transition-colors mb-2"
          >
            <span>Open MSME Store</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </Link>
          <button
            onClick={() => signOut()}
            className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-rose-400 hover:text-rose-300 transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out Session</span>
          </button>
        </div>
      </aside>

      {/* Main Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header */}
        <header className="h-16 bg-[#0F172A]/80 backdrop-blur-md border-b border-slate-800 px-6 flex items-center justify-between sticky top-0 z-30">
          {/* Global Search */}
          <div className="relative w-80 sm:w-96">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Global Search (Users, Businesses, Invoices, SKU)..."
              className="w-full h-10 pl-10 pr-4 bg-slate-800/80 border border-slate-700 rounded-xl text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            />

            {/* Live Search Popup */}
            {searchResults && (
              <div className="absolute top-12 left-0 right-0 bg-[#0F172A] border border-slate-800 rounded-2xl shadow-2xl p-3 z-50 max-h-96 overflow-y-auto space-y-3">
                {searchResults.users?.length > 0 && (
                  <div>
                    <div className="text-[10px] font-bold text-slate-500 uppercase px-2 mb-1">Users</div>
                    {searchResults.users.map((u: any) => (
                      <Link
                        key={u.id}
                        href={`/admin/users?search=${encodeURIComponent(u.email || u.full_name)}`}
                        onClick={() => setSearchResults(null)}
                        className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-800 text-xs"
                      >
                        <span className="font-semibold text-white">{u.full_name || u.email}</span>
                        <span className="text-[10px] text-slate-400">{u.phone || u.email}</span>
                      </Link>
                    ))}
                  </div>
                )}

                {searchResults.businesses?.length > 0 && (
                  <div>
                    <div className="text-[10px] font-bold text-slate-500 uppercase px-2 mb-1">Businesses</div>
                    {searchResults.businesses.map((b: any) => (
                      <Link
                        key={b.id}
                        href={`/admin/businesses?search=${encodeURIComponent(b.name)}`}
                        onClick={() => setSearchResults(null)}
                        className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-800 text-xs"
                      >
                        <span className="font-semibold text-white">{b.name}</span>
                        <span className="text-[10px] text-slate-400">{b.city}</span>
                      </Link>
                    ))}
                  </div>
                )}

                {searchResults.invoices?.length > 0 && (
                  <div>
                    <div className="text-[10px] font-bold text-slate-500 uppercase px-2 mb-1">Invoices</div>
                    {searchResults.invoices.map((inv: any) => (
                      <Link
                        key={inv.id}
                        href={`/admin/invoices?search=${encodeURIComponent(inv.invoice_number)}`}
                        onClick={() => setSearchResults(null)}
                        className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-800 text-xs"
                      >
                        <span className="font-semibold text-white">{inv.invoice_number}</span>
                        <span className="text-[10px] text-emerald-400 font-bold">₹{inv.grand_total}</span>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Admin Profile Details */}
          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className="text-xs font-bold text-white leading-tight">Super Admin</div>
              <div className="text-[10px] text-indigo-400 font-mono">{user?.email}</div>
            </div>
            <div className="w-9 h-9 rounded-xl bg-indigo-500/20 border border-indigo-500/40 text-indigo-300 font-bold text-xs flex items-center justify-center">
              SA
            </div>
          </div>
        </header>

        {/* Content Viewport */}
        <main className="flex-1 p-6 overflow-y-auto max-w-7xl w-full">
          {children}
        </main>
      </div>
    </div>
  );
}
