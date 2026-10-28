const express = require('express');
const bcrypt = require('bcrypt');
const rateLimit = require('express-rate-limit');
const { OAuth2Client } = require('google-auth-library');
const db = require('../../config/db');
const env = require('../../config/env');
const { authenticate, authorize } = require('../../middleware/auth');
const { sendAccessRequestNotice } = require('../../integrations/mail/mailer');
const {
  SALT_ROUNDS,
  OTP_MAX_ATTEMPTS,
  NOT_APPROVED,
  SUSPENDED,
  tableFor,
  findAccountByEmail,
  findAccountById,
  issueLoginChallenge,
  sessionResponse,
} = require('./session');
const passkeyRoutes = require('./passkeys.routes');
const { router: passwordResetRoutes } = require('./passwordReset.routes');

const router = express.Router();

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const accessRequestLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many requests, please try again later' },
});

// Self sign-up is closed. An organisation asks for access; a platform admin
// reviews it (see /api/system/access-requests). Nothing is created here.
router.post('/access-requests', accessRequestLimiter, async (req, res, next) => {
  const { organizationName, industry, county, contactName, contactEmail, phoneNumber, employeeCount, message } =
    req.body;
  if (!organizationName?.trim() || !contactName?.trim() || !EMAIL_RE.test(contactEmail || '')) {
    return res.status(400).json({ message: 'organizationName, contactName and a valid contactEmail are required' });
  }
  const headcount = employeeCount ? Number(employeeCount) : null;
  if (headcount !== null && (!Number.isInteger(headcount) || headcount < 1)) {
    return res.status(400).json({ message: 'employeeCount must be a positive whole number' });
  }

  try {
    // One open request per contact email; a repeat just gets the same answer.
    const { rows: open } = await db.query(
      "SELECT id FROM access_requests WHERE lower(contact_email) = lower($1) AND status = 'pending'",
      [contactEmail.trim()],
    );
    if (open.length === 0) {
      const { rows } = await db.query(
        `INSERT INTO access_requests
           (organization_name, industry, county, contact_name, contact_email, phone_number, employee_count, message)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING id, organization_name, contact_name, contact_email`,
        [
          organizationName.trim().slice(0, 255),
          industry?.trim().slice(0, 100) || null,
          county?.trim().slice(0, 100) || null,
          contactName.trim().slice(0, 255),
          contactEmail.trim(),
          phoneNumber?.trim().slice(0, 20) || null,
          headcount,
          message?.trim().slice(0, 2000) || null,
        ],
      );
      const { rows: admins } = await db.query('SELECT email FROM system_admins');
      await sendAccessRequestNotice(
        admins.map((a) => a.email),
        rows[0],
      );
    }
    return res.status(202).json({ message: 'Request received. We’ll email you once it has been reviewed.' });
  } catch (err) {
    return next(err);
  }
});

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many login attempts, please try again later' },
});

// Separate budget for the OTP step so verifying/resending a code never eats
// into the password-login budget (and vice versa).
const otpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many attempts, please log in again' },
});

router.post('/login', loginLimiter, async (req, res, next) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ message: 'email and password are required' });
  }

  try {
    const user = await findAccountByEmail(email);
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const matches = await bcrypt.compare(password, user.password_hash);
    if (!matches) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    if (user.suspended_at) return res.status(403).json(SUSPENDED);

    // Password is correct, but login is not complete until the emailed code is
    // verified. No token is issued here.
    const challenge = await issueLoginChallenge(user, user.role);
    return res.json({ mfaRequired: true, ...challenge });
  } catch (err) {
    return next(err);
  }
});

// Step two: exchange a valid code for a token.
router.post('/login/verify', otpLimiter, async (req, res, next) => {
  const { challengeId, code } = req.body;
  if (!challengeId || !code) {
    return res.status(400).json({ message: 'challengeId and code are required' });
  }

  try {
    const { rows } = await db.query(
      'SELECT * FROM login_otps WHERE challenge_id = $1',
      [challengeId],
    );
    const otp = rows[0];
    if (!otp || otp.consumed_at || new Date(otp.expires_at) < new Date()) {
      return res.status(401).json({ message: 'Code expired or invalid — please log in again' });
    }
    if (otp.attempts >= OTP_MAX_ATTEMPTS) {
      await db.query('UPDATE login_otps SET consumed_at = now() WHERE id = $1', [otp.id]);
      return res.status(429).json({ message: 'Too many incorrect codes — please log in again' });
    }

    const matches = await bcrypt.compare(String(code), otp.code_hash);
    if (!matches) {
      await db.query('UPDATE login_otps SET attempts = attempts + 1 WHERE id = $1', [otp.id]);
      return res.status(401).json({ message: 'Incorrect code' });
    }

    // Single-use: burn the challenge before issuing the token.
    await db.query('UPDATE login_otps SET consumed_at = now() WHERE id = $1', [otp.id]);

    const user = await findAccountById(otp.user_id, otp.user_role);
    if (!user) {
      return res.status(401).json({ message: 'Account no longer exists' });
    }
    if (user.suspended_at) return res.status(403).json(SUSPENDED);
    return res.json(sessionResponse(user));
  } catch (err) {
    return next(err);
  }
});

// Resend a fresh code for an existing, still-valid challenge.
router.post('/login/resend', otpLimiter, async (req, res, next) => {
  const { challengeId } = req.body;
  if (!challengeId) return res.status(400).json({ message: 'challengeId is required' });

  try {
    const { rows } = await db.query(
      'SELECT * FROM login_otps WHERE challenge_id = $1',
      [challengeId],
    );
    const otp = rows[0];
    if (!otp || otp.consumed_at || new Date(otp.expires_at) < new Date()) {
      return res.status(401).json({ message: 'Session expired — please log in again' });
    }
    // Burn the old challenge and issue a new one to the same user.
    await db.query('UPDATE login_otps SET consumed_at = now() WHERE id = $1', [otp.id]);
    const challenge = await issueLoginChallenge(
      { id: otp.user_id, organization_id: otp.organization_id, email: otp.email },
      otp.user_role,
    );
    return res.json({ mfaRequired: true, ...challenge });
  } catch (err) {
    return next(err);
  }
});

// Which optional sign-in methods the portal should offer.
router.get('/providers', (req, res) => {
  res.json({ googleClientId: env.googleClientId || null });
});

let googleClient;

// Own budget so password-guessing never locks out Google sign-in.
const googleLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many login attempts, please try again later' },
});

// Google sign-in. Google proves the email; the account must already exist
// (pre-approved by an admin), and the emailed code is still required.
router.post('/google', googleLimiter, async (req, res, next) => {
  if (!env.googleClientId) return res.status(503).json({ message: 'Google sign-in is not configured' });
  const { credential } = req.body;
  if (!credential) return res.status(400).json({ message: 'credential is required' });

  let payload;
  try {
    googleClient = googleClient || new OAuth2Client(env.googleClientId);
    const ticket = await googleClient.verifyIdToken({ idToken: credential, audience: env.googleClientId });
    payload = ticket.getPayload();
  } catch {
    return res.status(401).json({ message: 'Google sign-in failed' });
  }
  if (!payload?.email || !payload.email_verified) {
    return res.status(401).json({ message: 'Google account email is not verified' });
  }

  try {
    const user = await findAccountByEmail(payload.email);
    if (!user) return res.status(403).json({ ...NOT_APPROVED, email: payload.email });
    if (user.suspended_at) return res.status(403).json(SUSPENDED);
    const challenge = await issueLoginChallenge(user, user.role);
    return res.json({ mfaRequired: true, ...challenge });
  } catch (err) {
    return next(err);
  }
});

router.use('/passkeys', passkeyRoutes);
router.use('/password', passwordResetRoutes);

router.get('/me', authenticate, async (req, res, next) => {
  try {
    if (req.user.role === 'system_admin') {
      const { rows } = await db.query(
        `SELECT id, full_name AS "fullName", email, role, NULL AS "organizationId",
           'RedFlag platform' AS "organizationName"
         FROM system_admins WHERE id = $1`,
        [req.user.sub],
      );
      if (rows.length === 0) return res.status(404).json({ message: 'User not found' });
      return res.json(rows[0]);
    }
    const { rows } = await db.query(
      `SELECT u.id, u.full_name AS "fullName", u.email, u.role, u.organization_id AS "organizationId",
         organizations.name AS "organizationName", organizations.industry, organizations.county
       FROM ${tableFor(req.user.role)} u
       JOIN organizations ON organizations.id = u.organization_id
       WHERE u.id = $1`,
      [req.user.sub],
    );
    if (rows.length === 0) return res.status(404).json({ message: 'User not found' });
    return res.json(rows[0]);
  } catch (err) {
    return next(err);
  }
});

router.put('/me', authenticate, async (req, res, next) => {
  const { fullName } = req.body;
  if (!fullName || !fullName.trim()) return res.status(400).json({ message: 'fullName is required' });

  const orgColumn = req.user.role === 'system_admin' ? 'NULL' : 'organization_id';
  try {
    const { rows } = await db.query(
      `UPDATE ${tableFor(req.user.role)} SET full_name = $1 WHERE id = $2
       RETURNING id, full_name AS "fullName", email, role, ${orgColumn} AS "organizationId"`,
      [fullName.trim(), req.user.sub],
    );
    if (rows.length === 0) return res.status(404).json({ message: 'User not found' });
    return res.json(rows[0]);
  } catch (err) {
    return next(err);
  }
});

router.put('/password', authenticate, async (req, res, next) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ message: 'currentPassword and newPassword are required' });
  }
  if (newPassword.length < 8) {
    return res.status(400).json({ message: 'newPassword must be at least 8 characters' });
  }

  try {
    const table = tableFor(req.user.role);
    const { rows } = await db.query(`SELECT password_hash FROM ${table} WHERE id = $1`, [
      req.user.sub,
    ]);
    if (rows.length === 0) return res.status(404).json({ message: 'User not found' });
    const matches = await bcrypt.compare(currentPassword, rows[0].password_hash);
    if (!matches) return res.status(400).json({ message: 'Current password is incorrect' });

    const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
    await db.query(`UPDATE ${table} SET password_hash = $1 WHERE id = $2`, [
      passwordHash,
      req.user.sub,
    ]);
    return res.status(204).send();
  } catch (err) {
    return next(err);
  }
});

router.put('/organization', authenticate, authorize('admin'), async (req, res, next) => {
  const { name, industry, county } = req.body;
  if (!name || !name.trim()) return res.status(400).json({ message: 'name is required' });

  try {
    const { rows } = await db.query(
      `UPDATE organizations SET name = $1, industry = $2, county = $3, updated_at = now()
       WHERE id = $4 RETURNING id, name, industry, county`,
      [name.trim(), industry || null, county || null, req.user.organizationId],
    );
    return res.json(rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ message: 'name is already taken' });
    return next(err);
  }
});

module.exports = router;
