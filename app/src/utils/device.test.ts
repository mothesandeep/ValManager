import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { isTouchOrMobileDevice, shouldAutoFocusSearch } from './device'

describe('device utilities', () => {
  const originalWindow = (globalThis as any).window

  beforeEach(() => {
    vi.restoreAllMocks()
  })

  afterEach(() => {
    if (originalWindow !== undefined) {
      ;(globalThis as any).window = originalWindow
    } else {
      delete (globalThis as any).window
    }
  })

  it('safely handles non-browser environment where window is undefined', () => {
    delete (globalThis as any).window
    expect(isTouchOrMobileDevice()).toBe(false)
    expect(shouldAutoFocusSearch()).toBe(false)
  })

  it('detects desktop device with fine pointer and width >= 768px', () => {
    ;(globalThis as any).window = {
      innerWidth: 1200,
      matchMedia: vi.fn().mockImplementation((query: string) => ({
        matches: query.includes('(pointer: fine)'),
        media: query,
      })),
    }

    try {
      Object.defineProperty(navigator, 'maxTouchPoints', { value: 0, configurable: true })
    } catch {}

    expect(isTouchOrMobileDevice()).toBe(false)
    expect(shouldAutoFocusSearch()).toBe(true)
  })

  it('detects mobile phone (< 768px) and disables autofocus', () => {
    ;(globalThis as any).window = {
      innerWidth: 375,
      matchMedia: vi.fn().mockImplementation((query: string) => ({
        matches: query.includes('(pointer: coarse)'),
        media: query,
      })),
    }

    try {
      Object.defineProperty(navigator, 'maxTouchPoints', { value: 5, configurable: true })
    } catch {}

    expect(isTouchOrMobileDevice()).toBe(true)
    expect(shouldAutoFocusSearch()).toBe(false)
  })

  it('disables autofocus on tablet with coarse pointer even if width >= 768px', () => {
    ;(globalThis as any).window = {
      innerWidth: 820,
      matchMedia: vi.fn().mockImplementation((query: string) => ({
        matches: query.includes('(pointer: coarse)'),
        media: query,
      })),
    }

    try {
      Object.defineProperty(navigator, 'maxTouchPoints', { value: 5, configurable: true })
    } catch {}

    expect(isTouchOrMobileDevice()).toBe(true)
    expect(shouldAutoFocusSearch()).toBe(false)
  })
})
