import { Download } from 'lucide-react'
import { BottomSheetWrapper } from '@/components/sheets/BottomSheetWrapper'
import { EmptyState } from '@/components/common/EmptyState'
import { MoMTableMatrix, type MoMBreakdownData } from '@/features/expenses/components/MoMTableMatrix'

export type { MoMBreakdownData }

export interface MoMBreakdownSheetProps {
  isOpen: boolean
  onClose: () => void
  momData: MoMBreakdownData
  formatMoMMonthHeader: (ym: string) => string
  onExportMoMCSV: () => void
}

export function MoMBreakdownSheet({
  isOpen,
  onClose,
  momData,
  formatMoMMonthHeader,
  onExportMoMCSV,
}: MoMBreakdownSheetProps) {
  return (
    <BottomSheetWrapper
      isOpen={isOpen}
      onClose={onClose}
      title={<span className="text-lg font-bold text-slate-950 dark:text-white">MoM Operating Breakdown</span>}
      subtitle="Historical monthly category expenditure"
      maxWidth="sm:max-w-4xl"
      maxHeight="max-h-[85vh]"
      headerRight={
        <button
          type="button"
          onClick={onExportMoMCSV}
          disabled={momData.months.length === 0}
          className="h-8 px-2.5 sm:px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 shadow-xs transition-all flex items-center gap-1.5 shrink-0 disabled:opacity-50 active:scale-95 cursor-pointer mr-1"
          title="Export MoM Breakdown to CSV"
        >
          <Download size={13} strokeWidth={2.2} className="text-slate-500 dark:text-slate-400" />
          <span>Export CSV</span>
        </button>
      }
    >
      <div className="p-4 sm:p-6 overflow-y-auto no-scrollbar pb-8">
        {momData.months.length === 0 ? (
          <div className="py-12 text-center">
            <EmptyState text="No historical operating expenses recorded yet." />
          </div>
        ) : (
          <MoMTableMatrix
            momData={momData}
            formatMoMMonthHeader={formatMoMMonthHeader}
          />
        )}
      </div>
    </BottomSheetWrapper>
  )
}
