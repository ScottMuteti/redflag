# 004 — Public portal through Tailscale Funnel

**Date:** 2026-11-24
**Status:** Accepted (amends 003 for public hosting)

## Context
RedFlag is hosted on one laptop and the portal must open from any browser. The
portal needs the API, so 003's "never tunnel the admin API" cannot hold as is.

## Decision
- Funnel 443 to the portal (nginx), which proxies `/api` to the engine.
- Funnel 8443 to Gophish tracking; Funnel 10000 to the engine's public port.
- nginx blocks the Gophish webhook. Postgres, risk model and Gophish admin are
  not published; the engine listens on loopback only.
- Strong `JWT_SECRET`, OTP codes never logged by default, CORS limited to the
  portal, rate limits keyed on the real client address.

## Consequence
The login and API are reachable from the internet, protected by JWT, email OTP
and rate limits. The two-listener split in 003 still isolates click tracking.
