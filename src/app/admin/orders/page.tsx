"use client";

import React, { useEffect, useState, Suspense } from "react";
import { useAuth } from "@/context/auth-context";
import { ShoppingCart } from "lucide-react";

export default function AdminOrdersPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
          <ShoppingCart className="w-6 h-6 text-indigo-400" />
          <span>Orders & POS Counter Sales</span>
        </h1>
        <p className="text-xs text-slate-400 mt-0.5">Counter orders and sales order receipts across all active MSMEs</p>
      </div>
      <div className="p-12 text-center text-slate-500 rounded-2xl border border-slate-800 bg-slate-900/60">
        All POS sales orders are synced in real-time under <a href="/admin/invoices" className="text-indigo-400 font-bold underline">Platform Invoices</a>.
      </div>
    </div>
  );
}
