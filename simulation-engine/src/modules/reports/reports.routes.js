const express = require('express');
const crypto = require('crypto');
const { authenticate, authorize } = require('../../middleware/auth');
const db = require('../../config/db');
const env = require('../../config/env');
const { recordEvent } = require('../campaigns/campaigns.routes');

const router = express.Router();

const CHANNELS = ['email', 'sms', 'call', 'other'];
const STATUSES = ['new', 'reviewed', 'resolved'];
const MATCH_WINDOW_DAYS = 14;

const REPORT_COLUMNS = `
  phishing_reports.id, phishing_reports.channel, phishing_reports.sender, phishing_reports.subject,
  phishing_reports.details, phishing_reports.status, phishing_reports.created_at AS "createdAt",
  phishing_reports.reviewed_at AS "reviewedAt",
  phishing_reports.attempt_id IS NOT NULL AS "matchedSimulation",
  simulation_campaigns.name AS "campaignName"
`;

const REPORT_JOINS = `
  LEFT JOIN simulation_attempts ON simulation_attempts.id = phishing_reports.attempt_id
  LEFT JOIN simulation_campaigns ON simulation_campaigns.id = simulation_attempts.campaign_id
`;

// Finds a recent, not-yet-reported simulation sent to this employee on the same
// channel. Returns the attempt (with its campaign) or null.
async function findMatchingAttempt(employeeId, channel) {
  if (channel !== 'email' && channel !== 'sms') return null;
  const { rows } = await db.query(
    `SELECT simulation_attempts.id, simulation_campaigns.id AS "campaignId",
       simulation_campaigns.name AS "campaignName"
     FROM simulation_attempts
     JOIN simulation_campaigns ON simulation_campaigns.id = simulation_attempts.campaign_id
     WHERE simulation_attempts.employee_id = $1 AND simulation_campaigns.type = $2
       AND simulation_attempts.reported_at IS NULL
       AND COALESCE(simulation_attempts.sent_at, simulation_attempts.created_at)
         >= now() - ($3 || ' days')::interval
     ORDER BY simulation_attempts.created_at DESC LIMIT 1`,
    [employeeId, channel, String(MATCH_WINDOW_DAYS)],
  );
  return rows[0] || null;
}

// Shared report-creation path used by the in-portal form and the inbound email
// webhook. If the message matches a simulation, the match is recorded through
// recordEvent — the same path as a Gophish "Email Reported" event — so the
// employee is rescored and the live dashboard updates, idempotently.
async function createReport({ organizationId, employeeId, channel, sender, subject, details }) {
  const attempt = await findMatchingAttempt(employeeId, channel);
  if (attempt) {
    await recordEvent({
      campaignId: attempt.campaignId,
      employeeId,
      column: 'reported_at',
      at: new Date(),
    });
  }

  const { rows } = await db.query(
    `INSERT INTO phishing_reports
       (organization_id, employee_id, attempt_id, channel, sender, subject, details)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING id, channel, sender, subject, details, status, created_at AS "createdAt"`,
    [organizationId, employeeId, attempt?.id || null, channel, sender || null, subject || null, details || null],
  );
  return {
    ...rows[0],
    matchedSimulation: Boolean(attempt),
    campaignName: attempt?.campaignName || null,
  };
}

// --- Dedicated reporting inbox: a mail forwarder POSTs a forwarded message here.
// Defined BEFORE the auth gate; it is authenticated by a shared secret instead
// of a JWT, since it is called by mail infrastructure, not a signed-in user.
function verifyInboundSecret(req) {
  const provided = req.headers['x-report-secret'];
  const expected = env.reporting.inboundSecret;
  if (!provided || !expected) return false;
  try {
    return crypto.timingSafeEqual(Buffer.from(String(provided)), Buffer.from(expected));
  } catch {
    return false;
  }
}

// Resolves the reporting employee from a forwarded email address or, for an SMS
// forwarded to the report number, from their phone number (matched on the last
// 9 digits so local 07…/international +2547… forms both work).
async function resolveReporter({ reporterEmail, reporterPhone }) {
  if (reporterEmail) {
    const { rows } = await db.query(
      'SELECT id, organization_id AS "organizationId" FROM employees WHERE lower(email) = lower($1) LIMIT 1',
      [String(reporterEmail)],
    );
    return rows[0] || null;
  }
  const digits = String(reporterPhone || '').replace(/\D/g, '');
  if (digits.length < 9) return null;
  const { rows } = await db.query(
    `SELECT id, organization_id AS "organizationId" FROM employees
     WHERE regexp_replace(phone_number, '\\D', '', 'g') LIKE '%' || $1 LIMIT 1`,
    [digits.slice(-9)],
  );
  return rows[0] || null;
}

router.post('/inbound', async (req, res, next) => {
  if (!env.reporting.inboundSecret) {
    return res.status(503).json({ message: 'Inbound reporting is not configured' });
  }
  if (!verifyInboundSecret(req)) {
    return res.status(401).json({ message: 'Invalid report secret' });
  }

  // A mail forwarder or SMS provider sends the reporter (the employee who
  // forwarded it) and the suspicious message's own from/subject/body.
  const { reporterEmail, reporterPhone, from, subject, text, channel } = req.body || {};
  if (!reporterEmail && !reporterPhone) {
    return res.status(400).json({ message: 'reporterEmail or reporterPhone is required' });
  }

  try {
    const employee = await resolveReporter({ reporterEmail, reporterPhone });
    // Unknown sender: accept-and-ignore so the forwarder/provider does not retry.
    if (!employee) {
      return res.status(200).json({ status: 'ignored', message: 'Unknown reporter' });
    }

    // Default to SMS when it arrived by phone, otherwise email.
    const resolvedChannel = CHANNELS.includes(channel)
      ? channel
      : reporterPhone && !reporterEmail
        ? 'sms'
        : 'email';

    const report = await createReport({
      organizationId: employee.organizationId,
      employeeId: employee.id,
      channel: resolvedChannel,
      sender: from,
      subject,
      details: text,
    });
    return res.status(201).json({ status: 'received', matchedSimulation: report.matchedSimulation });
  } catch (err) {
    return next(err);
  }
});

// Everything below requires a signed-in user.
router.use(authenticate);

// The dedicated reporting address/number to show staff (null when unset).
router.get('/info', (req, res) => {
  res.json({
    reportEmail: env.reporting.inbox || null,
    reportSms: env.reporting.smsNumber || null,
  });
});

// Employee flags a suspicious message from the in-portal form.
router.post('/', authorize('employee'), async (req, res, next) => {
  const { channel, sender, subject, details } = req.body;
  if (!CHANNELS.includes(channel)) {
    return res.status(400).json({ message: 'channel must be email, sms, call or other' });
  }
  if (!sender && !subject && !details) {
    return res.status(400).json({ message: 'Describe the message: sender, subject or details' });
  }

  try {
    const report = await createReport({
      organizationId: req.user.organizationId,
      employeeId: req.user.sub,
      channel,
      sender,
      subject,
      details,
    });
    return res.status(201).json(report);
  } catch (err) {
    return next(err);
  }
});

router.get('/', async (req, res, next) => {
  try {
    if (req.user.role === 'employee') {
      const { rows } = await db.query(
        `SELECT ${REPORT_COLUMNS} FROM phishing_reports ${REPORT_JOINS}
         WHERE phishing_reports.employee_id = $1
         ORDER BY phishing_reports.created_at DESC`,
        [req.user.sub],
      );
      return res.json(rows);
    }

    const { rows } = await db.query(
      `SELECT ${REPORT_COLUMNS}, employees.full_name AS "employeeName"
       FROM phishing_reports ${REPORT_JOINS}
       JOIN employees ON employees.id = phishing_reports.employee_id
       WHERE phishing_reports.organization_id = $1
       ORDER BY phishing_reports.created_at DESC`,
      [req.user.organizationId],
    );
    return res.json(rows);
  } catch (err) {
    return next(err);
  }
});

// Admin triage: move a report through new -> reviewed -> resolved.
router.patch('/:id', authorize('admin'), async (req, res, next) => {
  const { status } = req.body;
  if (!STATUSES.includes(status)) {
    return res.status(400).json({ message: 'status must be new, reviewed or resolved' });
  }
  try {
    const { rows } = await db.query(
      `UPDATE phishing_reports
       SET status = $1::text,
         reviewed_at = CASE WHEN $1::text = 'new' THEN NULL ELSE now() END,
         reviewed_by = CASE WHEN $1::text = 'new' THEN NULL ELSE $2::int END
       WHERE id = $3 AND organization_id = $4
       RETURNING id, status, reviewed_at AS "reviewedAt"`,
      [status, req.user.sub, req.params.id, req.user.organizationId],
    );
    if (rows.length === 0) return res.status(404).json({ message: 'Report not found' });
    return res.json(rows[0]);
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
