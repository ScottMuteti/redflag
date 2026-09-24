require('dotenv').config();
const app = require('./app');
const env = require('./config/env');
const { launchDueCampaigns } = require('./modules/campaigns/campaigns.routes');

app.listen(env.port, () => {
  console.log(`RedFlag simulation-engine listening on port ${env.port}`);
});

// Scheduled campaign launcher — kept out of app.js so tests don't start timers.
setInterval(() => {
  launchDueCampaigns().catch((err) => console.error('Campaign scheduler error:', err.message));
}, 60 * 1000);
