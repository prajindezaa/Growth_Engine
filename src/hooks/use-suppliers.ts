"use client";

import { useState, useEffect } from "react";
import { Supplier } from "@/types/sales";
import { MOCK_SUPPLIERS } from "@/lib/mock-sales";
import { supabase } from "@/lib/supabase/client";
import { useAuth } from "@/context/auth-context";

export function useSuppliers() {
  const { business } = useAuth();
  const [suppliers, setSuppliers] = useState<Supplier[]>(MOCK_SUPPLIERS);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    async function loadSuppliers() {
      setIsLoading(true);
      try {
        let query = supabase.from("suppliers").select("*").order("name");
        if (business?.id) {
          query = query.eq("business_id", business.id);
        }
        const { data, error } = await query;
        if (data && data.length > 0) {
          const mapped: Supplier[] = data.map((s) => ({
            id: s.id,
            name: s.name,
            contactPerson: s.contact_person || "",
            phone: s.phone,
            city: s.city || "",
            gstin: s.gstin || undefined,
            outstandingPayable: Number(s.outstanding_payable) || 0,
            category: s.category || "Raw Materials",
          }));
          setSuppliers(mapped);
        }
      } catch (err) {
        console.warn("Using fallback suppliers data:", err);
      } finally {
        setIsLoading(false);
      }
    }
    loadSuppliers();
  }, [business?.id]);

  const filteredSuppliers = suppliers.filter(
    (s) =>
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.city.toLowerCase().includes(search.toLowerCase())
  );

  const totalPayable = suppliers.reduce((sum, s) => sum + s.outstandingPayable, 0);

  const addSupplier = async (supplierData: Omit<Supplier, "id" | "outstandingPayable">) => {
    const tempId = `sup_${Date.now()}`;
    const newSup: Supplier = {
      ...supplierData,
      id: tempId,
      outstandingPayable: 0,
    };
    setSuppliers((prev) => [newSup, ...prev]);

    try {
      const { data, error } = await supabase.from("suppliers").insert({
        ...(business?.id && { business_id: business.id }),
        name: supplierData.name,
        contact_person: supplierData.contactPerson,
        phone: supplierData.phone,
        city: supplierData.city,
        category: supplierData.category,
        gstin: supplierData.gstin || null,
        outstanding_payable: 0,
      }).select().single();

      if (data) {
        setSuppliers((prev) => prev.map((s) => (s.id === tempId ? { ...s, id: data.id } : s)));
      }
    } catch (e) {
      console.warn("Supabase supplier insert error:", e);
    }

    return newSup;
  };

  return {
    suppliers: filteredSuppliers,
    rawSuppliers: suppliers,
    search,
    setSearch,
    totalPayable,
    addSupplier,
    isLoading,
  };
}
