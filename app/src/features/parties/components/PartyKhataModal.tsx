import React, { useMemo } from 'react'
import {
  Phone,
  PackagePlus,
  Truck,
  IndianRupee,
  RotateCcw,
  X,
  Printer,
  Share2,
  Download,
  MapPin,
  ArrowLeft,
} from 'lucide-react'
import type { Party, PartyStats } from '@/features/parties/types/party.types'
import type { ReceiptWithParty } from '@/features/inward/types/inward.types'
import type { DispatchWithParty } from '@/features/outward/types/outward.types'
import type { PaymentWithParty } from '@/features/billing/types/billing.types'
import { fmtDate } from '@/utils/date'
import { fmtKg, fmtMoney } from '@/utils/format'
import { getCompanySettings } from '@/features/settings/utils'
import { getSanitizedFilename, exportRawRowsToCSV } from '@/utils/exportHelpers'
import { shareOrPrintDocument, isMobileDevice } from '@/utils/nativeShare'
import { BottomSheetModal } from '@/components/sheets/BottomSheetModal'

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

interface LedgerEntry {
  id: string
  date: string
  type: 'receipt' | 'dispatch' | 'payment'
  title: string
  reference: string
  details: string
  badgeLabel?: string
  badgeClass?: string
  debit: number    // increase in party balance (dispatch bill)
  credit: number   // decrease in party balance (payment)
  weight: number   // kg (inward or outward)
  runningBalance: number
  raw: ReceiptWithParty | DispatchWithParty | PaymentWithParty
}

function parsePaymentNote(note?: string | null): {
  mode: string
  reference: string
  badgeClass: string
} {
  if (!note || !note.trim()) {
    return {
      mode: 'Cash',
      reference: 'Direct Payment',
      badgeClass:
        'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700',
    }
  }

  const clean = note.trim()
  let mode = 'Cash'
  let reference = ''

  if (clean.includes(' • ')) {
    const parts = clean.split(' • ')
    mode = parts[0].trim()
    reference = parts.slice(1).join(' • ').trim()
  } else {
    const lower = clean.toLowerCase()
    if (lower.includes('cheque') || lower.includes('chq')) {
      mode = 'Cheque'
      reference = clean.replace(/^(cheque|chq)[^a-zA-Z0-9#]*/i, '').trim()
    } else if (
      lower.includes('upi') ||
      lower.includes('gpay') ||
      lower.includes('phonepe') ||
      lower.includes('paytm')
    ) {
      mode = 'UPI'
      reference = clean.replace(/^(upi|gpay|phonepe|paytm)[^a-zA-Z0-9#]*/i, '').trim()
    } else if (
      lower.includes('neft') ||
      lower.includes('rtgs') ||
      lower.includes('imps') ||
      lower.includes('bank')
    ) {
      mode = lower.includes('rtgs') ? 'RTGS' : lower.includes('imps') ? 'IMPS' : 'NEFT'
      reference = clean.replace(/^(neft|rtgs|imps|bank)[^a-zA-Z0-9#]*/i, '').trim()
    } else if (lower === 'cash') {
      mode = 'Cash'
      reference = ''
    } else {
      mode = 'Cash'
      reference = clean
    }
  }

  let badgeClass =
    'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
  const modeLower = mode.toLowerCase()
  if (modeLower.includes('cheque')) {
    badgeClass =
      'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border border-blue-200/70 dark:border-blue-800/60'
  } else if (modeLower.includes('upi') || modeLower.includes('online')) {
    badgeClass =
      'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200/70 dark:border-emerald-800/60'
  } else if (
    modeLower.includes('neft') ||
    modeLower.includes('rtgs') ||
    modeLower.includes('imps') ||
    modeLower.includes('bank')
  ) {
    badgeClass =
      'bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300 border border-sky-200/70 dark:border-sky-800/60'
  }

  return {
    mode: mode || 'Payment',
    reference: reference || 'Settlement',
    badgeClass,
  }
}

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
  const company = getCompanySettings()

  const partyReceipts = useMemo(
    () => (partyId ? receipts.filter((r) => r.party_id === partyId) : []),
    [receipts, partyId]
  )
  const partyDispatches = useMemo(
    () => (partyId ? dispatches.filter((d) => d.party_id === partyId) : []),
    [dispatches, partyId]
  )
  const partyPayments = useMemo(
    () => (partyId ? payments.filter((p) => p.party_id === partyId) : []),
    [payments, partyId]
  )

  const totalInwardKg = useMemo(
    () =>
      partyReceipts.reduce((s, r) => {
        const net =
          r.net_weight !== null && r.net_weight !== undefined
            ? Number(r.net_weight)
            : Math.max(0, (Number(r.gross_weight) || 0) - (Number(r.tare_weight) || 0))
        return s + (Number.isFinite(net) ? net : 0)
      }, 0),
    [partyReceipts]
  )

  const totalOutwardKg = useMemo(
    () => partyDispatches.reduce((s, d) => s + (Number(d.net_val_weight) || 0), 0),
    [partyDispatches]
  )

  const totalBilled = useMemo(
    () => partyDispatches.reduce((s, d) => s + (Number(d.amount) || 0), 0),
    [partyDispatches]
  )

  const totalReceived = useMemo(
    () => partyPayments.reduce((s, p) => s + (Number(p.amount) || 0), 0),
    [partyPayments]
  )

  // Compute chronologically forward (oldest first) to compute running balance, then reverse
  const ledgerEntries = useMemo((): LedgerEntry[] => {
    // 1. Group Inward Receipts by challan_no & date
    interface InwardGroup {
      key: string
      date: string
      challan_no: string
      totalGross: number
      totalTare: number
      totalNet: number
      totalRola: number
      bagsCount: number
      receipts: ReceiptWithParty[]
    }

    const inwardGroupsMap: Record<string, InwardGroup> = {}
    partyReceipts.forEach((r) => {
      const chClean = r.challan_no?.trim() || ''
      const key = chClean
        ? `ch:${chClean}:${r.date}`
        : `noch:${r.date}:${(r as { created_at?: string }).created_at?.slice(0, 16) || r.id}`

      if (!inwardGroupsMap[key]) {
        inwardGroupsMap[key] = {
          key,
          date: r.date,
          challan_no: chClean,
          totalGross: 0,
          totalTare: 0,
          totalNet: 0,
          totalRola: 0,
          bagsCount: 0,
          receipts: [],
        }
      }
      const g = inwardGroupsMap[key]
      const gross = Number(r.gross_weight) || 0
      const tare = Number(r.tare_weight) || 0
      const net =
        r.net_weight !== null && r.net_weight !== undefined
          ? Number(r.net_weight)
          : Math.max(0, gross - tare)

      g.totalGross += gross
      g.totalTare += tare
      g.totalNet += net
      g.totalRola += Number(r.rola_count) || 0
      g.bagsCount += 1
      g.receipts.push(r)
    })

    // 2. Group Outward Dispatches by challan_no & date
    interface OutwardGroup {
      key: string
      date: string
      challan_no: string
      totalGross: number
      totalNet: number
      totalAmount: number
      totalRola: number
      valBagsCount: number
      distinctTars: string[]
      allKali: boolean
      dispatches: DispatchWithParty[]
    }

    const outwardGroupsMap: Record<string, OutwardGroup> = {}
    partyDispatches.forEach((d) => {
      const chClean = d.challan_no?.trim() || ''
      const key = chClean
        ? `ch:${chClean}:${d.date}`
        : `noch:${d.date}:${(d as { created_at?: string }).created_at?.slice(0, 16) || d.id}`

      if (!outwardGroupsMap[key]) {
        outwardGroupsMap[key] = {
          key,
          date: d.date,
          challan_no: chClean,
          totalGross: 0,
          totalNet: 0,
          totalAmount: 0,
          totalRola: 0,
          valBagsCount: 0,
          distinctTars: [],
          allKali: true,
          dispatches: [],
        }
      }
      const g = outwardGroupsMap[key]
      const isKali = d.dispatch_type === 'Kali' || d.dispatch_type === 'Rola'
      if (!isKali) {
        g.allKali = false
        g.valBagsCount += 1
      }
      g.totalGross += Number(d.bore_gross_weight) || 0
      g.totalNet += Number(d.net_val_weight || 0)
      g.totalAmount += Number(d.amount) || 0
      g.totalRola += Number(d.rola_count) || 0
      if (d.cord_count) {
        const cleanTar = `${String(d.cord_count).replace(/\s*tar/gi, '').trim()} Tar`
        if (!g.distinctTars.includes(cleanTar)) {
          g.distinctTars.push(cleanTar)
        }
      }
      g.dispatches.push(d)
    })

    // 3. Combine into unified chronological raw list
    type RawItem =
      | { date: string; type: 'receipt'; group: InwardGroup }
      | { date: string; type: 'dispatch'; group: OutwardGroup }
      | { date: string; type: 'payment'; payment: PaymentWithParty }

    const rawList: RawItem[] = [
      ...Object.values(inwardGroupsMap).map((g) => ({ date: g.date, type: 'receipt' as const, group: g })),
      ...Object.values(outwardGroupsMap).map((g) => ({ date: g.date, type: 'dispatch' as const, group: g })),
      ...partyPayments.map((p) => ({ date: p.date, type: 'payment' as const, payment: p })),
    ]

    // Sort ascending by date for chronological running balance calculation
    rawList.sort((a, b) => a.date.localeCompare(b.date))

    let runningBal = 0
    const entries: LedgerEntry[] = []

    for (const item of rawList) {
      if (item.type === 'receipt') {
        const g = item.group
        entries.push({
          id: `r-${g.key}`,
          date: g.date,
          type: 'receipt',
          title: 'Kasab Received (Inward)',
          reference: g.challan_no ? `Ch. #${g.challan_no}` : 'No Challan',
          details:
            g.bagsCount > 1
              ? `${g.bagsCount} Bags • Gross: ${fmtKg(g.totalGross)} • Net: ${fmtKg(g.totalNet)}${g.totalRola > 0 ? ` • Rola: ${g.totalRola} pcs` : ''}`
              : `Gross: ${fmtKg(g.totalGross)} • Net: ${fmtKg(g.totalNet)}${g.totalRola > 0 ? ` • Rola: ${g.totalRola} pcs` : ''}`,
          badgeLabel: g.challan_no ? `Ch. #${g.challan_no}` : 'Receipt',
          badgeClass:
            'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300 border border-indigo-200/70 dark:border-indigo-800/60',
          debit: 0,
          credit: 0,
          weight: g.totalNet,
          runningBalance: runningBal,
          raw: g.receipts[0],
        })
      } else if (item.type === 'dispatch') {
        const g = item.group
        runningBal += g.totalAmount
        const tarStr = g.distinctTars.join(', ')
        entries.push({
          id: `d-${g.key}`,
          date: g.date,
          type: 'dispatch',
          title: g.allKali ? 'Rola Return Dispatched' : 'Val Dispatched (Outward)',
          reference: g.challan_no ? `Ch. #${g.challan_no}` : 'No Challan',
          details: g.allKali
            ? `Rola Return: ${g.totalRola} pcs`
            : g.dispatches.length > 1
            ? `${g.valBagsCount} Val Bags${g.totalRola > 0 ? ` + ${g.totalRola} Rola` : ''} • Gross: ${fmtKg(g.totalGross)} • Net: ${fmtKg(g.totalNet)}${tarStr ? ` • ${tarStr}` : ''}`
            : `${tarStr ? `${tarStr} • ` : ''}Gross: ${fmtKg(g.totalGross)} • Net: ${fmtKg(g.totalNet)}${g.totalRola > 0 ? ` • Rola: ${g.totalRola} pcs` : ''}`,
          badgeLabel: g.challan_no ? `Ch. #${g.challan_no}` : 'Dispatch',
          badgeClass:
            'bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200/70 dark:border-amber-800/60',
          debit: g.totalAmount,
          credit: 0,
          weight: g.totalNet || g.totalGross || 0,
          runningBalance: runningBal,
          raw: g.dispatches[0],
        })
      } else if (item.type === 'payment') {
        const p = item.payment
        const amt = Number(p.amount) || 0
        runningBal -= amt
        const parsed = parsePaymentNote(p.note)
        entries.push({
          id: `p-${p.id}`,
          date: p.date,
          type: 'payment',
          title: 'Payment Received',
          reference: parsed.reference,
          details: parsed.reference,
          badgeLabel: parsed.mode,
          badgeClass: parsed.badgeClass,
          debit: 0,
          credit: amt,
          weight: 0,
          runningBalance: runningBal,
          raw: p,
        })
      }
    }

    // Return newest first for display
    return entries.reverse()
  }, [partyReceipts, partyDispatches, partyPayments])

  if (!isOpen || !party) return null

  const safeStats: PartyStats = stats || {
    rolaPending: 0,
    receivable: totalBilled,
    received: totalReceived,
    balance: totalBilled - totalReceived,
    totalReceivedWeight: totalInwardKg,
    unprocessedKasabWeight: Math.max(0, totalInwardKg - totalOutwardKg),
    totalDispatchWeight: totalOutwardKg,
    totalDispatchValue: totalBilled,
  }

  // Export Statement as CSV
  const handleExportStatementCSV = () => {
    const headers = [
      'Date',
      'Transaction Type',
      'Reference / Mode',
      'Details',
      'Billed (INR)',
      'Received (INR)',
      'Weight (kg)',
      'Running Balance (INR)',
      'Status (Due/Adv)',
    ]
    const rows = [...ledgerEntries].reverse().map((e) => [
      e.date,
      e.title,
      e.type === 'payment' ? `${e.badgeLabel || 'Payment'} - ${e.reference}` : e.reference,
      e.details,
      Number(e.debit.toFixed(2)),
      Number(e.credit.toFixed(2)),
      Number(e.weight.toFixed(3)),
      Number(Math.abs(e.runningBalance).toFixed(2)),
      e.runningBalance > 0 ? 'Due' : e.runningBalance < 0 ? 'Adv' : 'Settled',
    ])

    const filename = getSanitizedFilename('Statement', party.name)
    exportRawRowsToCSV(filename, headers, rows)
  }

  const handlePrint = () => {
    if (!party) return
    shareOrPrintDocument('printable-manifest', {
      documentTitle: `Party_Statement_${party.name.replace(/[^a-zA-Z0-9_-]/g, '_')}`,
    })
  }

  if (!party) return null

  return (
    <BottomSheetModal
      isOpen={isOpen && Boolean(party)}
      onClose={onClose}
      hideHeader={true}
      hideDragHandle={true}
      maxWidth="sm:max-w-3xl"
      maxHeight="max-h-[92vh]"
      className="printable-document pb-safe"
      containerProps={{ id: 'printable-manifest' }}
      footer={
        <div className="no-print bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200/80 dark:border-slate-800 px-4 py-3 flex items-center justify-between gap-3 shrink-0">
          <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
            Total {ledgerEntries.length} transactions
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExportStatementCSV}
              className="h-10 px-4 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold transition-all cursor-pointer shadow-2xs flex items-center gap-1.5"
            >
              <Download size={14} strokeWidth={2.2} />
              <span>Export CSV</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="h-10 px-6 rounded-xl bg-slate-950 dark:bg-white text-white dark:text-slate-950 text-xs font-semibold hover:bg-slate-800 dark:hover:bg-slate-100 transition-all cursor-pointer shadow-xs active:scale-95"
            >
              Close
            </button>
          </div>
        </div>
      }
    >
      {/* Mobile Drag Indicator (hidden on desktop) */}
      <div className="no-print md:hidden pt-2.5 pb-1 flex justify-center bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800">
        <div className="w-12 h-1.5 bg-slate-300 dark:bg-slate-700 rounded-full" />
      </div>

      {/* ── Print-Only Formal Company Letterhead ───────────────── */}
      <div className="print-only p-6 border-b-2 border-slate-900 text-center space-y-1">
        <h1 className="text-xl font-black uppercase tracking-wider text-slate-900">
          {company.companyName}
        </h1>
        {company.gstin && (
          <p className="text-[11px] font-mono font-bold text-slate-700">
            GSTIN: {company.gstin}
          </p>
        )}
        {company.address && (
          <p className="text-xs text-slate-600">
            {company.address}
          </p>
        )}
        {(company.phone || company.email) && (
          <p className="text-[11px] text-slate-500">
            {company.phone ? `Phone: ${company.phone}` : ''} {company.email ? `• Email: ${company.email}` : ''}
          </p>
        )}
        <div className="pt-2">
          <span className="inline-block px-3 py-1 bg-slate-100 rounded-full text-xs font-black tracking-widest uppercase border border-slate-200">
            STATEMENT OF ACCOUNT &bull; PARTY LEDGER
          </span>
        </div>
        <div className="text-[11px] text-slate-600 pt-1 font-medium">
          Party: <strong>{party.name}</strong> {party.phone ? `(${party.phone})` : ''} &bull; Generated: {new Date().toLocaleDateString('en-IN')}
        </div>
      </div>

      {/* ── Modal Header ────────────────────────────────────────── */}
      <div className="no-print modal-header px-4 py-3 sm:px-5 sm:py-3.5 border-b border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-start justify-between gap-2.5 shrink-0">
        {/* Left: Back button in circular container + Party Info */}
        <div className="flex items-start gap-2.5 min-w-0 flex-1">
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors active:scale-95 shrink-0 cursor-pointer shadow-2xs mt-0.5"
            title="Back"
            aria-label="Back"
          >
            <ArrowLeft className="w-4.5 h-4.5 sm:w-5 sm:h-5 text-slate-700 dark:text-slate-200" strokeWidth={2.2} />
          </button>
          <div className="min-w-0 flex-1">
            <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white truncate leading-snug">
              {party.name}
            </h2>
            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mt-0.5 overflow-hidden">
              {party.phone ? (
                <a
                  href={`tel:${party.phone}`}
                  className="inline-flex items-center gap-1 font-medium hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors cursor-pointer shrink-0"
                  title={`Call ${party.phone}`}
                >
                  <Phone size={11} className="text-slate-400 shrink-0" />
                  <span>{party.phone}</span>
                </a>
              ) : null}
              {party.phone && party.address && <span className="shrink-0 text-slate-300 dark:text-slate-600">•</span>}
              {party.address && (
                <span className="inline-flex items-center gap-1 font-normal truncate min-w-0">
                  <MapPin size={11} className="text-slate-400 shrink-0" />
                  <span className="truncate">{party.address}</span>
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Right: Actions (Share, Download, Circular Close) */}
        <div className="no-print flex items-center gap-1 shrink-0 self-start mt-0.5">
          <button
            type="button"
            onClick={handlePrint}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 transition-colors cursor-pointer"
            title={isMobileDevice() ? "Share Statement" : "Print Statement"}
            aria-label={isMobileDevice() ? "Share Statement" : "Print Statement"}
          >
            {isMobileDevice() ? <Share2 size={15} strokeWidth={2.2} /> : <Printer size={15} strokeWidth={2.2} />}
          </button>
          <button
            type="button"
            onClick={handleExportStatementCSV}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 transition-colors cursor-pointer"
            title="Export Statement to CSV"
            aria-label="Export Statement to CSV"
          >
            <Download size={15} strokeWidth={2.2} />
          </button>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 transition-colors cursor-pointer active:scale-95 ml-0.5"
            title="Close"
            aria-label="Close"
          >
            <X size={16} strokeWidth={2.2} />
          </button>
        </div>
      </div>

      {/* ── Summary KPI Cards ───────────────────────────────────── */}
      <div className="p-4 sm:p-5 bg-white dark:bg-slate-900 border-b border-slate-200/80 dark:border-slate-800 shrink-0">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {/* 1. Total Inward Kasab */}
          <div className="bg-slate-50/80 dark:bg-slate-800/40 p-3 rounded-xl border border-slate-200/80 dark:border-slate-700/60">
            <span className="text-[10px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1">
              Inward Kasab
            </span>
            <div className="text-base sm:text-lg font-bold text-slate-900 dark:text-white font-mono">
              {fmtKg(totalInwardKg)}
            </div>
            <span className="text-[10px] text-slate-400 font-medium">Raw received</span>
          </div>

          {/* 2. Total Outward Val */}
          <div className="bg-slate-50/80 dark:bg-slate-800/40 p-3 rounded-xl border border-slate-200/80 dark:border-slate-700/60">
            <span className="text-[10px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1">
              Outward Val
            </span>
            <div className="text-base sm:text-lg font-bold text-slate-900 dark:text-white font-mono">
              {fmtKg(totalOutwardKg)}
            </div>
            <span className="text-[10px] text-slate-400 font-medium">Processed finish</span>
          </div>

          {/* 3. Pending Spools */}
          <div className="bg-slate-50/80 dark:bg-slate-800/40 p-3 rounded-xl border border-slate-200/80 dark:border-slate-700/60">
            <span className="text-[10px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1">
              Pending Rola
            </span>
            <div className="text-base sm:text-lg font-bold text-slate-900 dark:text-white font-mono">
              {safeStats.rolaPending} <span className="text-xs font-normal">pcs</span>
            </div>
            <span className="text-[10px] text-slate-400 font-medium">Empty returns due</span>
          </div>

          {/* 4. Running Balance (Due / Adv) */}
          <div
            className={`p-3 rounded-xl border ${
              safeStats.balance > 0
                ? 'bg-rose-50/70 dark:bg-rose-950/30 border-rose-200/80 dark:border-rose-800/60'
                : safeStats.balance < 0
                ? 'bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-200/80 dark:border-emerald-800/60'
                : 'bg-slate-50/80 dark:bg-slate-800/50 border-slate-200/80 dark:border-slate-800'
            }`}
          >
            <span
              className={`text-[10px] font-extrabold uppercase tracking-wider block mb-1 ${
                safeStats.balance > 0
                  ? 'text-rose-700 dark:text-rose-400'
                  : safeStats.balance < 0
                  ? 'text-emerald-700 dark:text-emerald-400'
                  : 'text-slate-500 dark:text-slate-400'
              }`}
            >
              {safeStats.balance > 0
                ? 'Balance Due'
                : safeStats.balance < 0
                ? 'Advance Balance'
                : 'Settled Balance'}
            </span>
            <div
              className={`text-base sm:text-lg font-black font-mono tracking-tight ${
                safeStats.balance > 0
                  ? 'text-rose-700 dark:text-rose-400'
                  : safeStats.balance < 0
                  ? 'text-emerald-700 dark:text-emerald-400'
                  : 'text-slate-900 dark:text-white'
              }`}
            >
              {safeStats.balance > 0
                ? `${fmtMoney(safeStats.balance)} Due`
                : safeStats.balance < 0
                ? `${fmtMoney(Math.abs(safeStats.balance))} Adv`
                : '₹0.00'}
            </div>
            <span className="text-[10px] text-slate-400 font-medium">
              {safeStats.balance < 0
                ? `Received: ${fmtMoney(totalReceived)}`
                : `Billed: ${fmtMoney(totalBilled)}`}
            </span>
          </div>
        </div>
      </div>

      {/* ── Detailed Ledger Table (Scrollable) ──────────────────── */}
      <div className="flex-1 overflow-y-auto no-scrollbar p-4 sm:p-5 bg-slate-50/40 dark:bg-slate-950/40">
        {ledgerEntries.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center mx-auto mb-3 text-slate-400">
              <RotateCcw size={20} />
            </div>
            <p className="text-sm text-slate-500 font-medium">
              No inward receipts, dispatches, or payments recorded for this party.
            </p>
          </div>
        ) : (
          <div>
            {/* Mobile Card Feed (Zero-H-Scroll) */}
            <div className="md:hidden print:hidden space-y-2.5">
              {ledgerEntries.map((e) => (
                <div
                  key={e.id}
                  className="bg-white dark:bg-slate-900 rounded-xl p-3.5 border border-slate-200/80 dark:border-slate-800 shadow-2xs space-y-2"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      {e.type === 'receipt' && (
                        <div className="w-6 h-6 rounded-md bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 flex items-center justify-center shrink-0">
                          <PackagePlus size={13} />
                        </div>
                      )}
                      {e.type === 'dispatch' && (
                        <div className="w-6 h-6 rounded-md bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 flex items-center justify-center shrink-0">
                          <Truck size={13} />
                        </div>
                      )}
                      {e.type === 'payment' && (
                        <div className="w-6 h-6 rounded-md bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 flex items-center justify-center shrink-0">
                          <IndianRupee size={13} />
                        </div>
                      )}
                      <span className="font-bold text-xs text-slate-900 dark:text-white truncate">
                        {e.title}
                      </span>
                    </div>
                    <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 shrink-0">
                      {fmtDate(e.date)}
                    </span>
                  </div>

                  {/* Middle: Details Strip (Clean format with single badge + reference once) */}
                  <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/60 px-2.5 py-1.5 rounded-lg border border-slate-100 dark:border-slate-800/80 gap-2">
                    {e.type === 'payment' ? (
                      <>
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold border ${e.badgeClass}`}
                        >
                          {e.badgeLabel}
                        </span>
                        <span className="font-mono text-[11px] text-slate-500 dark:text-slate-400 truncate max-w-[200px]">
                          {e.reference}
                        </span>
                      </>
                    ) : (
                      <>
                        <span className="font-mono text-[11px] font-semibold text-slate-700 dark:text-slate-300 truncate max-w-[140px]">
                          {e.reference || 'No ref'}
                        </span>
                        <span className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                          {e.details}
                        </span>
                      </>
                    )}
                  </div>

                  {/* Bottom: Transaction Amount & Balance */}
                  <div className="flex items-center justify-between pt-1 text-xs">
                    <div className="flex items-center gap-2">
                      {e.type === 'payment' && e.credit > 0 && (
                        <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                          +{fmtMoney(e.credit)} (Received)
                        </span>
                      )}
                      {e.type === 'dispatch' && e.debit > 0 && (
                        <span className="font-mono font-bold text-slate-900 dark:text-slate-100">
                          {fmtMoney(e.debit)} (Billed)
                        </span>
                      )}
                      {e.type === 'receipt' && (
                        <span className="font-mono font-medium text-indigo-600 dark:text-indigo-400">
                          {fmtKg(e.weight)} (Inward)
                        </span>
                      )}
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-slate-400 block uppercase font-medium">Balance</span>
                      <span
                        className={`font-mono font-bold ${
                          e.runningBalance > 0
                            ? 'text-rose-600 dark:text-rose-400'
                            : e.runningBalance < 0
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : 'text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        {e.runningBalance > 0
                          ? `${fmtMoney(e.runningBalance)} Due`
                          : e.runningBalance < 0
                          ? `${fmtMoney(Math.abs(e.runningBalance))} Adv`
                          : '₹0.00'}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop Table View */}
            <div className="hidden md:block print:block bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs overflow-hidden">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3">Transaction</th>
                    <th className="py-2.5 px-3">Challan / Ref</th>
                    <th className="py-2.5 px-3 text-right">Billed (₹)</th>
                    <th className="py-2.5 px-3 text-right">Received (₹)</th>
                    <th className="py-2.5 px-3 text-right">Balance (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {ledgerEntries.map((e) => (
                    <tr
                      key={e.id}
                      className="even:bg-slate-50/50 dark:even:bg-slate-800/20 hover:bg-blue-50/40 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="py-3 px-3 text-slate-600 dark:text-slate-400 font-medium whitespace-nowrap">
                        {fmtDate(e.date)}
                      </td>
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2">
                          {e.type === 'receipt' && (
                            <div className="w-6 h-6 rounded-md bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 flex items-center justify-center shrink-0">
                              <PackagePlus size={13} />
                            </div>
                          )}
                          {e.type === 'dispatch' && (
                            <div className="w-6 h-6 rounded-md bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 flex items-center justify-center shrink-0">
                              <Truck size={13} />
                            </div>
                          )}
                          {e.type === 'payment' && (
                            <div className="w-6 h-6 rounded-md bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 flex items-center justify-center shrink-0">
                              <IndianRupee size={13} />
                            </div>
                          )}
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-slate-900 dark:text-white leading-tight">
                                {e.title}
                              </span>
                              {e.type === 'payment' && e.badgeLabel && (
                                <span
                                  className={`inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-semibold border ${e.badgeClass}`}
                                >
                                  {e.badgeLabel}
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] text-slate-500 dark:text-slate-400 font-normal">
                              {e.details}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-3 text-slate-700 dark:text-slate-300 font-mono font-medium whitespace-nowrap">
                        {e.reference}
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-slate-900 dark:text-slate-100 whitespace-nowrap">
                        {e.debit > 0 ? `${fmtMoney(e.debit)} (Billed)` : '—'}
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                        {e.credit > 0 ? `+${fmtMoney(e.credit)} (Received)` : '—'}
                      </td>
                      <td
                        className={`py-3 px-3 text-right font-mono font-bold whitespace-nowrap ${
                          e.runningBalance > 0
                            ? 'text-rose-600 dark:text-rose-400'
                            : e.runningBalance < 0
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : 'text-slate-800 dark:text-slate-200'
                        }`}
                      >
                        {e.runningBalance > 0
                          ? `${fmtMoney(e.runningBalance)} Due`
                          : e.runningBalance < 0
                          ? `${fmtMoney(Math.abs(e.runningBalance))} Adv`
                          : '₹0.00'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* ── Print-Only Signature Block ──────────────────────────── */}
      <div className="print-only pt-8 pb-4 border-t-2 border-slate-900 grid grid-cols-2 gap-8 text-center text-xs page-break-inside-avoid">
        <div>
          <div className="border-b border-slate-900 h-10 w-48 mx-auto" />
          <span className="font-bold text-slate-800 block mt-1">Prepared By (Accounts)</span>
          <span className="text-[10px] text-slate-500">ValManager Ledger Engine</span>
        </div>
        <div>
          <div className="border-b border-slate-900 h-10 w-48 mx-auto" />
          <span className="font-bold text-slate-800 block mt-1">Authorized Signatory / Seal</span>
          <span className="text-[10px] text-slate-500">For {party.name}</span>
        </div>
      </div>
    </BottomSheetModal>
  )
}

export default PartyKhataModal
