#!/usr/bin/env node
/**
 * scripts/restore-db.mjs
 * 
 * Standalone Database Restore Script for Kasab Val Manager.
 * Restores a JSON backup dump directly back into Supabase PostgreSQL tables.
 * 
 * Usage:
 *   node scripts/restore-db.mjs [path-to-backup.json]
 *   npm run restore:db
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

const backupFile = process.argv[2] || path.join(ROOT_DIR, 'backups', 'valmanager_backup_latest.json')

if (!fs.existsSync(backupFile)) {
  console.error(`❌ Error: Backup file not found at "${backupFile}"`)
  console.error(`Provide a valid backup JSON path: node scripts/restore-db.mjs <file.json>`)
  process.exit(1)
}

if (!SUPABASE_URL || (!SUPABASE_ANON_KEY && !SERVICE_ROLE_KEY)) {
  console.error('❌ Error: Missing Supabase credentials in environment.')
  process.exit(1)
}

const authKey = SERVICE_ROLE_KEY || SUPABASE_ANON_KEY
const headers = {
  apikey: authKey,
  Authorization: `Bearer ${authKey}`,
  'Content-Type': 'application/json',
  'Prefer': 'resolution=merge-duplicates',
  'x-app-pin': MASTER_PIN,
  'x-user-token': USER_TOKEN,
  'x-app-token': USER_TOKEN,
}

async function upsertTableRows(table, rows) {
  if (!Array.isArray(rows) || rows.length === 0) return 0
  const url = `${SUPABASE_URL.replace(/\/$/, '')}/rest/v1/${table}`
  const chunkSize = 100
  let upserted = 0

  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize)
    const res = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(chunk),
    })

    if (!res.ok) {
      const err = await res.text().catch(() => '')
      throw new Error(`Failed to upsert chunk into "${table}": HTTP ${res.status} - ${err}`)
    }
    upserted += chunk.length
  }
  return upserted
}

async function runRestore() {
  console.log(`🔄 Starting ValManager Database Restore...`)
  console.log(`   Source Backup File: ${backupFile}`)
  console.log(`   Target Supabase:    ${SUPABASE_URL}`)

  const raw = fs.readFileSync(backupFile, 'utf8')
  const payload = JSON.parse(raw)

  if (!payload.tables || typeof payload.tables !== 'object') {
    throw new Error('Invalid backup format: missing "tables" map.')
  }

  // Restore order: Parties first (foreign key root), then child tables
  const orderedTables = [
    'parties',
    'receipts',
    'dispatches',
    'payments',
    'expenses',
    'sync_failures',
    'rola_returns',
    'production_orders',
  ]

  let totalRestored = 0
  for (const table of orderedTables) {
    const rows = payload.tables[table] || []
    if (rows.length === 0) continue

    try {
      const count = await upsertTableRows(table, rows)
      console.log(`   ✓ Restored ${table.padEnd(20)}: ${count} rows`)
      totalRestored += count
    } catch (err) {
      console.error(`   ❌ Failed restoring "${table}": ${err.message}`)
    }
  }

  console.log(`\n✅ Restore complete! Total rows merged: ${totalRestored}`)
}

runRestore().catch((err) => {
  console.error('\n❌ Restore failed:', err)
  process.exit(1)
})

