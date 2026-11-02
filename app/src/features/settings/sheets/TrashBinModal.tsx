import { useState, useEffect, useCallback } from 'react'
import {
  Trash2,
  RotateCcw,
  PackagePlus,
  Truck,
  CreditCard,
  Receipt,
  Users,
  FolderArchive,
} from 'lucide-react'
import { BottomSheetModal } from '@/components/sheets/BottomSheetModal'
import {
  getTrashBinItems,
  permanentlyDeleteTrashItem,
  clearTrashBin,
  type TrashItem,
  type TrashItemType,
} from '@/services/storage/trashBinService'
import { insertReceipts } from '@/lib/api/receipts'
import { insertDispatches } from '@/lib/api/dispatch'
import { recordPayment } from '@/lib/api/payments'
import { recordExpense } from '@/lib/api/expenses'
import { insertParty } from '@/lib/api/parties'
import { useToast } from '@/context/ToastContext'
import { DestructiveConfirmDialog } from '@/components/feedback/DestructiveConfirmDialog'
import { fmtDate } from '@/utils/date'

export interface TrashBinModalProps {
  isOpen: boolean
  onClose: () => void
}

export function TrashBinModal({ isOpen, onClose }: TrashBinModalProps) {
  const [items, setItems] = useState<TrashItem[]>([])
  const [filterType, setFilterType] = useState<string>('all')
  const [itemToDeleteForever, setItemToDeleteForever] = useState<TrashItem | null>(null)
  const [isRestoringId, setIsRestoringId] = useState<string | null>(null)
  const { showToast } = useToast()

  const refreshItems = useCallback(() => {
    setItems(getTrashBinItems())
  }, [])

  useEffect(() => {
    if (isOpen) {
      refreshItems()
    }
  }, [isOpen, refreshItems])

  const getItemIcon = (type: TrashItemType) => {
    switch (type) {
      case 'receipt':
        return <PackagePlus size={16} className="text-emerald-500" />
      case 'dispatch':
        return <Truck size={16} className="text-blue-500" />
      case 'payment':
        return <CreditCard size={16} className="text-blue-600" />
      case 'expense':
        return <Receipt size={16} className="text-amber-500" />
      case 'party':
        return <Users size={16} className="text-blue-500" />
    }
  }

  const handleRestore = async (item: TrashItem) => {
    setIsRestoringId(item.id)
    try {
      if (item.type === 'receipt') {
        const payload = Array.isArray(item.payload) ? item.payload : [item.payload]
        await insertReceipts(payload)
      } else if (item.type === 'dispatch') {
        const payload = Array.isArray(item.payload) ? item.payload : [item.payload]
        await insertDispatches(payload)
      } else if (item.type === 'payment') {
        await recordPayment(item.payload)
      } else if (item.type === 'expense') {
        await recordExpense(item.payload)
      } else if (item.type === 'party') {
        await insertParty(item.payload)
      }

      permanentlyDeleteTrashItem(item.id, item.type)
      refreshItems()
      showToast(`Restored "${item.title}" successfully.`, 'success')
      window.dispatchEvent(new CustomEvent('kasab:refresh-data'))
    } catch (err) {
      console.error('[TrashBinModal] Restore error:', err)
      showToast('Could not restore item. Please try again.', 'error')
    } finally {
      setIsRestoringId(null)
    }
  }

  const handleDeleteForever = () => {
    if (!itemToDeleteForever) return
    permanentlyDeleteTrashItem(itemToDeleteForever.id, itemToDeleteForever.type)
    setItemToDeleteForever(null)
    refreshItems()
    showToast(`Permanently deleted from trash.`, 'info')
  }

  const handleClearAll = () => {
    clearTrashBin()
    refreshItems()
    showToast('Trash Bin cleared completely.', 'info')
  }

  const filteredItems = items.filter((item) => {
    if (filterType === 'all') return true
    return item.type === filterType
  })

  return (
    <>
      <BottomSheetModal
        isOpen={isOpen}
        onClose={onClose}
        category="RECOVERY & ARCHIVE"
        title="Recently Deleted (Trash Bin)"
        subtitle="Deleted records are safely kept here for 30 days before permanent removal"
        maxWidth="sm:max-w-2xl"
        bodyClassName="p-4 sm:p-6 space-y-4"
        headerRight={
          items.length > 0 ? (
            <button
              type="button"
              onClick={handleClearAll}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-rose-200 dark:border-rose-900 transition-colors cursor-pointer"
            >
              Clear Trash
            </button>
          ) : undefined
        }
      >
        {/* Category Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar select-none">
          {['all', 'receipt', 'dispatch', 'payment', 'expense', 'party'].map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setFilterType(t)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold capitalize whitespace-nowrap transition-all cursor-pointer ${
                filterType === t
                  ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-2xs'
                  : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              {t === 'all' ? `All (${items.length})` : t}
            </button>
          ))}
        </div>

        {/* Item List or Empty State */}
        {filteredItems.length === 0 ? (
          <div className="text-center py-12 px-4 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-3 text-slate-400">
              <FolderArchive size={24} />
            </div>
            <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-1">
              Trash Bin is Empty
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto leading-relaxed">
              When you delete receipts, dispatches, expenses, or payments, they will be safely preserved here for easy 1-click restoration.
            </p>
          </div>
        ) : (
          <div className="space-y-2.5 max-h-[60vh] overflow-y-auto pr-1">
            {filteredItems.map((item) => (
              <div
                key={`${item.type}-${item.id}`}
                className="p-3.5 rounded-xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs"
              >
                <div className="flex items-start gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0 mt-0.5">
                    {getItemIcon(item.type)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                        {item.title}
                      </span>
                      <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 shrink-0">
                        {item.type}
                      </span>
                    </div>
                    {item.subtitle && (
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                        {item.subtitle}
                      </p>
                    )}
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 block">
                      Deleted on {fmtDate(item.deletedAt)}
                    </span>
                  </div>
                </div>

                {/* Actions: Restore (Green) & Delete Forever (Red) */}
                <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                  <button
                    type="button"
                    onClick={() => handleRestore(item)}
                    disabled={isRestoringId === item.id}
                    className="h-9 px-3 rounded-lg text-xs font-bold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:text-emerald-300 dark:hover:bg-emerald-900/60 border border-emerald-200 dark:border-emerald-800 flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50 min-h-[36px]"
                    title="Restore record back to database"
                  >
                    <RotateCcw size={13} className={isRestoringId === item.id ? 'animate-spin' : ''} />
                    <span>Restore</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setItemToDeleteForever(item)}
                    className="h-9 px-2.5 rounded-lg text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-rose-200 dark:border-rose-900 transition-colors cursor-pointer min-h-[36px]"
                    title="Delete permanently forever"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </BottomSheetModal>

      {itemToDeleteForever && (
        <DestructiveConfirmDialog
          isOpen={Boolean(itemToDeleteForever)}
          itemName={itemToDeleteForever.title}
          title={`Delete "${itemToDeleteForever.title}" forever?`}
          description="This will permanently purge this record from the Trash Bin. You will not be able to restore it again."
          confirmLabel="Delete Forever"
          onConfirm={handleDeleteForever}
          onCancel={() => setItemToDeleteForever(null)}
        />
      )}
    </>
  )
}
