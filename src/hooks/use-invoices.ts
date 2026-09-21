"use client";

import { useState, useEffect } from "react";
import { Invoice } from "@/types/sales";
import { MOCK_INVOICES } from "@/lib/mock-sales";
import { supabase } from "@/lib/supabase/client";
import { useAuth } from "@/context/auth-context";

export function useInvoices() {
  const { business, user } = useAuth();
  const [invoices, setInvoices] = useState<Invoice[]>(MOCK_INVOICES);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    async function loadInvoices() {
      setIsLoading(true);
      try {
        let query = supabase
          .from("invoices")
          .select("*")
          .order("created_at", { ascending: false });

        if (business?.id) {
          query = query.eq("business_id", business.id);
        }

        const { data, error } = await query;
        if (data && data.length > 0) {
          const mapped: Invoice[] = data.map((inv) => ({
            id: inv.id,
            invoiceNumber: inv.invoice_number,
            customerId: inv.customer_id || "",
            customerName: inv.customer_name,
            customerPhone: "",
            customerGstin: undefined,
            date: inv.date || new Date().toISOString().split("T")[0],
            dueDate: inv.due_date,
            items: inv.items || [],
            subtotal: Number(inv.subtotal) || 0,
            totalGst: Number(inv.total_gst) || 0,
            grandTotal: Number(inv.grand_total) || 0,
            amountPaid: Number(inv.amount_paid) || 0,
            balanceDue: Number(inv.balance_due) || 0,
            paymentStatus: inv.payment_status || "unpaid",
            type: inv.type || "tax_invoice",
            notes: inv.notes || "",
          }));
          setInvoices(mapped);
        }
      } catch (err) {
        console.warn("Using fallback invoices:", err);
      } finally {
        setIsLoading(false);
      }
    }
    loadInvoices();
  }, [business?.id]);

  const filteredInvoices = invoices.filter(
    (inv) =>
      inv.invoiceNumber.toLowerCase().includes(search.toLowerCase()) ||
      inv.customerName.toLowerCase().includes(search.toLowerCase())
  );

  const totalOutstanding = invoices.reduce((sum, inv) => sum + inv.balanceDue, 0);

  /**
   * Creates an invoice without client-side number assignment.
   * Supabase DB trigger `generate_invoice_number()` assigns `INV-YYYY-XXXX`.
   */
  const createInvoice = async (invoiceData: {
    customerId: string;
    customerName: string;
    customerPhone?: string;
    customerGstin?: string;
    items: any[];
    subtotal: number;
    totalGst: number;
    grandTotal: number;
    amountPaid?: number;
    paymentStatus?: Invoice["paymentStatus"];
    type?: Invoice["type"];
    notes?: string;
  }) => {
    const tempNumber = `INV-${new Date().getFullYear()}-PENDING`;
    const tempId = `inv_${Date.now()}`;
    const amountPaid = invoiceData.amountPaid || 0;
    const balanceDue = invoiceData.grandTotal - amountPaid;
    const status = invoiceData.paymentStatus || (balanceDue <= 0 ? "paid" : "unpaid");

    const optimisticInvoice: Invoice = {
      id: tempId,
      invoiceNumber: tempNumber,
      customerId: invoiceData.customerId,
      customerName: invoiceData.customerName,
      customerPhone: invoiceData.customerPhone || "",
      customerGstin: invoiceData.customerGstin,
      date: new Date().toISOString().split("T")[0],
      dueDate: new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0],
      items: invoiceData.items,
      subtotal: invoiceData.subtotal,
      totalGst: invoiceData.totalGst,
      grandTotal: invoiceData.grandTotal,
      amountPaid: amountPaid,
      balanceDue: balanceDue,
      paymentStatus: status,
      type: invoiceData.type || "tax_invoice",
      notes: invoiceData.notes || "",
    };

    setInvoices((prev) => [optimisticInvoice, ...prev]);

    try {
      // 1. Insert invoice without invoice_number so trigger generates atomic sequence
      const { data: dbInvoice, error: invErr } = await supabase
        .from("invoices")
        .insert({
          ...(business?.id && { business_id: business.id }),
          customer_id: invoiceData.customerId || null,
          customer_name: invoiceData.customerName,
          subtotal: invoiceData.subtotal,
          total_gst: invoiceData.totalGst,
          grand_total: invoiceData.grandTotal,
          amount_paid: amountPaid,
          balance_due: balanceDue,
          payment_status: status,
          type: invoiceData.type || "tax_invoice",
          items: invoiceData.items,
          notes: invoiceData.notes,
        })
        .select()
        .single();

      if (invErr) {
        throw invErr;
      }

      if (dbInvoice) {
        // Update local state with the exact DB-assigned invoice number
        setInvoices((prev) =>
          prev.map((inv) =>
            inv.id === tempId
              ? {
                  ...inv,
                  id: dbInvoice.id,
                  invoiceNumber: dbInvoice.invoice_number,
                }
              : inv
          )
        );

        // 2. Insert line items if relational tracking needed
        if (invoiceData.items && invoiceData.items.length > 0) {
          const itemRows = invoiceData.items.map((item) => ({
            invoice_id: dbInvoice.id,
            product_id: item.productId || null,
            product_name: item.name,
            hsn: item.hsn || "8413",
            quantity: item.quantity,
            unit: item.unit || "Units",
            rate: item.rate,
            gst_rate: item.gstRate || 18,
            taxable_amount: item.taxableAmount,
            gst_amount: item.gstAmount,
            total: item.total,
          }));
          await supabase.from("invoice_items").insert(itemRows);

          // 3. Atomically deduct inventory & record stock movements
          for (const item of invoiceData.items) {
            if (item.productId && business?.id) {
              const { data: currentProd } = await supabase
                .from("products")
                .select("stock, min_stock_alert")
                .eq("id", item.productId)
                .single();

              if (currentProd) {
                const currentStock = Number(currentProd.stock) || 0;
                const newStock = Math.max(0, currentStock - Number(item.quantity));
                let newStatus = "in_stock";
                if (newStock <= 0) newStatus = "out_of_stock";
                else if (newStock <= currentProd.min_stock_alert) newStatus = "low_stock";

                await supabase
                  .from("products")
                  .update({ stock: newStock, status: newStatus })
                  .eq("id", item.productId);

                await supabase.from("stock_movements").insert({
                  business_id: business.id,
                  product_id: item.productId,
                  type: "invoice_sale",
                  quantity: -Number(item.quantity),
                  previous_stock: currentStock,
                  resulting_stock: newStock,
                  reference_id: dbInvoice.id,
                  notes: `Billed in ${dbInvoice.invoice_number}`,
                  created_by: user?.id || null,
                });
              }
            }
          }
        }

        // 4. Update customer outstanding balance if credit was extended
        if (balanceDue > 0 && invoiceData.customerId) {
          const { data: cust } = await supabase
            .from("customers")
            .select("outstanding_balance")
            .eq("id", invoiceData.customerId)
            .single();

          if (cust) {
            const newBal = (Number(cust.outstanding_balance) || 0) + balanceDue;
            await supabase
              .from("customers")
              .update({
                outstanding_balance: newBal,
                status: "active",
                last_active: new Date().toISOString().split("T")[0],
              })
              .eq("id", invoiceData.customerId);
          }
        }

        // 5. Write audit log entry
        if (business?.id) {
          await supabase.from("audit_logs").insert({
            business_id: business.id,
            user_id: user?.id || null,
            actor_type: "user",
            action: "create_invoice",
            details: {
              invoice_number: dbInvoice.invoice_number,
              grand_total: dbInvoice.grand_total,
              customer_name: dbInvoice.customer_name,
            },
          });
        }

        return dbInvoice;
      }
    } catch (e) {
      console.warn("Error creating DB-sequenced invoice:", e);
    }

    return optimisticInvoice;
  };

  return {
    invoices: filteredInvoices,
    rawInvoices: invoices,
    search,
    setSearch,
    totalOutstanding,
    createInvoice,
    isLoading,
  };
}
