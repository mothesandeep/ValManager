import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { PRIMARY_MOBILE_ITEMS } from '@/components/layout/BottomNavigation'
import { NAV_SECTIONS } from '@/components/layout/AppShell'
import {
  LayoutDashboard,
  PackagePlus,
  Truck,
  IndianRupee,
  Receipt,
} from 'lucide-react'

describe('Cross-Device Consistency Audit (Android + Web Same Feel)', () => {
  const srcDir = path.resolve(__dirname, '..')

  describe('1. Mental Model Continuity & Icon Alignment', () => {
    // Map desktop items by route
    const desktopItemMap = new Map<string, (typeof NAV_SECTIONS)[0]['items'][0]>()
    for (const section of NAV_SECTIONS) {
      for (const item of section.items) {
        desktopItemMap.set(item.to, item)
      }
    }

    it('ensures every Mobile Bottom Navigation item matches Desktop Navigation route and icon', () => {
      for (const mobileItem of PRIMARY_MOBILE_ITEMS) {
        const desktopItem = desktopItemMap.get(mobileItem.to)
        expect(desktopItem, `No desktop nav item found for route "${mobileItem.to}"`).toBeDefined()

        // Verify icon reference equality
        expect(
          mobileItem.icon,
          `Icon mismatch for route "${mobileItem.to}": Mobile uses different icon from Desktop`
        ).toBe(desktopItem!.icon)

        // Verify label alignment
        expect(mobileItem.label).toBe(desktopItem!.label)
      }
    })

    it('ensures expected Lucide icons are used across core ERP domains', () => {
      const expectedCoreIcons = {
        '/': LayoutDashboard,
        '/receiving': PackagePlus,
        '/dispatch': Truck,
        '/payments': IndianRupee,
        '/expenses': Receipt,
      }

      for (const item of PRIMARY_MOBILE_ITEMS) {
        const expected = expectedCoreIcons[item.to as keyof typeof expectedCoreIcons]
        expect(item.icon).toBe(expected)
      }
    })

    it('ensures SpeedDialFab uses PackagePlus, Truck, and Receipt icons matching Desktop & Mobile nav', () => {
      const fabPath = path.join(srcDir, 'components/layout/SpeedDialFab.tsx')
      const fabCode = fs.readFileSync(fabPath, 'utf8')

      // Should import the unified icons
      expect(fabCode).toContain('PackagePlus,')
      expect(fabCode).toContain('Truck,')
      expect(fabCode).toContain('Receipt,')

      // Should NOT use deprecated mismatched icons for core navigation actions
      expect(fabCode).not.toContain('ArrowDownLeft')
      expect(fabCode).not.toContain('ArrowUpRight')
      expect(fabCode).not.toContain('ReceiptText')
    })
  })

  describe('2. Form Save Icon & Terminology Parity', () => {
    it('ensures all modal submission buttons consistently use CheckCircle2 with loading state', () => {
      const pagesToVerify = [
        'features/inward/pages/InwardPage.tsx',
        'features/outward/pages/OutwardPage.tsx',
        'features/billing/pages/BillingPage.tsx',
        'features/expenses/pages/OperatingExpensesPage.tsx',
        'features/parties/pages/PartyDirectoryPage.tsx',
        'features/inward/components/scanner/ScannerActionFooter.tsx',
      ]

      for (const relPath of pagesToVerify) {
        const fullPath = path.join(srcDir, relPath)
        const fileContent = fs.readFileSync(fullPath, 'utf8')

        expect(fileContent, `${relPath} is missing CheckCircle2 save icon`).toContain('CheckCircle2')
        expect(fileContent, `${relPath} is missing Loader2 spinner for saving state`).toContain('Loader2')
      }
    })
  })

  describe('3. State Sync Visibility (Reassurance on Android & Web)', () => {
    it('ensures PageHeader defaults showSyncIndicator to false so sync pill is exclusive to Dashboard', () => {
      const headerPath = path.join(srcDir, 'components/layout/PageHeader.tsx')
      const headerCode = fs.readFileSync(headerPath, 'utf8')

      // Verifies SyncIndicator is supported on demand, but defaults to false to keep inner page titles clean
      expect(headerCode).toContain("import { SyncIndicator } from '@/components/common/SyncIndicator'")
      expect(headerCode).toContain('showSyncIndicator = false')
      expect(headerCode).toContain('<SyncIndicator compact={true} />')
    })

    it('ensures Dashboard top header contains SyncIndicator', () => {
      const dashboardPath = path.join(srcDir, 'features/dashboard/pages/DashboardPage.tsx')
      const dashboardCode = fs.readFileSync(dashboardPath, 'utf8')

      expect(dashboardCode).toContain('<SyncIndicator compact={true} />')
    })

    it('ensures BottomSheetModal supports showSyncIndicator prop', () => {
      const modalPath = path.join(srcDir, 'components/sheets/BottomSheetModal.tsx')
      const modalCode = fs.readFileSync(modalPath, 'utf8')

      expect(modalCode).toContain("import { SyncIndicator } from '@/components/common/SyncIndicator'")
      expect(modalCode).toContain('showSyncIndicator?: boolean')
      expect(modalCode).toContain('{showSyncIndicator && <SyncIndicator compact={true} />}')
    })

    it('verifies SyncIndicator renders all 4 critical states (Offline, Syncing, Pending, Synced)', () => {
      const syncIndicatorPath = path.join(srcDir, 'components/common/SyncIndicator.tsx')
      const code = fs.readFileSync(syncIndicatorPath, 'utf8')

      // Offline state: rose dot + "Offline" text
      expect(code).toContain('bg-rose-500')
      expect(code).toContain('Offline')

      // Syncing state: animated spinner + "Sync" / "Syncing..." text
      expect(code).toContain('animate-spin')
      expect(code).toContain('Syncing...')

      // Pending state: amber dot + pending count
      expect(code).toContain('bg-amber-500')
      expect(code).toContain('pending')

      // Synced state: pulsing emerald dot + "Synced" text
      expect(code).toContain('bg-emerald-500 animate-pulse')
      expect(code).toContain('Synced')
    })
  })
})
