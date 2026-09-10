import { useState, useEffect, useCallback } from 'react'
import { Plus, Pencil, Trash2, Check } from 'lucide-react'
import {
  fetchParties,
  fetchPayments,
  fetchDispatches,
  insertPayment,
  updatePayment,
  deletePayment,
  type PaymentPayload,
} from '../lib/queries'
import type { Party, PaymentWithParty } from '../types'
import { fmtDate, fmtMoney, todayStr } from '../types'
import {
  SectionHeader,
  KpiCard,
  Button,
  Field,
  TextInput,
  Select,
  Table,
  EmptyState,
  ConfirmDelete,
} from '../components/ui/UIComponents'
import { useMonth } from '../context/MonthContext'

interface PaymentFormState {
  id: string | null
  partyId: string
  date: string
  amount: string
  note: string
}

export default function Payments() {
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

  const filteredPayments = filterByMonth(payments)
  const monthCollectedTotal = filteredPayments.reduce(
    (s, p) => s + (Number(p.amount) || 0),
    0
  )

  const blankForm = (initialPartyId?: string): PaymentFormState => ({
    id: null,
    partyId: initialPartyId || parties[0]?.id || '',
    date: todayStr(),
    amount: '',
    note: '',
  })

  const startAdd = () => {
    setForm(blankForm())
    setErrorMsg(null)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

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

  return (
    <div className="space-y-5">
      <SectionHeader
        title="Payments"
        subtitle="Log money received against dispatched Val"
        action={
          !form &&
          parties.length > 0 && (
            <Button onClick={startAdd}>
              <Plus size={16} /> Log Payment
            </Button>
          )
        }
      />

      {/* ── Month Summary KPI ─────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <KpiCard
          label="Total Collected"
          value={fmtMoney(monthCollectedTotal)}
          sub={formattedMonth}
          tone="positive"
          loading={loading}
        />
        <KpiCard
          label="Payments Logged"
          value={filteredPayments.length}
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

      {/* ── Balance Summary Cards Grid ───────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-5">
        {partyBalances.length === 0 && !loading && (
          <div className="col-span-full">
            <EmptyState text="No receivables yet — record a dispatch with an amount first." />
          </div>
        )}
        {partyBalances.map((r) => (
          <div
            key={r.party.id}
            className="rounded-lg p-4"
            style={{
              background: 'var(--color-card)',
              border: '1px solid var(--color-border)',
            }}
          >
            <h3
              className="font-semibold mb-2"
              style={{
                fontFamily: 'var(--font-display)',
                color: 'var(--color-ink)',
              }}
            >
              {r.party.name}
            </h3>
            <div className="flex justify-between text-sm mb-1">
              <span style={{ color: 'var(--color-ink-soft)' }}>Receivable</span>
              <span className="tabular-nums font-medium">{fmtMoney(r.receivable)}</span>
            </div>
            <div className="flex justify-between text-sm mb-1">
              <span style={{ color: 'var(--color-ink-soft)' }}>Received</span>
              <span className="tabular-nums font-medium">{fmtMoney(r.received)}</span>
            </div>
            <div
              className="flex justify-between text-sm pt-2 mt-1"
              style={{ borderTop: '1px solid var(--color-border-soft)' }}
            >
              <span style={{ color: 'var(--color-ink-soft)' }}>Balance due</span>
              <span
                className="tabular-nums font-semibold"
                style={{
                  color:
                    r.balance > 0
                      ? 'var(--color-due)'
                      : r.balance < 0
                      ? 'var(--color-positive)'
                      : 'var(--color-ink)',
                }}
              >
                {fmtMoney(r.balance)}
              </span>
            </div>
          </div>
        ))}
      </div>

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
          <Field label="Party *">
            <Select
              required
              value={form.partyId}
              onChange={(e) => setForm({ ...form, partyId: e.target.value })}
            >
              {parties.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Date">
            <TextInput
              type="date"
              required
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
            />
          </Field>

          <Field label="Amount Received (₹) *">
            <TextInput
              required
              type="number"
              step="0.01"
              placeholder="e.g. 5000"
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
            />
          </Field>

          <Field label="Note">
            <TextInput
              placeholder="e.g. GPay / Cash / Cheque"
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

      {/* ── Table View ───────────────────────────────────────────── */}
      <Table
        columns={['Date', 'Party', 'Amount', 'Note', '']}
        rows={filteredPayments}
        emptyText={`No payments logged for ${formattedMonth}.`}
        renderRow={(p) => (
          <tr
            key={p.id}
            style={{ borderTop: '1px solid var(--color-border-soft)' }}
          >
            <td className="px-3 py-2 whitespace-nowrap">{fmtDate(p.date)}</td>
            <td className="px-3 py-2 font-medium whitespace-nowrap">
              {p.party?.name ?? '—'}
            </td>
            <td
              className="px-3 py-2 tabular-nums font-semibold"
              style={{ color: 'var(--color-positive)' }}
            >
              {fmtMoney(p.amount)}
            </td>
            <td className="px-3 py-2" style={{ color: 'var(--color-ink-soft)' }}>
              {p.note || '—'}
            </td>
            <td className="px-3 py-2 text-right whitespace-nowrap">
              <button
                type="button"
                onClick={() => edit(p)}
                className="p-1 cursor-pointer"
                style={{ color: 'var(--color-ink-soft)' }}
                title="Edit payment"
                aria-label="Edit payment"
              >
                <Pencil size={14} />
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
                  className="p-1 cursor-pointer"
                  style={{ color: 'var(--color-due)' }}
                  title="Delete payment"
                  aria-label="Delete payment"
                >
                  <Trash2 size={14} />
                </button>
              )}
            </td>
          </tr>
        )}
      />
    </div>
  )
}
