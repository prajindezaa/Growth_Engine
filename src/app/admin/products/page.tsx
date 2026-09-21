"use client";

import React, { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/context/auth-context";
import { Package, Search, RefreshCw } from "lucide-react";

function ProductsContent() {
  const { session } = useAuth();
  const [products, setProducts] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  async function fetchProducts() {
    setLoading(true);
    try {
      const token = session?.access_token;
      const res = await fetch(`/api/admin/products?search=${encodeURIComponent(search)}&page=${page}&limit=15`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) {
        const data = await res.json();
        setProducts(data.products || []);
        setTotal(data.total || 0);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchProducts();
  }, [page, session]);

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
            <Package className="w-6 h-6 text-indigo-400" />
            <span>Products Catalog</span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">Platform-wide SKUs across all tenant stores</p>
        </div>

        <form onSubmit={(e) => { e.preventDefault(); setPage(1); fetchProducts(); }} className="flex items-center gap-2">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search product, SKU..."
            className="w-64 h-9 px-3 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white"
          />
          <button type="submit" className="px-3 py-2 bg-indigo-600 rounded-xl text-xs font-bold text-white">Search</button>
        </form>
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-900/90 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-800/80 text-slate-400 uppercase text-[10px] font-bold border-b border-slate-800 tracking-wider">
              <tr>
                <th className="px-4 py-3">Product</th>
                <th className="px-4 py-3">SKU & HSN</th>
                <th className="px-4 py-3">Store</th>
                <th className="px-4 py-3">Price</th>
                <th className="px-4 py-3">Stock</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                <tr><td colSpan={6} className="py-8 text-center text-slate-500">Loading products...</td></tr>
              ) : products.length === 0 ? (
                <tr><td colSpan={6} className="py-8 text-center text-slate-500">No products found.</td></tr>
              ) : (
                products.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-800/40">
                    <td className="px-4 py-3 font-semibold text-white">{p.name}</td>
                    <td className="px-4 py-3 font-mono text-[11px] text-slate-400">{p.sku} • HSN: {p.hsn || "8413"}</td>
                    <td className="px-4 py-3 text-indigo-400">{p.businesses?.name || "MSME Store"}</td>
                    <td className="px-4 py-3 font-bold text-white">₹{p.selling_price}</td>
                    <td className="px-4 py-3 font-semibold text-slate-200">{p.stock} {p.unit || "Units"}</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        {p.status || "in_stock"}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default function AdminProductsPage() {
  return (
    <Suspense fallback={<div className="p-6 text-slate-400">Loading products...</div>}>
      <ProductsContent />
    </Suspense>
  );
}
