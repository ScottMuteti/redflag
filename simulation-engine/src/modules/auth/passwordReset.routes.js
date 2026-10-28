// Self-service password reset by emailed link. The same single-use links also
// invite a newly onboarded organisation admin to set their first password.
const express = require('express');
const crypto = require('crypto');
const bcrypt = require('bcrypt');
const rateLimit = require('express-rate-limit');
const db = require('../../config/db');
const env = require('../../config/env');
const { sendPasswordResetEmail } = require('../../integrations/mail/mailer');
const { SALT_ROUNDS, tableFor, findAccountByEmail } = require('./session');

const router = express.Router();
const RESET_TTL_MS = 30 * 60 * 1000;
const INVITE_TTL_MS = 72 * 60 * 60 * 1000;
const MIN_PASSWORD = 8;

const sha256 = (value) => crypto.createHash('sha256').update(value).digest('hex');

// Stores a hashed one-time token and returns the link to email. `queryable`
// lets a caller run this inside its own transaction.
async function createPasswordLink(user, ttlMs = RESET_TTL_MS, queryable = db) {
  const token = crypto.randomBytes(32).toString('base64url');
  await queryable.query(
    `INSERT INTO password_resets (token_hash, user_id, user_role, expires_at)
     VALUES ($1, $2, $3, $4)`,
    [sha256(token), user.id, user.role, new Date(Date.now() + ttlMs)],
  );
  return `${env.portalUrl}/reset-password?token=${token}`;
}

const resetLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many reset requests, please try again later' },
});

// Always answers the same way, so it can't be used to find out who has an account.
router.post('/forgot', resetLimiter, async (req, res, next) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ message: 'email is required' });

  try {
    const user = await findAccountByEmail(email);
    if (user && !user.suspended_at) {
      const link = await createPasswordLink(user);
      await sendPasswordResetEmail(user.email, link);
    }
    return res.json({ message: 'If that email has an account, a reset link is on its way.' });
  } catch (err) {
    return next(err);
  }
});

router.post('/reset', resetLimiter, async (req, res, next) => {
  const { token, password } = req.body;
  if (!token || !password) return res.status(400).json({ message: 'token and password are required' });
  if (password.length < MIN_PASSWORD) {
    return res.status(400).json({ message: `password must be at least ${MIN_PASSWORD} characters` });
  }

  try {
    // Burn the token in the same statement that checks it, so it works once.
    const { rows } = await db.query(
      `UPDATE password_resets SET consumed_at = now()
       WHERE token_hash = $1 AND consumed_at IS NULL AND expires_at > now()
       RETURNING user_id, user_role`,
      [sha256(String(token))],
    );
    if (rows.length === 0) {
      return res.status(400).json({ message: 'This link has expired or was already used' });
    }
    const { user_id: userId, user_role: role } = rows[0];

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    const { rowCount } = await db.query(`UPDATE ${tableFor(role)} SET password_hash = $1 WHERE id = $2`, [
      passwordHash,
      userId,
    ]);
    if (rowCount === 0) return res.status(400).json({ message: 'Account no longer exists' });

    // Any other outstanding links for this account stop working too.
    await db.query(
      `UPDATE password_resets SET consumed_at = now()
       WHERE user_id = $1 AND user_role = $2 AND consumed_at IS NULL`,
      [userId, role],
    );
    return res.status(204).send();
  } catch (err) {
    return next(err);
  }
});

module.exports = { router, createPasswordLink, INVITE_TTL_MS };
