import { Save, Check } from 'lucide-react'

interface WeightsTareSettingsProps {
  rolaWeight: string
  setRolaWeight: (val: string) => void
  bigRolaWeight: string
  setBigRolaWeight: (val: string) => void
  bungriWeight: string
  setBungriWeight: (val: string) => void
  boriWeight: string
  setBoriWeight: (val: string) => void
  onSave: () => void
  isSaved: boolean
}

export function WeightsTareSettings({
  rolaWeight,
  setRolaWeight,
  bigRolaWeight,
  setBigRolaWeight,
  bungriWeight,
  setBungriWeight,
  boriWeight,
  setBoriWeight,
  onSave,
  isSaved,
}: WeightsTareSettingsProps) {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-xs p-5 sm:p-6 space-y-6 transition-colors">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 tracking-tight">
            Default Tare Deductions
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Baseline tare deduction standards applied automatically across inward receipts and outward dispatches
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
          <span>{isSaved ? 'Saved!' : 'Save Weights'}</span>
        </button>
      </div>

      <div className="divide-y divide-slate-100 dark:divide-slate-800">
        {/* Normal Rola Weight */}
        <div className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 group">
          <div>
            <span className="text-[13px] font-bold text-slate-800 dark:text-slate-200 tracking-tight block">
              Normal Rola Weight
            </span>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Standard tare deducted per Kasab rola during inward receipt (default: 200g)
            </p>
          </div>
          <div className="flex w-full sm:w-36 h-11 sm:h-9 rounded-xl sm:rounded-lg border border-slate-200 dark:border-slate-800 overflow-hidden bg-slate-50 dark:bg-slate-950 focus-within:bg-white dark:focus-within:bg-slate-900 focus-within:ring-2 focus-within:ring-slate-900 dark:focus-within:ring-blue-500 focus-within:border-slate-900 dark:focus-within:border-blue-500 shadow-2xs">
            <input
              type="number"
              inputMode="numeric"
              min="1"
              value={rolaWeight}
              onChange={(e) => setRolaWeight(e.target.value.replace(/[^0-9]/g, ''))}
              placeholder="200"
              className="w-full h-full px-3 text-sm font-mono font-bold text-slate-900 dark:text-slate-100 focus:outline-none tabular-nums text-right bg-transparent"
            />
            <span className="inline-flex items-center px-3 text-xs font-semibold text-slate-500 dark:text-slate-400 bg-slate-100/70 dark:bg-slate-800 border-l border-slate-200 dark:border-slate-800 select-none shrink-0">
              grams
            </span>
          </div>
        </div>

        {/* Big Rola Weight */}
        <div className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 group">
          <div>
            <span className="text-[13px] font-bold text-slate-800 dark:text-slate-200 tracking-tight block">
              Big Rola Weight
            </span>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Tare deducted for oversized or heavy rolas (default: 250g)
            </p>
          </div>
          <div className="flex w-full sm:w-36 h-11 sm:h-9 rounded-xl sm:rounded-lg border border-slate-200 dark:border-slate-800 overflow-hidden bg-slate-50 dark:bg-slate-950 focus-within:bg-white dark:focus-within:bg-slate-900 focus-within:ring-2 focus-within:ring-slate-900 dark:focus-within:ring-blue-500 focus-within:border-slate-900 dark:focus-within:border-blue-500 shadow-2xs">
            <input
              type="number"
              inputMode="numeric"
              min="1"
              value={bigRolaWeight}
              onChange={(e) => setBigRolaWeight(e.target.value.replace(/[^0-9]/g, ''))}
              placeholder="250"
              className="w-full h-full px-3 text-sm font-mono font-bold text-slate-900 dark:text-slate-100 focus:outline-none tabular-nums text-right bg-transparent"
            />
            <span className="inline-flex items-center px-3 text-xs font-semibold text-slate-500 dark:text-slate-400 bg-slate-100/70 dark:bg-slate-800 border-l border-slate-200 dark:border-slate-800 select-none shrink-0">
              grams
            </span>
          </div>
        </div>

        {/* Bungri Weight */}
        <div className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 group">
          <div>
            <span className="text-[13px] font-bold text-slate-800 dark:text-slate-200 tracking-tight block">
              Bungri Weight
            </span>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Standard tare per empty wooden or plastic core spindle (default: 70g)
            </p>
          </div>
          <div className="flex w-full sm:w-36 h-11 sm:h-9 rounded-xl sm:rounded-lg border border-slate-200 dark:border-slate-800 overflow-hidden bg-slate-50 dark:bg-slate-950 focus-within:bg-white dark:focus-within:bg-slate-900 focus-within:ring-2 focus-within:ring-slate-900 dark:focus-within:ring-blue-500 focus-within:border-slate-900 dark:focus-within:border-blue-500 shadow-2xs">
            <input
              type="number"
              inputMode="numeric"
              min="1"
              value={bungriWeight}
              onChange={(e) => setBungriWeight(e.target.value.replace(/[^0-9]/g, ''))}
              placeholder="70"
              className="w-full h-full px-3 text-sm font-mono font-bold text-slate-900 dark:text-slate-100 focus:outline-none tabular-nums text-right bg-transparent"
            />
            <span className="inline-flex items-center px-3 text-xs font-semibold text-slate-500 dark:text-slate-400 bg-slate-100/70 dark:bg-slate-800 border-l border-slate-200 dark:border-slate-800 select-none shrink-0">
              grams
            </span>
          </div>
        </div>

        {/* Bori (Bag) Tare */}
        <div className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 group">
          <div>
            <span className="text-[13px] font-bold text-slate-800 dark:text-slate-200 tracking-tight block">
              Bori (Bag) Tare
            </span>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Standard tare weight deducted per jute/HDPE transport bag (default: 100g)
            </p>
          </div>
          <div className="flex w-full sm:w-36 h-11 sm:h-9 rounded-xl sm:rounded-lg border border-slate-200 dark:border-slate-800 overflow-hidden bg-slate-50 dark:bg-slate-950 focus-within:bg-white dark:focus-within:bg-slate-900 focus-within:ring-2 focus-within:ring-slate-900 dark:focus-within:ring-blue-500 focus-within:border-slate-900 dark:focus-within:border-blue-500 shadow-2xs">
            <input
              type="number"
              inputMode="numeric"
              min="1"
              value={boriWeight}
              onChange={(e) => setBoriWeight(e.target.value.replace(/[^0-9]/g, ''))}
              placeholder="100"
              className="w-full h-full px-3 text-sm font-mono font-bold text-slate-900 dark:text-slate-100 focus:outline-none tabular-nums text-right bg-transparent"
            />
            <span className="inline-flex items-center px-3 text-xs font-semibold text-slate-500 dark:text-slate-400 bg-slate-100/70 dark:bg-slate-800 border-l border-slate-200 dark:border-slate-800 select-none shrink-0">
              grams
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

