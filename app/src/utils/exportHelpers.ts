/**
 * Standard CSV and Excel Data Export Helpers for ValManager
 * Generates sanitized filenames and formatted CSV files with UTF-8 BOM encoding
 * for seamless compatibility with Microsoft Excel, Google Sheets, and LibreOffice.
 */

/**
 * Returns today's date formatted as YYYY-MM-DD
 */
export function getTodayISODate(): string {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/**
 * Generates a clean, sanitized filename adhering to standard conventions:
 * e.g., ValManager_Outward_Dispatch_2026-10-23.csv
 * e.g., ValManager_Statement_Shree_Ganesh_2026-10-23.csv
 */
export function getSanitizedFilename(moduleName: string, identifier?: string): string {
  const sanitize = (str: string) =>
    str
      .trim()
      .replace(/[/\\:*?"<>|]/g, '') // remove illegal characters
      .replace(/\s+/g, '_')          // replace spaces with underscores
      .replace(/_+/g, '_')           // collapse multiple underscores

  const cleanModule = sanitize(moduleName)
  const cleanId = identifier ? `_${sanitize(identifier)}` : ''
  const dateStr = getTodayISODate()

  return `ValManager_${cleanModule}${cleanId}_${dateStr}.csv`
}

/**
 * Escapes a cell value for standard RFC 4180 CSV compliance
 */
export function escapeCSVCell(val: string | number | null | undefined): string {
  if (val === null || val === undefined) return '""'
  const str = String(val)
  // If string contains comma, quote, or newline, escape internal quotes by doubling them
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return `"${str}"`
}

export interface ExportTableOptions<T> {
  filename: string
  headers: string[]
  data: T[]
  rowMapper: (item: T, index: number) => (string | number | null | undefined)[]
}

/**
 * Exports tabular data as a clean CSV file with UTF-8 BOM
 */
export function exportTableToCSV<T>(options: ExportTableOptions<T>): void {
  const { filename, headers, data, rowMapper } = options

  const headerLine = headers.map(escapeCSVCell).join(',')
  const dataLines = data.map((item, idx) => {
    const row = rowMapper(item, idx)
    return row.map(escapeCSVCell).join(',')
  })

  // \uFEFF is UTF-8 Byte Order Mark (BOM) ensuring Excel displays unicode symbols properly
  const csvContent = '\uFEFF' + [headerLine, ...dataLines].join('\r\n')

  downloadCSVBlob(filename, csvContent)
}

/**
 * Exports directly from 2D row arrays
 */
export function exportRawRowsToCSV(
  filename: string,
  headers: string[],
  rows: (string | number | null | undefined)[][]
): void {
  const headerLine = headers.map(escapeCSVCell).join(',')
  const dataLines = rows.map((row) => row.map(escapeCSVCell).join(','))
  const csvContent = '\uFEFF' + [headerLine, ...dataLines].join('\r\n')

  downloadCSVBlob(filename, csvContent)
}

export interface ReportSection {
  title?: string
  headers?: string[]
  rows: (string | number | null | undefined)[][]
}

/**
 * Exports a multi-section spreadsheet report
 */
export function exportMultiSectionCSV(
  filename: string,
  sections: ReportSection[],
  metadataHeaders?: string[]
): void {
  const lines: string[] = []

  if (metadataHeaders && metadataHeaders.length > 0) {
    lines.push(...metadataHeaders)
    lines.push('')
  }

  sections.forEach((section, index) => {
    if (section.title) {
      lines.push(`--- ${section.title.toUpperCase()} ---`)
    }
    if (section.headers && section.headers.length > 0) {
      lines.push(section.headers.map(escapeCSVCell).join(','))
    }
    section.rows.forEach((row) => {
      lines.push(row.map(escapeCSVCell).join(','))
    })
    if (index < sections.length - 1) {
      lines.push('')
    }
  })

  const csvContent = '\uFEFF' + lines.join('\r\n')
  downloadCSVBlob(filename, csvContent)
}

function downloadCSVBlob(filename: string, content: string): void {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.setAttribute('href', url)
  link.setAttribute('download', filename.endsWith('.csv') ? filename : `${filename}.csv`)
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
