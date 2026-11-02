import { useState, useCallback, useEffect } from 'react'
import { X, KeyRound, Delete, ShieldAlert } from 'lucide-react'
import { useAppLock } from '@/context/AppLockContext'
import { verifyPin } from '@/services/security/appLockService'
import { triggerHaptic, triggerNotificationHaptic } from '@/utils/haptics'
import { ImpactStyle, NotificationType } from '@capacitor/haptics'
import { useToast } from '@/context/ToastContext'

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

export interface ChangePinModalProps {
  isOpen: boolean
  onClose: () => void
}

type Step = 'verify_old' | 'enter_new' | 'confirm_new'

export function ChangePinModal({ isOpen, onClose }: ChangePinModalProps) {
  const { changePin } = useAppLock()
  const { showToast } = useToast()

  const [step, setStep] = useState<Step>('verify_old')
  const [oldPin, setOldPin] = useState('')
  const [newPinCandidate, setNewPinCandidate] = useState('')
  const [currentInput, setCurrentInput] = useState('')
  const [errorMsg, setErrorMsg] = useState('')
  const [isShaking, setIsShaking] = useState(false)

  // Reset state whenever modal opens or closes
  useEffect(() => {
    if (isOpen) {
      setStep('verify_old')
      setOldPin('')
      setNewPinCandidate('')
      setCurrentInput('')
      setErrorMsg('')
      setIsShaking(false)
    }
  }, [isOpen])

  const targetLength = 4

  const handleDigit = useCallback(
    (digit: string) => {
      void triggerHaptic(ImpactStyle.Light)
      setErrorMsg('')

      setCurrentInput((prev) => {
        if (prev.length >= targetLength) return prev
        const next = prev + digit

        if (next.length === targetLength) {
          setTimeout(() => {
            if (step === 'verify_old') {
              // Step 1: Verify current PIN
              if (verifyPin(next)) {
                void triggerNotificationHaptic(NotificationType.Success)
                setOldPin(next)
                setCurrentInput('')
                setStep('enter_new')
              } else {
                void triggerNotificationHaptic(NotificationType.Error)
                setIsShaking(true)
                setErrorMsg('Incorrect current PIN. Please try again.')
                setCurrentInput('')
                setTimeout(() => setIsShaking(false), 450)
              }
            } else if (step === 'enter_new') {
              // Step 2: Record new candidate PIN
              void triggerNotificationHaptic(NotificationType.Success)
              setNewPinCandidate(next)
              setCurrentInput('')
              setStep('confirm_new')
            } else if (step === 'confirm_new') {
              // Step 3: Confirm new PIN
              if (next === newPinCandidate) {
                const res = changePin(oldPin, next)
                if (res.success) {
                  void triggerNotificationHaptic(NotificationType.Success)
                  showToast('App PIN changed successfully!', 'success')
                  onClose()
                } else {
                  void triggerNotificationHaptic(NotificationType.Error)
                  setIsShaking(true)
                  setErrorMsg(res.error || 'Failed to update PIN.')
                  setCurrentInput('')
                  setTimeout(() => setIsShaking(false), 450)
                }
              } else {
                void triggerNotificationHaptic(NotificationType.Error)
                setIsShaking(true)
                setErrorMsg('PINs do not match. Please re-enter new PIN.')
                setCurrentInput('')
                setTimeout(() => {
                  setIsShaking(false)
                  setStep('enter_new')
                  setNewPinCandidate('')
                }, 600)
              }
            }
          }, 80)
        }

        return next
      })
    },
    [step, newPinCandidate, oldPin, changePin, onClose, showToast]
  )

  const handleBackspace = useCallback(() => {
    void triggerHaptic(ImpactStyle.Light)
    setErrorMsg('')
    setCurrentInput((prev) => prev.slice(0, -1))
  }, [])

  const handleClear = useCallback(() => {
    void triggerHaptic(ImpactStyle.Light)
    setErrorMsg('')
    setCurrentInput('')
  }, [])

  // Keyboard navigation support for desktop
  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key >= '0' && e.key <= '9') {
        handleDigit(e.key)
      } else if (e.key === 'Backspace') {
        handleBackspace()
      } else if (e.key === 'Escape') {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, handleDigit, handleBackspace, onClose])

  if (!isOpen) return null

  const stepMeta = {
    verify_old: {
      badge: 'Step 1 of 3',
      title: 'Enter Current PIN',
      description: 'Verify your identity before changing your PIN',
    },
    enter_new: {
      badge: 'Step 2 of 3',
      title: 'Enter New 4-Digit PIN',
      description: 'Choose a strong, memorable PIN',
    },
    confirm_new: {
      badge: 'Step 3 of 3',
      title: 'Confirm New PIN',
      description: 'Re-enter your new 4-digit PIN to confirm',
    },
  }[step]

  return (
    <div className="fixed inset-0 z-[9999] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden flex flex-col items-center p-6 space-y-4 animate-scale-in">
        {/* Modal Top Bar */}
        <div className="w-full flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <KeyRound size={18} strokeWidth={2.4} />
            </div>
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
              Change App PIN
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Step Header */}
        <div className="text-center space-y-1">
          <span className="text-[10px] font-bold tracking-wider px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-mono uppercase">
            {stepMeta.badge}
          </span>
          <h2 className="text-lg font-black text-slate-900 dark:text-slate-100 tracking-tight">
            {stepMeta.title}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {stepMeta.description}
          </p>
        </div>

        {/* PIN Dots */}
        <div
          className={`flex items-center justify-center gap-3 py-2 transition-transform ${
            isShaking ? 'animate-pin-shake' : ''
          }`}
        >
          {Array.from({ length: targetLength }).map((_, idx) => {
            const isFilled = idx < currentInput.length
            return (
              <div
                key={idx}
                className={`w-3.5 h-3.5 rounded-full transition-all duration-150 ${
                  isShaking
                    ? 'border-2 border-rose-500 bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.7)]'
                    : isFilled
                    ? 'border-2 border-emerald-500 bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.7)] scale-110'
                    : 'border-2 border-slate-300 dark:border-slate-700 bg-transparent'
                }`}
              />
            )
          })}
        </div>

        {/* Error / Status Text */}
        <div className="h-5 flex items-center justify-center">
          {errorMsg && (
            <p className="text-xs font-bold text-rose-500 dark:text-rose-400 flex items-center gap-1">
              <ShieldAlert size={12} />
              <span>{errorMsg}</span>
            </p>
          )}
        </div>

        {/* 3x4 Keypad */}
        <div className="w-full grid grid-cols-3 gap-2.5 justify-items-center pt-1">
          {KEYPAD_BUTTONS.map((item) => (
            <button
              key={item.digit}
              type="button"
              onClick={() => handleDigit(item.digit)}
              className="w-16 h-14 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 shadow-2xs flex flex-col items-center justify-center cursor-pointer transition-all active:scale-95 active:bg-emerald-50 dark:active:bg-emerald-950/40 select-none group"
            >
              <span className="text-xl font-bold text-slate-900 dark:text-slate-100 leading-none">
                {item.digit}
              </span>
              {item.letters && (
                <span className="text-[8px] font-bold text-slate-400 dark:text-slate-500 tracking-wider mt-0.5 leading-none font-mono">
                  {item.letters}
                </span>
              )}
            </button>
          ))}

          <button
            type="button"
            onClick={handleClear}
            className="w-16 h-14 rounded-xl flex items-center justify-center text-[11px] font-bold uppercase tracking-wider text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 cursor-pointer active:scale-95 select-none"
          >
            Clear
          </button>

          <button
            type="button"
            onClick={() => handleDigit('0')}
            className="w-16 h-14 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 shadow-2xs flex flex-col items-center justify-center cursor-pointer transition-all active:scale-95 active:bg-emerald-50 dark:active:bg-emerald-950/40 select-none group"
          >
            <span className="text-xl font-bold text-slate-900 dark:text-slate-100 leading-none">
              0
            </span>
          </button>

          <button
            type="button"
            onClick={handleBackspace}
            aria-label="Delete last digit"
            className="w-16 h-14 rounded-xl flex items-center justify-center text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white cursor-pointer active:scale-95 select-none"
          >
            <Delete size={22} strokeWidth={2.2} />
          </button>
        </div>

        {/* Step indicator breadcrumbs */}
        <div className="w-full pt-2 flex items-center justify-center gap-2">
          {(['verify_old', 'enter_new', 'confirm_new'] as const).map((s, i) => (
            <div
              key={s}
              className={`h-1.5 rounded-full transition-all ${
                step === s
                  ? 'w-6 bg-emerald-500'
                  : i < (['verify_old', 'enter_new', 'confirm_new'].indexOf(step))
                  ? 'w-2 bg-emerald-300 dark:bg-emerald-800'
                  : 'w-2 bg-slate-200 dark:bg-slate-700'
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
