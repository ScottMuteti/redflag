const express = require('express');
const helmet = require('helmet');

const { trackClick } = require('./modules/campaigns/campaigns.routes');
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

// The only route reachable from the internet. GET-only; no body parser needed.
publicApp.get('/api/campaigns/track/:token', trackClick);

publicApp.use(errorHandler);

module.exports = publicApp;
