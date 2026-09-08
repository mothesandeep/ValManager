# rules.md — Kasab Val Manager

Concrete coding rules for this project. `agent.md` covers *how to work*; this file covers *how the code should look and behave*.

---

## 1. Stack Rules (do not substitute without updating architecture.md first)

- Frontend: React + Vite + Tailwind CSS. No other CSS framework, no CSS-in-JS library.
- State: React state/hooks for UI state. Server state goes through Supabase client, not a separate state-management library (Redux etc.) — the app isn't complex enough to need one.
- Database: Supabase (Postgres). No direct SQLite/local DB as the source of truth — IndexedDB is a **sync queue only** (Phase 5+), never the primary store.
- Icons: `lucide-react` only, for consistency with the existing prototype.
- Mobile packaging: Capacitor. Do not introduce React Native or Flutter — that would mean rebuilding the UI from scratch for no benefit here.

## 2. File & Folder Structure

```
/src
  /components      -- shared UI atoms (Button, Field, Table, KpiCard, etc.)
  /modules
    /parties
    /receiving
    /production
    /dispatch
    /rola
    /payments
    /expenses
    /reports
    /dashboard
  /lib
    supabaseClient.js
    calculations.js   -- net weight, net Val weight, balances — pure functions, unit-testable
    offlineQueue.js    -- Phase 5+
  /styles
    tokens.css        -- design tokens from design.md, as CSS variables
```

One module = one folder = its form + its table/list + its own small hooks. Don't scatter one module's logic across unrelated folders.

## 3. Calculation Rules

All derived numbers must be **pure functions** in `lib/calculations.js`, not inlined in components and not duplicated between frontend and any backend function. Specifically:

- `netWeight(gross, tare) = gross - tare`
- `netValWeight(boreGross, bungariCount) = boreGross - (bungariCount * 0.07)`
- `dispatchAmount(netValWeight, ratePerKg) = ratePerKg ? round(netValWeight * ratePerKg) : null`
- `rolaPending(received, returned) = received - returned`
- `partyBalance(totalDispatchValue, totalReceived) = totalDispatchValue - totalReceived`

If the Google Sheets backup (Phase 6) ever needs to recompute these independently, it must import/mirror these exact formulas — never re-derive them differently, or the app and the backup Sheet will silently disagree.

## 4. Data & Security Rules

- **Never** ship the Google service account key, or any Supabase service-role key, in frontend code or a public repo. Service-role/service-account credentials live only in Supabase Edge Function environment secrets.
- The frontend uses only the Supabase **anon key**, scoped by Row-Level Security — never the service role key.
- Every table write includes the record's own UUID (`gen_random_uuid()` server-side or generated client-side) — this UUID is the sync key used for Google Sheets upserts. Never rely on row order or auto-increment for sync matching.
- Don't log full record contents (names, phone numbers, amounts) to any third-party analytics or error-tracking tool. Local console logs for debugging are fine; nothing business-sensitive leaves the app/Supabase/Sheet boundary.

## 5. Offline Queue Rules (Phase 5+)

- Every write goes to IndexedDB first, UI updates optimistically, sync to Supabase happens in background.
- Sync must be **idempotent** — retrying a write that already succeeded must not create a duplicate row (match on UUID).
- Never block the UI on network state. A slow/dead connection must never prevent Papa from completing a form.

## 6. Error Handling

- User-facing errors follow `design.md` §5 tone: state what happened, state what to do, never blame the user, never show a raw stack trace or technical error code to Papa.
- Every `try/catch` around a Supabase or Sheets API call must have a real fallback (queue for retry, or a visible-but-calm status indicator) — never a silent `catch {}` that hides a lost write.

## 7. Naming & Style

- Variables and functions: `camelCase`. Components: `PascalCase`. Files matching a component: same `PascalCase` name.
- No abbreviations that aren't already in the business brief's own vocabulary (`Val`, `Rola`, `Bungari`, `Kasab` are fine as-is; don't invent new shorthand).
- Comments explain **why**, not what — the "what" should be clear from good naming. Reserve comments for business-rule context a future reader wouldn't otherwise know (e.g. *"// 0.07kg = standard Bungari tare weight, see architecture.md §4"*).

## 8. What Not to Do

- Don't add a UI library (MUI, Chakra, shadcn, etc.) on top of Tailwind — the design system in `design.md` is custom and specific; a component library fights it.
- Don't add authentication complexity beyond what `PRD.md` §9 resolves — no OAuth, no third-party login providers, unless that open question is explicitly answered otherwise.
- Don't optimize prematurely — this app handles one small business's transaction volume (dozens of entries a week, not thousands). Simple, readable code beats clever, fast code here.
