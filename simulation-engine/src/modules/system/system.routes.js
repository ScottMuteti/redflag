// Platform administration: the RedFlag operator onboards and suspends
// organisations, sees platform-wide numbers and curates the global template
// library. Never exposes an organisation's individual employees or results.
const express = require('express');
const crypto = require('crypto');
const bcrypt = require('bcrypt');
const db = require('../../config/db');
const { authenticate, authorize } = require('../../middleware/auth');
const { installStarterModules } = require('../training/training.routes');
const { sendInviteEmail, sendAccessDeclinedEmail } = require('../../integrations/mail/mailer');
const { createPasswordLink, INVITE_TTL_MS } = require('../auth/passwordReset.routes');
const { SALT_ROUNDS } = require('../auth/session');

const router = express.Router();
router.use(authenticate, authorize('system_admin'));

const DIFFICULTIES = ['easy', 'medium', 'hard'];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const ORG_COLUMNS = `
  o.id, o.name, o.industry, o.county, o.created_at AS "createdAt", o.suspended_at AS "suspendedAt",
  (SELECT count(*)::int FROM admin_users a WHERE a.organization_id = o.id) AS "adminCount",
  (SELECT count(*)::int FROM employees e WHERE e.organization_id = o.id) AS "employeeCount",
  (SELECT count(*)::int FROM simulation_campaigns c WHERE c.organization_id = o.id) AS "campaignCount",
  (SELECT max(c.launched_at) FROM simulation_campaigns c WHERE c.organization_id = o.id) AS "lastLaunchAt",
  (SELECT avg((a.clicked_at IS NOT NULL)::int)::float FROM simulation_attempts a
     JOIN simulation_campaigns c ON c.id = a.campaign_id
     WHERE c.organization_id = o.id AND a.sent_at IS NOT NULL) AS "clickRate"
`;

const TEMPLATE_COLUMNS = `
  id, type, key, name, subject, body, category, difficulty_level AS "difficultyLevel"
`;

const randomPasswordHash = () => bcrypt.hash(crypto.randomBytes(32).toString('hex'), SALT_ROUNDS);

// Creates an admin with an unusable password and emails a set-password link.
async function inviteAdmin(client, organizationId, organizationName, fullName, email) {
  const { rows } = await client.query(
    `INSERT INTO admin_users (organization_id, full_name, email, password_hash)
     VALUES ($1, $2, $3, $4)
     RETURNING id, full_name AS "fullName", email, role, created_at AS "createdAt"`,
    [organizationId, fullName, email, await randomPasswordHash()],
  );
  const admin = rows[0];
  const link = await createPasswordLink({ id: admin.id, role: 'admin' }, INVITE_TTL_MS, client);
  return { admin, send: () => sendInviteEmail(email, organizationName, link) };
}

router.get('/organizations', async (req, res, next) => {
  try {
    const { rows } = await db.query(`SELECT ${ORG_COLUMNS} FROM organizations o ORDER BY o.name`);
    return res.json(rows);
  } catch (err) {
    return next(err);
  }
});

router.get('/organizations/:id', async (req, res, next) => {
  if (!/^\d+$/.test(req.params.id)) return res.status(404).json({ message: 'Organisation not found' });
  try {
    const { rows } = await db.query(`SELECT ${ORG_COLUMNS} FROM organizations o WHERE o.id = $1`, [
      req.params.id,
    ]);
    if (rows.length === 0) return res.status(404).json({ message: 'Organisation not found' });
    const { rows: admins } = await db.query(
      `SELECT id, full_name AS "fullName", email, created_at AS "createdAt"
       FROM admin_users WHERE organization_id = $1 ORDER BY created_at`,
      [req.params.id],
    );
    return res.json({ ...rows[0], admins });
  } catch (err) {
    return next(err);
  }
});

const onboardingError = (body) =>
  !body.name?.trim() || !body.adminFullName?.trim() || !EMAIL_RE.test(body.adminEmail || '')
    ? 'name, adminFullName and a valid adminEmail are required'
    : null;

// Creates the organisation, its first admin and starter training inside
// `client`'s open transaction. The caller commits, then calls invite.send().
async function onboard(client, { name, industry, county, adminFullName, adminEmail }) {
  const { rows } = await client.query(
    'INSERT INTO organizations (name, industry, county) VALUES ($1, $2, $3) RETURNING id, name',
    [name.trim(), industry || null, county || null],
  );
  const organization = rows[0];
  const invite = await inviteAdmin(client, organization.id, organization.name, adminFullName.trim(), adminEmail.trim());
  await installStarterModules(organization.id, client);
  return { organization, invite };
}

function conflictMessage(err) {
  if (err.code !== '23505') return null;
  return err.constraint === 'organizations_name_key'
    ? 'An organisation with that name already exists'
    : 'That admin email already has an account';
}

// Onboards an organisation and invites its first admin by email.
router.post('/organizations', async (req, res, next) => {
  const error = onboardingError(req.body);
  if (error) return res.status(400).json({ message: error });

  const client = await db.getClient();
  let result;
  try {
    await client.query('BEGIN');
    result = await onboard(client, req.body);
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    const conflict = conflictMessage(err);
    if (conflict) return res.status(409).json({ message: conflict });
    return next(err);
  } finally {
    client.release();
  }

  await result.invite.send();
  return res.status(201).json({ ...result.organization, admin: result.invite.admin });
});

const REQUEST_COLUMNS = `
  id, organization_name AS "organizationName", industry, county, contact_name AS "contactName",
  contact_email AS "contactEmail", phone_number AS "phoneNumber", employee_count AS "employeeCount",
  message, status, organization_id AS "organizationId", reviewed_at AS "reviewedAt", created_at AS "createdAt"
`;

router.get('/access-requests', async (req, res, next) => {
  const { status } = req.query;
  if (status && !['pending', 'approved', 'declined'].includes(status)) {
    return res.status(400).json({ message: 'status must be pending, approved or declined' });
  }
  try {
    const { rows } = await db.query(
      `SELECT ${REQUEST_COLUMNS} FROM access_requests
       WHERE $1::text IS NULL OR status = $1
       ORDER BY status = 'pending' DESC, created_at DESC
       LIMIT 200`,
      [status || null],
    );
    return res.json(rows);
  } catch (err) {
    return next(err);
  }
});

// Approving onboards the organisation from the request (the reviewer may
// correct any field first) and invites the contact as its admin.
router.post('/access-requests/:id/approve', async (req, res, next) => {
  if (!/^\d+$/.test(req.params.id)) return res.status(404).json({ message: 'Request not found' });

  const client = await db.getClient();
  let result;
  try {
    await client.query('BEGIN');
    const { rows } = await client.query(
      "SELECT * FROM access_requests WHERE id = $1 AND status = 'pending' FOR UPDATE",
      [req.params.id],
    );
    if (rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'No pending request with that id' });
    }
    const request = rows[0];
    const details = {
      name: req.body.name ?? request.organization_name,
      industry: req.body.industry ?? request.industry,
      county: req.body.county ?? request.county,
      adminFullName: req.body.adminFullName ?? request.contact_name,
      adminEmail: req.body.adminEmail ?? request.contact_email,
    };
    const error = onboardingError(details);
    if (error) {
      await client.query('ROLLBACK');
      return res.status(400).json({ message: error });
    }
    result = await onboard(client, details);
    await client.query(
      `UPDATE access_requests SET status = 'approved', organization_id = $2, reviewed_by = $3, reviewed_at = now()
       WHERE id = $1`,
      [request.id, result.organization.id, req.user.sub],
    );
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    const conflict = conflictMessage(err);
    if (conflict) return res.status(409).json({ message: conflict });
    return next(err);
  } finally {
    client.release();
  }

  await result.invite.send();
  return res.status(201).json({ ...result.organization, admin: result.invite.admin });
});

router.post('/access-requests/:id/decline', async (req, res, next) => {
  if (!/^\d+$/.test(req.params.id)) return res.status(404).json({ message: 'Request not found' });
  try {
    const { rows } = await db.query(
      `UPDATE access_requests SET status = 'declined', reviewed_by = $2, reviewed_at = now()
       WHERE id = $1 AND status = 'pending'
       RETURNING contact_email, organization_name`,
      [req.params.id, req.user.sub],
    );
    if (rows.length === 0) return res.status(404).json({ message: 'No pending request with that id' });
    if (req.body.notify !== false) {
      await sendAccessDeclinedEmail(rows[0].contact_email, rows[0].organization_name);
    }
    return res.status(204).send();
  } catch (err) {
    return next(err);
  }
});

// Adds another admin (manager) to an organisation.
router.post('/organizations/:id/admins', async (req, res, next) => {
  const { fullName, email } = req.body;
  if (!fullName?.trim() || !EMAIL_RE.test(email || '')) {
    return res.status(400).json({ message: 'fullName and a valid email are required' });
  }
  if (!/^\d+$/.test(req.params.id)) return res.status(404).json({ message: 'Organisation not found' });

  try {
    const { rows } = await db.query('SELECT id, name FROM organizations WHERE id = $1', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ message: 'Organisation not found' });
    const invite = await inviteAdmin(db, rows[0].id, rows[0].name, fullName.trim(), email.trim());
    await invite.send();
    return res.status(201).json(invite.admin);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ message: 'email is already taken' });
    return next(err);
  }
});

async function setSuspended(req, res, next, suspended) {
  if (!/^\d+$/.test(req.params.id)) return res.status(404).json({ message: 'Organisation not found' });
  try {
    const { rows } = await db.query(
      `UPDATE organizations SET suspended_at = ${suspended ? 'COALESCE(suspended_at, now())' : 'NULL'}
       WHERE id = $1 RETURNING id, suspended_at AS "suspendedAt"`,
      [req.params.id],
    );
    if (rows.length === 0) return res.status(404).json({ message: 'Organisation not found' });
    return res.json(rows[0]);
  } catch (err) {
    return next(err);
  }
}

router.post('/organizations/:id/suspend', (req, res, next) => setSuspended(req, res, next, true));
router.post('/organizations/:id/reactivate', (req, res, next) => setSuspended(req, res, next, false));

// Platform-wide totals and a monthly trend. Aggregates only.
router.get('/analytics', async (req, res, next) => {
  try {
    const { rows: totals } = await db.query(`
      SELECT
        (SELECT count(*)::int FROM organizations) AS organizations,
        (SELECT count(*)::int FROM organizations WHERE suspended_at IS NOT NULL) AS "suspendedOrganizations",
        (SELECT count(*)::int FROM employees) AS employees,
        (SELECT count(*)::int FROM simulation_campaigns) AS campaigns,
        (SELECT count(*)::int FROM simulation_campaigns WHERE status = 'running') AS "runningCampaigns",
        (SELECT count(*)::int FROM simulation_attempts WHERE sent_at IS NOT NULL) AS "messagesSent",
        (SELECT avg((clicked_at IS NOT NULL)::int)::float FROM simulation_attempts WHERE sent_at IS NOT NULL) AS "clickRate",
        (SELECT avg((reported_at IS NOT NULL)::int)::float FROM simulation_attempts WHERE sent_at IS NOT NULL) AS "reportRate",
        (SELECT avg((status = 'completed')::int)::float FROM training_assignments) AS "trainingCompletion"
    `);
    const { rows: byChannel } = await db.query(`
      SELECT c.type AS channel, count(a.*)::int AS sent,
        avg((a.clicked_at IS NOT NULL)::int)::float AS "clickRate"
      FROM simulation_attempts a JOIN simulation_campaigns c ON c.id = a.campaign_id
      WHERE a.sent_at IS NOT NULL
      GROUP BY c.type ORDER BY c.type
    `);
    const { rows: trend } = await db.query(`
      SELECT to_char(date_trunc('month', a.sent_at), 'YYYY-MM') AS month,
        count(*)::int AS sent,
        avg((a.clicked_at IS NOT NULL)::int)::float AS "clickRate",
        avg((a.reported_at IS NOT NULL)::int)::float AS "reportRate"
      FROM simulation_attempts a
      WHERE a.sent_at >= date_trunc('month', now()) - interval '11 months'
      GROUP BY 1 ORDER BY 1
    `);
    const { rows: industries } = await db.query(`
      SELECT COALESCE(NULLIF(o.industry, ''), 'Unspecified') AS industry,
        count(DISTINCT o.id)::int AS organizations,
        avg((a.clicked_at IS NOT NULL)::int)::float AS "clickRate"
      FROM organizations o
      LEFT JOIN simulation_campaigns c ON c.organization_id = o.id
      LEFT JOIN simulation_attempts a ON a.campaign_id = c.id AND a.sent_at IS NOT NULL
      GROUP BY 1 ORDER BY 2 DESC, 1
    `);
    return res.json({ totals: totals[0], byChannel, trend, industries });
  } catch (err) {
    return next(err);
  }
});

// Global template library (organization_id IS NULL), shared by every organisation.
router.get('/templates', async (req, res, next) => {
  try {
    const { rows } = await db.query(
      `SELECT ${TEMPLATE_COLUMNS},
         (SELECT count(*)::int FROM campaign_templates o
           WHERE o.key = t.key AND o.organization_id IS NOT NULL) AS "customisedBy"
       FROM campaign_templates t WHERE organization_id IS NULL ORDER BY type, name`,
    );
    return res.json(rows);
  } catch (err) {
    return next(err);
  }
});

function validateTemplate(body, { partial = false } = {}) {
  const { type, name, subject, body: text, difficultyLevel } = body;
  if (!partial && (!type || !name || !text)) return 'type, name and body are required';
  if (partial && !text) return 'body is required';
  if (type && !['email', 'sms'].includes(type)) return 'type must be email or sms';
  if (type === 'email' && !subject) return 'subject is required for email templates';
  if (difficultyLevel && !DIFFICULTIES.includes(difficultyLevel)) {
    return 'difficultyLevel must be easy, medium or hard';
  }
  return null;
}

router.post('/templates', async (req, res, next) => {
  const error = validateTemplate(req.body);
  if (error) return res.status(400).json({ message: error });
  const { type, name, subject, body, category, difficultyLevel } = req.body;
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60);

  try {
    const { rows } = await db.query(
      `INSERT INTO campaign_templates (organization_id, type, key, name, subject, body, category, difficulty_level)
       VALUES (NULL, $1, $2, $3, $4, $5, $6, $7)
       RETURNING ${TEMPLATE_COLUMNS}`,
      [
        type,
        `${slug || 'template'}-${crypto.randomBytes(3).toString('hex')}`,
        name,
        type === 'email' ? subject : null,
        body,
        category || null,
        difficultyLevel || 'medium',
      ],
    );
    return res.status(201).json(rows[0]);
  } catch (err) {
    return next(err);
  }
});

router.put('/templates/:key', async (req, res, next) => {
  const error = validateTemplate(req.body, { partial: true });
  if (error) return res.status(400).json({ message: error });
  const { name, subject, body, category, difficultyLevel } = req.body;

  try {
    const { rows } = await db.query(
      `UPDATE campaign_templates SET
         name = COALESCE($2, name),
         subject = CASE WHEN type = 'email' THEN COALESCE($3, subject) ELSE NULL END,
         body = $4,
         category = COALESCE($5, category),
         difficulty_level = COALESCE($6, difficulty_level)
       WHERE key = $1 AND organization_id IS NULL
       RETURNING ${TEMPLATE_COLUMNS}`,
      [req.params.key, name || null, subject || null, body, category || null, difficultyLevel || null],
    );
    if (rows.length === 0) return res.status(404).json({ message: 'Template not found' });
    return res.json(rows[0]);
  } catch (err) {
    return next(err);
  }
});

// Refused while a draft or scheduled campaign still depends on the template.
router.delete('/templates/:key', async (req, res, next) => {
  try {
    const { rows: inUse } = await db.query(
      `SELECT count(*)::int AS n FROM simulation_campaigns
       WHERE status IN ('draft', 'scheduled', 'launching')
         AND (template_key = $1 OR $1 = ANY(template_pool))
         AND NOT EXISTS (SELECT 1 FROM campaign_templates o
           WHERE o.key = $1 AND o.organization_id = simulation_campaigns.organization_id)`,
      [req.params.key],
    );
    if (inUse[0].n > 0) {
      return res
        .status(409)
        .json({ message: `${inUse[0].n} upcoming campaign(s) still use this template` });
    }
    const { rowCount } = await db.query(
      'DELETE FROM campaign_templates WHERE key = $1 AND organization_id IS NULL',
      [req.params.key],
    );
    if (rowCount === 0) return res.status(404).json({ message: 'Template not found' });
    return res.status(204).send();
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
