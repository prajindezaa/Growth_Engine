"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/auth-context";
import { AnalyticsService, SalesSummary, InventorySummary, KhataSummary } from "@/lib/services/analytics";
import { MOCK_KHATA_ENTRIES } from "@/lib/mock-data";

export function useDashboardData() {
  const { business } = useAuth();
  const [timeRange, setTimeRange] = useState<"today" | "week" | "month">("today");

  const [sales, setSales] = useState<SalesSummary>({
    totalSales: 84500,
    invoicesCount: 14,
    averageTicketSize: 6035,
    cashSales: 32000,
    creditSales: 28500,
    upiSales: 24000,
  });

  const [inventory, setInventory] = useState<InventorySummary>({
    totalInventoryValue: 1485000,
    totalProductsCount: 8,
    lowStockCount: 2,
    criticalProducts: [],
  });

  const [khata, setKhata] = useState<KhataSummary>({
    totalReceivables: 184500,
    totalOverdueAmount: 65000,
    topDebtors: [],
  });

  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    async function loadMetrics() {
      setIsLoading(true);
      try {
        const todayStr = new Date().toISOString().split("T")[0];
        const [salesRes, invRes, khataRes] = await Promise.all([
          AnalyticsService.getSalesSummary(business?.id, timeRange === "today" ? todayStr : undefined),
          AnalyticsService.getInventorySummary(business?.id),
          AnalyticsService.getKhataSummary(business?.id),
        ]);

        setSales(salesRes);
        setInventory(invRes);
        setKhata(khataRes);
      } catch (err) {
        console.warn("Failed to load dashboard metrics from Supabase:", err);
      } finally {
        setIsLoading(false);
      }
    }

    loadMetrics();
  }, [business?.id, timeRange]);

  return {
    timeRange,
    setTimeRange,
    isLoading,
    stats: {
      todaySales: sales.totalSales,
      todayInvoicesCount: sales.invoicesCount,
      totalKhataReceivables: khata.totalReceivables,
      totalOverdueAmount: khata.totalOverdueAmount,
      lowStockCount: inventory.lowStockCount,
      activeOrdersCount: 6,
    },
    recentKhata: MOCK_KHATA_ENTRIES,
    topCustomersDue: khata.topDebtors.slice(0, 3),
    criticalProducts: inventory.criticalProducts,
  };
}

