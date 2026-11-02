import { Suspense, lazy } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { ErrorBoundary } from '@/components/common/ErrorBoundary'
import { AppShell } from '@/components/layout/AppShell'
import { ROUTE_PATHS } from './route-paths'

const DashboardPage = lazy(() => import('@/features/dashboard/pages/DashboardPage'))
const PartyDirectoryPage = lazy(() => import('@/features/parties/pages/PartyDirectoryPage'))
const InwardPage = lazy(() => import('@/features/inward/pages/InwardPage'))
const OutwardPage = lazy(() => import('@/features/outward/pages/OutwardPage'))
const BillingPage = lazy(() => import('@/features/billing/pages/BillingPage'))
const OperatingExpensesPage = lazy(() => import('@/features/expenses/pages/OperatingExpensesPage'))
const ReportsPage = lazy(() => import('@/features/reports/pages/ReportsPage'))
const SettingsPage = lazy(() => import('@/features/settings/pages/SettingsPage'))

export function RouteLoadingSpinner() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-950">
      <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )
}

export function AppRoutes() {
  return (
    <Suspense fallback={<RouteLoadingSpinner />}>
      <Routes>
        <Route element={<AppShell />}>
          <Route
            index
            element={
              <ErrorBoundary moduleName="Dashboard">
                <DashboardPage />
              </ErrorBoundary>
            }
          />
          <Route
            path={ROUTE_PATHS.PARTIES.slice(1)}
            element={
              <ErrorBoundary moduleName="Parties Directory">
                <PartyDirectoryPage />
              </ErrorBoundary>
            }
          />
          <Route
            path={ROUTE_PATHS.INWARD.slice(1)}
            element={
              <ErrorBoundary moduleName="Inward Receipts">
                <InwardPage />
              </ErrorBoundary>
            }
          />
          <Route
            path={ROUTE_PATHS.INWARD_ALIAS.slice(1)}
            element={<Navigate to={ROUTE_PATHS.INWARD} replace />}
          />
          <Route
            path={ROUTE_PATHS.OUTWARD.slice(1)}
            element={
              <ErrorBoundary moduleName="Outward Dispatch">
                <OutwardPage />
              </ErrorBoundary>
            }
          />
          <Route
            path={ROUTE_PATHS.OUTWARD_ALIAS.slice(1)}
            element={<Navigate to={ROUTE_PATHS.OUTWARD} replace />}
          />
          <Route
            path={ROUTE_PATHS.BILLING.slice(1)}
            element={
              <ErrorBoundary moduleName="Payments & Ledger">
                <BillingPage />
              </ErrorBoundary>
            }
          />
          <Route
            path={ROUTE_PATHS.EXPENSES.slice(1)}
            element={
              <ErrorBoundary moduleName="Operating Expenses">
                <OperatingExpensesPage />
              </ErrorBoundary>
            }
          />
          <Route
            path={ROUTE_PATHS.REPORTS.slice(1)}
            element={
              <ErrorBoundary moduleName="Reports & Analytics">
                <ReportsPage />
              </ErrorBoundary>
            }
          />
          <Route
            path={ROUTE_PATHS.SETTINGS.slice(1)}
            element={
              <ErrorBoundary moduleName="System Settings">
                <SettingsPage />
              </ErrorBoundary>
            }
          />
        </Route>
      </Routes>
    </Suspense>
  )
}

export default AppRoutes
