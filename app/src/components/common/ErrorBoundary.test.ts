import { describe, it, expect } from 'vitest'
import { parseContextClue, ErrorBoundary } from './ErrorBoundary'

describe('ErrorBoundary & context clue parser', () => {
  it('returns null when error is null', () => {
    expect(parseContextClue(null)).toBeNull()
  })

  it('identifies Inward bag data structure mismatch from error message', () => {
    const err = new Error("Cannot read properties of undefined (reading 'bags')")
    expect(parseContextClue(err, 'Inward Receipts')).toBe('Notice: Inward bag data structure mismatch')
  })

  it('identifies Inward bag mismatch from moduleName when general null error occurs', () => {
    const err = new Error("TypeError: Cannot read properties of null")
    expect(parseContextClue(err, 'Inward Receipts')).toBe('Notice: Inward bag data structure mismatch')
  })

  it('identifies party reference discrepancy', () => {
    const err = new Error("Party ID 'invalid_party' does not exist in directory")
    expect(parseContextClue(err, 'Parties')).toBe('Notice: Party directory reference discrepancy')
  })

  it('identifies network synchronization hiccup', () => {
    const err = new Error("Failed to fetch from Supabase edge function: timeout")
    expect(parseContextClue(err)).toBe('Notice: Network synchronization hiccup')
  })

  it('correctly updates state via getDerivedStateFromError', () => {
    const err = new Error('Test crash')
    const derived = ErrorBoundary.getDerivedStateFromError(err)
    expect(derived.hasError).toBe(true)
    expect(derived.error).toBe(err)
  })
})
