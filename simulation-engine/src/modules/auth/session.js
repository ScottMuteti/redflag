// Shared login plumbing for every sign-in method (password, Google, passkey).
const crypto = require('crypto');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../../config/db');
const env = require('../../config/env');
const { sendOtpEmail } = require('../../integrations/mail/mailer');

const SALT_ROUNDS = 10;
const SESSION_TTL = '20m'; // absolute session length; the portal logs out on expiry

// Mandatory email 2FA on login.
const OTP_TTL_MS = 10 * 60 * 1000; // code valid for 10 minutes
const OTP_MAX_ATTEMPTS = 5; // verify tries per challenge before it is burned

const TABLES = { system_admin: 'system_admins', admin: 'admin_users', employee: 'employees' };
const tableFor = (role) => TABLES[role] || 'employees';

// Every account row carries its organisation's suspension, so each sign-in
// path can refuse a suspended tenant. System admins have no organisation.
const ACCOUNT_SQL = {
  system_admin: `SELECT id, NULL::int AS organization_id, full_name, email, password_hash, role,
      NULL::timestamptz AS suspended_at FROM system_admins u`,
  admin: `SELECT u.id, u.organization_id, u.full_name, u.email, u.password_hash, u.role, o.suspended_at
      FROM admin_users u JOIN organizations o ON o.id = u.organization_id`,
  employee: `SELECT u.id, u.organization_id, u.full_name, u.email, u.password_hash, u.role, o.suspended_at
      FROM employees u JOIN organizations o ON o.id = u.organization_id`,
};

function generateOtp() {
  return String(crypto.randomInt(0, 1_000_000)).padStart(6, '0');
}

// a@b.com -> a***@b.com, so the client can show which inbox to check.
function maskEmail(email) {
  const [local, domain] = String(email).split('@');
  if (!domain) return email;
  const head = local.slice(0, 1);
  return `${head}${'*'.repeat(Math.max(local.length - 1, 1))}@${domain}`;
}

// Pre-approved accounts are the rows an admin created (or the org's own admin).
// When an email exists in several tables, system admin wins, then admin.
async function findAccountByEmail(email) {
  for (const role of ['system_admin', 'admin', 'employee']) {
    const { rows } = await db.query(`${ACCOUNT_SQL[role]} WHERE lower(u.email) = lower($1)`, [email]);
    if (rows.length > 0) return rows[0];
  }
  return null;
}

async function findAccountById(id, role) {
  if (!ACCOUNT_SQL[role]) return null;
  const { rows } = await db.query(`${ACCOUNT_SQL[role]} WHERE u.id = $1`, [id]);
  return rows[0] || null;
}

const SUSPENDED = {
  code: 'ORG_SUSPENDED',
  message: 'Your organisation’s RedFlag access is suspended. Contact your manager.',
};

// Creates a pending login challenge and emails the code. Returns the challengeId.
async function issueLoginChallenge(user, role) {
  const code = generateOtp();
  const challengeId = crypto.randomUUID();
  const codeHash = await bcrypt.hash(code, SALT_ROUNDS);
  await db.query(
    `INSERT INTO login_otps (challenge_id, user_id, user_role, organization_id, email, code_hash, expires_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [challengeId, user.id, role, user.organization_id, user.email, codeHash, new Date(Date.now() + OTP_TTL_MS)],
  );
  await sendOtpEmail(user.email, code);
  return { challengeId, email: maskEmail(user.email) };
}

function signToken(user) {
  return jwt.sign(
    { sub: user.id, role: user.role, organizationId: user.organization_id, email: user.email },
    env.jwtSecret,
    { expiresIn: SESSION_TTL },
  );
}

// The { token, user } body every successful login returns.
function sessionResponse(user) {
  return {
    token: signToken(user),
    user: { id: user.id, fullName: user.full_name, email: user.email, role: user.role, organizationId: user.organization_id },
  };
}

// Sent when someone proves who they are (Google, passkey) but has no account.
const NOT_APPROVED = {
  code: 'NOT_APPROVED',
  message: 'This account has not been added to RedFlag. Ask your manager to add you.',
};

module.exports = {
  SALT_ROUNDS,
  OTP_MAX_ATTEMPTS,
  NOT_APPROVED,
  SUSPENDED,
  tableFor,
  findAccountByEmail,
  findAccountById,
  issueLoginChallenge,
  signToken,
  sessionResponse,
};
