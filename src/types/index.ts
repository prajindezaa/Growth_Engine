export interface Business {
  id: string;
  name: string;
  tradeType: "retail" | "wholesale" | "distributor" | "manufacturer";
  gstin?: string;
  phone: string;
  state: string;
  city: string;
  currency: string;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email?: string;
  city: string;
  gstin?: string;
  outstandingBalance: number; // positive = they owe us (Khata)
  creditLimit: number;
  lastActive: string;
  status: "active" | "overdue" | "settled";
}

export interface Product {
  id: string;
  name: string;
  sku: string;
  hsn: string;
  category: string;
  stock: number;
  minStockAlert: number;
  unit: string;
  costPrice: number;
  sellingPrice: number;
  gstRate: number; // percentage e.g. 18
  status: "in_stock" | "low_stock" | "out_of_stock";
}

export interface KhataEntry {
  id: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  type: "give_credit" | "got_payment"; // Udhar Diya vs Jama Mila
  amount: number;
  date: string;
  dueDate?: string;
  note: string;
  status: "pending" | "cleared" | "overdue";
}

export interface AIActionProposal {
  id: string;
  type: string;
  route?: string;
  title: string;
  targetEntity: string;
  what: string;
  details: Record<string, string | number>;
  consequences: string;
  isHighRisk?: boolean;
  status: "pending" | "confirmed" | "cancelled";
  auditId?: string;
}

