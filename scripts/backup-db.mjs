#!/usr/bin/env node
/**
 * scripts/backup-db.mjs
 * 
 * Standalone Automated Database Backup Script for Kasab Val Manager.
 * Dumps all Supabase PostgreSQL tables into human-readable JSON snapshots
 * and executable SQL restore dumps.
 * 
 * Usage:
 *   node scripts/backup-db.mjs
 *   npm run backup:db
 * 
 * Environment variables (loaded from app/.env.local or process environment):
 *   VITE_SUPABASE_URL          - Supabase project URL
 *   VITE_SUPABASE_ANON_KEY     - Supabase anon key
 *   VITE_USER_API_TOKEN        - User API security token for RLS authorization
 *   VITE_MASTER_PIN            - Master PIN for RLS authorization (default: 7878)
 *   SUPABASE_SERVICE_ROLE_KEY  - Optional: bypasses RLS if available
 *   BACKUP_DIR                 - Destination directory (default: ./backups)
 *   BACKUP_RETENTION_DAYS      - Number of days to retain backups (default: 30)
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const ROOT_DIR = path.resolve(__dirname, '..')

// Simple .env.local / .env loader
function loadEnv() {
  const envPaths = [
    path.join(ROOT_DIR, 'app', '.env.local'),
    path.join(ROOT_DIR, 'app', '.env'),
    path.join(ROOT_DIR, '.env.local'),
    path.join(ROOT_DIR, '.env'),
  ]

  for (const p of envPaths) {
    if (fs.existsSync(p)) {
      const content = fs.readFileSync(p, 'utf8')
      for (const line of content.split('\n')) {
        const trimmed = line.trim()
        if (!trimmed || trimmed.startsWith('#')) continue
        const eqIdx = trimmed.indexOf('=')
        if (eqIdx > 0) {
          const key = trimmed.slice(0, eqIdx).trim()
          let val = trimmed.slice(eqIdx + 1).trim()
          if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
            val = val.slice(1, -1)
          }
          if (!process.env[key]) {
            process.env[key] = val
          }
        }
      }
    }
  }
}

loadEnv()

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SERVICE_ROLE_KEY
const USER_TOKEN = process.env.VITE_USER_API_TOKEN || 'kasab_secure_prod_token_2026'
const MASTER_PIN = process.env.VITE_MASTER_PIN || '7878'
const BACKUP_DIR = path.resolve(ROOT_DIR, process.env.BACKUP_DIR || 'backups')
const RETENTION_DAYS = parseInt(process.env.BACKUP_RETENTION_DAYS || '30', 10)

const CORE_TABLES = [
  'parties',
  'receipts',
  'dispatches',
  'payments',
  'expenses',
  'sync_failures',
  'rola_returns',
  'production_orders',
]

if (!SUPABASE_URL || (!SUPABASE_ANON_KEY && !SERVICE_ROLE_KEY)) {
  console.error('❌ Error: Missing Supabase credentials.')
  console.error('Ensure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set in app/.env.local')
  process.exit(1)
}

const authKey = SERVICE_ROLE_KEY || SUPABASE_ANON_KEY
const headers = {
  apikey: authKey,
  Authorization: `Bearer ${authKey}`,
  'Content-Type': 'application/json',
  'x-app-pin': MASTER_PIN,
  'x-user-token': USER_TOKEN,
  'x-app-token': USER_TOKEN,
}

async function fetchTable(table) {
  const url = `${SUPABASE_URL.replace(/\/$/, '')}/rest/v1/${table}?select=*`
  const res = await fetch(url, { headers })
  if (!res.ok) {
    const errorText = await res.text().catch(() => '')
    throw new Error(`Failed to fetch table "${table}": HTTP ${res.status} ${res.statusText} - ${errorText}`)
  }
  return await res.json()
}

function generateSqlDump(payload) {
  const lines = [
    `-- ============================================================`,
    `-- ValManager Automated Database Restore Dump`,
    `-- Timestamp: ${payload.timestamp}`,
    `-- Source: ${payload.supabaseUrl}`,
    `-- Total Records: ${payload.totalRecords}`,
    `-- ============================================================`,
    ``,
    `begin;`,
    ``,
  ]

  for (const [table, rows] of Object.entries(payload.tables)) {
    if (!Array.isArray(rows) || rows.length === 0) continue

    lines.push(`-- Table: ${table} (${rows.length} records)`)
    for (const row of rows) {
      const keys = Object.keys(row)
      const cols = keys.map((k) => `"${k}"`).join(', ')
      const vals = keys
        .map((k) => {
          const val = row[k]
          if (val === null || val === undefined) return 'NULL'
          if (typeof val === 'number') return String(val)
          if (typeof val === 'boolean') return val ? 'TRUE' : 'FALSE'
          if (typeof val === 'object') return `'${JSON.stringify(val).replace(/'/g, "''")}'::jsonb`
          return `'${String(val).replace(/'/g, "''")}'`
        })
        .join(', ')

      lines.push(
        `insert into public."${table}" (${cols}) values (${vals}) on conflict (id) do update set ${keys
          .filter((k) => k !== 'id')
          .map((k) => `"${k}" = excluded."${k}"`)
          .join(', ')};`
      )
    }
    lines.push(``)
  }

  lines.push(`commit;`)
  lines.push(`-- Restore completed successfully.`)
  return lines.join('\n')
}

function pruneOldBackups(backupDir, retentionDays) {
  if (!fs.existsSync(backupDir)) return
  const now = Date.now()
  const maxAgeMs = retentionDays * 24 * 60 * 60 * 1000

  const files = fs.readdirSync(backupDir)
  let prunedCount = 0

  for (const file of files) {
    if (file === 'valmanager_backup_latest.json' || file === 'valmanager_backup_latest.sql') continue
    if (!file.startsWith('valmanager_backup_')) continue

    const filePath = path.join(backupDir, file)
    try {
      const stat = fs.statSync(filePath)
      if (now - stat.mtimeMs > maxAgeMs) {
        fs.unlinkSync(filePath)
        prunedCount++
      }
    } catch {}
  }

  if (prunedCount > 0) {
    console.log(`🧹 Pruned ${prunedCount} backups older than ${retentionDays} days.`)
  }
}

async function runBackup() {
  const startTime = Date.now()
  const dateObj = new Date()
  const timestampIso = dateObj.toISOString()
  const dateStr = dateObj.toISOString().replace(/[:.]/g, '-').slice(0, 19)

  console.log(`📦 Starting ValManager Automated Database Backup...`)
  console.log(`   Source Supabase: ${SUPABASE_URL}`)
  console.log(`   Destination:     ${BACKUP_DIR}`)

  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true })
  }

  const tableData = {}
  const stats = {}
  let totalRecords = 0

  for (const table of CORE_TABLES) {
    try {
      const rows = await fetchTable(table)
      tableData[table] = rows
      stats[table] = rows.length
      totalRecords += rows.length
      console.log(`   ✓ ${table.padEnd(20)}: ${rows.length} rows`)
    } catch (err) {
      console.warn(`   ⚠️ ${table.padEnd(20)}: Error reading table (${err.message})`)
      tableData[table] = []
      stats[table] = 0
    }
  }

  const payload = {
    version: 1,
    appName: 'ValManager',
    timestamp: timestampIso,
    supabaseUrl: SUPABASE_URL,
    totalRecords,
    tableStats: stats,
    tables: tableData,
  }

  // 1. Write timestamped JSON backup
  const jsonFilename = `valmanager_backup_${dateStr}.json`
  const jsonPath = path.join(BACKUP_DIR, jsonFilename)
  fs.writeFileSync(jsonPath, JSON.stringify(payload, null, 2), 'utf8')

  // 2. Write latest JSON backup symlink/copy
  const latestJsonPath = path.join(BACKUP_DIR, 'valmanager_backup_latest.json')
  fs.writeFileSync(latestJsonPath, JSON.stringify(payload, null, 2), 'utf8')

  // 3. Write executable SQL restore dump
  const sqlDump = generateSqlDump(payload)
  const sqlFilename = `valmanager_backup_${dateStr}.sql`
  const sqlPath = path.join(BACKUP_DIR, sqlFilename)
  fs.writeFileSync(sqlPath, sqlDump, 'utf8')

  const latestSqlPath = path.join(BACKUP_DIR, 'valmanager_backup_latest.sql')
  fs.writeFileSync(latestSqlPath, sqlDump, 'utf8')

  // 4. Prune old backups
  pruneOldBackups(BACKUP_DIR, RETENTION_DAYS)

  const durationSec = ((Date.now() - startTime) / 1000).toFixed(2)
  const jsonSizeKb = (fs.statSync(jsonPath).size / 1024).toFixed(1)
  const sqlSizeKb = (fs.statSync(sqlPath).size / 1024).toFixed(1)

  console.log(`\n✅ Backup completed successfully in ${durationSec}s!`)
  console.log(`   JSON Backup: ${jsonPath} (${jsonSizeKb} KB)`)
  console.log(`   SQL Backup:  ${sqlPath} (${sqlSizeKb} KB)`)
  console.log(`   Total Records Saved: ${totalRecords}`)
}

runBackup().catch((err) => {
  console.error('\n❌ Backup failed:', err)
  process.exit(1)
})

