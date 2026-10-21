const db = require('../../config/db');
const scoringClient = require('../../integrations/scoring/scoringClient');

const SCORE_COLUMNS = `
  id, employee_id AS "employeeId", campaign_id AS "campaignId", score, risk_level AS "riskLevel",
  model_version AS "modelVersion", low_data AS "lowData", computed_at AS "computedAt"
`;

// Builds the feature payload the risk-model /predict endpoint expects, matching
// ml/preprocessing.py's FEATURE_COLUMNS. Behaviour rates come from the employee's
// simulation history; difficulty/vector describe the upcoming (or latest) sim.
async function loadEmployeeFeatures(employeeId, organizationId, context = {}) {
  const { rows } = await db.query(
    `SELECT
       employees.hire_date AS "hireDate",
       departments.name AS department,
       COUNT(simulation_attempts.id) AS "priorSent",
       COUNT(simulation_attempts.opened_at) AS opened,
       COUNT(simulation_attempts.clicked_at) AS clicked,
       COUNT(simulation_attempts.reported_at) AS reported,
       (SELECT COUNT(*) FROM training_assignments
         WHERE training_assignments.employee_id = employees.id
           AND training_assignments.status = 'completed') AS "trainingCompleted"
     FROM employees
     LEFT JOIN departments ON departments.id = employees.department_id
     LEFT JOIN simulation_attempts ON simulation_attempts.employee_id = employees.id
     WHERE employees.id = $1 AND employees.organization_id = $2
     GROUP BY employees.id, employees.hire_date, departments.name`,
    [employeeId, organizationId],
  );
  if (rows.length === 0) return null;

  const row = rows[0];
  const priorSent = Number(row.priorSent);
  const tenureDays = row.hireDate
    ? Math.floor((Date.now() - new Date(row.hireDate).getTime()) / (1000 * 60 * 60 * 24))
    : null;

  return {
    tenure_days: tenureDays,
    department: row.department,
    prior_sent: priorSent,
    prior_open_rate: priorSent > 0 ? Number(row.opened) / priorSent : null,
    prior_click_rate: priorSent > 0 ? Number(row.clicked) / priorSent : null,
    prior_report_rate: priorSent > 0 ? Number(row.reported) / priorSent : null,
    training_completed: Number(row.trainingCompleted) > 0 ? 1 : 0,
    // The simulation being scored against; defaults keep manual scoring working.
    difficulty: context.difficulty || 'medium',
    vector: context.vector || 'email',
  };
}

// difficulty/vector of a campaign, to score against the sim that triggered an event.
async function loadCampaignContext(campaignId) {
  if (!campaignId) return {};
  const { rows } = await db.query(
    'SELECT difficulty_level AS difficulty, type AS vector FROM simulation_campaigns WHERE id = $1',
    [campaignId],
  );
  return rows[0] || {};
}

// Scores one employee and stores the result. Returns null if the employee is
// not in this organisation. Throws ScoringUnavailableError if the service is
// down; nothing is stored in that case.
async function scoreEmployee(employeeId, organizationId, campaignId = null) {
  const context = await loadCampaignContext(campaignId);
  const features = await loadEmployeeFeatures(employeeId, organizationId, context);
  if (!features) return null;

  const result = await scoringClient.predict(features);
  const { rows } = await db.query(
    `INSERT INTO susceptibility_scores
       (employee_id, campaign_id, score, risk_level, model_version, low_data)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING ${SCORE_COLUMNS}`,
    [employeeId, campaignId, result.score, result.riskLevel, result.modelVersion, result.lowData],
  );
  return rows[0];
}

// For event handlers: scoring failure is logged, never thrown, so a down
// scoring service can't lose a tracked event.
async function rescoreAfterEvent(employeeId, organizationId, campaignId) {
  try {
    await scoreEmployee(employeeId, organizationId, campaignId);
  } catch (err) {
    console.warn(`Rescore of employee ${employeeId} skipped: ${err.message}`);
  }
}

module.exports = { loadEmployeeFeatures, scoreEmployee, rescoreAfterEvent, SCORE_COLUMNS };
