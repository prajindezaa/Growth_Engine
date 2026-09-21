"use client";

import React from "react";
import Link from "next/link";
import {
  Users,
  Package,
  Boxes,
  Truck,
  FileText,
  Receipt,
  BarChart3,
  Bot,
  CheckCheck,
  Settings,
  ShieldCheck,
  ChevronRight,
  LogOut,
  type LucideIcon,
} from "lucide-react";
import { Card } from "@/components/ui/card";

interface MenuItem {
  label: string;
  href: string;
  icon: LucideIcon;
  count?: string;
  danger?: boolean;
}

interface MenuSection {
  title: string;
  items: MenuItem[];
}

export default function MorePage() {
  const sections: MenuSection[] = [
    {
      title: "SALES & COMMERCE",
      items: [
        { label: "Customers & Parties", href: "/customers", icon: Users, count: "5" },
        { label: "Quotations & Estimates", href: "/quotations", icon: FileText },
        { label: "Tax Invoices", href: "/invoices", icon: Receipt },
      ],
    },
    {
      title: "INVENTORY & SUPPLY",
      items: [
        { label: "Products Catalog", href: "/products", icon: Package, count: "5" },
        { label: "Stock Movements", href: "/inventory", icon: Boxes },
        { label: "Suppliers & Vendors", href: "/suppliers", icon: Truck },
      ],
    },
    {
      title: "BUSINESS INTELLIGENCE",
      items: [
        { label: "Financial Reports", href: "/reports", icon: BarChart3 },
        { label: "Approval Center", href: "/approvals", icon: CheckCheck },
        { label: "Automations", href: "/automations", icon: Bot },
        { label: "Notifications & Activity", href: "/notifications", icon: Receipt },
      ],
    },
    {
      title: "ACCOUNT & SETTINGS",
      items: [
        { label: "Business Settings & GST", href: "/settings", icon: Settings },
        { label: "Team & Role Permissions", href: "/team", icon: ShieldCheck },
        { label: "Log Out / Switch Account", href: "/login", icon: LogOut, danger: true },
      ],
    },
  ];

  return (
    <div className="space-y-5 animate-in fade-in duration-300">
      <div>
        <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
          All Modules & Tools
        </h1>
        <p className="text-xs text-slate-500">Access all operations and workspace preferences</p>
      </div>

      <div className="space-y-4">
        {sections.map((sec) => (
          <div key={sec.title}>
            <h2 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2 px-1">
              {sec.title}
            </h2>
            <Card className="p-1 divide-y divide-slate-100">
              {sec.items.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.label}
                    href={item.href}
                    className={`flex items-center justify-between p-3.5 hover:bg-slate-50 active:bg-slate-100 rounded-xl transition-colors ${
                      item.danger ? "text-rose-600 font-medium" : "text-slate-800"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`p-2 rounded-xl ${
                          item.danger ? "bg-rose-50 text-rose-600" : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                      </div>
                      <span className="text-sm font-semibold">{item.label}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      {item.count ? (
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                          {item.count}
                        </span>
                      ) : null}
                      <ChevronRight className="w-4 h-4 text-slate-400" />
                    </div>
                  </Link>
                );
              })}
            </Card>
          </div>
        ))}
      </div>
    </div>
  );
}
