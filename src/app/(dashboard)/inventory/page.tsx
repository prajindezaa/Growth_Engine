"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatIndianCurrency } from "@/lib/utils";
import { ExportService } from "@/lib/services/export";
import { Boxes, Plus, Download, ArrowUpRight, ArrowDownLeft } from "lucide-react";
import Link from "next/link";

export default function InventoryMovementsPage() {
  const movements = [
    {
      id: "mov_01",
      date: "2026-09-21 14:30",
      item: "UltraTech Cement 50kg",
      type: "outward",
      qty: 50,
      ref: "Invoice #INV-2026-0891 (Ravi Traders)",
    },
    {
      id: "mov_02",
      date: "2026-09-20 11:15",
      item: "Finolex 2.5 sq mm Copper Wire",
      type: "inward",
      qty: 25,
      ref: "PO-2026-041 (Havells Distributor)",
    },
  ];

  return (
    <div className="space-y-5 animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Inventory & Stock Movements
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Audit log of all stock inward, outward dispatches, and manual adjustments
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Button
            variant="secondary"
            onClick={() => {
              const csv = ExportService.generateCSV(movements, [
                { header: "Date & Time", key: "date" },
                { header: "Item", key: "item" },
                { header: "Type", key: "type" },
                { header: "Quantity", key: "qty" },
                { header: "Reference", key: "ref" },
              ]);
              ExportService.downloadCSV(csv, `Stock_Movements_${new Date().toISOString().split("T")[0]}`);
            }}
            className="font-semibold text-xs h-9"
          >
            <Download className="w-3.5 h-3.5 mr-1.5" />
            <span>Export CSV</span>
          </Button>

          <Link href="/products">
            <Button className="font-semibold text-xs h-9">
              <Plus className="w-3.5 h-3.5 mr-1.5" />
              <span>Stock Adjustment</span>
            </Button>
          </Link>
        </div>
      </div>

      <div className="space-y-3">
        {movements.map((m) => (
          <Card key={m.id} className="p-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold ${
                m.type === "inward" ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"
              }`}>
                {m.type === "inward" ? <ArrowDownLeft className="w-5 h-5" /> : <ArrowUpRight className="w-5 h-5" />}
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-sm">{m.item}</h3>
                <p className="text-xs text-slate-500">{m.ref}</p>
                <p className="text-[10px] text-slate-400 mt-0.5">{m.date}</p>
              </div>
            </div>

            <div className="text-right">
              <span className={`text-base font-black ${m.type === "inward" ? "text-emerald-600" : "text-rose-600"}`}>
                {m.type === "inward" ? `+${m.qty}` : `-${m.qty}`}
              </span>
              <span className="text-[11px] text-slate-400 block uppercase">
                {m.type}
              </span>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
