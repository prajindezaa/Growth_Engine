"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, ShoppingCart, BookOpen, Sparkles, MoreHorizontal } from "lucide-react";

interface MobileBottomNavProps {
  onOpenAI: () => void;
}

export function MobileBottomNav({ onOpenAI }: MobileBottomNavProps) {
  const pathname = usePathname();

  const navItems = [
    { label: "Dashboard", href: "/", icon: LayoutDashboard },
    { label: "POS", href: "/pos", icon: ShoppingCart },
    { label: "Khata", href: "/khata", icon: BookOpen },
    { label: "AI Employee", action: onOpenAI, icon: Sparkles, isAI: true },
    { label: "More", href: "/more", icon: MoreHorizontal },
  ];

  return (
    <nav className="sm:hidden fixed bottom-0 inset-x-0 bg-white/95 backdrop-blur-md border-t border-slate-200 safe-bottom z-30 shadow-[0_-4px_12px_rgba(0,0,0,0.03)]">
      <div className="grid grid-cols-5 h-16 items-center px-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = item.href ? pathname === item.href : false;

          if (item.isAI) {
            return (
              <button
                key={item.label}
                onClick={item.action}
                className="flex flex-col items-center justify-center h-full gap-1 active:scale-95 transition-transform"
              >
                <div className="w-8 h-8 rounded-xl bg-ai-gradient flex items-center justify-center text-white shadow-xs">
                  <Icon className="w-4 h-4" />
                </div>
                <span className="text-[10px] font-bold text-indigo-900 tracking-tight">
                  {item.label}
                </span>
              </button>
            );
          }

          return (
            <Link
              key={item.label}
              href={item.href!}
              className={`flex flex-col items-center justify-center h-full gap-1 active:scale-95 transition-all ${
                isActive ? "text-[#4F46E5] font-semibold" : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <Icon className={`w-5 h-5 ${isActive ? "stroke-[2.3]" : "stroke-[1.8]"}`} />
              <span className="text-[11px] tracking-tight">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
