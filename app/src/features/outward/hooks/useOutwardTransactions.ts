import { useState, useCallback } from 'react'
import { useToast } from '@/context/ToastContext'
import { useData } from '@/hooks/useData'
import { addToTrashBin } from '@/services/storage/trashBinService'
import type { ChallanGroup, DispatchWithParty } from '@/features/outward/types'
import { extractErrorMessage } from '@/utils/format'
import { clearModalHash } from '@/components/sheets/bottomSheetPhysics'

export function useOutwardTransactions() {
  const { removeDispatch, removeDispatches, dispatches } = useData()
  const { showToast } = useToast()

  const [optimisticDeletedIds, setOptimisticDeletedIds] = useState<Set<string>>(new Set())
  const [selectedGroupKeys, setSelectedGroupKeys] = useState<Set<string>>(new Set())
  const [challanToDelete, setChallanToDelete] = useState<ChallanGroup | null>(null)
  const [bagToDelete, setBagToDelete] = useState<DispatchWithParty | null>(null)
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false)
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null)

  const toggleSelectGroup = useCallback((key: string) => {
    setSelectedGroupKeys((prev) => {
      const next = new Set(prev)
      if (next.has(key)) {
        next.delete(key)
      } else {
        next.add(key)
      }
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
    async (item: DispatchWithParty) => {
      const id = item.id
      setOptimisticDeletedIds((prev) => new Set(prev).add(id))

      try {
        await removeDispatch(id)
        addToTrashBin({
          id: item.id,
          type: 'dispatch',
          title: `Dispatch Bag #${item.challan_no || '—'}`,
          subtitle: `Date: ${item.date}${item.net_val_weight ? ` • ${item.net_val_weight} kg` : ''}`,
          payload: [
            {
              party_id: item.party_id,
              date: item.date,
              dispatch_type: item.dispatch_type,
              challan_no: item.challan_no,
              cord_count: item.cord_count,
              twist_type: item.twist_type,
              bungari_count: item.bungari_count ?? 0,
              bungari_weight_g: item.bungari_weight_g ?? null,
              bore_gross_weight: item.bore_gross_weight ?? 0,
              net_val_weight: item.net_val_weight ?? null,
              rate_per_kg: item.rate_per_kg ?? null,
              amount: item.amount ?? null,
              bori_count: item.bori_count,
              rola_count: item.rola_count ?? null,
              notes: item.notes ?? null,
            },
          ],
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
        console.error('Delete dispatch error:', err)
        setOptimisticDeletedIds((prev) => {
          const next = new Set(prev)
          next.delete(id)
          return next
        })
        const msg = extractErrorMessage(err, 'Could not delete bag')
        showToast(`Delete failed: ${msg}`, 'error')
      }
    },
    [removeDispatch, showToast]
  )

  const handleDeleteBagRow = useCallback(
    async (id: string, _group?: ChallanGroup) => {
      const item = dispatches.find((d) => d.id === id)
      if (!item) return
      const confirmed = window.confirm('Are you sure you want to delete this bag record?')
      if (!confirmed) return
      await handleDeleteBag(item)
    },
    [dispatches, handleDeleteBag]
  )

  const handleDeleteChallan = useCallback(
    async (group: ChallanGroup) => {
      const entriesToRestore = [...group.entries]
      const ids = group.entries.map((e) => e.id)
      if (!ids.length) return

      ids.forEach((id) => setOptimisticDeletedIds((prev) => new Set(prev).add(id)))

      if (selectedGroupId === group.key) {
        setSelectedGroupId(null)
        clearModalHash()
      }

      setSelectedGroupKeys((prev) => {
        const next = new Set(prev)
        next.delete(group.key)
        return next
      })

      try {
        await removeDispatches(ids)
        const chLabel =
          group.challanNo && group.challanNo !== '—'
            ? `Challan #${String(group.challanNo).replace(/^#/, '')}`
            : `Challan`

        addToTrashBin({
          id: group.key,
          type: 'dispatch',
          title: `${chLabel} (${group.partyName || 'Party'})`,
          subtitle: `${group.entries.length} bags • ${group.totalValNet ? `${group.totalValNet.toFixed(3)} kg` : ''}`,
          payload: entriesToRestore.map((e) => ({
            party_id: e.party_id,
            date: e.date,
            dispatch_type: e.dispatch_type,
            challan_no: e.challan_no,
            cord_count: e.cord_count,
            twist_type: e.twist_type,
            bungari_count: e.bungari_count ?? 0,
            bungari_weight_g: e.bungari_weight_g ?? null,
            bore_gross_weight: e.bore_gross_weight ?? 0,
            net_val_weight: e.net_val_weight ?? null,
            rate_per_kg: e.rate_per_kg ?? null,
            amount: e.amount ?? null,
            bori_count: e.bori_count,
            notes: e.notes,
          })),
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
        console.error('Delete challan error:', err)
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
    [removeDispatches, selectedGroupId, showToast]
  )

  const handleBulkDeleteChallans = useCallback(
    async (targetGroups: ChallanGroup[]) => {
      const allIds = targetGroups.flatMap((g) => g.entries.map((e) => e.id))
      if (!allIds.length) return

      allIds.forEach((id) => setOptimisticDeletedIds((prev) => new Set(prev).add(id)))
      setSelectedGroupKeys(new Set())
      setShowBulkDeleteConfirm(false)

      try {
        await removeDispatches(allIds)
        showToast(`${targetGroups.length} challans deleted`, 'info')
      } catch (err: unknown) {
        console.error('Bulk delete error:', err)
        allIds.forEach((id) =>
          setOptimisticDeletedIds((prev) => {
            const next = new Set(prev)
            next.delete(id)
            return next
          })
        )
        const msg = extractErrorMessage(err, 'Failed to delete selected challans')
        showToast(msg, 'error')
      }
    },
    [removeDispatches, showToast]
  )

  return {
    optimisticDeletedIds,
    setOptimisticDeletedIds,
    selectedGroupKeys,
    setSelectedGroupKeys,
    selectedGroupId,
    setSelectedGroupId,
    challanToDelete,
    setChallanToDelete,
    bagToDelete,
    setBagToDelete,
    showBulkDeleteConfirm,
    setShowBulkDeleteConfirm,
    toggleSelectGroup,
    toggleSelectAll,
    handleDeleteBag,
    handleDeleteBagRow,
    handleDeleteChallan,
    handleBulkDeleteChallans,
  }
}
