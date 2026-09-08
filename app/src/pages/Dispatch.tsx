import { useState, useEffect, useCallback } from 'react'
import { Plus, Pencil, Trash2, Check } from 'lucide-react'
import {
  fetchParties,
  fetchDispatches,
  insertDispatch,
  updateDispatch,
  deleteDispatch,
  type DispatchPayload,
} from '../lib/queries'
import type { Party, DispatchWithParty } from '../types'
import { BUNGARI_WEIGHT_KG, fmtDate, fmtKg, fmtMoney, todayStr } from '../types'
import {
  SectionHeader,
  Button,
  Field,
  TextInput,
  Select,
  Table,
  EmptyState,
  ConfirmDelete,
} from '../components/ui/UIComponents'

interface DispatchFormState {
  id: string | null
  partyId: string
  date: string
  bungariCount: string
  boreGrossWeight: string
  ratePerKg: string
  amount: string
}

export default function Dispatch() {
  const [dispatches, setDispatches] = useState<DispatchWithParty[]>([])
  const [parties, setParties] = useState<Party[]>([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState<DispatchFormState | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    setLoading(true)
    setErrorMsg(null)
    try {
      const [dispatchesData, partiesData] = await Promise.all([
        fetchDispatches(),
        fetchParties(),
      ])
      setDispatches(dispatchesData)
      setParties(partiesData)
    } catch (err) {
      console.error('Error loading dispatches:', err)
      setErrorMsg('Could not load dispatches.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadData()
  }, [loadData])

  const blankForm = (initialPartyId?: string): DispatchFormState => ({
    id: null,
    partyId: initialPartyId || parties[0]?.id || '',
    date: todayStr(),
    bungariCount: '0',
    boreGrossWeight: '',
    ratePerKg: '',
    amount: '',
  })

  const startAdd = () => {
    setForm(blankForm())
    setErrorMsg(null)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const edit = (d: DispatchWithParty) => {
    setForm({
      id: d.id,
      partyId: d.party_id || '',
      date: d.date,
      bungariCount: String(d.bungari_count),
      boreGrossWeight: String(d.bore_gross_weight),
      ratePerKg: d.rate_per_kg !== null ? String(d.rate_per_kg) : '',
      amount: d.amount !== null ? String(d.amount) : '',
    })
    setErrorMsg(null)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const netValWeight = (f: DispatchFormState): number => {
    const gross = parseFloat(f.boreGrossWeight) || 0
    const count = parseFloat(f.bungariCount) || 0
    const bungariTare = count * BUNGARI_WEIGHT_KG
    return Math.max(0, gross - bungariTare)
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form || !form.partyId || !form.boreGrossWeight) return

    const gross = parseFloat(form.boreGrossWeight)
    if (isNaN(gross) || gross <= 0) {
      setErrorMsg('Please enter a valid bore gross weight')
      return
    }

    setSaving(true)
    setErrorMsg(null)

    const count = parseFloat(form.bungariCount) || 0
    const nv = Math.max(0, gross - count * BUNGARI_WEIGHT_KG)
    const rate = parseFloat(form.ratePerKg)
    const manualAmt = parseFloat(form.amount)

    const computedAmt =
      !isNaN(rate) && rate > 0
        ? Math.round(nv * rate)
        : !isNaN(manualAmt) && manualAmt > 0
        ? manualAmt
        : null

    const payload: DispatchPayload = {
      party_id: form.partyId,
      date: form.date,
      bungari_count: count,
      bore_gross_weight: gross,
      net_val_weight: nv,
      rate_per_kg: !isNaN(rate) && rate > 0 ? rate : null,
      amount: computedAmt,
    }

    try {
      if (form.id) {
        await updateDispatch(form.id, payload)
      } else {
        await insertDispatch(payload)
      }
      setForm(null)
      await loadData()
    } catch (err: unknown) {
      console.error('Save dispatch error:', err)
      const msg = err instanceof Error ? err.message : String(err)
      setErrorMsg(`Could not save dispatch — ${msg}`)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await deleteDispatch(id)
      setDeleting(null)
      await loadData()
    } catch (err: unknown) {
      console.error('Delete dispatch error:', err)
      const msg = err instanceof Error ? err.message : String(err)
      setErrorMsg(`Delete failed — ${msg}`)
    }
  }

  const netPreview = form ? netValWeight(form) : 0

  return (
    <div>
      <SectionHeader
        title="Dispatch"
        subtitle="Finished Val delivered — bore weight, net weight, billing"
        action={
          !form &&
          parties.length > 0 && (
            <Button onClick={startAdd}>
              <Plus size={16} /> New Dispatch
            </Button>
          )
        }
      />

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

      {parties.length === 0 && !loading && (
        <EmptyState text="Add a party first before recording dispatch entries." />
      )}

      {/* ── Add / Edit Form ──────────────────────────────────────── */}
      {form && (
        <form
          onSubmit={submit}
          className="mb-5 p-4 rounded-lg grid grid-cols-2 sm:grid-cols-3 gap-3"
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

          <Field label="Bungari Count (70g each)">
            <TextInput
              type="number"
              placeholder="e.g. 10"
              value={form.bungariCount}
              onChange={(e) => setForm({ ...form, bungariCount: e.target.value })}
            />
          </Field>

          <Field label="Bore Gross Weight (kg) *">
            <TextInput
              required
              type="number"
              step="0.001"
              placeholder="e.g. 15.000"
              value={form.boreGrossWeight}
              onChange={(e) => setForm({ ...form, boreGrossWeight: e.target.value })}
            />
          </Field>

          <Field label="Net Val Weight">
            <div
              className="px-3 py-2 rounded-md text-sm font-semibold tabular-nums flex items-center min-h-[38px]"
              style={{ background: 'var(--color-border-soft)' }}
            >
              {fmtKg(netPreview)}
            </div>
          </Field>

          <Field label="Rate ₹/kg (optional)">
            <TextInput
              type="number"
              step="0.01"
              placeholder="e.g. 200.00"
              value={form.ratePerKg}
              onChange={(e) => setForm({ ...form, ratePerKg: e.target.value })}
            />
          </Field>

          <div className="flex gap-2 items-end col-span-2 sm:col-span-1 pt-1">
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
        columns={['Date', 'Party', 'Bungari', 'Bore Gross', 'Net Val', 'Amount', '']}
        rows={dispatches}
        emptyText="No dispatch entries yet."
        renderRow={(d) => (
          <tr
            key={d.id}
            style={{ borderTop: '1px solid var(--color-border-soft)' }}
          >
            <td className="px-3 py-2 whitespace-nowrap">{fmtDate(d.date)}</td>
            <td className="px-3 py-2 font-medium whitespace-nowrap">
              {d.party?.name ?? '—'}
            </td>
            <td className="px-3 py-2 tabular-nums">{d.bungari_count || 0}</td>
            <td className="px-3 py-2 tabular-nums">{fmtKg(d.bore_gross_weight)}</td>
            <td className="px-3 py-2 tabular-nums font-semibold">{fmtKg(d.net_val_weight)}</td>
            <td className="px-3 py-2 tabular-nums font-semibold">
              {d.amount ? fmtMoney(d.amount) : '—'}
            </td>
            <td className="px-3 py-2 text-right whitespace-nowrap">
              <button
                type="button"
                onClick={() => edit(d)}
                className="p-1 cursor-pointer"
                style={{ color: 'var(--color-ink-soft)' }}
                title="Edit dispatch"
                aria-label="Edit dispatch"
              >
                <Pencil size={14} />
              </button>
              {deleting === d.id ? (
                <ConfirmDelete
                  onConfirm={() => handleDelete(d.id)}
                  onCancel={() => setDeleting(null)}
                />
              ) : (
                <button
                  type="button"
                  onClick={() => setDeleting(d.id)}
                  className="p-1 cursor-pointer"
                  style={{ color: 'var(--color-due)' }}
                  title="Delete dispatch"
                  aria-label="Delete dispatch"
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
