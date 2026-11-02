import { useEffect, useState, useTransition } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Capacitor } from '@capacitor/core'
import { App as CapApp } from '@capacitor/app'
import {
  Share2,
  Copy,
  Check,
  X,
  IndianRupee,
  PackagePlus,
  Truck,
  Receipt,
  UserPlus,
  Sparkles,
} from 'lucide-react'
import { parseDeepLinkUrl, detectSharedTextIntent, type ParsedShareContent } from '@/utils/deepLinkHelper'
import { useToast } from '@/context/ToastContext'

export const SHARED_IMPORT_TEXT_KEY = 'valmanager_shared_import_text'
export const SHARED_IMPORT_AMOUNT_KEY = 'valmanager_shared_import_amount'

/**
 * NativeShareReceiver handles:
 * 1. Deep linking into the app via kasabval://, valmanager://, or App Links (https://valmanager.app)
 * 2. Receiving text/links/images shared from other Android apps (WhatsApp, SMS, Notes) via Android's native "Share" menu
 * 3. Web Share Target API in PWA mode
 */
export function NativeShareReceiver() {
  const navigate = useNavigate()
  const location = useLocation()
  const { showToast } = useToast()
  const [, startTransition] = useTransition()

  const [sharedData, setSharedData] = useState<ParsedShareContent | null>(null)
  const [copied, setCopied] = useState(false)

  // 1. Deep Linking listener via Capacitor App plugin
  useEffect(() => {
    let removeListener: (() => void) | null = null

    if (Capacitor.isNativePlatform()) {
      CapApp.addListener('appUrlOpen', (event) => {
        if (!event?.url) return
        const targetSpaPath = parseDeepLinkUrl(event.url)
        if (targetSpaPath) {
          startTransition(() => {
            navigate(targetSpaPath)
          })
          showToast('Navigating via Quick Link', 'info')
        }
      })
        .then((handle) => {
          removeListener = () => {
            void handle.remove()
          }
        })
        .catch((err) => {
          console.warn('[NativeShareReceiver] Failed to register appUrlOpen listener:', err)
        })
    }

    return () => {
      if (removeListener) removeListener()
    }
  }, [navigate, showToast])

  // 2. Inbound Native Share receiver (Android Share Sheet via MainActivity & Web Share Target)
  useEffect(() => {
    const handleIncomingText = (rawText: string) => {
      const trimmed = (rawText || '').trim()
      if (!trimmed) return

      // If text is a valid deep link URL, route directly
      if (
        trimmed.startsWith('kasabval://') ||
        trimmed.startsWith('valmanager://') ||
        trimmed.startsWith('https://valmanager.app')
      ) {
        const parsedRoute = parseDeepLinkUrl(trimmed)
        if (parsedRoute) {
          startTransition(() => {
            navigate(parsedRoute)
          })
          showToast('Navigated via deep link', 'info')
          return
        }
      }

      // Otherwise analyze the text content and present the Quick Add sheet
      const parsed = detectSharedTextIntent(trimmed)
      setSharedData(parsed)
    }

    // Check cold-start via AndroidNativeShare interface (MainActivity.java)
    try {
      const androidInterface = (window as unknown as { AndroidNativeShare?: { getPendingShare: () => string } }).AndroidNativeShare
      if (androidInterface?.getPendingShare) {
        const rawJson = androidInterface.getPendingShare()
        if (rawJson) {
          const parsed = JSON.parse(rawJson)
          if (parsed.text) {
            handleIncomingText(parsed.text)
          }
        }
      }
    } catch (err) {
      console.warn('[NativeShareReceiver] Cold-start share check error:', err)
    }

    // Check cold-start global variable window.__PENDING_NATIVE_SHARE__
    const pendingGlobal = (window as unknown as { __PENDING_NATIVE_SHARE__?: { text?: string } }).__PENDING_NATIVE_SHARE__
    if (pendingGlobal?.text) {
      handleIncomingText(pendingGlobal.text)
      delete (window as unknown as { __PENDING_NATIVE_SHARE__?: unknown }).__PENDING_NATIVE_SHARE__
    }

    // Check PWA Web Share Target URL parameters (?shared=1&text=...)
    if (typeof window !== 'undefined' && window.location.search) {
      const params = new URLSearchParams(window.location.search)
      const hasShared = params.get('shared') === '1' || params.has('text')
      const sharedTextParam = params.get('text') || params.get('title') || params.get('url')

      if (hasShared && sharedTextParam) {
        handleIncomingText(sharedTextParam)

        // Clean up URL query parameters so page refresh doesn't trigger repeatedly
        params.delete('shared')
        params.delete('text')
        params.delete('title')
        params.delete('url')
        const remaining = params.toString()
        const newUrl = remaining
          ? `${window.location.pathname}?${remaining}${window.location.hash}`
          : `${window.location.pathname}${window.location.hash}`
        window.history.replaceState(window.history.state, '', newUrl)
      }
    }

    // Listen for warm-start custom events dispatched by MainActivity
    const onCustomNativeShare = (e: Event) => {
      const customEvt = e as CustomEvent<{ text?: string; uri?: string }>
      if (customEvt.detail?.text) {
        handleIncomingText(customEvt.detail.text)
      }
    }

    window.addEventListener('kasab:native-share', onCustomNativeShare)
    return () => {
      window.removeEventListener('kasab:native-share', onCustomNativeShare)
    }
  }, [navigate, showToast, location.pathname])

  const handleCopyText = async () => {
    if (!sharedData) return
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(sharedData.rawText)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
        showToast('Text copied to clipboard', 'info')
      }
    } catch {
      showToast('Could not copy to clipboard', 'warning')
    }
  }

  const handleApplyTo = (targetRoute: string, label: string) => {
    if (!sharedData) return
    try {
      sessionStorage.setItem(SHARED_IMPORT_TEXT_KEY, sharedData.rawText)
      if (sharedData.suggestedAmount) {
        sessionStorage.setItem(SHARED_IMPORT_AMOUNT_KEY, String(sharedData.suggestedAmount))
      }
    } catch {}

    setSharedData(null)
    startTransition(() => {
      navigate(`${targetRoute}?action=new`)
    })
    showToast(`Opening ${label} with imported text`, 'success')
  }

  if (!sharedData) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Shared Content Dialog"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200"
    >
      <div className="w-full sm:max-w-md bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden p-5 max-h-[85vh] flex flex-col gap-4 animate-in slide-in-from-bottom duration-250">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <Share2 size={18} />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 leading-tight">
                Shared to ValManager
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Quick-add from WhatsApp, SMS or other apps
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setSharedData(null)}
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Intent Recommendation Badge */}
        {sharedData.intent !== 'GENERAL' && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 text-emerald-700 dark:text-emerald-300 text-xs font-semibold">
            <Sparkles size={14} className="shrink-0" />
            <span>
              Detected: {sharedData.intent === 'PAYMENT' && 'Payment / Paisa Collection'}
              {sharedData.intent === 'INWARD' && 'Inward Raw Yarn / Challan'}
              {sharedData.intent === 'OUTWARD' && 'Outward Val Dispatch'}
              {sharedData.intent === 'EXPENSE' && 'Business Expense / Kharch'}
              {sharedData.intent === 'PARTY' && 'Party / Customer Info'}
            </span>
          </div>
        )}

        {/* Preview of incoming text */}
        <div className="relative rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 p-3.5 text-xs text-slate-700 dark:text-slate-300 font-mono select-all overflow-y-auto max-h-36 whitespace-pre-wrap">
          {sharedData.rawText}
          <button
            type="button"
            onClick={handleCopyText}
            className="absolute top-2.5 right-2.5 px-2 py-1 rounded bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-[11px] font-sans font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-600 flex items-center gap-1 shadow-2xs cursor-pointer transition-colors"
            title="Copy shared text"
          >
            {copied ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
            <span>{copied ? 'Copied' : 'Copy'}</span>
          </button>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-2">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            Select Destination Entry
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => handleApplyTo('/payments', 'Payment Collection')}
              className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-xs font-semibold transition-all text-left cursor-pointer ${
                sharedData.intent === 'PAYMENT'
                  ? 'bg-amber-500 text-white border-amber-600 shadow-sm ring-2 ring-amber-400/40'
                  : 'bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/60 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700'
              }`}
            >
              <IndianRupee size={16} className={sharedData.intent === 'PAYMENT' ? 'text-white' : 'text-amber-500'} />
              <span>Record Payment</span>
            </button>

            <button
              type="button"
              onClick={() => handleApplyTo('/receiving', 'Inward Receipt')}
              className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-xs font-semibold transition-all text-left cursor-pointer ${
                sharedData.intent === 'INWARD'
                  ? 'bg-amber-500 text-white border-amber-600 shadow-sm ring-2 ring-amber-400/40'
                  : 'bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/60 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700'
              }`}
            >
              <PackagePlus size={16} className={sharedData.intent === 'INWARD' ? 'text-white' : 'text-emerald-500'} />
              <span>Inward Challan</span>
            </button>

            <button
              type="button"
              onClick={() => handleApplyTo('/dispatch', 'Outward Dispatch')}
              className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-xs font-semibold transition-all text-left cursor-pointer ${
                sharedData.intent === 'OUTWARD'
                  ? 'bg-amber-500 text-white border-amber-600 shadow-sm ring-2 ring-amber-400/40'
                  : 'bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/60 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700'
              }`}
            >
              <Truck size={16} className={sharedData.intent === 'OUTWARD' ? 'text-white' : 'text-sky-500'} />
              <span>Outward Dispatch</span>
            </button>

            <button
              type="button"
              onClick={() => handleApplyTo('/expenses', 'Operating Expense')}
              className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-xs font-semibold transition-all text-left cursor-pointer ${
                sharedData.intent === 'EXPENSE'
                  ? 'bg-amber-500 text-white border-amber-600 shadow-sm ring-2 ring-amber-400/40'
                  : 'bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/60 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700'
              }`}
            >
              <Receipt size={16} className={sharedData.intent === 'EXPENSE' ? 'text-white' : 'text-rose-500'} />
              <span>Record Expense</span>
            </button>
          </div>

          <button
            type="button"
            onClick={() => handleApplyTo('/parties', 'Party Directory')}
            className={`w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
              sharedData.intent === 'PARTY'
                ? 'bg-amber-500 text-white border-amber-600 shadow-sm ring-2 ring-amber-400/40'
                : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700'
            }`}
          >
            <UserPlus size={16} className={sharedData.intent === 'PARTY' ? 'text-white' : 'text-indigo-500'} />
            <span>Add New Party Account</span>
          </button>
        </div>

        <button
          type="button"
          onClick={() => setSharedData(null)}
          className="w-full py-2 text-center text-xs text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
        >
          Dismiss
        </button>
      </div>
    </div>
  )
}

