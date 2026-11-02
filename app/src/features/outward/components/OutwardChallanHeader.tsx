import { AlertCircle } from 'lucide-react'
import { PartyCombobox } from '@/components/common/PartyCombobox'
import type { Party } from '@/features/parties/types'
import type { DispatchWithParty } from '@/features/outward/types'

interface FormHeader {
  partyId: string
  date: string
  dispatchType: 'Val' | 'Rola'
  challanNo: string
}

interface OutwardChallanHeaderProps {
  header: FormHeader
  setHeader: (header: FormHeader) => void
  parties: Party[]
  dispatches: DispatchWithParty[]
  editingId: string | null
  duplicateChallan: DispatchWithParty | null
  valBagsCount: number
  rolaBagsCount: number
  onPartyChange: (partyId: string) => void
}

export function OutwardChallanHeader({
  header,
  setHeader,
  parties,
  dispatches,
  editingId,
  duplicateChallan,
  valBagsCount,
  rolaBagsCount,
  onPartyChange,
}: OutwardChallanHeaderProps) {
  const existingChallan = header.challanNo.trim()
    ? dispatches.find((d) => d.challan_no === header.challanNo.trim())
    : null
  const isDateLocked = Boolean(existingChallan && !editingId)

  return (
    <div className="space-y-3">
      {/* Dispatch Type Segmented Control */}
      <div className="bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl flex gap-1 border border-slate-200/80 dark:border-slate-700/80 shadow-2xs">
        <button
          type="button"
          onClick={() => setHeader({ ...header, dispatchType: 'Val' })}
          className={`flex-1 flex justify-center items-center gap-2 transition-all cursor-pointer rounded-lg font-semibold text-xs sm:text-sm py-2 ${
            header.dispatchType === 'Val'
              ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs font-bold border border-slate-200/60 dark:border-slate-700'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white font-medium hover:bg-slate-200/50 dark:hover:bg-slate-700/50'
          }`}
        >
          <span>Val (Finished)</span>
          {valBagsCount > 0 && (
            <span className="text-[10px] px-1.5 py-0.2 rounded-full font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700">
              {valBagsCount}
            </span>
          )}
        </button>
        <button
          type="button"
          onClick={() => setHeader({ ...header, dispatchType: 'Rola' })}
          className={`flex-1 flex justify-center items-center gap-2 transition-all cursor-pointer rounded-lg font-semibold text-xs sm:text-sm py-2 ${
            header.dispatchType === 'Rola'
              ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs font-bold border border-slate-200/60 dark:border-slate-700'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white font-medium hover:bg-slate-200/50 dark:hover:bg-slate-700/50'
          }`}
        >
          <span>Rola (Empty)</span>
          {rolaBagsCount > 0 && (
            <span className="text-[10px] px-1.5 py-0.2 rounded-full font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700">
              {rolaBagsCount}
            </span>
          )}
        </button>
      </div>

      {/* Form Metadata Fields */}
      <div className="space-y-3 sm:space-y-0 sm:grid sm:grid-cols-12 sm:gap-3">
        <div className="sm:col-span-6">
          <PartyCombobox
            id="dispatch-party-combobox"
            value={header.partyId}
            onChange={onPartyChange}
            parties={parties}
            label="Party (To M/S)"
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-3 sm:contents">
          <div className="sm:col-span-3">
            <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1.5 pl-0.5">
              Ch. No. <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              inputMode="numeric"
              required
              placeholder="e.g. 21"
              className="h-11 w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3.5 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:ring-2 focus:ring-slate-900/10 dark:focus:ring-white/10 outline-none transition-all font-mono font-semibold"
              value={header.challanNo}
              onChange={(e) => {
                const newChallanNo = e.target.value
                const existing = newChallanNo.trim() ? dispatches.find((d) => d.challan_no === newChallanNo.trim()) : null
                if (existing) {
                  setHeader({ ...header, challanNo: newChallanNo, date: existing.date, partyId: existing.party_id || header.partyId })
                } else {
                  setHeader({ ...header, challanNo: newChallanNo })
                }
              }}
            />
            {duplicateChallan && (
              <div className="mt-1.5 p-2 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 text-[11px] flex items-center gap-1.5 leading-snug">
                <AlertCircle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                <span>
                  <strong>Notice:</strong> Ch. #{duplicateChallan.challan_no} already logged for {duplicateChallan.party?.name || 'this party'} ({duplicateChallan.date}).
                </span>
              </div>
            )}
          </div>

          <div className="sm:col-span-3">
            <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1.5 pl-0.5">
              Date <span className="text-rose-500">*</span>
            </label>
            <input
              type="date"
              required
              className={`h-11 w-full rounded-xl border bg-white dark:bg-slate-900 px-3.5 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:ring-2 focus:ring-slate-900/10 dark:focus:ring-white/10 outline-none transition-all font-mono font-semibold border-slate-200 dark:border-slate-800 ${
                isDateLocked ? 'opacity-70 cursor-not-allowed bg-slate-100 dark:bg-slate-800' : ''
              }`}
              value={header.date}
              readOnly={isDateLocked}
              onChange={(e) => {
                if (!isDateLocked) setHeader({ ...header, date: e.target.value })
              }}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

