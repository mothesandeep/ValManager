import { useState, useEffect, useCallback } from 'react'
import { Plus, Pencil, Trash2, Check } from 'lucide-react'
import {
  fetchParties,
  fetchReceipts,
  fetchRolaReturns,
  insertRolaReturn,
  updateRolaReturn,
  deleteRolaReturn,
  type RolaReturnPayload,
} from '../lib/queries'
import type { Party, ReceiptWithParty, RolaReturnWithParty } from '../types'
import { fmtDate, todayStr } from '../types'
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

interface RolaFormState {
  id: string | null
  partyId: string
  date: string
  rolaCount: string
}

export default function Rola() {
  const [parties, setParties] = useState<Party[]>([])
  const [receipts, setReceipts] = useState<ReceiptWithParty[]>([])
  const [rolaReturns, setRolaReturns] = useState<RolaReturnWithParty[]>([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState<RolaFormState | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    setLoading(true)
    setErrorMsg(null)
    try {
      const [partiesData, receiptsData, rolaData] = await Promise.all([
        fetchParties(),
        fetchReceipts(),
        fetchRolaReturns(),
      ])
      setParties(partiesData)
      setReceipts(receiptsData)
      setRolaReturns(rolaData)
    } catch (err) {
      console.error('Error loading rola data:', err)
      setErrorMsg('Could not load Rola returns.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadData()
  }, [loadData])

  const balances = parties
    .map((p) => {
      const received = receipts
        .filter((r) => r.party_id === p.id)
        .reduce((sum, r) => sum + (Number(r.rola_count) || 0), 0)
      const returned = rolaReturns
        .filter((r) => r.party_id === p.id)
        .reduce((sum, r) => sum + (Number(r.rola_count) || 0), 0)
      return {
        party: p,
        received,
        returned,
        pending: received - returned,
      }
    })
    .filter((b) => b.received > 0 || b.returned > 0)

  const blankForm = (initialPartyId?: string): RolaFormState => ({
    id: null,
    partyId: initialPartyId || parties[0]?.id || '',
    date: todayStr(),
    rolaCount: '',
  })

  const startAdd = () => {
    setForm(blankForm())
    setErrorMsg(null)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const edit = (r: RolaReturnWithParty) => {
    setForm({
      id: r.id,
      partyId: r.party_id || '',
      date: r.date,
      rolaCount: String(r.rola_count),
    })
    setErrorMsg(null)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form || !form.partyId || !form.rolaCount) return

    const count = parseInt(form.rolaCount)
    if (isNaN(count) || count <= 0) {
      setErrorMsg('Enter a valid rola count')
      return
    }

    setSaving(true)
    setErrorMsg(null)

    const payload: RolaReturnPayload = {
      party_id: form.partyId,
      date: form.date,
      rola_count: count,
    }

    try {
      if (form.id) {
        await updateRolaReturn(form.id, payload)
      } else {
        await insertRolaReturn(payload)
      }
      setForm(null)
      await loadData()
    } catch (err: unknown) {
      console.error('Save rola return error:', err)
      const msg = err instanceof Error ? err.message : String(err)
      setErrorMsg(`Could not save — ${msg}`)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await deleteRolaReturn(id)
      setDeleting(null)
      await loadData()
    } catch (err: unknown) {
      console.error('Delete rola return error:', err)
      const msg = err instanceof Error ? err.message : String(err)
      setErrorMsg(`Delete failed — ${msg}`)
    }
  }

  return (
    <div>
      <SectionHeader
        title="Rola / TFO Bobbin Tracking"
        subtitle="Rola belongs to the party — track received vs returned"
        action={
          !form &&
          parties.length > 0 && (
            <Button onClick={startAdd}>
              <Plus size={16} /> Log Return
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

      {/* ── Summary Cards Grid ───────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-5">
        {balances.length === 0 && !loading && (
          <div className="col-span-full">
            <EmptyState text="No rola movement recorded yet." />
          </div>
        )}
        {balances.map((b) => (
          <div
            key={b.party.id}
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
              {b.party.name}
            </h3>
            <div className="flex justify-between text-sm mb-1">
              <span style={{ color: 'var(--color-ink-soft)' }}>Received</span>
              <span className="tabular-nums font-medium">{b.received}</span>
            </div>
            <div className="flex justify-between text-sm mb-1">
              <span style={{ color: 'var(--color-ink-soft)' }}>Returned</span>
              <span className="tabular-nums font-medium">{b.returned}</span>
            </div>
            <div
              className="flex justify-between text-sm pt-2 mt-1"
              style={{ borderTop: '1px solid var(--color-border-soft)' }}
            >
              <span style={{ color: 'var(--color-ink-soft)' }}>Pending with us</span>
              <span
                className="tabular-nums font-semibold"
                style={{
                  color: b.pending > 0 ? 'var(--color-due)' : 'var(--color-positive)',
                }}
              >
                {b.pending}
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

          <Field label="Rola Count Returned *">
            <TextInput
              required
              type="number"
              placeholder="e.g. 10"
              value={form.rolaCount}
              onChange={(e) => setForm({ ...form, rolaCount: e.target.value })}
            />
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
        columns={['Date', 'Party', 'Rola Returned', '']}
        rows={rolaReturns}
        emptyText="No return entries logged yet."
        renderRow={(r) => (
          <tr
            key={r.id}
            style={{ borderTop: '1px solid var(--color-border-soft)' }}
          >
            <td className="px-3 py-2 whitespace-nowrap">{fmtDate(r.date)}</td>
            <td className="px-3 py-2 font-medium whitespace-nowrap">
              {r.party?.name ?? '—'}
            </td>
            <td className="px-3 py-2 tabular-nums font-semibold">
              {r.rola_count}
            </td>
            <td className="px-3 py-2 text-right whitespace-nowrap">
              <button
                type="button"
                onClick={() => edit(r)}
                className="p-1 cursor-pointer"
                style={{ color: 'var(--color-ink-soft)' }}
                title="Edit return"
                aria-label="Edit return"
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
                  title="Delete return"
                  aria-label="Delete return"
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
