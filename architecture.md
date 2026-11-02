# Architecture — Kasab Val Manager
**Version:** 2.0  
**Updated:** November 2026

---

## 1. High-Level Technology Stack

| Layer | Technology | Rationale & Responsibility |
|---|---|---|
| **Frontend Framework** | React 19 + TypeScript | Strict type safety, modern concurrent features, component modularity. |
| **Bundler & Tooling** | Vite 8 + Rolldown | High-speed local development, tree-shaking, production asset compression. |
| **Styling & Design** | Tailwind CSS v4 | Zero-runtime CSS, native CSS variable support, dark mode tokens. |
| **Mobile Packaging** | Capacitor 8 (Android) | Wraps the single web codebase into a high-performance native Android APK (`Kasab-Val-Manager.apk`). Interfaces with native camera, haptic engine, and status bar. |
| **Offline Cache & Outbox** | Dexie.js 4 (IndexedDB) | Reactive local client database for offline-first operation. Guarantees instantaneous mutation execution with optimistic UI rendering. |
| **Primary Cloud Database** | Supabase (PostgreSQL 15) | Relational database source of truth. Protected by Row-Level Security (RLS) policies and automated timestamp tracking. |
| **Object Storage** | Supabase Storage (`challan-images`) | Secure cloud bucket for physical delivery challan photographs. |
| **AI Vision Scanner** | Google GenAI SDK (`@google/genai`) | Gemini Flash vision model parses raw challan images to extract party names, line item weights, and spool counts. |
| **Automated Backups** | GitHub Actions + Node.js Scripts | Nightly automated database dumps (`daily-backup.yml`) paired with local CLI snapshot tools (`backup-db.mjs`, `restore-db.mjs`). |
| **Testing** | Vitest 4 | Comprehensive unit, integration, and UI ergonomics test suite (342 tests across 35 files). |

---

## 2. System Architecture Diagram

```
┌────────────────────────────────────────────────────────────────────────┐
│                   Client Application (Web & Android APK)               │
│                                                                        │
│  ┌───────────────────────┐   ┌───────────────────┐   ┌──────────────┐  │
│  │   UI Components &     │   │   AppLockContext  │   │  Gemini AI   │  │
│  │   Feature Modules     │   │   (PIN / Biometric│   │  Vision OCR  │  │
│  └───────────┬───────────┘   └───────────────────┘   └───────┬──────┘  │
│              │                                               │         │
│              ▼ Writes land locally FIRST                     │ Parses  │
│  ┌────────────────────────────────────────────────────────┐  │ image   │
│  │           Dexie.js (IndexedDB Local Outbox)            │  │ draft   │
│  │  - Optimistic UI Updates                               │  │         │
│  │  - Offline Mutation Queue (Create, Update, Delete)     │  │         │
│  │  - Last-Write-Wins (LWW) conflict engine               │  │         │
│  └───────────────────────────┬────────────────────────────┘  │         │
└──────────────────────────────┼───────────────────────────────┼─────────┘
                               │ Background sync               │
                               │ when online                   │
                               ▼                               ▼
┌────────────────────────────────────────────────────────────────────────┐
│                     Supabase Cloud Infrastructure                      │
│                                                                        │
│  ┌──────────────────────────────┐     ┌─────────────────────────────┐  │
│  │   PostgreSQL 15 Relational   │     │      Supabase Storage       │  │
│  │   - Row-Level Security (RLS) │     │      "challan-images"       │  │
│  │   - Strict API Protection    │     │      Compressed photos      │  │
│  │   - `updated_at` LWW engine  │     └─────────────────────────────┘  │
│  └──────────────┬───────────────┘                                      │
└─────────────────┼──────────────────────────────────────────────────────┘
                  │
                  │ Scheduled nightly trigger
                  ▼
┌────────────────────────────────────────────────────────────────────────┐
│              Disaster Recovery & Redundant Backup Engine               │
│                                                                        │
│  ┌──────────────────────────────┐     ┌─────────────────────────────┐  │
│  │   GitHub Actions Workflow    │     │    Local Admin Scripts      │  │
│  │   (`.github/workflows/       │     │    (`backup-db.mjs`,        │  │
│  │     daily-backup.yml`)       │     │     `restore-db.mjs`)       │  │
│  └──────────────────────────────┘     └─────────────────────────────┘  │
│  ┌──────────────────────────────┐     ┌─────────────────────────────┐  │
│  │   In-App "Oops" Rollback     │     │   30-Day Soft Delete        │  │
│  │   Emergency local snapshot   │     │   Trash Bin Service         │  │
│  └──────────────────────────────┘     └─────────────────────────────┘  │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 3. End-to-End Data Flow

1. **Local Mutation:** When the user records a new Inward receipt, Outward dispatch, or Payment, the payload is validated via Zod and written immediately to Dexie.js (IndexedDB).
2. **Instant UI Response:** The form closes and the UI updates optimistically with zero network latency or spinner delay.
3. **Network Synchronization:**
   - **Online:** The sync manager flushes pending queue mutations to Supabase via REST/PostgREST.
   - **Offline:** Mutations remain buffered in the outbox. The header pill reflects the offline state and pending count (e.g. `Offline (3 pending)`).
4. **Collision Handling (LWW):** Updates carry ISO 8601 timestamps (`updated_at`). The Supabase Postgres database applies Last-Write-Wins to resolve multi-client edits idempotently.
5. **Nightly Redundancy:** GitHub Actions executes a scheduled workflow that dumps all tables to encrypted JSON snapshots in the git repository, alerting on failures.

---

## 4. PostgreSQL Database Schema

```sql
-- 1. Parties Directory & Weight Preferences
CREATE TABLE parties (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    phone TEXT,
    address TEXT,
    notes TEXT,
    default_rate NUMERIC(10, 2) DEFAULT 0,
    default_rola_weight_g INT DEFAULT 125,
    default_bungari_weight_g INT DEFAULT 70,
    aliases TEXT[] DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    deleted_at TIMESTAMPTZ
);

-- 2. Inward Receipts (Kasab Raw Material)
CREATE TABLE receipts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    party_id UUID REFERENCES parties(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    color TEXT,                               -- Gold, Silver, Pelmet, Water, Antique
    twist_type TEXT,                          -- S, Z
    gross_weight NUMERIC(12, 3) NOT NULL,     -- In Kilograms (stored to 3 decimals)
    tare_weight NUMERIC(12, 3) DEFAULT 0,     -- Calculated rola tare in Kilograms
    net_weight NUMERIC(12, 3) NOT NULL,       -- gross_weight - tare_weight
    challan_no TEXT,
    rola_count INT DEFAULT 0,
    photo_url TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    deleted_at TIMESTAMPTZ
);

-- 3. Outward Dispatches (Val Finished Goods & Kali Returns)
CREATE TABLE dispatches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    party_id UUID REFERENCES parties(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    dispatch_type TEXT DEFAULT 'VAL',         -- 'VAL' (Delivery) or 'KALI' (Spool Return)
    challan_no TEXT,
    bore_gross_weight NUMERIC(12, 3) NOT NULL,
    bungari_count INT DEFAULT 0,
    bungari_weight_g INT DEFAULT 70,
    net_val_weight NUMERIC(12, 3) NOT NULL,
    rate_per_kg NUMERIC(10, 2) DEFAULT 0,
    amount NUMERIC(12, 2) DEFAULT 0,
    rola_count INT DEFAULT 0,                 -- Relevant for Kali spool returns
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    deleted_at TIMESTAMPTZ
);

-- 4. Payments Collection (Khata Credit)
CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    party_id UUID REFERENCES parties(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    amount NUMERIC(12, 2) NOT NULL,
    payment_method TEXT DEFAULT 'CASH',       -- CASH, BANK_TRANSFER, UPI, CHEQUE
    note TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    deleted_at TIMESTAMPTZ
);

-- 5. Operating Expenses
CREATE TABLE expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    date DATE NOT NULL,
    category TEXT NOT NULL,                   -- Rent, Electricity, Transport, Oil, Maintenance, etc.
    amount NUMERIC(12, 2) NOT NULL,
    note TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    deleted_at TIMESTAMPTZ
);
```

---

## 5. Security & Access Control

1. **Row-Level Security (RLS):** All tables have RLS enabled with explicit policies. Direct access with the public anon key is restricted to valid operations, shielding backend tables from unauthorized tampering.
2. **Zero Leaked Secrets:** Frontend builds and APK bundles contain only the public `anon` key. All administrative tokens, database passwords, and service-role secrets reside in protected environment variables.
3. **Application Lock:** Client-side 4-digit PIN authentication (`AppLockContext`) intercepts application startup and background-resume events, offering optional biometric authentication via the native device secure enclave.

---

## 6. Disaster Recovery & Data Integrity

1. **Daily Automated Backup (`.github/workflows/daily-backup.yml`):**
   - Scheduled via GitHub Actions cron to execute every night.
   - Extracts all table records and outputs timestamped, encrypted JSON dumps to the repository's `backups/` directory.
2. **Local Administrator Scripts:**
   - `scripts/backup-db.mjs`: Node.js utility to generate immediate local snapshots on demand.
   - `scripts/restore-db.mjs`: Verifies snapshot integrity and restores records to Supabase with transactional safeguards.
3. **Three-Tier Deletion Architecture:**
   - **Undo Banner:** Deleted items trigger a 5-second banner with an instant `[Undo]` button.
   - **Soft Delete Retention:** Database records populate a `deleted_at` timestamp.
   - **Trash Bin Service:** `trashBinService.ts` maintains records for 30 days in the client, enabling full restoration before permanent purge.
