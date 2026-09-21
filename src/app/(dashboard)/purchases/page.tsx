"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatIndianCurrency } from "@/lib/utils";
import { ExportService } from "@/lib/services/export";
import { Truck, Plus, Download } from "lucide-react";
import Link from "next/link";

export default function PurchasesPage() {
  const purchases = [
    {
      id: "po_01",
      poNumber: "PO-2026-042",
      supplierName: "South India Cement Corp",
      date: "2026-09-19",
      amount: 192500,
      status: "received",
      item: "500 bags UltraTech Cement",
    },
    {
      id: "po_02",
      poNumber: "PO-2026-043",
      supplierName: "Supreme Polymers Ltd",
      date: "2026-09-21",
      amount: 63000,
      status: "pending_delivery",
      item: "120 lengths PVC Pipe 4-inch",
    },
  ];

  return (
    <div className="space-y-5 animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Purchase Orders & Bills
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Vendor procurement bills, input tax credits (ITC), and material inward
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Button
            variant="secondary"
            onClick={() => {
              const csv = ExportService.generateCSV(purchases, [
                { header: "PO Number", key: "poNumber" },
                { header: "Supplier", key: "supplierName" },
                { header: "Date", key: "date" },
                { header: "Item Description", key: "item" },
                { header: "Total Amount (₹)", key: "amount" },
                { header: "Status", key: "status" },
              ]);
              ExportService.downloadCSV(csv, `Purchases_${new Date().toISOString().split("T")[0]}`);
            }}
            className="font-semibold text-xs h-9"
          >
            <Download className="w-3.5 h-3.5 mr-1.5" />
            <span>Export CSV</span>
          </Button>

          <Link href="/suppliers">
            <Button className="font-semibold text-xs h-9">
              <Plus className="w-3.5 h-3.5 mr-1.5" />
              <span>Record Purchase</span>
            </Button>
          </Link>
        </div>
      </div>

      <div className="space-y-3">
        {purchases.map((p) => (
          <Card key={p.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold text-xs text-[#4F46E5]">{p.poNumber}</span>
                <Badge variant={p.status === "received" ? "success" : "warning"}>
                  {p.status === "received" ? "Goods Inwarded" : "Expected Delivery"}
                </Badge>
              </div>
              <h3 className="font-bold text-slate-900 text-sm mt-1">{p.supplierName}</h3>
              <p className="text-xs text-slate-500">{p.item}</p>
            </div>

            <div className="text-right pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
              <span className="text-base font-black text-slate-900 block">{formatIndianCurrency(p.amount)}</span>
              <span className="text-[11px] text-slate-400">Date: {p.date}</span>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
