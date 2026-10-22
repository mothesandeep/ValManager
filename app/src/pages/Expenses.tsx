import { useState, useEffect, useCallback, useMemo } from 'react'
import {
  Plus,
  Pencil,
  Trash2,
  X,
  Search,
  Download,
  Receipt,
  Building2,
  Layers,
  Fuel,
  Wrench,
  Package,
} from 'lucide-react'
import {
  fetchExpenses,
  insertExpense,
  updateExpense,
  deleteExpense,
  type ExpensePayload,
} from '../lib/api/expenses'

import type { Expense } from '../features/expenses/types'
import { fmtDate, todayStr } from '../utils/date'
import { fmtMoney } from '../utils/format'
import { PageHeader } from '../components/ui/PageHeader'
import { Button } from '../components/ui/Button'
import { ConfirmDelete } from '../components/ui/ConfirmDelete'
import { EmptyState } from '../components/ui/EmptyState'
import { useMonth } from '../context/MonthContext'
import { useToast } from '../context/ToastContext'

// ── Category Standardization Helper ──────────────────────────────────────────
export function standardizeCategory(category: string, note?: string | null): string {
  const text = `${category || ''} ${note || ''}`.toLowerCase()

  // 1. Rent & Premises
  if (text.includes('rent')) {
    return 'Rent'
  }

  // 2. Repairs & Maintenance
  if (
    text.includes('repair') ||
    text.includes('puncher') ||
    text.includes('puncture') ||
    text.includes('tyre') ||
    text.includes('tire') ||
    text.includes('patch') ||
    text.includes('patta') ||
    text.includes('motor') ||
    text.includes('belt') ||
    text.includes('service')
  ) {
    return 'Repairs & Maintenance'
  }

  // 3. Fuel & Travel
  if (
    text.includes('fuel') ||
    text.includes('petrol') ||
    text.includes('diesel') ||
    text.includes('hawa') ||
    text.includes('ola charging') ||
    text.includes('transport')
  ) {
    return 'Fuel & Travel'
  }

  // 4. Shop Supplies & Consumables
  if (
    text.includes('oil') ||
    text.includes('marker') ||
    text.includes('refill') ||
    text.includes('challan') ||
    text.includes('book') ||
    text.includes('bugari') ||
    text.includes('stationery') ||
    text.includes('plastic') ||
    text.includes('blade') ||
    text.includes('supplies') ||
    text.includes('consumables')
  ) {
    return 'Shop Supplies'
  }

  if (category && category !== 'Other') {
    return category
  }

  return 'General Expense'
}

// ── Category Badge Color Helper ──────────────────────────────────────────────
function getCategoryBadge(head: string) {
  switch (head) {
    case 'Rent':
      return {
        badgeClass: 'bg-slate-100 text-slate-700 border-slate-200/80',
        dotClass: 'bg-slate-500',
        Icon: Building2,
      }
    case 'Repairs & Maintenance':
      return {
        badgeClass: 'bg-amber-50 text-amber-800 border-amber-200/80',
        dotClass: 'bg-amber-500',
        Icon: Wrench,
      }
    case 'Fuel & Travel':
      return {
        badgeClass: 'bg-sky-50 text-sky-800 border-sky-200/80',
        dotClass: 'bg-sky-500',
        Icon: Fuel,
      }
    case 'Shop Supplies':
      return {
        badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-200/80',
        dotClass: 'bg-emerald-500',
        Icon: Package,
      }
    default:
      return {
        badgeClass: 'bg-slate-100 text-slate-700 border-slate-200/80',
        dotClass: 'bg-slate-500',
        Icon: Layers,
      }
  }
}

const EXPENSE_MODAL_CATEGORIES = [
  'Rent',
  'Repairs & Maintenance',
  'Fuel & Travel',
  'Shop Supplies',
  'Other',
] as const

function cleanEmojiAndMode(text?: string | null): string {
  if (!text) return ''
  return text
    .replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '')
    .replace(/\s*\((UPI|Cash|Bank Transfer)\)\s*/gi, '')
    .trim()
}

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

interface ExpenseFormState {
  id: string | null
  date: string
  category: string
  amount: string
  note: string
  paymentMode: 'Cash' | 'UPI' | 'Bank Transfer'
}

export default function Expenses() {
  const { filterByMonth, formattedMonth } = useMonth()
  const { showToast } = useToast()
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState<ExpenseFormState | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL')

  const loadData = useCallback(async () => {
    setLoading(true)
    setErrorMsg(null)
    try {
      const expensesData = await fetchExpenses()
      setExpenses(expensesData)
    } catch (err) {
      console.error('Error loading expenses:', err)
      setErrorMsg('Could not load expenses.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadData()
  }, [loadData])

  const filteredExpenses = useMemo(() => filterByMonth(expenses), [filterByMonth, expenses])

  const monthExpenseTotal = useMemo(
    () => filteredExpenses.reduce((s, x) => s + (Number(x.amount) || 0), 0),
    [filteredExpenses]
  )

  // Dynamic Category Counts
  const categoryCounts = useMemo(() => {
    return filteredExpenses.reduce<Record<string, number>>((acc, x) => {
      const head = standardizeCategory(x.category, x.note)
      acc[head] = (acc[head] || 0) + 1
      return acc
    }, {})
  }, [filteredExpenses])

  // Dynamic Top Expense Head Calculation
  const { topCategory, topCategoryAmount } = useMemo(() => {
    const totals: Record<string, number> = {}
    for (const x of filteredExpenses) {
      const head = standardizeCategory(x.category, x.note)
      totals[head] = (totals[head] || 0) + (Number(x.amount) || 0)
    }
    let topCat = '—'
    let maxAmt = 0
    for (const [cat, amt] of Object.entries(totals)) {
      if (amt > maxAmt) {
        maxAmt = amt
        topCat = cat
      }
    }
    return { topCategory: topCat, topCategoryAmount: maxAmt }
  }, [filteredExpenses])

  // Filtered Display List
  const displayExpenses = useMemo(() => {
    return filteredExpenses.filter((x) => {
      const head = standardizeCategory(x.category, x.note)
      if (selectedCategory !== 'ALL' && head !== selectedCategory) {
        return false
      }
      if (!searchQuery.trim()) return true
      const q = searchQuery.toLowerCase().trim()
      const noteMatch = (x.note || '').toLowerCase().includes(q)
      const catMatch = (x.category || '').toLowerCase().includes(q)
      const headMatch = head.toLowerCase().includes(q)
      const amtMatch = String(x.amount).includes(q)
      const dateMatch = fmtDate(x.date).toLowerCase().includes(q)
      return noteMatch || catMatch || headMatch || amtMatch || dateMatch
    })
  }, [filteredExpenses, selectedCategory, searchQuery])

  const displayTotal = useMemo(
    () => displayExpenses.reduce((s, x) => s + (Number(x.amount) || 0), 0),
    [displayExpenses]
  )

  const blankForm = (): ExpenseFormState => ({
    id: null,
    date: todayStr(),
    category: EXPENSE_MODAL_CATEGORIES[3], // Shop Supplies
    amount: '',
    note: '',
    paymentMode: 'Cash',
  })

  // Handle mobile hardware back button to close modal
  useEffect(() => {
    const handleHashChange = () => {
      if (window.location.hash !== '#modal' && form) {
        setForm(null)
      }
    }
    window.addEventListener('hashchange', handleHashChange)
    return () => window.removeEventListener('hashchange', handleHashChange)
  }, [form])

  const startAdd = () => {
    window.location.hash = 'modal'
    setForm(blankForm())
    setErrorMsg(null)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const edit = (x: Expense) => {
    window.location.hash = 'modal'
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
    setErrorMsg(null)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form || !form.amount) return

    const amt = parseFloat(form.amount)
    if (isNaN(amt) || amt <= 0) {
      setErrorMsg('Enter a valid expense amount')
      return
    }

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
      setForm(null)
      await loadData()
    } catch (err: unknown) {
      console.error('Save expense error:', err)
      const msg = err instanceof Error ? err.message : String(err)
      setErrorMsg(`Could not save — ${msg}`)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await deleteExpense(id)
      setDeleting(null)
      showToast('Expense entry deleted', 'info')
      await loadData()
    } catch (err: unknown) {
      console.error('Delete expense error:', err)
      const msg = err instanceof Error ? err.message : String(err)
      setErrorMsg(`Delete failed — ${msg}`)
    }
  }

  const handleExportCSV = () => {
    if (displayExpenses.length === 0) return
    const headers = ['Date', 'Category (Original)', 'Standard Head', 'Description / Note', 'Payment Mode', 'Amount (INR)']
    const rows = displayExpenses.map((x) => {
      const head = standardizeCategory(x.category, x.note)
      const mode = detectExpensePaymentMode(x).mode
      return [
        `"${x.date}"`,
        `"${x.category || ''}"`,
        `"${head}"`,
        `"${(x.note || '').replace(/"/g, '""')}"`,
        `"${mode}"`,
        x.amount,
      ]
    })
    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `operating_expenses_${formattedMonth.replace(/\s+/g, '_')}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Operating Expenses"
        description="Operational costs — rent, repairs, transport & utilities"
        actions={
          !form && (
            <div className="hidden sm:block">
              <Button onClick={startAdd} variant="primary">
                <Plus size={18} strokeWidth={2.5} /> Log Expense
              </Button>
            </div>
          )
        }
      />

      {/* ── 3-Column Summary Metric Cards ────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Card 1: Total Expenses */}
          <div className="rounded-2xl p-5 bg-rose-50/40 border border-rose-200/70 shadow-xs transition-all flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-rose-700/80">
                  Total Expenses
                </span>
                <span className="p-1.5 rounded-lg bg-rose-100 text-rose-600">
                  <Receipt size={16} />
                </span>
              </div>
              <div className="text-[26px] font-black tabular-nums leading-none tracking-tight text-rose-600 mb-1.5">
                {fmtMoney(monthExpenseTotal)}
              </div>
            </div>
            <div className="text-[11px] font-bold text-rose-600/70 mt-2">
              {formattedMonth} operational burn
            </div>
          </div>

          {/* Card 2: Top Expense Head */}
          <div className="rounded-2xl p-5 bg-white border border-slate-200/80 shadow-xs transition-all flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-500">
                  Top Expense Head
                </span>
                <span className="p-1.5 rounded-lg bg-slate-100 text-slate-700 border border-slate-200/80">
                  <Building2 size={16} />
                </span>
              </div>
              <div className="text-[22px] font-black leading-none tracking-tight text-slate-900 mb-1.5 truncate">
                {topCategory !== '—' ? topCategory : 'No entries'}
              </div>
            </div>
            <div className="text-[11px] font-semibold text-slate-500 mt-2">
              {topCategoryAmount > 0
                ? `${fmtMoney(topCategoryAmount)} • ${Math.round((topCategoryAmount / (monthExpenseTotal || 1)) * 100)}% of total`
                : `${formattedMonth} period`}
            </div>
          </div>

          {/* Card 3: Expense Entries */}
          <div className="rounded-2xl p-5 bg-white border border-slate-200/80 shadow-xs transition-all flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-500">
                  Expense Entries
                </span>
                <span className="p-1.5 rounded-lg bg-slate-100 text-slate-600">
                  <Layers size={16} />
                </span>
              </div>
              <div className="text-[26px] font-black tabular-nums leading-none tracking-tight text-slate-900 mb-1.5">
                {filteredExpenses.length}{' '}
                <span className="text-[14px] text-slate-500 font-bold tracking-normal">
                  entries
                </span>
              </div>
            </div>
            <div className="text-[11px] font-medium text-slate-400 mt-2">
              {formattedMonth} logged transactions
            </div>
          </div>
        </div>

      {errorMsg && (
        <div
          className="rounded-lg p-3 text-xs font-medium flex items-center justify-between shadow-xs"
          style={{ background: 'var(--color-due-bg)', color: 'var(--color-due)' }}
        >
          <span>{errorMsg}</span>
          <button
            onClick={() => setErrorMsg(null)}
            className="underline cursor-pointer font-semibold"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* ── Section Header & Filter Toolbar ─────────────────────────── */}
      <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
            <div>
              <h2 className="text-xs font-extrabold uppercase tracking-widest text-slate-400">
                Recent Expenses ({displayExpenses.length})
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Verified operating expenditures & workshop costs
              </p>
            </div>

            <div className="flex items-center gap-2.5 flex-1 max-w-md">
              {/* Search Box */}
              <div className="relative flex-1">
                <Search
                  size={15}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                />
                <input
                  type="text"
                  placeholder="Search expenses by note or category..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full h-9 pl-9 pr-8 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900 transition-all shadow-xs placeholder:text-slate-400 text-slate-900"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                  >
                    <X size={13} />
                  </button>
                )}
              </div>

              {/* Export CSV Button */}
              <button
                type="button"
                onClick={handleExportCSV}
                disabled={filteredExpenses.length === 0}
                className="h-9 px-3.5 inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl shadow-xs transition-colors cursor-pointer shrink-0 disabled:opacity-50"
              >
                <Download size={14} className="text-slate-500" />
                <span>Export CSV</span>
              </button>
            </div>
          </div>

          {/* Category Filter Chips */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
            {[
              { id: 'ALL', label: `All (${filteredExpenses.length})` },
              { id: 'Rent', label: `Rent (${categoryCounts['Rent'] || 0})` },
              {
                id: 'Repairs & Maintenance',
                label: `Repairs & Maintenance (${categoryCounts['Repairs & Maintenance'] || 0})`,
              },
              {
                id: 'Fuel & Travel',
                label: `Fuel & Travel (${categoryCounts['Fuel & Travel'] || 0})`,
              },
              {
                id: 'Shop Supplies',
                label: `Shop Supplies (${categoryCounts['Shop Supplies'] || 0})`,
              },
            ].map((tab) => {
              const isActive = selectedCategory === tab.id
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setSelectedCategory(tab.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
                    isActive
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  <span>{tab.label}</span>
                </button>
              )
            })}
          </div>
        </div>

      {/* ── Compact Structured Data Table ───────────────────────────── */}
      <div className="pb-28">
          {loading ? (
            <div className="rounded-2xl p-10 text-center text-sm border border-slate-200 bg-white shadow-xs text-slate-400">
              Loading expenses…
            </div>
          ) : filteredExpenses.length === 0 ? (
            <EmptyState text={`No expenses logged for ${formattedMonth}.`} />
          ) : displayExpenses.length === 0 ? (
            <div className="rounded-2xl p-8 text-center border border-slate-200 bg-white shadow-xs space-y-3">
              <p className="text-sm font-semibold text-slate-600">
                No expenses match &quot;{searchQuery || selectedCategory}&quot;
              </p>
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('')
                  setSelectedCategory('ALL')
                }}
                className="px-3.5 py-1.5 text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-lg transition-colors cursor-pointer"
              >
                Reset Filters
              </button>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/75 border-b border-slate-200/80">
                      <th className="py-3 px-4 sm:px-6 text-xs font-semibold uppercase tracking-wider text-slate-500">Date</th>
                      <th className="py-3 px-4 text-xs font-semibold uppercase tracking-wider text-slate-500">Category</th>
                      <th className="py-3 px-4 text-xs font-semibold uppercase tracking-wider text-slate-500">Description / Note</th>
                      <th className="py-3 px-4 text-xs font-semibold uppercase tracking-wider text-slate-500">Paid Via</th>
                      <th className="py-3 px-4 text-xs font-semibold uppercase tracking-wider text-slate-500 text-right">Amount</th>
                      <th className="py-3 px-4 sm:px-6 text-xs font-semibold uppercase tracking-wider text-slate-500 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {displayExpenses.map((x) => {
                      const head = standardizeCategory(x.category, x.note)
                      const badge = getCategoryBadge(head)
                      const modeInfo = detectExpensePaymentMode(x)
                      const cleanNote = cleanEmojiAndMode(x.note || x.category)
                      const cleanCat = cleanEmojiAndMode(x.category)

                      return (
                        <tr
                          key={x.id}
                          className="hover:bg-slate-50/80 transition-colors group"
                        >
                          <td className="py-3.5 px-4 sm:px-6 whitespace-nowrap">
                            <span className="text-[13px] font-semibold text-slate-700">
                              {fmtDate(x.date)}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <span
                              className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${badge.badgeClass}`}
                            >
                              <span className={`w-1.5 h-1.5 rounded-full ${badge.dotClass}`} />
                              {head}
                            </span>
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="flex flex-col">
                              <span className="text-[13px] font-semibold text-slate-900 tracking-tight">
                                {cleanNote || cleanCat}
                              </span>
                              {cleanNote &&
                                cleanCat &&
                                cleanCat !== 'Other' &&
                                cleanCat !== cleanNote && (
                                  <span className="text-xs text-slate-500 font-normal mt-0.5">
                                    {cleanCat}
                                  </span>
                                )}
                            </div>
                          </td>
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-md font-mono text-xs font-medium text-slate-700 bg-slate-100 border border-slate-200/60">
                              {modeInfo.mode}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-right whitespace-nowrap">
                            <span className="text-[14px] font-mono font-semibold tabular-nums text-rose-600">
                              -{fmtMoney(x.amount)}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 sm:px-6 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                type="button"
                                onClick={() => edit(x)}
                                title="Edit Expense"
                                aria-label="Edit Expense"
                                className="p-1.5 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-md transition cursor-pointer"
                              >
                                <Pencil size={15} strokeWidth={2} />
                              </button>
                              {deleting === x.id ? (
                                <ConfirmDelete
                                  onConfirm={() => handleDelete(x.id)}
                                  onCancel={() => setDeleting(null)}
                                />
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => setDeleting(x.id)}
                                  title="Delete Expense"
                                  aria-label="Delete Expense"
                                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition cursor-pointer"
                                >
                                  <Trash2 size={15} strokeWidth={2} />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {/* Table Footer */}
              <div className="px-4 sm:px-6 py-3 bg-slate-50/60 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between text-xs text-slate-500 gap-2">
                <span>
                  Showing <strong className="text-slate-700">{displayExpenses.length}</strong> of{' '}
                  <strong className="text-slate-700">{filteredExpenses.length}</strong> expenses
                </span>
                <span>
                  Period Total:{' '}
                  <strong className="text-rose-600 font-bold tabular-nums">
                    -{fmtMoney(displayTotal)}
                  </strong>
                </span>
              </div>
            </div>
          )}
        </div>

      {/* ── Add / Edit Form Modal ──────────────────────────────────────── */}
      {form && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/40 backdrop-blur-xs p-0 sm:p-4 transition-all animate-in fade-in duration-200">
          <div className="bg-white w-full sm:max-w-[480px] rounded-t-[24px] sm:rounded-2xl shadow-2xl flex flex-col relative overflow-hidden animate-in slide-in-from-bottom-12 sm:zoom-in-95 duration-200 ease-out">
            <div className="sm:hidden flex justify-center pt-3 pb-1 bg-white">
              <div className="w-12 h-1.5 bg-gray-200 rounded-full"></div>
            </div>

            <div className="px-6 py-4 bg-white flex justify-between items-start border-b border-slate-200/80 shrink-0">
              <div>
                <h2 className="text-lg font-semibold text-slate-900 tracking-tight">
                  {form.id ? 'Edit Expense' : 'Log Operating Cost'}
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Record operational expenses, workshop supplies & bills
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (window.location.hash === '#modal') window.history.back()
                  else setForm(null)
                }}
                className="hover:bg-slate-100 rounded-lg p-1.5 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
              >
                <X size={18} strokeWidth={2.2} />
              </button>
            </div>

            <form onSubmit={submit} className="p-6 bg-white space-y-4">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 uppercase tracking-wider mb-1.5 pl-0.5">
                  Category *
                </label>
                <select
                  required
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900 transition-all cursor-pointer"
                >
                  {EXPENSE_MODAL_CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 uppercase tracking-wider mb-1.5 pl-0.5">
                    Amount (₹) *
                  </label>
                  <input
                    required
                    type="number"
                    step="0.01"
                    placeholder="e.g. 1500"
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm font-semibold tabular-nums text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900 transition-all"
                    value={form.amount}
                    onChange={(e) => setForm({ ...form, amount: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 uppercase tracking-wider mb-1.5 pl-0.5">
                    Date *
                  </label>
                  <input
                    type="date"
                    required
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900 transition-all"
                    value={form.date}
                    onChange={(e) => setForm({ ...form, date: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 uppercase tracking-wider mb-1.5 pl-0.5">
                  Paid Via
                </label>
                <div className="grid grid-cols-3 gap-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200">
                  {(['Cash', 'UPI', 'Bank Transfer'] as const).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setForm({ ...form, paymentMode: m })}
                      className={`py-2 rounded-lg text-xs font-medium transition-all cursor-pointer flex items-center justify-center ${
                        form.paymentMode === m
                          ? 'bg-slate-900 text-white shadow-xs'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 uppercase tracking-wider mb-1.5 pl-0.5">
                  Note (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Bike Petrol / Machine Oil"
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900 transition-all"
                  value={form.note}
                  onChange={(e) => setForm({ ...form, note: e.target.value })}
                />
              </div>

              <div className="pt-3 flex justify-end gap-3 border-t border-slate-200/80">
                <button
                  type="button"
                  onClick={() => {
                    if (window.location.hash === '#modal') window.history.back()
                    else setForm(null)
                  }}
                  disabled={saving}
                  className="text-slate-600 hover:bg-slate-100 rounded-lg font-medium px-4 py-2 text-sm transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-medium px-5 py-2.5 shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer text-sm"
                >
                  {saving ? 'Saving...' : 'Save Expense'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Floating Action Button - Mobile Only */}
      {!form && (
        <button
          onClick={startAdd}
          className="sm:hidden fixed bottom-[80px] right-5 bg-slate-900 hover:bg-slate-800 text-white px-6 py-4 rounded-full shadow-lg flex items-center gap-2.5 font-bold transition-all active:scale-95 z-40 border border-slate-800"
        >
          <Plus size={22} strokeWidth={3} /> <span className="tracking-wide">Log Expense</span>
        </button>
      )}
    </div>
  )
}
