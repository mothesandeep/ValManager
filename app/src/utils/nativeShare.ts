import { Capacitor } from '@capacitor/core'
import { Share } from '@capacitor/share'
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem'
import { printElement, type PrintOptions } from './printHelpers'

export interface ShareOrPrintOptions extends PrintOptions {
  filename?: string
  dialogTitle?: string
}

/**
 * Checks if the platform is running on a mobile device (iOS/Android Capacitor or mobile browser)
 */
export function isMobileDevice(): boolean {
  if (Capacitor.isNativePlatform()) return true
  if (typeof navigator !== 'undefined') {
    return /Android|iPhone|iPad|iPod|Opera Mini|IEMobile|WPDesktop/i.test(navigator.userAgent)
  }
  return false
}

/**
 * Checks whether native sharing is supported on this device/environment
 */
export async function canShareNatively(): Promise<boolean> {
  if (Capacitor.isNativePlatform()) {
    try {
      const result = await Share.canShare()
      return !!result.value
    } catch {
      return true
    }
  }
  return typeof navigator !== 'undefined' && !!navigator.share
}

/**
 * Shares an HTML document or blob natively via Capacitor Share sheet / Web Share API,
 * or falls back gracefully to iframe printing on desktop browsers.
 */
export async function shareOrPrintDocument(
  elementOrId: string | HTMLElement,
  options: ShareOrPrintOptions = {}
): Promise<void> {
  const isMobile = isMobileDevice()
  const docTitle = options.documentTitle || 'ValManager Document'
  const safeFilename = (options.filename || docTitle)
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .slice(0, 50) + '.html'

  // If on desktop browser, use direct print
  if (!isMobile && !Capacitor.isNativePlatform()) {
    return printElement(elementOrId, options)
  }

  // Mobile / Native flow: extract clean printable HTML from target
  const targetEl =
    typeof elementOrId === 'string'
      ? document.getElementById(elementOrId)
      : elementOrId

  if (!targetEl) {
    return printElement(elementOrId, options)
  }

  try {
    // Collect styles
    const headStyles = Array.from(
      document.querySelectorAll('link[rel="stylesheet"], style')
    )
      .map((node) => node.outerHTML)
      .join('\n')

    const pageMargin = options.pageMargin || '10mm 12mm'

    const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${docTitle}</title>
  ${headStyles}
  <style>
    @page { size: A4 portrait; margin: ${pageMargin}; }
    *, *::before, *::after { box-sizing: border-box !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
    html, body { margin: 0 !important; padding: 12px !important; background: #ffffff !important; color: #0f172a !important; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important; font-size: 11px; line-height: 1.35; width: 100% !important; }
    table { width: 100% !important; border-collapse: collapse !important; }
    .no-print { display: none !important; }
  </style>
</head>
<body>
  <div class="print-sheet-root">
    ${targetEl.innerHTML}
  </div>
</body>
</html>`

    if (Capacitor.isNativePlatform()) {
      // Save HTML to cache and share via Capacitor Share plugin
      const writeResult = await Filesystem.writeFile({
        path: safeFilename,
        data: htmlContent,
        directory: Directory.Cache,
        encoding: Encoding.UTF8,
      })

      await Share.share({
        title: docTitle,
        text: `${docTitle} from ValManager`,
        url: writeResult.uri,
        dialogTitle: options.dialogTitle || 'Share Challan / Statement',
      })
      options.onComplete?.()
      return
    }

    // Web Share API fallback on mobile browsers
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        const file = new File([htmlContent], safeFilename, { type: 'text/html' })
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({
            files: [file],
            title: docTitle,
            text: `${docTitle} from ValManager`,
          })
          options.onComplete?.()
          return
        }
      } catch (fileErr) {
        console.warn('[nativeShare] Share file not permitted, trying text fallback:', fileErr)
      }
    }

    // Fallback to print
    return printElement(elementOrId, options)
  } catch (err) {
    console.warn('[nativeShare] Sharing failed, defaulting to iframe print:', err)
    return printElement(elementOrId, options)
  }
}

/**
 * Triggers native OS share sheet for any media file or link (WhatsApp, Telegram, etc.)
 */
export async function triggerNativeShare(data: {
  title: string
  text?: string
  url?: string
  dialogTitle?: string
}): Promise<boolean> {
  try {
    if (Capacitor.isNativePlatform()) {
      await Share.share({
        title: data.title,
        text: data.text,
        url: data.url,
        dialogTitle: data.dialogTitle || 'Share with Party / Courier',
      })
      return true
    } else if (typeof navigator !== 'undefined' && navigator.share) {
      await navigator.share({
        title: data.title,
        text: data.text,
        url: data.url,
      })
      return true
    }
  } catch (err) {
    if (String(err).toLowerCase().includes('cancel')) {
      return false
    }
    console.warn('[triggerNativeShare] Share error:', err)
  }
  return false
}
