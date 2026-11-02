import { useState } from 'react'
import { Save, Check, Trash2, Plus } from 'lucide-react'
import type { TarRateConfig } from '@/features/settings/utils'

interface TarRatesPricingSettingsProps {
  tarRates: TarRateConfig[]
  setTarRates: React.Dispatch<React.SetStateAction<TarRateConfig[]>>
  onSave: () => void
  isSaved: boolean
}

export function TarRatesPricingSettings({
  tarRates,
  setTarRates,
  onSave,
  isSaved,
}: TarRatesPricingSettingsProps) {
  const [newTar, setNewTar] = useState('')
  const [newRate, setNewRate] = useState('')
  const [addError, setAddError] = useState('')

  const updateRate = (tar: number, value: string) => {
    const clean = value.replace(/[^0-9.]/g, '')
    setTarRates((prev) =>
      prev.map((r) => (r.tar === tar ? { ...r, rate: parseFloat(clean) || 0 } : r))
    )
  }

  const deleteTar = (tar: number) => {
    setTarRates((prev) => prev.filter((r) => r.tar !== tar))
  }

  const addTar = () => {
    const t = parseInt(newTar, 10)
    const r = parseFloat(newRate)
    if (!t || t <= 0) {
      setAddError('Valid Tar required')
      return
    }
    if (!r || r <= 0) {
      setAddError('Valid Rate required')
      return
    }
    if (tarRates.find((x) => x.tar === t)) {
      setAddError(`${t} Tar already exists`)
      return
    }
    setAddError('')
    const updated = [...tarRates, { tar: t, rate: r }].sort((a, b) => a.tar - b.tar)
    setTarRates(updated)
    setNewTar('')
    setNewRate('')
  }

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-xs p-5 sm:p-6 space-y-5 transition-colors">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 tracking-tight">
            Tar Rate Master (₹/kg)
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Paisa per kg conversion rates based on cord thickness (Tar). Rates apply universally to both S and Z twists.
          </p>
        </div>
        <button
          type="button"
          onClick={onSave}
          className={`w-full sm:w-auto h-11 sm:h-9 px-4 rounded-xl text-xs font-bold transition-all cursor-pointer inline-flex items-center justify-center gap-1.5 shrink-0 ${
            isSaved
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'text-white bg-blue-600 hover:bg-blue-700 shadow-xs'
          }`}
        >
          {isSaved ? <Check size={14} strokeWidth={3} /> : <Save size={14} />}
          <span>{isSaved ? 'Saved!' : 'Save Rates'}</span>
        </button>
      </div>

      {/* Tar Rate Master Table */}
      <div className="rounded-xl border border-slate-200/80 dark:border-slate-800 overflow-hidden shadow-xs">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50/75 dark:bg-slate-950/75 border-b border-slate-200/80 dark:border-slate-800 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              <th className="py-2.5 px-4 sm:px-6">Tar Specification</th>
              <th className="py-2.5 px-4">Rate (₹/KG)</th>
              <th className="py-2.5 px-4 w-16 text-center">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {tarRates.length === 0 ? (
              <tr>
                <td colSpan={3} className="text-center py-8 text-xs font-medium text-slate-400">
                  No tar rates configured. Add a tar specification below.
                </td>
              </tr>
            ) : (
              tarRates.map((r) => (
                <tr key={r.tar} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors group">
                  <td className="py-3 px-4 sm:px-6">
                    <span className="font-mono font-bold text-xs bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 px-2.5 py-1 rounded-md border border-slate-200/80 dark:border-slate-700">
                      {r.tar} Tar
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex w-36 rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden bg-white dark:bg-slate-950 focus-within:ring-2 focus-within:ring-slate-900 dark:focus-within:ring-blue-500 focus-within:border-slate-900 dark:focus-within:border-blue-500 shadow-2xs">
                      <span className="inline-flex items-center px-2.5 text-xs font-bold text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 select-none">
                        ₹
                      </span>
                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={r.rate || ''}
                        onChange={(e) => updateRate(r.tar, e.target.value)}
                        className="w-full h-8 px-2.5 text-xs font-mono font-bold text-slate-900 dark:text-slate-100 focus:outline-none tabular-nums text-right bg-transparent"
                        placeholder="0"
                      />
                      <span className="inline-flex items-center px-2 text-[11px] font-semibold text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 select-none">
                        /kg
                      </span>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <button
                      type="button"
                      onClick={() => deleteTar(r.tar)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-lg transition-colors cursor-pointer"
                      title={`Delete ${r.tar} Tar`}
                    >
                      <Trash2 size={15} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* Inline Add New Tar Rate Bar */}
        <div className="p-3 bg-slate-50/80 dark:bg-slate-950/80 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
              + Add Tar Rate:
            </span>
            <div className="flex w-28 rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden bg-white dark:bg-slate-900 focus-within:ring-2 focus-within:ring-slate-900 dark:focus-within:ring-blue-500 focus-within:border-slate-900 dark:focus-within:border-blue-500 shadow-2xs">
              <input
                type="number"
                min="1"
                value={newTar}
                onChange={(e) => {
                  setNewTar(e.target.value)
                  setAddError('')
                }}
                placeholder="Tar"
                className="w-full h-8 px-2 text-xs font-mono font-bold text-slate-900 dark:text-slate-100 focus:outline-none tabular-nums text-center bg-transparent"
              />
              <span className="inline-flex items-center px-2 text-[11px] font-semibold text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800 border-l border-slate-200 dark:border-slate-700 select-none">
                Tar
              </span>
            </div>

            <div className="flex w-32 rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden bg-white dark:bg-slate-900 focus-within:ring-2 focus-within:ring-slate-900 dark:focus-within:ring-blue-500 focus-within:border-slate-900 dark:focus-within:border-blue-500 shadow-2xs">
              <span className="inline-flex items-center px-2 text-xs font-bold text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 select-none">
                ₹
              </span>
              <input
                type="number"
                min="0"
                step="1"
                value={newRate}
                onChange={(e) => {
                  setNewRate(e.target.value)
                  setAddError('')
                }}
                placeholder="Rate"
                className="w-full h-8 px-2 text-xs font-mono font-bold text-slate-900 dark:text-slate-100 focus:outline-none tabular-nums text-right bg-transparent"
              />
              <span className="inline-flex items-center px-2 text-[11px] font-semibold text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-slate-800 border-l border-slate-200 dark:border-slate-700 select-none">
                /kg
              </span>
            </div>

            <button
              type="button"
              onClick={addTar}
              className="h-8 px-3 rounded-lg text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white transition-colors cursor-pointer inline-flex items-center gap-1 shadow-xs"
            >
              <Plus size={14} strokeWidth={2.5} />
              <span>Add Tar</span>
            </button>
          </div>

          {addError && <span className="text-xs font-semibold text-rose-600 dark:text-rose-400">{addError}</span>}
        </div>
      </div>
    </div>
  )
}

