"use client";

import React from "react";
import { Boxes } from "lucide-react";

export default function AdminInventoryPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
          <Boxes className="w-6 h-6 text-indigo-400" />
          <span>Inventory & Stock Ledger</span>
        </h1>
        <p className="text-xs text-slate-400 mt-0.5">Warehouse stock movements, transfers, and threshold alerts</p>
      </div>
      <div className="p-12 text-center text-slate-500 rounded-2xl border border-slate-800 bg-slate-900/60">
        Warehouse balances are live under <a href="/admin/products" className="text-indigo-400 font-bold underline">Platform Products Catalog</a>.
      </div>
    </div>
  );
}
