require('dotenv').config();

const INSECURE_SECRETS = ['', 'change-me'];
const jwtSecret = process.env.JWT_SECRET || '';
if (INSECURE_SECRETS.includes(jwtSecret)) {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET must be set to a strong value in production');
  }
  console.warn('JWT_SECRET is unset or a placeholder; fine for local dev only');
}

const portalUrl = (process.env.PORTAL_URL || 'http://localhost:5173').replace(/\/$/, '');

module.exports = {
  port: process.env.PORT || 4000,
  // Internet-facing listener (publicApp.js). Carries ONLY the click-tracking
  // endpoint; the admin API never binds here. Only this port is tunnelled.
  publicPort: process.env.PUBLIC_PORT || 4001,
  jwtSecret: jwtSecret || 'change-me',
  db: {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    user: process.env.DB_USER || 'redflag',
    password: process.env.DB_PASSWORD || 'redflag',
    database: process.env.DB_NAME || 'redflag',
  },
  gophish: {
    apiUrl: process.env.GOPHISH_API_URL || '',
    apiKey: process.env.GOPHISH_API_KEY || '',
    webhookSecret: process.env.GOPHISH_WEBHOOK_SECRET || '',
    smtpProfile: process.env.GOPHISH_SMTP_PROFILE || 'RedFlag SMTP',
    landingPage: process.env.GOPHISH_LANDING_PAGE || 'RedFlag Awareness Landing',
    phishUrl: process.env.GOPHISH_PHISH_URL || 'http://localhost:8080',
  },
  africasTalking: {
    apiKey: process.env.AT_API_KEY || '',
    username: process.env.AT_USERNAME || 'sandbox',
  },
  gmail: {
    user: process.env.GMAIL_USER || '',
    appPassword: process.env.GMAIL_APP_PASSWORD || '',
  },
  // Demo/dev only: also print the login 2FA code to the server log so accounts
  // without a real inbox (e.g. the demo seed) can still complete login. Never
  // enable in production.
  otpDebug: process.env.OTP_DEBUG === 'true',
  // Google sign-in (OAuth web client ID). Blank disables the Google button.
  googleClientId: process.env.GOOGLE_CLIENT_ID || '',
  // Where the portal is served; used in password-reset and invite links.
  portalUrl,
  // Passkeys are bound to the portal's host; the origin must match exactly.
  webauthn: {
    rpId: process.env.WEBAUTHN_RP_ID || 'localhost',
    rpName: 'RedFlag',
    origin: process.env.WEBAUTHN_ORIGIN || portalUrl,
  },
  mlServiceUrl: process.env.ML_SERVICE_URL || 'http://localhost:8000',
  mlTimeoutMs: Number(process.env.ML_TIMEOUT_MS) || 5000,
  publicBackendUrl: process.env.PUBLIC_BACKEND_URL || 'http://localhost:4000',
};
