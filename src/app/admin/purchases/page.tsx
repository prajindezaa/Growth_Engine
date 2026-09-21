"use client";

import React from "react";
import { ShoppingBag } from "lucide-react";

export default function AdminPurchasesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
          <ShoppingBag className="w-6 h-6 text-indigo-400" />
          <span>Purchases & Vendor Payables</span>
        </h1>
        <p className="text-xs text-slate-400 mt-0.5">Raw material and stock purchase invoices from suppliers</p>
      </div>
      <div className="p-12 text-center text-slate-500 rounded-2xl border border-slate-800 bg-slate-900/60">
        All supplier transactions are tracked under the store B2B purchasing pipelines.
      </div>
    </div>
  );
}
