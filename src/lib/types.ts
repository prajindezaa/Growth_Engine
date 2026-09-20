// ── Business Types ──

export interface TaxConfig {
  gst_rate: number
  cess_rate: number
  hsn_default: string
  tax_inclusive: boolean
}

export interface PaymentSettings {
  bank_name?: string
  account_number?: string
  ifsc_code?: string
  upi_id?: string
  payment_terms_days?: number
}

export interface Business {
  id: string
  name: string
  address: string | null
  phone: string | null
  email: string | null
  logo_url: string | null
  gstin: string | null
  currency: string
  tax_config: TaxConfig
  invoice_prefix: string
  financial_year_start: number
  number_format: string
  payment_settings: PaymentSettings
  created_by: string
  created_at: string
}

export interface BusinessMember {
  id: string
  business_id: string
  user_id: string
  role: 'owner' | 'admin' | 'manager' | 'staff' | 'viewer'
  joined_at: string
}

// Join type: business_members + businesses
export interface BusinessWithRole {
  business_id: string
  role: 'owner' | 'admin' | 'manager' | 'staff' | 'viewer'
  businesses: Business
}

// Onboarding wizard step state
export interface OnboardingFormData {
  // Step 1: Name
  name: string
  // Step 2: Contact
  address: string
  phone: string
  email: string
  // Step 3: GST & Tax
  gstin: string
  gst_rate: number
  cess_rate: number
  hsn_default: string
  tax_inclusive: boolean
  // Step 4: Preferences
  currency: string
  invoice_prefix: string
  financial_year_start: number
  number_format: string
  // Step 5: Logo (handled separately via file upload)
}

export const DEFAULT_ONBOARDING_DATA: OnboardingFormData = {
  name: '',
  address: '',
  phone: '',
  email: '',
  gstin: '',
  gst_rate: 18,
  cess_rate: 0,
  hsn_default: '',
  tax_inclusive: false,
  currency: 'INR',
  invoice_prefix: 'INV',
  financial_year_start: 4,
  number_format: 'en-IN',
}

// ── Invite ──

export interface Invite {
  id: string
  business_id: string
  email: string
  role: 'admin' | 'manager' | 'staff' | 'viewer'
  invited_by: string
  status: 'pending' | 'accepted' | 'expired'
  token: string
  expires_at: string
  created_at: string
}

// ── Customer ──

export interface Customer {
  id: string
  business_id: string
  name: string
  phone: string | null
  email: string | null
  address: string | null
  gstin: string | null
  state: string | null
  credit_limit: number
  payment_terms: number
  opening_balance: number
  outstanding_balance: number
  customer_type: 'regular' | 'wholesale' | 'distributor'
  notes: string | null
  created_at: string
  updated_at: string
}

// ── Supplier ──

export interface Supplier {
  id: string
  business_id: string
  name: string
  phone: string | null
  email: string | null
  address: string | null
  gstin: string | null
  credit_terms: number
  opening_balance: number
  outstanding_balance: number
  notes: string | null
  created_at: string
  updated_at: string
}

// ── Product ──

export interface Product {
  id: string
  business_id: string
  name: string
  sku: string | null
  barcode: string | null
  category: string | null
  unit: string
  purchase_price: number
  selling_price: number
  tax_rate: number
  current_stock: number
  min_stock: number
  max_stock: number
  supplier_id: string | null
  hsn_sac: string | null
  image_url: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

// ── Stock Movement ──

export interface StockMovement {
  id: string
  business_id: string
  product_id: string
  type: 'in' | 'out' | 'adjustment' | 'transfer'
  quantity: number
  reference_type: string
  reference_id: string | null
  note: string | null
  created_by: string | null
  created_at: string
}

// ── Sales Documents ──

export interface Quotation {
  id: string
  business_id: string
  customer_id: string
  quotation_number: string
  status: 'draft' | 'sent' | 'accepted' | 'rejected' | 'converted'
  subtotal: number
  tax_total: number
  discount_total: number
  grand_total: number
  valid_until: string | null
  notes: string | null
  created_by: string | null
  created_at: string
  updated_at: string
  // Joined
  customers?: { name: string }
}

export interface SalesOrder {
  id: string
  business_id: string
  customer_id: string
  quotation_id: string | null
  order_number: string
  status: 'draft' | 'confirmed' | 'converted' | 'cancelled'
  subtotal: number
  tax_total: number
  discount_total: number
  grand_total: number
  notes: string | null
  created_by: string | null
  created_at: string
  updated_at: string
  customers?: { name: string }
}

export interface Invoice {
  id: string
  business_id: string
  customer_id: string
  sales_order_id: string | null
  invoice_number: string
  status: 'draft' | 'finalized' | 'cancelled'
  subtotal: number
  tax_total: number
  discount_total: number
  grand_total: number
  amount_paid: number
  payment_status: 'unpaid' | 'partial' | 'paid'
  due_date: string | null
  notes: string | null
  created_by: string | null
  created_at: string
  updated_at: string
  customers?: { name: string }
}

export interface LineItem {
  id: string
  business_id: string
  parent_type: 'quotation' | 'sales_order' | 'invoice'
  parent_id: string
  product_id: string | null
  product_name: string
  quantity: number
  unit_price: number
  tax_rate: number
  discount: number
  line_total: number
  sort_order: number
}

// ── Payment ──

export interface Payment {
  id: string
  business_id: string
  invoice_id: string
  amount: number
  method: 'cash' | 'bank' | 'upi' | 'cheque' | 'other'
  reference: string | null
  paid_at: string
  note: string | null
  created_by: string | null
  created_at: string
}

// ── Purchases ──

export interface PurchaseOrder {
  id: string
  business_id: string
  supplier_id: string
  order_number: string
  status: 'draft' | 'confirmed' | 'converted' | 'cancelled'
  subtotal: number
  tax_total: number
  discount_total: number
  grand_total: number
  notes: string | null
  created_by: string | null
  created_at: string
  updated_at: string
  suppliers?: { name: string }
}

export interface Purchase {
  id: string
  business_id: string
  supplier_id: string
  purchase_order_id: string | null
  purchase_number: string
  status: 'draft' | 'finalized' | 'cancelled'
  subtotal: number
  tax_total: number
  discount_total: number
  grand_total: number
  amount_paid: number
  payment_status: 'unpaid' | 'partial' | 'paid'
  notes: string | null
  created_by: string | null
  created_at: string
  updated_at: string
  suppliers?: { name: string }
}
