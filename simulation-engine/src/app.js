const express = require('express');
const cors = require('cors');
const helmet = require('helmet');

const authRoutes = require('./modules/auth/auth.routes');
const employeeRoutes = require('./modules/employees/employees.routes');
const campaignRoutes = require('./modules/campaigns/campaigns.routes');
const { trackClick } = campaignRoutes;
const scoringRoutes = require('./modules/scoring/scoring.routes');
const trainingRoutes = require('./modules/training/training.routes');
const analyticsRoutes = require('./modules/analytics/analytics.routes');
const reportRoutes = require('./modules/reports/reports.routes');
const systemRoutes = require('./modules/system/system.routes');
const errorHandler = require('./middleware/errorHandler');

const app = express();

app.use(helmet());
app.use(cors());
app.use(
  express.json({
    // 1 MB covers a CSV roster import; larger payloads are rejected with 413.
    limit: '1mb',
    verify: (req, res, buf) => {
      req.rawBody = buf;
    },
  }),
);

app.get('/health', (req, res) => res.json({ status: 'ok' }));

// Public click-tracking link, at a short believable path (also on publicApp).
// Used locally when PUBLIC_BACKEND_URL points at this admin port.
app.get('/s/:token', trackClick);

app.use('/api/auth', authRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/campaigns', campaignRoutes);
app.use('/api/scoring', scoringRoutes);
app.use('/api/training', trainingRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/system', systemRoutes);

app.use(errorHandler);

module.exports = app;
