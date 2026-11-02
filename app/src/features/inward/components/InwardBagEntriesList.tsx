import React from 'react'
import { Plus, Trash2 } from 'lucide-react'
import type { BagItem } from '@/features/inward/hooks/useInwardForm'

interface InwardBagEntriesListProps {
  bags: BagItem[]
  bagCalculations: Array<{ grossKg: number; rola: number; perRola: number; tareKg: number; netKg: number }>
  removeBag: (id: string) => void
  updateBag: (id: string, field: keyof BagItem, val: string | null) => void
  addBag: () => void
}

export function InwardBagEntriesList({
  bags,
  bagCalculations,
  removeBag,
  updateBag,
  addBag,
}: InwardBagEntriesListProps) {
  return (
    <div className="lg:col-span-7 space-y-3">
      <div className="space-y-2.5">
        {bags.map((b, idx) => {
          const calc = bagCalculations[idx]
          return (
            <div
              key={b.id}
              className="p-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs space-y-2"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Bag #{idx + 1}</span>
                <button
                  type="button"
                  onClick={() => removeBag(b.id)}
                  disabled={bags.length <= 1}
                  className="w-11 h-11 min-w-[44px] min-h-[44px] inline-flex items-center justify-center text-slate-400 hover:text-rose-600 cursor-pointer disabled:opacity-30"
                  title="Remove bag"
                >
                  <Trash2 size={16} />
                </button>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-400">Gross (kg)</label>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={b.gross}
                    onChange={(e) => updateBag(b.id, 'gross', e.target.value)}
                    placeholder="0.000"
                    className="h-9 w-full rounded-lg border border-slate-200 dark:border-slate-700 px-2 text-xs font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-400">Rola (pcs)</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={b.rolaCount}
                    onChange={(e) => updateBag(b.id, 'rolaCount', e.target.value)}
                    placeholder="0"
                    className="h-9 w-full rounded-lg border border-slate-200 dark:border-slate-700 px-2 text-xs font-mono font-bold"
                  />
                </div>
                <div className="col-span-2 sm:col-span-1 flex flex-col justify-end text-right">
                  <span className="text-[10px] text-slate-400">Net Kasab</span>
                  <span className="text-xs font-mono font-bold text-emerald-600">
                    {calc ? calc.netKg.toFixed(3) : '0.000'} kg
                  </span>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <button
        type="button"
        onClick={addBag}
        className="w-full h-12 min-h-[48px] rounded-xl border border-dashed border-slate-300 dark:border-slate-700 hover:border-slate-900 dark:hover:border-white text-xs font-bold flex items-center justify-center gap-1.5 text-slate-700 dark:text-slate-300 cursor-pointer"
      >
        <Plus size={16} />
        <span>Add Bag</span>
      </button>
    </div>
  )
}

