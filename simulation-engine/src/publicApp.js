const express = require('express');
const helmet = require('helmet');

const { trackClick, TRACKING_SLUGS } = require('./modules/campaigns/campaigns.routes');
const errorHandler = require('./middleware/errorHandler');

// The internet-facing surface of the engine.
//
// Design-first containment: this app mounts ONLY the public click-tracking
// endpoint that an SMS recipient must be able to reach. The admin API
// (auth, employees, campaigns, scoring, analytics, reports) lives in app.js on
// a separate port and is never mounted here. Only this app's port is exposed
// through the public tunnel, so a request to any admin path on the public URL
// is a flat 404 — the route does not exist in this process. Safety is a
// property of the architecture, not of remembering to close the tunnel.
const publicApp = express();

publicApp.use(helmet());
publicApp.get('/health', (req, res) => res.json({ status: 'ok' }));

// The only routes reachable from the internet. GET-only; no body parser needed.
// Each scam type uses a different, believable slug (/mpesa/…, /secure/…, …) so
// the link in a smishing message does not read like an API endpoint; all slugs
// in the whitelist route to the same debrief, and anything else is a 404.
publicApp.get(`/:slug(${TRACKING_SLUGS.join('|')})/:token`, trackClick);

publicApp.use(errorHandler);

module.exports = publicApp;
