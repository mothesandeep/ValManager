/**
 * Isolated Iframe Print Utility
 *
 * Spawns a hidden temporary <iframe>, injects clean standalone HTML and self-contained
 * print CSS, triggers contentWindow.print(), and unmounts the iframe safely afterward.
 * This completely avoids browser print preview bugs caused by fixed modal backdrops,
 * overflow clipping, and global `visibility: hidden` body overrides.
 */

export interface PrintOptions {
  documentTitle?: string
  pageMargin?: string
  onComplete?: () => void
  onError?: (err: Error) => void
}

export function printElement(
  elementOrId: string | HTMLElement,
  options: PrintOptions = {}
): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      if (typeof document === 'undefined') {
        options.onComplete?.()
        resolve()
        return
      }

      const targetEl =
        typeof elementOrId === 'string'
          ? document.getElementById(elementOrId)
          : elementOrId

      if (!targetEl) {
        const errorMsg = `[printElement] Target element "${String(elementOrId)}" not found.`
        console.warn(errorMsg)
        // Fallback to standard window.print if target element is not found
        window.print()
        options.onComplete?.()
        resolve()
        return
      }

      // 1. Create hidden off-screen iframe with A4 proportions to force full layout pass
      const iframe = document.createElement('iframe')
      iframe.id = `print-frame-${Date.now()}`
      iframe.name = 'print-frame'
      iframe.style.position = 'fixed'
      iframe.style.top = '-9999px'
      iframe.style.left = '-9999px'
      iframe.style.width = '210mm'
      iframe.style.height = '297mm'
      iframe.style.border = 'none'
      iframe.style.opacity = '0'
      iframe.style.pointerEvents = 'none'
      iframe.setAttribute('aria-hidden', 'true')
      iframe.setAttribute('tabindex', '-1')

      document.body.appendChild(iframe)

      const iframeDoc = iframe.contentWindow?.document || iframe.contentDocument
      if (!iframeDoc) {
        if (iframe.parentNode) document.body.removeChild(iframe)
        const err = new Error('Cannot access iframe document for printing')
        options.onError?.(err)
        reject(err)
        return
      }

      // 2. Collect host stylesheet links and style tags for maximum visual fidelity
      const headStyles = Array.from(
        document.querySelectorAll('link[rel="stylesheet"], style')
      )
        .map((node) => node.outerHTML)
        .join('\n')

      const pageMargin = options.pageMargin || '10mm 12mm'

      // 3. Self-contained print CSS with explicit A4 sizing, borders, and typography
      const selfContainedPrintCss = `
        @page {
          size: A4 portrait;
          margin: ${pageMargin};
        }
        *, *::before, *::after {
          box-sizing: border-box !important;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        html, body {
          margin: 0 !important;
          padding: 0 !important;
          background: #ffffff !important;
          color: #0f172a !important;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif !important;
          font-size: 11px;
          line-height: 1.35;
          visibility: visible !important;
          width: 100% !important;
        }
        body * {
          visibility: visible !important;
        }
        .print-sheet-root {
          width: 100% !important;
          margin: 0 !important;
          padding: 0 !important;
          background: #ffffff !important;
        }
        .a4-sheet {
          width: 100% !important;
          max-width: 100% !important;
          margin: 0 !important;
          padding: 0 !important;
          border: none !important;
          box-shadow: none !important;
          background: #ffffff !important;
        }
        .break-after-page, .page-break-after-always {
          page-break-after: always !important;
          break-after: page !important;
        }
        .half-page-voucher {
          page-break-inside: avoid !important;
          break-inside: avoid !important;
        }
        table {
          width: 100% !important;
          border-collapse: collapse !important;
        }
        table.manifest-table, table.register-table, table.statement-table {
          table-layout: fixed !important;
          width: 100% !important;
          border-collapse: collapse !important;
        }
        table.manifest-table th, table.manifest-table td,
        table.register-table th, table.register-table td,
        table.statement-table th, table.statement-table td {
          box-sizing: border-box !important;
          overflow: hidden !important;
        }
        table.manifest-table tbody tr,
        table.register-table tbody tr,
        table.statement-table tbody tr {
          border-bottom: 1px solid #cbd5e1 !important;
        }
        table.manifest-table thead tr,
        table.register-table thead tr,
        table.statement-table thead tr {
          border-top: 2px solid #0f172a !important;
          border-bottom: 2px solid #0f172a !important;
          background-color: #f1f5f9 !important;
        }
        table.manifest-table tfoot tr,
        table.register-table tfoot tr,
        table.statement-table tfoot tr {
          border-top: 2px solid #0f172a !important;
          border-bottom: 2px solid #0f172a !important;
          background-color: #f1f5f9 !important;
        }
        .whitespace-nowrap, .nowrap {
          white-space: nowrap !important;
        }
        .truncate {
          overflow: hidden !important;
          text-overflow: ellipsis !important;
          white-space: nowrap !important;
        }
        tr, .avoid-break, .page-break-inside-avoid {
          page-break-inside: avoid !important;
          break-inside: avoid !important;
        }
        .font-mono {
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace !important;
        }
        .tabular-nums {
          font-variant-numeric: tabular-nums !important;
        }
        .text-left { text-align: left !important; }
        .text-center { text-align: center !important; }
        .text-right { text-align: right !important; }

        .border-slate-900 { border-color: #0f172a !important; }
        .border-slate-800 { border-color: #1e293b !important; }
        .border-slate-500 { border-color: #64748b !important; }
        .border-slate-400 { border-color: #94a3b8 !important; }
        .border-slate-300 { border-color: #cbd5e1 !important; }
        .border-slate-200 { border-color: #e2e8f0 !important; }
        .bg-slate-100 { background-color: #f1f5f9 !important; }
        .bg-slate-50 { background-color: #f8fafc !important; }
        .bg-white { background-color: #ffffff !important; }

        @media print {
          body {
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `

      // 4. Standalone HTML template
      const fullHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>${options.documentTitle || 'Print Document'}</title>
  ${headStyles}
  <style>
    ${selfContainedPrintCss}
  </style>
</head>
<body>
  <div class="print-sheet-root">
    ${targetEl.innerHTML}
  </div>
</body>
</html>`

      iframeDoc.open()
      iframeDoc.write(fullHtml)
      iframeDoc.close()

      // 5. Cleanup logic
      let isCleanedUp = false
      const cleanup = () => {
        if (isCleanedUp) return
        isCleanedUp = true
        setTimeout(() => {
          if (iframe.parentNode) {
            iframe.parentNode.removeChild(iframe)
          }
          options.onComplete?.()
          resolve()
        }, 500)
      }

      const contentWin = iframe.contentWindow
      if (!contentWin) {
        cleanup()
        return
      }

      // 6. Execute print
      const executePrint = () => {
        try {
          contentWin.focus()
          contentWin.onafterprint = cleanup
          contentWin.print()
        } catch (printErr) {
          console.error('[printElement] Execution error:', printErr)
          cleanup()
          const err = printErr instanceof Error ? printErr : new Error(String(printErr))
          options.onError?.(err)
          reject(err)
        }
      }

      // Ensure ready before print
      if (iframeDoc.readyState === 'complete') {
        setTimeout(executePrint, 250)
      } else {
        contentWin.onload = () => setTimeout(executePrint, 250)
      }

      // 60-second fallback cleanup
      setTimeout(cleanup, 60000)
    } catch (err) {
      console.error('[printElement] Error setting up print iframe:', err)
      const error = err instanceof Error ? err : new Error(String(err))
      options.onError?.(error)
      reject(error)
    }
  })
}
