import {
  Layers,
  Trash2,
  ChevronDown,
  Plus,
} from 'lucide-react'
import { COLOR_TYPES } from '@/features/inward/constants'
import { formatKgDisplay } from '@/utils/numberInput'
import type { InwardReviewBag } from '@/features/inward/sheets/InwardScannerSheet'

export interface InwardBagCalculation {
  bag: InwardReviewBag
  tareKg: number
  netKg: number
  grossKg?: number
  rolaCount?: number
  netKasabKg?: number
}

export interface ScannedBagsReviewListProps {
  inwardBagCalculations: InwardBagCalculation[]
  totalBagsCount: number
  onUpdateBag: (id: string, field: keyof InwardReviewBag, value: any) => void
  onRemoveBag: (id: string) => void
  onAddBag: () => void
  onSizeTypeChange: (id: string, sizeType: 'Norm' | 'Big') => void
}

export function ScannedBagsReviewList({
  inwardBagCalculations,
  totalBagsCount,
  onUpdateBag,
  onRemoveBag,
  onAddBag,
  onSizeTypeChange,
}: ScannedBagsReviewListProps) {
  return (
    <div className="w-full space-y-3 pt-1">
      <div className="flex items-center justify-between pb-1.5 border-b border-slate-100 dark:border-slate-800">
        <h3 className="text-xs font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
          <Layers className="w-3.5 h-3.5 text-slate-400" />
          <span>Finished / Inward Bags</span>
        </h3>
        <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 dark:text-slate-500 font-mono">
          {totalBagsCount} {totalBagsCount === 1 ? 'Bag' : 'Bags'}
        </span>
      </div>

      <div className="space-y-3">
        {inwardBagCalculations.map(({ bag: b, tareKg, netKg }, idx) => (
          <div
            key={b.id}
            className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-xs space-y-3 transition-all hover:border-slate-300 dark:hover:border-slate-700"
          >
            {/* Bag Header */}
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-lg bg-slate-900 text-white dark:bg-white dark:text-slate-900 font-mono">
                  BAG #{idx + 1}
                </span>
                {b.sizeType === 'Big' && (
                  <span className="text-[10px] font-semibold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 px-1.5 py-0.5 rounded-md font-mono">
                    Big ({b.perRolaGrams}g)
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2 flex-wrap justify-end">
                <span className="text-xs font-medium text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 px-2 py-0.5 rounded-md font-mono tabular-nums">
                  Tare: -{formatKgDisplay(tareKg)} kg
                </span>
                <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/50 px-2.5 py-0.5 rounded-md font-mono tabular-nums">
                  Net: {formatKgDisplay(netKg)} kg
                </span>
                {totalBagsCount > 1 && (
                  <button
                    type="button"
                    onClick={() => onRemoveBag(b.id)}
                    className="text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 p-1.5 rounded-lg transition-colors cursor-pointer shrink-0"
                    title={`Remove Bag #${idx + 1}`}
                  >
                    <Trash2 size={16} strokeWidth={2.2} />
                  </button>
                )}
              </div>
            </div>

            {/* Inputs Row: Gross Wt & Rola Count */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1.5 pl-0.5">
                  Gross <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    inputMode="decimal"
                    className="h-11 w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl pl-3.5 pr-9 text-sm font-semibold tabular-nums text-slate-900 dark:text-white placeholder:text-slate-400 focus:ring-2 focus:ring-slate-900/10 dark:focus:ring-white/10 outline-none transition-all"
                    placeholder="0.000"
                    value={b.gross}
                    onChange={(e) => onUpdateBag(b.id, 'gross', e.target.value)}
                    required
                  />
                  <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-xs font-semibold text-slate-400">
                    kg
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1.5 pl-0.5">
                  Rola
                </label>
                <div className="relative">
                  <input
                    type="text"
                    inputMode="numeric"
                    className="h-11 w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl pl-3.5 pr-10 text-sm font-semibold tabular-nums text-slate-900 dark:text-white placeholder:text-slate-400 focus:ring-2 focus:ring-slate-900/10 dark:focus:ring-white/10 outline-none transition-all"
                    placeholder="0"
                    value={b.rolaCount}
                    onChange={(e) => onUpdateBag(b.id, 'rolaCount', e.target.value)}
                  />
                  <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-xs font-semibold text-slate-400">
                    pcs
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Row: Twist Toggle (S/Z), Item Select, Size Toggle (Norm/Big) */}
            <div className="flex flex-wrap sm:flex-nowrap items-center gap-2.5">
              {/* "S | Z" twist toggle */}
              <div className="h-11 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl flex gap-1 items-center shrink-0">
                {(['S', 'Z'] as const).map((tw) => (
                  <button
                    key={tw}
                    type="button"
                    onClick={() => {
                      const next = b.twistType === tw ? null : tw
                      onUpdateBag(b.id, 'twistType', next)
                      onUpdateBag(b.id, 'twist', next)
                    }}
                    className={`px-3.5 h-full rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center ${
                      b.twistType === tw
                        ? 'bg-slate-950 text-white dark:bg-white dark:text-slate-950 shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    {tw}
                  </button>
                ))}
              </div>

              {/* Item / Color selector */}
              <div className="flex-1 relative min-w-[120px]">
                <select
                  className="h-11 w-full pl-3.5 pr-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold text-slate-900 dark:text-white appearance-none focus:outline-none focus:ring-2 focus:ring-slate-900/10 dark:focus:ring-white/10 transition-all cursor-pointer"
                  value={b.color || ''}
                  onChange={(e) => onUpdateBag(b.id, 'color', e.target.value ? e.target.value : null)}
                >
                  <option value="">Select Color</option>
                  {COLOR_TYPES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                  <ChevronDown size={14} strokeWidth={2.2} />
                </div>
              </div>

              {/* "NORM | BIG" rola toggle */}
              <div className="h-11 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl flex gap-1 items-center shrink-0">
                {(['Norm', 'Big'] as const).map((sz) => (
                  <button
                    key={sz}
                    type="button"
                    onClick={() => onSizeTypeChange(b.id, sz)}
                    className={`px-3 h-full rounded-lg text-xs font-bold uppercase transition-all cursor-pointer flex items-center justify-center ${
                      b.sizeType === sz
                        ? 'bg-slate-950 text-white dark:bg-white dark:text-slate-950 shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    {sz}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ))}

        {/* + Add Bag Button */}
        <button
          type="button"
          onClick={onAddBag}
          className="w-full h-11 border-2 border-dashed border-slate-200 hover:border-slate-300 dark:border-slate-800 rounded-xl bg-slate-50/50 hover:bg-slate-100/60 text-slate-700 dark:text-slate-300 font-medium text-sm flex items-center justify-center gap-1.5 transition-colors cursor-pointer mt-2"
        >
          <Plus size={16} strokeWidth={2.5} />
          <span>Add Bag #{totalBagsCount + 1}</span>
        </button>
      </div>
    </div>
  )
}
