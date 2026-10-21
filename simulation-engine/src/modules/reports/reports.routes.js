const express = require('express');
const { authenticate, authorize } = require('../../middleware/auth');
const db = require('../../config/db');

const router = express.Router();
router.use(authenticate);

const CHANNELS = ['email', 'sms', 'call', 'other'];
const MATCH_WINDOW_DAYS = 14;

const REPORT_COLUMNS = `
  phishing_reports.id, phishing_reports.channel, phishing_reports.sender, phishing_reports.subject,
  phishing_reports.details, phishing_reports.created_at AS "createdAt",
  phishing_reports.attempt_id IS NOT NULL AS "matchedSimulation",
  simulation_campaigns.name AS "campaignName"
`;

const REPORT_JOINS = `
  LEFT JOIN simulation_attempts ON simulation_attempts.id = phishing_reports.attempt_id
  LEFT JOIN simulation_campaigns ON simulation_campaigns.id = simulation_attempts.campaign_id
`;

// Employee flags a suspicious message. If it lines up with a recent simulation sent to them
// on the same channel, that attempt is marked reported.
router.post('/', authorize('employee'), async (req, res, next) => {
  const { channel, sender, subject, details } = req.body;
  if (!CHANNELS.includes(channel)) {
    return res.status(400).json({ message: 'channel must be email, sms, call or other' });
  }
  if (!sender && !subject && !details) {
    return res.status(400).json({ message: 'Describe the message: sender, subject or details' });
  }

  try {
    let attempt = null;
    if (channel === 'email' || channel === 'sms') {
      const { rows } = await db.query(
        `SELECT simulation_attempts.id, simulation_campaigns.name AS "campaignName"
         FROM simulation_attempts
         JOIN simulation_campaigns ON simulation_campaigns.id = simulation_attempts.campaign_id
         WHERE simulation_attempts.employee_id = $1 AND simulation_campaigns.type = $2
           AND simulation_attempts.reported_at IS NULL
           AND COALESCE(simulation_attempts.sent_at, simulation_attempts.created_at)
             >= now() - ($3 || ' days')::interval
         ORDER BY simulation_attempts.created_at DESC LIMIT 1`,
        [req.user.sub, channel, String(MATCH_WINDOW_DAYS)],
      );
      attempt = rows[0] || null;
      if (attempt) {
        await db.query('UPDATE simulation_attempts SET reported_at = now() WHERE id = $1', [
          attempt.id,
        ]);
      }
    }

    const { rows } = await db.query(
      `INSERT INTO phishing_reports
         (organization_id, employee_id, attempt_id, channel, sender, subject, details)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, channel, sender, subject, details, created_at AS "createdAt"`,
      [
        req.user.organizationId,
        req.user.sub,
        attempt?.id || null,
        channel,
        sender || null,
        subject || null,
        details || null,
      ],
    );
    return res.status(201).json({
      ...rows[0],
      matchedSimulation: Boolean(attempt),
      campaignName: attempt?.campaignName || null,
    });
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

module.exports = router;
