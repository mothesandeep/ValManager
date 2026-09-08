# memory.md — Kasab Val Manager

**Purpose:** living project state. Whoever (or whatever agent) picks this project up next reads this first. Update this file at the end of every work session — don't let it go stale.

---

## Current Status

**Phase:** Not started — documentation complete (PRD, architecture, design, Phase plan, agent/rules/memory files), no code written yet.
**Next action:** Resolve the open questions below, then begin Phase 0 (Project Setup) per `Phase.md`.

## Project Summary

A digital operating system for Papa's Jari Kasab Val job-work business (Surat) — replacing challans + memory with an app that tracks Parties, Receiving, Production, Dispatch, Rola balances, Payments, Expenses, and Reports, with automatic Google Sheets backup so data survives even if the app's data is lost.

There is an existing **working prototype**: `kasab-val-manager.jsx`, built as a Claude artifact using `window.storage` for persistence. It validates the UI/UX, calculations, and module structure. It is **not** the real app — it only runs inside a Claude conversation and has no Google Sheets backup. The real build (per `architecture.md`) swaps `window.storage` for Supabase + adds the Sheets sync layer, keeping the same design.

## Decisions Made So Far

- Stack: React (Vite) + Tailwind + Supabase (Postgres) + Capacitor (Android packaging) + Google Sheets API backup via Supabase Edge Function. (See `architecture.md` for why.)
- Language: English only for v1.
- Platform: responsive — both mobile (Papa's primary device) and desktop (Sandeep's review use).
- Design system: brass/steel palette, Space Grotesk + Inter typography, bottom-tab nav on mobile / sidebar on desktop — carried over unchanged from the validated prototype. (See `design.md`.)
- Google Sheets backup is **one-way** (app → Sheet), upserted by record UUID, triggered on every write plus a daily reconciliation pass. The Sheet is read-only for Papa — editing only happens in the app.
- Bungari tare weight defaulted to 0.07kg per piece, per the original business brief.

## Open Questions (blocking Phase 0 in part)

1. **Auth:** does Papa want a PIN/login, or should the app just open with no gate? (Depends on whether his phone is shared with anyone else.)
2. **Bungari weight:** is 0.07kg fixed for every party, or does it vary — should it become a per-party or per-dispatch editable field instead of a hardcoded constant?
3. **Rate per kg:** does Papa charge the same rate to every party/color, or does it vary by party — should "rate" live on the Party profile as a default, rather than being re-entered per dispatch?

Resolve these with Papa/Sandeep before or during Phase 0 — they affect the schema (`architecture.md` §4) if answered differently than currently assumed.

## Ideas for Later (explicitly not v1 — see PRD §3)

*(empty — nothing deferred yet; add here if something comes up mid-build that shouldn't be built now)*

## Session Log

| Date | What happened |
|---|---|
| — | PRD, architecture, design, Phase plan, agent.md, rules.md, memory.md written. Prototype (`kasab-val-manager.jsx`) already existed and validated the UI/module structure before these docs were written. |

*(Add a new row each session: date, what was built/decided, what's left. Keep entries short — this is a log, not a diary.)*
