import React, { useRef } from 'react'
import { FileText, User, CheckCircle2, AlertCircle } from 'lucide-react'
import type { Party } from '@/features/parties/types'
import { resolvePartyMatch, getPartyAliases } from '@/features/parties/utils'

export interface ChallanHeaderProps {
  type: 'INWARD' | 'OUTWARD'
  outwardDispatchType?: 'Val' | 'Rola'
  setOutwardDispatchType?: (t: 'Val' | 'Rola') => void
  valBagsCount?: number
  rolaBagsCount?: number
  parties: Party[]
  partySearch: string
  setPartySearch: (val: string) => void
  selectedPartyId: string
  setSelectedPartyId: (id: string) => void
  setSelectedPartyName: (name: string) => void
  showPartyDropdown: boolean
  setShowPartyDropdown: (val: boolean) => void
  filteredParties: Party[]
  handlePartySelect: (p: Party) => void
  challanNo: string
  setChallanNo: (val: string) => void
  challanInputRef?: React.RefObject<HTMLInputElement | null>
  date: string
  setDate: (val: string) => void
  scanError: string | null
  setScanError: (val: string | null) => void
  duplicateChallanInfo?: { challanNo: string; partyName: string; date: string } | null
}

export function ChallanHeader({
  type,
  outwardDispatchType = 'Val',
  setOutwardDispatchType,
  valBagsCount = 0,
  rolaBagsCount = 0,
  parties,
  partySearch,
  setPartySearch,
  selectedPartyId,
  setSelectedPartyId,
  setSelectedPartyName,
  showPartyDropdown,
  setShowPartyDropdown,
  filteredParties,
  handlePartySelect,
  challanNo,
  setChallanNo,
  challanInputRef,
  date,
  setDate,
  scanError,
  setScanError,
  duplicateChallanInfo,
}: ChallanHeaderProps) {
  const dropdownRef = useRef<HTMLDivElement>(null)

  return (
    <div className="w-full space-y-3">
      {/* Mode Toggle for OUTWARD Dispatch */}
      {type === 'OUTWARD' && setOutwardDispatchType && (
        <div className="w-full flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
          <button
            type="button"
            onClick={() => setOutwardDispatchType('Val')}
            className={`flex-1 flex justify-center items-center gap-2 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              outwardDispatchType === 'Val'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <span>Val (Finished)</span>
            {valBagsCount > 0 && (
              <span className="text-[10px] px-1.5 py-0.2 rounded-full font-bold font-mono bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-200">
                {valBagsCount}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => setOutwardDispatchType('Rola')}
            className={`flex-1 flex justify-center items-center gap-2 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              outwardDispatchType === 'Rola'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <span>Rola (Empty)</span>
            {rolaBagsCount > 0 && (
              <span className="text-[10px] px-1.5 py-0.2 rounded-full font-bold font-mono bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-200">
                {rolaBagsCount}
              </span>
            )}
          </button>
        </div>
      )}

      {/* General Information Header */}
      <div className="flex items-center justify-between pb-1.5 border-b border-slate-100 dark:border-slate-800">
        <h3 className="text-xs font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
          <FileText className="w-3.5 h-3.5 text-slate-400" />
          <span>General Information</span>
        </h3>
        <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 dark:text-slate-500 font-mono">
          Header
        </span>
      </div>

      {/* Party Autocomplete */}
      <div className="w-full relative" ref={dropdownRef}>
        <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide mb-1 block">
          Party Name <span className="text-rose-500">*</span>
          {selectedPartyId ? (
            <span className="inline-flex items-center gap-1 text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-800/80 ml-2">
              <CheckCircle2 size={11} className="text-emerald-600 dark:text-emerald-400" />
              Verified
            </span>
          ) : (
            <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono normal-case ml-2">
              Type or pick party
            </span>
          )}
        </label>
        <div className="relative">
          <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={partySearch}
            onFocus={() => setShowPartyDropdown(true)}
            onChange={(e) => {
              const val = e.target.value
              setPartySearch(val)
              setSelectedPartyName(val)
              const matched = resolvePartyMatch(parties, val)
              if (
                matched &&
                (matched.name.toLowerCase() === val.trim().toLowerCase() ||
                  getPartyAliases(matched).some((a) => a.toLowerCase() === val.trim().toLowerCase()))
              ) {
                setSelectedPartyId(matched.id)
              } else {
                setSelectedPartyId('')
              }
              setShowPartyDropdown(true)
            }}
            onBlur={() => {
              setTimeout(() => {
                if (partySearch.trim()) {
                  const matched = resolvePartyMatch(parties, partySearch)
                  if (matched) {
                    handlePartySelect(matched)
                  }
                }
                setShowPartyDropdown(false)
              }, 250)
            }}
            placeholder="Type or select party..."
            className="h-11 w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3.5 pl-9 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:ring-2 focus:ring-slate-900/10 dark:focus:ring-white/10 outline-none transition-all font-semibold"
          />
        </div>

        {showPartyDropdown && filteredParties.length > 0 && (
          <div className="absolute z-30 left-0 right-0 mt-1 max-h-48 overflow-y-auto bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xl py-1 divide-y divide-slate-100 dark:divide-slate-800/60">
            {filteredParties.map((p) => {
              const isSelected = selectedPartyId === p.id
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => handlePartySelect(p)}
                  className={`w-full text-left px-3.5 py-2.5 text-xs flex items-center justify-between cursor-pointer transition-colors ${
                    isSelected
                      ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-900 dark:text-indigo-200 font-semibold'
                      : 'text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  <div className="flex flex-col min-w-0 pr-2">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-semibold text-slate-900 dark:text-slate-100">{p.name}</span>
                      {isSelected && (
                        <span className="inline-flex items-center text-indigo-600 dark:text-indigo-400">
                          <CheckCircle2 size={13} />
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* Challan No & Date */}
      <div className="w-full grid grid-cols-2 gap-3 pt-0.5">
        <div>
          <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1.5 pl-0.5">
            Ch. No. <span className="text-rose-500">*</span>
          </label>
          <input
            ref={challanInputRef}
            type="text"
            inputMode="numeric"
            autoCorrect="off"
            spellCheck={false}
            enterKeyHint="next"
            required
            value={challanNo}
            onChange={(e) => {
              setChallanNo(e.target.value)
              if (scanError && e.target.value.trim()) {
                setScanError(null)
              }
            }}
            placeholder="e.g. 504"
            className="h-11 w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3.5 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 outline-none transition-all font-mono font-semibold"
          />
          {duplicateChallanInfo && (
            <div className="mt-1.5 p-2 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 text-[11px] flex items-center gap-1.5 leading-snug">
              <AlertCircle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
              <span>
                <strong>Duplicate:</strong> Ch. #{duplicateChallanInfo.challanNo} exists for {duplicateChallanInfo.partyName}.
              </span>
            </div>
          )}
        </div>

        <div>
          <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1.5 pl-0.5">
            Date <span className="text-rose-500">*</span>
          </label>
          <input
            type="date"
            required
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="h-11 w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3.5 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 outline-none transition-all font-mono font-semibold"
          />
        </div>
      </div>
    </div>
  )
}
export default ChallanHeader

