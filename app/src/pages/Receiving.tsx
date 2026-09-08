import { useState, useEffect, useCallback } from 'react'
import { Plus, Pencil, Trash2, Check } from 'lucide-react'
import {
  fetchParties,
  fetchReceipts,
  insertReceipt,
  updateReceipt,
  deleteReceipt,
  type ReceiptPayload,
} from '../lib/queries'
import type { Party, ReceiptWithParty } from '../types'
import { COLOR_TYPES, fmtDate, fmtKg, todayStr } from '../types'
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

interface ReceiptFormState {
  id: string | null
  partyId: string
  date: string
  color: string
  grossWeight: string
  tareWeight: string
  challanNo: string
  rolaCount: string
}

export default function Receiving() {
  const [receipts, setReceipts] = useState<ReceiptWithParty[]>([])
  const [parties, setParties] = useState<Party[]>([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState<ReceiptFormState | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    setLoading(true)
    setErrorMsg(null)
    try {
      const [receiptsData, partiesData] = await Promise.all([
        fetchReceipts(),
        fetchParties(),
      ])
      setReceipts(receiptsData)
      setParties(partiesData)
    } catch (err) {
      console.error('Error loading receiving data:', err)
      setErrorMsg('Could not load receiving entries.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadData()
  }, [loadData])

  const blankForm = (initialPartyId?: string): ReceiptFormState => ({
    id: null,
    partyId: initialPartyId || parties[0]?.id || '',
    date: todayStr(),
    color: 'Gold',
    grossWeight: '',
    tareWeight: '0',
    challanNo: '',
    rolaCount: '0',
  })

  const startAdd = () => {
    setForm(blankForm())
    setErrorMsg(null)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const edit = (r: ReceiptWithParty) => {
    setForm({
      id: r.id,
      partyId: r.party_id || '',
      date: r.date,
      color: r.color || 'Gold',
      grossWeight: String(r.gross_weight),
      tareWeight: String(r.tare_weight),
      challanNo: r.challan_no || '',
      rolaCount: String(r.rola_count),
    })
    setErrorMsg(null)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form || !form.partyId || !form.grossWeight) return

    const gross = parseFloat(form.grossWeight)
    const tare = parseFloat(form.tareWeight) || 0
    if (isNaN(gross) || gross <= 0) {
      setErrorMsg('Please enter a valid gross weight')
      return
    }

    setSaving(true)
    setErrorMsg(null)

    const payload: ReceiptPayload = {
      party_id: form.partyId,
      date: form.date,
      color: form.color || null,
      gross_weight: gross,
      tare_weight: tare,
      challan_no: form.challanNo.trim() || null,
      rola_count: parseInt(form.rolaCount) || 0,
    }

    try {
      if (form.id) {
        await updateReceipt(form.id, payload)
      } else {
        await insertReceipt(payload)
      }
      setForm(null)
      await loadData()
    } catch (err: unknown) {
      console.error('Save receipt error:', err)
      const msg = err instanceof Error ? err.message : String(err)
      setErrorMsg(`Could not save receipt — ${msg}`)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await deleteReceipt(id)
      setDeleting(null)
      await loadData()
    } catch (err: unknown) {
      console.error('Delete receipt error:', err)
      const msg = err instanceof Error ? err.message : String(err)
      setErrorMsg(`Delete failed — ${msg}`)
    }
  }

  const netPreview = form
    ? Math.max(0, (Number(form.grossWeight) || 0) - (Number(form.tareWeight) || 0))
    : 0

  return (
    <div>
      <SectionHeader
        title="Raw Material Receiving"
        subtitle="Kasab received from parties — weight and challan tracking"
        action={
          !form &&
          parties.length > 0 && (
            <Button onClick={startAdd}>
              <Plus size={16} /> New Receipt
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
        <EmptyState text="Add a party first before recording receiving entries." />
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

          <Field label="Kasab Color">
            <Select
              value={form.color}
              onChange={(e) => setForm({ ...form, color: e.target.value })}
            >
              {COLOR_TYPES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Gross Weight (kg) *">
            <TextInput
              required
              type="number"
              step="0.001"
              placeholder="e.g. 12.500"
              value={form.grossWeight}
              onChange={(e) => setForm({ ...form, grossWeight: e.target.value })}
            />
          </Field>

          <Field label="Tare / Rola Weight (kg)">
            <TextInput
              type="number"
              step="0.001"
              placeholder="e.g. 0.750"
              value={form.tareWeight}
              onChange={(e) => setForm({ ...form, tareWeight: e.target.value })}
            />
          </Field>

          <Field label="Net Weight">
            <div
              className="px-3 py-2 rounded-md text-sm font-semibold tabular-nums flex items-center min-h-[38px]"
              style={{ background: 'var(--color-border-soft)' }}
            >
              {fmtKg(netPreview)}
            </div>
          </Field>

          <Field label="Challan Number">
            <TextInput
              placeholder="e.g. CH-1042"
              value={form.challanNo}
              onChange={(e) => setForm({ ...form, challanNo: e.target.value })}
            />
          </Field>

          <Field label="Rola Count">
            <TextInput
              type="number"
              placeholder="e.g. 12"
              value={form.rolaCount}
              onChange={(e) => setForm({ ...form, rolaCount: e.target.value })}
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
        columns={['Date', 'Party', 'Color', 'Gross', 'Tare', 'Net Wt', 'Challan #', 'Rola', '']}
        rows={receipts}
        emptyText="No receiving entries yet."
        renderRow={(r) => (
          <tr
            key={r.id}
            style={{ borderTop: '1px solid var(--color-border-soft)' }}
          >
            <td className="px-3 py-2 whitespace-nowrap">{fmtDate(r.date)}</td>
            <td className="px-3 py-2 font-medium whitespace-nowrap">
              {r.party?.name ?? '—'}
            </td>
            <td className="px-3 py-2">{r.color || '—'}</td>
            <td className="px-3 py-2 tabular-nums">{fmtKg(r.gross_weight)}</td>
            <td className="px-3 py-2 tabular-nums">{fmtKg(r.tare_weight)}</td>
            <td className="px-3 py-2 tabular-nums font-semibold">{fmtKg(r.net_weight)}</td>
            <td className="px-3 py-2">{r.challan_no || '—'}</td>
            <td className="px-3 py-2 tabular-nums">{r.rola_count || 0}</td>
            <td className="px-3 py-2 text-right whitespace-nowrap">
              <button
                type="button"
                onClick={() => edit(r)}
                className="p-1 cursor-pointer"
                style={{ color: 'var(--color-ink-soft)' }}
                title="Edit receipt"
                aria-label="Edit receipt"
              >
                <Pencil size={14} />
              </button>
              {deleting === r.id ? (
                <ConfirmDelete
                  onConfirm={() => handleDelete(r.id)}
                  onCancel={() => setDeleting(null)}
                />
              ) : (
                <button
                  type="button"
                  onClick={() => setDeleting(r.id)}
                  className="p-1 cursor-pointer"
                  style={{ color: 'var(--color-due)' }}
                  title="Delete receipt"
                  aria-label="Delete receipt"
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
