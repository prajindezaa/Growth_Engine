"use client";

import React from "react";
import { TrendingUp } from "lucide-react";

export default function AdminSalesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
          <TrendingUp className="w-6 h-6 text-emerald-400" />
          <span>Sales & Revenue Stream</span>
        </h1>
        <p className="text-xs text-slate-400 mt-0.5">Aggregated platform cash, UPI, and invoice turnovers</p>
      </div>
      <div className="p-12 text-center text-slate-500 rounded-2xl border border-slate-800 bg-slate-900/60">
        Sales ledger records are automatically reconciled via <a href="/admin/invoices" className="text-indigo-400 font-bold underline">Platform Invoices</a> and POS checkouts.
      </div>
    </div>
  );
}
