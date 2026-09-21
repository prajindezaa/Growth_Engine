"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatIndianCurrency } from "@/lib/utils";
import { ExportService } from "@/lib/services/export";
import { ShoppingBag, Plus, Download } from "lucide-react";
import Link from "next/link";

export default function SalesOrdersPage() {
  const orders = [
    {
      id: "so_01",
      orderNumber: "SO-2026-081",
      customerName: "Ravi Traders",
      date: "2026-09-21",
      deliveryDate: "2026-09-23",
      amount: 48500,
      status: "confirmed",
      itemsSummary: "50 bags UltraTech Cement + 10 switch packs",
    },
    {
      id: "so_02",
      orderNumber: "SO-2026-080",
      customerName: "Balaji Hardware",
      date: "2026-09-20",
      deliveryDate: "2026-09-22",
      amount: 14200,
      status: "dispatched",
      itemsSummary: "20 lengths PVC Pipe 4-inch",
    },
  ];

  return (
    <div className="space-y-5 animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Sales Orders
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Confirmed B2B wholesale purchase orders and dispatch status
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Button
            variant="secondary"
            onClick={() => {
              const csv = ExportService.generateCSV(orders, [
                { header: "Order Number", key: "orderNumber" },
                { header: "Customer Name", key: "customerName" },
                { header: "Date", key: "date" },
                { header: "Delivery Date", key: "deliveryDate" },
                { header: "Amount (₹)", key: "amount" },
                { header: "Status", key: "status" },
              ]);
              ExportService.downloadCSV(csv, `Sales_Orders_${new Date().toISOString().split("T")[0]}`);
            }}
            className="font-semibold text-xs h-9"
          >
            <Download className="w-3.5 h-3.5 mr-1.5" />
            <span>Export CSV</span>
          </Button>

          <Link href="/pos">
            <Button className="font-semibold text-xs h-9">
              <Plus className="w-3.5 h-3.5 mr-1.5" />
              <span>Create Order</span>
            </Button>
          </Link>
        </div>
      </div>

      <div className="space-y-3">
        {orders.map((o) => (
          <Card key={o.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold text-xs text-[#4F46E5]">{o.orderNumber}</span>
                <Badge variant={o.status === "dispatched" ? "success" : "warning"}>
                  {o.status}
                </Badge>
              </div>
              <h3 className="font-bold text-slate-900 text-sm mt-1">{o.customerName}</h3>
              <p className="text-xs text-slate-500">{o.itemsSummary}</p>
            </div>

            <div className="text-right pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
              <span className="text-base font-black text-slate-900 block">{formatIndianCurrency(o.amount)}</span>
              <span className="text-[11px] text-slate-400">Delivery: {o.deliveryDate}</span>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
