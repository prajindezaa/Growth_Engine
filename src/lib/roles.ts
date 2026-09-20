// ── Role System ──

export const ROLES = ['owner', 'admin', 'manager', 'staff', 'viewer'] as const
export type Role = (typeof ROLES)[number]

export const ROLE_LABELS: Record<Role, string> = {
  owner: 'Owner',
  admin: 'Admin',
  manager: 'Manager',
  staff: 'Staff',
  viewer: 'Viewer',
}

export const ROLE_COLORS: Record<Role, { bg: string; text: string }> = {
  owner: { bg: 'rgba(6, 182, 212, 0.12)', text: 'var(--ge-accent)' },
  admin: { bg: 'rgba(139, 92, 246, 0.12)', text: '#a78bfa' },
  manager: { bg: 'rgba(52, 211, 153, 0.12)', text: '#34d399' },
  staff: { bg: 'rgba(251, 191, 36, 0.12)', text: '#fbbf24' },
  viewer: { bg: 'rgba(107, 114, 128, 0.12)', text: '#9ca3af' },
}

// Roles that can be assigned via invite (owner cannot be assigned)
export const ASSIGNABLE_ROLES: Role[] = ['admin', 'manager', 'staff', 'viewer']

// ── Permission checks ──

export function canManageTeam(role: Role): boolean {
  return role === 'owner' || role === 'admin'
}

export function canEditSettings(role: Role): boolean {
  return role === 'owner' || role === 'admin'
}

export function canEditData(role: Role): boolean {
  return role !== 'viewer'
}

export function canDeleteData(role: Role): boolean {
  return role === 'owner' || role === 'admin'
}

export function canViewData(role: Role): boolean {
  return true // all roles can view
}
