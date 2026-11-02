import { describe, it, expect } from 'vitest'
import {
  getTodayISODate,
  getSanitizedFilename,
  escapeCSVCell,
} from './exportHelpers'

describe('exportHelpers', () => {
  it('formats today ISO date as YYYY-MM-DD', () => {
    const d = getTodayISODate()
    expect(d).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  it('generates standard sanitized filenames', () => {
    const today = getTodayISODate()
    const filename1 = getSanitizedFilename('Outward_Dispatch')
    expect(filename1).toBe(`ValManager_Outward_Dispatch_${today}.csv`)

    const filename2 = getSanitizedFilename('Inward Receipts', 'Shree Ganesh/Textiles')
    expect(filename2).toBe(`ValManager_Inward_Receipts_Shree_GaneshTextiles_${today}.csv`)
  })

  it('escapes CSV cells with quotes and commas properly', () => {
    expect(escapeCSVCell('Normal text')).toBe('"Normal text"')
    expect(escapeCSVCell('Text with, comma')).toBe('"Text with, comma"')
    expect(escapeCSVCell('Text with "quotes"')).toBe('"Text with ""quotes"""')
    expect(escapeCSVCell(null)).toBe('""')
    expect(escapeCSVCell(undefined)).toBe('""')
    expect(escapeCSVCell(124.5)).toBe('"124.5"')
  })
})
