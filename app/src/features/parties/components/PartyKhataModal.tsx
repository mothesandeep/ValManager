import React, { useMemo } from 'react'
import {
  Phone,
  PackagePlus,
  Truck,
  IndianRupee,
  RotateCcw
} from 'lucide-react'
import type { Party, PartyStats } from '../types'
import type { ReceiptWithParty } from '../../receiving/types'
import type { DispatchWithParty } from '../../dispatch/types'
import type { PaymentWithParty } from '../../payments/types'
import { fmtDate } from '../../../utils/date'
import { fmtKg, fmtMoney } from '../../../utils/format'


interface PartyKhataModalProps {
  isOpen: boolean
  onClose: () => void
  party: Party | null
  stats: PartyStats | null
  receipts: ReceiptWithParty[]
  dispatches: DispatchWithParty[]
  payments: PaymentWithParty[]
  onDataChange?: () => void
}

type TimelineItem =
  | { type: 'receipt'; date: string; data: ReceiptWithParty }
  | { type: 'dispatch'; date: string; data: DispatchWithParty }
  | { type: 'payment'; date: string; data: PaymentWithParty }

export const PartyKhataModal: React.FC<PartyKhataModalProps> = ({
  isOpen,
  onClose,
  party,
  stats,
  receipts,
  dispatches,
  payments,
}) => {
  const partyId = party?.id

  const partyReceipts = useMemo(
    () => partyId ? receipts.filter((r) => r.party_id === partyId) : [],
    [receipts, partyId]
  )
  const partyDispatches = useMemo(
    () => partyId ? dispatches.filter((d) => d.party_id === partyId) : [],
    [dispatches, partyId]
  )
  const partyPayments = useMemo(
    () => partyId ? payments.filter((p) => p.party_id === partyId) : [],
    [payments, partyId]
  )

  // Merge and sort all transactions newest first
  const timeline = useMemo(() => {
    const items: TimelineItem[] = [
      ...partyReceipts.map((r) => ({ type: 'receipt' as const, date: r.date, data: r })),
      ...partyDispatches.map((d) => ({ type: 'dispatch' as const, date: d.date, data: d })),
      ...partyPayments.map((p) => ({ type: 'payment' as const, date: p.date, data: p })),
    ]
    return items.sort((a, b) => (a.date < b.date ? 1 : -1))
  }, [partyReceipts, partyDispatches, partyPayments])

  if (!isOpen || !party) return null

  const safeStats: PartyStats = stats || {
    rolaPending: 0,
    receivable: 0,
    received: 0,
    balance: 0,
    totalReceivedWeight: 0,
    unprocessedKasabWeight: 0,
    totalDispatchWeight: 0,
    totalDispatchValue: 0,
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/40 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col max-h-[92vh] overflow-hidden my-auto animate-in zoom-in-95 duration-200"
      >
        {/* ── Modal Header ────────────────────────────────────────── */}
        <div className="p-4 sm:p-5 border-b border-[var(--color-border)] bg-[var(--color-paper)] flex items-start justify-between gap-3 shrink-0">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2
                className="text-lg sm:text-xl font-bold text-[var(--color-ink)] truncate"
                style={{ fontFamily: 'var(--font-display)' }}
              >
                {party.name}
              </h2>
              <span className="text-xs px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200/80 font-semibold shrink-0">
                Statement / Khata
              </span>
            </div>
            {party.phone && (
              <p className="text-xs text-[var(--color-ink-soft)] mt-0.5 flex items-center gap-1 font-medium">
                <Phone size={12} /> {party.phone}
              </p>
            )}
          </div>
        </div>

        {/* ── Summary Cards ───────────────────────────────────────── */}
        <div className="p-4 sm:p-5 bg-[var(--color-paper)] border-b border-[var(--color-border)] shrink-0">
          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            <div className="bg-[var(--color-card)] p-3 sm:p-4 rounded-[var(--radius-lg)] border border-[var(--color-border-soft)] shadow-[var(--shadow-sm)]">
              <div className="text-[10px] font-extrabold text-[var(--color-ink-soft)] uppercase tracking-widest mb-1 sm:mb-1.5">
                Pending Rola
              </div>
              <div className="flex items-baseline gap-1.5">
                <span
                  className={`text-xl sm:text-2xl font-black leading-none ${safeStats.rolaPending > 0 ? 'text-[var(--color-ink)]' : 'text-[var(--color-ink-soft)]'}`}
                >
                  {safeStats.rolaPending}
                </span>
                <span className="text-[10px] font-bold text-[var(--color-ink-soft)] uppercase">
                  pcs
                </span>
              </div>
            </div>

            <div className="bg-[var(--color-card)] p-3 sm:p-4 rounded-[var(--radius-lg)] border border-[var(--color-border-soft)] shadow-[var(--shadow-sm)]">
              <div className="text-[10px] font-extrabold text-[var(--color-ink-soft)] uppercase tracking-widest mb-1 sm:mb-1.5">
                Balance Due
              </div>
              <span
                className={`text-xl sm:text-2xl font-black leading-none tracking-tight ${safeStats.balance > 0 ? 'text-red-600' : 'text-[var(--color-ink)]'}`}
              >
                {fmtMoney(safeStats.balance)}
              </span>
            </div>
          </div>
        </div>

        {/* ── Timeline (Scrollable) ───────────────────────────────── */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3 bg-[#faf9f8]" style={{ WebkitOverflowScrolling: 'touch' }}>
          {timeline.length === 0 ? (
            <div className="text-center py-10">
              <div className="w-12 h-12 rounded-full bg-[var(--color-border-soft)] flex items-center justify-center mx-auto mb-3 text-[var(--color-ink-soft)]">
                <RotateCcw size={20} />
              </div>
              <p className="text-sm text-[var(--color-ink-soft)] font-medium">
                No transactions recorded yet.
              </p>
            </div>
          ) : (
            timeline.map((item, idx) => {
              if (item.type === 'receipt') {
                const r = item.data
                return (
                  <div
                    key={`r-${r.id}-${idx}`}
                    className="p-3 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-card)] shadow-[var(--shadow-sm)] flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:shadow-[var(--shadow-md)] transition-shadow"
                  >
                    <div className="flex items-start gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-slate-100 border border-slate-200 text-slate-800 flex items-center justify-center shrink-0 mt-0.5">
                        <PackagePlus size={16} strokeWidth={2.2} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-bold text-[var(--color-ink)]">
                            Kasab Received
                          </span>
                          {r.challan_no && (
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-[var(--color-border-soft)] text-[var(--color-ink-soft)] font-medium">
                              Ch #{r.challan_no}
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-[var(--color-ink-soft)] mt-0.5 flex flex-wrap gap-x-3 gap-y-1">
                          <span>Gross: {fmtKg(r.gross_weight)}</span>
                          {r.rola_count > 0 && <span>Rola: {r.rola_count} pcs</span>}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-3 pl-10 sm:pl-0 pt-1 sm:pt-0 border-t sm:border-t-0 border-[var(--color-border-soft)]">
                      <div className="text-left sm:text-right">
                        <div className="text-xs font-semibold text-slate-900 tabular-nums">
                          +{fmtKg(r.net_weight)}
                        </div>
                        <div className="text-[10px] text-[var(--color-ink-soft)]">
                          {fmtDate(r.date)}
                        </div>
                      </div>
                    </div>
                  </div>
                )
              }

              if (item.type === 'dispatch') {
                const d = item.data
                const isKali = d.dispatch_type === 'Kali' || d.dispatch_type === 'Rola'
                
                return (
                  <div
                    key={`d-${d.id}-${idx}`}
                    className="p-3 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-card)] shadow-[var(--shadow-sm)] flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:shadow-[var(--shadow-md)] transition-shadow"
                  >
                    <div className="flex items-start gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-slate-100 border border-slate-200 text-slate-800 flex items-center justify-center shrink-0 mt-0.5">
                        <Truck size={16} strokeWidth={2.2} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-bold text-[var(--color-ink)]">
                            {isKali ? 'Rola Dispatched' : 'Val Dispatched'}
                          </span>
                          {d.challan_no && (
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-[var(--color-border-soft)] text-[var(--color-ink-soft)] font-medium">
                              Ch #{d.challan_no}
                            </span>
                          )}
                          {!isKali && d.cord_count && (
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-100 text-slate-700 font-medium">
                              {d.cord_count} Tar ({d.twist_type || 'S'})
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-[var(--color-ink-soft)] mt-0.5">
                          {isKali ? (
                            `Weight: ${fmtKg(d.bore_gross_weight)} • Return: ${d.rola_count ?? 0} pcs`
                          ) : (
                            <>
                              Gross: {fmtKg(d.bore_gross_weight)} • Bungari: {d.bungari_count} pcs • Rate: ₹{d.rate_per_kg || 0}/kg
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-3 pl-10 sm:pl-0 pt-1 sm:pt-0 border-t sm:border-t-0 border-[var(--color-border-soft)]">
                      <div className="text-left sm:text-right">
                        <div className="text-xs tabular-nums">
                          <span className="font-semibold text-slate-900">{isKali ? fmtKg(d.bore_gross_weight) : fmtKg(d.net_val_weight || 0)}</span>
                          {!isKali && d.amount ? <span className="font-semibold text-emerald-700"> • {fmtMoney(d.amount)}</span> : ''}
                        </div>
                        <div className="text-[10px] text-[var(--color-ink-soft)]">
                          {fmtDate(d.date)}
                        </div>
                      </div>
                    </div>
                  </div>
                )
              }

              if (item.type === 'payment') {
                const pay = item.data
                return (
                  <div
                    key={`p-${pay.id}-${idx}`}
                    className="p-3 rounded-[var(--radius-lg)] border border-emerald-200 bg-emerald-50/50 shadow-[var(--shadow-sm)] flex items-center justify-between gap-2 hover:shadow-[var(--shadow-md)] transition-shadow"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-emerald-100 border border-emerald-300 text-emerald-800 flex items-center justify-center shrink-0">
                        <IndianRupee size={16} strokeWidth={2.5} />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-emerald-900">
                          Payment Received
                        </div>
                        {pay.note && (
                          <div className="text-xs text-emerald-700 mt-0.5">
                            {pay.note}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-sm font-bold text-emerald-700 tabular-nums">
                        +{fmtMoney(pay.amount)}
                      </div>
                      <div className="text-[10px] text-emerald-600 font-medium">
                        {fmtDate(pay.date)}
                      </div>
                    </div>
                  </div>
                )
              }

              return null
            })
          )}
        </div>

        {/* ── Footer ──────────────────────────────────────────────── */}
        <div className="p-3 sm:p-4 bg-[var(--color-paper)] border-t border-[var(--color-border)] flex items-center justify-between shrink-0">
          <span className="text-xs text-[var(--color-ink-soft)]">
            Total {timeline.length} transactions
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg text-xs font-medium bg-slate-900 text-white hover:bg-slate-800 active:scale-95 transition-all cursor-pointer shadow-xs"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

export default PartyKhataModal
