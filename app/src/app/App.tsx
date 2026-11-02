import { BrowserRouter } from 'react-router-dom'
import { ScrollToTop } from '@/components/common/ScrollToTop'
import { ErrorBoundary } from '@/components/common/ErrorBoundary'
import { CapacitorBackButtonHandler } from '@/components/common/CapacitorBackButtonHandler'
import { NativeShareReceiver } from '@/components/common/NativeShareReceiver'
import { AppProviders } from './providers/AppProviders'
import { AppRoutes } from './router/app-routes'
import { AppLockProvider, useAppLock } from '@/context/AppLockContext'
import { LockScreen } from '@/components/security/LockScreen'

function AppContent() {
  const { isLocked } = useAppLock()

  return (
    <ErrorBoundary moduleName="Application Root">
      {isLocked && <LockScreen />}
      <BrowserRouter>
        <ScrollToTop />
        <AppProviders>
          <CapacitorBackButtonHandler />
          <NativeShareReceiver />
          <AppRoutes />
        </AppProviders>
      </BrowserRouter>
    </ErrorBoundary>
  )
}

export default function App() {
  return (
    <AppLockProvider>
      <AppContent />
    </AppLockProvider>
  )
}
