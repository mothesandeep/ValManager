import { useState, useEffect, useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { BottomSheetWrapper } from '@/components/sheets/BottomSheetWrapper'
import { clearModalHash } from '@/components/sheets/bottomSheetPhysics'
import {
  Plus,
  Trash2,
  X,
  Search,
  Download,
  Receipt,
  Printer,
  Share2,
  CheckCircle2,
  Loader2,
  Banknote,
  Smartphone,
  Split,
  Landmark,
  Users,
} from 'lucide-react'
import {
  insertPayment,
  updatePayment,
  type PaymentPayload,
} from '@/services/api/payments'
import PartyKhataModal from '@/features/parties/components/PartyKhataModal'
import { BillingTable } from '@/features/billing/components/BillingTable'
import { PartyBalancesSheet } from '@/features/billing/sheets/PartyBalancesSheet'
import { MonthSelector } from '@/components/common/MonthSelector'
import type { Party } from '@/features/parties/types'
import type { PaymentWithParty } from '@/features/billing/types/billing.types'
import { fmtDate, todayStr } from '@/utils/date'
import { fmtMoney } from '@/utils/format'
import { PageHeader } from '@/components/layout/PageHeader'
import { KpiCard } from '@/components/common/KpiCard'
import { Button } from '@/components/common/Button'
import { EmptyState } from '@/components/common/EmptyState'
import { DangerZone } from '@/components/feedback/DangerZone'
import { addToTrashBin } from '@/services/storage/trashBinService'
import { PullToRefresh } from '@/components/common/PullToRefresh'
import { useMonth } from '@/context/MonthContext'
import { useToast } from '@/context/ToastContext'
import { useData } from '@/hooks/useData'
import { useBillingMetrics } from '@/hooks/useBillingMetrics'
import { PartyCombobox } from '@/components/common/PartyCombobox'
import { FieldError } from '@/components/common/FieldError'
import { PaymentFormSchema, formatZodErrors } from '@/lib/validation/schemas'
import { sanitizeNumericInput, numberToWordsINR } from '@/utils/numberInput'
import { shouldAutoFocusSearch } from '@/utils/device'
import { getCompanySettings } from '@/features/settings/utils'
import { exportTableToCSV, getSanitizedFilename } from '@/utils/exportHelpers'
import { shareOrPrintDocument, isMobileDevice } from '@/utils/nativeShare'
import {
  savePaymentDraft,
  loadPaymentDraft,
  clearPaymentDraft,
  registerAppBackgroundListener,
} from '@/services/storage/challanDraftStorage'

export type PaymentModeCategory = 'Cash' | 'UPI / Online' | 'Cheque'

export interface SplitBreakdown {
  cash: string
  upi: string
  upiRef: string
  cheque: string
  chequeRef: string
  bankTransfer: string
  bankRef: string
}

interface PaymentFormState {
  id: string | null
  partyId: string
  date: string
  amount: string
  mode: PaymentModeCategory
  reference: string
  isSplit: boolean
  split: SplitBreakdown
}

const emptySplit = (): SplitBreakdown => ({
  cash: '',
  upi: '',
  upiRef: '',
  cheque: '',
  chequeRef: '',
  bankTransfer: '',
  bankRef: '',
})

function detectPaymentMode(note?: string | null): {
  mode: string
  category: 'upi' | 'neft' | 'cash' | 'cheque'
  style: string
} {
  if (!note) {
    return {
      mode: 'Cash',
      category: 'cash',
      style:
        'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700',
    }
  }
  const lower = note.toLowerCase()
  if (lower.includes('split payment') || lower.includes('split:')) {
    return {
      mode: 'Split Payment',
      category: 'upi',
      style:
        'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200/70 dark:border-indigo-800/60',
    }
  }
  if (
    lower.includes('neft') ||
    lower.includes('rtgs') ||
    lower.includes('imps') ||
    lower.includes('bank')
  ) {
    const label = lower.includes('rtgs') ? 'RTGS' : lower.includes('imps') ? 'IMPS' : 'NEFT'
    return {
      mode: label,
      category: 'neft',
      style:
        'bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 border border-sky-200/70 dark:border-sky-800/60',
    }
  }
  if (lower.includes('cheque') || lower.includes('chq')) {
    return {
      mode: 'Cheque',
      category: 'cheque',
      style:
        'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200/70 dark:border-blue-800/60',
    }
  }
  if (
    lower.includes('gpay') ||
    lower.includes('upi') ||
    lower.includes('phonepe') ||
    lower.includes('paytm') ||
    lower.includes('online')
  ) {
    return {
      mode: lower.includes('online') ? 'Online' : 'UPI',
      category: 'upi',
      style:
        'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200/70 dark:border-emerald-800/60',
    }
  }
  if (lower.includes('cash')) {
    return {
      mode: 'Cash',
      category: 'cash',
      style:
        'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700',
    }
  }
  return {
    mode: 'Direct Transfer',
    category: 'upi',
    style:
      'bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 border border-sky-200/70 dark:border-sky-800/60',
  }
}

export default function Payments() {
  const [searchParams] = useSearchParams()
  const { formattedMonth, isAllTime } = useMonth()
  const { showToast } = useToast()
  const { parties, payments, receipts, dispatches, partyStats, loading, removePayment, refreshData } = useData()
  const [searchQuery, setSearchQuery] = useState('')

  const {
    partyBalances,
    filteredPayments,
    monthCollectedTotal,
    monthBilledTotal,
    totalOutstanding,
    filteredPaymentsList,
    totalReceivedFiltered,
  } = useBillingMetrics(searchQuery)

  const initialPaymentDraft = useMemo(() => {
    const draft = loadPaymentDraft() as PaymentFormState | null
    if (!draft) return null
    return {
      id: draft.id || null,
      partyId: draft.partyId || '',
      date: draft.date || todayStr(),
      amount: draft.amount || '',
      mode: draft.mode || 'Cash',
      reference: draft.reference || '',
      isSplit: Boolean(draft.isSplit),
      split: draft.split || emptySplit(),
    }
  }, [])

  const [form, setForm] = useState<PaymentFormState | null>(initialPaymentDraft)
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(Boolean(initialPaymentDraft))
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [paymentToDelete, setPaymentToDelete] = useState<PaymentWithParty | null>(null)
  const [animatingDeleteId, setAnimatingDeleteId] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [saving, setSaving] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  // Auto-save payment draft & register background listener
  useEffect(() => {
    if (!form || !isPaymentModalOpen) return
    const isDirty =
      form.amount.trim().length > 0 ||
      form.reference.trim().length > 0 ||
      (form.isSplit &&
        (Boolean(form.split.cash?.trim()) ||
          Boolean(form.split.upi?.trim()) ||
          Boolean(form.split.cheque?.trim()) ||
          Boolean(form.split.bankTransfer?.trim())))

    if (isDirty) {
      const timer = setTimeout(() => {
        savePaymentDraft(form)
      }, 300)
      return () => clearTimeout(timer)
    } else {
      clearPaymentDraft()
    }
  }, [form, isPaymentModalOpen])

  useEffect(() => {
    if (!form || !isPaymentModalOpen) return
    const cleanup = registerAppBackgroundListener(() => {
      const isDirty =
        form.amount.trim().length > 0 ||
        form.reference.trim().length > 0 ||
        (form.isSplit &&
          (Boolean(form.split.cash?.trim()) ||
            Boolean(form.split.upi?.trim()) ||
            Boolean(form.split.cheque?.trim()) ||
            Boolean(form.split.bankTransfer?.trim())))
      if (isDirty) {
        savePaymentDraft(form)
      }
    })
    return cleanup
  }, [form, isPaymentModalOpen])

  // Search, Voucher View, Party Balances Drawer & Khata Modal State
  const [viewReceipt, setViewReceipt] = useState<PaymentWithParty | null>(null)
  const [activeKhataParty, setActiveKhataParty] = useState<Party | null>(null)
  const [isPartyBalancesOpen, setIsPartyBalancesOpen] = useState(false)
  const [isDatePopoverOpen, setIsDatePopoverOpen] = useState(false)

  const blankForm = useCallback(
    (initialPartyId?: string): PaymentFormState => {
      let sharedRef = ''
      let sharedAmt = ''
      try {
        const storedText = sessionStorage.getItem('valmanager_shared_import_text')
        const storedAmt = sessionStorage.getItem('valmanager_shared_import_amount')
        if (storedText) {
          sharedRef = storedText
          sessionStorage.removeItem('valmanager_shared_import_text')
        }
        if (storedAmt) {
          sharedAmt = storedAmt
          sessionStorage.removeItem('valmanager_shared_import_amount')
        }
      } catch {}

      return {
        id: null,
        partyId: initialPartyId || parties[0]?.id || '',
        date: todayStr(),
        amount: sharedAmt,
        mode:
          sharedRef.toLowerCase().includes('upi') ||
          sharedRef.toLowerCase().includes('online') ||
          sharedRef.toLowerCase().includes('gpay') ||
          sharedRef.toLowerCase().includes('phonepe')
            ? 'UPI / Online'
            : 'Cash',
        reference: sharedRef,
        isSplit: false,
        split: emptySplit(),
      }
    },
    [parties]
  )

  const startAdd = useCallback(
    (initialPartyId?: string) => {
      window.history.pushState(null, '', '#modal')
      setForm(blankForm(initialPartyId))
      setIsPaymentModalOpen(true)
      setErrorMsg(null)
      setFieldErrors({})
    },
    [blankForm]
  )

  // Auto open form if navigated from Dashboard Quick Action (+ Paisa)
  useEffect(() => {
    if (searchParams.get('action') === 'new' && parties.length > 0 && !form) {
      startAdd()
      const newParams = new URLSearchParams(searchParams)
      newParams.delete('action')
      const qs = newParams.toString() ? `?${newParams.toString()}` : ''
      window.history.replaceState(window.history.state, '', `${window.location.pathname}${qs}#modal`)
    }
  }, [searchParams, parties, form, startAdd])

  // Context-aware FAB custom event listener
  useEffect(() => {
    const handleOpenModal = () => {
      startAdd()
    }
    window.addEventListener('kasab:open-payment-modal', handleOpenModal)
    return () => {
      window.removeEventListener('kasab:open-payment-modal', handleOpenModal)
    }
  }, [startAdd])

  const closePaymentModal = useCallback(() => {
    clearModalHash()
    clearPaymentDraft()
    setIsPaymentModalOpen(false)
    setTimeout(() => {
      setForm(null)
      setErrorMsg(null)
      setFieldErrors({})
    }, 380)
  }, [])

  // Close Delete Confirmation Dialog on Escape key
  useEffect(() => {
    if (!paymentToDelete) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isDeleting) {
        setPaymentToDelete(null)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [paymentToDelete, isDeleting])

  const edit = (p: PaymentWithParty) => {
    window.history.pushState(null, '', '#modal')
    const isSplitNote = (p.note || '').toLowerCase().includes('split payment') || (p.note || '').toLowerCase().includes('split:')
    const splitData = emptySplit()

    if (isSplitNote && p.note) {
      const noteContent = p.note.replace(/^Split Payment:\s*/i, '').replace(/^Split:\s*/i, '')
      const cashMatch = noteContent.match(/cash\s*₹?\s*([\d.]+)/i)
      if (cashMatch) splitData.cash = cashMatch[1]
      const upiMatch = noteContent.match(/upi\s*₹?\s*([\d.]+)(?:\s*\(([^)]+)\))?/i)
      if (upiMatch) {
        splitData.upi = upiMatch[1]
        if (upiMatch[2]) splitData.upiRef = upiMatch[2]
      }
      const chqMatch = noteContent.match(/cheque\s*₹?\s*([\d.]+)(?:\s*\(([^)]+)\))?/i)
      if (chqMatch) {
        splitData.cheque = chqMatch[1]
        if (chqMatch[2]) splitData.chequeRef = chqMatch[2]
      }
      const bankMatch = noteContent.match(/bank transfer\s*₹?\s*([\d.]+)(?:\s*\(([^)]+)\))?/i)
      if (bankMatch) {
        splitData.bankTransfer = bankMatch[1]
        if (bankMatch[2]) splitData.bankRef = bankMatch[2]
      }
    }

    const detected = detectPaymentMode(p.note)
    let initialMode: PaymentModeCategory = 'Cash'
    if (detected.category === 'upi' || detected.category === 'neft') initialMode = 'UPI / Online'
    else if (detected.category === 'cheque') initialMode = 'Cheque'
    else initialMode = 'Cash'

    // Clean out known prefix tokens to leave the raw user reference
    let cleanRef = p.note || ''
    const prefixRegex =
      /^(cash|upi \/ online|upi|online transfer|online|neft\/imps|neft|rtgs|imps|bank transfer|cheque|chq|split payment|split)\s*([:-•]\s*)?/i
    cleanRef = cleanRef.replace(prefixRegex, '').trim()

    setForm({
      id: p.id,
      partyId: p.party_id || '',
      date: p.date,
      amount: String(p.amount),
      mode: initialMode,
      reference: cleanRef,
      isSplit: isSplitNote,
      split: splitData,
    })
    setIsPaymentModalOpen(true)
    setErrorMsg(null)
    setFieldErrors({})
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form) return

    setFieldErrors({})
    setErrorMsg(null)

    let finalAmount = parseFloat(form.amount) || 0
    let finalNote = ''

    if (form.isSplit) {
      if (!form.partyId) {
        setFieldErrors({ partyId: 'Please select a party account' })
        showToast('Please select a party account', 'warning')
        return
      }
      if (!form.date) {
        setFieldErrors({ date: 'Please choose receipt date' })
        showToast('Please choose receipt date', 'warning')
        return
      }

      const cAmt = parseFloat(form.split.cash) || 0
      const uAmt = parseFloat(form.split.upi) || 0
      const qAmt = parseFloat(form.split.cheque) || 0
      const bAmt = parseFloat(form.split.bankTransfer) || 0
      const splitTotal = cAmt + uAmt + qAmt + bAmt

      if (splitTotal <= 0) {
        setFieldErrors({ amount: 'Enter at least one split payment amount' })
        showToast('Please enter at least one split payment amount', 'warning')
        return
      }

      finalAmount = splitTotal
      const parts: string[] = []
      if (cAmt > 0) parts.push(`Cash ₹${cAmt}`)
      if (uAmt > 0) parts.push(`UPI ₹${uAmt}${form.split.upiRef ? ` (${form.split.upiRef})` : ''}`)
      if (qAmt > 0) parts.push(`Cheque ₹${qAmt}${form.split.chequeRef ? ` (${form.split.chequeRef})` : ''}`)
      if (bAmt > 0) parts.push(`Bank Transfer ₹${bAmt}${form.split.bankRef ? ` (${form.split.bankRef})` : ''}`)
      finalNote = `Split Payment: ${parts.join(', ')}`
    } else {
      const validation = PaymentFormSchema.safeParse({
        partyId: form.partyId,
        date: form.date,
        amount: form.amount,
        mode: form.mode,
        reference: form.reference,
      })

      if (!validation.success) {
        const errs = formatZodErrors(validation.error)
        setFieldErrors(errs)
        showToast('Please correct the highlighted fields.', 'warning')
        return
      }

      finalAmount = parseFloat(form.amount)
      finalNote =
        form.mode !== 'Cash' && form.reference.trim()
          ? `${form.mode} • ${form.reference.trim()}`
          : form.mode
    }

    setSaving(true)
    setErrorMsg(null)

    const payload: PaymentPayload = {
      party_id: form.partyId,
      date: form.date,
      amount: finalAmount,
      note: finalNote,
    }

    try {
      if (form.id) {
        await updatePayment(form.id, payload)
        showToast('Payment voucher updated successfully', 'success')
      } else {
        await insertPayment(payload)
        showToast('Payment voucher recorded successfully', 'success')
      }
      clearPaymentDraft()
      closePaymentModal()
      await refreshData()
    } catch (err: unknown) {
      console.error('Save payment error:', err)
      const msg = err instanceof Error ? err.message : String(err)
      setErrorMsg(`Could not save — ${msg}`)
      showToast(msg, 'error')
    } finally {
      setSaving(false)
    }
  }

  const confirmDeletePayment = async () => {
    if (!paymentToDelete) return
    const target = paymentToDelete
    setIsDeleting(true)

    try {
      // Close confirmation dialog
      setPaymentToDelete(null)
      // Trigger smooth row animation (fade out / height collapse)
      setAnimatingDeleteId(target.id)

      // 280ms transition delay to allow smooth visual slide & fade
      await new Promise((resolve) => setTimeout(resolve, 280))

      // Perform optimistic removal from centralized store
      await removePayment(target.id)

      // Soft-delete preservation in Trash & Archive Bin
      addToTrashBin({
        id: target.id,
        type: 'payment',
        title: `Payment: ${target.party?.name || 'Party'} - ₹${Number(target.amount).toLocaleString('en-IN')}`,
        subtitle: `Date: ${target.date}${target.note ? ` • Note: ${target.note}` : ''}`,
        payload: {
          party_id: target.party_id,
          date: target.date,
          amount: target.amount,
          note: target.note,
        },
      })

      // Show refined modern toast with Undo action
      showToast('Payment receipt deleted successfully', {
        type: 'delete',
        durationMs: 5000,
        action: {
          label: 'Undo',
          onClick: async () => {
            try {
              await insertPayment(
                {
                  party_id: target.party_id,
                  date: target.date,
                  amount: target.amount,
                  note: target.note,
                },
                target.id
              )
              await refreshData()
              showToast('Payment record restored', 'success')
            } catch (undoErr) {
              console.error('Failed to restore payment:', undoErr)
              showToast('Could not restore payment', 'error')
            }
          },
        },
      })
    } catch (err: unknown) {
      console.error('Delete payment error:', err)
      const msg = err instanceof Error ? err.message : String(err)
      setErrorMsg(`Delete failed — ${msg}`)
      showToast(`Delete failed: ${msg}`, 'error')
    } finally {
      setAnimatingDeleteId(null)
      setIsDeleting(false)
    }
  }

  // Selected party's balance for dynamic modal helper badge
  const formPartyId = form?.partyId
  const selectedPartyBalance = useMemo(() => {
    if (!formPartyId) return null
    return partyBalances.find((b) => b.party.id === formPartyId) || null
  }, [formPartyId, partyBalances])

  const companySettings = useMemo(() => getCompanySettings(), [])

  const enteringPaymentAmount = useMemo(() => {
    if (!form) return 0
    if (form.isSplit) {
      const c = parseFloat(form.split.cash) || 0
      const u = parseFloat(form.split.upi) || 0
      const q = parseFloat(form.split.cheque) || 0
      const b = parseFloat(form.split.bankTransfer) || 0
      return c + u + q + b
    }
    return parseFloat(form.amount) || 0
  }, [form])

  const partialCalc = useMemo(() => {
    if (!selectedPartyBalance) return null
    const prior = selectedPartyBalance.balance
    const entering = enteringPaymentAmount
    const remaining = prior - entering
    return {
      prior,
      entering,
      remaining,
      isCleared: remaining === 0 && prior > 0,
      isPartial: remaining > 0 && entering > 0,
      isAdvance: remaining < 0,
    }
  }, [selectedPartyBalance, enteringPaymentAmount])

  // Export statements to CSV
  const handleExportCSV = useCallback(() => {
    if (!filteredPaymentsList.length) return
    const filename = getSanitizedFilename('Billing_Payments')
    exportTableToCSV({
      filename,
      headers: ['Date', 'Party', 'Payment Mode', 'Reference Note', 'Amount (INR)'],
      data: filteredPaymentsList,
      rowMapper: (p) => [
        p.date,
        p.party?.name || '',
        detectPaymentMode(p.note).mode,
        p.note || '',
        Number(p.amount).toFixed(2),
      ],
    })
    showToast(`Exported ${filteredPaymentsList.length} payment records to ${filename}`, 'success')
  }, [filteredPaymentsList, showToast])

  return (
    <PullToRefresh onRefresh={refreshData} className="w-full">
      <div className="flex flex-col pb-32 md:pb-8 animate-in fade-in duration-300 w-full">
        {/* ── Standardized Universal Page Header ── */}
        <PageHeader
          title="Billing & Payments"
          subtitle="Collections, balances & ledger khata"
          rightAction={
            <div className="flex items-center gap-2.5">
              {/* Rounded Month Selector Pill */}
              <MonthSelector
                isOpen={isDatePopoverOpen}
                onClose={() => setIsDatePopoverOpen(false)}
                onToggle={() => setIsDatePopoverOpen((prev) => !prev)}
              />

              {/* Circular Action Button: Triggers Party Balances Bottom-Sheet Drawer */}
              <button
                type="button"
                onClick={() => setIsPartyBalancesOpen(true)}
                className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 flex items-center justify-center text-slate-700 dark:text-slate-200 shadow-xs hover:bg-slate-50 dark:hover:bg-slate-800 active:scale-95 transition-all relative cursor-pointer shrink-0"
                title={`View ${partyBalances.length} Party Balances`}
                aria-label="View Party Balances"
              >
                <Users className="w-4 h-4 sm:w-5 sm:h-5 text-slate-700 dark:text-slate-200" strokeWidth={2.2} />
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 absolute top-1 right-1 border-2 border-white dark:border-slate-900" />
              </button>

              {/* Desktop: Primary Action Button */}
              {!form && parties.length > 0 && (
                <div className="hidden md:flex items-center h-9 ml-1">
                  <Button
                    onClick={() => startAdd()}
                    className="bg-slate-900 hover:bg-slate-800 text-white font-medium rounded-xl shadow-xs px-4 py-2 h-9"
                  >
                    <Plus size={16} strokeWidth={2.5} /> Log Payment
                  </Button>
                </div>
              )}
            </div>
          }
        />

        {/* ── 1. Top Metric Cards (Standardized KPIs) ─────────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
          <KpiCard
            label="TOTAL RECEIVED"
            dotColor="emerald"
            value={fmtMoney(monthCollectedTotal)}
            subtitle={isAllTime ? 'All-time collections' : `${formattedMonth} collections`}
            loading={loading}
          />
          <KpiCard
            label="OUTSTANDING"
            dotColor="amber"
            value={fmtMoney(totalOutstanding)}
            subtitle={
              isAllTime
                ? 'Pending party ledger due'
                : `Billed: ${fmtMoney(monthBilledTotal)} in ${formattedMonth}`
            }
            loading={loading}
          />
          <KpiCard
            label="PAYMENTS LOGGED"
            dotColor="slate"
            value={filteredPayments.length}
            unit="entries"
            subtitle={isAllTime ? 'All-time transactions' : `${formattedMonth} transactions`}
            loading={loading}
            className="hidden lg:flex"
          />
        </div>

        {errorMsg && (
          <div className="rounded-xl p-3.5 text-xs font-medium flex items-center justify-between bg-red-50 text-red-700 border border-red-200/80 shadow-2xs">
            <span>{errorMsg}</span>
            <button
              onClick={() => setErrorMsg(null)}
              className="underline cursor-pointer font-semibold ml-3"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* ── 2. Structured Recent Payments Table (Matches Inward & Outward) ─────────────────────── */}
        <div className="space-y-3 pb-28 md:pb-12">
          {/* Section Header & Search / Actions Toolbar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-0 sm:pt-2">
            <div className="hidden md:block">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 pl-0.5">
                Recent Payments Log ({filteredPaymentsList.length})
              </h2>
              <p className="text-[11.5px] font-normal text-slate-400 dark:text-slate-500 pl-0.5">
                Verified payment receipts & transaction statements
              </p>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              {/* Search Bar */}
              <div className="relative flex-1 sm:w-80">
                <Search
                  size={15}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                />
                <input
                  type="text"
                  placeholder="Search by party or reference..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full h-10 pl-10 pr-9 text-xs font-medium text-slate-900 dark:text-white bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl shadow-[0_1px_2px_rgba(0,0,0,0.03)] placeholder:text-slate-400 focus:outline-none focus:border-slate-900 dark:focus:border-slate-400 transition-all"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 p-0.5 rounded-full cursor-pointer"
                  >
                    <X size={15} />
                  </button>
                )}
              </div>

              {/* Export Statement Button */}
              <button
                type="button"
                onClick={handleExportCSV}
                className="h-10 px-3.5 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 shadow-[0_1px_2px_rgba(0,0,0,0.03)] transition-all flex items-center gap-1.5 cursor-pointer shrink-0 active:scale-95"
                title="Export statement to CSV"
              >
                <Download size={14} strokeWidth={2.2} className="text-slate-500 dark:text-slate-400" />
                <span className="hidden sm:inline">Export Statement</span>
                <span className="sm:hidden">Export</span>
              </button>
            </div>
          </div>

          {filteredPayments.length === 0 && !loading ? (
            <EmptyState
              title={`No payments logged for ${formattedMonth}`}
              description="Record received payments against customer ledger accounts."
              actionLabel="Log Payment"
              onAction={() => startAdd()}
            />
          ) : filteredPaymentsList.length === 0 ? (
            <EmptyState
              icon={Search}
              title="No matching payments found"
              description={`No transactions match "${searchQuery}".`}
              actionLabel="Clear Search"
              onAction={() => setSearchQuery('')}
            />
          ) : (
            <BillingTable
              filteredPaymentsList={filteredPaymentsList}
              totalReceivedFiltered={totalReceivedFiltered}
              animatingDeleteId={animatingDeleteId}
              detectPaymentMode={detectPaymentMode}
              onViewReceipt={(p) => setViewReceipt(p)}
              onEdit={(p) => edit(p)}
              onDelete={(p) => setPaymentToDelete(p)}
            />
          )}
        </div>

        {/* ── 4. Log Received Amount Modal with smooth synchronized bottom-sheet animation ── */}
        <BottomSheetWrapper
          isOpen={isPaymentModalOpen && Boolean(form)}
          onClose={closePaymentModal}
          category="FINANCIAL SETTLEMENT"
          title={form?.id ? 'Edit Payment Voucher' : 'Log Payment'}
          subtitle="Record customer collection, split payments & ledger settlements"
          maxWidth="sm:max-w-lg"
          bodyClassName="p-5 sm:p-6"
          footer={
            form ? (
              <div className="w-full bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200/80 dark:border-slate-800 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] flex items-center gap-3">
                {form.id && (
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        const p = payments.find((x) => x.id === form.id)
                        if (p) {
                          setForm(null)
                          setViewReceipt(p)
                        }
                      }}
                      className="h-12 px-3 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 transition-colors flex items-center gap-1 cursor-pointer shrink-0"
                      title="View Receipt"
                    >
                      <Receipt size={14} />
                      <span className="hidden xs:inline">Receipt</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const p = payments.find((x) => x.id === form.id)
                        if (p) {
                          setForm(null)
                          setPaymentToDelete(p)
                        }
                      }}
                      className="h-12 px-3 rounded-xl text-xs font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/30 border border-rose-200/80 dark:border-rose-900/50 transition-colors flex items-center gap-1 cursor-pointer shrink-0"
                      title="Delete Payment"
                    >
                      <Trash2 size={14} />
                      <span className="hidden xs:inline">Delete</span>
                    </button>
                  </div>
                )}

                <button
                  type="button"
                  onClick={closePaymentModal}
                  disabled={saving}
                  className="h-12 px-5 text-sm font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  form="payment-entry-form"
                  data-save-shortcut="true"
                  disabled={saving || !form.partyId || enteringPaymentAmount <= 0}
                  className="flex-1 h-12 rounded-xl bg-slate-950 dark:bg-white text-white dark:text-slate-950 font-semibold text-sm shadow-md active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {saving ? (
                    <>
                      <Loader2 size={18} className="animate-spin shrink-0" />
                      <span>Recording Payment...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={18} className="shrink-0" />
                      <span>Confirm Payment</span>
                    </>
                  )}
                </button>
              </div>
            ) : null
          }
        >
          {form && (
            <form id="payment-entry-form" onSubmit={submit} className="space-y-4">
              <div className="space-y-4">
                {/* Party Selector & Auto-displayed Ledger Standing */}
                <div>
                  <PartyCombobox
                    id="payments-party-combobox"
                    value={form.partyId}
                    onChange={(partyId) => {
                      setForm({ ...form, partyId })
                      if (fieldErrors.partyId) {
                        setFieldErrors((prev) => {
                          const next = { ...prev }
                          delete next.partyId
                          return next
                        })
                      }
                    }}
                    parties={parties}
                    partyStats={partyStats}
                    error={fieldErrors.partyId}
                    label="Party Account"
                    required
                  />

                  {/* Auto-display selected party's current ledger standing right below field */}
                  {selectedPartyBalance && (
                    <div
                      className={`mt-2 flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium border ${selectedPartyBalance.balance > 0
                          ? 'bg-amber-50/90 border-amber-200 text-amber-800'
                          : selectedPartyBalance.balance < 0
                            ? 'bg-emerald-50/90 border-emerald-200 text-emerald-800'
                            : 'bg-slate-50 border-slate-200 text-slate-600'
                        }`}
                    >
                      <span className="flex items-center gap-1.5">
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${selectedPartyBalance.balance > 0
                              ? 'bg-amber-500'
                              : selectedPartyBalance.balance < 0
                                ? 'bg-emerald-500'
                                : 'bg-slate-400'
                            }`}
                        />
                        <span>Current Ledger Standing:</span>
                      </span>
                      <span className="font-mono font-bold tabular-nums">
                        {selectedPartyBalance.balance > 0
                          ? `Current Balance Due: ${fmtMoney(selectedPartyBalance.balance)}`
                          : selectedPartyBalance.balance < 0
                            ? `Advance Balance: ${fmtMoney(Math.abs(selectedPartyBalance.balance))}`
                            : 'Zero Balance / Fully Settled'}
                      </span>
                    </div>
                  )}
                </div>

                {/* Split Payment Toggle Switch */}
                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-700 border border-slate-200/70 flex items-center justify-center shrink-0">
                      <Split size={15} strokeWidth={2} />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-slate-800 block">Split Payment</span>
                      <span className="text-[11px] text-slate-500 block">
                        Split into multiple payment modes (Cash, UPI, Cheque, Bank)
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={form.isSplit}
                    onClick={() => {
                      const next = !form.isSplit
                      if (next) {
                        const existingAmt = form.amount ? form.amount : ''
                        setForm({
                          ...form,
                          isSplit: true,
                          split: { ...form.split, cash: existingAmt },
                        })
                      } else {
                        const total =
                          (parseFloat(form.split.cash) || 0) +
                          (parseFloat(form.split.upi) || 0) +
                          (parseFloat(form.split.cheque) || 0) +
                          (parseFloat(form.split.bankTransfer) || 0)
                        setForm({
                          ...form,
                          isSplit: false,
                          amount: total > 0 ? String(total) : form.amount,
                        })
                      }
                    }}
                    className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${form.isSplit ? 'bg-slate-900' : 'bg-slate-200'
                      }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-xs ring-0 transition duration-200 ease-in-out ${form.isSplit ? 'translate-x-4' : 'translate-x-0'
                        }`}
                    />
                  </button>
                </div>

                {/* ── Split Payment Matrix (4 rows: Cash, UPI, Cheque, Bank/NEFT) ── */}
                {form.isSplit ? (
                  <div className="p-3.5 bg-slate-50/70 rounded-xl border border-slate-200 space-y-2.5 animate-in fade-in duration-200">
                    <div className="flex items-center justify-between pb-1 border-b border-slate-200/80">
                      <span className="text-[10.5px] font-bold uppercase tracking-wider text-slate-600">
                        Split Payment Matrix
                      </span>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] text-slate-500 font-medium">Split Total:</span>
                        <span className="text-xs font-mono font-bold text-slate-900 tabular-nums">
                          ₹{enteringPaymentAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>

                    {/* Warning / Indicator if Split Total does not match desired settlement amount */}
                    {selectedPartyBalance && selectedPartyBalance.balance > 0 && (
                      <div
                        className={`text-[11px] font-medium px-2.5 py-1.5 rounded-lg border flex items-center justify-between ${Math.abs(enteringPaymentAmount - selectedPartyBalance.balance) < 0.01
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            : 'bg-amber-50 text-amber-800 border-amber-200'
                          }`}
                      >
                        <span>
                          Target Due: ₹
                          {selectedPartyBalance.balance.toLocaleString('en-IN', {
                            minimumFractionDigits: 2,
                          })}
                        </span>
                        <span className="font-mono font-semibold">
                          {Math.abs(enteringPaymentAmount - selectedPartyBalance.balance) < 0.01
                            ? '✓ Exact match'
                            : enteringPaymentAmount < selectedPartyBalance.balance
                              ? `₹${(selectedPartyBalance.balance - enteringPaymentAmount).toFixed(2)} remaining`
                              : `₹${(enteringPaymentAmount - selectedPartyBalance.balance).toFixed(2)} excess`}
                        </span>
                      </div>
                    )}

                    {/* Row 1: Cash */}
                    <div className="grid grid-cols-12 gap-2 items-center bg-white p-2 rounded-lg border border-slate-200/80 shadow-2xs">
                      <div className="col-span-4 flex items-center gap-1.5 text-xs font-semibold text-slate-700">
                        <Banknote size={14} className="text-slate-600 shrink-0" />
                        <span>Cash (₹)</span>
                      </div>
                      <div className="col-span-8">
                        <input
                          type="text"
                          inputMode="decimal"
                          placeholder="0.00"
                          value={form.split.cash}
                          onChange={(e) => {
                            const val = sanitizeNumericInput(e.target.value, true)
                            setForm({ ...form, split: { ...form.split, cash: val } })
                          }}
                          className="w-full h-8 px-2.5 text-xs font-mono font-bold tabular-nums text-slate-900 bg-slate-50 border border-slate-200 rounded-md focus:outline-none focus:bg-white focus:border-slate-900"
                        />
                      </div>
                    </div>

                    {/* Row 2: UPI / Online */}
                    <div className="grid grid-cols-12 gap-2 items-center bg-white p-2 rounded-lg border border-slate-200/80 shadow-2xs">
                      <div className="col-span-4 flex items-center gap-1.5 text-xs font-semibold text-slate-700">
                        <Smartphone size={14} className="text-emerald-600 shrink-0" />
                        <span>UPI / Online (₹)</span>
                      </div>
                      <div className="col-span-4">
                        <input
                          type="text"
                          inputMode="decimal"
                          placeholder="0.00"
                          value={form.split.upi}
                          onChange={(e) => {
                            const val = sanitizeNumericInput(e.target.value, true)
                            setForm({ ...form, split: { ...form.split, upi: val } })
                          }}
                          className="w-full h-8 px-2.5 text-xs font-mono font-bold tabular-nums text-slate-900 bg-slate-50 border border-slate-200 rounded-md focus:outline-none focus:bg-white focus:border-slate-900"
                        />
                      </div>
                      <div className="col-span-4">
                        <input
                          type="text"
                          placeholder="UTR / Ref No."
                          value={form.split.upiRef}
                          onChange={(e) =>
                            setForm({ ...form, split: { ...form.split, upiRef: e.target.value } })
                          }
                          className="w-full h-8 px-2.5 text-[11.5px] font-medium text-slate-800 bg-slate-50 border border-slate-200 rounded-md focus:outline-none focus:bg-white focus:border-slate-900"
                        />
                      </div>
                    </div>

                    {/* Row 3: Cheque */}
                    <div className="grid grid-cols-12 gap-2 items-center bg-white p-2 rounded-lg border border-slate-200/80 shadow-2xs">
                      <div className="col-span-4 flex items-center gap-1.5 text-xs font-semibold text-slate-700">
                        <Receipt size={14} className="text-blue-600 shrink-0" />
                        <span>Cheque (₹)</span>
                      </div>
                      <div className="col-span-4">
                        <input
                          type="text"
                          inputMode="decimal"
                          placeholder="0.00"
                          value={form.split.cheque}
                          onChange={(e) => {
                            const val = sanitizeNumericInput(e.target.value, true)
                            setForm({ ...form, split: { ...form.split, cheque: val } })
                          }}
                          className="w-full h-8 px-2.5 text-xs font-mono font-bold tabular-nums text-slate-900 bg-slate-50 border border-slate-200 rounded-md focus:outline-none focus:bg-white focus:border-slate-900"
                        />
                      </div>
                      <div className="col-span-4">
                        <input
                          type="text"
                          placeholder="Chq # & Bank"
                          value={form.split.chequeRef}
                          onChange={(e) =>
                            setForm({ ...form, split: { ...form.split, chequeRef: e.target.value } })
                          }
                          className="w-full h-8 px-2.5 text-[11.5px] font-medium text-slate-800 bg-slate-50 border border-slate-200 rounded-md focus:outline-none focus:bg-white focus:border-slate-900"
                        />
                      </div>
                    </div>

                    {/* Row 4: Bank / NEFT */}
                    <div className="grid grid-cols-12 gap-2 items-center bg-white p-2 rounded-lg border border-slate-200/80 shadow-2xs">
                      <div className="col-span-4 flex items-center gap-1.5 text-xs font-semibold text-slate-700">
                        <Landmark size={14} className="text-sky-600 shrink-0" />
                        <span>Bank / NEFT (₹)</span>
                      </div>
                      <div className="col-span-4">
                        <input
                          type="text"
                          inputMode="decimal"
                          placeholder="0.00"
                          value={form.split.bankTransfer}
                          onChange={(e) => {
                            const val = sanitizeNumericInput(e.target.value, true)
                            setForm({ ...form, split: { ...form.split, bankTransfer: val } })
                          }}
                          className="w-full h-8 px-2.5 text-xs font-mono font-bold tabular-nums text-slate-900 bg-slate-50 border border-slate-200 rounded-md focus:outline-none focus:bg-white focus:border-slate-900"
                        />
                      </div>
                      <div className="col-span-4">
                        <input
                          type="text"
                          placeholder="Txn Reference"
                          value={form.split.bankRef}
                          onChange={(e) =>
                            setForm({ ...form, split: { ...form.split, bankRef: e.target.value } })
                          }
                          className="w-full h-8 px-2.5 text-[11.5px] font-medium text-slate-800 bg-slate-50 border border-slate-200 rounded-md focus:outline-none focus:bg-white focus:border-slate-900"
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  /* ── Single Amount & Mode Selection ── */
                  <>
                    {/* Big Amount Hero Input */}
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 tracking-wider">
                        Amount Received *
                      </label>
                      <div className="relative flex items-baseline gap-1.5 border-b-2 border-slate-200 focus-within:border-slate-900 transition-colors pb-1">
                        <span className="text-2xl font-bold font-mono text-slate-400 select-none">
                          ₹
                        </span>
                        <input
                          type="text"
                          inputMode="decimal"
                          autoFocus={shouldAutoFocusSearch()}
                          required
                          placeholder="0.00"
                          value={form.amount}
                          onChange={(e) => {
                            const clean = sanitizeNumericInput(e.target.value, true)
                            setForm({ ...form, amount: clean })
                            if (fieldErrors.amount) {
                              setFieldErrors((prev) => {
                                const next = { ...prev }
                                delete next.amount
                                return next
                              })
                            }
                          }}
                          className="w-full text-3xl font-bold font-mono tracking-tight text-slate-900 placeholder:text-slate-300 bg-transparent outline-none tabular-nums"
                        />
                      </div>
                      <FieldError error={fieldErrors.amount} />
                    </div>

                    {/* Payment Mode Segmented Tab Control */}
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase mb-1.5 tracking-wider">
                        Payment Mode
                      </label>
                      <div className="h-11 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl grid grid-cols-3 gap-1 items-center">
                        {[
                          { id: 'Cash', label: 'Cash', icon: Banknote },
                          { id: 'UPI / Online', label: 'UPI / Online', icon: Smartphone },
                          { id: 'Cheque', label: 'Cheque', icon: Receipt },
                        ].map((tab) => {
                          const Icon = tab.icon
                          const isSelected = form.mode === tab.id
                          return (
                            <button
                              key={tab.id}
                              type="button"
                              onClick={() => setForm({ ...form, mode: tab.id as PaymentModeCategory })}
                              className={`h-full rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${isSelected
                                  ? 'bg-slate-950 dark:bg-white text-white dark:text-slate-950 shadow-sm'
                                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                                }`}
                            >
                              <Icon size={14} className={isSelected ? 'text-white dark:text-slate-950' : 'text-slate-400'} />
                              <span className="truncate">{tab.label}</span>
                            </button>
                          )
                        })}
                      </div>
                    </div>

                    {/* Reference / Narration Input */}
                    {form.mode !== 'Cash' && (
                      <div className="animate-in fade-in duration-200">
                        <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase mb-1.5 tracking-wider">
                          {form.mode === 'UPI / Online'
                            ? 'Transaction / UTR Reference (Optional)'
                            : 'Cheque No. & Bank Name (Optional)'}
                        </label>
                        <input
                          type="text"
                          placeholder={
                            form.mode === 'UPI / Online'
                              ? 'e.g. UTR #9823482, Google Pay, PhonePe'
                              : 'e.g. Cheque #004521 SBI'
                          }
                          value={form.reference}
                          onChange={(e) => setForm({ ...form, reference: e.target.value })}
                          className="h-11 w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 text-sm font-semibold text-slate-900 dark:text-white placeholder:text-slate-400 focus:ring-2 focus:ring-slate-900/10 dark:focus:ring-white/10 outline-none transition-all"
                        />
                      </div>
                    )}
                  </>
                )}

                {/* Receipt Date */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase mb-1.5 tracking-wider">
                    Receipt Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={form.date}
                    onChange={(e) => {
                      setForm({ ...form, date: e.target.value })
                      if (fieldErrors.date) {
                        setFieldErrors((prev) => {
                          const next = { ...prev }
                          delete next.date
                          return next
                        })
                      }
                    }}
                    className={`h-11 w-full bg-white dark:bg-slate-900 border rounded-xl px-3.5 text-sm font-semibold font-mono text-slate-900 dark:text-white placeholder:text-slate-400 focus:ring-2 focus:ring-slate-900/10 dark:focus:ring-white/10 outline-none transition-all ${fieldErrors.date ? 'border-rose-400 ring-2 ring-rose-400/20' : 'border-slate-200 dark:border-slate-800'
                      }`}
                  />
                  <FieldError error={fieldErrors.date} />
                </div>

                {/* ── Live Ledger Impact Preview Box ── */}
                {partialCalc && (
                  <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3.5 space-y-2.5 animate-in fade-in duration-200">
                    <div className="flex items-center justify-between">
                      <span className="text-[10.5px] font-bold uppercase tracking-wider text-slate-500">
                        Ledger Impact Summary
                      </span>
                      {/* Quick Full Settlement / Zero Balance shortcut button */}
                      {selectedPartyBalance && selectedPartyBalance.balance > 0 && (
                        <button
                          type="button"
                          onClick={() => {
                            const balStr = String(selectedPartyBalance.balance)
                            if (form.isSplit) {
                              setForm({
                                ...form,
                                split: { ...emptySplit(), cash: balStr },
                              })
                            } else {
                              setForm({ ...form, amount: balStr })
                            }
                            if (fieldErrors.amount) {
                              setFieldErrors((prev) => {
                                const next = { ...prev }
                                delete next.amount
                                return next
                              })
                            }
                          }}
                          className="text-[11px] font-semibold text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-100 border border-slate-200/90 rounded-md px-2 py-0.5 shadow-2xs transition-colors flex items-center gap-1 cursor-pointer"
                          title="Auto-fill exact full balance due"
                        >
                          <CheckCircle2 size={12} className="text-emerald-600" />
                          <span>Full Settlement (Zero Balance)</span>
                        </button>
                      )}
                    </div>

                    {/* 3-column micro breakdown: [ Prior Due: ₹8,048 ] → [ This Payment: -₹X,XXX ] = [ Remaining Balance: ₹X,XXX ] */}
                    <div className="grid grid-cols-3 gap-2 bg-white rounded-lg p-2.5 border border-slate-200/70 shadow-2xs text-center">
                      <div>
                        <div className="text-[9.5px] font-bold uppercase tracking-wider text-slate-400 mb-0.5">
                          Prior Due
                        </div>
                        <div className="text-xs font-mono font-bold text-slate-800 tabular-nums">
                          {fmtMoney(partialCalc.prior)}
                        </div>
                      </div>
                      <div>
                        <div className="text-[9.5px] font-bold uppercase tracking-wider text-slate-400 mb-0.5">
                          This Payment
                        </div>
                        <div className="text-xs font-mono font-bold text-emerald-600 tabular-nums">
                          -{fmtMoney(partialCalc.entering)}
                        </div>
                      </div>
                      <div>
                        <div className="text-[9.5px] font-bold uppercase tracking-wider text-slate-400 mb-0.5">
                          Remaining
                        </div>
                        <div
                          className={`text-xs font-mono font-bold tabular-nums ${partialCalc.remaining > 0
                              ? 'text-rose-600'
                              : partialCalc.remaining < 0
                                ? 'text-emerald-600'
                                : 'text-slate-600'
                            }`}
                        >
                          {partialCalc.remaining > 0
                            ? fmtMoney(partialCalc.remaining)
                            : partialCalc.remaining < 0
                              ? `${fmtMoney(Math.abs(partialCalc.remaining))} (Adv)`
                              : '₹0.00'}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Danger Zone for Deleting Saved Payment Receipt (Pattern 2) */}
                {form.id && (
                  <DangerZone
                    title="Danger Zone"
                    description="Permanently delete this customer payment entry and revert the ledger balance. It can be restored from the Trash Bin."
                    itemName={`Payment Voucher: ₹${form.amount} (${parties.find((p) => p.id === form.partyId)?.name || 'Party'})`}
                    buttonLabel="Delete Payment"
                    isDeleting={saving}
                    onDelete={async () => {
                      const p = payments.find((x) => x.id === form.id)
                      closePaymentModal()
                      if (p) {
                        setPaymentToDelete(p)
                      }
                    }}
                  />
                )}
              </div>
            </form>
          )}
        </BottomSheetWrapper>

        {/* ── Official Printable Payment Receipt Voucher Modal ──────────── */}
        <BottomSheetWrapper
          isOpen={Boolean(viewReceipt)}
          onClose={() => setViewReceipt(null)}
          hideHeader={true}
          hideDragHandle={true}
          maxWidth="sm:max-w-lg"
          maxHeight="max-h-[92vh]"
          className="pb-safe"
        >
          {viewReceipt && (
            <div className="flex flex-col flex-1 min-h-0 bg-white">
              {/* Mobile Drag Indicator (hidden on desktop) */}
              <div className="md:hidden pt-2.5 pb-1 flex justify-center bg-slate-900 shrink-0">
                <div className="w-12 h-1.5 bg-slate-700 rounded-full" />
              </div>

              {/* Modal Top Control Bar (Hidden when printed) */}
              <div className="no-print modal-header px-5 py-3.5 bg-slate-900 text-white flex justify-between items-center shrink-0">
                <div className="flex items-center gap-2">
                  <Receipt size={17} className="text-emerald-400" />
                  <span className="text-sm font-bold tracking-tight">Payment Receipt Voucher</span>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => {
                      const target = viewReceipt
                      setViewReceipt(null)
                      setPaymentToDelete(target)
                    }}
                    className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-rose-400 transition-colors cursor-pointer"
                    title="Delete Payment Entry"
                    aria-label="Delete Payment Entry"
                  >
                    <Trash2 size={16} strokeWidth={2} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewReceipt(null)}
                    className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
                    aria-label="Close Voucher"
                  >
                    <X size={17} strokeWidth={2.2} />
                  </button>
                </div>
              </div>

              {/* Printable Voucher Document */}
              <div id="printable-manifest" className="p-6 sm:p-8 space-y-5 overflow-y-auto no-scrollbar bg-white text-slate-900 printable-document">
                {/* Company Header */}
                <div className="text-center pb-4 border-b-2 border-slate-800">
                  <h2 className="text-xl font-black uppercase tracking-tight text-slate-900">
                    {companySettings.companyName}
                  </h2>
                  <p className="text-xs font-semibold text-slate-600 mt-0.5">
                    Jobwork Processors &bull; Raw Kasab &amp; Val Refining
                  </p>
                  {companySettings.address && (
                    <p className="text-[11px] text-slate-500 mt-0.5">{companySettings.address}</p>
                  )}
                  <div className="flex flex-wrap items-center justify-center gap-3 text-[11px] font-medium text-slate-600 mt-1">
                    {companySettings.phone && <span>Ph: {companySettings.phone}</span>}
                    {companySettings.gstin && (
                      <span className="font-bold text-slate-800">GSTIN: {companySettings.gstin}</span>
                    )}
                  </div>
                  <div className="mt-2.5 inline-block px-3 py-1 rounded bg-slate-100 border border-slate-300 text-[11px] font-black uppercase tracking-wider text-slate-800">
                    OFFICIAL PAYMENT RECEIPT
                  </div>
                </div>

                {/* Receipt Metadata Grid */}
                <div className="grid grid-cols-2 gap-3 text-xs bg-slate-50 p-3.5 rounded-xl border border-slate-200/80">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">
                      Receipt Voucher #
                    </span>
                    <span className="font-mono font-bold text-slate-900 text-[13px]">
                      RCP-{viewReceipt.id.slice(0, 8).toUpperCase()}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">
                      Date of Receipt
                    </span>
                    <span className="font-semibold text-slate-800">{fmtDate(viewReceipt.date)}</span>
                  </div>
                  <div className="col-span-2 pt-1 border-t border-slate-200/60">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">
                      Received With Thanks From
                    </span>
                    <span className="text-[14px] font-bold text-slate-900 block">
                      {viewReceipt.party?.name || 'Party Account'}
                    </span>
                    {(() => {
                      const rParty = parties.find((p) => p.id === viewReceipt.party_id)
                      return rParty?.phone ? (
                        <span className="text-[11px] text-slate-500">Contact: {rParty.phone}</span>
                      ) : null
                    })()}
                  </div>
                </div>

                {/* Amount Display */}
                <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-4 text-center">
                  <span className="text-[10.5px] font-bold uppercase tracking-wider text-emerald-800 block mb-1">
                    Amount Received
                  </span>
                  <div className="text-3xl font-black tracking-tight text-emerald-700 tabular-nums">
                    {fmtMoney(viewReceipt.amount)}
                  </div>
                  <div className="mt-2 text-xs font-semibold text-emerald-900 italic border-t border-emerald-200/60 pt-1.5">
                    &ldquo;{numberToWordsINR(Number(viewReceipt.amount))}&rdquo;
                  </div>
                </div>

                {/* Mode & Split Breakdown Details */}
                <div className="space-y-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block pl-0.5">
                    Payment Mode &amp; Reference
                  </span>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-slate-700">Payment Category:</span>
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold border ${detectPaymentMode(viewReceipt.note).style
                          }`}
                      >
                        {detectPaymentMode(viewReceipt.note).mode}
                      </span>
                    </div>
                    {viewReceipt.note && (
                      <div className="pt-2 border-t border-slate-200/60 text-slate-600 font-medium">
                        <span className="font-semibold text-slate-700">Details: </span>
                        <span>{viewReceipt.note}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Ledger Summary Footnote */}
                {viewReceipt.party_id && partyStats[viewReceipt.party_id] && (
                  <div className="p-3 rounded-xl border border-slate-200 bg-slate-50/60 text-xs flex items-center justify-between">
                    <span className="text-[11px] font-medium text-slate-500">Current Balance Due:</span>
                    <span
                      className={`font-mono font-bold ${(partyStats[viewReceipt.party_id]?.balance || 0) > 0
                          ? 'text-amber-700'
                          : 'text-emerald-700'
                        }`}
                    >
                      {fmtMoney(partyStats[viewReceipt.party_id]?.balance || 0)}
                    </span>
                  </div>
                )}

                {/* Authorized Signature Block */}
                <div className="pt-8 grid grid-cols-2 gap-6 text-center text-xs text-slate-500">
                  <div>
                    <div className="h-10 border-b border-dashed border-slate-300 mx-4" />
                    <span className="mt-1.5 block font-medium">Payer&apos;s Signature</span>
                  </div>
                  <div>
                    <div className="h-10 border-b border-dashed border-slate-300 mx-4" />
                    <span className="mt-1.5 block font-bold text-slate-700">Authorized Signatory</span>
                    <span className="text-[10px] text-slate-400 block">For {companySettings.companyName}</span>
                  </div>
                </div>
              </div>

              {/* Modal Bottom Actions (Hidden when printed) */}
              <div className="no-print px-5 sm:px-6 py-3.5 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex justify-between items-center shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    const target = viewReceipt
                    setViewReceipt(null)
                    setPaymentToDelete(target)
                  }}
                  className="px-3.5 py-2 rounded-xl border border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer active:scale-95"
                  title="Delete Payment Entry"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setViewReceipt(null)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                  >
                    Close
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      shareOrPrintDocument('printable-manifest', {
                        documentTitle: `Payment_Receipt_${viewReceipt.id.slice(0, 8)}`,
                      })
                    }
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95"
                  >
                    {isMobileDevice() ? <Share2 size={14} /> : <Printer size={14} />}
                    <span>{isMobileDevice() ? 'Share / Print' : 'Print Official Receipt'}</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </BottomSheetWrapper>

        {/* ── Party Balances Drawer Sheet ───────────────────────────────── */}
        <PartyBalancesSheet
          isOpen={isPartyBalancesOpen}
          onClose={() => setIsPartyBalancesOpen(false)}
          partyBalances={partyBalances}
          totalOutstanding={totalOutstanding}
          onLogPayment={(partyId) => startAdd(partyId)}
          onOpenKhata={(party) => setActiveKhataParty(party)}
        />

        {/* ── Party Khata Ledger Modal (Inline from Party Cards) ─────────── */}
        {activeKhataParty && (
          <PartyKhataModal
            isOpen={!!activeKhataParty}
            onClose={() => setActiveKhataParty(null)}
            party={activeKhataParty}
            stats={partyStats[activeKhataParty.id] || null}
            receipts={receipts}
            dispatches={dispatches}
            payments={payments}
            onDataChange={refreshData}
          />
        )}

        {/* ── Delete Payment Confirmation Dialog ────────────────────────────── */}
        {paymentToDelete && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 animate-in fade-in duration-150"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="delete-dialog-title"
            aria-describedby="delete-dialog-desc"
          >
            <div
              className="bg-white dark:bg-neutral-900 w-full max-w-[440px] rounded-2xl shadow-2xl border border-slate-200/80 dark:border-neutral-800 p-6 animate-in zoom-in-95 duration-150 relative overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Soft Red Trash Icon Badge & Close Button */}
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 flex items-center justify-center border border-rose-100 dark:border-rose-900/50 shadow-xs">
                  <Trash2 size={22} strokeWidth={2.2} />
                </div>
                <button
                  type="button"
                  onClick={() => setPaymentToDelete(null)}
                  disabled={isDeleting}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer disabled:opacity-50"
                  aria-label="Close dialog"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Title */}
              <h3
                id="delete-dialog-title"
                className="text-lg font-bold text-slate-900 dark:text-white tracking-tight"
              >
                Delete Payment Entry?
              </h3>

              {/* Description */}
              <p
                id="delete-dialog-desc"
                className="text-[13.5px] text-slate-500 dark:text-neutral-400 mt-2 leading-relaxed"
              >
                Are you sure you want to delete this payment receipt of <span className="font-semibold text-slate-900 dark:text-white">₹{Number(paymentToDelete.amount).toLocaleString('en-IN')}</span> from <span className="font-semibold text-slate-900 dark:text-white">{paymentToDelete.party?.name || 'this party'}</span>? This will revert the party&apos;s ledger balance.
              </p>

              {/* Action buttons: Ghost "Cancel" and Solid Destructive "Delete Payment" */}
              <div className="mt-6 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setPaymentToDelete(null)}
                  disabled={isDeleting}
                  className="px-4 py-2.5 rounded-xl text-sm font-semibold text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={confirmDeletePayment}
                  disabled={isDeleting}
                  className="px-4 py-2.5 rounded-xl text-sm font-semibold bg-rose-600 hover:bg-rose-700 text-white shadow-sm transition-all cursor-pointer flex items-center gap-2 active:scale-98 disabled:opacity-50"
                >
                  {isDeleting ? (
                    <>
                      <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Deleting...</span>
                    </>
                  ) : (
                    'Delete Payment'
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Floating Action Button consolidated into global Speed Dial FAB */}
      </div>
    </PullToRefresh>
  )
}
