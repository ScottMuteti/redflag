// Passkey (WebAuthn) registration and sign-in. Only a signed-in user can add a
// passkey, so a passkey always maps to a pre-approved account. A passkey login
// skips the email code: it is already two factors (the device, plus the
// fingerprint/face/PIN that userVerification 'required' demands).
const express = require('express');
const crypto = require('crypto');
const rateLimit = require('express-rate-limit');
const {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} = require('@simplewebauthn/server');
const db = require('../../config/db');
const env = require('../../config/env');
const { authenticate } = require('../../middleware/auth');
const { NOT_APPROVED, SUSPENDED, findAccountById, sessionResponse } = require('./session');

const router = express.Router();
const CHALLENGE_TTL_MS = 5 * 60 * 1000;

const passkeyLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many passkey attempts, please try again later' },
});

async function saveChallenge(purpose, challenge, user) {
  const challengeId = crypto.randomUUID();
  await db.query(
    `INSERT INTO webauthn_challenges (challenge_id, purpose, challenge, user_id, user_role, expires_at)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [challengeId, purpose, challenge, user?.sub ?? null, user?.role ?? null, new Date(Date.now() + CHALLENGE_TTL_MS)],
  );
  return challengeId;
}

// Burns and returns a live challenge, or null if it is unknown, used or expired.
async function takeChallenge(challengeId, purpose) {
  const { rows } = await db.query(
    `UPDATE webauthn_challenges SET consumed_at = now()
     WHERE challenge_id = $1 AND purpose = $2 AND consumed_at IS NULL AND expires_at > now()
     RETURNING challenge, user_id, user_role`,
    [challengeId, purpose],
  );
  return rows[0] || null;
}

router.get('/', authenticate, async (req, res, next) => {
  try {
    const { rows } = await db.query(
      `SELECT id, name, created_at AS "createdAt", last_used_at AS "lastUsedAt"
       FROM passkeys WHERE user_id = $1 AND user_role = $2 ORDER BY created_at`,
      [req.user.sub, req.user.role],
    );
    return res.json(rows);
  } catch (err) {
    return next(err);
  }
});

router.delete('/:id', authenticate, async (req, res, next) => {
  if (!/^\d+$/.test(req.params.id)) return res.status(404).json({ message: 'Passkey not found' });
  try {
    const { rowCount } = await db.query(
      'DELETE FROM passkeys WHERE id = $1 AND user_id = $2 AND user_role = $3',
      [req.params.id, req.user.sub, req.user.role],
    );
    if (rowCount === 0) return res.status(404).json({ message: 'Passkey not found' });
    return res.status(204).send();
  } catch (err) {
    return next(err);
  }
});

router.post('/register/options', authenticate, async (req, res, next) => {
  try {
    const { rows: existing } = await db.query(
      'SELECT credential_id, transports FROM passkeys WHERE user_id = $1 AND user_role = $2',
      [req.user.sub, req.user.role],
    );
    const options = await generateRegistrationOptions({
      rpName: env.webauthn.rpName,
      rpID: env.webauthn.rpId,
      userID: Buffer.from(`${req.user.role}:${req.user.sub}`),
      userName: req.user.email,
      attestationType: 'none',
      excludeCredentials: existing.map((p) => ({ id: p.credential_id, transports: p.transports || undefined })),
      authenticatorSelection: { residentKey: 'required', userVerification: 'required' },
    });
    const challengeId = await saveChallenge('register', options.challenge, req.user);
    return res.json({ challengeId, options });
  } catch (err) {
    return next(err);
  }
});

router.post('/register/verify', authenticate, async (req, res, next) => {
  const { challengeId, response, name } = req.body;
  if (!challengeId || !response) {
    return res.status(400).json({ message: 'challengeId and response are required' });
  }

  try {
    const challenge = await takeChallenge(challengeId, 'register');
    if (!challenge || challenge.user_id !== req.user.sub || challenge.user_role !== req.user.role) {
      return res.status(400).json({ message: 'Passkey setup expired — please try again' });
    }

    let verification;
    try {
      verification = await verifyRegistrationResponse({
        response,
        expectedChallenge: challenge.challenge,
        expectedOrigin: env.webauthn.origin,
        expectedRPID: env.webauthn.rpId,
        requireUserVerification: true,
      });
    } catch (err) {
      return res.status(400).json({ message: `Passkey could not be verified: ${err.message}` });
    }
    if (!verification.verified) return res.status(400).json({ message: 'Passkey could not be verified' });

    const { credential } = verification.registrationInfo;
    const { rows } = await db.query(
      `INSERT INTO passkeys (user_id, user_role, credential_id, public_key, counter, transports, name)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, name, created_at AS "createdAt", last_used_at AS "lastUsedAt"`,
      [
        req.user.sub,
        req.user.role,
        credential.id,
        Buffer.from(credential.publicKey),
        credential.counter,
        credential.transports || null,
        String(name || '').trim().slice(0, 60) || 'Passkey',
      ],
    );
    return res.status(201).json(rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ message: 'This passkey is already registered' });
    return next(err);
  }
});

// Discoverable-credential login: the browser offers whichever passkeys it holds
// for this site, so no email is needed first.
router.post('/login/options', passkeyLimiter, async (req, res, next) => {
  try {
    const options = await generateAuthenticationOptions({
      rpID: env.webauthn.rpId,
      userVerification: 'required',
    });
    const challengeId = await saveChallenge('login', options.challenge);
    return res.json({ challengeId, options });
  } catch (err) {
    return next(err);
  }
});

router.post('/login/verify', passkeyLimiter, async (req, res, next) => {
  const { challengeId, response } = req.body;
  if (!challengeId || !response?.id) {
    return res.status(400).json({ message: 'challengeId and response are required' });
  }

  try {
    const challenge = await takeChallenge(challengeId, 'login');
    if (!challenge) return res.status(401).json({ message: 'Passkey sign-in expired — please try again' });

    const { rows } = await db.query('SELECT * FROM passkeys WHERE credential_id = $1', [response.id]);
    const passkey = rows[0];
    // A passkey we never registered (or one removed with its account) has no
    // approved account behind it.
    if (!passkey) return res.status(403).json(NOT_APPROVED);

    let verification;
    try {
      verification = await verifyAuthenticationResponse({
        response,
        expectedChallenge: challenge.challenge,
        expectedOrigin: env.webauthn.origin,
        expectedRPID: env.webauthn.rpId,
        requireUserVerification: true,
        credential: {
          id: passkey.credential_id,
          publicKey: new Uint8Array(passkey.public_key),
          counter: Number(passkey.counter),
          transports: passkey.transports || undefined,
        },
      });
    } catch {
      return res.status(401).json({ message: 'Passkey sign-in failed' });
    }
    if (!verification.verified) return res.status(401).json({ message: 'Passkey sign-in failed' });

    const user = await findAccountById(passkey.user_id, passkey.user_role);
    if (!user) return res.status(403).json(NOT_APPROVED);
    if (user.suspended_at) return res.status(403).json(SUSPENDED);

    await db.query('UPDATE passkeys SET counter = $1, last_used_at = now() WHERE id = $2', [
      verification.authenticationInfo.newCounter,
      passkey.id,
    ]);
    return res.json(sessionResponse(user));
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
