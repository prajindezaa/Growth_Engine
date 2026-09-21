import Link from "next/link";
import { Button } from "@/components/ui/button";
import { AlertCircle, Home, ArrowLeft } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md text-center space-y-6">
        <div className="w-16 h-16 rounded-2xl bg-indigo-50 text-[#4F46E5] flex items-center justify-center mx-auto border border-indigo-100 shadow-xs">
          <AlertCircle className="w-8 h-8" />
        </div>

        <div className="space-y-2">
          <h1 className="text-4xl font-black text-slate-900 tracking-tight">404</h1>
          <h2 className="text-lg font-bold text-slate-800">Page Not Found</h2>
          <p className="text-xs text-slate-500 max-w-xs mx-auto">
            The screen or record you requested could not be located. It may have been moved or archived.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-2 justify-center pt-2">
          <Link href="/">
            <Button className="w-full sm:w-auto font-semibold">
              <Home className="w-4 h-4 mr-2" />
              <span>Back to Dashboard</span>
            </Button>
          </Link>
        </div>

        <p className="text-xs text-slate-400">
          GrowthEngine — Intelligent MSME Business OS
        </p>
      </div>
    </div>
  );
}
