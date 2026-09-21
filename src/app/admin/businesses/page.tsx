"use client";

import React, { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/context/auth-context";
import { Building2, Search, RefreshCw, MapPin, Phone, ShieldCheck, Users, ArrowUpRight } from "lucide-react";

function BusinessesContent() {
  const { session } = useAuth();
  const searchParams = useSearchParams();
  const initialSearch = searchParams.get("search") || "";

  const [businesses, setBusinesses] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState(initialSearch);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  async function fetchBusinesses() {
    setLoading(true);
    try {
      const token = session?.access_token;
      const res = await fetch(`/api/admin/businesses?search=${encodeURIComponent(search)}&page=${page}&limit=15`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) {
        const data = await res.json();
        setBusinesses(data.businesses || []);
        setTotal(data.total || 0);
      }
    } catch (e) {
      console.error("Fetch businesses error:", e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchBusinesses();
  }, [page, session]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchBusinesses();
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
            <Building2 className="w-6 h-6 text-indigo-400" />
            <span>Businesses & Tenant Stores</span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Active MSME businesses, assigned models, locations, and member counts.
          </p>
        </div>

        {/* Search */}
        <form onSubmit={handleSearchSubmit} className="flex items-center gap-2">
          <div className="relative w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search business, city, or GSTIN..."
              className="w-full h-9 pl-9 pr-3 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>
          <button
            type="submit"
            className="px-3 py-2 bg-indigo-600 hover:bg-indigo-500 text-xs font-bold rounded-xl text-white shadow-sm"
          >
            Search
          </button>
        </form>
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/90 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-800/80 text-slate-400 uppercase text-[10px] font-bold border-b border-slate-800 tracking-wider">
              <tr>
                <th className="px-4 py-3">Store Name</th>
                <th className="px-4 py-3">Model & GSTIN</th>
                <th className="px-4 py-3">Location</th>
                <th className="px-4 py-3">Members</th>
                <th className="px-4 py-3">Created</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-indigo-400" />
                    <span>Loading tenant businesses...</span>
                  </td>
                </tr>
              ) : businesses.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500">
                    No businesses found matching your query.
                  </td>
                </tr>
              ) : (
                businesses.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="px-4 py-3.5">
                      <div className="font-bold text-white text-xs">{b.name}</div>
                      <div className="text-[10px] text-slate-500 font-mono mt-0.5">{b.id}</div>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="capitalize font-semibold text-indigo-300 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20 text-[10px]">
                        {b.trade_type || "retail"}
                      </span>
                      <div className="text-[11px] text-slate-400 font-mono mt-1">
                        {b.gstin || "Unregistered (Non-GST)"}
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-1.5 text-slate-300">
                        <MapPin className="w-3 h-3 text-slate-500" />
                        <span>{b.city}, {b.state}</span>
                      </div>
                      <div className="text-[10px] text-slate-500 truncate max-w-[180px] mt-0.5">
                        {b.address || "No street address"}
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-1 text-slate-300 font-semibold">
                        <Users className="w-3 h-3 text-indigo-400" />
                        <span>{b.business_members?.length || 1}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-slate-400 text-[11px]">
                      {new Date(b.created_at).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <button
                        onClick={() => alert(`Inspecting business ecosystem: ${b.name}`)}
                        className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-semibold text-[11px] border border-slate-700 transition-colors"
                      >
                        Inspect
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="px-4 py-3 bg-slate-800/40 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <span>Total: {total} businesses</span>
          <div className="flex items-center gap-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-white"
            >
              Previous
            </button>
            <span>Page {page}</span>
            <button
              disabled={businesses.length < 15}
              onClick={() => setPage((p) => p + 1)}
              className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-white"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AdminBusinessesPage() {
  return (
    <Suspense fallback={<div className="p-6 text-slate-400">Loading businesses...</div>}>
      <BusinessesContent />
    </Suspense>
  );
}
