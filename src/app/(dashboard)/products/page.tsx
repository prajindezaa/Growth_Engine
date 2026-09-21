"use client";

import React, { useState } from "react";
import { useProducts } from "@/hooks/use-products";
import { Product } from "@/types";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DetailPanel } from "@/components/ui/detail-panel";
import { useToast } from "@/components/ui/toast";
import { formatIndianCurrency } from "@/lib/utils";
import {
  Search,
  Plus,
  Package,
  Boxes,
  Barcode,
  Tag,
  AlertTriangle,
  PlusCircle,
  MinusCircle,
} from "lucide-react";

export default function ProductsPage() {
  const {
    products,
    categories,
    searchQuery,
    setSearchQuery,
    categoryFilter,
    setCategoryFilter,
    addProduct,
    updateStock,
    lowStockCount,
    totalInventoryValue,
  } = useProducts();

  const { success } = useToast();

  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  // Add Product Form
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [name, setName] = useState("");
  const [sku, setSku] = useState("");
  const [hsn, setHsn] = useState("");
  const [category, setCategory] = useState("Electrical");
  const [costPrice, setCostPrice] = useState("");
  const [sellingPrice, setSellingPrice] = useState("");
  const [stock, setStock] = useState("");
  const [minStockAlert, setMinStockAlert] = useState("10");
  const [unit, setUnit] = useState("Units");

  const handleCreateProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !sellingPrice) return;

    const initialStock = Number(stock) || 0;
    const minAlert = Number(minStockAlert) || 10;
    let status: Product["status"] = "in_stock";
    if (initialStock <= 0) status = "out_of_stock";
    else if (initialStock <= minAlert) status = "low_stock";

    addProduct({
      name,
      sku: sku || `SKU-${Math.floor(1000 + Math.random() * 9000)}`,
      hsn: hsn || "8413",
      category: category || "General",
      stock: initialStock,
      minStockAlert: minAlert,
      unit: unit || "Units",
      costPrice: Number(costPrice) || 0,
      sellingPrice: Number(sellingPrice) || 0,
      gstRate: 18,
      status,
    });

    success(`Item "${name}" created successfully`);
    setIsAddOpen(false);
    setName("");
    setSku("");
    setCostPrice("");
    setSellingPrice("");
    setStock("");
  };

  const handleQuickStockAdjust = (delta: number) => {
    if (!selectedProduct) return;
    const nextStock = Math.max(0, selectedProduct.stock + delta);
    updateStock(selectedProduct.id, nextStock);
    setSelectedProduct((prev) => (prev ? { ...prev, stock: nextStock } : null));
    success(`Stock adjusted for ${selectedProduct.name}: now ${nextStock}`);
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-300">
      
      {/* Page Title & Add Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Products & Inventory
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Stock levels, HSN/GST rates, and unit pricing catalog
          </p>
        </div>

        <Button onClick={() => setIsAddOpen(true)} className="self-start sm:self-auto font-semibold">
          <Plus className="w-4 h-4 mr-2" />
          <span>Add Product</span>
        </Button>
      </div>

      {/* Inventory KPI banner */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-2xs flex flex-wrap items-center justify-between gap-3">
        <div>
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            Total Inventory Valuation
          </span>
          <div className="text-2xl font-extrabold text-slate-900">
            {formatIndianCurrency(totalInventoryValue)}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {lowStockCount > 0 && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 border border-amber-200 text-xs font-semibold text-amber-800">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
              <span>{lowStockCount} items need reordering</span>
            </div>
          )}
        </div>
      </div>

      {/* Search & Category Filter */}
      <div className="flex flex-col sm:flex-row items-center gap-2.5">
        <div className="relative w-full sm:flex-1">
          <Input
            placeholder="Search items by name, SKU or HSN..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            leftIcon={<Search className="w-4 h-4" />}
            className="bg-white"
          />
        </div>

        {/* Category selector */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto py-1">
          <button
            onClick={() => setCategoryFilter("all")}
            className={`px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
              categoryFilter === "all"
                ? "bg-[#4F46E5] text-white shadow-xs"
                : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
            }`}
          >
            All Items
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={`px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                categoryFilter === cat
                  ? "bg-[#4F46E5] text-white shadow-xs"
                  : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Products Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
        {products.map((prod) => (
          <Card
            key={prod.id}
            hoverable
            onClick={() => setSelectedProduct(prod)}
            className="flex flex-col justify-between"
          >
            <div>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h3 className="text-sm font-bold text-slate-900 leading-snug line-clamp-2">
                    {prod.name}
                  </h3>
                  <div className="flex items-center gap-2 mt-1 text-xs text-slate-500">
                    <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-[10px]">
                      {prod.sku}
                    </span>
                    <span>HSN {prod.hsn}</span>
                  </div>
                </div>

                <Badge
                  variant={
                    prod.status === "out_of_stock"
                      ? "danger"
                      : prod.status === "low_stock"
                      ? "warning"
                      : "success"
                  }
                >
                  {prod.status === "out_of_stock"
                    ? "Out of Stock"
                    : prod.status === "low_stock"
                    ? "Low Stock"
                    : "In Stock"}
                </Badge>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-semibold">
                  Selling Price (GST 18%)
                </span>
                <div className="text-base font-extrabold text-slate-900">
                  {formatIndianCurrency(prod.sellingPrice)}
                </div>
              </div>

              <div className="text-right">
                <span className="text-[10px] text-slate-400 uppercase font-semibold">
                  Available Qty
                </span>
                <div
                  className={`text-sm font-black ${
                    prod.stock <= prod.minStockAlert ? "text-amber-600" : "text-slate-800"
                  }`}
                >
                  {prod.stock} {prod.unit}
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Product DetailPanel */}
      <DetailPanel
        isOpen={!!selectedProduct}
        onClose={() => setSelectedProduct(null)}
        title={selectedProduct?.name || "Product Details"}
        subtitle={`SKU: ${selectedProduct?.sku} • Category: ${selectedProduct?.category}`}
        footerActions={
          <div className="flex items-center gap-2 w-full">
            <Button
              variant="secondary"
              className="flex-1"
              onClick={() => handleQuickStockAdjust(-1)}
            >
              <MinusCircle className="w-4 h-4 mr-1.5 text-rose-600" />
              <span>Stock Out (-1)</span>
            </Button>
            <Button
              variant="primary"
              className="flex-1"
              onClick={() => handleQuickStockAdjust(1)}
            >
              <PlusCircle className="w-4 h-4 mr-1.5" />
              <span>Stock In (+1)</span>
            </Button>
          </div>
        }
      >
        {selectedProduct && (
          <div className="space-y-4">
            
            {/* Inventory Status Hero */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">
                Current Inventory Balance
              </span>
              <div className="text-3xl font-black text-slate-900 mt-1">
                {selectedProduct.stock} {selectedProduct.unit}
              </div>
              <p className="text-xs text-slate-600 mt-1">
                Minimum reorder alert threshold: {selectedProduct.minStockAlert} {selectedProduct.unit}
              </p>
            </div>

            {/* Pricing & GST Breakdown */}
            <div className="space-y-2.5 bg-white p-4 rounded-2xl border border-slate-200 text-xs">
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-1">
                Pricing & Taxation
              </h4>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500 font-medium">Selling Price (Base)</span>
                <span className="font-bold text-slate-900">
                  {formatIndianCurrency(selectedProduct.sellingPrice)}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500 font-medium">Purchase / Cost Price</span>
                <span className="font-bold text-slate-900">
                  {formatIndianCurrency(selectedProduct.costPrice)}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500 font-medium">GST Rate</span>
                <span className="font-bold text-indigo-700">{selectedProduct.gstRate}% IGST/CGST</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-500 font-medium">HSN Code</span>
                <span className="font-mono font-semibold text-slate-900">{selectedProduct.hsn}</span>
              </div>
            </div>

            {/* Quick Reorder hint */}
            <div className="p-3.5 rounded-xl border border-indigo-100 bg-indigo-50/50 text-xs text-indigo-900">
              <span className="font-bold">AI Stock Suggestion: </span>
              {selectedProduct.stock <= selectedProduct.minStockAlert
                ? "Stock is critical. You can ask AI Employee to draft a Purchase Order."
                : "Healthy inventory levels. No supplier reorder needed currently."}
            </div>

          </div>
        )}
      </DetailPanel>

      {/* Add Product Drawer */}
      <DetailPanel
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        title="Add Catalog Product"
        subtitle="Register new SKU with selling and cost prices"
        footerActions={
          <div className="flex items-center gap-2 w-full">
            <Button variant="secondary" className="flex-1" onClick={() => setIsAddOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" className="flex-1" onClick={handleCreateProduct}>
              Save Product
            </Button>
          </div>
        }
      >
        <form onSubmit={handleCreateProduct} className="space-y-3.5">
          <Input
            label="Product / Item Name *"
            placeholder="e.g. Submersible Pump 5HP"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="SKU Code"
              placeholder="e.g. PUMP-5HP"
              value={sku}
              onChange={(e) => setSku(e.target.value)}
            />
            <Input
              label="HSN Code"
              placeholder="8413"
              value={hsn}
              onChange={(e) => setHsn(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Selling Price (₹) *"
              type="number"
              placeholder="19800"
              value={sellingPrice}
              onChange={(e) => setSellingPrice(e.target.value)}
              required
            />
            <Input
              label="Purchase Price (₹)"
              type="number"
              placeholder="16200"
              value={costPrice}
              onChange={(e) => setCostPrice(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Initial Stock Qty"
              type="number"
              placeholder="10"
              value={stock}
              onChange={(e) => setStock(e.target.value)}
            />
            <Input
              label="Unit of Measure"
              placeholder="Units, Pcs, Kgs"
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
            />
          </div>
        </form>
      </DetailPanel>

    </div>
  );
}
