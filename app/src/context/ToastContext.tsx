import React, { createContext, useContext, useState, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle2, AlertCircle, AlertTriangle, Info, Trash2, X } from 'lucide-react'

export type ToastType = 'success' | 'error' | 'warning' | 'info' | 'delete'

export interface ToastAction {
  label: string
  onClick: () => void | Promise<void>
}

export interface ToastOptions {
  type?: ToastType
  action?: ToastAction
  durationMs?: number
}

interface Toast {
  id: number
  message: string
  type: ToastType
  action?: ToastAction
}

interface ToastContextValue {
  showToast: (message: string, typeOrOptions?: ToastType | ToastOptions) => void
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined)

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([])
  const nextIdRef = useRef(1)

  const removeToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const showToast = useCallback(
    (message: string, typeOrOptions?: ToastType | ToastOptions) => {
      const id = nextIdRef.current++
      const type: ToastType =
        typeof typeOrOptions === 'string'
          ? typeOrOptions
          : typeOrOptions?.type || 'success'
      const action =
        typeof typeOrOptions === 'object' ? typeOrOptions.action : undefined
      const durationMs =
        typeof typeOrOptions === 'object' && typeOrOptions.durationMs
          ? typeOrOptions.durationMs
          : 4000

      setToasts((prev) => [...prev.slice(-2), { id, message, type, action }])

      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id))
      }, durationMs)
    },
    []
  )

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {/* Floating Toast Notification Container - Strictly above bottom nav and FAB (bottom-24) */}
      <div
        className="fixed bottom-24 left-4 right-4 sm:left-auto sm:right-6 sm:max-w-sm z-50 flex flex-col gap-2 pointer-events-none"
        aria-live="polite"
      >
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: 16, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.95 }}
              transition={{ type: 'spring', damping: 28, stiffness: 350, mass: 0.8 }}
              className="pointer-events-auto flex items-center justify-between gap-3 px-4 py-3 rounded-2xl bg-slate-950/90 dark:bg-white/90 text-white dark:text-slate-950 backdrop-blur-md shadow-2xl border border-white/10 dark:border-slate-200"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                {t.type === 'error' ? (
                  <AlertCircle size={16} className="text-rose-400 shrink-0" />
                ) : t.type === 'warning' ? (
                  <AlertTriangle size={16} className="text-amber-400 shrink-0" />
                ) : t.type === 'delete' ? (
                  <div className="w-5 h-5 rounded-md bg-rose-500/20 text-rose-400 dark:text-rose-600 flex items-center justify-center shrink-0">
                    <Trash2 size={12} strokeWidth={2.5} />
                  </div>
                ) : t.type === 'info' ? (
                  <Info size={16} className="text-sky-400 shrink-0" />
                ) : (
                  <CheckCircle2 size={16} className="text-emerald-400 dark:text-emerald-600 shrink-0" />
                )}
                <span className="text-xs font-medium tracking-wide truncate">
                  {t.message}
                </span>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {t.action && (
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        await t.action?.onClick()
                      } finally {
                        removeToast(t.id)
                      }
                    }}
                    className="text-xs font-bold text-amber-400 dark:text-blue-600 uppercase tracking-wider h-11 px-3 min-h-[44px] inline-flex items-center justify-center active:scale-90 transition-transform cursor-pointer"
                  >
                    {t.action.label}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => removeToast(t.id)}
                  className="text-white/40 dark:text-slate-500 hover:text-white dark:hover:text-slate-900 w-11 h-11 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl transition-colors cursor-pointer shrink-0"
                  aria-label="Close notification"
                >
                  <X size={15} />
                </button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  )
}

export const useToast = () => {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider')
  }
  return context
}
