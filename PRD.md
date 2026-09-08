# PRD — Kasab Val Manager
**Version:** 1.0
**Owner:** Sandeep (builder) · **Primary User:** Papa (sole operator, Jari Kasab Val job-work business, Surat)

---

## 1. Problem

Papa runs a 1+ year old textile job-work business alone — receiving Kasab (metallic yarn) from parties, converting it to Val/Dori on a Ring Doubler machine, rewinding, dispatching, and getting paid on net weight. Every step today lives in **challans and memory**. Nothing is centralized:

- No single view of what's pending with which party (Rola to return, payment to collect).
- No production or dispatch history beyond paper challans.
- No expense or profitability tracking — profit is a guess, not a number.
- **Single point of failure**: if challans are lost or damaged, that work history is gone.

## 2. Goal

Give Papa one simple app, usable on his phone, that replaces memory + loose challans for:
tracking parties, raw material received, production, dispatch, Rola return balance, payments, and expenses — with automatic numbers (net weight, balances, monthly profit) instead of manual math.

**And:** every entry must also land in a Google Sheet automatically, so if the app's data is ever lost, the business records survive in a spreadsheet Papa (or Sandeep) can open independently.

## 3. Non-Goals (v1 — anti-scope-creep)

Explicitly **out of scope** for v1. Do not build these unless Papa asks after using v1 for a while:

- Multi-user accounts / employee logins (business is single-operator today).
- Invoice/GST-compliant billing or e-invoicing.
- SMS/WhatsApp auto-notifications to parties.
- Predictive analytics, forecasting, or AI suggestions.
- Barcode/QR scanning of Rola or Bungari.
- Multi-language UI (v1 is English only, per decision).
- A native iOS app (Android + mobile web only, since Papa's phone is Android).

If a feature isn't needed to replace "challan + memory" with "one accurate number," it waits for v2.

## 4. Users

| User | Role | Device | Technical comfort |
|---|---|---|---|
| Papa | Sole daily user — enters every transaction | Android phone (primary), maybe a shared computer | Low — needs large buttons, few free-text fields, dropdowns over typing |
| Sandeep | Builder, occasional data auditor | Laptop | High |

## 5. Core User Stories

### Parties
- As Papa, I can add a party once (name, phone, address) and reuse it for every future transaction, so I never retype it.
- As Papa, I can see, per party, at a glance: Rola pending with me, and money they owe me.

### Raw Material Receiving
- As Papa, when I pick up Kasab from a party, I enter gross weight and tare (Rola) weight, and the app calculates net weight — I never do this subtraction by hand.
- As Papa, I record the color type, challan number, and Rola count so the paper challan and the app always match.

### Production
- As Papa, I start a production order from a specific receiving entry, set cord count and S/Z twist type, and mark it Pending → In Progress → Done.
- As Papa, I can log waste per order so I know which orders run heavy waste.

### Dispatch
- As Papa, when I deliver finished Val, I enter bore gross weight and Bungari count; the app deducts Bungari tare weight (~70g each) automatically to give net Val weight.
- As Papa, if I know the rate per kg, the app calculates the amount owed to me — I don't do that math either.

### Rola Tracking
- As Papa, I can see, per party, how many Rola I've received vs. returned, and how many are still pending with me — since Rola belongs to the party, not to me.

### Payments
- As Papa, every dispatch with an amount automatically becomes something a party owes me; when they pay (in full or part), I log it and the balance updates itself.
- As Papa, I can see who owes me the most, so I know who to follow up with first.

### Expenses
- As Papa, I log rent, electricity, transport, machine oil, repairs, and consumables as they happen, tagged by category.

### Reports
- As Papa (or Sandeep reviewing with me), I can see this month's Kasab received, Val dispatched, revenue billed, expenses, and estimated profit — one screen, no manual addition.
- As Papa, I can see party-wise profitability and who has the highest pending balance.

### Backup (new requirement)
- As Papa, every time I add or edit anything, it should also be saved to a Google Sheet in the background, so that even if my phone breaks or the app data is wiped, the numbers still exist somewhere I (or Sandeep) can open in Excel/Google Sheets.
- As Sandeep, I want the Sheet to mirror the app's tables (one tab per module) so I can audit or recover data without reverse-engineering anything.

## 6. Functional Requirements

| Module | Required fields | Auto-calculated |
|---|---|---|
| Parties | Name*, phone, address, notes | Rola pending, balance due (from other modules) |
| Receiving | Party*, date, color, gross weight*, tare weight, challan no., Rola count | Net weight |
| Production | Receipt link*, cord count, S/Z type, waste, status | — |
| Dispatch | Party*, date, Bungari count, bore gross weight*, rate/kg (optional) | Net Val weight, amount (if rate given) |
| Rola returns | Party*, date, Rola count returned | Running balance (received − returned) |
| Payments | Party*, date, amount* | Running balance (receivable − received) |
| Expenses | Date, category*, amount*, note | Monthly totals by category |
| Reports | — | Monthly aggregates, party-wise profitability, top dues |

`*` = required field.

## 7. Non-Functional Requirements

- **Works offline-first**: entries queue locally and sync (to DB + Sheet) when internet returns — Papa's phone signal isn't always reliable mid-pickup.
- **Fast data entry**: every screen should be completable in under 6 taps/fields for a routine entry.
- **No data loss**: local save happens before any network call; Google Sheets backup is a second layer, not the primary store.
- **Runs on a low/mid-range Android phone** without lag.
- **Installable**: home-screen icon (PWA) and/or a packaged Android APK, so it feels like "an app," not a website Papa has to search for.

## 8. Success Criteria

The app is working if, three months in:

1. Papa has stopped writing job-work details on paper for his own tracking (challans to parties still happen — that's separate).
2. Every rupee owed to Papa is visible in the app without him having to recall it.
3. The Google Sheet backup has a row for every entry made in the app — spot-checked monthly.
4. Papa can, unassisted, add a receiving entry and a dispatch entry.
5. Monthly profit number in Reports is trusted enough that Papa references it without re-checking by hand.

## 9. Open Questions (resolve before/at Phase 1)

- Does Papa want a login/PIN at all, or should the app just open (single device, single user)?
- Should Bore weight / Bungari weight defaults (70g) be editable per party, in case some parties use different Bungari?
- Rate per kg — is it the same for all parties/colors, or does Papa negotiate per party? (Affects whether "rate" belongs on the party profile or per dispatch — currently modeled per dispatch.)
