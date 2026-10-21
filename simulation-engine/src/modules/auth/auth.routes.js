const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const db = require('../../config/db');
const env = require('../../config/env');
const { authenticate, authorize } = require('../../middleware/auth');

const router = express.Router();
const SALT_ROUNDS = 10;

function signToken(user) {
  return jwt.sign(
    { sub: user.id, role: user.role, organizationId: user.organization_id, email: user.email },
    env.jwtSecret,
    { expiresIn: '8h' },
  );
}

router.post('/register', async (req, res, next) => {
  const { organizationName, organizationIndustry, organizationCounty, adminFullName, adminEmail, adminPassword } =
    req.body;

  if (!organizationName || !adminFullName || !adminEmail || !adminPassword) {
    return res.status(400).json({ message: 'organizationName, adminFullName, adminEmail and adminPassword are required' });
  }

  const client = await db.getClient();
  try {
    await client.query('BEGIN');

    const orgResult = await client.query(
      'INSERT INTO organizations (name, industry, county) VALUES ($1, $2, $3) RETURNING id',
      [organizationName, organizationIndustry || null, organizationCounty || null],
    );
    const organizationId = orgResult.rows[0].id;

    const passwordHash = await bcrypt.hash(adminPassword, SALT_ROUNDS);
    const adminResult = await client.query(
      `INSERT INTO admin_users (organization_id, full_name, email, password_hash)
       VALUES ($1, $2, $3, $4)
       RETURNING id, organization_id, full_name, email, role`,
      [organizationId, adminFullName, adminEmail, passwordHash],
    );

    await client.query('COMMIT');

    const admin = adminResult.rows[0];
    const token = signToken(admin);
    return res.status(201).json({
      token,
      user: { id: admin.id, fullName: admin.full_name, email: admin.email, role: admin.role, organizationId: admin.organization_id },
    });
  } catch (err) {
    await client.query('ROLLBACK');
    if (err.code === '23505') {
      const field = err.constraint === 'organizations_name_key' ? 'organizationName' : 'adminEmail';
      return res.status(409).json({ message: `${field} is already taken` });
    }
    return next(err);
  } finally {
    client.release();
  }
});

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many login attempts, please try again later' },
});

router.post('/login', loginLimiter, async (req, res, next) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ message: 'email and password are required' });
  }

  try {
    let { rows } = await db.query(
      'SELECT id, organization_id, full_name, email, password_hash, role FROM admin_users WHERE email = $1',
      [email],
    );
    if (rows.length === 0) {
      ({ rows } = await db.query(
        'SELECT id, organization_id, full_name, email, password_hash, role FROM employees WHERE email = $1',
        [email],
      ));
    }

    if (rows.length === 0) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const user = rows[0];
    const matches = await bcrypt.compare(password, user.password_hash);
    if (!matches) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = signToken(user);
    return res.json({
      token,
      user: { id: user.id, fullName: user.full_name, email: user.email, role: user.role, organizationId: user.organization_id },
    });
  } catch (err) {
    return next(err);
  }
});

const tableFor = (role) => (role === 'admin' ? 'admin_users' : 'employees');

router.get('/me', authenticate, async (req, res, next) => {
  try {
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

  try {
    const { rows } = await db.query(
      `UPDATE ${tableFor(req.user.role)} SET full_name = $1 WHERE id = $2
       RETURNING id, full_name AS "fullName", email, role, organization_id AS "organizationId"`,
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
