import { useState } from 'react'
import { ShieldCheck, KeyRound, Lock, Clock, Check } from 'lucide-react'
import { useAppLock } from '@/context/AppLockContext'
import { useToast } from '@/context/ToastContext'
import { ChangePinModal } from '@/components/security/ChangePinModal'

export function SecuritySettings() {
  const {
    autoLockTimeout,
    setAutoLockTimeout,
    lockApp,
    isRemembered,
    revokeDeviceSession,
    rememberDeviceSession,
  } = useAppLock()
  const { showToast } = useToast()
  const [isChangeModalOpen, setIsChangeModalOpen] = useState(false)

  const timeoutOptions = [
    {
      id: 'immediately' as const,
      label: 'Immediately',
      description: 'Locks immediately whenever you switch away or minimize',
    },
    {
      id: '30s' as const,
      label: 'After 30 seconds',
      description: 'Recommended balance of convenience and privacy',
    },
    {
      id: '5m' as const,
      label: 'After 5 minutes',
      description: 'Locks after remaining in background for 5 minutes',
    },
    {
      id: '1h' as const,
      label: 'After 1 hour',
      description: 'Locks after remaining in background for 1 hour',
    },
    {
      id: '1d' as const,
      label: 'After 24 hours',
      description: 'Locks after 24 hours of inactivity',
    },
    {
      id: 'never' as const,
      label: 'Never (Personal Computer)',
      description: 'Keep unlocked continuously on this trusted personal device',
    },
  ]

  return (
    <div className="space-y-6">
      <ChangePinModal
        isOpen={isChangeModalOpen}
        onClose={() => setIsChangeModalOpen(false)}
      />

      {/* ── Status & Master PIN Management Card ── */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-xs p-5 sm:p-6 space-y-5 transition-colors">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start sm:items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center shrink-0">
              <ShieldCheck size={22} strokeWidth={2.4} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 tracking-tight">
                  App PIN &amp; Device Lock
                </h2>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 font-mono">
                  Active
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Protect sensitive accounting records, customer balances, and challan files.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap sm:flex-nowrap items-center gap-3 pt-2">
          <button
            type="button"
            onClick={() => setIsChangeModalOpen(true)}
            className="flex-1 sm:flex-initial h-10 px-4 rounded-xl font-bold text-xs text-white bg-blue-600 hover:bg-blue-700 shadow-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <KeyRound size={15} />
            <span>Change App PIN</span>
          </button>

          <button
            type="button"
            onClick={() => lockApp()}
            className="flex-1 sm:flex-initial h-10 px-4 rounded-xl font-bold text-xs text-slate-700 dark:text-slate-200 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <Lock size={15} />
            <span>Lock App Now</span>
          </button>
        </div>
      </div>

      {/* ── Persistent Personal Device Token Card ── */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-xs p-5 sm:p-6 space-y-4 transition-colors">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <ShieldCheck size={16} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 tracking-tight">
                Trusted Personal Computer Session
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Long-lived 30-day token keeps you logged in across new tabs and browser restarts
              </p>
            </div>
          </div>
          <span className={`text-[10px] uppercase font-bold tracking-wider px-2.5 py-1 rounded-full font-mono ${
            isRemembered
              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
              : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border border-slate-200 dark:border-slate-700'
          }`}>
            {isRemembered ? 'Active (Remembered)' : 'Disabled'}
          </span>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md">
            {isRemembered
              ? 'This personal computer is recognized with a secure long-lived credential. You will not be prompted for the PIN every time you open a tab.'
              : 'Enable to stay authenticated on this personal computer without repeatedly entering your PIN.'}
          </p>
          {isRemembered ? (
            <button
              type="button"
              onClick={() => {
                revokeDeviceSession()
                showToast('Device forgotten. PIN will be required on next visit.', 'info')
              }}
              className="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/60 border border-rose-200 dark:border-rose-800 cursor-pointer transition-colors shrink-0"
            >
              Forget Device
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                rememberDeviceSession()
                showToast('Personal computer remembered for 30 days.', 'success')
              }}
              className="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 border border-emerald-200 dark:border-emerald-800 cursor-pointer transition-colors shrink-0"
            >
              Remember Computer
            </button>
          )}
        </div>
      </div>

      {/* ── Auto-Lock Timeout Card ── */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-xs p-5 sm:p-6 space-y-4 transition-colors">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
            <Clock size={16} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 tracking-tight">
              Auto-Lock Timeout
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Set how quickly the app locks when sent to background or minimized
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          {timeoutOptions.map((opt) => {
            const isSelected = autoLockTimeout === opt.id
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => {
                  setAutoLockTimeout(opt.id)
                  showToast(`Auto-lock timeout set to: ${opt.label}`, 'info')
                }}
                className={`text-left p-3.5 rounded-xl border-2 transition-all cursor-pointer flex flex-col justify-between gap-1 select-none ${
                  isSelected
                    ? 'border-emerald-600 dark:border-emerald-500 bg-emerald-50/60 dark:bg-emerald-950/30 ring-2 ring-emerald-600/20 shadow-xs'
                    : 'border-slate-200 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-950/40 hover:border-slate-300 dark:hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <span className={`text-xs font-bold ${isSelected ? 'text-emerald-900 dark:text-emerald-300' : 'text-slate-800 dark:text-slate-200'}`}>
                    {opt.label}
                  </span>
                  <div
                    className={`w-4 h-4 rounded-full flex items-center justify-center transition-all ${
                      isSelected
                        ? 'bg-emerald-600 dark:bg-emerald-500 text-white'
                        : 'border-2 border-slate-300 dark:border-slate-600'
                    }`}
                  >
                    {isSelected && <Check size={10} strokeWidth={3} />}
                  </div>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  {opt.description}
                </p>
              </button>
            )
          })}
        </div>
      </div>

      {/* ── Security Architecture Note ── */}
      <div className="bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 rounded-xl p-4 text-xs text-slate-600 dark:text-slate-400 space-y-2">
        <span className="font-bold text-slate-900 dark:text-slate-200 block">
          🔒 Session Security Architecture:
        </span>
        <ul className="list-disc pl-4 space-y-1 text-[11px] leading-relaxed">
          <li><strong>Zero Permanent Unlock:</strong> Unlock state is strictly kept in temporary session memory. It is never permanently stored in unencrypted storage.</li>
          <li><strong>Native Lifecycle Sync:</strong> Listens directly to Android/iOS native state changes (`pause` and `resume`) as well as browser visibility events.</li>
          <li><strong>Haptic Feedback:</strong> Smooth tactile vibrations during PIN entry and error alerts on mobile devices.</li>
        </ul>
      </div>
    </div>
  )
}

