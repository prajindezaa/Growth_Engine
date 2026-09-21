import React from "react";
import { ArrowUpRight, ArrowDownRight, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatsCardProps {
  label: string;
  value: string;
  subValue?: string;
  trend?: {
    value: string;
    isPositive?: boolean;
    isNeutral?: boolean;
  };
  icon?: React.ReactNode;
  variant?: "default" | "warning" | "danger" | "success" | "ai";
  onClick?: () => void;
}

export function StatsCard({
  label,
  value,
  subValue,
  trend,
  icon,
  variant = "default",
  onClick,
}: StatsCardProps) {
  const borderColors = {
    default: "border-slate-200/80",
    warning: "border-amber-200 bg-amber-50/20",
    danger: "border-rose-200 bg-rose-50/20",
    success: "border-emerald-200 bg-emerald-50/20",
    ai: "border-purple-200 bg-purple-50/20",
  };

  const valueColors = {
    default: "text-slate-900",
    warning: "text-amber-700",
    danger: "text-rose-700",
    success: "text-emerald-700",
    ai: "text-indigo-900",
  };

  return (
    <div
      onClick={onClick}
      className={cn(
        "bg-white rounded-2xl border p-4 sm:p-5 shadow-[0_1px_3px_rgba(0,0,0,0.03)] transition-all duration-200 flex flex-col justify-between",
        borderColors[variant],
        onClick && "cursor-pointer active:scale-[0.98] hover:shadow-md"
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-slate-500 tracking-wide uppercase">{label}</span>
        {icon && <div className="text-slate-400">{icon}</div>}
      </div>

      <div className="mt-2.5">
        <div className={cn("text-2xl sm:text-3xl font-bold tracking-tight", valueColors[variant])}>
          {value}
        </div>
        {subValue && <div className="text-xs text-slate-500 mt-0.5">{subValue}</div>}
      </div>

      {trend && (
        <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center gap-1.5 text-xs">
          {trend.isNeutral ? (
            <Minus className="w-3.5 h-3.5 text-slate-400" />
          ) : trend.isPositive ? (
            <ArrowUpRight className="w-3.5 h-3.5 text-emerald-600" />
          ) : (
            <ArrowDownRight className="w-3.5 h-3.5 text-rose-600" />
          )}
          <span
            className={cn(
              "font-medium",
              trend.isNeutral
                ? "text-slate-500"
                : trend.isPositive
                ? "text-emerald-600"
                : "text-rose-600"
            )}
          >
            {trend.value}
          </span>
        </div>
      )}
    </div>
  );
}
