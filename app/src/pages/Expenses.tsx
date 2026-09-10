import { useState, useEffect, useCallback } from 'react'
import { Plus, Pencil, Trash2, Check } from 'lucide-react'
import {
  fetchExpenses,
  insertExpense,
  updateExpense,
  deleteExpense,
  type ExpensePayload,
} from '../lib/queries'
import type { Expense } from '../types'
import { EXPENSE_CATEGORIES, fmtDate, fmtMoney, todayStr } from '../types'
import {
  SectionHeader,
  KpiCard,
  Button,
  Field,
  TextInput,
  Select,
  Table,
  ConfirmDelete,
} from '../components/ui/UIComponents'
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

  const startAdd = () => {
    setForm(blankForm())
    setErrorMsg(null)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const edit = (x: Expense) => {
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
      <SectionHeader
        title="Expenses"
        subtitle="Rent, transport, machine maintenance, consumables"
        action={
          !form && (
            <Button onClick={startAdd}>
              <Plus size={16} /> Add Expense
            </Button>
          )
        }
      />

      {/* ── Month Summary KPIs ────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <KpiCard
          label="Total Expenses"
          value={fmtMoney(monthExpenseTotal)}
          sub={formattedMonth}
          tone="due"
          loading={loading}
        />
        <KpiCard
          label="Expense Count"
          value={filteredExpenses.length}
          sub="entries recorded"
          loading={loading}
        />
      </div>

      {errorMsg && (
        <div
          className="rounded-lg p-3 mb-4 text-xs font-medium flex items-center justify-between"
          style={{ background: 'var(--color-due-bg)', color: 'var(--color-due)' }}
        >
          <span>{errorMsg}</span>
          <button
            onClick={() => setErrorMsg(null)}
            className="underline cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* ── Add / Edit Form ──────────────────────────────────────── */}
      {form && (
        <form
          onSubmit={submit}
          className="mb-5 p-4 rounded-lg grid grid-cols-2 sm:grid-cols-4 gap-3"
          style={{
            background: 'var(--color-card)',
            border: '1px solid var(--color-border)',
          }}
        >
          <Field label="Date">
            <TextInput
              type="date"
              required
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
            />
          </Field>

          <Field label="Category">
            <Select
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
            >
              {EXPENSE_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Amount (₹) *">
            <TextInput
              required
              type="number"
              step="0.01"
              placeholder="e.g. 1500"
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
            />
          </Field>

          <Field label="Note">
            <TextInput
              placeholder="e.g. Monthly shop rent"
              value={form.note}
              onChange={(e) => setForm({ ...form, note: e.target.value })}
            />
          </Field>

          <div className="flex gap-2 items-end pt-1 col-span-2 sm:col-span-1">
            <Button type="submit" disabled={saving}>
              <Check size={16} /> {saving ? 'Saving…' : 'Save'}
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setForm(null)}
              disabled={saving}
            >
              Cancel
            </Button>
          </div>
        </form>
      )}

      {/* ── Table View / Loading ─────────────────────────────────── */}
      {loading ? (
        <div
          className="rounded-lg p-8 text-center text-sm"
          style={{ border: '1px solid var(--color-border)', color: 'var(--color-ink-soft)', background: 'var(--color-card)' }}
        >
          Loading expenses…
        </div>
      ) : (
        <Table
          columns={['Date', 'Category', 'Amount', 'Note', '']}
          rows={filteredExpenses}
          emptyText={`No expenses found for ${formattedMonth}.`}
        renderRow={(x) => (
          <tr
            key={x.id}
            style={{ borderTop: '1px solid var(--color-border-soft)' }}
          >
            <td className="px-3 py-2 whitespace-nowrap">{fmtDate(x.date)}</td>
            <td className="px-3 py-2">{x.category}</td>
            <td
              className="px-3 py-2 tabular-nums font-semibold"
              style={{ color: 'var(--color-due)' }}
            >
              {fmtMoney(x.amount)}
            </td>
            <td className="px-3 py-2" style={{ color: 'var(--color-ink-soft)' }}>
              {x.note || '—'}
            </td>
            <td className="px-3 py-2 text-right whitespace-nowrap">
              <button
                type="button"
                onClick={() => edit(x)}
                className="p-1 cursor-pointer"
                style={{ color: 'var(--color-ink-soft)' }}
                title="Edit expense"
                aria-label="Edit expense"
              >
                <Pencil size={14} />
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
                  className="p-1 cursor-pointer"
                  style={{ color: 'var(--color-due)' }}
                  title="Delete expense"
                  aria-label="Delete expense"
                >
                  <Trash2 size={14} />
                </button>
              )}
            </td>
          </tr>
        )}
      />
      )}
    </div>
  )
}
