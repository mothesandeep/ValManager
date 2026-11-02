import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { printElement } from './printHelpers'

describe('printHelpers (Isolated Iframe Print Utility)', () => {
  const originalWindow = globalThis.window
  const originalDocument = (globalThis as any).document

  beforeEach(() => {
    vi.restoreAllMocks()
  })

  afterEach(() => {
    globalThis.window = originalWindow
    ;(globalThis as any).document = originalDocument
  })

  it('safely handles non-browser environments where document is undefined', async () => {
    ;(globalThis as any).document = undefined
    const onComplete = vi.fn()

    await printElement('test-id', { onComplete })
    expect(onComplete).toHaveBeenCalledTimes(1)
  })

  it('falls back to window.print if target element is not found', async () => {
    const mockWindowPrint = vi.fn()
    globalThis.window = {
      print: mockWindowPrint,
    } as any

    ;(globalThis as any).document = {
      getElementById: vi.fn().mockReturnValue(null),
    }

    const onComplete = vi.fn()
    await printElement('non-existent-id', { onComplete })

    expect(mockWindowPrint).toHaveBeenCalledTimes(1)
    expect(onComplete).toHaveBeenCalledTimes(1)
  })

  it('spawns hidden iframe and triggers contentWindow.print for valid element', async () => {
    const mockWin = {
      focus: vi.fn(),
      print: vi.fn(),
      onafterprint: null as (() => void) | null,
      onload: null as (() => void) | null,
    }

    const mockIframeDoc = {
      open: vi.fn(),
      write: vi.fn(),
      close: vi.fn(),
      readyState: 'complete',
    }

    const createdIframe: any = {
      id: '',
      name: '',
      style: {},
      setAttribute: vi.fn(),
      contentWindow: {
        ...mockWin,
        document: mockIframeDoc,
      },
      contentDocument: mockIframeDoc,
      parentNode: null,
    }

    const mockBody = {
      appendChild: vi.fn().mockImplementation((node) => {
        node.parentNode = mockBody
        return node
      }),
      removeChild: vi.fn().mockImplementation((node) => {
        node.parentNode = null
        return node
      }),
    }

    const mockElement = {
      id: 'printable-manifest-card',
      innerHTML: '<h1>Kasab Val Processors</h1><p>Manifest Records</p>',
    }

    ;(globalThis as any).document = {
      getElementById: vi.fn().mockImplementation((id: string) => {
        return id === 'printable-manifest-card' ? mockElement : null
      }),
      createElement: vi.fn().mockImplementation((tag: string) => {
        if (tag === 'iframe') return createdIframe
        return {}
      }),
      querySelectorAll: vi.fn().mockReturnValue([]),
      body: mockBody,
    }

    const onComplete = vi.fn()
    const printPromise = printElement('printable-manifest-card', {
      documentTitle: 'Outward Dispatch Manifest',
      onComplete,
    })

    // Advance fake timer
    await new Promise((r) => setTimeout(r, 300))

    expect((globalThis as any).document.createElement).toHaveBeenCalledWith('iframe')
    expect(mockBody.appendChild).toHaveBeenCalledWith(createdIframe)
    expect(createdIframe.style.position).toBe('fixed')
    expect(mockIframeDoc.write).toHaveBeenCalled()
    expect(mockWin.print).toHaveBeenCalled()

    // Trigger cleanup
    if (createdIframe.contentWindow.onafterprint) {
      createdIframe.contentWindow.onafterprint()
    }

    await printPromise
  })
})
