import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'

describe('Data Entry & Edge Cases Audit ("Galti Proofing")', () => {
  const srcDir = path.resolve(__dirname, '..')

  describe('1. Fat Finger Test (Android >= 48dp Minimum Touch Target)', () => {
    it('ensures BottomNavigation buttons have at least 48x48 touch targets', () => {
      const code = fs.readFileSync(path.join(srcDir, 'components/layout/BottomNavigation.tsx'), 'utf8')
      expect(code).toContain('min-h-[48px] min-w-[48px]')
      expect(code).toContain('h-10')
    })

    it('ensures SpeedDialFab and sub-actions meet or exceed 48x48dp', () => {
      const code = fs.readFileSync(path.join(srcDir, 'components/layout/SpeedDialFab.tsx'), 'utf8')
      // Main trigger FAB (52x52px)
      expect(code).toContain('w-[52px] h-[52px] min-w-[52px] min-h-[52px]')
      // Sub-actions (48x48px)
      expect(code).toContain('w-12 h-12 min-w-[48px] min-h-[48px]')
    })

    it('ensures PageHeader back button is touch-friendly (>= 44px mobile target)', () => {
      const code = fs.readFileSync(path.join(srcDir, 'components/layout/PageHeader.tsx'), 'utf8')
      expect(code).toContain('w-11 h-11 min-w-[44px] min-h-[44px]')
    })

    it('ensures BottomSheetModal close button has >= 44px touch target on mobile', () => {
      const code = fs.readFileSync(path.join(srcDir, 'components/sheets/BottomSheetModal.tsx'), 'utf8')
      expect(code).toContain('w-11 h-11 min-w-[44px] min-h-[44px]')
    })

    it('ensures Dashboard top buttons (Settings gear, 1-click buttons) are >= 44px', () => {
      const code = fs.readFileSync(path.join(srcDir, 'features/dashboard/pages/DashboardPage.tsx'), 'utf8')
      expect(code).toContain('w-11 h-11 min-w-[44px] min-h-[44px]')
      expect(code).toContain('h-11 sm:h-10 min-h-[44px]')
    })

    it('ensures Inward & Outward bag remove buttons have dedicated thumb targets (>= 44px)', () => {
      const inwardCode = fs.readFileSync(path.join(srcDir, 'features/inward/pages/InwardPage.tsx'), 'utf8')
      const outwardCode = fs.readFileSync(path.join(srcDir, 'features/outward/components/DispatchEntriesList.tsx'), 'utf8')

      expect(inwardCode).toContain('w-11 h-11 min-w-[44px] min-h-[44px]')
      expect(outwardCode).toContain('w-11 h-11 min-w-[44px] min-h-[44px]')
    })

    it('ensures Inward & Outward + Add Bag buttons are full-width 48px high', () => {
      const inwardCode = fs.readFileSync(path.join(srcDir, 'features/inward/pages/InwardPage.tsx'), 'utf8')
      const outwardCode = fs.readFileSync(path.join(srcDir, 'features/outward/components/DispatchEntriesList.tsx'), 'utf8')

      expect(inwardCode).toContain('w-full h-12 min-h-[48px]')
      expect(outwardCode).toContain('w-full h-12 min-h-[48px]')
    })

    it('ensures ConfirmDelete inline buttons have >= 48px touch targets', () => {
      const code = fs.readFileSync(path.join(srcDir, 'components/feedback/ConfirmDelete.tsx'), 'utf8')
      expect(code).toContain('w-12 h-12 min-h-[48px] min-w-[48px]')
    })

    it('ensures Toast notification Undo button has >= 44px touch target', () => {
      const code = fs.readFileSync(path.join(srcDir, 'context/ToastContext.tsx'), 'utf8')
      expect(code).toContain('h-11 px-3 min-h-[44px]')
      expect(code).toContain('w-11 h-11 min-w-[44px] min-h-[44px]')
    })
  })

  describe('2. Destructive Actions Check (Confirmation Pop-up & Undo Safety)', () => {
    it('ensures Inward receipts deletion has confirmation dialog AND Undo restoration', () => {
      const code = fs.readFileSync(path.join(srcDir, 'features/inward/pages/InwardPage.tsx'), 'utf8')

      // Confirmation via ActionSheet
      expect(code).toContain('ActionSheet')
      expect(code).toContain('bagToDelete')
      expect(code).toContain('challanToDelete')

      // Undo capability via showToast action
      expect(code).toContain("label: 'Undo'")
      expect(code).toContain('insertReceipts')
    })

    it('ensures Outward dispatch deletion has confirmation dialog AND Undo restoration', () => {
      const code = fs.readFileSync(path.join(srcDir, 'features/outward/pages/OutwardPage.tsx'), 'utf8')

      // Confirmation via ActionSheet
      expect(code).toContain('ActionSheet')
      expect(code).toContain('bagToDelete')
      expect(code).toContain('challanToDelete')

      // Undo capability via showToast action
      expect(code).toContain("label: 'Undo'")
      expect(code).toContain('insertDispatches')
    })

    it('ensures Payment deletion has alertdialog confirmation AND Undo restoration', () => {
      const code = fs.readFileSync(path.join(srcDir, 'features/billing/pages/BillingPage.tsx'), 'utf8')

      expect(code).toContain('role="alertdialog"')
      expect(code).toContain('confirmDeletePayment')
      expect(code).toContain("label: 'Undo'")
      expect(code).toContain('Payment record restored')
    })

    it('ensures Operating Expense deletion has confirmation dialog AND Undo restoration', () => {
      const code = fs.readFileSync(path.join(srcDir, 'features/expenses/pages/OperatingExpensesPage.tsx'), 'utf8')

      expect(code).toContain('expenseToDelete')
      expect(code).toContain('confirmDeleteExpense')
      expect(code).toContain("label: 'Undo'")
      expect(code).toContain('Expense restored')
    })

    it('ensures Party deletion is guarded against active data AND provides confirmation + Undo restoration', () => {
      const code = fs.readFileSync(path.join(srcDir, 'features/parties/pages/PartyDirectoryPage.tsx'), 'utf8')

      // Business logic safeguard preventing accidental cascade loss
      expect(code).toContain('checkCanDeleteParty')
      expect(code).toContain('ConfirmDelete')
      expect(code).toContain("label: 'Undo'")
      expect(code).toContain('insertParty')
    })

    it('ensures Settings safety snapshot restore has modal alertdialog confirmation', () => {
      const backupCode = fs.readFileSync(path.join(srcDir, 'features/settings/components/DatabaseBackupActions.tsx'), 'utf8')
      const modalCode = fs.readFileSync(path.join(srcDir, 'features/settings/components/OopsRestoreModal.tsx'), 'utf8')

      expect(backupCode).toContain('showOopsModal')
      expect(modalCode).toContain('role="alertdialog"')
      expect(backupCode).toContain('handleConfirmOopsRestore')
    })
  })

  describe('3. Empty States Design (Zero Blank Screens & Direct Action Guidance)', () => {
    it('ensures EmptyState component provides accessible title, description, and fat-finger action button', () => {
      const code = fs.readFileSync(path.join(srcDir, 'components/common/EmptyState.tsx'), 'utf8')

      expect(code).toContain('displayTitle')
      expect(code).toContain('displayDescription')
      expect(code).toContain('actionLabel && onAction')
      expect(code).toContain('min-h-[44px]')
    })

    it('ensures Dashboard recent tables provide guided EmptyState with 1-click entry triggers', () => {
      const code = fs.readFileSync(path.join(srcDir, 'features/dashboard/pages/DashboardPage.tsx'), 'utf8')

      expect(code).toContain('actionLabel="+ Record Inward"')
      expect(code).toContain("navigate('/receiving?action=new')")
      expect(code).toContain('actionLabel="+ Record Outward"')
      expect(code).toContain("navigate('/dispatch?action=new')")
    })

    it('ensures all core enterprise pages implement actionable EmptyStates with entry buttons', () => {
      const pages = [
        'features/inward/pages/InwardPage.tsx',
        'features/outward/pages/OutwardPage.tsx',
        'features/billing/pages/BillingPage.tsx',
        'features/expenses/pages/OperatingExpensesPage.tsx',
        'features/parties/pages/PartyDirectoryPage.tsx',
      ]

      for (const relPath of pages) {
        const code = fs.readFileSync(path.join(srcDir, relPath), 'utf8')
        expect(code, `${relPath} is missing EmptyState`).toContain('EmptyState')
        expect(code, `${relPath} is missing actionLabel`).toContain('actionLabel=')
      }
    })
  })
})
