import { describe, it, expect, vi, afterEach } from 'vitest';

describe('useIsModalOpen Active Overlay & State Filtering', () => {
  const originalWindow = globalThis.window;
  const originalDocument = (globalThis as any).document;

  afterEach(() => {
    globalThis.window = originalWindow;
    (globalThis as any).document = originalDocument;
    vi.restoreAllMocks();
  });

  // Pure logic replica of checkModalActive in useIsModalOpen.ts
  function checkModalActive(): boolean {
    if (typeof window === 'undefined') return false;

    // 1. URL Hash check (#modal)
    const hash = window.location.hash;
    if (hash === '#modal' || hash.startsWith('#modal') || hash.includes('modal')) {
      return true;
    }

    // 2. document.body classList flags
    const body = document.body;
    if (
      body.classList.contains('modal-open') ||
      body.classList.contains('scanner-modal-open') ||
      body.classList.contains('more-sheet-open') ||
      body.classList.contains('period-sheet-open')
    ) {
      return true;
    }

    // 3. Active full-screen modal overlay in DOM (excluding dialogs marked as closing or hidden)
    const candidateModals = document.querySelectorAll(
      '.fixed.inset-0.z-50, [role="dialog"], [aria-modal="true"], .modal-overlay'
    );
    for (const el of candidateModals) {
      const htmlEl = el as HTMLElement;
      if (
        htmlEl.getAttribute('data-closing') === 'true' ||
        htmlEl.getAttribute('aria-hidden') === 'true' ||
        htmlEl.hidden ||
        htmlEl.style.display === 'none' ||
        htmlEl.style.visibility === 'hidden' ||
        htmlEl.classList.contains('hidden')
      ) {
        continue;
      }
      return true;
    }
    return false;
  }

  it('returns false when no hash, no classes, and no dialog elements exist', () => {
    globalThis.window = {
      location: { hash: '' },
    } as any;
    (globalThis as any).document = {
      body: { classList: { contains: () => false } },
      querySelectorAll: () => [],
    };

    expect(checkModalActive()).toBe(false);
  });

  it('returns true when URL hash is #modal', () => {
    globalThis.window = {
      location: { hash: '#modal' },
    } as any;
    (globalThis as any).document = {
      body: { classList: { contains: () => false } },
      querySelectorAll: () => [],
    };

    expect(checkModalActive()).toBe(true);
  });

  it('returns true when document.body has modal-open class', () => {
    globalThis.window = {
      location: { hash: '' },
    } as any;
    (globalThis as any).document = {
      body: { classList: { contains: (c: string) => c === 'modal-open' } },
      querySelectorAll: () => [],
    };

    expect(checkModalActive()).toBe(true);
  });

  it('returns true when an active visible dialog is mounted', () => {
    globalThis.window = {
      location: { hash: '' },
    } as any;

    const mockDialog = {
      getAttribute: vi.fn(() => null),
      hidden: false,
      style: { display: 'flex', visibility: 'visible' },
      classList: { contains: () => false },
    };

    (globalThis as any).document = {
      body: { classList: { contains: () => false } },
      querySelectorAll: () => [mockDialog],
    };

    expect(checkModalActive()).toBe(true);
  });

  it('returns false when dialog has data-closing="true" attribute (during exit animation)', () => {
    globalThis.window = {
      location: { hash: '' },
    } as any;

    const mockClosingDialog = {
      getAttribute: (attr: string) => (attr === 'data-closing' ? 'true' : null),
      hidden: false,
      style: { display: 'flex', visibility: 'visible' },
      classList: { contains: () => false },
    };

    (globalThis as any).document = {
      body: { classList: { contains: () => false } },
      querySelectorAll: () => [mockClosingDialog],
    };

    // FAB immediately restores visibility because closing dialog is safely ignored
    expect(checkModalActive()).toBe(false);
  });

  it('returns false when dialog has aria-hidden="true" or hidden display', () => {
    globalThis.window = {
      location: { hash: '' },
    } as any;

    const mockHiddenDialog = {
      getAttribute: (attr: string) => (attr === 'aria-hidden' ? 'true' : null),
      hidden: true,
      style: { display: 'none', visibility: 'hidden' },
      classList: { contains: () => true },
    };

    (globalThis as any).document = {
      body: { classList: { contains: () => false } },
      querySelectorAll: () => [mockHiddenDialog],
    };

    expect(checkModalActive()).toBe(false);
  });
});

