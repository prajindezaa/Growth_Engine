// ── 7-Role System for GrowthEngine ──

export const ROLES = [
  'owner',
  'admin',
  'manager',
  'sales',
  'accountant',
  'delivery',
  'cashier',
] as const

export type Role = (typeof ROLES)[number]

export const ROLE_LABELS: Record<Role, string> = {
  owner: 'Owner',
  admin: 'Admin',
  manager: 'Manager',
  sales: 'Sales',
  accountant: 'Accountant',
  delivery: 'Delivery',
  cashier: 'Cashier',
}

export const ROLE_DESCRIPTIONS: Record<Role, string> = {
  owner: 'Full control over the business, billing, and ownership.',
  admin: 'Full management of operations, team invites, and business data.',
  manager: 'Manages sales, purchases, inventory, customers, and suppliers.',
  sales: 'Creates quotations, sales orders, invoices, and accesses customer data.',
  accountant: 'Full access to financial records, invoices, payments, and accounts.',
  delivery: 'View order delivery details, customer contacts, and dispatch status.',
  cashier: 'Fast counter sales, POS checkout, and records customer payments.',
}

export const ROLE_COLORS: Record<Role, { bg: string; text: string; border?: string }> = {
  owner: { bg: 'rgba(6, 182, 212, 0.12)', text: 'var(--ge-accent)', border: 'rgba(6, 182, 212, 0.3)' },
  admin: { bg: 'rgba(139, 92, 246, 0.12)', text: '#a78bfa', border: 'rgba(139, 92, 246, 0.3)' },
  manager: { bg: 'rgba(52, 211, 153, 0.12)', text: '#34d399', border: 'rgba(52, 211, 153, 0.3)' },
  sales: { bg: 'rgba(59, 130, 246, 0.12)', text: '#60a5fa', border: 'rgba(59, 130, 246, 0.3)' },
  accountant: { bg: 'rgba(245, 158, 11, 0.12)', text: '#fbbf24', border: 'rgba(245, 158, 11, 0.3)' },
  delivery: { bg: 'rgba(236, 72, 153, 0.12)', text: '#f472b6', border: 'rgba(236, 72, 153, 0.3)' },
  cashier: { bg: 'rgba(20, 184, 166, 0.12)', text: '#2dd4bf', border: 'rgba(20, 184, 166, 0.3)' },
}

// Roles that can be assigned via invite (owner cannot be assigned)
export const ASSIGNABLE_ROLES: Role[] = [
  'admin',
  'manager',
  'sales',
  'accountant',
  'delivery',
  'cashier',
]

// ── Granular Permission Checks ──

// Team management (invites, member roles)
export function canManageTeam(role: Role): boolean {
  return role === 'owner' || role === 'admin'
}

// Business settings & subscription
export function canEditSettings(role: Role): boolean {
  return role === 'owner' || role === 'admin'
}

// Sales (quotations, sales orders, invoices)
export function canAccessSales(role: Role): boolean {
  return (
    role === 'owner' ||
    role === 'admin' ||
    role === 'manager' ||
    role === 'sales' ||
    role === 'accountant' ||
    role === 'cashier'
  )
}

export function canCreateSales(role: Role): boolean {
  return (
    role === 'owner' ||
    role === 'admin' ||
    role === 'manager' ||
    role === 'sales' ||
    role === 'cashier'
  )
}

// Purchases (purchase orders, purchases from suppliers)
export function canAccessPurchases(role: Role): boolean {
  return (
    role === 'owner' ||
    role === 'admin' ||
    role === 'manager' ||
    role === 'accountant'
  )
}

export function canManagePurchases(role: Role): boolean {
  return (
    role === 'owner' ||
    role === 'admin' ||
    role === 'manager'
  )
}

// Inventory & stock ledger
export function canAccessInventory(role: Role): boolean {
  return (
    role === 'owner' ||
    role === 'admin' ||
    role === 'manager' ||
    role === 'accountant' ||
    role === 'sales'
  )
}

export function canManageInventory(role: Role): boolean {
  return role === 'owner' || role === 'admin' || role === 'manager'
}

// Customers
export function canAccessCustomers(role: Role): boolean {
  return (
    role === 'owner' ||
    role === 'admin' ||
    role === 'manager' ||
    role === 'sales' ||
    role === 'cashier' ||
    role === 'delivery'
  )
}

export function canEditCustomers(role: Role): boolean {
  return (
    role === 'owner' ||
    role === 'admin' ||
    role === 'manager' ||
    role === 'sales' ||
    role === 'cashier'
  )
}

// Suppliers
export function canAccessSuppliers(role: Role): boolean {
  return (
    role === 'owner' ||
    role === 'admin' ||
    role === 'manager' ||
    role === 'accountant'
  )
}

export function canEditSuppliers(role: Role): boolean {
  return role === 'owner' || role === 'admin' || role === 'manager'
}

// Products catalog
export function canAccessProducts(role: Role): boolean {
  return (
    role === 'owner' ||
    role === 'admin' ||
    role === 'manager' ||
    role === 'sales' ||
    role === 'cashier' ||
    role === 'accountant'
  )
}

export function canEditProducts(role: Role): boolean {
  return role === 'owner' || role === 'admin' || role === 'manager'
}

// Payments
export function canAccessPayments(role: Role): boolean {
  return (
    role === 'owner' ||
    role === 'admin' ||
    role === 'manager' ||
    role === 'accountant' ||
    role === 'cashier'
  )
}

export function canRecordPayment(role: Role): boolean {
  return (
    role === 'owner' ||
    role === 'admin' ||
    role === 'manager' ||
    role === 'accountant' ||
    role === 'cashier'
  )
}

// POS (counter checkout)
export function canAccessPOS(role: Role): boolean {
  return (
    role === 'owner' ||
    role === 'admin' ||
    role === 'manager' ||
    role === 'cashier' ||
    role === 'sales'
  )
}

// Deliveries
export function canAccessDeliveries(role: Role): boolean {
  return (
    role === 'owner' ||
    role === 'admin' ||
    role === 'manager' ||
    role === 'delivery'
  )
}

// Reports
export function canAccessReports(role: Role): boolean {
  return (
    role === 'owner' ||
    role === 'admin' ||
    role === 'manager' ||
    role === 'accountant'
  )
}

// Automation & Approval Center
export function canManageAutomation(role: Role): boolean {
  return role === 'owner' || role === 'admin' || role === 'manager'
}

// General write/delete helper
export function canDeleteData(role: Role): boolean {
  return role === 'owner' || role === 'admin'
}

export function canEditData(role: Role): boolean {
  return role !== 'delivery'
}

export function canViewData(role: Role): boolean {
  return true
}

