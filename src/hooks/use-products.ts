"use client";

import { useState, useEffect } from "react";
import { Product } from "@/types";
import { MOCK_PRODUCTS } from "@/lib/mock-data";
import { supabase } from "@/lib/supabase/client";
import { useAuth } from "@/context/auth-context";

export function useProducts() {
  const { business, user } = useAuth();
  const [products, setProducts] = useState<Product[]>(MOCK_PRODUCTS);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [isLoading, setIsLoading] = useState(false);

  // Load live products from Supabase
  useEffect(() => {
    async function loadProducts() {
      setIsLoading(true);
      try {
        let query = supabase.from("products").select("*").order("name");
        if (business?.id) {
          query = query.eq("business_id", business.id);
        }
        const { data, error } = await query;
        if (data && data.length > 0) {
          const mapped: Product[] = data.map((p) => ({
            id: p.id,
            name: p.name,
            sku: p.sku,
            hsn: p.hsn || "8413",
            category: p.category || "General",
            stock: Number(p.stock) || 0,
            minStockAlert: Number(p.min_stock_alert) || 10,
            unit: p.unit || "Units",
            costPrice: Number(p.cost_price) || 0,
            sellingPrice: Number(p.selling_price) || 0,
            gstRate: Number(p.gst_rate) || 18,
            status: p.status || "in_stock",
          }));
          setProducts(mapped);
        }
      } catch (e) {
        console.warn("Using fallback products:", e);
      } finally {
        setIsLoading(false);
      }
    }
    loadProducts();
  }, [business?.id]);

  const categories = Array.from(new Set(products.map((p) => p.category)));

  const filteredProducts = products.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.hsn.includes(searchQuery);

    if (!matchesSearch) return false;
    if (categoryFilter === "all") return true;
    return p.category === categoryFilter;
  });

  const addProduct = async (productData: Omit<Product, "id">) => {
    const tempId = `prod_${Date.now()}`;
    const newProduct: Product = {
      ...productData,
      id: tempId,
    };
    setProducts((prev) => [newProduct, ...prev]);

    try {
      const { data, error } = await supabase.from("products").insert([
        {
          ...(business?.id && { business_id: business.id }),
          name: productData.name,
          sku: productData.sku,
          hsn: productData.hsn,
          category: productData.category,
          stock: productData.stock,
          min_stock_alert: productData.minStockAlert,
          unit: productData.unit,
          cost_price: productData.costPrice,
          selling_price: productData.sellingPrice,
          gst_rate: productData.gstRate,
          status: productData.status,
        },
      ]).select().single();

      if (data) {
        setProducts((prev) => prev.map((p) => (p.id === tempId ? { ...p, id: data.id } : p)));
        
        // Record initial stock movement if initial stock > 0
        if (productData.stock > 0 && business?.id) {
          await supabase.from("stock_movements").insert({
            business_id: business.id,
            product_id: data.id,
            type: "adjustment_audit",
            quantity: productData.stock,
            previous_stock: 0,
            resulting_stock: productData.stock,
            notes: "Opening inventory entry",
            created_by: user?.id || null,
          });
        }
      }
    } catch (e) {
      console.warn("Supabase product insert error:", e);
    }

    return newProduct;
  };

  const updateStock = async (id: string, newStock: number, notes = "Stock adjustment") => {
    const currentProduct = products.find((p) => p.id === id);
    const previousStock = currentProduct ? currentProduct.stock : 0;
    const diff = newStock - previousStock;

    setProducts((prev) =>
      prev.map((p) => {
        if (p.id !== id) return p;
        let status: Product["status"] = "in_stock";
        if (newStock <= 0) status = "out_of_stock";
        else if (newStock <= p.minStockAlert) status = "low_stock";
        return { ...p, stock: newStock, status };
      })
    );

    try {
      let status: Product["status"] = "in_stock";
      if (newStock <= 0) status = "out_of_stock";
      await supabase
        .from("products")
        .update({ stock: newStock, status })
        .eq("id", id);

      // Record atomic movement in stock_movements ledger
      if (business?.id) {
        await supabase.from("stock_movements").insert({
          business_id: business.id,
          product_id: id,
          type: diff >= 0 ? "adjustment_audit" : "adjustment_damaged",
          quantity: diff,
          previous_stock: previousStock,
          resulting_stock: newStock,
          notes: notes,
          created_by: user?.id || null,
        });
      }
    } catch (e) {
      console.warn("Supabase updateStock error:", e);
    }
  };

  const lowStockCount = products.filter(
    (p) => p.status === "low_stock" || p.status === "out_of_stock"
  ).length;

  const totalInventoryValue = products.reduce(
    (acc, p) => acc + p.stock * p.sellingPrice,
    0
  );

  return {
    products: filteredProducts,
    rawProducts: products,
    categories,
    searchQuery,
    setSearchQuery,
    categoryFilter,
    setCategoryFilter,
    addProduct,
    updateStock,
    lowStockCount,
    totalInventoryValue,
    isLoading,
  };
}
