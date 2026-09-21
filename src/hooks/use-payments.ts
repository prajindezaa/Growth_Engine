"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase/client";
import { useAuth } from "@/context/auth-context";

export interface PaymentRecord {
  id: string;
  businessId: string;
  partyType: "customer" | "supplier";
  partyId: string;
  partyName: string;
  paymentType: "credit_issued" | "payment_received" | "payment_made";
  amount: number;
  paymentMethod: "cash" | "upi" | "bank_transfer" | "cheque" | "credit_note";
  invoiceId?: string;
  date: string;
  referenceNumber?: string;
  notes?: string;
  createdAt: string;
}

export function usePayments() {
  const { business, user } = useAuth();
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const loadPayments = async () => {
    setIsLoading(true);
    try {
      let query = supabase
        .from("payments")
        .select("*")
        .order("created_at", { ascending: false });

      if (business?.id) {
        query = query.eq("business_id", business.id);
      }

      const { data, error } = await query;
      if (data) {
        const mapped: PaymentRecord[] = data.map((p) => ({
          id: p.id,
          businessId: p.business_id,
          partyType: p.party_type,
          partyId: p.party_id,
          partyName: p.party_name,
          paymentType: p.payment_type,
          amount: Number(p.amount) || 0,
          paymentMethod: p.payment_method || "upi",
          invoiceId: p.invoice_id,
          date: p.date,
          referenceNumber: p.reference_number,
          notes: p.notes,
          createdAt: p.created_at,
        }));
        setPayments(mapped);
      }
    } catch (e) {
      console.warn("Failed to load payments:", e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadPayments();
  }, [business?.id]);

  /**
   * Record unified payment / khata ledger entry
   * - If partyType is customer:
   *     - credit_issued (Udhar Diya) increases customer.outstanding_balance
   *     - payment_received (Jama Mila) decreases customer.outstanding_balance
   * - If partyType is supplier:
   *     - payment_made decreases supplier.outstanding_payable
   */
  const recordPayment = async (input: {
    partyType: "customer" | "supplier";
    partyId: string;
    partyName: string;
    paymentType: "credit_issued" | "payment_received" | "payment_made";
    amount: number;
    paymentMethod?: "cash" | "upi" | "bank_transfer" | "cheque" | "credit_note";
    invoiceId?: string;
    notes?: string;
    referenceNumber?: string;
  }) => {
    const tempId = `pay_${Date.now()}`;
    const newRecord: PaymentRecord = {
      id: tempId,
      businessId: business?.id || "",
      partyType: input.partyType,
      partyId: input.partyId,
      partyName: input.partyName,
      paymentType: input.paymentType,
      amount: input.amount,
      paymentMethod: input.paymentMethod || "upi",
      invoiceId: input.invoiceId,
      date: new Date().toISOString().split("T")[0],
      referenceNumber: input.referenceNumber,
      notes: input.notes,
      createdAt: new Date().toISOString(),
    };

    setPayments((prev) => [newRecord, ...prev]);

    try {
      // 1. Insert into unified payments table
      const { data: dbPayment, error: payErr } = await supabase
        .from("payments")
        .insert({
          ...(business?.id && { business_id: business.id }),
          party_type: input.partyType,
          party_id: input.partyId,
          party_name: input.partyName,
          payment_type: input.paymentType,
          amount: input.amount,
          payment_method: input.paymentMethod || "upi",
          invoice_id: input.invoiceId || null,
          date: new Date().toISOString().split("T")[0],
          reference_number: input.referenceNumber || null,
          notes: input.notes || null,
        })
        .select()
        .single();

      if (payErr) throw payErr;

      // 2. Adjust Customer balance
      if (input.partyType === "customer") {
        const { data: cust } = await supabase
          .from("customers")
          .select("outstanding_balance")
          .eq("id", input.partyId)
          .single();

        if (cust) {
          const currentBal = Number(cust.outstanding_balance) || 0;
          const delta = input.paymentType === "credit_issued" ? input.amount : -input.amount;
          const newBal = Math.max(0, currentBal + delta);

          await supabase
            .from("customers")
            .update({
              outstanding_balance: newBal,
              status: newBal > 0 ? "active" : "settled",
              last_active: new Date().toISOString().split("T")[0],
            })
            .eq("id", input.partyId);
        }
      }

      // 3. Adjust Supplier balance
      if (input.partyType === "supplier") {
        const { data: sup } = await supabase
          .from("suppliers")
          .select("outstanding_payable")
          .eq("id", input.partyId)
          .single();

        if (sup) {
          const currentPayable = Number(sup.outstanding_payable) || 0;
          const newPayable = Math.max(0, currentPayable - input.amount);

          await supabase
            .from("suppliers")
            .update({ outstanding_payable: newPayable })
            .eq("id", input.partyId);
        }
      }

      // 4. Record Audit Log
      if (business?.id) {
        await supabase.from("audit_logs").insert({
          business_id: business.id,
          user_id: user?.id || null,
          actor_type: "user",
          action: `record_${input.paymentType}`,
          details: {
            amount: input.amount,
            party_name: input.partyName,
            payment_method: input.paymentMethod,
          },
        });
      }

      return dbPayment;
    } catch (err) {
      console.warn("Error recording unified payment:", err);
    }
  };

  return {
    payments,
    recordPayment,
    refreshPayments: loadPayments,
    isLoading,
  };
}
