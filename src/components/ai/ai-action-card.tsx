"use client";

import React from "react";
import { Sparkles, Check, X, ArrowRight } from "lucide-react";
import { AIActionProposal } from "@/types";
import { Button } from "@/components/ui/button";

interface AIActionCardProps {
  proposal: AIActionProposal;
  onConfirm: (id: string) => void;
  onCancel: (id: string) => void;
}

export function AIActionCard({ proposal, onConfirm, onCancel }: AIActionCardProps) {
  const isPending = proposal.status === "pending";
  const isHighRisk = proposal.isHighRisk || proposal.type === "cancel_invoice";
  const [highRiskConfirmed, setHighRiskConfirmed] = React.useState(false);

  return (
    <div
      className={`mt-3 p-4 sm:p-5 rounded-2xl border shadow-sm transition-all duration-300 ${
        isHighRisk
          ? "border-rose-200 bg-gradient-to-br from-rose-50/90 via-white to-amber-50/40 shadow-rose-100/50"
          : "border-indigo-100 bg-gradient-to-br from-indigo-50/80 via-white to-purple-50/40 shadow-indigo-100/40"
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div
            className={`w-7 h-7 rounded-xl flex items-center justify-center text-white shadow-xs ${
              isHighRisk ? "bg-gradient-to-br from-rose-600 to-red-700" : "bg-ai-gradient"
            }`}
          >
            <Sparkles className="w-4 h-4" />
          </div>
          <span
            className={`text-xs font-bold uppercase tracking-wider ${
              isHighRisk ? "text-rose-900" : "text-indigo-900"
            }`}
          >
            {isHighRisk ? "⚠️ High-Risk Action" : "AI Proposed Action"}
          </span>
        </div>
        
        <span
          className={`text-[11px] px-2.5 py-1 rounded-full font-bold shadow-2xs ${
            proposal.status === "confirmed"
              ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
              : proposal.status === "cancelled"
              ? "bg-slate-100 text-slate-600 border border-slate-200"
              : isHighRisk
              ? "bg-rose-100 text-rose-800 border border-rose-200 animate-pulse"
              : "bg-amber-100 text-amber-800 border border-amber-200"
          }`}
        >
          {proposal.status === "confirmed"
            ? "✓ Executed & Logged"
            : proposal.status === "cancelled"
            ? "✕ Dismissed"
            : isHighRisk
            ? "Requires Confirmation"
            : "Review & Confirm"}
        </span>
      </div>

      {/* Action Title & Target */}
      <h4 className="mt-3 text-sm font-bold text-slate-900 leading-snug">
        {proposal.title}
      </h4>
      <p className="text-xs text-slate-600 mt-1 leading-relaxed">{proposal.what}</p>

      {/* Structured Details Matrix */}
      <div
        className={`mt-3.5 bg-white/95 backdrop-blur-xs rounded-xl border p-3.5 space-y-2 text-xs shadow-2xs ${
          isHighRisk ? "border-rose-200/80" : "border-indigo-100/90"
        }`}
      >
        {Object.entries(proposal.details).map(([key, value]) => (
          <div key={key} className="flex justify-between items-center py-0.5 border-b border-slate-50 last:border-0">
            <span className="text-slate-500 font-medium capitalize">{key.replace(/_/g, " ")}</span>
            <span className="text-slate-900 font-semibold font-mono text-right ml-2">{value}</span>
          </div>
        ))}
      </div>

      {/* Clear Consequences Warning */}
      <div className={`mt-3 p-2.5 rounded-xl flex items-start gap-2 text-xs ${
        isHighRisk ? "bg-rose-100/70 border border-rose-200/80 text-rose-900" : "bg-indigo-50/70 border border-indigo-100 text-indigo-950"
      }`}>
        <span className="font-bold shrink-0">Impact:</span>
        <span className="leading-tight">{proposal.consequences}</span>
      </div>

      {/* Strong Confirmation Checkbox for High-Risk Actions */}
      {isPending && isHighRisk && (
        <div className="mt-3 p-3 rounded-xl bg-rose-50/80 border border-rose-200 flex items-center gap-2.5">
          <input
            type="checkbox"
            id={`high-risk-check-${proposal.id}`}
            checked={highRiskConfirmed}
            onChange={(e) => setHighRiskConfirmed(e.target.checked)}
            className="w-4 h-4 rounded text-rose-600 focus:ring-rose-500 border-rose-300 cursor-pointer"
          />
          <label
            htmlFor={`high-risk-check-${proposal.id}`}
            className="text-xs font-semibold text-rose-900 cursor-pointer select-none leading-snug"
          >
            I understand this action modifies ledger/permissions and cannot be undone.
          </label>
        </div>
      )}

      {/* Explicit Tappable Action Buttons (Confirm before execute) */}
      {isPending ? (
        <div className="mt-4 pt-3 border-t border-slate-200/80 flex items-center gap-2.5">
          <Button
            size="sm"
            variant="secondary"
            className="flex-1 text-xs font-semibold text-slate-700 h-10 rounded-xl"
            onClick={() => onCancel(proposal.id)}
          >
            <X className="w-3.5 h-3.5 mr-1 text-slate-500" />
            Dismiss / Cancel
          </Button>
          <Button
            size="sm"
            variant={isHighRisk ? "destructive" : "ai"}
            disabled={isHighRisk && !highRiskConfirmed}
            className={`flex-1 text-xs font-bold h-10 rounded-xl shadow-sm ${
              isHighRisk && !highRiskConfirmed ? "opacity-40 cursor-not-allowed" : ""
            }`}
            onClick={() => onConfirm(proposal.id)}
          >
            <Check className="w-3.5 h-3.5 mr-1" />
            {isHighRisk ? "Confirm & Execute" : "Approve & Run"}
          </Button>
        </div>
      ) : (
        <div className="mt-3 pt-2.5 border-t border-slate-200/60 flex items-center justify-between text-xs text-slate-500">
          <span className="font-mono text-[11px]">Audit Tag: #{proposal.auditId || `AI-${proposal.id.slice(-6)}`}</span>
          <span className="font-semibold text-emerald-700 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            Recorded to Audit Trail
          </span>
        </div>
      )}
    </div>
  );
}

