import { useState, useCallback } from 'react'
import { useToast } from '@/context/ToastContext'
import { useData } from '@/hooks/useData'
import { addToTrashBin } from '@/services/storage/trashBinService'
import type { InwardReceiptGroup, ReceiptWithParty } from '@/features/inward/types/inward.types'
import { extractErrorMessage } from '@/utils/format'
import { clearModalHash } from '@/components/sheets/bottomSheetPhysics'

export function useInwardTransactions() {
  const { removeReceipt, removeReceipts } = useData()
  const { showToast } = useToast()

  const [optimisticDeletedIds, setOptimisticDeletedIds] = useState<Set<string>>(new Set())
  const [selectedGroupKeys, setSelectedGroupKeys] = useState<Set<string>>(new Set())
  const [receiptToDelete, setReceiptToDelete] = useState<InwardReceiptGroup | null>(null)
  const [bagToDelete, setBagToDelete] = useState<ReceiptWithParty | null>(null)
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false)
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null)

  const toggleSelectGroup = useCallback((key: string) => {
    setSelectedGroupKeys((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }, [])

  const toggleSelectAll = useCallback((allKeys: string[]) => {
    setSelectedGroupKeys((prev) => {
      if (allKeys.length > 0 && allKeys.every((k) => prev.has(k))) {
        return new Set()
      }
      return new Set(allKeys)
    })
  }, [])

  const handleDeleteBag = useCallback(
    async (item: ReceiptWithParty) => {
      const id = item.id
      setOptimisticDeletedIds((prev) => new Set(prev).add(id))

      try {
        await removeReceipt(id)
        addToTrashBin({
          id: item.id,
          type: 'receipt',
          title: `Inward Bag #${item.challan_no || '—'}`,
          subtitle: `Date: ${item.date} • Gross: ${item.gross_weight} kg • Net: ${item.net_weight} kg`,
          payload: [item],
        })

        showToast('Bag deleted successfully', {
          type: 'delete',
          action: {
            label: 'Undo',
            onClick: () => {
              setOptimisticDeletedIds((prev) => {
                const next = new Set(prev)
                next.delete(id)
                return next
              })
              showToast('Bag restored', 'success')
            },
          },
        })
      } catch (err: unknown) {
        console.error('Delete inward bag error:', err)
        setOptimisticDeletedIds((prev) => {
          const next = new Set(prev)
          next.delete(id)
          return next
        })
        const msg = extractErrorMessage(err, 'Could not delete bag')
        showToast(`Delete failed: ${msg}`, 'error')
      }
    },
    [removeReceipt, showToast]
  )

  const handleDeleteReceipt = useCallback(
    async (group: InwardReceiptGroup) => {
      const entriesToRestore = [...group.receipts]
      const ids = group.receipts.map((e) => e.id)
      if (!ids.length) return

      ids.forEach((id) => setOptimisticDeletedIds((prev) => new Set(prev).add(id)))

      if (selectedGroupId === group.id) {
        setSelectedGroupId(null)
        clearModalHash()
      }

      setSelectedGroupKeys((prev) => {
        const next = new Set(prev)
        next.delete(group.id)
        return next
      })

      try {
        await removeReceipts(ids)
        const chLabel = group.challan_no ? `Challan #${group.challan_no}` : 'Challan'

        addToTrashBin({
          id: group.id,
          type: 'receipt',
          title: `${chLabel} (${group.party_name || 'Party'})`,
          subtitle: `${group.receipts.length} bags • Net: ${group.net.toFixed(3)} kg`,
          payload: entriesToRestore,
        })

        showToast(`${chLabel} deleted`, {
          type: 'info',
          action: {
            label: 'Undo',
            onClick: () => {
              ids.forEach((id) =>
                setOptimisticDeletedIds((prev) => {
                  const next = new Set(prev)
                  next.delete(id)
                  return next
                })
              )
              showToast(`${chLabel} restored`, 'success')
            },
          },
        })
      } catch (err: unknown) {
        console.error('Delete inward receipt error:', err)
        ids.forEach((id) =>
          setOptimisticDeletedIds((prev) => {
            const next = new Set(prev)
            next.delete(id)
            return next
          })
        )
        const msg = extractErrorMessage(err, 'Could not delete challan')
        showToast(`Delete failed: ${msg}`, 'error')
      }
    },
    [removeReceipts, selectedGroupId, showToast]
  )

  const handleBulkDeleteReceipts = useCallback(
    async (targetGroups: InwardReceiptGroup[]) => {
      const allIds = targetGroups.flatMap((g) => g.receipts.map((e) => e.id))
      if (!allIds.length) return

      allIds.forEach((id) => setOptimisticDeletedIds((prev) => new Set(prev).add(id)))
      setSelectedGroupKeys(new Set())
      setShowBulkDeleteConfirm(false)

      try {
        await removeReceipts(allIds)
        showToast(`${targetGroups.length} challans deleted`, 'info')
      } catch (err: unknown) {
        console.error('Bulk delete receipts error:', err)
        allIds.forEach((id) =>
          setOptimisticDeletedIds((prev) => {
            const next = new Set(prev)
            next.delete(id)
            return next
          })
        )
        const msg = extractErrorMessage(err, 'Failed to delete selected receipts')
        showToast(msg, 'error')
      }
    },
    [removeReceipts, showToast]
  )

  return {
    optimisticDeletedIds,
    setOptimisticDeletedIds,
    selectedGroupKeys,
    setSelectedGroupKeys,
    selectedGroupId,
    setSelectedGroupId,
    receiptToDelete,
    setReceiptToDelete,
    bagToDelete,
    setBagToDelete,
    showBulkDeleteConfirm,
    setShowBulkDeleteConfirm,
    toggleSelectGroup,
    toggleSelectAll,
    handleDeleteBag,
    handleDeleteReceipt,
    handleBulkDeleteReceipts,
  }
}
