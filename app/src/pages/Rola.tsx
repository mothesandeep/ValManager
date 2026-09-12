import { useState, useEffect, useCallback } from 'react'
import { Plus, Pencil, Trash2, Check, X } from 'lucide-react'
import { fetchParties } from '../lib/api/parties'
import { fetchReceipts } from '../lib/api/receipts'
import { fetchRolaReturns, insertRolaReturn, updateRolaReturn, deleteRolaReturn, type RolaReturnPayload } from '../lib/api/rola'


import type { Party, ReceiptWithParty, RolaReturnWithParty } from '../types'
import { fmtDate, todayStr } from '../types'
import { SectionHeader } from '../components/ui/SectionHeader'
import { Button } from '../components/ui/Button'
import { Field } from '../components/ui/Field'
import { TextInput } from '../components/ui/TextInput'
import { Select } from '../components/ui/Select'
import { Table } from '../components/ui/Table'
import { EmptyState } from '../components/ui/EmptyState'
import { ConfirmDelete } from '../components/ui/ConfirmDelete'

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
        title="Rola Returns"
        subtitle="Track empty spools received and returned per party"
      />

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

      {/* ── Summary Cards Grid ───────────────────────────────────── */}
      {!form && (
        <div className="mb-8">
          <h2 className="text-xs font-extrabold uppercase tracking-widest text-gray-400 mb-4 pl-1">Rola Balances</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {balances.length === 0 && !loading && (
              <div className="col-span-full">
                <EmptyState text="No rola movement recorded yet." />
              </div>
            )}
            {balances.map((b) => (
              <div
                key={b.party.id}
                className="rounded-[24px] p-5 bg-white border border-gray-100/80 shadow-[0_4px_20px_-6px_rgba(0,0,0,0.05)] hover:shadow-[0_8px_30px_-8px_rgba(0,0,0,0.08)] transition-all"
              >
                <h3 className="font-extrabold text-[16px] mb-4 text-gray-900 tracking-tight">
                  {b.party.name}
                </h3>
                <div className="space-y-2.5">
                  <div className="flex justify-between items-center">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400">Received from them</span>
                    <span className="tabular-nums font-black text-gray-600">{b.received} <span className="text-[10px] font-bold text-gray-400">pcs</span></span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400">Returned to them</span>
                    <span className="tabular-nums font-black text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md">{b.returned} <span className="text-[10px] font-bold text-indigo-400">pcs</span></span>
                  </div>
                </div>
                <div className="flex justify-between items-end pt-4 mt-4 border-t border-gray-100">
                  <span className="text-[11px] font-extrabold uppercase tracking-widest text-gray-400">Pending with Us</span>
                  <span
                    className={`tabular-nums font-black text-[18px] leading-none tracking-tight ${
                      b.pending > 0
                        ? 'text-red-500'
                        : b.pending < 0
                        ? 'text-emerald-500'
                        : 'text-gray-900'
                    }`}
                  >
                    {b.pending} <span className="text-[12px] font-bold text-gray-400 tracking-normal">pcs</span>
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Returns List ───────────────────────────────────────────── */}
      {!form && (
        <div className="pb-28">
          <h2 className="text-xs font-extrabold uppercase tracking-widest text-gray-400 mb-4 pl-1">Recent Returns</h2>
          {loading ? (
            <div className="rounded-[20px] p-8 text-center text-sm border border-gray-100 bg-white shadow-sm text-gray-400">
              Loading returns…
            </div>
          ) : rolaReturns.length === 0 ? (
            <EmptyState text={`No return entries logged yet.`} />
          ) : (
            <div className="space-y-3">
              {rolaReturns.map((r) => (
                <div
                  key={r.id}
                  className="rounded-[20px] p-4 bg-white border border-gray-100/80 shadow-[0_2px_10px_rgba(0,0,0,0.02)] flex items-center justify-between group transition-all hover:shadow-[0_4px_15px_rgba(0,0,0,0.04)]"
                >
                  <div className="flex flex-col">
                    <span className="font-bold text-[15px] text-gray-900 tracking-tight">{r.party?.name ?? '—'}</span>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[11px] font-bold text-gray-400">{fmtDate(r.date)}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-[17px] font-black tabular-nums text-indigo-600 tracking-tight">
                      {r.rola_count} <span className="text-[12px] text-indigo-400 tracking-normal">pcs</span>
                    </span>
                    <div className="flex items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                      <button
                        type="button"
                        onClick={() => edit(r)}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer"
                      >
                        <Pencil size={15} />
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
        <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/40 backdrop-blur-md sm:items-center sm:justify-center p-0 sm:p-4 transition-all">
          <div className="bg-[#fcfcfb] w-full sm:w-[480px] rounded-t-[24px] sm:rounded-3xl shadow-2xl flex flex-col relative overflow-hidden animate-in slide-in-from-bottom-12 sm:slide-in-from-bottom-6 duration-400 ease-out">
            <div className="flex justify-center pt-3 pb-1 bg-white">
              <div className="w-12 h-1.5 bg-gray-200 rounded-full"></div>
            </div>
            
            <div className="px-6 pb-4 pt-2 bg-white flex justify-between items-start">
              <div>
                <p className="text-[10px] font-extrabold tracking-widest text-indigo-600/70 uppercase mb-1.5">
                  {form.id ? 'EDIT RETURN' : 'NEW RETURN'}
                </p>
                <h2 className="text-xl font-black text-gray-900 tracking-tight">
                  Log Rola Return
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
                    className="w-full h-[48px] px-4 bg-gray-50/50 border border-gray-200/80 rounded-[14px] text-[15px] font-bold text-gray-900 focus:outline-none focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all appearance-none cursor-pointer shadow-sm"
                  >
                    {parties.map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>

                <div className="flex gap-4">
                  <div className="flex-1">
                    <label className="block text-[10px] font-extrabold text-gray-400 uppercase mb-1.5 tracking-widest pl-1">Count (pcs) *</label>
                    <input
                      required
                      type="number"
                      step="1"
                      placeholder="e.g. 50"
                      className="w-full h-[48px] px-4 bg-indigo-50/30 border border-indigo-200/50 rounded-[14px] text-[16px] font-black tabular-nums text-indigo-700 placeholder:text-indigo-700/30 focus:outline-none focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all shadow-sm"
                      value={form.rolaCount}
                      onChange={(e) => setForm({ ...form, rolaCount: e.target.value })}
                    />
                  </div>
                  <div className="flex-[0.8]">
                    <label className="block text-[10px] font-extrabold text-gray-400 uppercase mb-1.5 tracking-widest pl-1">Date</label>
                    <input
                      type="date"
                      required
                      className="w-full h-[48px] px-4 bg-gray-50/50 border border-gray-200/80 rounded-[14px] text-[14px] font-bold text-gray-900 focus:outline-none focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all shadow-sm"
                      value={form.date}
                      onChange={(e) => setForm({ ...form, date: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              <div className="pt-4 flex gap-4">
                <button
                  type="button"
                  onClick={() => setForm(null)}
                  disabled={saving}
                  className="flex-1 py-4 rounded-[14px] font-bold text-gray-500 bg-gray-50 hover:bg-gray-100 border border-gray-200/50 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-[2] py-4 rounded-[14px] font-black text-white bg-gradient-to-b from-indigo-500 to-violet-600 hover:from-indigo-400 hover:to-violet-500 shadow-[0_4px_12px_rgba(99,102,241,0.3)] transition-all flex items-center justify-center gap-2 cursor-pointer border border-indigo-600/50"
                >
                  {saving ? 'Saving...' : 'Save Return'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Floating Action Button */}
      {!form && parties.length > 0 && (
        <button
          onClick={startAdd}
          className="fixed bottom-[80px] right-5 sm:right-8 bg-gradient-to-b from-indigo-500 to-violet-600 hover:from-indigo-400 hover:to-violet-500 text-white px-6 py-4 rounded-full shadow-[0_8px_30px_-8px_rgba(99,102,241,0.5)] hover:shadow-[0_12px_40px_-8px_rgba(99,102,241,0.6)] flex items-center gap-2.5 font-black transition-all active:scale-95 z-40 border border-indigo-400/50 hover:-translate-y-1"
        >
          <Plus size={22} strokeWidth={3} /> <span className="tracking-wide">Log Return</span>
        </button>
      )}
    </div>
  )
}
