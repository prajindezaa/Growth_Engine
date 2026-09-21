"use client";

import { useState, useEffect } from "react";
import { Customer } from "@/types";
import { MOCK_CUSTOMERS } from "@/lib/mock-data";
import { supabase } from "@/lib/supabase/client";
import { useAuth } from "@/context/auth-context";

export function useCustomers() {
  const { business } = useAuth();
  const [customers, setCustomers] = useState<Customer[]>(MOCK_CUSTOMERS);
  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "overdue" | "active" | "settled">("all");
  const [isLoading, setIsLoading] = useState(false);

  // Fetch real-time customers from Supabase if table exists
  useEffect(() => {
    async function loadCustomers() {
      setIsLoading(true);
      try {
        let query = supabase.from("customers").select("*").order("name");
        if (business?.id) {
          query = query.eq("business_id", business.id);
        }
        const { data, error } = await query;
        if (data && data.length > 0) {
          const mapped: Customer[] = data.map((c) => ({
            id: c.id,
            name: c.name,
            phone: c.phone,
            city: c.city || "Coimbatore",
            gstin: c.gstin,
            outstandingBalance: Number(c.outstanding_balance) || 0,
            creditLimit: Number(c.credit_limit) || 50000,
            lastActive: c.last_active || "2026-09-21",
            status: c.status || "active",
          }));
          setCustomers(mapped);
        }
      } catch (err) {
        console.warn("Using fallback local customers data:", err);
      } finally {
        setIsLoading(false);
      }
    }
    loadCustomers();
  }, [business?.id]);

  const filteredCustomers = customers.filter((c) => {
    const matchesSearch =
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.phone.includes(searchQuery) ||
      c.city.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;
    if (filter === "all") return true;
    return c.status === filter;
  });

  const addCustomer = async (customerData: Omit<Customer, "id" | "lastActive">) => {
    const tempId = `cust_${Date.now()}`;
    const newCustomer: Customer = {
      ...customerData,
      id: tempId,
      lastActive: new Date().toISOString().split("T")[0],
    };

    setCustomers((prev) => [newCustomer, ...prev]);

    // Save to Supabase in background
    try {
      const { data, error } = await supabase.from("customers").insert([
        {
          ...(business?.id && { business_id: business.id }),
          name: customerData.name,
          phone: customerData.phone,
          city: customerData.city,
          gstin: customerData.gstin,
          outstanding_balance: customerData.outstandingBalance,
          credit_limit: customerData.creditLimit,
          status: customerData.status,
        },
      ]).select().single();

      if (data) {
        setCustomers((prev) => prev.map((c) => (c.id === tempId ? { ...c, id: data.id } : c)));
      }
    } catch (e) {
      console.warn("Supabase insert error (running with local state):", e);
    }

    return newCustomer;
  };

  const updateCustomer = async (id: string, updates: Partial<Customer>) => {
    setCustomers((prev) =>
      prev.map((c) => (c.id === id ? { ...c, ...updates } : c))
    );

    try {
      await supabase
        .from("customers")
        .update({
          ...(updates.outstandingBalance !== undefined && {
            outstanding_balance: updates.outstandingBalance,
          }),
          ...(updates.status !== undefined && { status: updates.status }),
        })
        .eq("id", id);
    } catch (e) {
      console.warn("Supabase update error:", e);
    }
  };

  const totalKhataReceivables = customers.reduce(
    (acc, curr) => acc + (curr.outstandingBalance > 0 ? curr.outstandingBalance : 0),
    0
  );

  const totalOverdueAmount = customers
    .filter((c) => c.status === "overdue")
    .reduce((acc, curr) => acc + curr.outstandingBalance, 0);

  return {
    customers: filteredCustomers,
    rawCustomers: customers,
    searchQuery,
    setSearchQuery,
    filter,
    setFilter,
    addCustomer,
    updateCustomer,
    totalKhataReceivables,
    totalOverdueAmount,
    isLoading,
  };
}
