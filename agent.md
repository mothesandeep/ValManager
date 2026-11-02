# agent.md — Kasab Val Manager

This document instructs any AI coding agent (Claude Code, Cursor, Antigravity, etc.) operating in this repository. Read this file before beginning work, and re-read it when starting a new session.

---

## 1. Mandatory Reading Order

Before writing code or making architectural changes, review documentation in this order:

1. **`memory.md`** — Ground truth of what has actually been built, current status, test counts, and recent changes.
2. **`PRD.md`** — Product requirements, user stories, and feature specifications.
3. **`architecture.md`** — Tech stack, PostgreSQL schema, Dexie.js offline outbox, and security model.
4. **`design.md`** — Blue SaaS 2.0 design tokens, OLED dark mode, touch targets, and deletion patterns.
5. **`rules.md`** — Strict coding invariants, mathematical formulas, and directory structures.
6. **`Phase.md`** — Implementation phases, current phase focus, and exit criteria.

---

## 2. Who You Are Building For

- **Papa (Primary User):** Sole operator running a Kasab-to-Val job-work business in Surat, Gujarat. He uses an Android smartphone (`Kasab-Val-Manager.apk`) on the factory floor with dry or dusty hands. He requires:
  - Immediate offline responsiveness with zero loading spinners.
  - Large tap targets (≥44px) and thumb-zone controls.
  - Whole-number grams inputs (e.g. `24500` g) without awkward decimal keys.
  - "Galti-Proof" safety rails: Undo banners on swipe, explicit danger zones, and a 30-day trash bin.
  - High-contrast OLED dark mode for dim workshop lighting.
- **Sandeep (Builder & Auditor):** Computer science student who manages deployments, database integrity, automated backups, and monthly profitability auditing.

---

## 3. Working Conventions & Quality Floor

1. **Zero Regression Policy:** Never commit code that breaks the automated test suite or fails TypeScript typechecking:
   ```bash
   # Run all 342 automated tests
   npm test --prefix app

   # Verify TypeScript types and production bundle
   npm run build --prefix app

   # Fast linter check
   npm run lint --prefix app
   ```
2. **Respect the Feature Architecture:** Domain logic lives under `app/src/features/<feature>/` (e.g. `inward`, `outward`, `parties`, `expenses`, `reports`, `settings`, `scanner`, `billing`). Shared UI atoms reside in `app/src/components/common/`.
3. **Pure Calculations:** Business math (tare deductions, billing amounts, Khata balances) must always be implemented as pure, side-effect-free functions accompanied by unit tests.
4. **Keep Documentation Synchronized:** If code changes alter an architectural pattern, database schema, or design token, immediately update the corresponding documentation (`memory.md`, `architecture.md`, `design.md`, etc.). Never leave stale documentation.
5. **Android Native Verification:** When modifying Capacitor configurations or mobile layout features, verify that the Android APK builds cleanly via `npm run build:apk --prefix app`.
