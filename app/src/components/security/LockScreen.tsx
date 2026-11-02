import { useState, useEffect, useCallback } from 'react'
import { ShieldCheck, Delete, Lock } from 'lucide-react'
import { useAppLock } from '@/context/AppLockContext'
import { getStoredPin } from '@/services/security/appLockService'
import { triggerHaptic, triggerNotificationHaptic } from '@/utils/haptics'
import { ImpactStyle, NotificationType } from '@capacitor/haptics'

const KEYPAD_BUTTONS = [
  { digit: '1', letters: '' },
  { digit: '2', letters: 'ABC' },
  { digit: '3', letters: 'DEF' },
  { digit: '4', letters: 'GHI' },
  { digit: '5', letters: 'JKL' },
  { digit: '6', letters: 'MNO' },
  { digit: '7', letters: 'PQRS' },
  { digit: '8', letters: 'TUV' },
  { digit: '9', letters: 'WXYZ' },
]

export function LockScreen() {
  const { unlock } = useAppLock()
  const [pin, setPin] = useState('')
  const [errorMsg, setErrorMsg] = useState('')
  const [isShaking, setIsShaking] = useState(false)
  const [rememberMe, setRememberMe] = useState(true)

  const targetLength = Math.max(4, getStoredPin().length)

  const handleDigit = useCallback(
    (digit: string) => {
      void triggerHaptic(ImpactStyle.Light)
      setErrorMsg('')

      setPin((prev) => {
        if (prev.length >= targetLength) return prev
        const next = prev + digit

        // Auto-submit when all digits entered
        if (next.length === targetLength) {
          setTimeout(() => {
            const success = unlock(next, rememberMe)
            if (success) {
              void triggerNotificationHaptic(NotificationType.Success)
            } else {
              void triggerNotificationHaptic(NotificationType.Error)
              setIsShaking(true)
              setErrorMsg('Incorrect PIN. Please try again.')
              setPin('')
              setTimeout(() => {
                setIsShaking(false)
              }, 450)
            }
          }, 80)
        }

        return next
      })
    },
    [targetLength, unlock, rememberMe]
  )

  const handleBackspace = useCallback(() => {
    void triggerHaptic(ImpactStyle.Light)
    setErrorMsg('')
    setPin((prev) => prev.slice(0, -1))
  }, [])

  const handleClear = useCallback(() => {
    void triggerHaptic(ImpactStyle.Light)
    setErrorMsg('')
    setPin('')
  }, [])

  // Keyboard navigation support for desktop or hardware keyboard users
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key >= '0' && e.key <= '9') {
        handleDigit(e.key)
      } else if (e.key === 'Backspace') {
        handleBackspace()
      } else if (e.key === 'Escape') {
        handleClear()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleDigit, handleBackspace, handleClear])

  return (
    <div
      data-app-locked="true"
      className="fixed inset-0 z-[9999] min-h-dvh w-full bg-slate-50 dark:bg-slate-950 flex flex-col justify-between items-center px-4 py-8 select-none overflow-y-auto"
    >
      {/* ── Top Header & Branding ── */}
      <div className="w-full max-w-sm flex flex-col items-center text-center pt-4 sm:pt-8 space-y-3">
        {/* Soft neon/emerald glowing badge */}
        <div className="relative mb-2">
          <div className="absolute inset-0 rounded-3xl bg-emerald-500/20 dark:bg-emerald-500/30 blur-xl animate-pulse" />
          <div className="relative w-18 h-18 sm:w-20 sm:h-20 rounded-3xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shadow-[0_8px_24px_rgba(16,185,129,0.22)]">
            <Lock size={36} strokeWidth={2.3} className="drop-shadow-xs" />
          </div>
        </div>

        <div className="space-y-1">
          <span className="text-[11px] font-bold tracking-widest text-emerald-700 dark:text-emerald-400 uppercase font-mono">
            Kasab Val Manager
          </span>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
            Enter App PIN
          </h1>
          <p className="text-xs sm:text-sm font-semibold text-slate-500 dark:text-slate-400">
            Enter your {targetLength}-digit PIN to access your data
          </p>
        </div>

        {/* ── PIN Discrete Dot Indicators ── */}
        <div
          className={`flex items-center justify-center gap-3.5 py-4 transition-transform ${
            isShaking ? 'animate-pin-shake' : ''
          }`}
        >
          {Array.from({ length: targetLength }).map((_, idx) => {
            const isFilled = idx < pin.length
            return (
              <div
                key={idx}
                className={`w-4 h-4 rounded-full transition-all duration-150 ${
                  isShaking
                    ? 'border-2 border-rose-500 bg-rose-500 shadow-[0_0_12px_rgba(244,63,94,0.7)]'
                    : isFilled
                    ? 'border-2 border-emerald-500 bg-emerald-500 shadow-[0_0_14px_rgba(16,185,129,0.7)] scale-110'
                    : 'border-2 border-slate-300 dark:border-slate-700 bg-transparent'
                }`}
              />
            )
          })}
        </div>

        {/* Error message / Status feedback */}
        <div className="h-6 flex items-center justify-center">
          {errorMsg ? (
            <p className="text-xs sm:text-sm font-bold text-rose-500 dark:text-rose-400 animate-fade-in">
              {errorMsg}
            </p>
          ) : (
            <span className="text-xs text-slate-400/80 font-medium">
              Protected with device-level session lock
            </span>
          )}
        </div>
      </div>

      {/* ── Numeric Keypad (3x4 Grid) ── */}
      <div className="w-full max-w-xs sm:max-w-sm pb-4 sm:pb-8">
        <div className="grid grid-cols-3 gap-3 sm:gap-4 justify-items-center">
          {KEYPAD_BUTTONS.map((item) => (
            <button
              key={item.digit}
              type="button"
              onClick={() => handleDigit(item.digit)}
              className="w-18 h-18 sm:w-20 sm:h-20 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-xs flex flex-col items-center justify-center cursor-pointer transition-all active:scale-95 active:bg-emerald-50 dark:active:bg-emerald-950/50 active:border-emerald-300 dark:active:border-emerald-700 hover:border-slate-300 dark:hover:border-slate-700 select-none group"
            >
              <span className="text-2xl font-bold text-slate-900 dark:text-slate-100 group-active:text-emerald-700 dark:group-active:text-emerald-400 leading-none">
                {item.digit}
              </span>
              {item.letters && (
                <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 tracking-widest mt-1 leading-none font-mono">
                  {item.letters}
                </span>
              )}
            </button>
          ))}

          {/* Row 4: Clear / 0 / Backspace */}
          <button
            type="button"
            onClick={handleClear}
            className="w-18 h-18 sm:w-20 sm:h-20 rounded-2xl flex items-center justify-center text-xs font-bold uppercase tracking-wider text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 cursor-pointer active:scale-95 transition-all select-none"
          >
            Clear
          </button>

          <button
            type="button"
            onClick={() => handleDigit('0')}
            className="w-18 h-18 sm:w-20 sm:h-20 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-xs flex flex-col items-center justify-center cursor-pointer transition-all active:scale-95 active:bg-emerald-50 dark:active:bg-emerald-950/50 active:border-emerald-300 dark:active:border-emerald-700 hover:border-slate-300 dark:hover:border-slate-700 select-none group"
          >
            <span className="text-2xl font-bold text-slate-900 dark:text-slate-100 group-active:text-emerald-700 dark:group-active:text-emerald-400 leading-none">
              0
            </span>
          </button>

          <button
            type="button"
            onClick={handleBackspace}
            aria-label="Delete last digit"
            className="w-18 h-18 sm:w-20 sm:h-20 rounded-2xl flex items-center justify-center text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white cursor-pointer active:scale-95 transition-all select-none"
          >
            <Delete size={26} strokeWidth={2.2} />
          </button>
        </div>
      </div>

      {/* ── Remember Device / Stay logged in toggle ── */}
      <div className="w-full max-w-xs sm:max-w-sm flex items-center justify-center gap-2 pb-2 select-none">
        <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 transition-colors">
          <input
            type="checkbox"
            checked={rememberMe}
            onChange={(e) => setRememberMe(e.target.checked)}
            className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 cursor-pointer"
          />
          <span>Remember this device (Stay logged in for 30 days)</span>
        </label>
      </div>

      {/* Footer hint */}
      <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-400 dark:text-slate-500">
        <ShieldCheck size={14} className="text-emerald-500" />
        <span>End-to-End Local Session Security</span>
      </div>
    </div>
  )
}
