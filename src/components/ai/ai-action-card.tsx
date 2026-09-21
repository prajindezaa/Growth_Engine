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
      className={`mt-3 p-4 rounded-2xl border shadow-sm transition-all duration-200 ${
        isHighRisk
          ? "border-rose-300 bg-gradient-to-br from-rose-50/80 via-white to-amber-50/50"
          : "border-indigo-200/80 bg-gradient-to-br from-indigo-50/70 via-white to-purple-50/50"
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div
            className={`w-6 h-6 rounded-lg flex items-center justify-center text-white shadow-xs ${
              isHighRisk ? "bg-rose-600" : "bg-ai-gradient"
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
          </div>
          <span
            className={`text-xs font-semibold uppercase tracking-wide ${
              isHighRisk ? "text-rose-950 font-bold" : "text-indigo-950"
            }`}
          >
            {isHighRisk ? "⚠️ High-Risk Action Proposal" : "AI Proposed Action"}
          </span>
        </div>
        
        <span
          className={`text-xs px-2.5 py-0.5 rounded-full font-semibold ${
            proposal.status === "confirmed"
              ? "bg-emerald-100 text-emerald-800"
              : proposal.status === "cancelled"
              ? "bg-slate-200 text-slate-700"
              : isHighRisk
              ? "bg-rose-100 text-rose-800"
              : "bg-amber-100 text-amber-800"
          }`}
        >
          {proposal.status === "confirmed"
            ? "Executed & Logged"
            : proposal.status === "cancelled"
            ? "Cancelled"
            : isHighRisk
            ? "Strong Confirmation Required"
            : "Requires Confirmation"}
        </span>
      </div>

      {/* Action Title & Target */}
      <h4 className="mt-2.5 text-sm font-bold text-slate-900 leading-snug">
        {proposal.title}
      </h4>
      <p className="text-xs text-slate-600 mt-1">{proposal.what}</p>

      {/* Structured Details Matrix */}
      <div
        className={`mt-3 bg-white/90 rounded-xl border p-3 space-y-1.5 text-xs ${
          isHighRisk ? "border-rose-200/90" : "border-indigo-100/80"
        }`}
      >
        {Object.entries(proposal.details).map(([key, value]) => (
          <div key={key} className="flex justify-between items-center py-0.5">
            <span className="text-slate-500 font-medium">{key}</span>
            <span className="text-slate-900 font-semibold">{value}</span>
          </div>
        ))}
      </div>

      {/* Clear Consequences Warning */}
      <div className="mt-2.5 flex items-start gap-1.5 text-xs text-slate-600">
        <span
          className={`font-semibold shrink-0 ${
            isHighRisk ? "text-rose-900 font-bold" : "text-indigo-900"
          }`}
        >
          Impact:
        </span>
        <span className="leading-tight">{proposal.consequences}</span>
      </div>

      {/* Strong Confirmation Checkbox for High-Risk Actions */}
      {isPending && isHighRisk && (
        <div className="mt-3 p-2.5 rounded-xl bg-rose-50 border border-rose-200 flex items-center gap-2">
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
            I understand this voids the invoice and restores stock movements permanently.
          </label>
        </div>
      )}

      {/* Explicit Tappable Action Buttons (Confirm before execute) */}
      {isPending ? (
        <div className="mt-4 pt-3 border-t border-slate-200 flex items-center gap-2">
          <Button
            size="sm"
            variant="secondary"
            className="flex-1 text-xs text-slate-600"
            onClick={() => onCancel(proposal.id)}
          >
            <X className="w-3.5 h-3.5 mr-1" />
            Dismiss / Cancel
          </Button>
          <Button
            size="sm"
            variant={isHighRisk ? "destructive" : "ai"}
            disabled={isHighRisk && !highRiskConfirmed}
            className={`flex-1 text-xs font-semibold ${
              isHighRisk && !highRiskConfirmed ? "opacity-50 cursor-not-allowed" : ""
            }`}
            onClick={() => onConfirm(proposal.id)}
          >
            <Check className="w-3.5 h-3.5 mr-1" />
            {isHighRisk ? "Confirm & Void" : "Approve & Run"}
          </Button>

        </div>
      ) : (
        <div className="mt-3 pt-2.5 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <span>Action audit tag: #{proposal.auditId || `AI-${proposal.id.slice(-6)}`}</span>
          <span className="font-medium text-emerald-700">Logged to Audit Trail</span>
        </div>
      )}
    </div>
  );
}

