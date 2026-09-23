const express = require('express');
const cors = require('cors');
const helmet = require('helmet');

const authRoutes = require('./modules/auth/auth.routes');
const employeeRoutes = require('./modules/employees/employees.routes');
const campaignRoutes = require('./modules/campaigns/campaigns.routes');
const scoringRoutes = require('./modules/scoring/scoring.routes');
const trainingRoutes = require('./modules/training/training.routes');
const analyticsRoutes = require('./modules/analytics/analytics.routes');
const errorHandler = require('./middleware/errorHandler');

const app = express();

app.use(helmet());
app.use(cors());
app.use(
  express.json({
    verify: (req, res, buf) => {
      req.rawBody = buf;
    },
  }),
);

app.get('/health', (req, res) => res.json({ status: 'ok' }));

app.use('/api/auth', authRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/campaigns', campaignRoutes);
app.use('/api/scoring', scoringRoutes);
app.use('/api/training', trainingRoutes);
app.use('/api/analytics', analyticsRoutes);

app.use(errorHandler);

module.exports = app;
