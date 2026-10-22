import { useState, useEffect, useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  Plus,
  Pencil,
  Trash2,
  X,
  Search,
  Download,
  Clock,
  CreditCard,
  Receipt,
  Printer,
} from 'lucide-react'
import { fetchParties } from '../lib/api/parties'
import { fetchPayments, insertPayment, updatePayment, deletePayment, type PaymentPayload } from '../lib/api/payments'
import { fetchDispatches } from '../lib/api/dispatch'


import type { Party } from '../features/parties/types'
import type { PaymentWithParty } from '../features/payments/types'
import { fmtDate, todayStr } from '../utils/date'
import { fmtMoney } from '../utils/format'
import { PageHeader } from '../components/ui/PageHeader'
import { Button } from '../components/ui/Button'
import { EmptyState } from '../components/ui/EmptyState'
import { ConfirmDelete } from '../components/ui/ConfirmDelete'
import { useMonth } from '../context/MonthContext'
import { useToast } from '../context/ToastContext'

interface PaymentFormState {
  id: string | null
  partyId: string
  date: string
  amount: string
  note: string
}

function detectPaymentMode(note?: string | null): { mode: string; style: string } {
  if (!note) return { mode: 'Direct Transfer', style: 'bg-slate-100 text-slate-700 border-slate-200/80' }
  const lower = note.toLowerCase()
  if (lower.includes('neft')) {
    return { mode: 'NEFT', style: 'bg-slate-100 text-slate-700 border-slate-200/80 shadow-2xs' }
  }
  if (lower.includes('rtgs')) {
    return { mode: 'RTGS', style: 'bg-slate-100 text-slate-700 border-slate-200/80 shadow-2xs' }
  }
  if (lower.includes('cheque') || lower.includes('chq')) {
    return { mode: 'Cheque', style: 'bg-amber-50 text-amber-800 border-amber-200/80 shadow-2xs' }
  }
  if (lower.includes('gpay') || lower.includes('upi') || lower.includes('phonepe') || lower.includes('paytm')) {
    return { mode: 'UPI', style: 'bg-slate-100 text-slate-700 border-slate-200/80 shadow-2xs' }
  }
  if (lower.includes('online')) {
    return { mode: 'Online Transfer', style: 'bg-emerald-50 text-emerald-800 border-emerald-200/80 shadow-2xs' }
  }
  if (lower.includes('cash')) {
    return { mode: 'Cash', style: 'bg-teal-50 text-teal-800 border-teal-200/80 shadow-2xs' }
  }
  return { mode: 'Bank Transfer', style: 'bg-slate-100 text-slate-700 border-slate-200/80 shadow-2xs' }
}

export default function Payments() {
  const [searchParams, setSearchParams] = useSearchParams()
  const { filterByMonth, formattedMonth } = useMonth()
  const { showToast } = useToast()
  const [parties, setParties] = useState<Party[]>([])
  const [payments, setPayments] = useState<PaymentWithParty[]>([])
  const [partyBalances, setPartyBalances] = useState<
    Array<{ party: Party; receivable: number; received: number; balance: number }>
  >([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState<PaymentFormState | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  // Search & Voucher View State
  const [searchQuery, setSearchQuery] = useState('')
  const [viewReceipt, setViewReceipt] = useState<PaymentWithParty | null>(null)

  const loadData = useCallback(async () => {
    setLoading(true)
    setErrorMsg(null)
    try {
      const [partiesData, paymentsData, dispatchesData] = await Promise.all([
        fetchParties(),
        fetchPayments(),
        fetchDispatches(),
      ])

      setParties(partiesData)
      setPayments(paymentsData)

      const balances = partiesData
        .map((p) => {
          const receivable = dispatchesData
            .filter((d) => d.party_id === p.id)
            .reduce((sum, d) => sum + (Number(d.amount) || 0), 0)
          const received = paymentsData
            .filter((pay) => pay.party_id === p.id)
            .reduce((sum, pay) => sum + (Number(pay.amount) || 0), 0)
          return {
            party: p,
            receivable,
            received,
            balance: receivable - received,
          }
        })
        .filter((r) => r.receivable > 0 || r.received > 0)

      setPartyBalances(balances)
    } catch (err) {
      console.error('Error loading payments data:', err)
      setErrorMsg('Could not load payments.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadData()
  }, [loadData])

  const blankForm = (initialPartyId?: string): PaymentFormState => ({
    id: null,
    partyId: initialPartyId || parties[0]?.id || '',
    date: todayStr(),
    amount: '',
    note: '',
  })

  const startAdd = useCallback(() => {
    setForm(blankForm())
    setErrorMsg(null)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [parties])

  // Auto open form if navigated from Dashboard Quick Action (+ Paisa)
  useEffect(() => {
    if (searchParams.get('action') === 'new' && parties.length > 0 && !form) {
      startAdd()
      const newParams = new URLSearchParams(searchParams)
      newParams.delete('action')
      setSearchParams(newParams, { replace: true })
    }
  }, [searchParams, parties, form, startAdd, setSearchParams])

  const edit = (p: PaymentWithParty) => {
    window.location.hash = 'modal'
    setForm({
      id: p.id,
      partyId: p.party_id || '',
      date: p.date,
      amount: String(p.amount),
      note: p.note || '',
    })
    setErrorMsg(null)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form || !form.partyId || !form.amount) return

    const amt = parseFloat(form.amount)
    if (isNaN(amt) || amt <= 0) {
      setErrorMsg('Enter a valid payment amount')
      return
    }

    setSaving(true)
    setErrorMsg(null)

    const payload: PaymentPayload = {
      party_id: form.partyId,
      date: form.date,
      amount: amt,
      note: form.note.trim() || null,
    }

    try {
      if (form.id) {
        await updatePayment(form.id, payload)
        showToast('Payment voucher updated successfully', 'success')
      } else {
        await insertPayment(payload)
        showToast('Payment voucher recorded successfully', 'success')
      }
      setForm(null)
      await loadData()
    } catch (err: unknown) {
      console.error('Save payment error:', err)
      const msg = err instanceof Error ? err.message : String(err)
      setErrorMsg(`Could not save — ${msg}`)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await deletePayment(id)
      setDeleting(null)
      showToast('Payment voucher deleted', 'info')
      await loadData()
    } catch (err: unknown) {
      console.error('Delete payment error:', err)
      const msg = err instanceof Error ? err.message : String(err)
      setErrorMsg(`Delete failed — ${msg}`)
    }
  }

  const filteredPayments = filterByMonth(payments)
  const monthCollectedTotal = filteredPayments.reduce(
    (s, p) => s + (Number(p.amount) || 0),
    0
  )

  // Net Pending Receivables (Ashokbhai + Harish due)
  const totalOutstanding = useMemo(() => {
    return partyBalances.reduce((sum, r) => sum + (r.balance > 0 ? r.balance : 0), 0)
  }, [partyBalances])

  // Filtered payments by search query
  const filteredPaymentsList = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    if (!q) return filteredPayments
    return filteredPayments.filter((p) => {
      const partyMatch = p.party?.name ? p.party.name.toLowerCase().includes(q) : false
      const noteMatch = p.note ? p.note.toLowerCase().includes(q) : false
      const dateMatch = fmtDate(p.date).toLowerCase().includes(q)
      const amtMatch = String(p.amount).includes(q)
      return partyMatch || noteMatch || dateMatch || amtMatch
    })
  }, [filteredPayments, searchQuery])

  // Export statements to CSV
  const handleExportCSV = useCallback(() => {
    if (!filteredPaymentsList.length) return
    const headers = ['Date', 'Party', 'Payment Mode', 'Reference Note', 'Amount (INR)']
    const rows = filteredPaymentsList.map((p) => [
      p.date,
      `"${(p.party?.name || '').replace(/"/g, '""')}"`,
      `"${detectPaymentMode(p.note).mode}"`,
      `"${(p.note || '').replace(/"/g, '""')}"`,
      Number(p.amount).toFixed(2),
    ])
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `payments_statement_${formattedMonth.replace(/\s+/g, '_')}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }, [filteredPaymentsList, formattedMonth])

  return (
    <div className="space-y-5">
      <PageHeader
        title="Billing & Payments"
        description="Log party payments, manage receivables, and track balances"
        actions={
          !form && parties.length > 0 && (
            <div className="hidden sm:block">
              <Button onClick={startAdd} className="bg-slate-900 hover:bg-slate-800 text-white font-medium rounded-lg shadow-xs">
                <Plus size={18} strokeWidth={2.5} /> Log Payment
              </Button>
            </div>
          )
        }
      />

      {/* ── 3-Column Balanced Metric Cards ────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 mb-6">
          {/* Card 1: Total Received */}
          <div className="rounded-[var(--radius-xl)] p-4 sm:p-5 bg-[var(--color-positive-bg)] shadow-[var(--shadow-sm)] border border-[var(--color-positive-border)] transition-all hover:shadow-[var(--shadow-md)] flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-[var(--color-positive)]">
                Total Received
              </span>
              <div className="w-8 h-8 rounded-lg bg-emerald-600/10 flex items-center justify-center text-[var(--color-positive)] shrink-0">
                <Receipt size={16} strokeWidth={2.5} />
              </div>
            </div>
            {loading ? (
              <div className="h-7 w-28 rounded bg-emerald-100/50 animate-pulse mb-1" />
            ) : (
              <div className="text-[22px] font-black tabular-nums leading-none tracking-tight text-[var(--color-positive)] mb-1.5">
                {fmtMoney(monthCollectedTotal)}
              </div>
            )}
            <div className="text-[11px] font-semibold text-[var(--color-positive)]/80">
              {formattedMonth} collections
            </div>
          </div>

          {/* Card 2: Total Outstanding */}
          <div className="rounded-[var(--radius-xl)] p-4 sm:p-5 bg-amber-50/70 shadow-[var(--shadow-sm)] border border-amber-200/70 transition-all hover:shadow-[var(--shadow-md)] flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-amber-800">
                Total Outstanding
              </span>
              <div className="w-8 h-8 rounded-lg bg-amber-600/10 flex items-center justify-center text-amber-700 shrink-0">
                <Clock size={16} strokeWidth={2.5} />
              </div>
            </div>
            {loading ? (
              <div className="h-7 w-28 rounded bg-amber-100/50 animate-pulse mb-1" />
            ) : (
              <div className="text-[22px] font-black tabular-nums leading-none tracking-tight text-amber-900 mb-1.5">
                {fmtMoney(totalOutstanding)}
              </div>
            )}
            <div className="text-[11px] font-semibold text-amber-700">
              Net pending receivables
            </div>
          </div>

          {/* Card 3: Payments Logged */}
          <div className="rounded-[var(--radius-xl)] p-4 sm:p-5 bg-white shadow-[var(--shadow-sm)] border border-slate-200/80 transition-all hover:shadow-[var(--shadow-md)] flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                Payments Logged
              </span>
              <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600 shrink-0">
                <CreditCard size={16} strokeWidth={2.2} />
              </div>
            </div>
            {loading ? (
              <div className="h-7 w-20 rounded bg-slate-100 animate-pulse mb-1" />
            ) : (
              <div className="text-[22px] font-black tabular-nums leading-none tracking-tight text-slate-900 mb-1.5">
                {filteredPayments.length} <span className="text-[14px] font-bold text-slate-400">entries</span>
              </div>
            )}
            <div className="text-[11px] font-medium text-slate-500">
              {formattedMonth} transactions
            </div>
          </div>
        </div>

      {errorMsg && (
        <div
          className="rounded-lg p-3 mb-4 text-xs font-medium flex items-center justify-between shadow-xs"
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

      {/* ── Balance Summary Cards Grid ───────────────────────────── */}
      <div className="mb-8">
          <div className="flex items-center justify-between mb-3 px-1">
            <h2 className="text-xs font-black uppercase tracking-wider text-slate-400">
              Party Balances ({partyBalances.length})
            </h2>
            <span className="text-[11px] font-semibold text-slate-400">
              Billed vs Settled ratio
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {partyBalances.length === 0 && !loading && (
              <div className="col-span-full">
                <EmptyState text="No receivables yet — record a dispatch with an amount first." />
              </div>
            )}
            {partyBalances.map((r) => {
              const pct = r.receivable > 0 ? Math.min(100, Math.round((r.received / r.receivable) * 100)) : 100

              return (
                <div
                  key={r.party.id}
                  className="rounded-xl p-5 bg-white border border-slate-200/80 shadow-xs hover:border-slate-300 transition-all duration-200 flex flex-col justify-between"
                >
                  <div>
                    <h3 className="font-semibold text-[16px] text-slate-900 tracking-tight transition-colors">
                      {r.party.name}
                    </h3>

                    {/* Progress Bar */}
                    <div className="mt-3">
                      <div className="flex justify-between items-center text-xs font-medium text-slate-500 mb-1.5">
                        <span>Settlement</span>
                        <span className="font-semibold text-slate-700">{pct}%</span>
                      </div>
                      <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ease-out ${
                            r.balance <= 0 || pct >= 100 ? 'bg-emerald-600' : 'bg-slate-900'
                          }`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>

                    <div className="space-y-2 mt-3.5">
                      <div className="flex justify-between items-center text-[13px]">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Billed</span>
                        <span className="tabular-nums font-bold text-slate-700">{fmtMoney(r.receivable)}</span>
                      </div>
                      <div className="flex justify-between items-center text-[13px]">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Received</span>
                        <span className="tabular-nums font-black text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200/60 shadow-2xs">
                          {fmtMoney(r.received)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Balance / Advance bottom row */}
                  <div className="pt-3.5 mt-3.5 border-t border-slate-100 flex justify-between items-center">
                    {r.balance < 0 ? (
                      <>
                        <span className="text-[10.5px] font-black uppercase tracking-wider text-emerald-700">
                          Advance Credit
                        </span>
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[12px] font-black tabular-nums bg-emerald-50 text-emerald-700 border border-emerald-200/80 shadow-2xs">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                          {fmtMoney(Math.abs(r.balance))} (Advance)
                        </span>
                      </>
                    ) : r.balance > 0 ? (
                      <>
                        <span className="text-[10.5px] font-black uppercase tracking-wider text-rose-500">
                          Balance Due
                        </span>
                        <span className="tabular-nums font-black text-[17px] leading-none tracking-tight text-rose-600">
                          {fmtMoney(r.balance)}
                        </span>
                      </>
                    ) : (
                      <>
                        <span className="text-[10.5px] font-black uppercase tracking-wider text-slate-400">
                          Balance Due
                        </span>
                        <span className="tabular-nums font-bold text-[14px] text-slate-500 leading-none">
                          {fmtMoney(0)} (Settled)
                        </span>
                      </>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

      {/* ── Structured Recent Payments Table ─────────────────────── */}
      <div className="pb-28">
          {/* Section Toolbar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div>
              <h2 className="text-xs font-black uppercase tracking-wider text-slate-500 pl-1">
                Recent Payments Log ({filteredPaymentsList.length})
              </h2>
              <p className="text-[11.5px] font-medium text-slate-400 pl-1">
                Verified payment receipts & party settlements
              </p>
            </div>

            <div className="flex items-center gap-2.5">
              {/* Search Bar */}
              <div className="relative w-full sm:w-64">
                <Search
                  size={14}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                />
                <input
                  type="text"
                  placeholder="Search by Party or Reference..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full h-9 pl-9 pr-8 text-[12.5px] font-medium text-slate-800 bg-white border border-slate-200 rounded-xl shadow-xs placeholder:text-slate-400 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/15 transition-all"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded-full cursor-pointer"
                  >
                    <X size={13} />
                  </button>
                )}
              </div>

              {/* Export Statement Button */}
              <button
                type="button"
                onClick={handleExportCSV}
                className="h-9 px-3.5 rounded-xl text-[12.5px] font-bold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 hover:border-slate-300 shadow-xs transition-all flex items-center gap-2 cursor-pointer shrink-0 active:scale-98"
                title="Export statement to CSV"
              >
                <Download size={14} strokeWidth={2.2} className="text-slate-500" />
                <span className="hidden sm:inline">Export Statement</span>
                <span className="sm:hidden">Export</span>
              </button>
            </div>
          </div>

          {filteredPayments.length === 0 && !loading ? (
            <EmptyState text={`No payments logged for ${formattedMonth}.`} />
          ) : filteredPaymentsList.length === 0 ? (
            <div className="bg-white rounded-[20px] p-10 text-center border border-slate-200/80 shadow-xs">
              <Search size={28} className="mx-auto text-slate-300 mb-2.5" />
              <h4 className="text-sm font-bold text-slate-800">No matching payments found</h4>
              <p className="text-xs text-slate-500 mt-0.5">No transactions matching &ldquo;{searchQuery}&rdquo;</p>
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="mt-3 px-3.5 py-1.5 rounded-xl text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 transition-colors cursor-pointer"
              >
                Clear Filter
              </button>
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-xs border border-slate-200/80 overflow-hidden">
              <div className="overflow-x-auto scrollbar-hide">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/90 border-b border-slate-200/80">
                      <th className="px-5 py-3.5 text-[11px] font-bold text-slate-600 uppercase tracking-wider whitespace-nowrap">Date</th>
                      <th className="px-5 py-3.5 text-[11px] font-bold text-slate-600 uppercase tracking-wider whitespace-nowrap">Party</th>
                      <th className="px-5 py-3.5 text-[11px] font-bold text-slate-600 uppercase tracking-wider whitespace-nowrap">Payment Mode</th>
                      <th className="px-5 py-3.5 text-[11px] font-bold text-slate-600 uppercase tracking-wider whitespace-nowrap">Reference / Note</th>
                      <th className="px-5 py-3.5 text-[11px] font-bold text-slate-600 uppercase tracking-wider whitespace-nowrap text-right">Amount</th>
                      <th className="px-5 py-3.5 text-[11px] font-bold text-slate-600 uppercase tracking-wider whitespace-nowrap text-right w-24">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredPaymentsList.map((p) => {
                      const modeInfo = detectPaymentMode(p.note)

                      return (
                        <tr
                          key={p.id}
                          className="hover:bg-slate-50/80 active:bg-slate-100/60 transition-colors select-none group/tr"
                        >
                          {/* Date */}
                          <td className="px-5 py-4 whitespace-nowrap align-middle">
                            <span className="text-[12.5px] text-slate-500 font-medium">
                              {fmtDate(p.date)}
                            </span>
                          </td>

                          {/* Party */}
                          <td className="px-5 py-4 whitespace-nowrap align-middle">
                            <span className="font-semibold text-[13.5px] text-slate-900 tracking-tight transition-colors block" title={p.party?.name}>
                              {p.party?.name ?? '—'}
                            </span>
                          </td>

                          {/* Payment Mode */}
                          <td className="px-5 py-4 whitespace-nowrap align-middle">
                            <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-bold border ${modeInfo.style}`}>
                              {modeInfo.mode}
                            </span>
                          </td>

                          {/* Reference / Note */}
                          <td className="px-5 py-4 whitespace-nowrap align-middle">
                            <span className="text-[12.5px] text-slate-600 font-medium truncate max-w-xs block" title={p.note || ''}>
                              {p.note || '—'}
                            </span>
                          </td>

                          {/* Amount */}
                          <td className="px-5 py-4 whitespace-nowrap text-right align-middle">
                            <span className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-md text-xs font-mono font-semibold border border-emerald-200/60 tabular-nums">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                              +{fmtMoney(p.amount)}
                            </span>
                          </td>

                          {/* Actions */}
                          <td className="px-5 py-4 whitespace-nowrap text-right align-middle">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                type="button"
                                onClick={() => setViewReceipt(p)}
                                className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-md transition cursor-pointer"
                                title="View Payment Receipt Voucher"
                                aria-label="View Receipt Voucher"
                              >
                                <Receipt size={16} strokeWidth={2} />
                              </button>
                              <button
                                type="button"
                                onClick={() => edit(p)}
                                className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition cursor-pointer"
                                title="Edit Payment"
                                aria-label="Edit Payment"
                              >
                                <Pencil size={15} strokeWidth={2} />
                              </button>
                              {deleting === p.id ? (
                                <ConfirmDelete
                                  onConfirm={() => handleDelete(p.id)}
                                  onCancel={() => setDeleting(null)}
                                />
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => setDeleting(p.id)}
                                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition cursor-pointer"
                                  title="Delete Payment"
                                  aria-label="Delete Payment"
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
            </div>
          )}
        </div>

      {/* ── Payment Receipt Voucher Modal ──────────────────────────── */}
      {viewReceipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="px-6 py-4 bg-gradient-to-r from-emerald-600 to-teal-700 text-white flex justify-between items-center">
              <div>
                <p className="text-[10px] font-black uppercase tracking-wider text-emerald-100">
                  ValManager • Official Receipt
                </p>
                <h3 className="text-lg font-black tracking-tight">Payment Voucher</h3>
              </div>
              <button
                type="button"
                onClick={() => setViewReceipt(null)}
                className="p-1.5 rounded-full hover:bg-white/20 text-white transition-colors cursor-pointer"
              >
                <X size={18} strokeWidth={2.5} />
              </button>
            </div>

            {/* Voucher Body */}
            <div className="p-6 space-y-4 bg-slate-50/50">
              <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs space-y-3">
                <div className="flex justify-between items-center pb-2.5 border-b border-slate-100">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Voucher No</span>
                  <span className="text-[12px] font-black text-slate-800">#RCP-{viewReceipt.id.slice(0, 8).toUpperCase()}</span>
                </div>
                <div className="flex justify-between items-center pb-2.5 border-b border-slate-100">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Received From</span>
                  <span className="text-[14px] font-black text-slate-900">{viewReceipt.party?.name ?? '—'}</span>
                </div>
                <div className="flex justify-between items-center pb-2.5 border-b border-slate-100">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Date of Receipt</span>
                  <span className="text-[12.5px] font-semibold text-slate-700">{fmtDate(viewReceipt.date)}</span>
                </div>
                <div className="flex justify-between items-center pb-2.5 border-b border-slate-100">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Payment Mode</span>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold border ${detectPaymentMode(viewReceipt.note).style}`}>
                    {detectPaymentMode(viewReceipt.note).mode}
                  </span>
                </div>
                {viewReceipt.note && (
                  <div className="flex justify-between items-start pb-2.5 border-b border-slate-100">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Narration / Ref</span>
                    <span className="text-[12px] font-medium text-slate-700 max-w-[240px] text-right">{viewReceipt.note}</span>
                  </div>
                )}
                <div className="flex justify-between items-center pt-1">
                  <span className="text-[12px] font-black text-slate-600 uppercase tracking-wider">Amount Received</span>
                  <span className="text-[20px] font-black text-emerald-600 tabular-nums">
                    {fmtMoney(viewReceipt.amount)}
                  </span>
                </div>
              </div>

              {/* Status Note */}
              <div className="text-center text-[11px] text-slate-400 font-medium">
                Electronically generated settlement voucher • Kasab Val Portal
              </div>
            </div>

            {/* Actions */}
            <div className="px-6 py-3.5 bg-white border-t border-slate-100 flex justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setViewReceipt(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Printer size={14} />
                <span>Print Voucher</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Add / Edit Form Modal ──────────────────────────────────────── */}
      {form && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/40 backdrop-blur-xs p-0 sm:p-4 transition-all animate-in fade-in duration-200">
          <div className="bg-white w-full sm:max-w-[480px] rounded-t-[24px] sm:rounded-2xl shadow-2xl flex flex-col relative overflow-hidden animate-in slide-in-from-bottom-12 sm:zoom-in-95 duration-200 ease-out">
            <div className="sm:hidden flex justify-center pt-3 pb-1 bg-white">
              <div className="w-12 h-1.5 bg-gray-200 rounded-full"></div>
            </div>
            
            <div className="px-6 pb-4 pt-4 sm:pt-6 bg-white flex justify-between items-start border-b border-gray-100 shrink-0">
              <div>
                <p className="text-[10px] font-extrabold tracking-widest text-slate-500 uppercase mb-1.5">
                  {form.id ? 'EDIT PAYMENT' : 'NEW PAYMENT'}
                </p>
                <h2 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight">
                  Log Received Amount
                </h2>
              </div>
              <button 
                onClick={() => { if(window.location.hash === '#modal') window.history.back(); else setForm(null); }}
                className="p-2 -mr-2 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100/80 transition-colors cursor-pointer"
              >
                <X size={20} strokeWidth={2.5} />
              </button>
            </div>

            <form onSubmit={submit} className="p-6 bg-[#fcfcfb] space-y-5">
              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-extrabold text-gray-400 uppercase mb-1.5 tracking-widest pl-1">Party *</label>
                  <select
                    required
                    value={form.partyId}
                    onChange={(e) => setForm({ ...form, partyId: e.target.value })}
                    className="w-full h-[48px] sm:h-[42px] px-4 bg-gray-50/50 border border-gray-200/80 rounded-[14px] sm:rounded-xl text-[15px] sm:text-sm font-bold text-gray-900 focus:outline-none focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10 transition-all appearance-none cursor-pointer shadow-sm"
                  >
                    {parties.map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>

                <div className="flex gap-4">
                  <div className="flex-1">
                    <label className="block text-[10px] font-extrabold text-gray-400 uppercase mb-1.5 tracking-widest pl-1">Amount (₹) *</label>
                    <input
                      required
                      type="number"
                      step="0.01"
                      placeholder="e.g. 5000"
                      className="w-full h-[48px] sm:h-[42px] px-4 bg-emerald-50/30 border border-emerald-200/50 rounded-[14px] sm:rounded-xl text-[16px] sm:text-[15px] font-black tabular-nums text-emerald-700 placeholder:text-emerald-700/30 focus:outline-none focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10 transition-all shadow-sm"
                      value={form.amount}
                      onChange={(e) => setForm({ ...form, amount: e.target.value })}
                    />
                  </div>
                  <div className="flex-[0.8]">
                    <label className="block text-[10px] font-extrabold text-gray-400 uppercase mb-1.5 tracking-widest pl-1">Date</label>
                    <input
                      type="date"
                      required
                      className="w-full h-[48px] sm:h-[42px] px-4 bg-gray-50/50 border border-gray-200/80 rounded-[14px] sm:rounded-xl text-[14px] sm:text-sm font-bold text-gray-900 focus:outline-none focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10 transition-all shadow-sm"
                      value={form.date}
                      onChange={(e) => setForm({ ...form, date: e.target.value })}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-extrabold text-gray-400 uppercase mb-1.5 tracking-widest pl-1">Note (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. GPay / Cash / Cheque"
                    className="w-full h-[48px] sm:h-[42px] px-4 bg-gray-50/50 border border-gray-200/80 rounded-[14px] sm:rounded-xl text-[14px] sm:text-sm font-bold text-gray-900 focus:outline-none focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10 transition-all shadow-sm"
                    value={form.note}
                    onChange={(e) => setForm({ ...form, note: e.target.value })}
                  />
                </div>
              </div>

              <div className="pt-2 flex sm:justify-end gap-3 pb-2 border-t border-gray-100 mt-2">
                <button
                  type="button"
                  onClick={() => { if(window.location.hash === '#modal') window.history.back(); else setForm(null); }}
                  disabled={saving}
                  className="flex-1 sm:flex-none sm:px-6 py-3 sm:py-2.5 rounded-[14px] sm:rounded-xl font-bold text-gray-500 bg-gray-50 hover:bg-gray-100 border border-gray-200/50 transition-colors cursor-pointer text-[15px] sm:text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-[2] sm:flex-none sm:px-8 py-3 sm:py-2.5 rounded-[14px] sm:rounded-lg font-medium text-white bg-slate-900 hover:bg-slate-800 shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer border border-slate-900 text-[15px] sm:text-sm"
                >
                  {saving ? 'Saving...' : 'Save Payment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Floating Action Button - Mobile Only */}
      {!form && parties.length > 0 && (
        <button
          onClick={startAdd}
          className="sm:hidden fixed bottom-[80px] right-5 bg-slate-900 hover:bg-slate-800 text-white px-6 py-4 rounded-full shadow-lg flex items-center gap-2.5 font-bold transition-all active:scale-95 z-40 border border-slate-800"
        >
          <Plus size={22} strokeWidth={3} /> <span className="tracking-wide">Log Payment</span>
        </button>
      )}
    </div>
  )
}
