# 002 — Auto-assign training by the lure category that was failed

**Date:** 2026-10-21
**Status:** Accepted

## Context
A click or credential submission must trigger remedial training for the specific attack vector the employee fell for (O4).

## Decision
On a first click/submit, the engine matches the campaign's template `category`
(e.g. `mpesa`, `kra`, `safaricom`, `invoice`) to a training module of the same
category and assigns it. Every organisation gets the four built-in modules at
registration, so a match always exists for the default templates.

## Consequence
- A custom template with a new category has no matching module; nothing is
  assigned and a warning is logged (not a silent failure). Admins can add a
  module in that category.
- Assignment, event recording and rescoring happen in one transaction, so a
  tracked failure always produces (or re-uses) an assignment atomically.
- Broadening the fallback (e.g. a generic module per channel) is deferred to
  Sprint III.
