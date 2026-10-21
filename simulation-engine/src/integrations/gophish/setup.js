// One-off Gophish provisioning for a RedFlag demo. Run: npm run gophish:setup
//
// Creates (idempotently, by name) the three things a live email campaign needs:
//   1. an SMTP sending profile that relays through the configured Gmail account,
//   2. a SAFE awareness landing page that never captures credentials, and
//   3. a webhook that posts tracked events back to this engine.
//
// Needs, in .env: GOPHISH_API_URL, GOPHISH_API_KEY, GOPHISH_WEBHOOK_SECRET,
// GMAIL_USER, GMAIL_APP_PASSWORD. Reads no secrets from anywhere else.
require('dotenv').config();
const axios = require('axios');
const https = require('https');
const env = require('../../config/env');

const SMTP_NAME = env.gophish.smtpProfile;
const PAGE_NAME = env.gophish.landingPage;
const WEBHOOK_NAME = 'RedFlag Engine';
// Gophish reaches the engine over the compose network, not localhost.
const WEBHOOK_URL =
  process.env.GOPHISH_WEBHOOK_URL || 'http://simulation-engine:4000/api/campaigns/webhook/gophish';

// Shown to anyone who clicks: this was a drill, with no field to type anything into.
const SAFE_LANDING_HTML = `<!doctype html>
<html lang="en">
  <head><meta charset="utf-8" /><title>Security awareness simulation</title></head>
  <body style="font-family: system-ui, sans-serif; max-width: 540px; margin: 4rem auto; padding: 0 1rem; color: #0f172a;">
    <h1>This was a simulated phishing test</h1>
    <p>The message you just clicked was sent by your organisation through RedFlag as a
       security-awareness exercise. It was not real, and no information was collected.</p>
    <p>A real attacker could have used a link like this to steal your password or money.
       Tell-tale signs to watch for next time:</p>
    <ul>
      <li>Urgency or threats ("verify now or your account is suspended").</li>
      <li>A sender address or link domain that isn't the real organisation's.</li>
      <li>Requests for a password, PIN, OTP or M-Pesa confirmation.</li>
    </ul>
    <p>Check your RedFlag employee portal for a short follow-up training module.</p>
  </body>
</html>`;

function client() {
  if (!env.gophish.apiKey) throw new Error('GOPHISH_API_KEY is not set in .env');
  return axios.create({
    baseURL: env.gophish.apiUrl,
    headers: { Authorization: `Bearer ${env.gophish.apiKey}` },
    httpsAgent: new https.Agent({ rejectUnauthorized: false }),
  });
}

// Gophish has no upsert; delete any existing object with our name, then recreate.
async function replaceByName(api, path, name, body) {
  const { data: existing } = await api.get(path);
  const match = (existing || []).find((item) => item.name === name);
  if (match) await api.delete(`${path}${match.id}`);
  const { data } = await api.post(path, { name, ...body });
  return data;
}

async function main() {
  const api = client();

  if (!env.gmail.user || !env.gmail.appPassword) {
    throw new Error('GMAIL_USER and GMAIL_APP_PASSWORD must be set in .env');
  }
  await replaceByName(api, '/api/smtp/', SMTP_NAME, {
    interface_type: 'SMTP',
    host: 'smtp.gmail.com:587',
    username: env.gmail.user,
    password: env.gmail.appPassword,
    from_address: `RedFlag Awareness <${env.gmail.user}>`,
    ignore_cert_errors: true,
  });
  console.log(`✓ SMTP profile "${SMTP_NAME}" (via ${env.gmail.user})`);

  await replaceByName(api, '/api/pages/', PAGE_NAME, {
    html: SAFE_LANDING_HTML,
    capture_credentials: false,
    capture_passwords: false,
  });
  console.log(`✓ Safe landing page "${PAGE_NAME}" (captures nothing)`);

  if (!env.gophish.webhookSecret) {
    throw new Error('GOPHISH_WEBHOOK_SECRET must be set in .env (same value the engine verifies)');
  }
  await replaceByName(api, '/api/webhooks/', WEBHOOK_NAME, {
    url: WEBHOOK_URL,
    secret: env.gophish.webhookSecret,
    is_active: true,
  });
  console.log(`✓ Webhook "${WEBHOOK_NAME}" -> ${WEBHOOK_URL}`);

  console.log('\nGophish is provisioned. Launch a campaign from the portal.');
}

main().catch((err) => {
  const detail = err.response?.data?.message || err.message;
  console.error(`Gophish setup failed: ${detail}`);
  process.exit(1);
});
