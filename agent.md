# agent.md — Kasab Val Manager

This file tells whichever AI coding agent (Claude Code, Cursor, Antigravity, etc.) is building this project how to operate. Read this before writing any code, and re-read it if you've been away from the project for a while.

---

## 1. Read Order, Every Session

Before touching code, read in this order:
1. `memory.md` — what's actually been built so far, current phase, open decisions. This is ground truth over your own assumptions from a prior session.
2. `PRD.md` — what we're building and, just as important, what we are **not** building (§3 Non-Goals).
3. `architecture.md` — the stack, schema, and how the Google Sheets backup is supposed to work.
4. `design.md` — the visual/interaction system. Don't invent new patterns; extend the ones already defined.
5. `Phase.md` — which phase we're in, and that phase's exit criteria.

If `memory.md` says we're in Phase 3, do not start building Phase 5 features because they seem easy or related. Finish the current phase's exit criteria first.

## 2. Who You're Building For

The end user, Papa, will never read a README, never see a console error, and has low technical comfort. Every decision defaults toward "what does Papa need," not "what's technically interesting." Sandeep (the builder) is a Semester 2 CSE student — comfortable with C/C++ and picking up web dev through hackathon projects, but still learning. Explain non-obvious technical choices in plain terms when you make them; don't assume deep framework knowledge.

## 3. Working Style

- **One phase at a time.** Announce which phase/step you're working on before starting it. Don't silently jump ahead.
- **One logical change per commit/response.** Don't bundle "add Dispatch module" with "also refactored Parties" — makes it hard to review or roll back.
- **Show, then ask.** After finishing a phase's exit criteria, state clearly what was built and what the exit criteria check is, so Sandeep can verify against `Phase.md` before you move on.
- **Never invent business rules.** Bungari weight (0.07kg), cord counts, twist types, expense categories — these came from the actual business brief. If a real-world detail is ambiguous (e.g. "does Bungari weight vary by party?"), flag it as an open question rather than guessing and hardcoding.
- **Follow `rules.md`** for all code-level conventions (structure, naming, error handling, security).

## 4. Scope Discipline

`PRD.md` §3 lists explicit non-goals: multi-user auth, GST invoicing, WhatsApp/SMS alerts, forecasting, barcode scanning, multi-language UI, iOS. If a task seems to require one of these, stop and flag it rather than building it — these were deliberately cut to keep v1 shippable.

If mid-build you notice a genuinely useful feature that isn't in the PRD, don't build it silently. Note it (in `memory.md` under "Ideas for later") and keep going on the current task.

## 5. When Something in the Docs Is Wrong or Outdated

These docs (PRD/architecture/design/Phase) were written before a line of the real app existed — some assumptions will turn out wrong once real building starts (e.g. a Supabase feature doesn't work the way assumed, or Papa's actual phone can't handle something). When that happens:
1. Fix the actual doc (don't just work around it silently in code).
2. Log the change and why, in `memory.md`.
3. Continue building against the corrected doc.

Docs that silently drift from reality are worse than no docs — keep them honest.

## 6. Testing Against Reality

Every phase's exit criteria in `Phase.md` involves testing against Papa's actual phone and, where relevant, real paper challans (Phase 8 especially). Don't mark a phase done because the code compiles — mark it done because the exit criteria, as literally written, passed.
