# Kasab Val Manager

Job-work tracker for a Kasab (metallic yarn) → Val/Dori production business.
Built for Papa, usable on an Android phone, backed by Supabase + Google Sheets.

See [`PRD.md`](../PRD.md), [`Phase.md`](../Phase.md), [`architecture.md`](../architecture.md), and [`design.md`](../design.md) in the project root.

---

## Setup

```bash
# 1. Install dependencies
npm install

# 2. Configure Supabase
cp .env.example .env.local
# Edit .env.local and fill in VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY

# 3. Create database tables
# Paste supabase/migrations/001_initial_schema.sql into the Supabase SQL Editor

# 4. Run locally
npm run dev
```

## Deploy to Vercel

```bash
npx vercel --prod
# Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in Vercel project settings
```

## Stack

| Layer        | Choice                               |
|--------------|--------------------------------------|
| Frontend     | React 18 + Vite + TypeScript         |
| Styling      | Tailwind CSS v4 (Vite plugin)        |
| PWA          | vite-plugin-pwa (Workbox)            |
| Database     | Supabase (Postgres + RLS)            |
| Routing      | React Router v7                      |
| Icons        | Lucide React                         |
| Mobile pkg   | Capacitor (Android APK — Phase 7)    |
| Offline      | Dexie.js IndexedDB outbox (Phase 5)  |
| Backup       | Google Sheets via Edge Function (Phase 6) |

## Phase status

- [x] Phase 0 — Project Setup (skeleton, Supabase schema, PWA)
- [ ] Phase 1 — Parties + Receiving
- [ ] Phase 2 — Production + Dispatch
- [ ] Phase 3 — Rola, Payments, Expenses
- [ ] Phase 4 — Dashboard + Reports
- [ ] Phase 5 — Offline Queue
- [ ] Phase 6 — Google Sheets Backup
- [ ] Phase 7 — Android APK + Polish
- [ ] Phase 8 — Handoff & Observation
