const express = require('express');
const crypto = require('crypto');
const { authenticate, authorize } = require('../../middleware/auth');
const db = require('../../config/db');
const env = require('../../config/env');
const gophishClient = require('../../integrations/gophish/gophishClient');
const smsClient = require('../../integrations/africasTalking/smsClient');
const { maybeAssignTraining } = require('../training/training.routes');
const { rescoreAfterEvent } = require('../scoring/scoring.service');

const router = express.Router();
const requireAdmin = [authenticate, authorize('admin')];

const CAMPAIGN_COLUMNS = `
  id, name, type, template_key AS "templateKey", difficulty_level AS "difficultyLevel",
  status, gophish_campaign_id AS "gophishCampaignId", scheduled_at AS "scheduledAt",
  department_id AS "departmentId", launched_at AS "launchedAt", completed_at AS "completedAt",
  authorised_at AS "authorisedAt", failure_reason AS "failureReason", created_at AS "createdAt"
`;

const TEMPLATE_COLUMNS = `
  id, type, key, name, subject, body, category, difficulty_level AS "difficultyLevel",
  organization_id IS NOT NULL AS "isCustom"
`;

const DIFFICULTIES = ['easy', 'medium', 'hard'];

// Gophish event -> attempt timestamp. The event's `details` (which can hold
// whatever was typed into the landing page) is deliberately never read or stored.
const EVENT_COLUMN = {
  'Email Sent': 'sent_at',
  'Email Opened': 'opened_at',
  'Clicked Link': 'clicked_at',
  'Submitted Data': 'submitted_credentials_at',
  'Email Reported': 'reported_at',
};
const FAILURE_COLUMNS = ['clicked_at', 'submitted_credentials_at'];
const RESCORE_COLUMNS = [...FAILURE_COLUMNS, 'reported_at'];
const LAUNCHABLE = ['draft', 'scheduled', 'failed'];
const AUTH_REQUIRED_MESSAGE =
  'Confirm that every recipient is an enrolled employee you are authorised to test (acknowledgeAuthorisation: true)';

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

async function getCampaignOrgAndCategory(campaignId) {
  const { rows } = await db.query(
    `SELECT simulation_campaigns.organization_id AS "organizationId", campaign_templates.category
     FROM simulation_campaigns
     LEFT JOIN campaign_templates ON campaign_templates.key = simulation_campaigns.template_key
       AND (campaign_templates.organization_id = simulation_campaigns.organization_id OR campaign_templates.organization_id IS NULL)
     WHERE simulation_campaigns.id = $1
     ORDER BY campaign_templates.organization_id NULLS LAST
     LIMIT 1`,
    [campaignId],
  );
  return rows[0];
}

// Writes one tracked event. Each timestamp is set once, the first time it's
// seen, so replayed or out-of-order deliveries change nothing. A first click or
// submission assigns training in the same transaction; rescoring runs after
// commit so a down scoring service can't lose the event.
async function recordEvent({ campaignId, employeeId, column, at }) {
  const campaignInfo = await getCampaignOrgAndCategory(campaignId);
  const client = await db.getClient();
  let firstTime;
  try {
    await client.query('BEGIN');
    const { rowCount } = await client.query(
      `UPDATE simulation_attempts SET ${column} = $3
       WHERE campaign_id = $1 AND employee_id = $2 AND ${column} IS NULL`,
      [campaignId, employeeId, at],
    );
    firstTime = rowCount === 1;
    if (firstTime && FAILURE_COLUMNS.includes(column) && campaignInfo) {
      await maybeAssignTraining(
        campaignInfo.organizationId,
        employeeId,
        campaignInfo.category,
        client,
      );
    }
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }

  if (firstTime && RESCORE_COLUMNS.includes(column) && campaignInfo) {
    await rescoreAfterEvent(employeeId, campaignInfo.organizationId, campaignId);
  }
  return firstTime;
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
    // An org's customised copy of a template overrides the global default with the same key.
    const { rows } = await db.query(
      `SELECT DISTINCT ON (key) ${TEMPLATE_COLUMNS},
         EXISTS (
           SELECT 1 FROM campaign_templates d
           WHERE d.key = campaign_templates.key AND d.organization_id IS NULL
         ) AS "hasDefault"
       FROM campaign_templates
       WHERE organization_id IS NULL OR organization_id = $1
       ORDER BY key, organization_id NULLS LAST`,
      [req.user.organizationId],
    );
    return res.json(
      rows.sort((a, b) => a.type.localeCompare(b.type) || a.name.localeCompare(b.name)),
    );
  } catch (err) {
    return next(err);
  }
});

// Saves an org-level copy of a template; the global default stays untouched.
router.put('/templates/:key', ...requireAdmin, async (req, res, next) => {
  const { subject, body, difficultyLevel } = req.body;
  if (!body) return res.status(400).json({ message: 'body is required' });
  if (difficultyLevel && !DIFFICULTIES.includes(difficultyLevel)) {
    return res.status(400).json({ message: 'difficultyLevel must be easy, medium or hard' });
  }

  try {
    const { rows } = await db.query(
      `INSERT INTO campaign_templates
         (organization_id, type, key, name, subject, body, category, difficulty_level)
       SELECT $1, type, key, name, $3, $4, category, COALESCE($5, difficulty_level)
       FROM campaign_templates
       WHERE key = $2 AND (organization_id IS NULL OR organization_id = $1)
       ORDER BY organization_id NULLS LAST LIMIT 1
       ON CONFLICT (organization_id, key) DO UPDATE SET subject = EXCLUDED.subject,
         body = EXCLUDED.body, difficulty_level = EXCLUDED.difficulty_level
       RETURNING ${TEMPLATE_COLUMNS}`,
      [req.user.organizationId, req.params.key, subject || null, body, difficultyLevel || null],
    );
    if (rows.length === 0) return res.status(404).json({ message: 'Template not found' });
    return res.json(rows[0]);
  } catch (err) {
    return next(err);
  }
});

// New org-only template.
router.post('/templates', ...requireAdmin, async (req, res, next) => {
  const { type, name, subject, body, category, difficultyLevel } = req.body;
  if (!type || !name || !body) {
    return res.status(400).json({ message: 'type, name and body are required' });
  }
  if (!['email', 'sms'].includes(type)) {
    return res.status(400).json({ message: 'type must be email or sms' });
  }
  if (type === 'email' && !subject) {
    return res.status(400).json({ message: 'subject is required for email templates' });
  }
  if (difficultyLevel && !DIFFICULTIES.includes(difficultyLevel)) {
    return res.status(400).json({ message: 'difficultyLevel must be easy, medium or hard' });
  }
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60);
  const key = `${slug || 'template'}-${crypto.randomBytes(3).toString('hex')}`;

  try {
    const { rows } = await db.query(
      `INSERT INTO campaign_templates
         (organization_id, type, key, name, subject, body, category, difficulty_level)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING ${TEMPLATE_COLUMNS}`,
      [
        req.user.organizationId,
        type,
        key,
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

// Removes the org's copy: a customised default reverts, an org-only template is deleted.
router.delete('/templates/:key', ...requireAdmin, async (req, res, next) => {
  try {
    const { rowCount } = await db.query(
      'DELETE FROM campaign_templates WHERE key = $1 AND organization_id = $2',
      [req.params.key, req.user.organizationId],
    );
    if (rowCount === 0) return res.status(404).json({ message: 'No custom template to remove' });
    return res.status(204).send();
  } catch (err) {
    return next(err);
  }
});

// Public: SMS click-tracking link embedded in smishing messages.
router.get('/track/:token', async (req, res, next) => {
  try {
    const { rows } = await db.query(
      `SELECT campaign_id AS "campaignId", employee_id AS "employeeId"
       FROM simulation_attempts WHERE tracking_token::text = $1`,
      [req.params.token],
    );
    if (rows.length === 0) return res.status(404).send('Not found');

    await recordEvent({ ...rows[0], column: 'clicked_at', at: new Date() });

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

  const { campaign_id: gophishCampaignId, email, message, time } = req.body || {};
  const column = EVENT_COLUMN[message];
  if (!column) return res.status(200).json({ message: 'Ignored event' });
  if (!Number.isInteger(gophishCampaignId) || typeof email !== 'string') {
    return res.status(400).json({ message: 'campaign_id and email are required' });
  }
  const at = time && !Number.isNaN(Date.parse(time)) ? new Date(time) : new Date();

  try {
    const { rows: campaignRows } = await db.query(
      `SELECT id, organization_id AS "organizationId"
       FROM simulation_campaigns WHERE gophish_campaign_id = $1`,
      [gophishCampaignId],
    );
    if (campaignRows.length === 0) return res.status(200).json({ message: 'Unknown campaign' });
    const campaign = campaignRows[0];

    // Only employees of the campaign's own organisation can be matched.
    const { rows: employeeRows } = await db.query(
      'SELECT id FROM employees WHERE lower(email) = lower($1) AND organization_id = $2',
      [email, campaign.organizationId],
    );
    if (employeeRows.length === 0) return res.status(200).json({ message: 'Unknown employee' });

    const firstTime = await recordEvent({
      campaignId: campaign.id,
      employeeId: employeeRows[0].id,
      column,
      at,
    });
    return res.status(200).json({ message: firstTime ? 'ok' : 'Duplicate event ignored' });
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
  const { name, type, templateKey, difficultyLevel, scheduledAt, departmentId } = req.body;
  const acknowledged = req.body.acknowledgeAuthorisation === true;
  if (!name || !type || !templateKey) {
    return res.status(400).json({ message: 'name, type and templateKey are required' });
  }
  if (!['email', 'sms'].includes(type)) {
    return res.status(400).json({ message: 'type must be email or sms' });
  }
  if (scheduledAt && Number.isNaN(Date.parse(scheduledAt))) {
    return res.status(400).json({ message: 'scheduledAt must be a valid date' });
  }
  if (difficultyLevel && !DIFFICULTIES.includes(difficultyLevel)) {
    return res.status(400).json({ message: 'difficultyLevel must be easy, medium or hard' });
  }
  // Scheduling is a deferred launch, so it needs the same authorisation.
  if (scheduledAt && !acknowledged) {
    return res.status(422).json({ message: AUTH_REQUIRED_MESSAGE });
  }

  try {
    if (departmentId) {
      const { rows: deptRows } = await db.query(
        'SELECT id FROM departments WHERE id = $1 AND organization_id = $2',
        [departmentId, req.user.organizationId],
      );
      if (deptRows.length === 0) return res.status(400).json({ message: 'Unknown departmentId' });
    }

    const { rows } = await db.query(
      `INSERT INTO simulation_campaigns
         (organization_id, created_by, name, type, template_key, difficulty_level, status,
          scheduled_at, department_id, authorised_by, authorised_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING ${CAMPAIGN_COLUMNS}`,
      [
        req.user.organizationId,
        req.user.sub,
        name,
        type,
        templateKey,
        difficultyLevel || 'medium',
        scheduledAt ? 'scheduled' : 'draft',
        scheduledAt || null,
        departmentId || null,
        acknowledged && scheduledAt ? req.user.sub : null,
        acknowledged && scheduledAt ? new Date() : null,
      ],
    );
    return res.status(201).json(rows[0]);
  } catch (err) {
    return next(err);
  }
});

router.get('/:id', ...requireAdmin, async (req, res, next) => {
  try {
    const { rows } = await db.query(
      `SELECT ${CAMPAIGN_COLUMNS},
         (SELECT name FROM departments WHERE departments.id = simulation_campaigns.department_id)
           AS "departmentName"
       FROM simulation_campaigns WHERE id = $1 AND organization_id = $2`,
      [req.params.id, req.user.organizationId],
    );
    if (rows.length === 0) return res.status(404).json({ message: 'Campaign not found' });
    return res.json(rows[0]);
  } catch (err) {
    return next(err);
  }
});

class LaunchError extends Error {
  constructor(status, message, detail) {
    super(message);
    this.status = status;
    this.detail = detail;
  }
}

// Shared by the launch route and the scheduler.
async function launchCampaign(campaign, organizationId, departmentId) {
  const { rows: templateRows } = await db.query(
    `SELECT type, subject, body FROM campaign_templates
     WHERE key = $1 AND (organization_id = $2 OR organization_id IS NULL)
     ORDER BY organization_id NULLS LAST LIMIT 1`,
    [campaign.templateKey, organizationId],
  );
  if (templateRows.length === 0) throw new LaunchError(400, 'Unknown templateKey');
  const template = templateRows[0];

  const employees = await getTargetEmployees(organizationId, departmentId);
  if (employees.length === 0) throw new LaunchError(400, 'No employees to target');

  if (campaign.type === 'email') {
    let gophishCampaign;
    // Suffix keeps names unique if a failed launch left objects behind in Gophish.
    const ref = `redflag-${campaign.id}-${Date.now()}`;
    try {
      const group = await gophishClient.createGroup(ref, employees);
      const gophishTemplate = await gophishClient.createTemplate(
        ref,
        template.subject,
        template.body,
      );
      gophishCampaign = await gophishClient.createCampaign({
        name: `${ref}-${campaign.name}`,
        groupName: group.name,
        templateName: gophishTemplate.name,
        pageName: env.gophish.landingPage,
        url: env.gophish.phishUrl,
      });
    } catch (err) {
      throw new LaunchError(
        502,
        'Gophish is not reachable or not set up',
        err.response?.data?.message || err.message,
      );
    }

    await db.query(
      `UPDATE simulation_campaigns SET status = $1, gophish_campaign_id = $2, launched_at = now(),
         failure_reason = NULL
       WHERE id = $3`,
      ['running', gophishCampaign.id, campaign.id],
    );

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
    if (targeted.length === 0)
      throw new LaunchError(400, 'No employees with a phone number to target');

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
        await db.query(
          'UPDATE simulation_attempts SET sent_at = now() WHERE campaign_id = $1 AND employee_id = $2',
          [campaign.id, emp.id],
        );
      }),
    );

    const sentCount = outcomes.filter((o) => o.status === 'fulfilled').length;
    if (sentCount === 0) {
      const [firstFailure] = outcomes;
      throw new LaunchError(502, 'Failed to send any SMS messages', firstFailure.reason?.message);
    }

    await db.query(
      'UPDATE simulation_campaigns SET status = $1, launched_at = now(), failure_reason = NULL WHERE id = $2',
      ['running', campaign.id],
    );
    return `Campaign launched (${sentCount}/${targeted.length} messages sent)`;
  }

  return 'Campaign launched';
}

// Moves a campaign into 'launching' in one statement, so a double-click or a
// scheduler tick racing a manual launch can only start it once.
async function claimForLaunch(campaignId, organizationId, statuses = LAUNCHABLE) {
  const { rows } = await db.query(
    `UPDATE simulation_campaigns SET status = 'launching'
     WHERE id = $1 AND organization_id = $2 AND status = ANY($3::text[])
     RETURNING ${CAMPAIGN_COLUMNS}`,
    [campaignId, organizationId, statuses],
  );
  return rows[0];
}

async function markFailed(campaignId, reason) {
  await db.query(
    "UPDATE simulation_campaigns SET status = 'failed', failure_reason = $2 WHERE id = $1",
    [campaignId, reason],
  );
}

// Launches scheduled campaigns whose time has come. Run on an interval from index.js.
async function launchDueCampaigns() {
  const { rows } = await db.query(
    `SELECT id, organization_id AS "organizationId" FROM simulation_campaigns
     WHERE status = 'scheduled' AND scheduled_at <= now() AND authorised_at IS NOT NULL`,
  );
  for (const due of rows) {
    const campaign = await claimForLaunch(due.id, due.organizationId, ['scheduled']);
    if (!campaign) continue;
    try {
      await launchCampaign(campaign, due.organizationId, campaign.departmentId);
    } catch (err) {
      // Marked failed (not retried every tick); the admin can relaunch manually.
      await markFailed(campaign.id, err.detail ? `${err.message}: ${err.detail}` : err.message);
      console.error(`Scheduled launch of campaign ${campaign.id} failed: ${err.message}`);
    }
  }
}

router.post('/:id/launch', ...requireAdmin, async (req, res, next) => {
  if (req.body.acknowledgeAuthorisation !== true) {
    return res.status(422).json({ message: AUTH_REQUIRED_MESSAGE });
  }

  let campaign;
  try {
    campaign = await claimForLaunch(req.params.id, req.user.organizationId);
    if (!campaign) {
      const { rows } = await db.query(
        'SELECT status FROM simulation_campaigns WHERE id = $1 AND organization_id = $2',
        [req.params.id, req.user.organizationId],
      );
      if (rows.length === 0) return res.status(404).json({ message: 'Campaign not found' });
      return res.status(409).json({ message: `Campaign is already ${rows[0].status}` });
    }

    await db.query(
      'UPDATE simulation_campaigns SET authorised_by = $1, authorised_at = now() WHERE id = $2',
      [req.user.sub, campaign.id],
    );
    const message = await launchCampaign(
      campaign,
      req.user.organizationId,
      req.body.departmentId || campaign.departmentId,
    );
    return res.json({ message });
  } catch (err) {
    if (campaign) {
      await markFailed(campaign.id, err.detail ? `${err.message}: ${err.detail}` : err.message);
    }
    if (err instanceof LaunchError) {
      return res.status(err.status).json({ message: err.message, detail: err.detail });
    }
    return next(err);
  }
});

// Ends a running campaign (or unschedules a scheduled one). A Gophish failure is logged, not fatal.
router.post('/:id/stop', ...requireAdmin, async (req, res, next) => {
  try {
    const { rows } = await db.query(
      `SELECT ${CAMPAIGN_COLUMNS} FROM simulation_campaigns WHERE id = $1 AND organization_id = $2`,
      [req.params.id, req.user.organizationId],
    );
    if (rows.length === 0) return res.status(404).json({ message: 'Campaign not found' });
    const campaign = rows[0];
    if (!['running', 'scheduled'].includes(campaign.status)) {
      return res.status(409).json({ message: `Campaign is ${campaign.status}` });
    }

    if (campaign.type === 'email' && campaign.gophishCampaignId) {
      try {
        await gophishClient.completeCampaign(campaign.gophishCampaignId);
      } catch (err) {
        console.error(`Gophish stop for campaign ${campaign.id} failed: ${err.message}`);
      }
    }

    const updateQuery =
      campaign.status === 'scheduled'
        ? `UPDATE simulation_campaigns SET status = 'draft', scheduled_at = NULL
           WHERE id = $1 RETURNING ${CAMPAIGN_COLUMNS}`
        : `UPDATE simulation_campaigns SET status = 'completed', completed_at = now()
           WHERE id = $1 RETURNING ${CAMPAIGN_COLUMNS}`;
    const { rows: updated } = await db.query(updateQuery, [campaign.id]);
    return res.json(updated[0]);
  } catch (err) {
    return next(err);
  }
});

// Only drafts and failed launches can be deleted; launched campaigns keep their history.
router.delete('/:id', ...requireAdmin, async (req, res, next) => {
  try {
    const { rows } = await db.query(
      'SELECT status FROM simulation_campaigns WHERE id = $1 AND organization_id = $2',
      [req.params.id, req.user.organizationId],
    );
    if (rows.length === 0) return res.status(404).json({ message: 'Campaign not found' });
    if (!['draft', 'failed'].includes(rows[0].status)) {
      return res.status(409).json({ message: 'Only draft or failed campaigns can be deleted' });
    }
    await db.query('DELETE FROM simulation_campaigns WHERE id = $1', [req.params.id]);
    return res.status(204).send();
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
              employees.email, departments.name AS "departmentName",
              simulation_attempts.sent_at AS "sentAt", simulation_attempts.opened_at AS "openedAt",
              simulation_attempts.clicked_at AS "clickedAt",
              simulation_attempts.submitted_credentials_at AS "submittedCredentialsAt",
              simulation_attempts.reported_at AS "reportedAt"
       FROM simulation_attempts
       JOIN employees ON employees.id = simulation_attempts.employee_id
       LEFT JOIN departments ON departments.id = employees.department_id
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
module.exports.launchDueCampaigns = launchDueCampaigns;
