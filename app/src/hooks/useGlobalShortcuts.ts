import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useToast } from '../context/ToastContext'

/**
 * Global Keyboard Shortcuts Hook
 * - Cmd+K or Ctrl+K: Open Command Palette
 * - Cmd+S or Ctrl+S: Save active form / modal entry
 * - Escape: Cancel pending sequence / blur inputs
 * - N + I: New Inward Receipt
 * - N + O: New Outward Dispatch
 * - N + P: Record Payment
 * - N + E: New Operating Expense
 */
export function useGlobalShortcuts({
  onOpenPalette,
}: {
  onOpenPalette: () => void
}) {
  const navigate = useNavigate()
  const { showToast } = useToast()
  const [pendingSequence, setPendingSequence] = useState<string | null>(null)
  const sequenceTimerRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 1. Always allow Cmd+K or Ctrl+K anywhere to open Command Palette
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        onOpenPalette()
        return
      }

      // 2. Always allow Cmd+S or Ctrl+S anywhere to save active form / entry
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') {
        e.preventDefault()

        // First check inside any active open modal dialog
        const activeModal = document.querySelector(
          '[role="dialog"][data-modal-open="true"], [role="dialog"], [data-bottom-sheet="true"]'
        ) as HTMLElement | null

        let saveButton: HTMLButtonElement | null = null

        if (activeModal) {
          saveButton = activeModal.querySelector(
            'button[type="submit"], button[data-save-shortcut="true"], button[data-save="true"]'
          ) as HTMLButtonElement | null
        }

        // If no modal or modal has no save button, look globally in page (e.g. Settings sticky save bar)
        if (!saveButton) {
          saveButton = document.querySelector(
            'button[data-save-shortcut="true"], button[data-save="true"]'
          ) as HTMLButtonElement | null
        }

        if (saveButton) {
          if (saveButton.disabled) {
            showToast('Cannot save yet: Please complete all required fields.', 'error')
          } else {
            saveButton.click()
            showToast('Saving entry...', 'info')
          }
        } else {
          showToast('No active form to save. Use Cmd+K for quick commands.', 'info')
        }
        return
      }

      // 3. Handle Escape: Cancel active shortcut sequences
      if (e.key === 'Escape') {
        if (pendingSequence) {
          setPendingSequence(null)
          if (sequenceTimerRef.current) clearTimeout(sequenceTimerRef.current)
          return
        }
      }

      // 4. Ignore two-key sequences if user is actively typing in an input/textarea/editable
      const target = e.target as HTMLElement | null
      const isInput =
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable)

      if (isInput) return

      const key = e.key.toLowerCase()

      // 5. Handle 'N' key sequence initiation
      if (key === 'n' && !pendingSequence && !e.metaKey && !e.ctrlKey && !e.altKey) {
        setPendingSequence('n')
        if (sequenceTimerRef.current) clearTimeout(sequenceTimerRef.current)
        sequenceTimerRef.current = setTimeout(() => {
          setPendingSequence(null)
        }, 1200)
        return
      }

      // 6. Handle second key in sequence
      if (pendingSequence === 'n') {
        if (sequenceTimerRef.current) clearTimeout(sequenceTimerRef.current)
        setPendingSequence(null)

        if (key === 'i') {
          e.preventDefault()
          showToast('Opening New Inward Receipt...', 'info')
          navigate('/receiving?action=new')
        } else if (key === 'o') {
          e.preventDefault()
          showToast('Opening New Outward Dispatch...', 'info')
          navigate('/dispatch?action=new')
        } else if (key === 'p') {
          e.preventDefault()
          showToast('Opening New Payment Collection...', 'info')
          navigate('/payments?action=new')
        } else if (key === 'e') {
          e.preventDefault()
          showToast('Opening New Operating Expense...', 'info')
          navigate('/expenses?action=new')
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      if (sequenceTimerRef.current) clearTimeout(sequenceTimerRef.current)
    }
  }, [pendingSequence, onOpenPalette, navigate, showToast])

  return { pendingSequence }
}
