import { useState, Suspense, lazy } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { MonthProvider } from './context/MonthContext'
import { SyncProvider } from './context/SyncContext'
import { ToastProvider } from './context/ToastContext'
import Layout from './components/layout/Layout'
import { Lock } from 'lucide-react'

const Dashboard = lazy(() => import('./pages/Dashboard'))
const Parties   = lazy(() => import('./pages/Parties'))
const Receiving = lazy(() => import('./pages/Receiving'))
const Dispatch  = lazy(() => import('./pages/Dispatch'))
const Payments  = lazy(() => import('./pages/Payments'))
const Expenses  = lazy(() => import('./pages/Expenses'))
const Reports   = lazy(() => import('./pages/Reports'))
const Settings  = lazy(() => import('./pages/Settings'))

export default function App() {
  const [pin, setPin] = useState('')
  const [errorMsg, setErrorMsg] = useState('')
  const isLocked = !(sessionStorage.getItem('KASAB_MASTER_PIN') || localStorage.getItem('KASAB_MASTER_PIN'))

  if (isLocked) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
        <div className="bg-white p-8 rounded-3xl shadow-xl w-full max-w-sm flex flex-col items-center text-center">
          <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mb-6">
            <Lock size={32} strokeWidth={2.5} />
          </div>
          <h1 className="text-2xl font-black text-gray-900 mb-2 tracking-tight">App Locked</h1>
          <p className="text-sm font-bold text-gray-400 mb-8">Enter the Master PIN to access the database securely.</p>
          
          <form 
            onSubmit={(e) => {
              e.preventDefault()
              const entered = pin.trim()
              const masterPin = import.meta.env.VITE_MASTER_PIN || '7878' // Fallback for dev if env missing
              if (entered === masterPin) {
                sessionStorage.setItem('KASAB_MASTER_PIN', entered)
                localStorage.setItem('KASAB_MASTER_PIN', entered)
                window.location.reload()
              } else if (entered) {
                setErrorMsg('Incorrect PIN. Please try again.')
                setPin('')
              }
            }}
            className="w-full space-y-4"
          >
            <input
              type="password"
              placeholder="Enter PIN"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              className="w-full h-[54px] text-center text-xl tracking-[0.2em] font-black bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all"
              autoFocus
            />
            {errorMsg && <p className="text-red-500 text-sm font-medium">{errorMsg}</p>}
            <button
              type="submit"
              disabled={!pin.trim()}
              className="w-full h-[54px] rounded-xl font-black text-white bg-gradient-to-b from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 shadow-[0_4px_12px_rgba(16,185,129,0.3)] disabled:opacity-50 transition-all text-lg"
            >
              Unlock
            </button>
          </form>
        </div>
      </div>
    )
  }

  return (
    <BrowserRouter>
      <SyncProvider>
        <MonthProvider>
          <ToastProvider>
            <Suspense fallback={
              <div className="flex h-screen items-center justify-center bg-gray-50">
                <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
              </div>
            }>
              <Routes>
                <Route element={<Layout />}>
                  <Route index                  element={<Dashboard />}  />
                  <Route path="parties"         element={<Parties />}    />
                  <Route path="receiving"       element={<Receiving />}  />
                  <Route path="dispatch"        element={<Dispatch />}   />

                  <Route path="payments"        element={<Payments />}   />
                  <Route path="expenses"        element={<Expenses />}   />
                  <Route path="reports"         element={<Reports />}    />
                  <Route path="settings"        element={<Settings />}   />
                </Route>
              </Routes>
            </Suspense>
          </ToastProvider>
        </MonthProvider>
      </SyncProvider>
    </BrowserRouter>
  )
}

