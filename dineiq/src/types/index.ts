export type Role = 'Customer' | 'Admin' | 'Restaurant Manager' | 'Inventory Manager'

/** Exactly the four roles allowed by the DineIQ SRS. */
export const ROLES: Role[] = ['Customer', 'Admin', 'Restaurant Manager', 'Inventory Manager']

export interface MockUser {
  id: string
  fullName: string
  email: string
  role: Role
  location?: string
}

export interface NavItem {
  label: string
  path: string
  icon: string
  end?: boolean
}

export interface MenuItemRow {
  id: string
  name: string
  category: string
  price: number
  sold: number
  revenue: number
  cost: number
  profit: number
  margin: number
  rating: number
  repeatRate: number
  wastagePct: number
  promoLift: number
  trend: number
  perfClass: 'High' | 'Medium' | 'Low'
}

export interface CustomerRow {
  id: string
  name: string
  segment: string
  rfm: string
  recencyDays: number
  frequency: number
  monetary: number
  ltv: number
  orders: number
  lastVisit: string
  channel: string
  churnRisk: 'Low' | 'Medium' | 'High'
}

export interface OrderRow {
  id: string
  customer: string
  date: string
  items: number
  channel: string
  location: string
  total: number
  status: 'Completed' | 'Preparing' | 'Delivered' | 'Cancelled'
}

export interface AssociationRow {
  a: string
  b: string
  support: number
  confidence: number
  lift: number
}

export interface AnomalyRow {
  id: string
  date: string
  location: string
  metric: string
  expected: number
  actual: number
  severity: 'Normal' | 'Warning' | 'Critical'
  status: 'Resolved' | 'Open' | 'Investigating'
}

export interface RecommendationRow {
  id: string
  area: 'Menu' | 'Customers' | 'Pricing' | 'Promotions' | 'Inventory'
  title: string
  detail: string
  impact: 'High' | 'Medium' | 'Low'
  confidence: number
}

export interface InventoryRow {
  id: string
  item: string
  category: string
  unit: string
  stock: number
  parLevel: number
  status: 'In Stock' | 'Low Stock' | 'Out of Stock'
  consumption30d: number
  value: number
  wastagePct: number
  supplier: string
  reorderQty: number
  nextDelivery: string
}

export interface PromotionRow {
  id: string
  campaign: string
  type: string
  discount: number
  revenue: number
  orders: number
  conversion: number
  uplift: number
  status: 'Active' | 'Ended' | 'Scheduled'
  roi: number
}

export interface UserRow {
  id: string
  name: string
  email: string
  role: Role
  location: string
  status: 'Active' | 'Inactive' | 'Suspended'
  lastLogin: string
}

export interface AuditRow {
  id: string
  timestamp: string
  actor: string
  action: string
  entity: string
  severity: 'Info' | 'Warning' | 'Critical'
}

export interface LocationRow {
  id: string
  name: string
  city: string
  manager: string
  status: 'Operational' | 'Maintenance'
  orders30d: number
  revenue30d: number
  dataQuality: number
}
