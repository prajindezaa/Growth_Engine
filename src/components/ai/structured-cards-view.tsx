import React from "react";
import Link from "next/link";
import { StructuredCardItem } from "@/types/ai-routes";
import { Badge } from "@/components/ui/badge";
import { ChevronRight } from "lucide-react";

interface StructuredCardsViewProps {
  title?: string;
  items: StructuredCardItem[];
}

export function StructuredCardsView({ title, items }: StructuredCardsViewProps) {
  if (!items || items.length === 0) return null;

  return (
    <div className="mt-3 w-full space-y-2">
      {title && (
        <div className="flex items-center gap-1.5 px-1">
          <div className="w-1 h-3 rounded-full bg-indigo-600" />
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
            {title}
          </span>
        </div>
      )}
      <div className="space-y-1.5">
        {items.map((item) => (
          <Link
            key={item.id}
            href={item.linkHref || "#"}
            className="group flex items-center justify-between p-3 rounded-xl bg-white/90 hover:bg-white border border-slate-200/80 hover:border-indigo-300 shadow-xs hover:shadow-md active:scale-[0.99] transition-all duration-200 text-left"
          >
            <div className="min-w-0 flex-1">
              <h5 className="text-xs font-bold text-slate-900 group-hover:text-indigo-600 transition-colors truncate">
                {item.title}
              </h5>
              {item.subtitle && (
                <p className="text-[11px] text-slate-500 truncate mt-0.5 font-normal">
                  {item.subtitle}
                </p>
              )}
            </div>

            <div className="flex items-center gap-2.5 shrink-0 ml-3">
              <div className="text-right">
                {item.primaryValue && (
                  <span className="text-xs font-black text-slate-900 block font-mono">
                    {item.primaryValue}
                  </span>
                )}
                {item.badge && (
                  <Badge variant={item.badge.variant} className="text-[9px] px-2 py-0.5 rounded-md font-semibold">
                    {item.badge.text}
                  </Badge>
                )}
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 group-hover:translate-x-0.5 transition-all" />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
