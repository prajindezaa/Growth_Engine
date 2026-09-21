"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Sparkles,
  FileText,
  ShoppingBag,
  Receipt,
  ShoppingCart,
  Users,
  Truck,
  Package,
  Boxes,
  CreditCard,
  BookOpen,
  BarChart3,
  Bot,
  CheckCheck,
  Bell,
  Settings,
  ShieldCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface DesktopSidebarProps {
  onOpenAI: () => void;
}

export function DesktopSidebar({ onOpenAI }: DesktopSidebarProps) {
  const pathname = usePathname();

  const groups = [
    {
      label: "WORKSPACE",
      items: [
        { label: "Dashboard", href: "/", icon: LayoutDashboard },
        { label: "AI Employee", action: onOpenAI, icon: Sparkles, isAI: true },
      ],
    },
    {
      label: "SALES",
      items: [
        { label: "Quotations", href: "/quotations", icon: FileText },
        { label: "Orders", href: "/sales-orders", icon: ShoppingBag },
        { label: "Invoices", href: "/invoices", icon: Receipt },
        { label: "POS Terminal", href: "/pos", icon: ShoppingCart },
        { label: "Customers", href: "/customers", icon: Users },
      ],
    },
    {
      label: "SUPPLY",
      items: [
        { label: "Purchases", href: "/purchases", icon: Truck },
        { label: "Suppliers", href: "/suppliers", icon: Users },
        { label: "Products", href: "/products", icon: Package },
        { label: "Inventory", href: "/inventory", icon: Boxes },
      ],
    },
    {
      label: "MONEY",
      items: [
        { label: "Payments", href: "/payments", icon: CreditCard },
        { label: "Khata (Outstanding)", href: "/khata", icon: BookOpen },
        { label: "Reports", href: "/reports", icon: BarChart3 },
      ],
    },
    {
      label: "OPERATIONS",
      items: [
        { label: "Automations", href: "/automations", icon: Bot },
        { label: "Approvals", href: "/approvals", icon: CheckCheck },
        { label: "Notifications", href: "/notifications", icon: Bell },
      ],
    },
  ];

  return (
    <aside className="hidden sm:flex flex-col w-[260px] h-screen bg-white border-r border-slate-200/90 shrink-0 select-none">
      {/* Brand Header */}
      <div className="h-16 px-5 flex items-center justify-between border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-[#4F46E5] flex items-center justify-center text-white font-black text-base shadow-sm">
            G
          </div>
          <div>
            <h1 className="text-sm font-bold text-slate-900 tracking-tight leading-none">
              GrowthEngine
            </h1>
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
              MSME Business OS
            </span>
          </div>
        </div>
      </div>

      {/* Navigation list */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
        {groups.map((group) => (
          <div key={group.label}>
            <div className="px-3 mb-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              {group.label}
            </div>
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const Icon = item.icon;
                const isActive = item.href ? pathname === item.href : false;

                if (item.isAI) {
                  return (
                    <button
                      key={item.label}
                      onClick={item.action}
                      className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold text-indigo-900 bg-indigo-50/60 hover:bg-indigo-100/70 border border-indigo-100 transition-colors text-left"
                    >
                      <div className="w-5 h-5 rounded-md bg-ai-gradient flex items-center justify-center text-white">
                        <Icon className="w-3.5 h-3.5" />
                      </div>
                      <span className="flex-1">{item.label}</span>
                      <span className="text-[10px] bg-ai-gradient text-white px-1.5 py-0.5 rounded font-bold">
                        AI
                      </span>
                    </button>
                  );
                }

                return (
                  <Link
                    key={item.label}
                    href={item.href!}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium transition-colors",
                      isActive
                        ? "bg-slate-100 text-[#4F46E5] font-semibold"
                        : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                    )}
                  >
                    <Icon
                      className={cn(
                        "w-4 h-4",
                        isActive ? "text-[#4F46E5] stroke-[2.2]" : "text-slate-400 stroke-[1.8]"
                      )}
                    />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Pinned Bottom User & Store */}
      <div className="p-3 border-t border-slate-100 bg-slate-50/60">
        <div className="flex items-center gap-3 px-3 py-2 rounded-xl bg-white border border-slate-200 shadow-2xs">
          <div className="w-8 h-8 rounded-lg bg-indigo-100 text-[#4F46E5] font-bold text-xs flex items-center justify-center">
            SL
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-slate-800 truncate">
              Sri Lakshmi Enterprises
            </p>
            <p className="text-[10px] text-slate-500 truncate">GST: 33AABCS1429B1ZB</p>
          </div>
          <Link href="/settings" className="text-slate-400 hover:text-slate-600">
            <Settings className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </aside>
  );
}
