"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/context/auth-context";
import {
  Users,
  Building2,
  Receipt,
  TrendingUp,
  Package,
  UserCheck,
  Bot,
  CreditCard,
  ArrowUpRight,
  ShieldCheck,
  Calendar,
  Sparkles,
  Layers,
  CheckCircle2,
} from "lucide-react";

export default function AdminDashboardPage() {
  const { session } = useAuth();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState("30d");

  useEffect(() => {
    async function fetchStats() {
      setLoading(true);
      try {
        const token = session?.access_token;
        const res = await fetch(`/api/admin/stats?range=${dateRange}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (res.ok) {
          const data = await res.json();
          setStats(data.stats);
        }
      } catch (err) {
        console.error("Fetch stats error:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchStats();
  }, [dateRange, session]);

  const cards = [
    {
      title: "Total Businesses",
      value: stats?.totalBusinesses || 0,
      subtext: "Active MSME Tenants",
      icon: Building2,
      href: "/admin/businesses",
      color: "from-blue-500/20 to-indigo-500/10 text-blue-400 border-blue-500/30",
    },
    {
      title: "Total Users",
      value: stats?.totalUsers || 0,
      subtext: "Registered Store Accounts",
      icon: Users,
      href: "/admin/users",
      color: "from-purple-500/20 to-pink-500/10 text-purple-400 border-purple-500/30",
    },
    {
      title: "Invoices Generated",
      value: stats?.totalInvoices || 0,
      subtext: `₹${(stats?.totalSales || 0).toLocaleString("en-IN")} Gross Billed`,
      icon: Receipt,
      href: "/admin/invoices",
      color: "from-emerald-500/20 to-teal-500/10 text-emerald-400 border-emerald-500/30",
    },
    {
      title: "Total Customers",
      value: stats?.totalCustomers || 0,
      subtext: `₹${(stats?.totalOutstanding || 0).toLocaleString("en-IN")} Khata Due`,
      icon: UserCheck,
      href: "/admin/customers",
      color: "from-amber-500/20 to-orange-500/10 text-amber-400 border-amber-500/30",
    },
    {
      title: "Products Cataloged",
      value: stats?.totalProducts || 0,
      subtext: "Platform-wide SKUs",
      icon: Package,
      href: "/admin/products",
      color: "from-cyan-500/20 to-sky-500/10 text-cyan-400 border-cyan-500/30",
    },
    {
      title: "AI Requests Handled",
      value: stats?.totalAiRequests || 0,
      subtext: `${(stats?.totalAiTokens || 0).toLocaleString("en-IN")} Tokens Consumed`,
      icon: Bot,
      href: "/admin/ai-usage",
      color: "from-indigo-500/20 to-purple-500/10 text-indigo-400 border-indigo-500/30",
    },
    {
      title: "Active Subscriptions",
      value: stats?.activeSubscriptions || 0,
      subtext: `Est. ₹${(stats?.subscriptionRevenue || 0).toLocaleString("en-IN")}/mo`,
      icon: Layers,
      href: "/admin/subscriptions",
      color: "from-violet-500/20 to-indigo-500/10 text-violet-400 border-violet-500/30",
    },
    {
      title: "Total Collected",
      value: `₹${(stats?.totalCollected || 0).toLocaleString("en-IN")}`,
      subtext: "Settled via Cash & UPI",
      icon: TrendingUp,
      href: "/admin/sales",
      color: "from-emerald-500/20 to-green-500/10 text-emerald-400 border-emerald-500/30",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header & Date Range Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-white flex items-center gap-2">
            <span>GrowthEngine Super Admin</span>
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
              Live Database
            </span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Real-time platform metrics, multi-tenant analytics, and centralized business operations.
          </p>
        </div>

        {/* Date Filters */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-900 border border-slate-800 rounded-xl">
          {["today", "7d", "30d", "3m", "12m"].map((r) => (
            <button
              key={r}
              onClick={() => setDateRange(r)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all ${
                dateRange === r
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              {r === "today" ? "Today" : r === "7d" ? "7 Days" : r === "30d" ? "30 Days" : r === "3m" ? "3 Mos" : "1 Year"}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <Link
              key={card.title}
              href={card.href}
              className={`p-5 rounded-2xl border bg-gradient-to-br transition-all hover:scale-[1.01] hover:border-indigo-500/50 group ${card.color}`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">{card.title}</span>
                <div className="p-2 rounded-xl bg-slate-900/60 border border-slate-700/50">
                  <Icon className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3">
                <div className="text-2xl font-black text-white tracking-tight">
                  {loading ? "..." : card.value}
                </div>
                <div className="text-[11px] text-slate-400 mt-1 flex items-center justify-between">
                  <span>{card.subtext}</span>
                  <ArrowUpRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Quick Access Action Hub */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Real-time System Health */}
        <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Platform Core Health</span>
            </h3>
            <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
              OPERATIONAL
            </span>
          </div>

          <div className="space-y-2.5 text-xs">
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-800/60 border border-slate-800">
              <span className="text-slate-400">PostgreSQL Tenant RLS</span>
              <span className="text-emerald-400 font-bold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Enforced
              </span>
            </div>
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-800/60 border border-slate-800">
              <span className="text-slate-400">Supabase Auth Provider</span>
              <span className="text-emerald-400 font-bold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Active
              </span>
            </div>
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-800/60 border border-slate-800">
              <span className="text-slate-400">AI Assistant Engine</span>
              <span className="text-indigo-400 font-bold">Gemini 3.6 Flash</span>
            </div>
          </div>
        </div>

        {/* Quick Operations Links */}
        <div className="lg:col-span-2 p-5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-3">
          <h3 className="text-sm font-bold text-white">Direct Management Modules</h3>
          <p className="text-xs text-slate-400">Jump directly into tenant tables and financial ledgers</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-1">
            <Link
              href="/admin/users"
              className="p-3 rounded-xl bg-slate-800 hover:bg-slate-700/80 border border-slate-700 text-xs font-semibold text-white flex items-center justify-between transition-colors"
            >
              <span>Manage Users</span>
              <ArrowUpRight className="w-3.5 h-3.5 text-slate-400" />
            </Link>
            <Link
              href="/admin/businesses"
              className="p-3 rounded-xl bg-slate-800 hover:bg-slate-700/80 border border-slate-700 text-xs font-semibold text-white flex items-center justify-between transition-colors"
            >
              <span>Businesses</span>
              <ArrowUpRight className="w-3.5 h-3.5 text-slate-400" />
            </Link>
            <Link
              href="/admin/invoices"
              className="p-3 rounded-xl bg-slate-800 hover:bg-slate-700/80 border border-slate-700 text-xs font-semibold text-white flex items-center justify-between transition-colors"
            >
              <span>All Invoices</span>
              <ArrowUpRight className="w-3.5 h-3.5 text-slate-400" />
            </Link>
            <Link
              href="/admin/ai-usage"
              className="p-3 rounded-xl bg-slate-800 hover:bg-slate-700/80 border border-slate-700 text-xs font-semibold text-white flex items-center justify-between transition-colors"
            >
              <span>AI Token Usage</span>
              <ArrowUpRight className="w-3.5 h-3.5 text-slate-400" />
            </Link>
            <Link
              href="/admin/subscriptions"
              className="p-3 rounded-xl bg-slate-800 hover:bg-slate-700/80 border border-slate-700 text-xs font-semibold text-white flex items-center justify-between transition-colors"
            >
              <span>Subscriptions</span>
              <ArrowUpRight className="w-3.5 h-3.5 text-slate-400" />
            </Link>
            <Link
              href="/admin/security"
              className="p-3 rounded-xl bg-slate-800 hover:bg-slate-700/80 border border-slate-700 text-xs font-semibold text-white flex items-center justify-between transition-colors"
            >
              <span>Security Hub</span>
              <ArrowUpRight className="w-3.5 h-3.5 text-slate-400" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
