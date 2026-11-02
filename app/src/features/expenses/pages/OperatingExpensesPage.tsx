import { useState, useEffect, useMemo, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { BottomSheetModal } from '@/components/sheets/BottomSheetModal'
import { clearModalHash } from '@/components/sheets/bottomSheetPhysics'
import {
  Plus,
  Trash2,
  X,
  Search,
  Receipt,
  BarChart3,
  ChevronDown,
  Printer,
  Share2,
  CheckCircle2,
  Loader2,
} from 'lucide-react'
import {
  insertExpense,
  updateExpense,
  type ExpensePayload,
} from '@/services/api/expenses'
import { useData } from '@/hooks/useData'
import { useExpenseMetrics } from '@/hooks/useExpenseMetrics'
import { MonthSelector } from '@/components/common/MonthSelector'

import type { Expense } from '@/features/expenses/types/expense.types'
import { fmtDate, todayStr } from '@/utils/date'
import { fmtMoney } from '@/utils/format'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/common/Button'
import { EmptyState } from '@/components/common/EmptyState'
import { KpiCard } from '@/components/common/KpiCard'
import { PullToRefresh } from '@/components/common/PullToRefresh'
import { useMonth } from '@/context/MonthContext'
import { useToast } from '@/context/ToastContext'
import { FieldError } from '@/components/common/FieldError'
import { ExpenseFormSchema, formatZodErrors } from '@/lib/validation/schemas'
import { ActionSheet } from '@/components/feedback/ActionSheet'
import { DangerZone } from '@/components/feedback/DangerZone'
import { addToTrashBin } from '@/services/storage/trashBinService'
import { sanitizeNumericInput, numberToWordsINR } from '@/utils/numberInput'
import { exportRawRowsToCSV, getSanitizedFilename } from '@/utils/exportHelpers'
import { getCompanySettings } from '@/features/settings/utils'
import { shareOrPrintDocument, isMobileDevice } from '@/utils/nativeShare'
import {
  saveExpenseDraft,
  loadExpenseDraft,
  clearExpenseDraft,
  registerAppBackgroundListener,
} from '@/services/storage/challanDraftStorage'

import { ExpenseTable } from '@/features/expenses/components/ExpenseTable'
import { MoMBreakdownSheet } from '@/features/expenses/sheets/MoMBreakdownSheet'
import {
  EXPENSE_CATEGORIES,
  EXPENSE_MODAL_CATEGORIES,
  standardizeCategory,
  cleanEmojiAndMode,
} from '@/features/expenses/constants'

// ── Payment Mode Detection Helper ────────────────────────────────────────────
function detectExpensePaymentMode(expense: Expense): { mode: string; isUPI: boolean; isBank: boolean } {
  const note = (expense.note || '').toLowerCase()
  if (note.includes('(cash)') || note.includes('cash')) {
    return { mode: 'Cash', isUPI: false, isBank: false }
  }
  if (note.includes('(upi)') || note.includes('upi') || note.includes('gpay') || note.includes('phonepe') || note.includes('online')) {
    return { mode: 'UPI', isUPI: true, isBank: false }
  }
  if (note.includes('(bank transfer)') || note.includes('neft') || note.includes('rtgs') || note.includes('bank') || note.includes('transfer')) {
    return { mode: 'Bank Transfer', isUPI: false, isBank: true }
  }
  if (note.includes('cheque') || note.includes('chq')) {
    return { mode: 'Cheque', isUPI: false, isBank: true }
  }
  const cat = (expense.category || '').toLowerCase()
  const amt = Number(expense.amount) || 0
  if (cat.includes('rent') || amt >= 10000) {
    return { mode: 'Bank Transfer', isUPI: false, isBank: true }
  }
  if (amt >= 500 && (note.includes('petrol') || note.includes('tyre') || note.includes('bugari'))) {
    return { mode: 'UPI', isUPI: true, isBank: false }
  }
  return { mode: 'Cash', isUPI: false, isBank: false }
}

export function getPaymentModeBadge(mode: string): { label: string; style: string } {
  const m = mode.toLowerCase()
  if (m.includes('upi') || m.includes('online')) {
    return {
      label: 'UPI',
      style:
        'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200/70 dark:border-emerald-800/60 text-[10px] font-medium px-2 py-0.5 rounded-md',
    }
  }
  if (m.includes('bank') || m.includes('neft') || m.includes('rtgs') || m.includes('transfer')) {
    return {
      label: 'Bank',
      style:
        'bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 border border-sky-200/70 dark:border-sky-800/60 text-[10px] font-medium px-2 py-0.5 rounded-md',
    }
  }
  if (m.includes('cheque') || m.includes('chq')) {
    return {
      label: 'Cheque',
      style:
        'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200/70 dark:border-blue-800/60 text-[10px] font-medium px-2 py-0.5 rounded-md',
    }
  }
  return {
    label: 'Cash',
    style:
      'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200/70 dark:border-amber-800/60 text-[10px] font-medium px-2 py-0.5 rounded-md',
  }
}

interface ExpenseFormState {
  id: string | null
  date: string
  category: string
  amount: string
  note: string
  paymentMode: 'Cash' | 'UPI' | 'Bank Transfer'
}

export default function Expenses() {
  const [searchParams] = useSearchParams()
  const { formattedMonth, isAllTime } = useMonth()
  const { showToast } = useToast()
  const { expenses, loading, removeExpense, refreshData } = useData()
  const companySettings = useMemo(() => getCompanySettings(), [])

  const initialExpenseDraft = useMemo(() => loadExpenseDraft(), [])
  const [form, setForm] = useState<ExpenseFormState | null>(initialExpenseDraft)
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(Boolean(initialExpenseDraft))
  const [expenseToDelete, setExpenseToDelete] = useState<Expense | null>(null)
  const [viewReceiptExpense, setViewReceiptExpense] = useState<Expense | null>(null)
  const [isMoMSheetOpen, setIsMoMSheetOpen] = useState(false)
  const [isDatePopoverOpen, setIsDatePopoverOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  // Auto-save expense draft & register background listener
  useEffect(() => {
    if (!form || !isExpenseModalOpen) return
    const isDirty = form.amount.trim().length > 0 || form.note.trim().length > 0
    if (isDirty) {
      const timer = setTimeout(() => {
        saveExpenseDraft(form)
      }, 300)
      return () => clearTimeout(timer)
    } else {
      clearExpenseDraft()
    }
  }, [form, isExpenseModalOpen])

  useEffect(() => {
    if (!form || !isExpenseModalOpen) return
    const cleanup = registerAppBackgroundListener(() => {
      const isDirty = form.amount.trim().length > 0 || form.note.trim().length > 0
      if (isDirty) {
        saveExpenseDraft(form)
      }
    })
    return cleanup
  }, [form, isExpenseModalOpen])

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL')
  const [selectedPaymentMode, setSelectedPaymentMode] = useState<string>('ALL')

  // Pagination
  const [currentPage, setCurrentPage] = useState(1)
  const pageSize = 15

  const {
    filteredExpenses,
    monthTotal: monthExpenseTotal,
    categoryCounts,
    topCategory,
    topCategoryAmount,
    displayExpenses,
    displayTotal,
    totalPages,
    paginatedExpenses,
  } = useExpenseMetrics({
    searchQuery,
    selectedCategory,
    selectedPaymentMode,
    currentPage,
    pageSize,
  })

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  const blankForm = (): ExpenseFormState => {
    let sharedNote = ''
    let sharedAmt = ''
    try {
      const storedText = sessionStorage.getItem('valmanager_shared_import_text')
      const storedAmt = sessionStorage.getItem('valmanager_shared_import_amount')
      if (storedText) {
        sharedNote = storedText
        sessionStorage.removeItem('valmanager_shared_import_text')
      }
      if (storedAmt) {
        sharedAmt = storedAmt
        sessionStorage.removeItem('valmanager_shared_import_amount')
      }
    } catch {}

    return {
      id: null,
      date: todayStr(),
      category: EXPENSE_MODAL_CATEGORIES[0], // Labor
      amount: sharedAmt,
      note: sharedNote,
      paymentMode:
        sharedNote.toLowerCase().includes('upi') ||
        sharedNote.toLowerCase().includes('online') ||
        sharedNote.toLowerCase().includes('gpay')
          ? 'UPI'
          : 'Cash',
    }
  }

  const startAdd = useCallback(() => {
    window.history.pushState(null, '', '#modal')
    setForm(blankForm())
    setIsExpenseModalOpen(true)
    setErrorMsg(null)
    setFieldErrors({})
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [])

  const closeExpenseModal = useCallback(() => {
    clearModalHash()
    clearExpenseDraft()
    setIsExpenseModalOpen(false)
    setTimeout(() => {
      setForm(null)
      setErrorMsg(null)
      setFieldErrors({})
    }, 300)
  }, [])

  useEffect(() => {
    if (searchParams.get('action') === 'new') {
      startAdd()
      const next = new URLSearchParams(searchParams)
      next.delete('action')
      const qs = next.toString() ? `?${next.toString()}` : ''
      window.history.replaceState(window.history.state, '', `${window.location.pathname}${qs}#modal`)
    }
  }, [searchParams, startAdd])

  // Context-aware FAB custom event listener
  useEffect(() => {
    const handleOpenModal = () => {
      startAdd()
    }
    window.addEventListener('kasab:open-expense-modal', handleOpenModal)
    return () => {
      window.removeEventListener('kasab:open-expense-modal', handleOpenModal)
    }
  }, [startAdd])

  const edit = (x: Expense) => {
    window.history.pushState(null, '', '#modal')
    const detected = detectExpensePaymentMode(x)
    const mode = (['Cash', 'UPI', 'Bank Transfer'].includes(detected.mode)
      ? detected.mode
      : 'Cash') as 'Cash' | 'UPI' | 'Bank Transfer'

    setForm({
      id: x.id,
      date: x.date,
      category: standardizeCategory(x.category, x.note),
      amount: String(x.amount),
      note: cleanEmojiAndMode(x.note),
      paymentMode: mode,
    })
    setIsExpenseModalOpen(true)
    setErrorMsg(null)
    setFieldErrors({})
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form) return

    setFieldErrors({})
    setErrorMsg(null)

    const validation = ExpenseFormSchema.safeParse({
      date: form.date,
      category: form.category,
      amount: form.amount,
      note: form.note,
      paymentMode: form.paymentMode,
    })

    if (!validation.success) {
      const errs = formatZodErrors(validation.error)
      setFieldErrors(errs)
      showToast('Please correct the highlighted expense fields.', 'warning')
      return
    }

    const amt = parseFloat(form.amount)

    setSaving(true)
    setErrorMsg(null)

    const baseNote = cleanEmojiAndMode(form.note)
    const finalNote = baseNote
      ? `${baseNote} (${form.paymentMode})`
      : `Paid via ${form.paymentMode}`

    const payload: ExpensePayload = {
      date: form.date,
      category: form.category,
      amount: amt,
      note: finalNote,
    }

    try {
      if (form.id) {
        await updateExpense(form.id, payload)
        showToast('Expense voucher updated successfully', 'success')
      } else {
        await insertExpense(payload)
        showToast('Expense voucher recorded successfully', 'success')
      }
      closeExpenseModal()
      await refreshData()
    } catch (err: unknown) {
      console.error('Save expense error:', err)
      const msg = err instanceof Error ? err.message : String(err)
      setErrorMsg(`Could not save — ${msg}`)
      showToast(msg, 'error')
    } finally {
      setSaving(false)
    }
  }

  const confirmDeleteExpense = async () => {
    if (!expenseToDelete) return
    const target = expenseToDelete
    try {
      await removeExpense(target.id)
      setExpenseToDelete(null)

      // Soft-delete preservation in Trash & Archive Bin
      addToTrashBin({
        id: target.id,
        type: 'expense',
        title: `Expense: ${target.category || 'General'} - ₹${Number(target.amount).toLocaleString('en-IN')}`,
        subtitle: `Date: ${target.date}${target.note ? ` • ${target.note}` : ''}`,
        payload: {
          date: target.date,
          category: target.category,
          amount: target.amount,
          note: target.note,
        },
      })

      showToast('Expense deleted', {
        type: 'delete',
        action: {
          label: 'Undo',
          onClick: async () => {
            try {
              await insertExpense({
                date: target.date,
                category: target.category,
                amount: target.amount,
                note: target.note,
              })
              await refreshData()
              showToast('Expense restored', 'success')
            } catch (restoreErr) {
              console.error('Failed to undo expense deletion:', restoreErr)
              showToast('Could not restore expense', 'error')
            }
          },
        },
      })
    } catch (err: unknown) {
      console.error('Delete expense error:', err)
      const msg = err instanceof Error ? err.message : String(err)
      setErrorMsg(`Delete failed — ${msg}`)
      showToast(`Delete failed: ${msg}`, 'error')
    }
  }

  // ── Month-over-Month Expense Breakdown Data ─────────────────────────────────
  const formatMoMMonthHeader = (ym: string): string => {
    const [year, monthNum] = ym.split('-')
    const d = new Date(Number(year), Number(monthNum) - 1, 1)
    const monthName = d.toLocaleString('en-IN', { month: 'short' }).toUpperCase()
    const normalizedMonth = monthName === 'SEP' ? 'SEPT' : monthName
    const yearShort = String(year).slice(-2)
    return `${normalizedMonth} ${yearShort}`
  }

  const momData = useMemo(() => {
    const monthSet = new Set<string>()

    // Ensure at least the last 4 consecutive historical months leading up to current date are present
    const now = new Date()
    for (let i = 3; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      monthSet.add(ym)
    }

    expenses.forEach((x) => {
      if (x.date) monthSet.add(x.date.slice(0, 7))
    })

    // Chronological order: oldest to newest (e.g. JUL 26 -> AUG 26 -> SEPT 26 -> OCT 26)
    const months = Array.from(monthSet).sort()

    const matrix: Record<string, Record<string, number>> = {}
    const monthlyTotals: Record<string, number> = {}

    EXPENSE_CATEGORIES.forEach((cat) => {
      matrix[cat] = {}
      months.forEach((m) => {
        matrix[cat][m] = 0
      })
    })

    months.forEach((m) => {
      monthlyTotals[m] = 0
    })

    expenses.forEach((x) => {
      const m = x.date?.slice(0, 7)
      if (!m) return
      const cat = standardizeCategory(x.category, x.note)
      const amt = Number(x.amount) || 0
      if (!matrix[cat]) matrix[cat] = {}
      matrix[cat][m] = (matrix[cat][m] || 0) + amt
      monthlyTotals[m] = (monthlyTotals[m] || 0) + amt
    })

    return {
      months,
      matrix,
      monthlyTotals,
    }
  }, [expenses])

  const handleExportMoMCSV = () => {
    if (momData.months.length === 0) return
    const filename = getSanitizedFilename('Expenses_MoM')
    const headers = ['Expense Category', ...momData.months.map(formatMoMMonthHeader), 'All-Time Total (INR)']
    const rows = EXPENSE_CATEGORIES.map((cat) => {
      const monthVals = momData.months.map((m) => (momData.matrix[cat]?.[m] || 0).toFixed(2))
      const totalCat = momData.months.reduce((sum, m) => sum + (momData.matrix[cat]?.[m] || 0), 0)
      return [cat, ...monthVals, totalCat.toFixed(2)]
    })

    const totalsRow = [
      'TOTAL MONTHLY EXPENSES',
      ...momData.months.map((m) => (momData.monthlyTotals[m] || 0).toFixed(2)),
      momData.months.reduce((sum, m) => sum + (momData.monthlyTotals[m] || 0), 0).toFixed(2),
    ]

    exportRawRowsToCSV(filename, headers, [...rows, totalsRow])
    showToast(`Month-over-month report exported to ${filename}`, 'success')
  }

  return (
    <PullToRefresh onRefresh={refreshData} className="w-full">
      <div className="flex flex-col pb-28 sm:pb-32 w-full">
        {/* ── Standardized Universal Page Header ── */}
        <PageHeader
          title="Operating Expenses"
          subtitle="Operational costs & business utilities"
          rightAction={
            <div className="flex items-center gap-2.5">
              {/* Rounded Month Selector Pill */}
              <MonthSelector
                isOpen={isDatePopoverOpen}
                onClose={() => setIsDatePopoverOpen(false)}
                onToggle={() => setIsDatePopoverOpen((prev) => !prev)}
                onSelectPeriod={() => setCurrentPage(1)}
              />

              {/* Top-Right Circular Action Button (Dashboard Settings Style) */}
              <button
                type="button"
                onClick={() => setIsMoMSheetOpen(true)}
                className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300 shadow-xs hover:bg-slate-50 dark:hover:bg-slate-800 active:scale-95 transition-all cursor-pointer shrink-0"
                title="View Month-Over-Month Breakdown"
                aria-label="View MoM Operating Breakdown"
              >
                <BarChart3 className="w-4 h-4 sm:w-5 sm:h-5 text-slate-700 dark:text-slate-200" />
              </button>

              {/* Desktop: Primary Action Button */}
              {!form && (
                <div className="hidden md:flex items-center h-9 ml-1">
                  <Button onClick={startAdd} variant="primary" className="h-9">
                    <Plus size={16} strokeWidth={2.5} /> Log Expense
                  </Button>
                </div>
              )}
            </div>
          }
        />

        {/* ── 1. Unified Top Metric Cards (KPIs) ─────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 mb-3.5">
          {/* Card 1: Total Expenses */}
          <KpiCard
            label="Total Expenses"
            value={fmtMoney(monthExpenseTotal)}
            subtitle={isAllTime ? 'All-time operational burn' : `${formattedMonth} burn`}
            dotColor="rose"
            valueClassName="text-rose-600 dark:text-rose-400"
            loading={loading}
          />

          {/* Card 2: Top Expense Head */}
          <KpiCard
            label="Top Head"
            value={topCategory !== '—' ? topCategory : 'No entries'}
            subtitle={
              topCategoryAmount > 0
                ? `${fmtMoney(topCategoryAmount)} largest driver`
                : `${formattedMonth}`
            }
            dotColor="slate"
            valueClassName={
              topCategory === '—' || topCategory === 'No entries'
                ? 'font-sans text-xl font-bold text-slate-700 dark:text-slate-300'
                : 'font-sans text-xl font-bold text-slate-900 dark:text-white'
            }
            loading={loading}
          />

          {/* Card 3: Expense Entries (Desktop) */}
          <KpiCard
            label="Expense Entries"
            value={filteredExpenses.length}
            unit="entries"
            subtitle={isAllTime ? 'All-time transactions' : `${formattedMonth} transactions`}
            dotColor="indigo"
            className="hidden lg:flex"
            loading={loading}
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

        {/* ── Daily Entries Table & Responsive Toolbar ──────────────────── */}
        <div className="pb-6 md:pb-8">
          {/* Search Bar (mt-0 matches Outward Dispatch) */}
          <div className="w-full mt-0">
            <div className="relative w-full h-11 px-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 text-xs shadow-sm flex items-center gap-2.5">
              <Search
                size={16}
                className="text-slate-400 shrink-0 pointer-events-none"
              />
              <input
                type="text"
                placeholder="Search expenses by note, vendor, category..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value)
                  setCurrentPage(1)
                }}
                className="w-full h-full bg-transparent border-none text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('')
                    setCurrentPage(1)
                  }}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 p-0.5 rounded cursor-pointer shrink-0"
                  title="Clear search"
                >
                  <X size={15} />
                </button>
              )}
            </div>
          </div>

          {/* ── Filter Row: 2-element row matching Outward Dispatch ── */}
          <div className="flex items-center justify-between mt-2.5 mb-4">
            {/* Left: Category dropdown pill */}
            <div className="relative">
              <select
                value={selectedCategory}
                onChange={(e) => {
                  setSelectedCategory(e.target.value)
                  setCurrentPage(1)
                }}
                className="h-9 pl-3 pr-7 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 shadow-2xs hover:bg-slate-50 dark:hover:bg-slate-800 focus:outline-none focus:border-slate-900 dark:focus:border-slate-400 transition-all cursor-pointer appearance-none whitespace-nowrap"
              >
                <option value="ALL">All Categories ({filteredExpenses.length})</option>
                {EXPENSE_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat} ({categoryCounts[cat] || 0})
                  </option>
                ))}
              </select>
              <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>

            {/* Right: Records counter pill */}
            <span className="text-xs text-slate-500 bg-slate-100/80 dark:bg-slate-800 px-3 py-1.5 rounded-xl font-medium">
              {displayExpenses.length} records
            </span>
          </div>

          {loading ? (
            <div className="rounded-xl p-10 text-center text-sm border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs text-slate-400">
              Loading expenses…
            </div>
          ) : filteredExpenses.length === 0 ? (
            <EmptyState
              title={`No expenses logged for ${formattedMonth}`}
              description="Track operational expenses, diesel, maintenance, and utility bills."
              actionLabel="Log Expense"
              onAction={startAdd}
            />
          ) : displayExpenses.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-8 sm:p-12 text-center border border-slate-200/60 dark:border-slate-800 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 dark:text-slate-400 mx-auto mb-3 shrink-0 shadow-2xs">
                <Search size={22} strokeWidth={1.8} />
              </div>
              <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white tracking-tight">
                No matching expenses found
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto leading-relaxed font-normal">
                No transactions match your search or filter selection
              </p>
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('')
                  setSelectedCategory('ALL')
                  setSelectedPaymentMode('ALL')
                  setCurrentPage(1)
                }}
                className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200 shadow-xs active:scale-95 transition-all cursor-pointer"
              >
                Reset Filters
              </button>
            </div>
          ) : (
            <ExpenseTable
              paginatedExpenses={paginatedExpenses}
              displayExpensesCount={displayExpenses.length}
              displayTotal={displayTotal}
              currentPage={currentPage}
              totalPages={totalPages}
              setCurrentPage={setCurrentPage}
              onEdit={(x) => edit(x)}
              onViewReceipt={(x) => setViewReceiptExpense(x)}
              onDelete={(x) => setExpenseToDelete(x)}
            />
          )}
        </div>


        {/* ── Official Printable Expense Voucher Modal ───────────────────── */}
        <BottomSheetModal
          isOpen={Boolean(viewReceiptExpense)}
          onClose={() => setViewReceiptExpense(null)}
          hideHeader={true}
          hideDragHandle={true}
          maxWidth="sm:max-w-lg"
          maxHeight="max-h-[92vh]"
          className="pb-safe"
        >
          {viewReceiptExpense && (
            <div className="flex flex-col flex-1 min-h-0 bg-white">
              {/* Mobile Drag Indicator (hidden on desktop) */}
              <div className="md:hidden pt-2.5 pb-1 flex justify-center bg-slate-900 shrink-0">
                <div className="w-12 h-1.5 bg-slate-700 rounded-full" />
              </div>

              {/* Modal Header (Hidden on Print) */}
              <div className="no-print modal-header px-5 py-3.5 bg-slate-900 text-white flex justify-between items-center shrink-0">
                <div className="flex items-center gap-2">
                  <Receipt size={17} className="text-emerald-400" />
                  <span className="text-sm font-bold tracking-tight">Expense Payment Voucher</span>
                </div>
                <button
                  type="button"
                  onClick={() => setViewReceiptExpense(null)}
                  className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
                >
                  <X size={17} strokeWidth={2.2} />
                </button>
              </div>

              {/* Printable Voucher Content */}
              <div
                id="printable-expense-voucher"
                className="p-6 sm:p-8 space-y-5 overflow-y-auto no-scrollbar bg-white text-slate-900 printable-document"
              >
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
                    OFFICIAL EXPENSE PAYMENT VOUCHER
                  </div>
                </div>

                {/* Voucher Details Grid */}
                <div className="grid grid-cols-2 gap-3 text-xs bg-slate-50 p-3.5 rounded-xl border border-slate-200/80">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">
                      Voucher Number
                    </span>
                    <span className="font-mono font-bold text-slate-900 text-[13px]">
                      EXP-{viewReceiptExpense.id.slice(0, 8).toUpperCase()}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">
                      Date of Expense
                    </span>
                    <span className="font-semibold text-slate-800">{fmtDate(viewReceiptExpense.date)}</span>
                  </div>
                  <div className="col-span-2 pt-2 border-t border-slate-200/60 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">
                        Cost Center / Category
                      </span>
                      <span className="font-bold text-slate-900">
                        {standardizeCategory(viewReceiptExpense.category, viewReceiptExpense.note)}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">
                        Payment Mode
                      </span>
                      <span className="font-semibold text-slate-800">
                        {detectExpensePaymentMode(viewReceiptExpense).mode}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Particulars / Narration */}
                <div className="space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                    Particulars / Narration
                  </span>
                  <div className="p-3 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800">
                    {cleanEmojiAndMode(viewReceiptExpense.note) || viewReceiptExpense.category || 'General Operating Expenditure'}
                  </div>
                </div>

                {/* Amount Box & Words */}
                <div className="p-4 bg-rose-50/50 rounded-xl border border-rose-200/80 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-rose-900">
                      Total Amount Disbursed
                    </span>
                    <span className="text-xl font-bold font-mono tabular-nums text-rose-700">
                      {fmtMoney(viewReceiptExpense.amount)}
                    </span>
                  </div>
                  <div className="text-[11px] font-medium text-slate-600 border-t border-rose-200/60 pt-1.5 italic">
                    Amount in words: {numberToWordsINR(Number(viewReceiptExpense.amount))}
                  </div>
                </div>

                {/* Authorized Signatures */}
                <div className="pt-6 grid grid-cols-2 gap-6 text-center text-xs text-slate-500">
                  <div>
                    <div className="h-10 border-b border-dashed border-slate-300 mx-4" />
                    <span className="mt-1.5 block font-medium">Passed / Received By</span>
                  </div>
                  <div>
                    <div className="h-10 border-b border-dashed border-slate-300 mx-4" />
                    <span className="mt-1.5 block font-bold text-slate-700">Authorized Signatory</span>
                    <span className="text-[10px] text-slate-400 block">For {companySettings.companyName}</span>
                  </div>
                </div>
              </div>

              {/* Modal Footer (Hidden on Print) */}
              <div className="no-print px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex justify-between items-center shrink-0">
                <span className="text-[11px] text-slate-400 font-medium">
                  Official internal voucher &bull; Valid with signature
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setViewReceiptExpense(null)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 bg-white border border-slate-200 hover:bg-slate-100 transition-colors cursor-pointer"
                  >
                    Close
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      shareOrPrintDocument('printable-expense-voucher', {
                        documentTitle: `Expense_Voucher_${viewReceiptExpense.id.slice(0, 8)}`,
                      })
                    }
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95"
                  >
                    {isMobileDevice() ? <Share2 size={14} /> : <Printer size={14} />}
                    <span>{isMobileDevice() ? 'Share / Print' : 'Print Voucher'}</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </BottomSheetModal>

        {/* ── Add / Edit Form Modal with smooth bottom-sheet animation ── */}
        <BottomSheetModal
          isOpen={isExpenseModalOpen && Boolean(form)}
          onClose={closeExpenseModal}
          category="OPERATING EXPENSE"
          title={form?.id ? 'Edit Expense' : 'Log Expense'}
          subtitle="Record operational expenses, workshop supplies & bills"
          maxWidth="sm:max-w-lg"
          bodyClassName="p-5 sm:p-6"
          footer={
            form ? (
              <div className="w-full bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200/80 dark:border-slate-800 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] flex items-center gap-3">
                {form.id && (
                  <div className="flex items-center gap-1.5 shrink-0">
                    {expenses.some((e) => e.id === form.id) && (
                      <button
                        type="button"
                        onClick={() => {
                          const targetExp = expenses.find((e) => e.id === form.id)
                          if (targetExp) {
                            setViewReceiptExpense(targetExp)
                            setForm(null)
                          }
                        }}
                        className="h-12 px-3 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 transition-colors flex items-center gap-1 cursor-pointer shrink-0"
                        title="View Voucher"
                      >
                        <Receipt size={14} />
                        <span className="hidden xs:inline">Voucher</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        const target = expenses.find((e) => e.id === form.id)
                        if (target) {
                          setExpenseToDelete(target)
                        } else if (form.id) {
                          setExpenseToDelete({
                            id: form.id,
                            date: form.date,
                            category: form.category,
                            amount: Number(form.amount) || 0,
                            note: form.note,
                            created_at: new Date().toISOString(),
                          })
                        }
                        closeExpenseModal()
                      }}
                      className="h-12 px-3 rounded-xl text-xs font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/30 border border-rose-200/80 dark:border-rose-900/50 transition-colors flex items-center gap-1 cursor-pointer shrink-0"
                      title="Delete Expense"
                    >
                      <Trash2 size={14} />
                      <span className="hidden xs:inline">Delete</span>
                    </button>
                  </div>
                )}

                <button
                  type="button"
                  onClick={closeExpenseModal}
                  disabled={saving}
                  className="h-12 px-5 text-sm font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  form="expense-entry-form"
                  data-save-shortcut="true"
                  disabled={saving}
                  className="flex-1 h-12 rounded-xl bg-slate-950 dark:bg-white text-white dark:text-slate-950 font-semibold text-sm shadow-md active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {saving ? (
                    <>
                      <Loader2 size={18} className="animate-spin shrink-0" />
                      <span>Saving Expense...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={18} className="shrink-0" />
                      <span>Save Expense</span>
                    </>
                  )}
                </button>
              </div>
            ) : null
          }
        >
          {form && (
            <form id="expense-entry-form" onSubmit={submit} className="space-y-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1.5 pl-0.5">
                    Category <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <select
                      required
                      value={form.category}
                      onChange={(e) => {
                        setForm({ ...form, category: e.target.value })
                        if (fieldErrors.category) {
                          setFieldErrors((prev) => {
                            const next = { ...prev }
                            delete next.category
                            return next
                          })
                        }
                      }}
                      className={`h-11 w-full bg-white dark:bg-slate-900 border rounded-xl px-3.5 pr-8 text-sm font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-slate-900/10 dark:focus:ring-white/10 transition-all appearance-none cursor-pointer ${fieldErrors.category
                          ? 'border-rose-400 ring-2 ring-rose-400/20'
                          : 'border-slate-200 dark:border-slate-800'
                        }`}
                    >
                      {EXPENSE_MODAL_CATEGORIES.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                      <ChevronDown size={14} strokeWidth={2.2} />
                    </div>
                  </div>
                  <FieldError error={fieldErrors.category} />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1.5 pl-0.5">
                      Amount (₹) <span className="text-rose-500">*</span>
                    </label>
                    <input
                      required
                      type="text"
                      inputMode="decimal"
                      placeholder="0.00"
                      className={`h-11 w-full bg-white dark:bg-slate-900 border rounded-xl px-3.5 text-sm font-semibold tabular-nums text-slate-900 dark:text-white placeholder:text-slate-400 focus:ring-2 focus:ring-slate-900/10 dark:focus:ring-white/10 outline-none transition-all ${fieldErrors.amount
                          ? 'border-rose-400 ring-2 ring-rose-400/20'
                          : 'border-slate-200 dark:border-slate-800'
                        }`}
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
                    />
                    <FieldError error={fieldErrors.amount} />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1.5 pl-0.5">
                      Date <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="date"
                      required
                      className={`h-11 w-full bg-white dark:bg-slate-900 border rounded-xl px-3.5 text-sm font-semibold font-mono text-slate-900 dark:text-white placeholder:text-slate-400 focus:ring-2 focus:ring-slate-900/10 dark:focus:ring-white/10 outline-none transition-all ${fieldErrors.date
                          ? 'border-rose-400 ring-2 ring-rose-400/20'
                          : 'border-slate-200 dark:border-slate-800'
                        }`}
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
                    />
                    <FieldError error={fieldErrors.date} />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1.5 pl-0.5">
                    Paid Via
                  </label>
                  <div className="h-11 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl grid grid-cols-3 gap-1 items-center">
                    {(['Cash', 'UPI', 'Bank Transfer'] as const).map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setForm({ ...form, paymentMode: m })}
                        className={`h-full rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center justify-center ${form.paymentMode === m
                            ? 'bg-slate-950 dark:bg-white text-white dark:text-slate-950 shadow-sm'
                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                          }`}
                      >
                        {m}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1.5 pl-0.5">
                    Note (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Bike Petrol / Machine Oil"
                    className="h-11 w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 text-sm font-semibold text-slate-900 dark:text-white placeholder:text-slate-400 focus:ring-2 focus:ring-slate-900/10 dark:focus:ring-white/10 outline-none transition-all"
                    value={form.note}
                    onChange={(e) => setForm({ ...form, note: e.target.value })}
                  />
                </div>

                {/* Danger Zone for Saved Expense Deletion (Pattern 2) */}
                {form.id && (
                  <DangerZone
                    title="Danger Zone"
                    description="Permanently delete this saved operating expense record. It can be restored from the Trash Bin."
                    itemName={`Expense "${form.category || 'General'}" (₹${form.amount})`}
                    buttonLabel="Delete Expense"
                    isDeleting={saving}
                    onDelete={async () => {
                      const exp = expenses.find((x) => x.id === form.id)
                      closeExpenseModal()
                      if (exp) {
                        await removeExpense(exp.id)
                        addToTrashBin({
                          id: exp.id,
                          type: 'expense',
                          title: `Expense: ${exp.category || 'General'} - ₹${Number(exp.amount).toLocaleString('en-IN')}`,
                          subtitle: `Date: ${exp.date}${exp.note ? ` • ${exp.note}` : ''}`,
                          payload: {
                            date: exp.date,
                            category: exp.category,
                            amount: exp.amount,
                            note: exp.note,
                          },
                        })
                        showToast('Expense deleted', {
                          type: 'delete',
                          action: {
                            label: 'Undo',
                            onClick: async () => {
                              try {
                                await insertExpense({
                                  date: exp.date,
                                  category: exp.category,
                                  amount: exp.amount,
                                  note: exp.note,
                                })
                                await refreshData()
                                showToast('Expense restored', 'success')
                              } catch {
                                showToast('Could not restore expense', 'error')
                              }
                            },
                          },
                        })
                      }
                    }}
                  />
                )}
            </form>
          )}
        </BottomSheetModal>

        {/* ── MoM Operating Breakdown Bottom Sheet Drawer ───────────────── */}
        <MoMBreakdownSheet
          isOpen={isMoMSheetOpen}
          onClose={() => setIsMoMSheetOpen(false)}
          momData={momData}
          formatMoMMonthHeader={formatMoMMonthHeader}
          onExportMoMCSV={handleExportMoMCSV}
        />

        {/* Apple-Style Confirmation Action Sheet */}
        <ActionSheet
          isOpen={Boolean(expenseToDelete)}
          onClose={() => setExpenseToDelete(null)}
          title="Delete Expense"
          description={
            expenseToDelete
              ? `Are you sure you want to delete ${expenseToDelete.category || 'this expense'} of ₹${Number(expenseToDelete.amount).toLocaleString('en-IN')}? This action can be undone from the toast.`
              : undefined
          }
          destructiveLabel="Delete Expense"
          cancelLabel="Cancel"
          onConfirmDestructive={confirmDeleteExpense}
        />

        {/* Floating Action Button consolidated into global Speed Dial FAB */}
      </div>
    </PullToRefresh>
  )
}
