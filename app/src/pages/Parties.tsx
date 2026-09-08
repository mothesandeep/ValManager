import { useState, useEffect, useCallback } from 'react'
import { Plus, Pencil, Trash2, Phone, MapPin, Check } from 'lucide-react'
import {
  fetchParties,
  fetchReceipts,
  fetchDispatches,
  fetchPayments,
  fetchRolaReturns,
  insertParty,
  updateParty,
  deleteParty,
  computePartyStats,
} from '../lib/queries'
import type { Party, PartyStats } from '../types'
import { fmtMoney } from '../types'
import {
  SectionHeader,
  Button,
  Field,
  TextInput,
  EmptyState,
  ConfirmDelete,
} from '../components/ui/UIComponents'

interface PartyFormState {
  id: string | null
  name: string
  phone: string
  address: string
  notes: string
}

const EMPTY_FORM: PartyFormState = {
  id: null,
  name: '',
  phone: '',
  address: '',
  notes: '',
}

export default function Parties() {
  const [parties, setParties] = useState<Party[]>([])
  const [stats, setStats] = useState<Record<string, PartyStats>>({})
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState<PartyFormState | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    setLoading(true)
    setErrorMsg(null)
    try {
      const [partiesData, receiptsData, rolaData, dispatchesData, paymentsData] =
        await Promise.all([
          fetchParties(),
          fetchReceipts(),
          fetchRolaReturns(),
          fetchDispatches(),
          fetchPayments(),
        ])

      setParties(partiesData)
      const computed = computePartyStats(
        partiesData,
        receiptsData,
        rolaData,
        dispatchesData,
        paymentsData
      )
      setStats(computed)
    } catch (err) {
      console.error('Error loading parties:', err)
      setErrorMsg('Could not load parties. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadData()
  }, [loadData])

  const startAdd = () => {
    setForm({ ...EMPTY_FORM })
    setErrorMsg(null)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const edit = (p: Party) => {
    setForm({
      id: p.id,
      name: p.name,
      phone: p.phone || '',
      address: p.address || '',
      notes: p.notes || '',
    })
    setErrorMsg(null)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form || !form.name.trim()) return
    setSaving(true)
    setErrorMsg(null)

    try {
      if (form.id) {
        await updateParty(form.id, {
          name: form.name.trim(),
          phone: form.phone.trim() || null,
          address: form.address.trim() || null,
          notes: form.notes.trim() || null,
        })
      } else {
        await insertParty({
          name: form.name.trim(),
          phone: form.phone.trim() || null,
          address: form.address.trim() || null,
          notes: form.notes.trim() || null,
        })
      }
      setForm(null)
      await loadData()
    } catch (err: unknown) {
      console.error('Save party error:', err)
      const msg = err instanceof Error ? err.message : String(err)
      setErrorMsg(`Could not save party — ${msg}`)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await deleteParty(id)
      setDeleting(null)
      await loadData()
    } catch (err: unknown) {
      console.error('Delete party error:', err)
      const msg = err instanceof Error ? err.message : String(err)
      setErrorMsg(`Delete failed — ${msg}`)
    }
  }

  return (
    <div>
      <SectionHeader
        title="Parties"
        subtitle="Customers who send Kasab for job-work"
        action={
          !form && (
            <Button onClick={startAdd}>
              <Plus size={16} /> Add Party
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

      {/* ── Add / Edit Form ──────────────────────────────────────── */}
      {form && (
        <form
          onSubmit={submit}
          className="mb-5 p-4 rounded-lg grid grid-cols-1 sm:grid-cols-2 gap-3"
          style={{
            background: 'var(--color-card)',
            border: '1px solid var(--color-border)',
          }}
        >
          <Field label="Party Name *">
            <TextInput
              required
              autoFocus
              placeholder="e.g. Ramesh Jariwala"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </Field>
          <Field label="Phone">
            <TextInput
              type="tel"
              placeholder="e.g. 98250 12345"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
          </Field>
          <Field label="Address">
            <TextInput
              placeholder="e.g. Katargam, Surat"
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
            />
          </Field>
          <Field label="Notes">
            <TextInput
              placeholder="e.g. Regular 8-cord party"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
          </Field>
          <div className="flex gap-2 sm:col-span-2 pt-1">
            <Button type="submit" disabled={saving}>
              <Check size={16} /> {saving ? 'Saving…' : form.id ? 'Update Party' : 'Save Party'}
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

      {/* ── Parties Grid ─────────────────────────────────────────── */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="rounded-lg p-4 h-36 animate-pulse"
              style={{
                background: 'var(--color-card)',
                border: '1px solid var(--color-border)',
              }}
            />
          ))}
        </div>
      ) : parties.length === 0 ? (
        <EmptyState text="No parties yet. Add the first party to start tracking their work." />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {parties.map((p) => {
            const s = stats[p.id] || { rolaPending: 0, balance: 0 }
            return (
              <div
                key={p.id}
                className="rounded-lg p-4 flex flex-col justify-between"
                style={{
                  background: 'var(--color-card)',
                  border: '1px solid var(--color-border)',
                }}
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <h3
                      className="font-semibold text-base leading-snug"
                      style={{
                        fontFamily: 'var(--font-display)',
                        color: 'var(--color-ink)',
                      }}
                    >
                      {p.name}
                    </h3>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => edit(p)}
                        className="p-1 rounded cursor-pointer"
                        style={{ color: 'var(--color-ink-soft)' }}
                        title="Edit party"
                        aria-label="Edit party"
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
                          className="p-1 rounded cursor-pointer"
                          style={{ color: 'var(--color-due)' }}
                          title="Delete party"
                          aria-label="Delete party"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </div>

                  {p.phone && (
                    <p
                      className="text-xs flex items-center gap-1 mt-1.5"
                      style={{ color: 'var(--color-ink-soft)' }}
                    >
                      <Phone size={11} className="shrink-0" />
                      <span>{p.phone}</span>
                    </p>
                  )}

                  {p.address && (
                    <p
                      className="text-xs flex items-center gap-1 mt-0.5"
                      style={{ color: 'var(--color-ink-soft)' }}
                    >
                      <MapPin size={11} className="shrink-0" />
                      <span>{p.address}</span>
                    </p>
                  )}

                  {p.notes && (
                    <p
                      className="text-xs mt-1.5 italic"
                      style={{ color: 'var(--color-ink-soft)' }}
                    >
                      {p.notes}
                    </p>
                  )}
                </div>

                <div
                  className="flex gap-4 mt-3 pt-3 text-xs"
                  style={{ borderTop: '1px solid var(--color-border-soft)' }}
                >
                  <div>
                    <div style={{ color: 'var(--color-ink-soft)' }}>Rola pending</div>
                    <div
                      className="font-semibold tabular-nums mt-0.5"
                      style={{
                        color: s.rolaPending > 0 ? 'var(--color-due)' : 'var(--color-ink)',
                      }}
                    >
                      {s.rolaPending}
                    </div>
                  </div>
                  <div>
                    <div style={{ color: 'var(--color-ink-soft)' }}>Balance due</div>
                    <div
                      className="font-semibold tabular-nums mt-0.5"
                      style={{
                        color:
                          s.balance > 0
                            ? 'var(--color-due)'
                            : s.balance < 0
                            ? 'var(--color-positive)'
                            : 'var(--color-ink)',
                      }}
                    >
                      {fmtMoney(s.balance)}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
