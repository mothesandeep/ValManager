import { useState, useEffect, useCallback } from 'react'
import {
  Plus,
  Pencil,
  Trash2,
  Phone,
  MapPin,
  BookOpen,
  X,
} from 'lucide-react'
import { fetchParties, insertParty, updateParty, deleteParty } from '../lib/api/parties'
import { fetchReceipts } from '../lib/api/receipts'
import { fetchDispatches } from '../lib/api/dispatch'
import { fetchPayments } from '../lib/api/payments'
import { fetchRolaReturns } from '../lib/api/rola'
import { computePartyStats } from '../lib/api/stats'


import type { Party, PartyStats } from '../features/parties/types'
import type { ReceiptWithParty } from '../features/receiving/types'
import type { DispatchWithParty } from '../features/dispatch/types'
import type { PaymentWithParty } from '../features/payments/types'
import type { RolaReturnWithParty } from '../features/rola/types'
import { fmtMoney } from '../utils/format'
import { PageHeader } from '../components/ui/PageHeader'
import { Button } from '../components/ui/Button'
import { EmptyState } from '../components/ui/EmptyState'
import { ConfirmDelete } from '../components/ui/ConfirmDelete'
import PartyKhataModal from '../features/parties/components/PartyKhataModal'

interface PartyFormState {
  id: string | null
  name: string
  phone: string
  address: string
  notes: string
  rolaWeight: string
  bungariWeight: string
}

const EMPTY_FORM: PartyFormState = {
  id: null,
  name: '',
  phone: '',
  address: '',
  notes: '',
  rolaWeight: '',
  bungariWeight: '',
}

export default function Parties() {
  const [parties, setParties] = useState<Party[]>([])
  const [receipts, setReceipts] = useState<ReceiptWithParty[]>([])
  const [dispatches, setDispatches] = useState<DispatchWithParty[]>([])
  const [payments, setPayments] = useState<PaymentWithParty[]>([])
  const [rolaReturns, setRolaReturns] = useState<RolaReturnWithParty[]>([])
  const [stats, setStats] = useState<Record<string, PartyStats>>({})
  const [loading, setLoading] = useState(true)

  // Khata Modal
  const [activeKhataParty, setActiveKhataParty] = useState<Party | null>(null)

  // Form State
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
      setReceipts(receiptsData)
      setDispatches(dispatchesData)
      setPayments(paymentsData)
      setRolaReturns(rolaData)

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
      rolaWeight:
        p.default_rola_weight_g !== null && p.default_rola_weight_g !== undefined
          ? String(p.default_rola_weight_g)
          : '',
      bungariWeight:
        p.default_bungari_weight_g !== null && p.default_bungari_weight_g !== undefined
          ? String(p.default_bungari_weight_g)
          : '',
    })
    setErrorMsg(null)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form || !form.name.trim()) return
    setSaving(true)
    setErrorMsg(null)

    const rolaG = form.rolaWeight ? parseInt(form.rolaWeight, 10) : null
    const bungariG = form.bungariWeight ? parseInt(form.bungariWeight, 10) : null

    try {
      if (form.id) {
        await updateParty(form.id, {
          name: form.name.trim(),
          phone: form.phone.trim() || null,
          address: form.address.trim() || null,
          notes: form.notes.trim() || null,
          default_rola_weight_g: rolaG,
          default_bungari_weight_g: bungariG,
        })
      } else {
        await insertParty({
          name: form.name.trim(),
          phone: form.phone.trim() || null,
          address: form.address.trim() || null,
          notes: form.notes.trim() || null,
          default_rola_weight_g: rolaG,
          default_bungari_weight_g: bungariG,
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
      <PageHeader
        title="Parties"
        description="Party management, material standing, and statement overview"
        actions={
          !form && (
            <div className="hidden sm:block">
              <Button onClick={startAdd} variant="primary">
                <Plus size={18} strokeWidth={2.5} /> New Party
              </Button>
            </div>
          )
        }
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

      {/* ── Parties Grid ─────────────────────────────────────────── */}
      {!form && (
        <div className="pb-28 pt-2">
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="rounded-[var(--radius-xl)] p-5 h-48 animate-pulse bg-[var(--color-card)] border border-[var(--color-border)] shadow-[var(--shadow-sm)]"
                />
              ))}
            </div>
          ) : parties.length === 0 ? (
            <EmptyState text="No parties yet. Add the first party to start tracking their work." />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-5">
              {parties.map((p) => {
                const s = stats[p.id] || { rolaPending: 0, balance: 0 }
                return (
                  <div
                    key={p.id}
                    className="rounded-[var(--radius-xl)] p-5 bg-[var(--color-card)] border border-[var(--color-border)] shadow-[var(--shadow-sm)] hover:shadow-[var(--shadow-md)] hover:border-[var(--color-brass-soft)] flex flex-col justify-between transition-all group relative overflow-hidden"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <h3 className="font-bold text-lg leading-tight text-[var(--color-ink)] tracking-tight">
                          {p.name}
                        </h3>
                        <div className="flex items-center gap-1 shrink-0 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                          <button
                            type="button"
                            onClick={() => edit(p)}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer"
                            title="Edit party"
                            aria-label="Edit party"
                          >
                            <Pencil size={16} strokeWidth={2.5} />
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
                              className="p-1.5 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors cursor-pointer"
                              title="Delete party"
                              aria-label="Delete party"
                            >
                              <Trash2 size={16} strokeWidth={2.5} />
                            </button>
                          )}
                        </div>
                      </div>

                      {p.phone && (
                        <p className="text-[13px] text-gray-500 flex items-center gap-1.5 mb-1.5 font-bold">
                          <Phone size={14} className="text-gray-400 shrink-0" />
                          <span>{p.phone}</span>
                        </p>
                      )}

                      {p.address && (
                        <p className="text-[13px] text-gray-500 flex items-start gap-1.5 leading-snug">
                          <MapPin size={14} className="text-gray-400 shrink-0 mt-0.5" />
                          <span>{p.address}</span>
                        </p>
                      )}

                      {p.notes && (
                        <p className="text-[12px] text-gray-400 mt-2 italic font-medium">
                          "{p.notes}"
                        </p>
                      )}

                      {/* Weights badge - Only Rola */}
                      <div className="flex items-center gap-1.5 flex-wrap mt-3">
                        <span className="text-[10px] font-extrabold tracking-widest uppercase px-2.5 py-1 rounded-full bg-gray-100 text-gray-500">
                          Rola: {p.default_rola_weight_g ? `${p.default_rola_weight_g}g` : '200g'}
                        </span>
                      </div>
                    </div>

                    <div>
                      {/* Balance / Rola stats */}
                      <div className="grid grid-cols-2 gap-4 mt-5 pt-4 border-t border-gray-100">
                        <div>
                          <div className="text-[10px] font-extrabold text-gray-400 uppercase tracking-widest mb-1">Pending Rola</div>
                          <div
                            className={`font-black tabular-nums text-[16px] leading-none ${
                              s.rolaPending > 0 ? 'text-red-500' : 'text-gray-900'
                            }`}
                          >
                            {s.rolaPending} <span className="text-[12px] font-bold text-gray-400 tracking-normal">pcs</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-[10px] font-extrabold text-gray-400 uppercase tracking-widest mb-1">Balance Due</div>
                          <div
                            className={`font-black tabular-nums text-[18px] leading-none tracking-tight ${
                              s.balance > 0
                                ? 'text-red-500'
                                : s.balance < 0
                                ? 'text-emerald-500'
                                : 'text-gray-900'
                            }`}
                          >
                            {fmtMoney(s.balance)}
                          </div>
                        </div>
                      </div>

                      {/* ── 📖 Party Khata / Passbook ─ */}
                      <div className="flex items-center mt-5">
                        <button
                          type="button"
                          onClick={() => setActiveKhataParty(p)}
                          className="flex-1 py-3 px-4 rounded-xl bg-[#a57b3f]/10 hover:bg-[#a57b3f]/20 text-[#a57b3f] text-[13px] font-extrabold flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-95"
                        >
                          <BookOpen size={16} strokeWidth={2.5} /> Statement / Khata
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Add / Edit Form Modal ──────────────────────────────────────── */}
      {form && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-0 sm:p-4 transition-all">
          <div className="bg-[#fcfcfb] w-full sm:max-w-[480px] rounded-t-[24px] sm:rounded-2xl shadow-2xl flex flex-col relative overflow-hidden animate-in slide-in-from-bottom-12 sm:zoom-in-95 duration-300 ease-out max-h-[90dvh] sm:max-h-[85dvh] overflow-y-auto">
            {/* Mobile drag handle */}
            <div className="sm:hidden flex justify-center pt-3 pb-1 bg-white shrink-0 sticky top-0 z-10">
              <div className="w-12 h-1.5 bg-gray-200 rounded-full"></div>
            </div>
            
            <div className="px-6 pb-4 pt-4 sm:pt-6 bg-white flex justify-between items-start shrink-0 sticky top-0 sm:top-0 z-10 border-b border-gray-100">
              <div>
                <p className="text-[10px] font-extrabold tracking-widest text-[#a57b3f]/70 uppercase mb-1.5">
                  {form.id ? 'EDIT PARTY' : 'NEW PARTY'}
                </p>
                <h2 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight">
                  Party Details
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
                  <label className="block text-[10px] font-extrabold text-gray-400 uppercase mb-1.5 tracking-widest pl-1">Party Name *</label>
                  <input
                    required
                    autoFocus
                    placeholder="e.g. Ramesh Jariwala"
                    className="w-full h-[48px] px-4 bg-white border border-gray-200/80 rounded-[14px] text-[15px] font-bold text-gray-900 focus:outline-none focus:border-[#a57b3f] focus:ring-4 focus:ring-[#a57b3f]/10 transition-all shadow-sm"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-extrabold text-gray-400 uppercase mb-1.5 tracking-widest pl-1">Phone Number</label>
                  <input
                    type="tel"
                    placeholder="e.g. 98250 12345"
                    className="w-full h-[48px] px-4 bg-white border border-gray-200/80 rounded-[14px] text-[15px] font-bold text-gray-900 focus:outline-none focus:border-[#a57b3f] focus:ring-4 focus:ring-[#a57b3f]/10 transition-all shadow-sm"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-extrabold text-gray-400 uppercase mb-1.5 tracking-widest pl-1">Address</label>
                  <input
                    placeholder="e.g. Katargam, Surat"
                    className="w-full h-[48px] px-4 bg-white border border-gray-200/80 rounded-[14px] text-[15px] font-bold text-gray-900 focus:outline-none focus:border-[#a57b3f] focus:ring-4 focus:ring-[#a57b3f]/10 transition-all shadow-sm"
                    value={form.address}
                    onChange={(e) => setForm({ ...form, address: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-extrabold text-gray-400 uppercase mb-1.5 tracking-widest pl-1">Notes</label>
                  <input
                    placeholder="e.g. Regular 8-cord party"
                    className="w-full h-[48px] px-4 bg-white border border-gray-200/80 rounded-[14px] text-[15px] font-bold text-gray-900 focus:outline-none focus:border-[#a57b3f] focus:ring-4 focus:ring-[#a57b3f]/10 transition-all shadow-sm"
                    value={form.notes}
                    onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  />
                </div>

                <div className="flex gap-4">
                  <div className="flex-1">
                    <label className="block text-[10px] font-extrabold text-gray-400 uppercase mb-1.5 tracking-widest pl-1">Def. Rola (g)</label>
                    <input
                      type="text"
                      inputMode="numeric"
                      placeholder="200"
                      className="w-full h-[48px] px-4 bg-gray-50/50 border border-gray-200/80 rounded-[14px] text-[15px] font-bold text-gray-900 focus:outline-none focus:bg-white focus:border-[#a57b3f] focus:ring-4 focus:ring-[#a57b3f]/10 transition-all shadow-sm placeholder:text-gray-300"
                      value={form.rolaWeight}
                      onChange={(e) => setForm({ ...form, rolaWeight: e.target.value.replace(/[^0-9]/g, '') })}
                    />
                  </div>
                  <div className="flex-1">
                    <label className="block text-[10px] font-extrabold text-gray-400 uppercase mb-1.5 tracking-widest pl-1">Def. Bungri (g)</label>
                    <input
                      type="text"
                      inputMode="numeric"
                      placeholder="70"
                      className="w-full h-[48px] px-4 bg-gray-50/50 border border-gray-200/80 rounded-[14px] text-[15px] font-bold text-gray-900 focus:outline-none focus:bg-white focus:border-[#a57b3f] focus:ring-4 focus:ring-[#a57b3f]/10 transition-all shadow-sm placeholder:text-gray-300"
                      value={form.bungariWeight}
                      onChange={(e) => setForm({ ...form, bungariWeight: e.target.value.replace(/[^0-9]/g, '') })}
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
                  className="flex-[2] py-4 rounded-[14px] font-black text-white bg-gradient-to-b from-[#b88f4b] to-[#a57b3f] hover:from-[#c29a56] hover:to-[#b38848] shadow-[0_4px_12px_rgba(165,123,63,0.3)] transition-all flex items-center justify-center gap-2 cursor-pointer border border-[#a57b3f]/50"
                >
                  {saving ? 'Saving...' : form.id ? 'Update Party' : 'Save Party'}
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
          className="sm:hidden fixed bottom-[80px] right-5 bg-gradient-to-b from-[#b88f4b] to-[#a57b3f] hover:from-[#c29a56] hover:to-[#b38848] text-white px-6 py-4 rounded-full shadow-[0_8px_30px_-8px_rgba(165,123,63,0.5)] flex items-center gap-2.5 font-black transition-all active:scale-95 z-40 border border-[#a57b3f]/50"
        >
          <Plus size={22} strokeWidth={3} /> <span className="tracking-wide">Add Party</span>
        </button>
      )}

      {/* ── Party Khata / Passbook Modal ──────────────────────────── */}
      <PartyKhataModal
        isOpen={Boolean(activeKhataParty)}
        onClose={() => setActiveKhataParty(null)}
        party={activeKhataParty}
        stats={activeKhataParty ? stats[activeKhataParty.id] || null : null}
        receipts={receipts}
        dispatches={dispatches}
        payments={payments}
        rolaReturns={rolaReturns}
      />
    </div>
  )
}

