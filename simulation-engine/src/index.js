require('dotenv').config();
const app = require('./app');
const publicApp = require('./publicApp');
const env = require('./config/env');
const { migrate } = require('./db/migrate');
const { launchDueCampaigns } = require('./modules/campaigns/campaigns.routes');

async function start() {
  // The DB container may still be starting; retry a few times before giving up.
  for (let attempt = 1; ; attempt += 1) {
    try {
      await migrate();
      break;
    } catch (err) {
      if (attempt >= 10) throw err;
      console.warn(`Migration failed (${err.message}), retrying…`);
      await new Promise((resolve) => setTimeout(resolve, 3000));
    }
  }

  app.listen(env.port, () => {
    console.log(`RedFlag simulation-engine (admin API) listening on port ${env.port}`);
  });

  // Separate internet-facing listener: only the click-tracking endpoint. This
  // is the sole port exposed through the public tunnel (see src/publicApp.js).
  publicApp.listen(env.publicPort, () => {
    console.log(`RedFlag public surface listening on port ${env.publicPort}`);
  });

  // Scheduled campaign launcher — kept out of app.js so tests don't start timers.
  setInterval(() => {
    launchDueCampaigns().catch((err) => console.error('Campaign scheduler error:', err.message));
  }, 60 * 1000);
}

start().catch((err) => {
  console.error('Startup failed:', err.message);
  process.exit(1);
});
