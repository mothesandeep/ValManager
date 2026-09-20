import { useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Plus, Pencil, Trash2, X } from 'lucide-react'
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

interface PaymentFormState {
  id: string | null
  partyId: string
  date: string
  amount: string
  note: string
}

export default function Payments() {
    
const [searchParams, setSearchParams] = useSearchParams()
  const { filterByMonth, formattedMonth } = useMonth()
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
      } else {
        await insertPayment(payload)
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

  return (
    <div className="space-y-5">
      <PageHeader
        title="Payments"
        description="Log party payments, manage receivables, and track balances"
        actions={
          !form && parties.length > 0 && (
            <div className="hidden sm:block">
              <Button onClick={startAdd} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                <Plus size={18} strokeWidth={2.5} /> Log Payment
              </Button>
            </div>
          )
        }
      />

      {/* ── Month Summary KPI ─────────────────────────────────────── */}
      {!form && (
        <div className="grid grid-cols-2 gap-4 mb-8">
          <div className="rounded-[var(--radius-xl)] p-5 bg-[var(--color-positive-bg)] shadow-[var(--shadow-sm)] border border-[var(--color-positive-border)] transition-all">
            <div className="text-[10px] font-extrabold uppercase tracking-widest text-[var(--color-positive)] mb-2">Total Collected</div>
            <div className="text-[24px] font-black tabular-nums leading-none tracking-tight text-[var(--color-positive)] mb-1.5">
              {fmtMoney(monthCollectedTotal)}
            </div>
            <div className="text-[10px] font-bold text-[var(--color-positive)]">{formattedMonth}</div>
          </div>
          <div className="rounded-[var(--radius-xl)] p-5 bg-[var(--color-card)] shadow-[var(--shadow-sm)] border border-[var(--color-border)] transition-all">
            <div className="text-[10px] font-extrabold uppercase tracking-widest text-[var(--color-ink-soft)] mb-2">Payments Logged</div>
            <div className="text-[24px] font-black tabular-nums leading-none tracking-tight text-[var(--color-ink)] mb-1.5">
              {filteredPayments.length} <span className="text-[14px] text-[var(--color-ink-soft)] font-bold tracking-normal">entries</span>
            </div>
            <div className="text-[10px] font-medium text-[var(--color-ink-soft)]">{formattedMonth}</div>
          </div>
        </div>
      )}

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
      {!form && (
        <div className="mb-8">
          <h2 className="text-xs font-extrabold uppercase tracking-widest text-gray-400 mb-4 pl-1">Party Balances</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {partyBalances.length === 0 && !loading && (
              <div className="col-span-full">
                <EmptyState text="No receivables yet — record a dispatch with an amount first." />
              </div>
            )}
            {partyBalances.map((r) => (
              <div
                key={r.party.id}
                className="rounded-[var(--radius-xl)] p-5 bg-[var(--color-card)] border border-[var(--color-border)] shadow-[var(--shadow-sm)] hover:shadow-[var(--shadow-md)] transition-all"
              >
                <h3 className="font-extrabold text-[16px] mb-4 text-gray-900 tracking-tight">
                  {r.party.name}
                </h3>
                <div className="space-y-2.5">
                  <div className="flex justify-between items-center">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400">Total Billed</span>
                    <span className="tabular-nums font-black text-gray-600">{fmtMoney(r.receivable)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400">Received</span>
                    <span className="tabular-nums font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">{fmtMoney(r.received)}</span>
                  </div>
                </div>
                <div className="flex justify-between items-end pt-4 mt-4 border-t border-gray-100">
                  <span className="text-[11px] font-extrabold uppercase tracking-widest text-gray-400">Balance Due</span>
                  <span
                    className={`tabular-nums font-black text-[18px] leading-none tracking-tight ${
                      r.balance > 0
                        ? 'text-red-500'
                        : r.balance < 0
                        ? 'text-emerald-500'
                        : 'text-gray-900'
                    }`}
                  >
                    {fmtMoney(r.balance)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Payments List (Table replaced with premium list) ───────────────────────────────────────────── */}
      {!form && (
        <div className="pb-28">
          <h2 className="text-xs font-extrabold uppercase tracking-widest text-gray-400 mb-4 pl-1">Recent Payments</h2>
          {filteredPayments.length === 0 && !loading ? (
            <EmptyState text={`No payments logged for ${formattedMonth}.`} />
          ) : (
            <div className="space-y-3">
              {filteredPayments.map((p) => (
                <div
                  key={p.id}
                  className="rounded-[var(--radius-xl)] p-4 bg-[var(--color-card)] border border-[var(--color-border)] shadow-[var(--shadow-sm)] flex items-center justify-between group transition-all hover:shadow-[var(--shadow-md)]"
                >
                  <div className="flex flex-col">
                    <span className="font-bold text-[15px] text-gray-900 tracking-tight">{p.party?.name ?? '—'}</span>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[11px] font-bold text-gray-400">{fmtDate(p.date)}</span>
                      {p.note && (
                        <>
                          <span className="text-gray-300">·</span>
                          <span className="text-[11px] font-medium text-gray-500">{p.note}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-[17px] font-black tabular-nums text-emerald-600 tracking-tight">
                      +{fmtMoney(p.amount)}
                    </span>
                    <div className="flex items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                      <button
                        type="button"
                        onClick={() => edit(p)}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer"
                      >
                        <Pencil size={15} />
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
                          className="p-1.5 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors cursor-pointer"
                        >
                          <Trash2 size={15} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Add / Edit Form Modal ──────────────────────────────────────── */}
      {form && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-0 sm:p-4 transition-all">
          <div className="bg-[#fcfcfb] w-full sm:max-w-[480px] rounded-t-[24px] sm:rounded-2xl shadow-2xl flex flex-col relative overflow-hidden animate-in slide-in-from-bottom-12 sm:zoom-in-95 duration-300 ease-out">
            <div className="sm:hidden flex justify-center pt-3 pb-1 bg-white">
              <div className="w-12 h-1.5 bg-gray-200 rounded-full"></div>
            </div>
            
            <div className="px-6 pb-4 pt-4 sm:pt-6 bg-white flex justify-between items-start border-b border-gray-100 shrink-0">
              <div>
                <p className="text-[10px] font-extrabold tracking-widest text-emerald-600/70 uppercase mb-1.5">
                  {form.id ? 'EDIT PAYMENT' : 'NEW PAYMENT'}
                </p>
                <h2 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight">
                  Log Received Amount
                </h2>
              </div>
              <button 
                onClick={() => setForm(null)}
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
                  onClick={() => setForm(null)}
                  disabled={saving}
                  className="flex-1 sm:flex-none sm:px-6 py-3 sm:py-2.5 rounded-[14px] sm:rounded-xl font-bold text-gray-500 bg-gray-50 hover:bg-gray-100 border border-gray-200/50 transition-colors cursor-pointer text-[15px] sm:text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-[2] sm:flex-none sm:px-8 py-3 sm:py-2.5 rounded-[14px] sm:rounded-xl font-black text-white bg-gradient-to-b from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 shadow-[0_4px_12px_rgba(16,185,129,0.3)] transition-all flex items-center justify-center gap-2 cursor-pointer border border-emerald-600/50 text-[15px] sm:text-sm"
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
          className="sm:hidden fixed bottom-[80px] right-5 bg-gradient-to-b from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white px-6 py-4 rounded-full shadow-[0_8px_30px_-8px_rgba(16,185,129,0.5)] flex items-center gap-2.5 font-black transition-all active:scale-95 z-40 border border-emerald-400/50"
        >
          <Plus size={22} strokeWidth={3} /> <span className="tracking-wide">Log Payment</span>
        </button>
      )}
    </div>
  )
}
