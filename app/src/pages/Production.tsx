import { useState, useEffect, useCallback } from 'react'
import { Plus, Pencil, Trash2, Check } from 'lucide-react'
import {
  fetchReceipts,
  fetchProductionOrders,
  insertProductionOrder,
  updateProductionOrder,
  deleteProductionOrder,
  type ProductionOrderPayload,
} from '../lib/queries'
import type { ReceiptWithParty, ProductionWithReceipt } from '../types'
import { CORD_TYPES, fmtDate, fmtKg } from '../types'
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

interface ProductionFormState {
  id: string | null
  receiptId: string
  cordCount: string
  twistType: string
  waste: string
  status: string
}

export default function Production() {
  const [production, setProduction] = useState<ProductionWithReceipt[]>([])
  const [receipts, setReceipts] = useState<ReceiptWithParty[]>([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState<ProductionFormState | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    setLoading(true)
    setErrorMsg(null)
    try {
      const [prodData, receiptsData] = await Promise.all([
        fetchProductionOrders(),
        fetchReceipts(),
      ])
      setProduction(prodData)
      setReceipts(receiptsData)
    } catch (err) {
      console.error('Error loading production orders:', err)
      setErrorMsg('Could not load production orders.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadData()
  }, [loadData])

  const receiptLabel = (r: ReceiptWithParty) => {
    const party = r.party?.name || '—'
    const date = fmtDate(r.date)
    const net = fmtKg(r.net_weight)
    return `${date} · ${party} · ${net}`
  }

  const blankForm = (initialReceiptId?: string): ProductionFormState => ({
    id: null,
    receiptId: initialReceiptId || receipts[0]?.id || '',
    cordCount: '8',
    twistType: 'S',
    waste: '',
    status: 'Pending',
  })

  const startAdd = () => {
    setForm(blankForm())
    setErrorMsg(null)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const edit = (p: ProductionWithReceipt) => {
    setForm({
      id: p.id,
      receiptId: p.receipt_id || '',
      cordCount: p.cord_count !== null ? String(p.cord_count) : '8',
      twistType: p.twist_type || 'S',
      waste: p.waste ? String(p.waste) : '',
      status: p.status,
    })
    setErrorMsg(null)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form || !form.receiptId) return
    setSaving(true)
    setErrorMsg(null)

    const payload: ProductionOrderPayload = {
      receipt_id: form.receiptId,
      cord_count: form.cordCount ? parseInt(form.cordCount) : null,
      twist_type: form.twistType || null,
      waste: parseFloat(form.waste) || 0,
      status: form.status,
    }

    try {
      if (form.id) {
        await updateProductionOrder(form.id, payload)
      } else {
        await insertProductionOrder(payload)
      }
      setForm(null)
      await loadData()
    } catch (err: unknown) {
      console.error('Save production order error:', err)
      const msg = err instanceof Error ? err.message : String(err)
      setErrorMsg(`Could not save order — ${msg}`)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await deleteProductionOrder(id)
      setDeleting(null)
      await loadData()
    } catch (err: unknown) {
      console.error('Delete order error:', err)
      const msg = err instanceof Error ? err.message : String(err)
      setErrorMsg(`Delete failed — ${msg}`)
    }
  }

  const statusColor = (s: string) =>
    s === 'Done'
      ? 'var(--color-positive)'
      : s === 'In Progress'
      ? 'var(--color-brass)'
      : 'var(--color-ink-soft)'

  const statusBg = (s: string) =>
    s === 'Done'
      ? 'var(--color-positive-bg)'
      : s === 'In Progress'
      ? 'color-mix(in srgb, var(--color-brass) 12%, transparent)'
      : 'color-mix(in srgb, var(--color-ink-soft) 12%, transparent)'

  return (
    <div>
      <SectionHeader
        title="Production"
        subtitle="Doubling — cord count, twist type, waste, status"
        action={
          !form &&
          receipts.length > 0 && (
            <Button onClick={startAdd}>
              <Plus size={16} /> New Order
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

      {receipts.length === 0 && !loading && (
        <EmptyState text="Record a raw material receipt first, then start production against it." />
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
          <Field label="From Receipt *" className="sm:col-span-2">
            <Select
              required
              value={form.receiptId}
              onChange={(e) => setForm({ ...form, receiptId: e.target.value })}
            >
              {receipts.map((r) => (
                <option key={r.id} value={r.id}>
                  {receiptLabel(r)}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Cord Count">
            <Select
              value={form.cordCount}
              onChange={(e) => setForm({ ...form, cordCount: e.target.value })}
            >
              {CORD_TYPES.map((c) => (
                <option key={c} value={String(c)}>
                  {c} Cord
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Twist Type">
            <Select
              value={form.twistType}
              onChange={(e) => setForm({ ...form, twistType: e.target.value })}
            >
              <option value="S">S Type (left)</option>
              <option value="Z">Z Type (right)</option>
            </Select>
          </Field>

          <Field label="Waste (kg)">
            <TextInput
              type="number"
              step="0.001"
              placeholder="e.g. 0.250"
              value={form.waste}
              onChange={(e) => setForm({ ...form, waste: e.target.value })}
            />
          </Field>

          <Field label="Status">
            <Select
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value })}
            >
              <option value="Pending">Pending</option>
              <option value="In Progress">In Progress</option>
              <option value="Done">Done</option>
            </Select>
          </Field>

          <div className="flex gap-2 items-end pt-1">
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
        columns={['Receipt', 'Party', 'Cord', 'Twist', 'Waste', 'Status', '']}
        rows={production}
        emptyText="No production orders yet."
        renderRow={(p) => {
          const rec = p.receipt
          const sColor = statusColor(p.status)
          const sBg = statusBg(p.status)

          return (
            <tr
              key={p.id}
              style={{ borderTop: '1px solid var(--color-border-soft)' }}
            >
              <td className="px-3 py-2 whitespace-nowrap">
                {rec ? fmtDate(rec.date) : '—'}
              </td>
              <td className="px-3 py-2 font-medium whitespace-nowrap">
                {rec?.party?.name ?? '—'}
              </td>
              <td className="px-3 py-2">
                {p.cord_count ? `${p.cord_count} Cord` : '—'}
              </td>
              <td className="px-3 py-2">{p.twist_type || '—'}</td>
              <td className="px-3 py-2 tabular-nums">
                {p.waste ? fmtKg(p.waste) : '—'}
              </td>
              <td className="px-3 py-2 whitespace-nowrap">
                <span
                  className="px-2 py-0.5 rounded text-xs font-semibold inline-block"
                  style={{ color: sColor, background: sBg }}
                >
                  {p.status}
                </span>
              </td>
              <td className="px-3 py-2 text-right whitespace-nowrap">
                <button
                  type="button"
                  onClick={() => edit(p)}
                  className="p-1 cursor-pointer"
                  style={{ color: 'var(--color-ink-soft)' }}
                  title="Edit order"
                  aria-label="Edit order"
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
                    title="Delete order"
                    aria-label="Delete order"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </td>
            </tr>
          )
        }}
      />
    </div>
  )
}
