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
import { COLOR_TYPES, fmtDate, fmtKg, kgToGrams, todayStr } from '../types'
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
  grossWeightGrams: string
  tareWeightGrams: string
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
    grossWeightGrams: '',
    tareWeightGrams: '0',
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
      grossWeightGrams: kgToGrams(r.gross_weight),
      tareWeightGrams: kgToGrams(r.tare_weight),
      challanNo: r.challan_no || '',
      rolaCount: String(r.rola_count ?? 0),
    })
    setErrorMsg(null)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form) return

    if (!form.partyId) {
      setErrorMsg('Please select a party')
      return
    }

    if (!form.grossWeightGrams.trim()) {
      setErrorMsg('Please enter gross weight in grams (e.g. 23535 for 23.535 kg)')
      return
    }

    const grossG = parseInt(form.grossWeightGrams, 10)
    if (isNaN(grossG) || grossG <= 0) {
      setErrorMsg('Gross weight must be a valid positive number in grams (e.g. 23535)')
      return
    }

    const tareG = form.tareWeightGrams.trim() ? parseInt(form.tareWeightGrams, 10) : 0
    if (isNaN(tareG) || tareG < 0) {
      setErrorMsg('Tare weight must be 0 or a positive number in grams')
      return
    }

    if (tareG >= grossG) {
      setErrorMsg('Tare weight cannot be greater than or equal to gross weight')
      return
    }

    setSaving(true)
    setErrorMsg(null)

    // Convert whole-number grams to standard kg (e.g. 23535g -> 23.535 kg)
    const grossKg = grossG / 1000
    const tareKg = tareG / 1000

    const payload: ReceiptPayload = {
      party_id: form.partyId,
      date: form.date,
      color: form.color || null,
      gross_weight: grossKg,
      tare_weight: tareKg,
      challan_no: form.challanNo.trim() || null,
      rola_count: parseInt(form.rolaCount, 10) || 0,
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

  // Live calculation of kg previews
  const grossGramsNum = form && form.grossWeightGrams.trim() ? parseInt(form.grossWeightGrams, 10) : null
  const tareGramsNum = form && form.tareWeightGrams.trim() ? parseInt(form.tareWeightGrams, 10) : 0
  
  const grossKgPreview = grossGramsNum !== null && !isNaN(grossGramsNum) && grossGramsNum >= 0 ? grossGramsNum / 1000 : null
  const tareKgPreview = tareGramsNum !== null && !isNaN(tareGramsNum) && tareGramsNum >= 0 ? tareGramsNum / 1000 : 0
  const netKgPreview = grossKgPreview !== null ? Math.max(0, grossKgPreview - tareKgPreview) : null

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
          className="mb-5 p-4 rounded-lg grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5"
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

          {/* Gross Weight input in grams */}
          <Field label="Gross Weight (grams) *">
            <TextInput
              required
              type="number"
              inputMode="numeric"
              step="1"
              min="0"
              placeholder="e.g. 23535"
              value={form.grossWeightGrams}
              onChange={(e) => {
                const val = e.target.value.replace(/[^0-9]/g, '')
                setForm({ ...form, grossWeightGrams: val })
              }}
            />
            <div className="flex items-center justify-between text-xs mt-0.5">
              <span style={{ color: 'var(--color-ink-soft)' }}>Enter weight in grams</span>
              {grossKgPreview !== null && (
                <span className="font-semibold tabular-nums" style={{ color: 'var(--color-brass)' }}>
                  = {fmtKg(grossKgPreview)}
                </span>
              )}
            </div>
          </Field>

          {/* Tare / Rola Weight input in grams */}
          <Field label="Tare / Rola Weight (grams)">
            <TextInput
              type="number"
              inputMode="numeric"
              step="1"
              min="0"
              placeholder="e.g. 750"
              value={form.tareWeightGrams}
              onChange={(e) => {
                const val = e.target.value.replace(/[^0-9]/g, '')
                setForm({ ...form, tareWeightGrams: val })
              }}
            />
            <div className="flex items-center justify-between text-xs mt-0.5">
              <span style={{ color: 'var(--color-ink-soft)' }}>Enter weight in grams</span>
              {tareKgPreview > 0 && (
                <span className="font-semibold tabular-nums" style={{ color: 'var(--color-ink-soft)' }}>
                  = {fmtKg(tareKgPreview)}
                </span>
              )}
            </div>
          </Field>

          {/* Net Weight Display (Auto-calculated in kg) */}
          <Field label="Net Weight (calculated)">
            <div
              className="px-3 py-2 rounded-md text-sm font-semibold tabular-nums flex items-center justify-between min-h-[38px]"
              style={{
                background: netKgPreview !== null ? 'var(--color-border-soft)' : 'var(--color-paper)',
                border: '1px solid var(--color-border)',
                color: netKgPreview !== null ? 'var(--color-ink)' : 'var(--color-ink-soft)',
              }}
            >
              <span>{netKgPreview !== null ? fmtKg(netKgPreview) : '—'}</span>
              {netKgPreview !== null && grossGramsNum !== null && (
                <span className="text-xs font-normal" style={{ color: 'var(--color-ink-soft)' }}>
                  ({Math.max(0, grossGramsNum - tareGramsNum)} g)
                </span>
              )}
            </div>
            <span className="text-[11px] mt-0.5" style={{ color: 'var(--color-ink-soft)' }}>
              = Gross − Tare
            </span>
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
              inputMode="numeric"
              step="1"
              min="0"
              placeholder="e.g. 12"
              value={form.rolaCount}
              onChange={(e) => setForm({ ...form, rolaCount: e.target.value })}
            />
          </Field>

          <div className="flex gap-2 items-end pt-1 sm:col-span-2 lg:col-span-1">
            <Button type="submit" disabled={saving} className="flex-1 sm:flex-none">
              <Check size={16} /> {saving ? 'Saving…' : 'Save Receipt'}
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
        columns={['Date', 'Party', 'Color', 'Gross (kg)', 'Tare (kg)', 'Net Wt (kg)', 'Challan #', 'Rola', '']}
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
            <td className="px-3 py-2 tabular-nums font-semibold" style={{ color: 'var(--color-brass)' }}>
              {fmtKg(r.net_weight)}
            </td>
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
