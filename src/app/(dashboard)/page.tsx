"use client";

import React from "react";
import Link from "next/link";
import { useDashboardData } from "@/hooks/use-dashboard-data";
import { StatsCard } from "@/components/ui/stats-card";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatIndianCurrency, formatShortDate } from "@/lib/utils";
import {
  TrendingUp,
  AlertCircle,
  PackageX,
  PlusCircle,
  Receipt,
  Users,
  ArrowRight,
  Send,
  Sparkles,
} from "lucide-react";

export default function DashboardPage() {
  const { stats, topCustomersDue, criticalProducts } = useDashboardData();

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* Hero Welcome & Date */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            வணக்கம், Sri Lakshmi Enterprises
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Today’s business performance & pending action items
          </p>
        </div>

        {/* Quick Date indicator */}
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-600 bg-white px-3 py-1.5 rounded-xl border border-slate-200/80 shadow-2xs self-start sm:self-auto">
          <span>Today: 21 Sep 2026</span>
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
        </div>
      </div>

      {/* Hero Stat Grid (Strong Visual Dominance) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatsCard
          label="Today's Sales"
          value={formatIndianCurrency(stats.todaySales)}
          subValue={`${stats.todayInvoicesCount} invoices generated`}
          trend={{ value: "+18% vs yesterday", isPositive: true }}
          icon={<TrendingUp className="w-4 h-4 text-emerald-600" />}
          variant="success"
        />

        <StatsCard
          label="Total Khata (Due)"
          value={formatIndianCurrency(stats.totalKhataReceivables)}
          subValue={`${formatIndianCurrency(stats.totalOverdueAmount)} overdue`}
          trend={{ value: "4 parties pending", isPositive: false }}
          icon={<AlertCircle className="w-4 h-4 text-rose-600" />}
          variant="danger"
        />

        <StatsCard
          label="Low Stock Alerts"
          value={`${stats.lowStockCount} Items`}
          subValue="Requires reorder soon"
          trend={{ value: "1 item out of stock", isPositive: false }}
          icon={<PackageX className="w-4 h-4 text-amber-600" />}
          variant="warning"
        />

        <StatsCard
          label="Active Orders"
          value={`${stats.activeOrdersCount} Orders`}
          subValue="Ready for dispatch"
          trend={{ value: "All on schedule", isNeutral: true }}
          icon={<Receipt className="w-4 h-4 text-indigo-600" />}
          variant="default"
        />
      </div>

      {/* Quick Actions Bar (Thumb Reachable Row) */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-2xs">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Quick Actions
          </span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <Link href="/pos">
            <Button variant="primary" className="w-full h-11 text-xs font-semibold justify-start px-3">
              <Receipt className="w-4 h-4 mr-2 shrink-0" />
              <span className="truncate">New Bill / POS</span>
            </Button>
          </Link>
          <Link href="/customers">
            <Button variant="secondary" className="w-full h-11 text-xs font-semibold justify-start px-3">
              <Users className="w-4 h-4 mr-2 shrink-0 text-[#4F46E5]" />
              <span className="truncate">Add / View Customer</span>
            </Button>
          </Link>
          <Link href="/products">
            <Button variant="secondary" className="w-full h-11 text-xs font-semibold justify-start px-3">
              <PlusCircle className="w-4 h-4 mr-2 shrink-0 text-amber-600" />
              <span className="truncate">Check Inventory</span>
            </Button>
          </Link>
          <Link href="/khata">
            <Button variant="secondary" className="w-full h-11 text-xs font-semibold justify-start px-3">
              <Send className="w-4 h-4 mr-2 shrink-0 text-emerald-600" />
              <span className="truncate">Collect Khata</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* Two Column Grid: Critical Khata Receivables & Inventory Health */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        
        {/* Urgent Khata Due (Dominant financial outstanding) */}
        <Card className="flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-rose-50 text-rose-600">
                  <AlertCircle className="w-4 h-4" />
                </span>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Priority Khata Collections</h3>
                  <p className="text-[11px] text-slate-500">Customers with highest overdue balances</p>
                </div>
              </div>
              <Link href="/khata" className="text-xs font-semibold text-[#4F46E5] hover:underline">
                View All
              </Link>
            </div>

            <div className="mt-3 divide-y divide-slate-100">
              {topCustomersDue.map((cust: any) => (
                <div key={cust.id} className="py-3 flex items-center justify-between gap-3">
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">{cust.name}</h4>
                    <p className="text-[11px] text-slate-500">{cust.city || "Tamil Nadu"} • {cust.phone}</p>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-black text-rose-600">
                      {formatIndianCurrency(cust.outstandingBalance)}
                    </div>
                    <Badge variant={cust.status === "overdue" ? "danger" : "warning"}>
                      {cust.status === "overdue" ? "Overdue" : "Due Soon"}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100">
            <Link href="/customers">
              <Button variant="ghost" size="sm" className="w-full text-xs text-slate-600 justify-between">
                <span>Manage Customer Ledgers</span>
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>
        </Card>

        {/* Low Stock & Critical Inventory */}
        <Card className="flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-amber-50 text-amber-600">
                  <PackageX className="w-4 h-4" />
                </span>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Inventory Alerts</h3>
                  <p className="text-[11px] text-slate-500">Items nearing or below minimum threshold</p>
                </div>
              </div>
              <Link href="/products" className="text-xs font-semibold text-[#4F46E5] hover:underline">
                Manage Stock
              </Link>
            </div>

            <div className="mt-3 divide-y divide-slate-100">
              {criticalProducts.map((prod: any) => (
                <div key={prod.id} className="py-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <h4 className="text-xs font-bold text-slate-900 truncate">{prod.name}</h4>
                    <p className="text-[11px] text-slate-500">
                      SKU: {prod.sku || "SKU-GEN"} • Cost: {formatIndianCurrency(prod.costPrice || 0)}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-xs font-bold text-slate-900">
                      {prod.stock} {prod.unit} left
                    </div>
                    <Badge variant={prod.status === "out_of_stock" ? "danger" : "warning"}>
                      {prod.status === "out_of_stock" ? "Out of Stock" : "Low Stock"}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100">
            <Link href="/products">
              <Button variant="ghost" size="sm" className="w-full text-xs text-slate-600 justify-between">
                <span>View Full Catalog</span>
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>
        </Card>
      </div>

    </div>
  );
}
