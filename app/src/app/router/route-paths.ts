/**
 * Enterprise Application Route Paths
 */

export const ROUTE_PATHS = {
  DASHBOARD: '/',
  PARTIES: '/parties',
  INWARD: '/receiving',
  INWARD_ALIAS: '/inward',
  OUTWARD: '/dispatch',
  OUTWARD_ALIAS: '/outward',
  BILLING: '/payments',
  EXPENSES: '/expenses',
  REPORTS: '/reports',
  SETTINGS: '/settings',
} as const

export type AppRoute = (typeof ROUTE_PATHS)[keyof typeof ROUTE_PATHS]
