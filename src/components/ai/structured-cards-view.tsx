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
    <div className="mt-2.5 w-full space-y-1.5">
      {title && (
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block px-1">
          {title}
        </span>
      )}
      <div className="space-y-1.5">
        {items.map((item) => (
          <Link
            key={item.id}
            href={item.linkHref || "#"}
            className="flex items-center justify-between p-2.5 rounded-xl bg-white border border-slate-200/90 hover:border-indigo-300 hover:shadow-xs active:scale-[0.99] transition-all text-left"
          >
            <div className="min-w-0 flex-1">
              <h5 className="text-xs font-bold text-slate-900 truncate">{item.title}</h5>
              {item.subtitle && (
                <p className="text-[11px] text-slate-500 truncate mt-0.5">{item.subtitle}</p>
              )}
            </div>

            <div className="flex items-center gap-2 shrink-0 ml-2">
              <div className="text-right">
                {item.primaryValue && (
                  <span className="text-xs font-black text-slate-900 block">
                    {item.primaryValue}
                  </span>
                )}
                {item.badge && (
                  <Badge variant={item.badge.variant} className="text-[9px] px-1.5 py-0">
                    {item.badge.text}
                  </Badge>
                )}
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
