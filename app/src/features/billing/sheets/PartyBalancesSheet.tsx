import { Plus, BookOpen } from 'lucide-react'
import { BottomSheetWrapper } from '@/components/sheets/BottomSheetWrapper'
import { fmtMoney } from '@/utils/format'
import { getPartyInitials } from '@/features/parties/utils'
import type { Party } from '@/features/parties/types'

export interface PartyBalanceItem {
  party: Party
  receivable: number
  received: number
  balance: number
}

export interface PartyBalancesSheetProps {
  isOpen: boolean
  onClose: () => void
  partyBalances: PartyBalanceItem[]
  totalOutstanding: number
  onLogPayment: (partyId: string) => void
  onOpenKhata: (party: Party) => void
}

export function PartyBalancesSheet({
  isOpen,
  onClose,
  partyBalances,
  totalOutstanding,
  onLogPayment,
  onOpenKhata,
}: PartyBalancesSheetProps) {
  return (
    <BottomSheetWrapper
      isOpen={isOpen}
      onClose={onClose}
      category="PARTY ACCOUNTS"
      title="Party Balances"
      subtitle={`Real-time Billed vs Settled Ledger (${partyBalances.length} parties)`}
      maxWidth="sm:max-w-xl"
    >
      <div className="p-4 sm:p-6 space-y-3 max-h-[75vh] overflow-y-auto no-scrollbar">
        {/* Top Summary Header Banner */}
        <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-3 border border-slate-200/70 dark:border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block">
              Total Outstanding Due
            </span>
            <span className="text-lg font-bold font-mono text-amber-600 dark:text-amber-400 tabular-nums">
              {fmtMoney(totalOutstanding)}
            </span>
          </div>
          <div className="text-right">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block">
              Active Accounts
            </span>
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              {partyBalances.length} Parties
            </span>
          </div>
        </div>

        {/* List of Party Balance Cards */}
        {partyBalances.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-400">
            No receivables or balances yet.
          </div>
        ) : (
          <div className="space-y-2.5">
            {partyBalances.map((r) => {
              const initials = getPartyInitials(r.party.name)

              return (
                <div
                  key={r.party.id}
                  onClick={() => {
                    onClose()
                    onOpenKhata(r.party)
                  }}
                  className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-3.5 shadow-xs hover:border-slate-300 dark:hover:border-slate-700 transition-all cursor-pointer active:scale-[0.99] group"
                >
                  {/* Header Row: Avatar + Party Name + Status Pill */}
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2 min-w-0 flex-1 pr-1">
                      <div className="size-7 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200/70 dark:border-slate-700/70 text-xs font-bold flex items-center justify-center shrink-0">
                        {initials}
                      </div>
                      <h3
                        className="font-bold text-xs text-slate-900 dark:text-white tracking-tight truncate min-w-0"
                        title={r.party.name}
                      >
                        {r.party.name}
                      </h3>
                    </div>

                    {/* Right Status Pill */}
                    {r.balance > 0 ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 border border-rose-200/70 dark:border-rose-800/60 shrink-0">
                        Pending Due
                      </span>
                    ) : r.balance < 0 ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200/70 dark:border-emerald-800/60 shrink-0">
                        Advance Balance
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 shrink-0">
                        Settled
                      </span>
                    )}
                  </div>

                  {/* Metrics Row: Billed | Received | Net */}
                  <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800/80">
                    <div className="grid grid-cols-3 gap-1.5 flex-1 min-w-0">
                      <div className="min-w-0">
                        <span className="text-[9.5px] font-medium text-slate-400 dark:text-slate-500 block leading-tight">
                          Billed
                        </span>
                        <span className="text-xs font-bold font-mono text-slate-800 dark:text-slate-200 tabular-nums block truncate">
                          {fmtMoney(r.receivable)}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <span className="text-[9.5px] font-medium text-slate-400 dark:text-slate-500 block leading-tight">
                          Received
                        </span>
                        <span className="text-xs font-bold font-mono text-emerald-600 dark:text-emerald-400 tabular-nums block truncate">
                          {fmtMoney(r.received)}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <span className="text-[9.5px] font-medium text-slate-400 dark:text-slate-500 block leading-tight">
                          Net
                        </span>
                        <span
                          className={`text-xs font-bold font-mono tracking-tight tabular-nums block truncate ${
                            r.balance > 0
                              ? 'text-rose-600 dark:text-rose-400'
                              : r.balance < 0
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : 'text-slate-500 dark:text-slate-400'
                          }`}
                        >
                          {r.balance > 0
                            ? fmtMoney(r.balance)
                            : r.balance < 0
                            ? `${fmtMoney(Math.abs(r.balance))} Adv`
                            : '₹0'}
                        </span>
                      </div>
                    </div>

                    {/* Quick Action Buttons */}
                    <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={() => {
                          onClose()
                          onLogPayment(r.party.id)
                        }}
                        className="h-7 px-2.5 bg-slate-950 dark:bg-white text-white dark:text-slate-950 text-[11px] font-semibold rounded-lg active:scale-95 transition-transform flex items-center gap-1 shrink-0 shadow-2xs cursor-pointer"
                        title={`Log payment for ${r.party.name}`}
                      >
                        <Plus size={12} strokeWidth={2.5} />
                        <span>+ Log</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          onClose()
                          onOpenKhata(r.party)
                        }}
                        className="h-7 px-2 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[11px] font-semibold rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 active:scale-95 transition-all flex items-center gap-1 shrink-0 cursor-pointer"
                        title="View complete Ledger & Statement"
                      >
                        <BookOpen size={12} className="text-slate-400" />
                        <span className="hidden xs:inline">Khata</span>
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </BottomSheetWrapper>
  )
}
