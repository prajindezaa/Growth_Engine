import React from "react";
import { cn } from "@/lib/utils";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  hoverable?: boolean;
}

export function Card({ className, hoverable = false, children, ...props }: CardProps) {
  return (
    <div
      className={cn(
        "bg-white rounded-2xl border border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.04)] p-4 sm:p-5 transition-all duration-200",
        hoverable && "hover:shadow-md hover:border-slate-300 active:scale-[0.99] cursor-pointer",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
