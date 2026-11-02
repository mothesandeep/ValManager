import { Save, Check, RotateCcw } from 'lucide-react'
import type { Party } from '@/features/parties/types'
import { getPartyInitials } from '@/features/parties/utils'

interface PartyDefaultsSettingsProps {
  parties: Party[]
  partyLoading: boolean
  partyEdits: Record<string, { rola: string; bigRola: string }>
  setPartyEdits: React.Dispatch<React.SetStateAction<Record<string, { rola: string; bigRola: string }>>>
  savingParties: boolean
  partiesSaved: boolean
  saveAllParties: () => Promise<void>
  rolaWeight: string
  bigRolaWeight: string
}

export function PartyDefaultsSettings({
  parties,
  partyLoading,
  partyEdits,
  setPartyEdits,
  savingParties,
  partiesSaved,
  saveAllParties,
  rolaWeight,
  bigRolaWeight,
}: PartyDefaultsSettingsProps) {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-xs p-5 sm:p-6 space-y-5 transition-colors">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 tracking-tight">
            Party-Wise Weight Overrides
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Client-specific tare gram deductions. Leave blank to automatically inherit system defaults.
          </p>
        </div>
        <button
          type="button"
          onClick={saveAllParties}
          disabled={savingParties || partyLoading}
          className={`w-full sm:w-auto h-11 sm:h-9 px-4 rounded-xl text-xs font-bold transition-all cursor-pointer inline-flex items-center justify-center gap-1.5 shrink-0 disabled:opacity-50 ${
            partiesSaved
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'text-white bg-slate-900 hover:bg-slate-800 dark:bg-blue-600 dark:hover:bg-blue-500 shadow-xs'
          }`}
        >
          {partiesSaved ? (
            <Check size={14} strokeWidth={3} />
          ) : (
            <Save size={14} />
          )}
          <span>{savingParties ? 'Saving All...' : partiesSaved ? 'Saved All!' : 'Save All Overrides'}</span>
        </button>
      </div>

      {partyLoading ? (
        <div className="py-12 text-center text-xs font-semibold text-slate-400">
          Loading party profiles…
        </div>
      ) : parties.length === 0 ? (
        <div className="py-12 text-center text-xs font-semibold text-slate-400">
          No parties registered in system.
        </div>
      ) : (
        <div className="rounded-xl border border-slate-200/80 dark:border-slate-800 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/75 dark:bg-slate-950/75 border-b border-slate-200/80 dark:border-slate-800 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  <th className="py-2.5 px-4 sm:px-6">Party Account</th>
                  <th className="py-2.5 px-4 text-right">Normal Rola (g)</th>
                  <th className="py-2.5 px-4 text-right">Big Rola (g)</th>
                  <th className="py-2.5 px-4 text-center">Override Status</th>
                  <th className="py-2.5 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {parties.map((p) => {
                  const e = partyEdits[p.id] || { rola: '', bigRola: '' }
                  const hasOverride = Boolean(e.rola || e.bigRola)

                  return (
                    <tr key={p.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors group">
                      {/* Party Account */}
                      <td className="py-3 px-4 sm:px-6 whitespace-nowrap">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold text-[11px] flex items-center justify-center shrink-0">
                            {getPartyInitials(p.name)}
                          </div>
                          <div>
                            <span className="font-semibold text-xs text-slate-900 dark:text-slate-100 tracking-tight block">
                              {p.name}
                            </span>
                            <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">
                              {p.phone ? `+91 ${p.phone}` : 'Account Master'}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Normal Rola Input */}
                      <td className="py-3 px-4 whitespace-nowrap text-right">
                        <div className="flex w-36 ml-auto rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden bg-white dark:bg-slate-950 focus-within:ring-2 focus-within:ring-slate-900 dark:focus-within:ring-blue-500 focus-within:border-slate-900 dark:focus-within:border-blue-500 shadow-2xs">
                          <input
                            type="number"
                            min="1"
                            placeholder={`(Default: ${rolaWeight}g)`}
                            value={e.rola}
                            onChange={(v) =>
                              setPartyEdits((prev) => ({
                                ...prev,
                                [p.id]: {
                                  ...e,
                                  rola: v.target.value.replace(/[^0-9]/g, ''),
                                },
                              }))
                            }
                            className="w-full h-8 px-2.5 text-xs font-mono font-bold text-slate-900 dark:text-slate-100 focus:outline-none tabular-nums text-right placeholder:text-slate-400 dark:placeholder:text-slate-500 placeholder:font-normal bg-transparent"
                          />
                          <span className="inline-flex items-center px-2 text-[11px] font-semibold text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-900 border-l border-slate-200 dark:border-slate-700 select-none">
                            g
                          </span>
                        </div>
                      </td>

                      {/* Big Rola Input */}
                      <td className="py-3 px-4 whitespace-nowrap text-right">
                        <div className="flex w-36 ml-auto rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden bg-white dark:bg-slate-950 focus-within:ring-2 focus-within:ring-slate-900 dark:focus-within:ring-blue-500 focus-within:border-slate-900 dark:focus-within:border-blue-500 shadow-2xs">
                          <input
                            type="number"
                            min="1"
                            placeholder={`(Default: ${bigRolaWeight}g)`}
                            value={e.bigRola}
                            onChange={(v) =>
                              setPartyEdits((prev) => ({
                                ...prev,
                                [p.id]: {
                                  ...e,
                                  bigRola: v.target.value.replace(/[^0-9]/g, ''),
                                },
                              }))
                            }
                            className="w-full h-8 px-2.5 text-xs font-mono font-bold text-slate-900 dark:text-slate-100 focus:outline-none tabular-nums text-right placeholder:text-slate-400 dark:placeholder:text-slate-500 placeholder:font-normal bg-transparent"
                          />
                          <span className="inline-flex items-center px-2 text-[11px] font-semibold text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-900 border-l border-slate-200 dark:border-slate-700 select-none">
                            g
                          </span>
                        </div>
                      </td>

                      {/* Override Status Indicator */}
                      <td className="py-3 px-4 whitespace-nowrap text-center">
                        {hasOverride ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                            Custom Tare
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                            System Default
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 whitespace-nowrap text-center">
                        {hasOverride && (
                          <button
                            type="button"
                            onClick={() =>
                              setPartyEdits((prev) => ({
                                ...prev,
                                [p.id]: { rola: '', bigRola: '' },
                              }))
                            }
                            className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                            title="Reset to system defaults"
                          >
                            <RotateCcw size={14} />
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
