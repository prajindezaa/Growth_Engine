export interface InvoiceItem {
  id: string;
  productId: string;
  name: string;
  hsn: string;
  quantity: number;
  unit: string;
  rate: number;
  gstRate: number;
  taxableAmount: number;
  gstAmount: number;
  total: number;
}

export interface Invoice {
  id: string;
  invoiceNumber: string; // e.g. INV-2026-0891
  customerId: string;
  customerName: string;
  customerPhone: string;
  customerGstin?: string;
  date: string;
  dueDate: string;
  items: InvoiceItem[];
  subtotal: number;
  totalGst: number;
  grandTotal: number;
  amountPaid: number;
  balanceDue: number;
  paymentStatus: "paid" | "partial" | "unpaid" | "overdue";
  type: "tax_invoice" | "quotation" | "sales_order" | "pos_receipt";
  notes?: string;
}

export interface Supplier {
  id: string;
  name: string;
  contactPerson: string;
  phone: string;
  city: string;
  gstin?: string;
  outstandingPayable: number; // what WE owe the supplier
  category: string;
}

export interface PurchaseRecord {
  id: string;
  billNumber: string;
  supplierId: string;
  supplierName: string;
  date: string;
  grandTotal: number;
  status: "received" | "pending" | "partial";
  itemsCount: number;
}
