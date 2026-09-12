import React, { useMemo } from 'react'
import {
  X,
  Phone,
  MessageSquare,
  PackagePlus,
  Truck,
  IndianRupee,
  RotateCcw,
} from 'lucide-react'
import type {
  Party,
  PartyStats,
  ReceiptWithParty,
  DispatchWithParty,
  PaymentWithParty,
  RolaReturnWithParty,
} from '../../types'
import { fmtDate, fmtKg, fmtMoney } from '../../types'
import { sharePartyKhata, shareDispatchSlip, shareReceiptSlip } from '../../lib/whatsapp'

interface PartyKhataModalProps {
  isOpen: boolean
  onClose: () => void
  party: Party | null
  stats: PartyStats | null
  receipts: ReceiptWithParty[]
  dispatches: DispatchWithParty[]
  payments: PaymentWithParty[]
  rolaReturns: RolaReturnWithParty[]
}

type TimelineItem =
  | { type: 'receipt'; date: string; data: ReceiptWithParty }
  | { type: 'dispatch'; date: string; data: DispatchWithParty }
  | { type: 'payment'; date: string; data: PaymentWithParty }
  | { type: 'rola'; date: string; data: RolaReturnWithParty }

export const PartyKhataModal: React.FC<PartyKhataModalProps> = ({
  isOpen,
  onClose,
  party,
  stats,
  receipts,
  dispatches,
  payments,
  rolaReturns,
}) => {
  if (!isOpen || !party) return null

  const partyReceipts = useMemo(
    () => receipts.filter((r) => r.party_id === party.id),
    [receipts, party.id]
  )
  const partyDispatches = useMemo(
    () => dispatches.filter((d) => d.party_id === party.id),
    [dispatches, party.id]
  )
  const partyPayments = useMemo(
    () => payments.filter((p) => p.party_id === party.id),
    [payments, party.id]
  )
  const partyRolaReturns = useMemo(
    () => rolaReturns.filter((r) => r.party_id === party.id),
    [rolaReturns, party.id]
  )

  // Merge and sort all transactions newest first
  const timeline = useMemo(() => {
    const items: TimelineItem[] = [
      ...partyReceipts.map((r) => ({ type: 'receipt' as const, date: r.date, data: r })),
      ...partyDispatches.map((d) => ({ type: 'dispatch' as const, date: d.date, data: d })),
      ...partyPayments.map((p) => ({ type: 'payment' as const, date: p.date, data: p })),
      ...partyRolaReturns.map((ro) => ({ type: 'rola' as const, date: ro.date, data: ro })),
    ]
    return items.sort((a, b) => (a.date < b.date ? 1 : -1))
  }, [partyReceipts, partyDispatches, partyPayments, partyRolaReturns])

  const safeStats: PartyStats = stats || {
    rolaPending: 0,
    receivable: 0,
    received: 0,
    balance: 0,
    totalReceivedWeight: 0,
    unprocessedKasabWeight: 0,
    reconciledInputWeight: 0,
    reconciledOutputWeight: 0,
    totalDispatchWeight: 0,
    totalDispatchValue: 0,
    gapchaWeight: 0,
    gapchaSold: 0,
    remainingGapcha: 0,
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
      <div
        className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-[var(--color-border)] flex flex-col max-h-[92vh] overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-150"
        style={{ background: 'var(--color-card)' }}
      >
        {/* ── Modal Header ────────────────────────────────────────── */}
        <div className="p-4 sm:p-5 border-b border-[var(--color-border)] bg-[var(--color-paper)] flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2
                className="text-lg sm:text-xl font-bold text-[var(--color-ink)] truncate"
                style={{ fontFamily: 'var(--font-display)' }}
              >
                {party.name}
              </h2>
              <span className="text-xs px-2 py-0.5 rounded-md bg-[var(--color-brass)]/15 text-[var(--color-brass)] font-semibold shrink-0">
                Statement / Khata
              </span>
            </div>
            {party.phone && (
              <p className="text-xs text-[var(--color-ink-soft)] mt-0.5 flex items-center gap-1 font-medium">
                <Phone size={12} /> {party.phone}
              </p>
            )}
            {party.address && (
              <p className="text-xs text-[var(--color-ink-soft)] truncate mt-0.5">
                📍 {party.address}
              </p>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* WhatsApp Share Button */}
            <button
              type="button"
              onClick={() => sharePartyKhata(party, safeStats)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-[#25D366] hover:bg-[#20ba59] active:scale-95 transition-all shadow-xs cursor-pointer"
              title="Share statement on WhatsApp"
            >
              <MessageSquare size={14} strokeWidth={2.5} />
              <span className="hidden sm:inline">WhatsApp Statement</span>
              <span className="sm:hidden">Share</span>
            </button>

            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-[var(--color-ink-soft)] hover:bg-[var(--color-border)] hover:text-[var(--color-ink)] transition-colors cursor-pointer"
              aria-label="Close modal"
            >
              <X size={20} strokeWidth={2} />
            </button>
          </div>
        </div>

        {/* ── Key Balances Summary Grid ────────────────────────────── */}
        <div className="p-3 sm:p-4 bg-white border-b border-[var(--color-border)] grid grid-cols-2 sm:grid-cols-3 gap-2.5 shrink-0">
          {/* Balance Due */}
          <div
            className="p-3 rounded-xl border flex flex-col justify-center"
            style={{
              background: safeStats.balance > 0 ? 'var(--color-due-bg)' : '#F0FDF4',
              borderColor: safeStats.balance > 0 ? 'var(--color-due)' : '#86EFAC',
            }}
          >
            <span className="text-[11px] font-semibold text-[var(--color-ink-soft)]">
              Balance Due
            </span>
            <span
              className="text-lg sm:text-xl font-bold tabular-nums mt-0.5"
              style={{
                color: safeStats.balance > 0 ? 'var(--color-due)' : '#16A34A',
                fontFamily: 'var(--font-display)',
              }}
            >
              {fmtMoney(safeStats.balance)}
            </span>
          </div>

          {/* Rola Pending */}
          <div className="p-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-paper)] flex flex-col justify-center">
            <span className="text-[11px] font-semibold text-[var(--color-ink-soft)]">
              Rola Due
            </span>
            <span
              className="text-lg sm:text-xl font-bold tabular-nums text-[var(--color-ink)] mt-0.5"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              {safeStats.rolaPending} pcs
            </span>
          </div>

          {/* Kasab in Workshop */}
          <div className="col-span-2 sm:col-span-1 p-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-paper)] flex flex-col justify-center">
            <span className="text-[11px] font-semibold text-[var(--color-ink-soft)]">
              In Workshop
            </span>
            <span
              className="text-lg sm:text-xl font-bold tabular-nums text-[var(--color-brass)] mt-0.5"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              {fmtKg(safeStats.unprocessedKasabWeight)}
            </span>
          </div>
        </div>

        {/* ── Transaction History (Passbook) ───────────────────────── */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-2.5">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--color-ink-soft)]">
              Transaction History ({timeline.length})
            </h3>
            <span className="text-[11px] text-[var(--color-ink-soft)]">
              Newest First
            </span>
          </div>

          {timeline.length === 0 ? (
            <div className="py-12 text-center text-sm text-[var(--color-ink-soft)] border border-dashed rounded-xl border-[var(--color-border)]">
              No transactions recorded yet for this party.
            </div>
          ) : (
            timeline.map((item, idx) => {
              if (item.type === 'receipt') {
                const r = item.data
                return (
                  <div
                    key={`r-${r.id}-${idx}`}
                    className="p-3 rounded-xl border border-[var(--color-border)] bg-white shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                  >
                    <div className="flex items-start gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-amber-50 border border-amber-200 text-amber-700 flex items-center justify-center shrink-0 mt-0.5">
                        <PackagePlus size={16} strokeWidth={2.2} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-bold text-[var(--color-ink)]">
                            Raw Kasab Received
                          </span>
                          {r.challan_no && (
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-[var(--color-border-soft)] text-[var(--color-ink-soft)] font-medium">
                              Ch #{r.challan_no}
                            </span>
                          )}
                          {r.color && (
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 font-medium">
                              {r.color}
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-[var(--color-ink-soft)] mt-0.5">
                          Gross: {fmtKg(r.gross_weight)} • Rola: {r.rola_count} pcs • Tare: {fmtKg(r.tare_weight)}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-3 pl-10 sm:pl-0 pt-1 sm:pt-0 border-t sm:border-t-0 border-[var(--color-border-soft)]">
                      <div className="text-left sm:text-right">
                        <div className="text-xs font-bold text-amber-700 tabular-nums">
                          +{fmtKg(r.net_weight)}
                        </div>
                        <div className="text-[10px] text-[var(--color-ink-soft)]">
                          {fmtDate(r.date)}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => shareReceiptSlip(r, party)}
                        className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 active:scale-95 transition-all cursor-pointer"
                        title="Share on WhatsApp"
                      >
                        <MessageSquare size={15} />
                      </button>
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
                    className="p-3 rounded-xl border border-[var(--color-border)] bg-white shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                  >
                    <div className="flex items-start gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-200 text-blue-700 flex items-center justify-center shrink-0 mt-0.5">
                        <Truck size={16} strokeWidth={2.2} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-bold text-[var(--color-ink)]">
                            {isKali ? 'Kali/Rola Dispatched' : 'Val Dispatched'}
                          </span>
                          {d.challan_no && (
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-[var(--color-border-soft)] text-[var(--color-ink-soft)] font-medium">
                              Ch #{d.challan_no}
                            </span>
                          )}
                          {!isKali && d.cord_count && (
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-blue-100 text-blue-800 font-bold">
                              {d.cord_count} Tar ({d.twist_type || 'S'})
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-[var(--color-ink-soft)] mt-0.5">
                          {isKali ? (
                            `Weight: ${fmtKg(d.bore_gross_weight)}`
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
                        <div className="text-xs font-bold text-blue-700 tabular-nums">
                          {isKali ? fmtKg(d.bore_gross_weight) : fmtKg(d.net_val_weight || 0)}
                          {!isKali && d.amount ? ` • ${fmtMoney(d.amount)}` : ''}
                        </div>
                        <div className="text-[10px] text-[var(--color-ink-soft)]">
                          {fmtDate(d.date)}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => shareDispatchSlip(d, party)}
                        className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 active:scale-95 transition-all cursor-pointer"
                        title="Share on WhatsApp"
                      >
                        <MessageSquare size={15} />
                      </button>
                    </div>
                  </div>
                )
              }

              if (item.type === 'payment') {
                const pay = item.data
                return (
                  <div
                    key={`p-${pay.id}-${idx}`}
                    className="p-3 rounded-xl border border-emerald-200 bg-emerald-50/50 shadow-2xs flex items-center justify-between gap-2"
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

              if (item.type === 'rola') {
                const ro = item.data
                return (
                  <div
                    key={`ro-${ro.id}-${idx}`}
                    className="p-3 rounded-xl border border-purple-200 bg-purple-50/40 shadow-2xs flex items-center justify-between gap-2"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-purple-100 border border-purple-300 text-purple-800 flex items-center justify-center shrink-0">
                        <RotateCcw size={16} strokeWidth={2.2} />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-purple-900">
                          Rola Returned
                        </div>
                        <div className="text-xs text-purple-700 mt-0.5">
                          {ro.rola_count} spools returned from party
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-xs font-bold text-purple-800 tabular-nums">
                        {ro.rola_count} pcs
                      </div>
                      <div className="text-[10px] text-purple-600 font-medium">
                        {fmtDate(ro.date)}
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
        <div className="p-3 sm:p-4 bg-[var(--color-paper)] border-t border-[var(--color-border)] flex items-center justify-between">
          <span className="text-xs text-[var(--color-ink-soft)]">
            Total {timeline.length} transactions
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg text-xs font-bold bg-[var(--color-ink)] text-white hover:bg-black active:scale-95 transition-all cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

export default PartyKhataModal
