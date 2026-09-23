const express = require('express');
const crypto = require('crypto');
const { authenticate, authorize } = require('../../middleware/auth');
const db = require('../../config/db');
const env = require('../../config/env');
const gophishClient = require('../../integrations/gophish/gophishClient');
const smsClient = require('../../integrations/africasTalking/smsClient');

const router = express.Router();
const requireAdmin = [authenticate, authorize('admin')];

const CAMPAIGN_COLUMNS = `
  id, name, type, template_key AS "templateKey", difficulty_level AS "difficultyLevel",
  status, gophish_campaign_id AS "gophishCampaignId", scheduled_at AS "scheduledAt",
  created_at AS "createdAt"
`;

const EVENT_COLUMN = {
  'Email Sent': 'sent_at',
  'Email Opened': 'opened_at',
  'Clicked Link': 'clicked_at',
  'Submitted Data': 'submitted_credentials_at',
};

async function getTargetEmployees(organizationId, departmentId) {
  const params = [organizationId];
  let filter = '';
  if (departmentId) {
    params.push(departmentId);
    filter = 'AND department_id = $2';
  }
  const { rows } = await db.query(
    `SELECT id, full_name AS "fullName", email, phone_number AS "phoneNumber", job_title AS "jobTitle"
     FROM employees WHERE organization_id = $1 ${filter}`,
    params,
  );
  return rows;
}

function verifyGophishSignature(req) {
  const signatureHeader = req.headers['x-gophish-signature'];
  if (!signatureHeader || !env.gophish.webhookSecret) return false;
  const expected = `sha256=${crypto
    .createHmac('sha256', env.gophish.webhookSecret)
    .update(req.rawBody || Buffer.from(''))
    .digest('hex')}`;
  try {
    return crypto.timingSafeEqual(Buffer.from(signatureHeader), Buffer.from(expected));
  } catch {
    return false;
  }
}

router.get('/templates', ...requireAdmin, async (req, res, next) => {
  try {
    const { rows } = await db.query(
      `SELECT id, type, key, name, subject, category
       FROM campaign_templates
       WHERE organization_id IS NULL OR organization_id = $1
       ORDER BY type, name`,
      [req.user.organizationId],
    );
    return res.json(rows);
  } catch (err) {
    return next(err);
  }
});

// Public: SMS click-tracking link embedded in smishing messages.
router.get('/track/:token', async (req, res, next) => {
  try {
    const { rowCount } = await db.query(
      'UPDATE simulation_attempts SET clicked_at = COALESCE(clicked_at, now()) WHERE tracking_token = $1',
      [req.params.token],
    );
    if (rowCount === 0) return res.status(404).send('Not found');
    return res.send(`<!doctype html>
<html>
  <head><title>Simulated Phishing Alert</title></head>
  <body style="font-family: sans-serif; max-width: 480px; margin: 4rem auto; text-align: center;">
    <h1>You just experienced a simulated smishing attempt</h1>
    <p>This message was part of a RedFlag security awareness campaign run by your organization.
       No real harm was done, but a real attacker could have used this link to steal your credentials.</p>
    <p>Check your RedFlag employee portal for follow-up training.</p>
  </body>
</html>`);
  } catch (err) {
    return next(err);
  }
});

// Public: Gophish webhook, HMAC-verified via GOPHISH_WEBHOOK_SECRET.
router.post('/webhook/gophish', async (req, res, next) => {
  if (!verifyGophishSignature(req)) {
    return res.status(401).json({ message: 'Invalid signature' });
  }

  try {
    const { campaign_id: gophishCampaignId, email, message } = req.body;
    const column = EVENT_COLUMN[message];
    if (!column) return res.status(200).json({ message: 'Ignored event' });

    const { rows: campaignRows } = await db.query(
      'SELECT id FROM simulation_campaigns WHERE gophish_campaign_id = $1',
      [gophishCampaignId],
    );
    if (campaignRows.length === 0) return res.status(200).json({ message: 'Unknown campaign' });

    const { rows: employeeRows } = await db.query('SELECT id FROM employees WHERE email = $1', [email]);
    if (employeeRows.length === 0) return res.status(200).json({ message: 'Unknown employee' });

    await db.query(
      `UPDATE simulation_attempts SET ${column} = now() WHERE campaign_id = $1 AND employee_id = $2`,
      [campaignRows[0].id, employeeRows[0].id],
    );

    return res.status(200).json({ message: 'ok' });
  } catch (err) {
    return next(err);
  }
});

router.get('/', ...requireAdmin, async (req, res, next) => {
  try {
    const { rows } = await db.query(
      `SELECT ${CAMPAIGN_COLUMNS} FROM simulation_campaigns WHERE organization_id = $1 ORDER BY created_at DESC`,
      [req.user.organizationId],
    );
    return res.json(rows);
  } catch (err) {
    return next(err);
  }
});

router.post('/', ...requireAdmin, async (req, res, next) => {
  const { name, type, templateKey, difficultyLevel } = req.body;
  if (!name || !type || !templateKey) {
    return res.status(400).json({ message: 'name, type and templateKey are required' });
  }
  if (!['email', 'sms'].includes(type)) {
    return res.status(400).json({ message: 'type must be email or sms' });
  }

  try {
    const { rows } = await db.query(
      `INSERT INTO simulation_campaigns (organization_id, created_by, name, type, template_key, difficulty_level)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING ${CAMPAIGN_COLUMNS}`,
      [req.user.organizationId, req.user.sub, name, type, templateKey, difficultyLevel || 'medium'],
    );
    return res.status(201).json(rows[0]);
  } catch (err) {
    return next(err);
  }
});

router.get('/:id', ...requireAdmin, async (req, res, next) => {
  try {
    const { rows } = await db.query(
      `SELECT ${CAMPAIGN_COLUMNS} FROM simulation_campaigns WHERE id = $1 AND organization_id = $2`,
      [req.params.id, req.user.organizationId],
    );
    if (rows.length === 0) return res.status(404).json({ message: 'Campaign not found' });
    return res.json(rows[0]);
  } catch (err) {
    return next(err);
  }
});

router.post('/:id/launch', ...requireAdmin, async (req, res, next) => {
  try {
    const { rows: campaignRows } = await db.query(
      `SELECT ${CAMPAIGN_COLUMNS} FROM simulation_campaigns WHERE id = $1 AND organization_id = $2`,
      [req.params.id, req.user.organizationId],
    );
    if (campaignRows.length === 0) return res.status(404).json({ message: 'Campaign not found' });
    const campaign = campaignRows[0];
    if (campaign.status !== 'draft') {
      return res.status(409).json({ message: `Campaign is already ${campaign.status}` });
    }

    const { rows: templateRows } = await db.query(
      `SELECT type, subject, body FROM campaign_templates
       WHERE key = $1 AND (organization_id = $2 OR organization_id IS NULL)
       ORDER BY organization_id NULLS LAST LIMIT 1`,
      [campaign.templateKey, req.user.organizationId],
    );
    if (templateRows.length === 0) return res.status(400).json({ message: 'Unknown templateKey' });
    const template = templateRows[0];

    const employees = await getTargetEmployees(req.user.organizationId, req.body.departmentId);
    if (employees.length === 0) return res.status(400).json({ message: 'No employees to target' });

    if (campaign.type === 'email') {
      const group = await gophishClient.createGroup(`redflag-${campaign.id}`, employees);
      const gophishTemplate = await gophishClient.createTemplate(
        `redflag-${campaign.id}`,
        template.subject,
        template.body,
      );
      const gophishCampaign = await gophishClient.createCampaign({
        name: `redflag-${campaign.id}-${campaign.name}`,
        groupName: group.name,
        templateName: gophishTemplate.name,
        pageName: env.gophish.landingPage,
        url: env.gophish.phishUrl,
      });

      await db.query('UPDATE simulation_campaigns SET status = $1, gophish_campaign_id = $2 WHERE id = $3', [
        'running',
        gophishCampaign.id,
        campaign.id,
      ]);

      await Promise.all(
        employees.map((emp) =>
          db.query(
            `INSERT INTO simulation_attempts (campaign_id, employee_id) VALUES ($1, $2)
             ON CONFLICT (campaign_id, employee_id) DO NOTHING`,
            [campaign.id, emp.id],
          ),
        ),
      );
    } else {
      const targeted = employees.filter((emp) => emp.phoneNumber);
      if (targeted.length === 0) return res.status(400).json({ message: 'No employees with a phone number to target' });

      // sent_at is only set after smsClient.sendSms actually resolves — a failed
      // send (e.g. AT credentials not configured) must not leave an attempt
      // row that falsely claims the message went out.
      const outcomes = await Promise.allSettled(
        targeted.map(async (emp) => {
          const { rows } = await db.query(
            `INSERT INTO simulation_attempts (campaign_id, employee_id) VALUES ($1, $2)
             ON CONFLICT (campaign_id, employee_id) DO NOTHING
             RETURNING tracking_token AS "trackingToken"`,
            [campaign.id, emp.id],
          );
          const trackingToken =
            rows[0]?.trackingToken ||
            (
              await db.query(
                'SELECT tracking_token AS "trackingToken" FROM simulation_attempts WHERE campaign_id = $1 AND employee_id = $2',
                [campaign.id, emp.id],
              )
            ).rows[0].trackingToken;

          const trackingUrl = `${env.publicBackendUrl}/api/campaigns/track/${trackingToken}`;
          const message = template.body.replace('{{link}}', trackingUrl);
          await smsClient.sendSms(emp.phoneNumber, message);
          await db.query('UPDATE simulation_attempts SET sent_at = now() WHERE campaign_id = $1 AND employee_id = $2', [
            campaign.id,
            emp.id,
          ]);
        }),
      );

      const sentCount = outcomes.filter((o) => o.status === 'fulfilled').length;
      if (sentCount === 0) {
        const [firstFailure] = outcomes;
        return res.status(502).json({
          message: 'Failed to send any SMS messages',
          detail: firstFailure.reason?.message,
        });
      }

      await db.query('UPDATE simulation_campaigns SET status = $1 WHERE id = $2', ['running', campaign.id]);
      return res.json({ message: `Campaign launched (${sentCount}/${targeted.length} messages sent)` });
    }

    return res.json({ message: 'Campaign launched' });
  } catch (err) {
    return next(err);
  }
});

router.get('/:id/results', ...requireAdmin, async (req, res, next) => {
  try {
    const { rows: campaignRows } = await db.query(
      'SELECT id FROM simulation_campaigns WHERE id = $1 AND organization_id = $2',
      [req.params.id, req.user.organizationId],
    );
    if (campaignRows.length === 0) return res.status(404).json({ message: 'Campaign not found' });

    const { rows } = await db.query(
      `SELECT employees.id AS "employeeId", employees.full_name AS "employeeName",
              simulation_attempts.sent_at AS "sentAt", simulation_attempts.opened_at AS "openedAt",
              simulation_attempts.clicked_at AS "clickedAt",
              simulation_attempts.submitted_credentials_at AS "submittedCredentialsAt",
              simulation_attempts.reported_at AS "reportedAt"
       FROM simulation_attempts
       JOIN employees ON employees.id = simulation_attempts.employee_id
       WHERE simulation_attempts.campaign_id = $1
       ORDER BY employees.full_name`,
      [req.params.id],
    );
    return res.json(rows);
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
