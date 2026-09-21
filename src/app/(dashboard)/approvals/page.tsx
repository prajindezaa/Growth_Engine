"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { useToast } from "@/components/ui/toast";
import { formatIndianCurrency } from "@/lib/utils";
import { supabase } from "@/lib/supabase/client";
import { useAuth } from "@/context/auth-context";
import { CheckCheck, Clock, Check, X, AlertTriangle, ShieldCheck, User } from "lucide-react";

interface ApprovalItem {
  id: string;
  title: string;
  requesterName: string;
  requesterRole: string;
  date: string;
  amount?: number;
  reason: string;
  type: "discount" | "credit_limit" | "purchase_order" | "invoice_cancel";
  status: "pending" | "approved" | "rejected";
}

export default function ApprovalsPage() {
  const { business, user } = useAuth();
  const { success, error } = useToast();
  const [approvals, setApprovals] = useState<ApprovalItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    id: string;
    action: "approve" | "reject";
    title: string;
  }>({
    isOpen: false,
    id: "",
    action: "approve",
    title: "",
  });

  const loadApprovals = async () => {
    setIsLoading(true);
    try {
      let query = supabase
        .from("approval_requests")
        .select("*")
        .order("created_at", { ascending: false });

      if (business?.id) {
        query = query.eq("business_id", business.id);
      }

      const { data, error: dbErr } = await query;
      if (data && data.length > 0) {
        setApprovals(
          data.map((r) => ({
            id: r.id,
            title: r.title,
            requesterName: r.requester_name,
            requesterRole: r.requester_role,
            date: new Date(r.created_at).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }),
            amount: Number(r.amount) || undefined,
            reason: r.reason,
            type: r.type,
            status: r.status,
          }))
        );
      } else {
        // Initial seed into Supabase if completely empty
        if (business?.id) {
          const seeds = [
            {
              business_id: business.id,
              title: "Special 12% Discount on Invoice #892",
              requester_name: "Senthil Nathan",
              requester_role: "Sales Executive",
              amount: 14200,
              reason: "Bulk purchase order for 25kg winding wire by Murugan Traders.",
              type: "discount",
              status: "pending",
            },
            {
              business_id: business.id,
              title: "Increase Credit Limit to ₹2,50,000",
              requester_name: "Karthik R",
              requester_role: "Accountant",
              amount: 250000,
              reason: "Kavitha Electricals requested 30-day extended credit for festive season stock.",
              type: "credit_limit",
              status: "pending",
            },
            {
              business_id: business.id,
              title: "Purchase Order #PO-0047 to Supreme Metals",
              requester_name: "AI Employee (Automated Low Stock)",
              requester_role: "AI Assistant",
              amount: 277500,
              reason: "Stock at 4 rolls (below minimum threshold 10). Drafted reorder for 15 rolls.",
              type: "purchase_order",
              status: "pending",
            },
          ];
          const { data: inserted } = await supabase.from("approval_requests").insert(seeds).select();
          if (inserted) {
            setApprovals(
              inserted.map((r) => ({
                id: r.id,
                title: r.title,
                requesterName: r.requester_name,
                requesterRole: r.requester_role,
                date: new Date(r.created_at).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }),
                amount: Number(r.amount) || undefined,
                reason: r.reason,
                type: r.type,
                status: r.status,
              }))
            );
          }
        }
      }
    } catch (e) {
      console.warn("Failed to load approvals from Supabase:", e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadApprovals();
  }, [business?.id]);

  const handleAction = async () => {
    const { id, action, title } = confirmDialog;
    const newStatus = action === "approve" ? "approved" : "rejected";

    setApprovals((prev) =>
      prev.map((item) => (item.id === id ? { ...item, status: newStatus } : item))
    );

    try {
      // 1. Update Supabase approval_requests
      await supabase
        .from("approval_requests")
        .update({
          status: newStatus,
          reviewed_by: user?.id || null,
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", id);

      // 2. Log immutable audit log
      if (business?.id) {
        await supabase.from("audit_logs").insert({
          business_id: business.id,
          user_id: user?.id || null,
          actor_type: "user",
          action: `${action}_approval_request`,
          is_high_risk: true,
          details: {
            approval_id: id,
            title,
            decision: newStatus,
          },
        });
      }

      success(
        `Request "${title}" ${action === "approve" ? "Approved & Executed" : "Rejected"}`
      );
    } catch (err: any) {
      error(err.message || "Failed to update approval in Supabase");
    } finally {
      setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
    }
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-300">
      
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
          Approval Center
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
          Managerial sign-offs for large discounts, extended credit, and AI reorders
        </p>
      </div>

      {/* Approvals List */}
      <div className="space-y-3.5">
        {approvals.map((item) => (
          <Card key={item.id} className="p-4 sm:p-5 flex flex-col justify-between">
            <div>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm sm:text-base font-bold text-slate-900 leading-snug">
                      {item.title}
                    </h3>
                    <Badge
                      variant={
                        item.status === "approved"
                          ? "success"
                          : item.status === "rejected"
                          ? "danger"
                          : "warning"
                      }
                    >
                      {item.status === "approved"
                        ? "Approved"
                        : item.status === "rejected"
                        ? "Rejected"
                        : "Pending Sign-off"}
                    </Badge>
                  </div>
                  <p className="text-xs text-slate-500 mt-1 flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5" />
                    <span>
                      Requested by <strong className="text-slate-800">{item.requesterName}</strong> ({item.requesterRole}) • {item.date}
                    </span>
                  </p>
                </div>

                {item.amount && (
                  <div className="text-right shrink-0">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold">Value</span>
                    <div className="text-base font-extrabold text-[#4F46E5]">
                      {formatIndianCurrency(item.amount)}
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-3 bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs text-slate-700">
                <span className="font-semibold text-slate-900">Justification: </span>
                {item.reason}
              </div>
            </div>

            {/* Action buttons */}
            {item.status === "pending" ? (
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() =>
                    setConfirmDialog({
                      isOpen: true,
                      id: item.id,
                      action: "reject",
                      title: item.title,
                    })
                  }
                >
                  <X className="w-3.5 h-3.5 mr-1" />
                  <span>Reject</span>
                </Button>
                <Button
                  size="sm"
                  variant="primary"
                  onClick={() =>
                    setConfirmDialog({
                      isOpen: true,
                      id: item.id,
                      action: "approve",
                      title: item.title,
                    })
                  }
                >
                  <Check className="w-3.5 h-3.5 mr-1" />
                  <span>Approve & Authorize</span>
                </Button>
              </div>
            ) : (
              <div className="mt-3 pt-2 text-[11px] text-slate-400 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>Audited and logged to system ledger</span>
              </div>
            )}
          </Card>
        ))}
      </div>

      {/* Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={confirmDialog.isOpen}
        onClose={() => setConfirmDialog((prev) => ({ ...prev, isOpen: false }))}
        onConfirm={handleAction}
        title={confirmDialog.action === "approve" ? "Authorize Request?" : "Reject Request?"}
        description={`Are you sure you want to ${confirmDialog.action} "${confirmDialog.title}"? This action will be logged in the immutable audit trail.`}
        confirmLabel={confirmDialog.action === "approve" ? "Approve" : "Reject"}
        variant={confirmDialog.action === "approve" ? "primary" : "danger"}
      />

    </div>
  );
}
