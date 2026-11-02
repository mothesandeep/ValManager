import React, { useState, useMemo } from 'react'
import { Printer, X, Loader2, CalendarRange, Building2, FileText, Share2 } from 'lucide-react'
import { getCompanySettings } from '@/features/settings/utils'
import { fmtDate } from '@/utils/date'
import { fmtKg, fmtMoney } from '@/utils/format'
import { shareOrPrintDocument, isMobileDevice } from '@/utils/nativeShare'
import type { Party } from '@/features/parties/types'
import { BottomSheetModal } from '@/components/sheets/BottomSheetModal'

export interface PrintableBreakdownRow {
  description?: string
  color?: string
  twist?: string
  tar?: number | string
  bags?: number
  rola?: number
  bigRola?: number
  grossKg?: number
  tareKg?: number
  netKg: number
  rate?: number
  amount?: number
}

export interface PrintableChallanItem {
  id: string
  challanNo: string | null
  date: string
  partyName: string
  partyPhone?: string | null
  partyAddress?: string | null
  partyId?: string
  grossWeight?: number
  tareWeight?: number
  netWeight: number
  rolaCount?: number
  bigRolaCount?: number
  bagsCount?: number
  cordCount?: number | string
  twistType?: string | null
  bungariCount?: number
  bungariWeightG?: number | null
  rate?: number | null
  amount?: number
  color?: string | null
  notes?: string | null
  breakdown?: PrintableBreakdownRow[]
  openingBalance?: number
}

export type PrintViewMode = 'register' | 'statement' | 'challan' | 'voucher' | 'manifest'

export interface ChallanPrintModalProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  type: 'inward' | 'outward'
  items: PrintableChallanItem[]
  allMonthItems?: PrintableChallanItem[]
  defaultView?: PrintViewMode
  billingPeriod?: string
  selectedPartyName?: string
  parties?: Party[]
}

function formatTarLabel(tar: unknown): string {
  if (tar === null || tar === undefined || tar === '') return '—'
  const clean = String(tar).replace(/\s*tar/gi, '').trim()
  return clean ? `${clean} Tar` : '—'
}

export const ChallanPrintModal: React.FC<ChallanPrintModalProps> = ({
  isOpen,
  onClose,
  title,
  type,
  items,
  allMonthItems,
  defaultView = 'register',
  billingPeriod,
  selectedPartyName,
  parties,
}) => {
  // Normalize initial view mode
  const initialMode: 'register' | 'statement' | 'challan' = useMemo(() => {
    if (defaultView === 'manifest' || defaultView === 'register') return 'register'
    if (defaultView === 'statement') return 'statement'
    if (defaultView === 'challan' || defaultView === 'voucher') return 'challan'
    return items.length > 1 ? 'register' : 'challan'
  }, [defaultView, items.length])

  const [viewMode, setViewMode] = useState<'register' | 'statement' | 'challan'>(initialMode)
  const [isPrinting, setIsPrinting] = useState(false)

  // Sync viewMode whenever defaultView or modal open state changes
  React.useEffect(() => {
    if (defaultView === 'statement') setViewMode('statement')
    else if (defaultView === 'challan' || defaultView === 'voucher') setViewMode('challan')
    else if (defaultView === 'register' || defaultView === 'manifest') setViewMode('register')
  }, [defaultView, isOpen])

  // Company settings & bank details
  const company = getCompanySettings()

  // Full dataset for registers (prefers allMonthItems when provided)
  const registerItems = useMemo(
    () => (allMonthItems && allMonthItems.length > 0 ? allMonthItems : items),
    [allMonthItems, items]
  )

  // Unique parties available across the dataset
  const distinctParties = useMemo(() => {
    const map = new Map<string, { count: number; name: string }>()
    const dataset = registerItems.length > 0 ? registerItems : items
    for (const it of dataset) {
      const pName = it.partyName || 'Unknown Party'
      const existing = map.get(pName) || { count: 0, name: pName }
      existing.count++
      map.set(pName, existing)
    }
    return Array.from(map.values())
  }, [registerItems, items])

  // Active party selection for Party Statement view
  const [activePartyName, setActivePartyName] = useState<string>(() => {
    if (selectedPartyName && distinctParties.some((p) => p.name === selectedPartyName)) {
      return selectedPartyName
    }
    return distinctParties[0]?.name || items[0]?.partyName || ''
  })

  // Ensure activePartyName stays valid if parties change
  const currentPartyName = useMemo(() => {
    if (activePartyName && distinctParties.some((p) => p.name === activePartyName)) {
      return activePartyName
    }
    return distinctParties[0]?.name || items[0]?.partyName || ''
  }, [activePartyName, distinctParties, items])

  React.useEffect(() => {
    if (selectedPartyName && distinctParties.some((p) => p.name === selectedPartyName)) {
      setActivePartyName(selectedPartyName)
    }
  }, [selectedPartyName, distinctParties])

  // Party items for Statement view
  const statementDataset = useMemo(
    () => (allMonthItems && allMonthItems.length > 0 ? allMonthItems : items),
    [allMonthItems, items]
  )
  const partyStatementItems = useMemo(() => {
    return statementDataset.filter((it) => it.partyName === currentPartyName)
  }, [statementDataset, currentPartyName])

  // Active party entity lookup
  const activePartyObj = useMemo(() => {
    if (!parties) return null
    return parties.find((p) => p.name === currentPartyName) || null
  }, [parties, currentPartyName])

  // Financials for Statement
  const statementGross = partyStatementItems.reduce((s, it) => s + (it.grossWeight || 0), 0)
  const statementNet = partyStatementItems.reduce((s, it) => s + (it.netWeight || 0), 0)
  const statementTare = partyStatementItems.reduce((s, it) => s + (it.tareWeight || 0), 0)
  const statementAmount = partyStatementItems.reduce((s, it) => s + (it.amount || 0), 0)
  const statementOpeningBal =
    partyStatementItems[0]?.openingBalance !== undefined && partyStatementItems[0]?.openingBalance !== null
      ? Number(partyStatementItems[0].openingBalance)
      : activePartyObj && 'opening_balance' in (activePartyObj as unknown as Record<string, unknown>)
      ? Number((activePartyObj as unknown as Record<string, unknown>).opening_balance) || 0
      : 0
  const statementNetPayable = statementAmount + statementOpeningBal

  // Financials for Monthly Register
  const registerTotalGross = registerItems.reduce((s, it) => s + (it.grossWeight || 0), 0)
  const registerTotalNet = registerItems.reduce((s, it) => s + (it.netWeight || 0), 0)
  const registerTotalRola = registerItems.reduce((s, it) => s + (it.rolaCount || 0), 0)
  const registerTotalBags = registerItems.reduce((s, it) => s + (it.bagsCount || 1), 0)
  const registerTotalAmount = registerItems.reduce((s, it) => s + (it.amount || 0), 0)

  // Billing period formatting
  const effectivePeriod = useMemo(() => {
    if (billingPeriod) return billingPeriod
    const dates = registerItems.map((it) => it.date).filter(Boolean).sort()
    if (dates.length > 0) {
      return `${fmtDate(dates[0])} to ${fmtDate(dates[dates.length - 1])}`
    }
    const now = new Date()
    return now.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })
  }, [billingPeriod, registerItems])

  // Statement Code generation: STMT-YYYYMM-[PartyID]
  const statementCode = useMemo(() => {
    const now = new Date()
    const ym = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`
    const pCode = activePartyObj?.id
      ? activePartyObj.id.slice(0, 4).toUpperCase()
      : currentPartyName
          .split(' ')
          .map((w) => w[0])
          .join('')
          .toUpperCase()
          .slice(0, 4) || 'P01'
    return `STMT-${ym}-${pCode}`
  }, [activePartyObj, currentPartyName])

  if (!isOpen) return null

  const handlePrint = async () => {
    setIsPrinting(true)
    try {
      let docTitle = title || ''
      if (viewMode === 'register') {
        docTitle = `${company.companyName || 'Kasab'} - ${
          type === 'outward' ? 'Monthly Dispatch Register' : 'Monthly Receiving Register'
        } (${effectivePeriod})`
      } else if (viewMode === 'statement') {
        docTitle = `${company.companyName || 'Kasab'} - Job-Work Statement - ${currentPartyName} (${effectivePeriod})`
      } else {
        docTitle = `${company.companyName || 'Kasab'} - ${
          type === 'outward' ? 'Delivery Challans' : 'Inward Receipts'
        } Batch (${items.length})`
      }

      await shareOrPrintDocument('printable-manifest-card', {
        documentTitle: docTitle,
        filename: docTitle,
      })
    } catch (err) {
      console.error('[ChallanPrintModal] Isolated print error:', err)
    } finally {
      setIsPrinting(false)
    }
  }

  if (!isOpen) return null

  return (
    <BottomSheetModal
      isOpen={isOpen}
      onClose={onClose}
      hideHeader={true}
      hideDragHandle={true}
      maxWidth="sm:max-w-5xl"
      maxHeight="max-h-[92vh] sm:max-h-[96vh]"
      className="bg-slate-900 border-slate-800"
    >
      <div className="relative w-full bg-slate-900 flex flex-col flex-1 min-h-0 overflow-hidden">
        {/* Mobile Drag Handle (hidden on desktop) */}
        <div className="md:hidden flex justify-center pt-2.5 pb-1 bg-slate-900 shrink-0">
          <div className="w-12 h-1 bg-slate-700 rounded-full" />
        </div>

        {/* ── 1. Modal Top Bar ── */}
        <div className="no-print modal-header px-4 py-3 bg-slate-900 border-b border-slate-800 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
          {/* Left: Branding & Context Badge */}
          <div className="flex items-center gap-2.5">
            <FileText className="text-slate-400 size-5 shrink-0" />
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-white tracking-tight">Print & Export Reports</h3>
                <span className="bg-slate-800 text-slate-300 text-xs px-2 py-0.5 rounded border border-slate-700 font-mono font-medium">
                  {items.length} Selected
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-normal mt-0.5">
                {type === 'outward'
                  ? 'Commercial Job-Work Registers, Party Statements & Delivery Slips'
                  : 'Raw Kasab Inward Registers, Intake Statements & Receiving Slips'}
              </p>
            </div>
          </div>

          {/* Middle: Professional Segmented Pill Control (No Emojis) */}
          <div className="bg-slate-900/80 p-1 rounded-lg border border-slate-700/60 inline-flex items-center gap-1 self-start sm:self-auto">
            <button
              type="button"
              onClick={() => setViewMode('register')}
              className={`px-3 py-1.5 rounded-md text-xs transition-all flex items-center gap-1.5 cursor-pointer ${
                viewMode === 'register'
                  ? 'bg-slate-800 text-white shadow-sm border border-slate-600/50 font-semibold'
                  : 'text-slate-400 hover:text-white font-medium'
              }`}
            >
              <CalendarRange size={14} className="opacity-80" />
              <span>Monthly Register</span>
              <span className="bg-slate-700/60 text-slate-300 text-[10px] px-1.5 py-0.5 rounded-full ml-1 font-mono">
                {registerItems.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setViewMode('statement')}
              className={`px-3 py-1.5 rounded-md text-xs transition-all flex items-center gap-1.5 cursor-pointer ${
                viewMode === 'statement'
                  ? 'bg-slate-800 text-white shadow-sm border border-slate-600/50 font-semibold'
                  : 'text-slate-400 hover:text-white font-medium'
              }`}
            >
              <Building2 size={14} className="opacity-80" />
              <span>Party Statement</span>
              <span className="bg-slate-700/60 text-slate-300 text-[10px] px-1.5 py-0.5 rounded-full ml-1 font-mono">
                {partyStatementItems.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setViewMode('challan')}
              className={`px-3 py-1.5 rounded-md text-xs transition-all flex items-center gap-1.5 cursor-pointer ${
                viewMode === 'challan'
                  ? 'bg-slate-800 text-white shadow-sm border border-slate-600/50 font-semibold'
                  : 'text-slate-400 hover:text-white font-medium'
              }`}
            >
              <FileText size={14} className="opacity-80" />
              <span>Delivery Challans</span>
              <span className="bg-slate-700/60 text-slate-300 text-[10px] px-1.5 py-0.5 rounded-full ml-1 font-mono">
                {items.length}
              </span>
            </button>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-2 self-end sm:self-auto">
            <button
              type="button"
              onClick={handlePrint}
              disabled={isPrinting}
              className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white text-xs font-semibold px-3.5 py-1.5 rounded-lg shadow-sm flex items-center gap-1.5 active:scale-95 transition-all cursor-pointer h-9"
            >
              {isPrinting ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  <span>Preparing...</span>
                </>
              ) : isMobileDevice() ? (
                <>
                  <Share2 size={14} />
                  <span>Share / Print</span>
                </>
              ) : (
                <>
                  <Printer size={14} />
                  <span>Print Document (A4)</span>
                </>
              )}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="text-slate-400 hover:text-white hover:bg-slate-800 p-1.5 rounded-lg transition-colors cursor-pointer"
              title="Close (Esc)"
              aria-label="Close Print Preview"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* ── Context Filter Bar for Party Statement ── */}
        {viewMode === 'statement' && distinctParties.length > 1 && (
          <div className="no-print bg-slate-800/80 border-b border-slate-700/60 px-4 py-2 flex items-center justify-between text-xs text-slate-300">
            <div className="flex items-center gap-2">
              <Building2 size={14} className="text-slate-400" />
              <span className="font-semibold text-slate-200">Party Account Statement:</span>
              <select
                value={currentPartyName}
                onChange={(e) => setActivePartyName(e.target.value)}
                className="bg-slate-900 text-white font-medium rounded-md px-2.5 py-1 border border-slate-700 outline-none cursor-pointer hover:border-slate-600 focus:border-emerald-500 transition-colors text-xs"
              >
                {distinctParties.map((p) => (
                  <option key={p.name} value={p.name}>
                    {p.name} ({p.count} Challans)
                  </option>
                ))}
              </select>
            </div>
            <div className="text-[11px] font-mono text-slate-400 hidden sm:block">
              Period: <span className="text-slate-200">{effectivePeriod}</span> • Ref: <span className="text-slate-200">{statementCode}</span>
            </div>
          </div>
        )}

        {/* ── 2. Document Canvas (Authentic A4 Paper Container) ── */}
        <div className="flex-1 overflow-y-auto no-scrollbar bg-slate-200/60 p-4 sm:p-8 space-y-8">
          <div id="printable-manifest-card" className="w-full">
            {viewMode === 'register' ? (
              /* ═══════════════════════════════════════════════════════════════
                 OPTION A: MONTHLY DISPATCH REGISTER (FULL MONTH BUSINESS SUMMARY)
                 ═══════════════════════════════════════════════════════════════ */
              <div className="a4-sheet bg-white text-slate-900 border border-slate-200/90 shadow-2xl rounded-xs p-8 sm:p-10 mx-auto max-w-[210mm] print:shadow-none print:border-none print:p-0">
                {/* Header */}
                <div className="flex justify-between items-start pb-3 border-b-2 border-slate-900">
                  <div className="space-y-1">
                    <span className="text-[10px] font-mono font-bold tracking-widest text-slate-500 uppercase block">
                      Textile Job-Work Accounting & Register
                    </span>
                    <h1 className="text-2xl font-black uppercase tracking-tight text-slate-900 leading-none">
                      {company.companyName || 'KASAB VAL PROCESSORS'}
                    </h1>
                    <p className="text-[11px] text-slate-600 font-medium max-w-md leading-relaxed">
                      {company.address || 'Plot No. 42, GIDC Industrial Estate, Katargam, Surat - 395004, Gujarat'}
                    </p>
                    <div className="flex flex-wrap items-center gap-3 text-[10.5px] text-slate-600 font-mono pt-0.5">
                      <span>GSTIN: <strong className="text-slate-900">{company.gstin || '24AABCK1234F1Z5'}</strong></span>
                      <span>•</span>
                      <span>Tel: <strong className="text-slate-900">{company.phone || '+91 98251 00000'}</strong></span>
                    </div>
                  </div>

                  {/* Clean Tabular Metadata Box */}
                  <div className="border border-slate-900 rounded-xs overflow-hidden shrink-0 w-60 text-[11px] font-mono">
                    <div className="bg-slate-900 text-white px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider flex justify-between items-center">
                      <span>{type === 'outward' ? 'DISPATCH REGISTER' : 'RECEIVING REGISTER'}</span>
                      <span className="text-slate-300">#REG-{String(registerItems.length).padStart(3, '0')}</span>
                    </div>
                    <div className="divide-y divide-slate-200 bg-slate-50/70">
                      <div className="px-2.5 py-1 flex justify-between">
                        <span className="text-slate-500">Period:</span>
                        <span className="font-semibold text-slate-900 truncate max-w-[140px]" title={effectivePeriod}>
                          {effectivePeriod}
                        </span>
                      </div>
                      <div className="px-2.5 py-1 flex justify-between">
                        <span className="text-slate-500">Date Printed:</span>
                        <span className="font-semibold text-slate-900">{fmtDate(new Date().toISOString())}</span>
                      </div>
                      <div className="px-2.5 py-1 flex justify-between">
                        <span className="text-slate-500">Total Lots:</span>
                        <span className="font-bold text-slate-900">{registerItems.length} Challan(s)</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Document Title Banner */}
                <div className="my-3 py-1.5 px-3 bg-slate-100 border border-slate-300 flex justify-between items-center">
                  <h2 className="text-xs font-black uppercase tracking-wider text-slate-900 font-mono">
                    {type === 'outward'
                      ? 'MONTHLY DISPATCH REGISTER (Jari Kasab Val Processing)'
                      : 'MONTHLY RECEIVING REGISTER (Raw Kasab Intake Processing)'}
                  </h2>
                  <span className="text-[10px] font-mono text-slate-600">
                    Billing Period: <strong>{effectivePeriod}</strong> | Total Lots: <strong>{registerItems.length}</strong>
                  </span>
                </div>

                {/* Summary Metric Strip at Top */}
                <div className="grid grid-cols-3 gap-3 my-3">
                  <div className="border border-slate-900 bg-slate-50/60 p-2.5">
                    <span className="text-[9.5px] font-mono font-bold uppercase tracking-wider text-slate-600 block">
                      {type === 'outward' ? 'TOTAL DISPATCHED (KG)' : 'TOTAL RAW KASAB RECEIVED (KG)'}
                    </span>
                    <span className="text-lg font-black font-mono tracking-tight text-slate-950 tabular-nums block mt-0.5">
                      {fmtKg(registerTotalNet)}
                    </span>
                    <span className="text-[9px] text-slate-500 font-mono">Net finished weight delivered</span>
                  </div>

                  <div className="border border-slate-900 bg-slate-50/60 p-2.5">
                    <span className="text-[9.5px] font-mono font-bold uppercase tracking-wider text-slate-600 block">
                      {type === 'outward' ? 'TOTAL ROLA RETURNED' : 'TOTAL ROLA INTAKE'}
                    </span>
                    <span className="text-lg font-black font-mono tracking-tight text-slate-950 tabular-nums block mt-0.5">
                      {type === 'outward'
                        ? registerTotalGross > 0
                          ? fmtKg(registerTotalGross)
                          : registerTotalRola > 0
                          ? `${registerTotalRola} pcs`
                          : '—'
                        : `${registerTotalRola} pcs`}
                    </span>
                    <span className="text-[9px] text-slate-500 font-mono">
                      {type === 'outward'
                        ? `${registerTotalRola} spools returned with dispatch`
                        : `${registerTotalBags} Bags total intake`}
                    </span>
                  </div>

                  <div className="border border-slate-900 bg-slate-50/60 p-2.5">
                    <span className="text-[9.5px] font-mono font-bold uppercase tracking-wider text-slate-600 block">
                      {type === 'outward' ? 'TOTAL JOB-WORK AMOUNT (₹)' : 'TOTAL LOTS & PACKAGING'}
                    </span>
                    <span className="text-lg font-black font-mono tracking-tight text-slate-950 tabular-nums block mt-0.5">
                      {type === 'outward' ? fmtMoney(registerTotalAmount) : `${registerTotalBags} Bags / ${registerItems.length} Lots`}
                    </span>
                    <span className="text-[9px] text-slate-500 font-mono">
                      {type === 'outward' ? 'Sum of job-work twisting charges' : 'Standard verified bag lots'}
                    </span>
                  </div>
                </div>

                {/* Table Grid: Fixed ERP table layout with solid hairline borders */}
                <table
                  style={{ tableLayout: 'fixed', width: '100%', borderCollapse: 'collapse' }}
                  className="w-full text-left border-collapse text-[11px] mt-2 register-table manifest-table"
                >
                  {type === 'outward' ? (
                    <colgroup>
                      <col style={{ width: '4%' }} />
                      <col style={{ width: '11%' }} />
                      <col style={{ width: '11%' }} />
                      <col style={{ width: '24%' }} />
                      <col style={{ width: '9%' }} />
                      <col style={{ width: '13%' }} />
                      <col style={{ width: '11%' }} />
                      <col style={{ width: '7%' }} />
                      <col style={{ width: '10%' }} />
                    </colgroup>
                  ) : (
                    <colgroup>
                      <col style={{ width: '4%' }} />
                      <col style={{ width: '12%' }} />
                      <col style={{ width: '12%' }} />
                      <col style={{ width: '28%' }} />
                      <col style={{ width: '8%' }} />
                      <col style={{ width: '10%' }} />
                      <col style={{ width: '13%' }} />
                      <col style={{ width: '13%' }} />
                    </colgroup>
                  )}
                  <thead>
                    <tr className="border-t-2 border-b-2 border-slate-900 bg-slate-100 text-slate-900 font-bold uppercase tracking-wider text-[10px]">
                      <th className="py-2 px-1 text-center border-r border-slate-300">#</th>
                      <th className="py-2 px-2 text-center border-r border-slate-300 font-mono">DATE</th>
                      <th className="py-2 px-2 text-left border-r border-slate-300 font-mono">CHALLAN #</th>
                      <th className="py-2 px-2 text-left border-r border-slate-300">PARTY NAME</th>
                      {type === 'outward' ? (
                        <>
                          <th className="py-2 px-1 text-center border-r border-slate-300 font-mono">CORD/TAR</th>
                          <th className="py-2 px-2 text-right border-r border-slate-300 font-mono">NET VAL (KG)</th>
                          <th className="py-2 px-2 text-right border-r border-slate-300 font-mono">ROLA RETURN</th>
                          <th className="py-2 px-2 text-right border-r border-slate-300 font-mono">RATE (₹)</th>
                          <th className="py-2 px-2 text-right font-mono">AMOUNT (₹)</th>
                        </>
                      ) : (
                        <>
                          <th className="py-2 px-1 text-center border-r border-slate-300 font-mono">BAGS</th>
                          <th className="py-2 px-2 text-right border-r border-slate-300 font-mono">ROLA (PCS)</th>
                          <th className="py-2 px-2 text-right border-r border-slate-300 font-mono">GROSS WT (KG)</th>
                          <th className="py-2 px-2 text-right font-mono">NET KASAB (KG)</th>
                        </>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {registerItems.map((it, idx) => (
                      <tr key={it.id || idx} className="hover:bg-slate-50/80 transition-colors page-break-inside-avoid break-inside-avoid border-b border-slate-200">
                        <td className="py-1.5 px-1 text-center font-mono text-slate-500 border-r border-slate-200 whitespace-nowrap">{idx + 1}</td>
                        <td className="py-1.5 px-2 text-center font-mono text-slate-700 border-r border-slate-200 whitespace-nowrap">
                          {fmtDate(it.date)}
                        </td>
                        <td className="py-1.5 px-2 text-left font-mono font-bold text-slate-900 border-r border-slate-200 whitespace-nowrap">
                          {it.challanNo ? `#${it.challanNo}` : '—'}
                        </td>
                        <td className="py-1.5 px-2 text-left font-semibold text-slate-900 border-r border-slate-200 truncate" title={it.partyName}>
                          {it.partyName}
                        </td>
                        {type === 'outward' ? (
                          <>
                            <td className="py-1.5 px-1 text-center font-mono text-slate-700 border-r border-slate-200 whitespace-nowrap">
                              {it.cordCount ? formatTarLabel(it.cordCount) : '—'}
                            </td>
                            <td className="py-1.5 px-2 text-right font-mono font-bold text-slate-900 tabular-nums border-r border-slate-200 whitespace-nowrap">
                              {fmtKg(it.netWeight)}
                            </td>
                            <td className="py-1.5 px-2 text-right font-mono text-slate-700 tabular-nums border-r border-slate-200 whitespace-nowrap">
                              {it.grossWeight && it.grossWeight > 0 ? (
                                fmtKg(it.grossWeight)
                              ) : it.rolaCount && it.rolaCount > 0 ? (
                                `${it.rolaCount} pcs`
                              ) : (
                                <span className="text-slate-400 block text-center">—</span>
                              )}
                            </td>
                            <td className="py-1.5 px-2 text-right font-mono text-slate-700 tabular-nums border-r border-slate-200 whitespace-nowrap">
                              {it.rate ? `₹${it.rate}` : '—'}
                            </td>
                            <td className="py-1.5 px-2 text-right font-mono font-bold text-slate-950 tabular-nums whitespace-nowrap">
                              {it.amount !== undefined && it.amount !== null && it.amount > 0 ? fmtMoney(it.amount) : '—'}
                            </td>
                          </>
                        ) : (
                          <>
                            <td className="py-1.5 px-1 text-center font-mono text-slate-700 border-r border-slate-200 whitespace-nowrap">
                              {it.bagsCount || 1}
                            </td>
                            <td className="py-1.5 px-2 text-right font-mono text-slate-700 tabular-nums border-r border-slate-200 whitespace-nowrap">
                              {it.rolaCount && it.rolaCount > 0 ? `${it.rolaCount} pcs` : '—'}
                            </td>
                            <td className="py-1.5 px-2 text-right font-mono text-slate-700 tabular-nums border-r border-slate-200 whitespace-nowrap">
                              {fmtKg(it.grossWeight || 0)}
                            </td>
                            <td className="py-1.5 px-2 text-right font-mono font-bold text-slate-900 tabular-nums whitespace-nowrap">
                              {fmtKg(it.netWeight)}
                            </td>
                          </>
                        )}
                      </tr>
                    ))}
                  </tbody>
                  {/* Clean High-Contrast Footer Total Row */}
                  <tfoot>
                    <tr className="border-t-2 border-b-2 border-slate-900 bg-slate-100 font-bold text-slate-900 text-xs page-break-inside-avoid break-inside-avoid">
                      <td colSpan={4} className="py-2.5 px-2.5 uppercase tracking-wider text-left font-mono font-bold whitespace-nowrap border-r border-slate-300">
                        MONTHLY REGISTER TOTAL ({registerItems.length} {registerItems.length === 1 ? 'RECORD' : 'RECORDS'})
                      </td>
                      {type === 'outward' ? (
                        <>
                          <td className="py-2.5 px-1 text-center font-mono text-slate-400 border-r border-slate-300 whitespace-nowrap">—</td>
                          <td className="py-2.5 px-2 text-right font-mono font-black text-slate-900 text-xs tabular-nums border-r border-slate-300 whitespace-nowrap">
                            {fmtKg(registerTotalNet)}
                          </td>
                          <td className="py-2.5 px-2 text-right font-mono font-bold text-slate-800 text-xs tabular-nums border-r border-slate-300 whitespace-nowrap">
                            {registerTotalGross > 0
                              ? fmtKg(registerTotalGross)
                              : registerTotalRola > 0
                              ? `${registerTotalRola} pcs`
                              : '—'}
                          </td>
                          <td className="py-2.5 px-2 text-right font-mono text-slate-400 text-xs border-r border-slate-300 whitespace-nowrap">—</td>
                          <td className="py-2.5 px-2 text-right font-mono font-black text-slate-950 text-xs tabular-nums whitespace-nowrap">
                            {fmtMoney(registerTotalAmount)}
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="py-2.5 px-1 text-center font-mono font-bold text-slate-900 text-xs border-r border-slate-300 whitespace-nowrap">
                            {registerTotalBags}
                          </td>
                          <td className="py-2.5 px-2 text-right font-mono font-bold text-slate-800 text-xs tabular-nums border-r border-slate-300 whitespace-nowrap">
                            {registerTotalRola > 0 ? `${registerTotalRola} pcs` : '—'}
                          </td>
                          <td className="py-2.5 px-2 text-right font-mono font-bold text-slate-800 text-xs tabular-nums border-r border-slate-300 whitespace-nowrap">
                            {fmtKg(registerTotalGross)}
                          </td>
                          <td className="py-2.5 px-2 text-right font-mono font-black text-slate-900 text-xs tabular-nums whitespace-nowrap">
                            {fmtKg(registerTotalNet)}
                          </td>
                        </>
                      )}
                    </tr>
                  </tfoot>
                </table>

                {/* Signatures: Balanced clean signature blocks */}
                <div style={{ marginTop: '36px' }} className="pt-6 border-t border-slate-200 grid grid-cols-3 gap-8 text-center text-xs avoid-break page-break-inside-avoid">
                  <div>
                    <div className="border-b border-dashed border-slate-400 h-8 w-40 mx-auto" />
                    <span className="font-bold text-slate-800 block mt-1.5 text-xs">Prepared By</span>
                    <span className="text-[10px] text-slate-500 font-mono">
                      {type === 'outward' ? 'Dispatch / Gate Clerk' : 'Receiving Weighbridge'}
                    </span>
                  </div>
                  <div>
                    <div className="border-b border-dashed border-slate-400 h-8 w-40 mx-auto" />
                    <span className="font-bold text-slate-800 block mt-1.5 text-xs">Checked By</span>
                    <span className="text-[10px] text-slate-500 font-mono">Quality / Stock Auditor</span>
                  </div>
                  <div>
                    <div className="border-b border-dashed border-slate-400 h-8 w-40 mx-auto" />
                    <span className="font-bold text-slate-800 block mt-1.5 text-xs">Authorized Signatory</span>
                    <span className="text-[10px] text-slate-500 font-mono">For {company.companyName || 'KASAB VAL PROCESSORS'}</span>
                  </div>
                </div>
              </div>
            ) : viewMode === 'statement' ? (
              /* ═══════════════════════════════════════════════════════════════
                 OPTION B: PARTY MONTHLY JOB-WORK STATEMENT / BILL (LEDGER)
                 ═══════════════════════════════════════════════════════════════ */
              <div className="a4-sheet bg-white text-slate-900 border border-slate-200/90 shadow-2xl rounded-xs p-8 sm:p-10 mx-auto max-w-[210mm] print:shadow-none print:border-none print:p-0">
                {/* Header */}
                <div className="flex justify-between items-start pb-3 border-b-2 border-slate-900">
                  <div className="space-y-1">
                    <span className="text-[9.5px] font-mono font-bold tracking-widest text-slate-500 uppercase block">
                      Commercial Textile Job-Work Statement
                    </span>
                    <h1 className="text-2xl font-black uppercase tracking-tight text-slate-900 leading-none">
                      {company.companyName || 'KASAB VAL PROCESSORS'}
                    </h1>
                    <p className="text-[11px] text-slate-600 font-medium max-w-md leading-relaxed">
                      {company.address || 'Plot No. 42, GIDC Industrial Estate, Katargam, Surat - 395004, Gujarat'}
                    </p>
                    <div className="flex flex-wrap items-center gap-3 text-[10.5px] text-slate-600 font-mono pt-0.5">
                      <span>GSTIN: <strong className="text-slate-900">{company.gstin || '24AABCK1234F1Z5'}</strong></span>
                      <span>•</span>
                      <span>Tel: <strong className="text-slate-900">{company.phone || '+91 98251 00000'}</strong></span>
                      <span>•</span>
                      <span>Email: <strong className="text-slate-900">{company.email || 'accounts@kasabval.com'}</strong></span>
                    </div>
                  </div>

                  {/* Document Badge & Metadata */}
                  <div className="border border-slate-900 rounded-xs overflow-hidden shrink-0 w-64 text-[11px] font-mono">
                    <div className="bg-slate-900 text-white px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider flex justify-between items-center">
                      <span>JOB-WORK BILL / STATEMENT</span>
                      <span className="text-emerald-300 font-bold">SEC 143</span>
                    </div>
                    <div className="divide-y divide-slate-200 bg-slate-50/70">
                      <div className="px-2.5 py-1 flex justify-between">
                        <span className="text-slate-500">Statement No:</span>
                        <span className="font-bold text-slate-900">{statementCode}</span>
                      </div>
                      <div className="px-2.5 py-1 flex justify-between">
                        <span className="text-slate-500">Statement Period:</span>
                        <span className="font-semibold text-slate-900">{effectivePeriod}</span>
                      </div>
                      <div className="px-2.5 py-1 flex justify-between">
                        <span className="text-slate-500">Statement Date:</span>
                        <span className="font-semibold text-slate-900">{fmtDate(new Date().toISOString())}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Party & Consignee 2-Column Info Grid */}
                <div className="border border-slate-900 my-3 grid grid-cols-2 text-xs divide-x divide-slate-900">
                  {/* Left: To / Party Address */}
                  <div className="p-3 space-y-1 bg-slate-50/40">
                    <span className="text-[9px] font-bold uppercase tracking-widest text-slate-500 block">
                      STATEMENT ISSUED TO (PARTY / CONSIGNEE):
                    </span>
                    <h2 className="text-base font-black tracking-tight text-slate-900 uppercase">
                      {currentPartyName}
                    </h2>
                    {(activePartyObj?.phone || partyStatementItems[0]?.partyPhone) && (
                      <p className="text-[11px] text-slate-700">
                        Contact: <strong className="font-mono">{activePartyObj?.phone || partyStatementItems[0]?.partyPhone}</strong>
                      </p>
                    )}
                    <p className="text-[11px] text-slate-600 leading-snug">
                      {activePartyObj?.address || partyStatementItems[0]?.partyAddress || 'Surat, Gujarat, India'}
                    </p>
                    <p className="text-[10px] font-mono text-slate-500 pt-0.5">
                      State: <strong>24 (Gujarat)</strong> • Nature: <strong>Job-Work Process Consignee</strong>
                    </p>
                  </div>

                  {/* Right: Statement Specifics & Summary Strip */}
                  <div className="p-3 grid grid-cols-2 gap-2 text-[11px] bg-slate-50/40 font-mono">
                    <div>
                      <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500 font-sans block">
                        Processing Service:
                      </span>
                      <span className="text-xs font-bold text-slate-900 font-sans block">
                        {type === 'outward' ? 'Jari Kasab Val Twisting' : 'Raw Kasab Intake & Weighing'}
                      </span>
                    </div>
                    <div>
                      <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500 font-sans block">
                        Total Challans:
                      </span>
                      <span className="text-xs font-bold text-slate-900 block">
                        {partyStatementItems.length} Lot(s) Billed
                      </span>
                    </div>
                    <div>
                      <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500 font-sans block">
                        Total Net Weight:
                      </span>
                      <span className="text-sm font-black text-slate-900 block">
                        {fmtKg(statementNet)}
                      </span>
                    </div>
                    <div>
                      <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500 font-sans block">
                        Total Charges:
                      </span>
                      <span className="text-sm font-black text-emerald-800 block">
                        {fmtMoney(statementAmount)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Day-by-Day Table of all Challans Delivered to this Party in that Month */}
                <table
                  style={{ tableLayout: 'fixed', width: '100%', borderCollapse: 'collapse' }}
                  className="w-full text-left border-collapse text-[11px] mt-2 statement-table manifest-table"
                >
                  <colgroup>
                    <col style={{ width: '4%' }} />
                    <col style={{ width: '11%' }} />
                    <col style={{ width: '12%' }} />
                    <col style={{ width: '23%' }} />
                    <col style={{ width: '12%' }} />
                    <col style={{ width: '10%' }} />
                    <col style={{ width: '13%' }} />
                    <col style={{ width: '6%' }} />
                    <col style={{ width: '9%' }} />
                  </colgroup>
                  <thead>
                    <tr className="border-t-2 border-b-2 border-slate-900 bg-slate-100 text-slate-900 font-bold uppercase tracking-wider text-[10px]">
                      <th className="py-2 px-1 text-center border-r border-slate-300">#</th>
                      <th className="py-2 px-2 text-center border-r border-slate-300 font-mono">DATE</th>
                      <th className="py-2 px-2 text-left border-r border-slate-300 font-mono">CHALLAN #</th>
                      <th className="py-2 px-2 text-left border-r border-slate-300">PARTICULARS / YARN SPEC</th>
                      <th className="py-2 px-2 text-right border-r border-slate-300 font-mono">GROSS WT</th>
                      <th className="py-2 px-2 text-right border-r border-slate-300 font-mono">TARE DED.</th>
                      <th className="py-2 px-2 text-right border-r border-slate-300 font-mono">NET VAL (KG)</th>
                      <th className="py-2 px-1 text-right border-r border-slate-300 font-mono">RATE</th>
                      <th className="py-2 px-2 text-right font-mono">AMOUNT (₹)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {partyStatementItems.map((it, idx) => (
                      <tr key={it.id || idx} className="hover:bg-slate-50/80 transition-colors page-break-inside-avoid break-inside-avoid border-b border-slate-200">
                        <td className="py-1.5 px-1 text-center font-mono text-slate-500 border-r border-slate-200 whitespace-nowrap">{idx + 1}</td>
                        <td className="py-1.5 px-2 text-center font-mono text-slate-700 border-r border-slate-200 whitespace-nowrap">
                          {fmtDate(it.date)}
                        </td>
                        <td className="py-1.5 px-2 text-left font-mono font-bold text-slate-900 border-r border-slate-200 whitespace-nowrap">
                          {it.challanNo ? `#${it.challanNo}` : '—'}
                        </td>
                        <td className="py-1.5 px-2 text-left text-slate-800 border-r border-slate-200 truncate" title={it.notes || undefined}>
                          {it.cordCount ? `${formatTarLabel(it.cordCount)} Kasab Val Finished` : 'Val Twisted Processing'}
                          {it.twistType ? ` (${it.twistType})` : ''}
                        </td>
                        <td className="py-1.5 px-2 text-right font-mono text-slate-700 tabular-nums border-r border-slate-200 whitespace-nowrap">
                          {it.grossWeight ? fmtKg(it.grossWeight) : '—'}
                        </td>
                        <td className="py-1.5 px-2 text-right font-mono text-slate-700 tabular-nums border-r border-slate-200 whitespace-nowrap">
                          {it.tareWeight && it.tareWeight > 0 ? fmtKg(it.tareWeight) : '0.000 kg'}
                        </td>
                        <td className="py-1.5 px-2 text-right font-mono font-bold text-slate-900 tabular-nums border-r border-slate-200 whitespace-nowrap">
                          {fmtKg(it.netWeight)}
                        </td>
                        <td className="py-1.5 px-1 text-right font-mono text-slate-700 tabular-nums border-r border-slate-200 whitespace-nowrap">
                          {it.rate ? `₹${it.rate}` : '—'}
                        </td>
                        <td className="py-1.5 px-2 text-right font-mono font-bold text-slate-950 tabular-nums whitespace-nowrap">
                          {it.amount !== undefined && it.amount !== null && it.amount > 0 ? fmtMoney(it.amount) : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  {/* Totals Row */}
                  <tfoot>
                    <tr className="border-t-2 border-b-2 border-slate-900 bg-slate-100 font-bold text-slate-900 text-xs page-break-inside-avoid break-inside-avoid">
                      <td colSpan={4} className="py-2.5 px-2.5 uppercase tracking-wider text-left font-mono font-bold whitespace-nowrap border-r border-slate-300">
                        STATEMENT TOTAL ({partyStatementItems.length} {partyStatementItems.length === 1 ? 'CHALLAN' : 'CHALLANS'})
                      </td>
                      <td className="py-2.5 px-2 text-right font-mono font-bold text-slate-800 text-xs tabular-nums border-r border-slate-300 whitespace-nowrap">
                        {fmtKg(statementGross)}
                      </td>
                      <td className="py-2.5 px-2 text-right font-mono font-bold text-slate-800 text-xs tabular-nums border-r border-slate-300 whitespace-nowrap">
                        {fmtKg(statementTare)}
                      </td>
                      <td className="py-2.5 px-2 text-right font-mono font-black text-slate-900 text-xs tabular-nums border-r border-slate-300 whitespace-nowrap">
                        {fmtKg(statementNet)}
                      </td>
                      <td className="py-2.5 px-1 text-center font-mono text-slate-400 text-xs border-r border-slate-300 whitespace-nowrap">—</td>
                      <td className="py-2.5 px-2 text-right font-mono font-black text-slate-950 text-xs tabular-nums whitespace-nowrap">
                        {fmtMoney(statementAmount)}
                      </td>
                    </tr>
                  </tfoot>
                </table>

                {/* Financial Summary Card: Gross, Net, Job-work Charges, Previous Balance, Net Payable */}
                <div className="grid grid-cols-2 gap-4 border border-slate-900 p-3.5 my-3 bg-slate-50/70">
                  <div className="space-y-1.5 text-xs text-slate-700">
                    <span className="text-[9.5px] font-bold uppercase tracking-wider text-slate-600 block">
                      Production & Weight Summary:
                    </span>
                    <div className="flex justify-between border-b border-slate-200 pb-0.5">
                      <span>Total Processed Gross Weight:</span>
                      <strong className="font-mono text-slate-900">{fmtKg(statementGross)}</strong>
                    </div>
                    <div className="flex justify-between border-b border-slate-200 pb-0.5">
                      <span>Certified Net Val Delivered:</span>
                      <strong className="font-mono text-slate-900">{fmtKg(statementNet)}</strong>
                    </div>
                    <div className="flex justify-between text-slate-500">
                      <span>Total Spool / Tare Deductions:</span>
                      <span className="font-mono">{fmtKg(statementTare)}</span>
                    </div>
                  </div>

                  <div className="border-l border-slate-300 pl-4 space-y-1.5 text-xs">
                    <span className="text-[9.5px] font-bold uppercase tracking-wider text-slate-600 block">
                      Financial Account Settlement:
                    </span>
                    <div className="flex justify-between border-b border-slate-200 pb-0.5">
                      <span>Current Month Job-Work Charges:</span>
                      <strong className="font-mono text-slate-900">{fmtMoney(statementAmount)}</strong>
                    </div>
                    <div className="flex justify-between border-b border-slate-200 pb-0.5">
                      <span>Previous / Opening Ledger Balance:</span>
                      <strong className="font-mono text-slate-700">{fmtMoney(statementOpeningBal)}</strong>
                    </div>
                    <div className="flex justify-between items-center pt-1 bg-slate-900 text-white px-2 py-1.5 rounded-xs mt-1">
                      <span className="font-bold text-[11px] uppercase tracking-wider">NET PAYABLE AMOUNT:</span>
                      <span className="text-base font-black font-mono tracking-tight text-white">
                        {fmtMoney(statementNetPayable)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Bank Account / UPI Details Footer */}
                <div className="border border-slate-900 bg-slate-50/50 p-3 mt-3 text-[10.5px]">
                  <div className="text-[9.5px] font-bold text-slate-800 uppercase tracking-wider mb-1 flex items-center justify-between border-b border-slate-200 pb-1">
                    <span>BANK REMITTANCE & PAYMENT DETAILS (NEFT / RTGS / IMPS / UPI)</span>
                    <span className="font-mono text-slate-500">Payable to: {company.companyName || 'Kasab Val Processors'}</span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-slate-700">
                    <div>
                      <span className="text-[9px] text-slate-500 block uppercase font-mono">Bank Name</span>
                      <strong className="text-slate-900 font-semibold">{company.bankName || 'HDFC Bank Ltd'}</strong>
                    </div>
                    <div>
                      <span className="text-[9px] text-slate-500 block uppercase font-mono">Account Name</span>
                      <strong className="text-slate-900 font-semibold">{company.companyName || 'Kasab Val Processors'}</strong>
                    </div>
                    <div>
                      <span className="text-[9px] text-slate-500 block uppercase font-mono">Account Number</span>
                      <strong className="text-slate-900 font-mono font-bold tracking-wider">{company.accountNumber || '50200084729103'}</strong>
                    </div>
                    <div>
                      <span className="text-[9px] text-slate-500 block uppercase font-mono">IFSC Code</span>
                      <strong className="text-slate-900 font-mono font-bold">{company.ifsc || 'HDFC0000240'}</strong>
                    </div>
                  </div>
                  <div className="mt-2 pt-1.5 border-t border-slate-200 flex flex-wrap justify-between items-center text-[10px]">
                    <div>
                      <span className="text-slate-500">Branch: </span>
                      <strong className="text-slate-800">{company.branch || 'Ring Road / Katargam, Surat'}</strong>
                    </div>
                    <div>
                      <span className="text-slate-500">UPI ID / VPA: </span>
                      <strong className="font-mono text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">{company.upiId || 'kasabval@okhdfcbank'}</strong>
                    </div>
                  </div>
                </div>

                {/* Terms of Job-Work & Statutory Declarations */}
                <div className="text-[9px] text-slate-600 mt-2 space-y-0.5 leading-relaxed">
                  <p className="font-bold text-slate-700 uppercase tracking-wider">
                    Terms of Job-Work & Statutory Declarations:
                  </p>
                  <p>
                    1. Goods processed on job-work basis as per Section 143 of CGST / SGST Act, 2017. 2. Certified digital scale weight measurements. 3. Please remit payment within 15 days from statement date. 4. Disputes subject to Surat jurisdiction.
                  </p>
                </div>

                {/* Signatures */}
                <div style={{ marginTop: '32px' }} className="pt-4 border-t-2 border-slate-900 grid grid-cols-2 gap-12 text-center text-xs avoid-break page-break-inside-avoid">
                  <div>
                    <div className="border-b border-dashed border-slate-400 h-8 w-44 mx-auto" />
                    <span className="font-bold text-slate-800 block mt-1.5 text-xs">Customer Acceptance & Stamp</span>
                    <span className="text-[10px] text-slate-500 font-mono">For {currentPartyName}</span>
                  </div>
                  <div>
                    <div className="border-b border-dashed border-slate-400 h-8 w-44 mx-auto" />
                    <span className="font-bold text-slate-800 block mt-1.5 text-xs">Authorized Signatory</span>
                    <span className="text-[10px] text-slate-500 font-mono">For {company.companyName || 'KASAB VAL PROCESSORS'}</span>
                  </div>
                </div>
              </div>
            ) : (
              /* ═══════════════════════════════════════════════════════════════
                 OPTION C: DELIVERY CHALLANS (BATCH) - RULE 55 INDIVIDUAL SLIPS
                 ═══════════════════════════════════════════════════════════════ */
              <div className="space-y-8">
                {items.map((item, itemIdx) => {
                  const isLast = itemIdx === items.length - 1
                  const itemBreakdown = item.breakdown && item.breakdown.length > 0 ? item.breakdown : null

                  return (
                    <div
                      key={item.id || itemIdx}
                      className={`a4-sheet bg-white text-slate-900 border border-slate-200/90 shadow-2xl rounded-xs p-8 sm:p-10 mx-auto max-w-[210mm] page-break-inside-avoid break-inside-avoid print:shadow-none print:border-none print:p-0 ${
                        !isLast ? 'page-break-after-always break-after-page mb-8 print:mb-0' : ''
                      }`}
                    >
                      {/* Top Header */}
                      <div className="border-b-2 border-slate-900 pb-3 flex justify-between items-start">
                        <div className="space-y-0.5">
                          <span className="text-[9.5px] font-mono font-bold tracking-widest text-slate-500 uppercase block">
                            Job-Work Processors & Val Yarn Manufacturers
                          </span>
                          <h1 className="text-xl sm:text-2xl font-black uppercase tracking-tight text-slate-900 leading-none">
                            {company.companyName || 'KASAB VAL PROCESSORS'}
                          </h1>
                          <p className="text-[11px] text-slate-600 font-medium max-w-sm">
                            {company.address || 'Plot No. 42, GIDC Industrial Estate, Katargam, Surat - 395004, Gujarat'}
                          </p>
                          <div className="flex flex-wrap items-center gap-3 text-[10px] text-slate-600 font-mono pt-0.5">
                            <span>GSTIN: <strong className="text-slate-900">{company.gstin || '24AABCK1234F1Z5'}</strong></span>
                            <span>•</span>
                            <span>Tel: <strong className="text-slate-900">{company.phone || '+91 98251 00000'}</strong></span>
                          </div>
                        </div>

                        {/* Right: Challan Type & Recipient Status */}
                        <div className="text-right shrink-0">
                          <div className="border border-slate-900 bg-slate-900 text-white px-3 py-1 font-black text-xs uppercase tracking-wider">
                            {type === 'inward' ? 'INWARD RECEIPT CHALLAN' : 'DELIVERY CHALLAN'}
                          </div>
                          <span className="text-[9px] font-mono text-slate-500 block mt-0.5">
                            Rule 55 CGST / SGST Rules, 2017
                          </span>
                          <span className="text-[9.5px] font-bold text-slate-700 uppercase tracking-widest block mt-0.5">
                            ORIGINAL FOR CONSIGNEE
                          </span>
                        </div>
                      </div>

                      {/* Consignee & Transport 2-Column Hairline Box */}
                      <div className="border border-slate-900 my-3 grid grid-cols-2 text-xs divide-x divide-slate-900">
                        {/* Left: Consignee Details */}
                        <div className="p-3 space-y-1 bg-slate-50/40">
                          <span className="text-[9px] font-bold uppercase tracking-widest text-slate-500 block">
                            Details of Recipient / Consignee:
                          </span>
                          <h2 className="text-sm font-black tracking-tight text-slate-900 uppercase">
                            {item.partyName}
                          </h2>
                          {item.partyPhone && (
                            <p className="text-[11px] text-slate-700">
                              Tel: <strong className="font-mono">{item.partyPhone}</strong>
                            </p>
                          )}
                          <p className="text-[11px] text-slate-600 leading-snug">
                            {item.partyAddress || 'Surat, Gujarat, India'}
                          </p>
                          <p className="text-[10px] font-mono text-slate-500 pt-0.5">
                            State Code: <strong>24 (Gujarat)</strong>
                          </p>
                        </div>

                        {/* Right: Challan Specifics */}
                        <div className="p-3 grid grid-cols-2 gap-2 text-[11px] bg-slate-50/40 font-mono">
                          <div>
                            <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500 font-sans block">
                              Challan Number:
                            </span>
                            <span className="text-base font-black text-slate-900 block">
                              {item.challanNo ? `#${item.challanNo}` : '—'}
                            </span>
                          </div>
                          <div>
                            <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500 font-sans block">
                              Date:
                            </span>
                            <span className="text-xs font-bold text-slate-900 block">
                              {fmtDate(item.date)}
                            </span>
                          </div>
                          <div>
                            <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500 font-sans block">
                              Processing Nature:
                            </span>
                            <span className="text-xs font-semibold text-slate-800 font-sans block">
                              {type === 'inward' ? 'Raw Intake (Job-work)' : 'Val Finished (Job-work)'}
                            </span>
                          </div>
                          <div>
                            <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500 font-sans block">
                              Place of Supply:
                            </span>
                            <span className="text-xs font-semibold text-slate-800 font-sans block">
                              Surat (24)
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Item Specification & Weight Table */}
                      <div className="my-3 overflow-hidden border border-slate-900 rounded-xs">
                        <table className="w-full text-left border-collapse text-xs">
                          <thead>
                            <tr className="border-b border-slate-900 bg-slate-100 text-slate-900 font-bold uppercase text-[9.5px] tracking-wider">
                              <th className="py-2 px-2.5 w-8 text-center border-r border-slate-300">#</th>
                              <th className="py-2 px-2.5 border-r border-slate-300">Item Description & Specifications</th>
                              {type === 'inward' ? (
                                <>
                                  <th className="py-2 px-2.5 text-center border-r border-slate-300">Bags</th>
                                  <th className="py-2 px-2.5 text-right border-r border-slate-300">Rola Count</th>
                                  <th className="py-2 px-2.5 text-right border-r border-slate-300 font-mono">Gross Wt (kg)</th>
                                  <th className="py-2 px-2.5 text-right border-r border-slate-300 font-mono">Tare Wt (kg)</th>
                                  <th className="py-2 px-2.5 text-right font-mono">Net Kasab (kg)</th>
                                </>
                              ) : (
                                <>
                                  <th className="py-2 px-2.5 text-center border-r border-slate-300 font-mono">Cord / Tar</th>
                                  <th className="py-2 px-2.5 text-center border-r border-slate-300">Twist</th>
                                  <th className="py-2 px-2.5 text-right border-r border-slate-300 font-mono">Gross Wt (kg)</th>
                                  <th className="py-2 px-2.5 text-right border-r border-slate-300 font-mono">Net Val (kg)</th>
                                  <th className="py-2 px-2.5 text-right border-r border-slate-300 font-mono">Rate (₹)</th>
                                  <th className="py-2 px-2.5 text-right font-mono">Amount (₹)</th>
                                </>
                              )}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-300 text-[11px]">
                            {itemBreakdown ? (
                              itemBreakdown.map((row, rIdx) => (
                                <tr key={rIdx} className="hover:bg-slate-50">
                                  <td className="py-2 px-2.5 text-center font-mono border-r border-slate-300">{rIdx + 1}</td>
                                  <td className="py-2 px-2.5 font-bold border-r border-slate-300">
                                    {row.description || (type === 'inward' ? `Kasab Yarn (${row.color || 'Raw/Gold'})` : 'Val Twisted Finished')}
                                  </td>
                                  {type === 'inward' ? (
                                    <>
                                      <td className="py-2 px-2.5 text-center border-r border-slate-300">{row.bags || 1}</td>
                                      <td className="py-2 px-2.5 text-right font-mono border-r border-slate-300">{row.rola || 0}</td>
                                      <td className="py-2 px-2.5 text-right font-mono border-r border-slate-300">{row.grossKg ? row.grossKg.toFixed(3) : '—'}</td>
                                      <td className="py-2 px-2.5 text-right font-mono border-r border-slate-300">{row.tareKg ? row.tareKg.toFixed(3) : '—'}</td>
                                      <td className="py-2 px-2.5 text-right font-mono font-bold">{row.netKg.toFixed(3)}</td>
                                    </>
                                  ) : (
                                    <>
                                      <td className="py-2 px-2.5 text-center font-mono border-r border-slate-300">{formatTarLabel(row.tar)}</td>
                                      <td className="py-2 px-2.5 text-center border-r border-slate-300">{row.twist || 'S'}</td>
                                      <td className="py-2 px-2.5 text-right font-mono border-r border-slate-300">{row.grossKg ? row.grossKg.toFixed(3) : '—'}</td>
                                      <td className="py-2 px-2.5 text-right font-mono font-bold border-r border-slate-300">{row.netKg.toFixed(3)}</td>
                                      <td className="py-2 px-2.5 text-right font-mono border-r border-slate-300">{row.rate ? `₹${row.rate}` : '—'}</td>
                                      <td className="py-2 px-2.5 text-right font-mono font-bold">{row.amount ? fmtMoney(row.amount) : '—'}</td>
                                    </>
                                  )}
                                </tr>
                              ))
                            ) : (
                              <tr>
                                <td className="py-2.5 px-2.5 text-center font-mono border-r border-slate-300">1</td>
                                <td className="py-2.5 px-2.5 font-bold border-r border-slate-300">
                                  {type === 'inward'
                                    ? `Kasab Raw Yarn Lot (${item.color || 'Gold / Raw'})`
                                    : `Val Twisted Kasab Finished Yarn (${item.cordCount ? formatTarLabel(item.cordCount) : 'Standard'})`}
                                </td>
                                {type === 'inward' ? (
                                  <>
                                    <td className="py-2.5 px-2.5 text-center border-r border-slate-300">{item.bagsCount || 1} Bag(s)</td>
                                    <td className="py-2.5 px-2.5 text-right font-mono border-r border-slate-300">
                                      {item.rolaCount || 0} pcs
                                      {item.bigRolaCount ? ` (${item.bigRolaCount} Big)` : ''}
                                    </td>
                                    <td className="py-2.5 px-2.5 text-right font-mono border-r border-slate-300">{item.grossWeight ? item.grossWeight.toFixed(3) : '—'}</td>
                                    <td className="py-2.5 px-2.5 text-right font-mono border-r border-slate-300">
                                      {item.grossWeight && item.netWeight ? (item.grossWeight - item.netWeight).toFixed(3) : '—'}
                                    </td>
                                    <td className="py-2.5 px-2.5 text-right font-mono font-black">{item.netWeight.toFixed(3)}</td>
                                  </>
                                ) : (
                                  <>
                                    <td className="py-2.5 px-2.5 text-center font-mono border-r border-slate-300">{formatTarLabel(item.cordCount)}</td>
                                    <td className="py-2.5 px-2.5 text-center border-r border-slate-300">{item.twistType || 'S-Twist'}</td>
                                    <td className="py-2.5 px-2.5 text-right font-mono border-r border-slate-300">{item.grossWeight ? item.grossWeight.toFixed(3) : '—'}</td>
                                    <td className="py-2.5 px-2.5 text-right font-mono font-black border-r border-slate-300">{item.netWeight.toFixed(3)}</td>
                                    <td className="py-2.5 px-2.5 text-right font-mono border-r border-slate-300">{item.rate ? `₹${item.rate}/kg` : '—'}</td>
                                    <td className="py-2.5 px-2.5 text-right font-mono font-black">{item.amount ? fmtMoney(item.amount) : '—'}</td>
                                  </>
                                )}
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>

                      {/* Certified Net Weight & Lot Reconciliation Box */}
                      <div className="grid grid-cols-2 gap-4 border border-slate-900 p-3.5 my-3 bg-slate-50/70">
                        <div className="space-y-1">
                          <span className="text-[9px] font-bold uppercase tracking-wider text-slate-600 block">
                            Tare Deduction & Lot Details:
                          </span>
                          <div className="text-xs text-slate-800 space-y-0.5">
                            {type === 'inward' ? (
                              <>
                                <div>Total Bags Delivered: <strong>{item.bagsCount || 1} Bag(s)</strong></div>
                                <div>Total Rola Intake: <strong>{item.rolaCount || 0} pcs</strong> {item.bigRolaCount ? `(${item.bigRolaCount} Big)` : ''}</div>
                                <div className="text-[11px] text-slate-500">Normal / Big Rola weight tare applied as per party configuration.</div>
                              </>
                            ) : (
                              <>
                                <div>Total Net Val Dispatched: <strong>{fmtKg(item.netWeight)}</strong></div>
                                <div>Spool Core Deduction: <strong>Bungari standard tare applied</strong></div>
                                <div className="text-[11px] text-slate-500">Certified weighing scale tare deducted.</div>
                              </>
                            )}
                          </div>
                        </div>

                        <div className="text-right border-l border-slate-300 pl-4 flex flex-col justify-center">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600 block">
                            CERTIFIED NET WEIGHT
                          </span>
                          <div className="text-2xl font-black font-mono tracking-tight text-slate-900">
                            {fmtKg(item.netWeight)}
                          </div>
                          {type === 'outward' && item.amount !== undefined && (
                            <div className="text-sm font-black font-mono text-slate-900 mt-1">
                              TOTAL COMMERCIAL VALUE: {fmtMoney(item.amount)}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Statutory Declaration & Terms */}
                      <div className="text-[9.5px] text-slate-600 border-t border-slate-300 pt-2 space-y-0.5">
                        <p className="font-bold text-slate-800 uppercase tracking-wider text-[9px]">
                          Declaration & Terms of Job-Work:
                        </p>
                        <p>
                          1. We declare that this delivery challan shows the actual quantity and particulars of the goods described. 2. Certified digital scale weight. 3. Subject to Surat jurisdiction. 4. Goods once received in good order cannot be returned without prior written approval.
                        </p>
                      </div>

                      {/* Balanced 3-Part Signatures */}
                      <div className="pt-8 mt-4 border-t-2 border-slate-900 grid grid-cols-3 gap-6 text-center text-xs avoid-break page-break-inside-avoid">
                        <div>
                          <div className="border-b border-dashed border-slate-500 h-8 w-32 sm:w-40 mx-auto" />
                          <span className="font-bold text-slate-800 block mt-1 text-[11px]">Prepared By</span>
                          <span className="text-[9px] text-slate-500 font-mono">Weighbridge Operator</span>
                        </div>
                        <div>
                          <div className="border-b border-dashed border-slate-500 h-8 w-32 sm:w-40 mx-auto" />
                          <span className="font-bold text-slate-800 block mt-1 text-[11px]">Received In Good Order</span>
                          <span className="text-[9px] text-slate-500 font-mono">Party Signature & Seal</span>
                        </div>
                        <div>
                          <div className="border-b border-dashed border-slate-500 h-8 w-32 sm:w-40 mx-auto" />
                          <span className="font-bold text-slate-800 block mt-1 text-[11px]">Authorized Signatory</span>
                          <span className="text-[9px] text-slate-500 font-mono">For {company.companyName || 'KASAB VAL PROCESSORS'}</span>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </BottomSheetModal>
  )
}

export default ChallanPrintModal
