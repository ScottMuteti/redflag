# 003 — Isolate the internet-facing surface from the admin API

**Date:** 2026-10-21
**Status:** Accepted

## Context
Employees click tracked links from their own devices, so the click-tracking
endpoint (`GET /api/campaigns/track/:token`) must be reachable from the public
internet. During local demos this reachability is provided by a Cloudflare
quick tunnel. A naive tunnel to the engine's port (4000) would also publish the
entire admin API — auth, employee roster, campaign management, scoring,
analytics, reports — to the internet. Those routes are JWT-protected, but
exposing them needlessly widens the attack surface (login brute-forcing,
rate-limit edges, any defect in an admin handler) and makes safety depend on an
operator remembering to close the tunnel.

## Decision
Split the engine into two listeners in one process:
- `app.js` on `PORT` (4000) — the full admin API, kept private.
- `publicApp.js` on `PUBLIC_PORT` (4001) — mounts **only** the click-tracking
  endpoint (and `/health`). No admin route is mounted here.

Only the public port is ever tunnelled. The Gophish webhook stays on the private
port because Gophish reaches the engine over the internal Docker network, not
through the tunnel, so it needs no public exposure.

## Consequence
- A request to any admin path on the public URL is a flat 404 — the route does
  not exist in that process. Containment is a property of the architecture, not
  of operational discipline. Verified: on 4001 `/api/employees` → 404 (route
  absent); on 4000 the same path → 401 (route present, auth required).
- Three Jest tests (`tests/public-app.test.js`) assert the admin surface is
  absent and the tracking endpoint works, so a future refactor cannot silently
  re-expose the admin API.
- This complements two existing design choices: tracking tokens are opaque
  random values (the public endpoint leaks no tenant data even if probed) and
  the Gophish webhook is HMAC-signed.
- Production equivalent (deferred, documented in DEPLOYMENT_REQUIREMENTS.md):
  the admin API sits behind a private network / gateway with an IP allowlist,
  and only the tracking endpoint is published on the internet-facing domain.
  The two-listener split is the local stand-in for that boundary.
