"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";
import Link from "next/link";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Application runtime error:", error);
  }, [error]);

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md text-center space-y-6">
        <div className="w-16 h-16 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto border border-rose-100 shadow-xs">
          <AlertTriangle className="w-8 h-8" />
        </div>

        <div className="space-y-2">
          <h1 className="text-xl font-bold text-slate-900">Something went wrong</h1>
          <p className="text-xs text-slate-500 max-w-xs mx-auto">
            An unexpected error occurred while processing this action. Your business records remain safe in Supabase.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-2 justify-center pt-2">
          <Button onClick={() => reset()} className="w-full sm:w-auto font-semibold">
            <RefreshCw className="w-4 h-4 mr-2" />
            <span>Try Again</span>
          </Button>
          <Link href="/">
            <Button variant="secondary" className="w-full sm:w-auto font-semibold">
              <Home className="w-4 h-4 mr-2" />
              <span>Go to Dashboard</span>
            </Button>
          </Link>
        </div>

        <p className="text-xs text-slate-400">
          GrowthEngine — Continuous MSME Reliability
        </p>
      </div>
    </div>
  );
}
