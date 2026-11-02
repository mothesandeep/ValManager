import { memo } from 'react'
import { Plus, Trash2, ChevronDown } from 'lucide-react'
import { fmtKg } from '@/utils/format'
import { getTarRate } from '@/features/settings/utils'

export interface BagItem {
  id: string
  gross: string
  bungariCount: string
  rolaCount: string
  tar: string
  twistType: 'S' | 'Z' | 'S+Z'
}

export interface BagCalculation {
  bag: BagItem
  tareKg: number
  netKg: number
}

export interface DispatchEntriesListProps {
  dispatchType: 'Val' | 'Rola'
  currentBagCalculations: BagCalculation[]
  currentBags: BagItem[]
  availableTarOptions: number[]
  editingId: string | null
  highlightedBagId?: string | null
  onUpdateBag: (id: string, field: keyof BagItem, value: string) => void
  onRemoveBag: (id: string) => void
  onAddBag: () => void
}

interface BagCardRowProps {
  calculation: BagCalculation
  idx: number
  isHighlighted: boolean
  dispatchType: 'Val' | 'Rola'
  availableTarOptions: number[]
  totalBagsCount: number
  onUpdateBag: (id: string, field: keyof BagItem, value: string) => void
  onRemoveBag: (id: string) => void
}

const BagCardRow = memo(function BagCardRow({
  calculation,
  idx,
  isHighlighted,
  dispatchType,
  availableTarOptions,
  totalBagsCount,
  onUpdateBag,
  onRemoveBag,
}: BagCardRowProps) {
  const { bag: b, tareKg, netKg } = calculation

  return (
    <div
      id={`bag-card-${b.id}`}
      className={`p-3.5 rounded-2xl border shadow-2xs space-y-3 transition-all ${
        isHighlighted
          ? 'border-blue-500 dark:border-blue-500 ring-2 ring-blue-500/40 shadow-md bg-blue-50/50 dark:bg-blue-950/20'
          : 'border-slate-200/90 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-850/40'
      }`}
    >
      {/* Bag Header */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <span
            className={`text-xs font-semibold px-2.5 py-0.5 rounded-lg font-mono ${
              isHighlighted
                ? 'bg-blue-600 text-white'
                : 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
            }`}
          >
            BAG #{idx + 1}
          </span>
          {isHighlighted && (
            <span className="text-[10px] font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider animate-pulse">
              Editing
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap justify-end">
          {dispatchType === 'Val' && (
            <>
              <span className="text-xs font-medium text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 px-2 py-0.5 rounded-md font-mono tabular-nums">
                Tare: -{fmtKg(tareKg)}
              </span>
              <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/50 px-2.5 py-0.5 rounded-md font-mono tabular-nums">
                Net: {fmtKg(netKg)}
              </span>
            </>
          )}
          {totalBagsCount > 1 && (
            <button
              type="button"
              onClick={() => onRemoveBag(b.id)}
              className="text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 w-11 h-11 min-w-[44px] min-h-[44px] rounded-xl flex items-center justify-center transition-colors cursor-pointer shrink-0"
              title="Remove bag"
            >
              <Trash2 size={16} strokeWidth={2.2} />
            </button>
          )}
        </div>
      </div>

      {/* Inputs based on Dispatch Type */}
      {dispatchType === 'Val' ? (
        <>
          {/* Row 1: Gross & Bungari */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1.5 pl-0.5">
                Gross (kg) <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  required
                  type="text"
                  inputMode="decimal"
                  placeholder="0.000"
                  className="h-11 w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl pl-3.5 pr-9 text-sm font-semibold tabular-nums text-slate-900 dark:text-white placeholder:text-slate-400 focus:ring-2 focus:ring-slate-900/10 dark:focus:ring-white/10 outline-none transition-all font-mono"
                  value={b.gross}
                  onChange={(e) => onUpdateBag(b.id, 'gross', e.target.value)}
                />
                <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-xs font-semibold text-slate-400">
                  kg
                </div>
              </div>
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1.5 pl-0.5">
                Bungari (pcs)
              </label>
              <div className="relative">
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="0"
                  className="h-11 w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl pl-3.5 pr-10 text-sm font-semibold tabular-nums text-slate-900 dark:text-white placeholder:text-slate-400 focus:ring-2 focus:ring-slate-900/10 dark:focus:ring-white/10 outline-none transition-all font-mono"
                  value={b.bungariCount}
                  onChange={(e) => onUpdateBag(b.id, 'bungariCount', e.target.value)}
                />
                <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-xs font-semibold text-slate-400">
                  pcs
                </div>
              </div>
            </div>
          </div>

          {/* Row 2: Tar & Rate dropdown + Twist selector */}
          <div className="flex items-center gap-2.5">
            {/* Tar & Rate dropdown */}
            <div className="flex-1 relative min-w-[140px]">
              {(() => {
                const cleanTar = String(b.tar || '').replace(/\D/g, '') || String(b.tar || '')
                return (
                  <select
                    value={cleanTar}
                    onChange={(e) => onUpdateBag(b.id, 'tar', e.target.value.replace(/\D/g, ''))}
                    className="h-11 w-full pl-3.5 pr-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold text-slate-900 dark:text-white appearance-none focus:outline-none focus:ring-2 focus:ring-slate-900/10 dark:focus:ring-white/10 transition-all cursor-pointer"
                  >
                    {!availableTarOptions.includes(Number(cleanTar)) && cleanTar && (
                      <option value={cleanTar}>
                        {cleanTar} Tar (₹{getTarRate(cleanTar)}/kg)
                      </option>
                    )}
                    {availableTarOptions.map((t) => (
                      <option key={t} value={String(t)}>{t} Tar (₹{getTarRate(String(t))}/kg)</option>
                    ))}
                  </select>
                )
              })()}
              <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                <ChevronDown size={14} strokeWidth={2.2} />
              </div>
            </div>

            {/* Twist selector ("S | Z | S+Z") mini toggle pills */}
            <div className="h-11 p-1 bg-slate-100 dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700/60 rounded-xl flex gap-1 items-center shrink-0">
              {(['S', 'Z', 'S+Z'] as const).map((tw) => (
                <button
                  key={tw}
                  type="button"
                  onClick={() => onUpdateBag(b.id, 'twistType', tw)}
                  className={`px-3 h-full rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center ${
                    b.twistType === tw
                      ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {tw}
                </button>
              ))}
            </div>
          </div>
        </>
      ) : (
        /* Rola bag inputs */
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1.5 pl-0.5">
              Gross (kg) <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <input
                required
                type="text"
                inputMode="decimal"
                placeholder="0.000"
                className="h-11 w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl pl-3.5 pr-9 text-sm font-semibold tabular-nums text-slate-900 dark:text-white placeholder:text-slate-400 focus:ring-2 focus:ring-slate-900/10 dark:focus:ring-white/10 outline-none transition-all font-mono"
                value={b.gross}
                onChange={(e) => onUpdateBag(b.id, 'gross', e.target.value)}
              />
              <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-xs font-semibold text-slate-400">
                kg
              </div>
            </div>
          </div>
          <div>
            <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1.5 pl-0.5">
              Rola (pcs)
            </label>
            <div className="relative">
              <input
                type="text"
                inputMode="numeric"
                placeholder="0"
                className="h-11 w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl pl-3.5 pr-10 text-sm font-semibold tabular-nums text-slate-900 dark:text-white placeholder:text-slate-400 focus:ring-2 focus:ring-slate-900/10 dark:focus:ring-white/10 outline-none transition-all font-mono"
                value={b.rolaCount}
                onChange={(e) => onUpdateBag(b.id, 'rolaCount', e.target.value)}
              />
              <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-xs font-semibold text-slate-400">
                pcs
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
})

export function DispatchEntriesList({
  dispatchType,
  currentBagCalculations,
  currentBags,
  availableTarOptions,
  editingId: _editingId,
  highlightedBagId,
  onUpdateBag,
  onRemoveBag,
  onAddBag,
}: DispatchEntriesListProps) {
  return (
    <div className="space-y-3">
      {currentBagCalculations.map((calc, idx) => (
        <BagCardRow
          key={calc.bag.id}
          calculation={calc}
          idx={idx}
          isHighlighted={calc.bag.id === highlightedBagId}
          dispatchType={dispatchType}
          availableTarOptions={availableTarOptions}
          totalBagsCount={currentBags.length}
          onUpdateBag={onUpdateBag}
          onRemoveBag={onRemoveBag}
        />
      ))}

      {/* + Add Bag Button */}
      <button
        type="button"
        onClick={onAddBag}
        className="w-full h-12 min-h-[48px] border-2 border-dashed border-slate-200 hover:border-slate-300 dark:border-slate-700 dark:hover:border-slate-600 rounded-xl bg-slate-50/50 hover:bg-slate-100/60 dark:bg-slate-850/40 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-300 font-semibold text-sm flex items-center justify-center gap-1.5 transition-all active:scale-[0.99] cursor-pointer mt-2"
      >
        <Plus size={16} strokeWidth={2.5} />
        <span>Add Bag #{currentBags.length + 1}</span>
      </button>
    </div>
  )
}
