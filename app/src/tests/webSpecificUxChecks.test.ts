import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'

describe('Web-Specific UX Checks (Keyboard Shortcuts & Hover Cursors)', () => {
  const srcDir = path.resolve(__dirname, '..')

  describe('1. Global Desktop Keyboard Shortcuts (Ctrl+S / Cmd+S & Sequences)', () => {
    const shortcutsCode = fs.readFileSync(path.join(srcDir, 'hooks/useGlobalShortcuts.ts'), 'utf8')

    it('intercepts Cmd+S and Ctrl+S to prevent native browser page save dialog', () => {
      expect(shortcutsCode).toMatch(/\(e\.metaKey \|\| e\.ctrlKey\) && e\.key\.toLowerCase\(\) === 's'/)
      expect(shortcutsCode).toContain('e.preventDefault()')
    })

    it('queries active modal dialog or page form for save trigger button', () => {
      expect(shortcutsCode).toContain('[role="dialog"]')
      expect(shortcutsCode).toContain('data-save-shortcut="true"')
      expect(shortcutsCode).toContain('button[type="submit"]')
    })

    it('alerts user with guidance if save button is disabled due to invalid inputs', () => {
      expect(shortcutsCode).toContain('Cannot save yet: Please complete all required fields.')
    })

    it('gracefully notifies user when Cmd+S is pressed without an active form', () => {
      expect(shortcutsCode).toContain('No active form to save. Use Cmd+K for quick commands.')
    })

    it('clears pending two-key sequences when Escape is pressed', () => {
      expect(shortcutsCode).toMatch(/if \(e\.key === 'Escape'\)/)
      expect(shortcutsCode).toContain("setPendingSequence(null)")
    })

    it('provides fast navigation sequences (N+I, N+O, N+P, N+E)', () => {
      expect(shortcutsCode).toContain("key === 'i'")
      expect(shortcutsCode).toContain("navigate('/receiving?action=new')")
      expect(shortcutsCode).toContain("key === 'o'")
      expect(shortcutsCode).toContain("navigate('/dispatch?action=new')")
      expect(shortcutsCode).toContain("key === 'p'")
      expect(shortcutsCode).toContain("navigate('/payments?action=new')")
      expect(shortcutsCode).toContain("key === 'e'")
      expect(shortcutsCode).toContain("navigate('/expenses?action=new')")
    })

    it('guards two-key letter sequences from triggering while user is typing in form fields', () => {
      expect(shortcutsCode).toContain("target.tagName === 'INPUT'")
      expect(shortcutsCode).toContain("target.tagName === 'TEXTAREA'")
      expect(shortcutsCode).toContain("target.tagName === 'SELECT'")
      expect(shortcutsCode).toContain("target.isContentEditable")
    })
  })

  describe('2. Modal & Dialog Escape Handling (WAI-ARIA Pattern)', () => {
    it('ensures BottomSheetModal enables closeOnEsc by default', () => {
      const modalCode = fs.readFileSync(path.join(srcDir, 'components/sheets/BottomSheetModal.tsx'), 'utf8')
      expect(modalCode).toContain('closeOnEsc = true')
      expect(modalCode).toContain("e.key === 'Escape'")
      expect(modalCode).toContain('handleDismiss()')
    })

    it('attaches data-modal-open and data-bottom-sheet to the modal container', () => {
      const modalCode = fs.readFileSync(path.join(srcDir, 'components/sheets/BottomSheetModal.tsx'), 'utf8')
      expect(modalCode).toContain('data-modal-open="true"')
      expect(modalCode).toContain('data-bottom-sheet="true"')
    })

    it('ensures inline ConfirmDelete cancels on Escape key', () => {
      const confirmCode = fs.readFileSync(path.join(srcDir, 'components/feedback/ConfirmDelete.tsx'), 'utf8')
      expect(confirmCode).toContain("e.key === 'Escape'")
      expect(confirmCode).toContain('onCancel()')
    })
  })

  describe('3. Form Save Shortcut Integration (data-save-shortcut="true")', () => {
    it('wires Inward Receipt modal save button to shortcut handler', () => {
      const code = fs.readFileSync(path.join(srcDir, 'features/inward/pages/InwardPage.tsx'), 'utf8')
      expect(code).toContain('data-save-shortcut="true"')
    })

    it('wires Outward Dispatch modal save button to shortcut handler', () => {
      const code = fs.readFileSync(path.join(srcDir, 'features/outward/components/OutwardModalFooter.tsx'), 'utf8')
      expect(code).toContain('data-save-shortcut="true"')
    })

    it('wires Operating Expenses modal save button to shortcut handler', () => {
      const code = fs.readFileSync(path.join(srcDir, 'features/expenses/pages/OperatingExpensesPage.tsx'), 'utf8')
      expect(code).toContain('data-save-shortcut="true"')
    })

    it('wires Billing & Payments modal save button to shortcut handler', () => {
      const code = fs.readFileSync(path.join(srcDir, 'features/billing/pages/BillingPage.tsx'), 'utf8')
      expect(code).toContain('data-save-shortcut="true"')
    })

    it('wires Party Directory modal save button to shortcut handler', () => {
      const code = fs.readFileSync(path.join(srcDir, 'features/parties/pages/PartyDirectoryPage.tsx'), 'utf8')
      expect(code).toContain('data-save-shortcut="true"')
    })

    it('wires Settings sticky save bar button to shortcut handler', () => {
      const code = fs.readFileSync(path.join(srcDir, 'features/settings/components/SettingsSaveBar.tsx'), 'utf8')
      expect(code).toContain('data-save-shortcut="true"')
    })
  })

  describe('4. Hover States, Cursors & Keyboard Focus Indicators (CSS)', () => {
    const cssCode = fs.readFileSync(path.join(srcDir, 'index.css'), 'utf8')

    it('enforces cursor: pointer on all non-disabled interactive elements', () => {
      expect(cssCode).toContain('button:not(:disabled)')
      expect(cssCode).toContain('a[href]')
      expect(cssCode).toContain('cursor: pointer;')
    })

    it('enforces cursor: not-allowed on disabled buttons and controls', () => {
      expect(cssCode).toContain('button:disabled')
      expect(cssCode).toContain('cursor: not-allowed;')
    })

    it('provides clear, accessible :focus-visible outlines for Tab navigation', () => {
      expect(cssCode).toContain(':focus-visible')
      expect(cssCode).toContain('outline: 2px solid')
      expect(cssCode).toContain('outline-offset: 2px')
    })

    it('applies smooth transition property on buttons for hover color feedback', () => {
      expect(cssCode).toContain('transition-property:')
      expect(cssCode).toContain('transition-duration: 150ms;')
    })
  })

  describe('5. Command Palette Desktop Shortcut Documentation', () => {
    it('documents save, escape, and sequence shortcuts in Command Palette footer', () => {
      const paletteCode = fs.readFileSync(path.join(srcDir, 'components/common/CommandPalette.tsx'), 'utf8')
      expect(paletteCode).toContain('⌘/Ctrl + S (Save)')
      expect(paletteCode).toContain('Esc')
      expect(paletteCode).toContain('to close')
    })
  })
})
