import { describe, it, expect, beforeEach, vi } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import {
  addToTrashBin,
  getTrashBinItems,
  permanentlyDeleteTrashItem,
  clearTrashBin,
  restoreFromTrashBin,
  type TrashItem,
} from '../services/storage/trashBinService'

describe('Saved Data Deletion UX Patterns (Swipe-to-Trash, Danger Zone, Soft Delete Archive)', () => {
  const srcDir = path.resolve(__dirname, '..')

  describe('Pattern 1: The "Swipe-to-Trash" with Undo Banner (Mobile & Android Best Practice)', () => {
    const swipeableRowCode = fs.readFileSync(path.join(srcDir, 'components/common/SwipeableRow.tsx'), 'utf8')
    const mobileRecordCardCode = fs.readFileSync(path.join(srcDir, 'components/common/MobileRecordCard.tsx'), 'utf8')
    const partyDirectoryCode = fs.readFileSync(path.join(srcDir, 'features/parties/pages/PartyDirectoryPage.tsx'), 'utf8')

    it('implements Framer Motion horizontal swipe physics with haptic feedback at threshold', () => {
      expect(swipeableRowCode).toContain('useMotionValue')
      expect(swipeableRowCode).toContain('HAPTIC_THRESHOLD = -50')
      expect(swipeableRowCode).toContain('triggerHaptic(ImpactStyle.Medium)')
    })

    it('reveals solid red warning background with Trash2 icon when swiping left', () => {
      expect(swipeableRowCode).toContain('bg-rose-600')
      expect(swipeableRowCode).toContain('Trash2')
      expect(swipeableRowCode).toContain('deleteOpacity')
    })

    it('triggers immediate deletion when swiped past drag threshold (-160px)', () => {
      expect(swipeableRowCode).toContain('info.offset.x < -160')
      expect(swipeableRowCode).toContain('onDelete()')
    })

    it('wraps MobileRecordCard in SwipeableRow whenever onDelete callback is passed', () => {
      expect(mobileRecordCardCode).toContain('import { SwipeableRow } from \'./SwipeableRow\'')
      expect(mobileRecordCardCode).toContain('<SwipeableRow onDelete={onDelete}')
    })

    it('wraps mobile party cards in SwipeableRow with active transactions guard', () => {
      expect(partyDirectoryCode).toContain('<SwipeableRow')
      expect(partyDirectoryCode).toContain('checkCanDeleteParty(p.id, receipts, dispatches, payments, p.name)')
      expect(partyDirectoryCode).toContain('handleDelete(p.id)')
    })
  })

  describe('Pattern 2: The Danger Zone (Detailed View / Edit Screens)', () => {
    const dangerZoneCode = fs.readFileSync(path.join(srcDir, 'components/feedback/DangerZone.tsx'), 'utf8')
    const confirmDialogCode = fs.readFileSync(path.join(srcDir, 'components/feedback/DestructiveConfirmDialog.tsx'), 'utf8')
    const inwardPageCode = fs.readFileSync(path.join(srcDir, 'features/inward/pages/InwardPage.tsx'), 'utf8')
    const outwardPageCode = fs.readFileSync(path.join(srcDir, 'features/outward/components/OutwardSettlementSummary.tsx'), 'utf8')
    const partyDirectoryCode = fs.readFileSync(path.join(srcDir, 'features/parties/pages/PartyDirectoryPage.tsx'), 'utf8')
    const expensesPageCode = fs.readFileSync(path.join(srcDir, 'features/expenses/pages/OperatingExpensesPage.tsx'), 'utf8')
    const billingPageCode = fs.readFileSync(path.join(srcDir, 'features/billing/pages/BillingPage.tsx'), 'utf8')

    it('DangerZone component renders a visually separated red-bordered card container', () => {
      expect(dangerZoneCode).toContain('border-rose-200')
      expect(dangerZoneCode).toContain('bg-rose-50/40')
      expect(dangerZoneCode).toContain('AlertOctagon')
      expect(dangerZoneCode).toContain('Trash2')
    })

    it('DangerZone displays disabled warning explanation when deletion is blocked', () => {
      expect(dangerZoneCode).toContain('disabledReason')
      expect(dangerZoneCode).toContain('disabled={disabled || isDeleting}')
    })

    it('DestructiveConfirmDialog implements accessible WAI-ARIA alertdialog pattern', () => {
      expect(confirmDialogCode).toContain('role="alertdialog"')
      expect(confirmDialogCode).toContain('aria-modal="true"')
      expect(confirmDialogCode).toContain('aria-labelledby="destructive-dialog-title"')
      expect(confirmDialogCode).toContain('aria-describedby="destructive-dialog-desc"')
    })

    it('DestructiveConfirmDialog auto-focuses the safe neutral Cancel button on mount', () => {
      expect(confirmDialogCode).toContain('cancelBtnRef')
      expect(confirmDialogCode).toContain('cancelBtnRef.current?.focus()')
    })

    it('DestructiveConfirmDialog supports Escape key and backdrop dismissal', () => {
      expect(confirmDialogCode).toContain("e.key === 'Escape'")
      expect(confirmDialogCode).toContain('onCancel()')
    })

    it('DestructiveConfirmDialog displays specific item name in confirmation text', () => {
      expect(confirmDialogCode).toContain('itemName')
      expect(confirmDialogCode).toContain('Delete "${itemName}" permanently?')
    })

    it('integrates DangerZone in Inward receipt edit modal', () => {
      expect(inwardPageCode).toContain('<DangerZone')
      expect(inwardPageCode).toContain('editingId &&')
      expect(inwardPageCode).toContain('buttonLabel="Delete Challan"')
    })

    it('integrates DangerZone in Outward dispatch edit modal', () => {
      expect(outwardPageCode).toContain('<DangerZone')
      expect(outwardPageCode).toContain('editingId &&')
      expect(outwardPageCode).toContain('buttonLabel="Delete Challan"')
    })

    it('integrates DangerZone in Party edit modal with transaction check guard', () => {
      expect(partyDirectoryCode).toContain('<DangerZone')
      expect(partyDirectoryCode).toContain('form.id &&')
      expect(partyDirectoryCode).toContain('checkCanDeleteParty')
      expect(partyDirectoryCode).toContain('disabled={!checkCanDeleteParty')
    })

    it('integrates DangerZone in Operating Expenses edit modal', () => {
      expect(expensesPageCode).toContain('<DangerZone')
      expect(expensesPageCode).toContain('form.id &&')
      expect(expensesPageCode).toContain('buttonLabel="Delete Expense"')
    })

    it('integrates DangerZone in Billing payment edit modal', () => {
      expect(billingPageCode).toContain('<DangerZone')
      expect(billingPageCode).toContain('form.id &&')
      expect(billingPageCode).toContain('buttonLabel="Delete Payment"')
    })
  })

  describe('Pattern 3: Soft Delete / Archive Bin (Storage & Recovery Lifecycle)', () => {
    const trashBinModalCode = fs.readFileSync(path.join(srcDir, 'features/settings/sheets/TrashBinModal.tsx'), 'utf8')
    const backupActionsCode = fs.readFileSync(path.join(srcDir, 'features/settings/components/DatabaseBackupActions.tsx'), 'utf8')

    let store: Record<string, string> = {}
    const mockLocalStorage = {
      getItem: (key: string) => store[key] ?? null,
      setItem: (key: string, val: string) => {
        store[key] = String(val)
      },
      removeItem: (key: string) => {
        delete store[key]
      },
      clear: () => {
        store = {}
      },
    }

    beforeEach(() => {
      store = {}
      vi.stubGlobal('localStorage', mockLocalStorage)
      vi.stubGlobal('window', {
        dispatchEvent: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      })
    })

    it('adds soft-deleted records to local storage with ISO timestamp', () => {
      addToTrashBin({
        id: 'rec_101',
        type: 'receipt',
        title: 'Challan #104 (Vikas Zari)',
        subtitle: '3 bags • 58.200 kg',
        payload: { id: 'rec_101', challan_no: '104' },
      })

      const items = getTrashBinItems()
      expect(items).toHaveLength(1)
      expect(items[0].id).toBe('rec_101')
      expect(items[0].type).toBe('receipt')
      expect(items[0].title).toBe('Challan #104 (Vikas Zari)')
      expect(items[0].deletedAt).toBeDefined()
    })

    it('prevents duplicate entries when re-deleting same id and type', () => {
      addToTrashBin({
        id: 'rec_101',
        type: 'receipt',
        title: 'Challan #104',
        payload: {},
      })
      addToTrashBin({
        id: 'rec_101',
        type: 'receipt',
        title: 'Challan #104 Updated',
        payload: {},
      })

      const items = getTrashBinItems()
      expect(items).toHaveLength(1)
      expect(items[0].title).toBe('Challan #104 Updated')
    })

    it('auto-prunes items older than 30 days', () => {
      const expiredDate = new Date(Date.now() - 35 * 24 * 60 * 60 * 1000).toISOString()
      const freshDate = new Date().toISOString()

      const mockTrash: TrashItem[] = [
        {
          id: 'old_1',
          type: 'expense',
          title: 'Old Expense',
          deletedAt: expiredDate,
          payload: {},
        },
        {
          id: 'new_1',
          type: 'expense',
          title: 'Recent Expense',
          deletedAt: freshDate,
          payload: {},
        },
      ]

      localStorage.setItem('valmanager_trash_bin', JSON.stringify(mockTrash))

      const items = getTrashBinItems()
      expect(items).toHaveLength(1)
      expect(items[0].id).toBe('new_1')
    })

    it('permanently deletes a single item by id and type', () => {
      addToTrashBin({ id: 'disp_1', type: 'dispatch', title: 'Dispatch #1', payload: {} })
      addToTrashBin({ id: 'disp_2', type: 'dispatch', title: 'Dispatch #2', payload: {} })

      permanentlyDeleteTrashItem('disp_1', 'dispatch')

      const items = getTrashBinItems()
      expect(items).toHaveLength(1)
      expect(items[0].id).toBe('disp_2')
    })

    it('clears all items permanently', () => {
      addToTrashBin({ id: 'p_1', type: 'payment', title: 'Payment #1', payload: {} })
      addToTrashBin({ id: 'p_2', type: 'payment', title: 'Payment #2', payload: {} })

      clearTrashBin()

      expect(getTrashBinItems()).toHaveLength(0)
    })

    it('restores item using its payload and removes it from trash bin', async () => {
      const mockInserter = vi.fn().mockResolvedValue(undefined)

      addToTrashBin({
        id: 'party_99',
        type: 'party',
        title: 'Party Golden',
        payload: { name: 'Golden Zari', phone: '9876543210' },
      })

      const items = getTrashBinItems()
      const success = await restoreFromTrashBin(items[0], mockInserter)

      expect(success).toBe(true)
      expect(mockInserter).toHaveBeenCalledWith({ name: 'Golden Zari', phone: '9876543210' })
      expect(getTrashBinItems()).toHaveLength(0)
    })

    it('TrashBinModal component contains category filter tabs and restore actions', () => {
      expect(trashBinModalCode).toContain("['all', 'receipt', 'dispatch', 'payment', 'expense', 'party']")
      expect(trashBinModalCode).toContain('filterType === t')
      expect(trashBinModalCode).toContain('handleRestore')
      expect(trashBinModalCode).toContain('handleDeleteForever')
    })

    it('DatabaseBackupActions connects Trash & Archive Bin with live counter badge', () => {
      expect(backupActionsCode).toContain('Trash &amp; Archive Bin')
      expect(backupActionsCode).toContain('TrashBinModal')
      expect(backupActionsCode).toContain('kasab:trash-updated')
      expect(backupActionsCode).toContain('{trashCount}')
    })
  })
})
