import { useState, useEffect, useCallback } from 'react'
import { Plus, Pencil, Trash2, X } from 'lucide-react'
import { fetchExpenses, insertExpense, updateExpense, deleteExpense, type ExpensePayload } from '../lib/api/expenses'


import type { Expense } from '../features/expenses/types'
import { EXPENSE_CATEGORIES } from '../features/expenses/constants'
import { fmtDate, todayStr } from '../utils/date'
import { fmtMoney } from '../utils/format'
import { PageHeader } from '../components/ui/PageHeader'
import { Button } from '../components/ui/Button'
import { ConfirmDelete } from '../components/ui/ConfirmDelete'
import { EmptyState } from '../components/ui/EmptyState'
import { useMonth } from '../context/MonthContext'

interface ExpenseFormState {
  id: string | null
  date: string
  category: string
  amount: string
  note: string
}

export default function Expenses() {
  const { filterByMonth, formattedMonth } = useMonth()
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState<ExpenseFormState | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

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

  const filteredExpenses = filterByMonth(expenses)
  const monthExpenseTotal = filteredExpenses.reduce(
    (s, x) => s + (Number(x.amount) || 0),
    0
  )

  const blankForm = (): ExpenseFormState => ({
    id: null,
    date: todayStr(),
    category: EXPENSE_CATEGORIES[0],
    amount: '',
    note: '',
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
    setForm({
      id: x.id,
      date: x.date,
      category: x.category || EXPENSE_CATEGORIES[0],
      amount: String(x.amount),
      note: x.note || '',
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

    const payload: ExpensePayload = {
      date: form.date,
      category: form.category,
      amount: amt,
      note: form.note.trim() || null,
    }

    try {
      if (form.id) {
        await updateExpense(form.id, payload)
      } else {
        await insertExpense(payload)
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
      await loadData()
    } catch (err: unknown) {
      console.error('Delete expense error:', err)
      const msg = err instanceof Error ? err.message : String(err)
      setErrorMsg(`Delete failed — ${msg}`)
    }
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Expenses"
        description="Operational costs — rent, repairs, transport & utilities"
        actions={
          !form && (
            <div className="hidden sm:block">
              <Button onClick={startAdd} className="bg-red-600 hover:bg-red-700 text-white">
                <Plus size={18} strokeWidth={2.5} /> Log Expense
              </Button>
            </div>
          )
        }
      />

      {/* ── Month Summary KPIs ────────────────────────────────────── */}
      {!form && (
        <div className="grid grid-cols-2 gap-4 mb-8">
          <div className="rounded-[var(--radius-xl)] p-5 bg-[var(--color-negative-bg)] shadow-[var(--shadow-sm)] border border-red-100/50 transition-all">
            <div className="text-[10px] font-extrabold uppercase tracking-widest text-red-600/70 mb-2">Total Expenses</div>
            <div className="text-[24px] font-black tabular-nums leading-none tracking-tight text-[var(--color-negative)] mb-1.5">
              {fmtMoney(monthExpenseTotal)}
            </div>
            <div className="text-[10px] font-bold text-red-600/50">{formattedMonth}</div>
          </div>
          <div className="rounded-[var(--radius-xl)] p-5 bg-[var(--color-card)] shadow-[var(--shadow-sm)] border border-[var(--color-border)] transition-all">
            <div className="text-[10px] font-extrabold uppercase tracking-widest text-[var(--color-ink-soft)] mb-2">Expense Count</div>
            <div className="text-[24px] font-black tabular-nums leading-none tracking-tight text-[var(--color-ink)] mb-1.5">
              {filteredExpenses.length} <span className="text-[14px] text-[var(--color-ink-soft)] font-bold tracking-normal">entries</span>
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

      {/* ── Expenses List ───────────────────────────────────────────── */}
      {!form && (
        <div className="pb-28">
          <h2 className="text-xs font-extrabold uppercase tracking-widest text-gray-400 mb-4 pl-1">Recent Expenses</h2>
          {loading ? (
            <div className="rounded-[20px] p-8 text-center text-sm border border-gray-100 bg-white shadow-sm text-gray-400">
              Loading expenses…
            </div>
          ) : filteredExpenses.length === 0 ? (
            <EmptyState text={`No expenses logged for ${formattedMonth}.`} />
          ) : (
            <div className="space-y-3">
              {filteredExpenses.map((x) => (
                <div
                  key={x.id}
                  className="rounded-[var(--radius-xl)] p-4 bg-[var(--color-card)] border border-[var(--color-border)] shadow-[var(--shadow-sm)] flex items-center justify-between group transition-all hover:shadow-[var(--shadow-md)]"
                >
                  <div className="flex flex-col">
                    <span className="font-bold text-[15px] text-gray-900 tracking-tight">{x.category}</span>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[11px] font-bold text-gray-400">{fmtDate(x.date)}</span>
                      {x.note && (
                        <>
                          <span className="text-gray-300">·</span>
                          <span className="text-[11px] font-medium text-gray-500">{x.note}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-[17px] font-black tabular-nums text-red-600 tracking-tight">
                      -{fmtMoney(x.amount)}
                    </span>
                    <div className="flex items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                      <button
                        type="button"
                        onClick={() => edit(x)}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer"
                      >
                        <Pencil size={15} />
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
                <p className="text-[10px] font-extrabold tracking-widest text-red-600/70 uppercase mb-1.5">
                  {form.id ? 'EDIT EXPENSE' : 'NEW EXPENSE'}
                </p>
                <h2 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight">
                  Log Operating Cost
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
                  <label className="block text-[10px] font-extrabold text-gray-400 uppercase mb-1.5 tracking-widest pl-1">Category *</label>
                  <select
                    required
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                    className="w-full h-[48px] sm:h-[42px] px-4 bg-gray-50/50 border border-gray-200/80 rounded-[14px] sm:rounded-xl text-[15px] sm:text-sm font-bold text-gray-900 focus:outline-none focus:bg-white focus:border-red-500 focus:ring-2 focus:ring-red-500/10 transition-all appearance-none cursor-pointer shadow-sm"
                  >
                    {EXPENSE_CATEGORIES.map((c) => (
                      <option key={c} value={c}>{c}</option>
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
                      placeholder="e.g. 1500"
                      className="w-full h-[48px] sm:h-[42px] px-4 bg-red-50/30 border border-red-200/50 rounded-[14px] sm:rounded-xl text-[16px] sm:text-[15px] font-black tabular-nums text-red-700 placeholder:text-red-700/30 focus:outline-none focus:bg-white focus:border-red-500 focus:ring-2 focus:ring-red-500/10 transition-all shadow-sm"
                      value={form.amount}
                      onChange={(e) => setForm({ ...form, amount: e.target.value })}
                    />
                  </div>
                  <div className="flex-[0.8]">
                    <label className="block text-[10px] font-extrabold text-gray-400 uppercase mb-1.5 tracking-widest pl-1">Date</label>
                    <input
                      type="date"
                      required
                      className="w-full h-[48px] sm:h-[42px] px-4 bg-gray-50/50 border border-gray-200/80 rounded-[14px] sm:rounded-xl text-[14px] sm:text-sm font-bold text-gray-900 focus:outline-none focus:bg-white focus:border-red-500 focus:ring-2 focus:ring-red-500/10 transition-all shadow-sm"
                      value={form.date}
                      onChange={(e) => setForm({ ...form, date: e.target.value })}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-extrabold text-gray-400 uppercase mb-1.5 tracking-widest pl-1">Note (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. Shop rent / Machine oil"
                    className="w-full h-[48px] sm:h-[42px] px-4 bg-gray-50/50 border border-gray-200/80 rounded-[14px] sm:rounded-xl text-[14px] sm:text-sm font-bold text-gray-900 focus:outline-none focus:bg-white focus:border-red-500 focus:ring-2 focus:ring-red-500/10 transition-all shadow-sm"
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
                  className="flex-[2] sm:flex-none sm:px-8 py-3 sm:py-2.5 rounded-[14px] sm:rounded-xl font-black text-white bg-gradient-to-b from-red-500 to-rose-600 hover:from-red-400 hover:to-rose-500 shadow-[0_4px_12px_rgba(239,68,68,0.3)] transition-all flex items-center justify-center gap-2 cursor-pointer border border-red-600/50 text-[15px] sm:text-sm"
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
          className="sm:hidden fixed bottom-[80px] right-5 bg-gradient-to-b from-red-500 to-rose-600 hover:from-red-400 hover:to-rose-500 text-white px-6 py-4 rounded-full shadow-[0_8px_30px_-8px_rgba(239,68,68,0.5)] flex items-center gap-2.5 font-black transition-all active:scale-95 z-40 border border-red-400/50"
        >
          <Plus size={22} strokeWidth={3} /> <span className="tracking-wide">Log Expense</span>
        </button>
      )}
    </div>
  )
}
