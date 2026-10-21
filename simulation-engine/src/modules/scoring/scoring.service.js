const db = require('../../config/db');
const scoringClient = require('../../integrations/scoring/scoringClient');

const SCORE_COLUMNS = `
  id, employee_id AS "employeeId", campaign_id AS "campaignId", score, risk_level AS "riskLevel",
  model_version AS "modelVersion", low_data AS "lowData", computed_at AS "computedAt"
`;

// Builds the feature payload the risk-model /predict endpoint expects.
async function loadEmployeeFeatures(employeeId, organizationId) {
  const { rows } = await db.query(
    `SELECT
       employees.hire_date AS "hireDate",
       departments.name AS department,
       COUNT(simulation_attempts.id) AS "campaignsSent",
       COUNT(simulation_attempts.opened_at) AS opened,
       COUNT(simulation_attempts.clicked_at) AS clicked,
       COUNT(simulation_attempts.submitted_credentials_at) AS submitted,
       COUNT(simulation_attempts.reported_at) AS reported
     FROM employees
     LEFT JOIN departments ON departments.id = employees.department_id
     LEFT JOIN simulation_attempts ON simulation_attempts.employee_id = employees.id
     WHERE employees.id = $1 AND employees.organization_id = $2
     GROUP BY employees.id, employees.hire_date, departments.name`,
    [employeeId, organizationId],
  );
  if (rows.length === 0) return null;

  const row = rows[0];
  const campaignsSent = Number(row.campaignsSent);
  const clicked = Number(row.clicked);
  const tenureDays = row.hireDate
    ? Math.floor((Date.now() - new Date(row.hireDate).getTime()) / (1000 * 60 * 60 * 24))
    : null;

  return {
    tenure_days: tenureDays,
    department: row.department,
    campaigns_sent: campaignsSent,
    opened: Number(row.opened),
    clicked,
    submitted: Number(row.submitted),
    reported: Number(row.reported),
    click_rate: campaignsSent > 0 ? clicked / campaignsSent : null,
    submit_rate: clicked > 0 ? Number(row.submitted) / clicked : null,
  };
}

// Scores one employee and stores the result. Returns null if the employee is
// not in this organisation. Throws ScoringUnavailableError if the service is
// down; nothing is stored in that case.
async function scoreEmployee(employeeId, organizationId, campaignId = null) {
  const features = await loadEmployeeFeatures(employeeId, organizationId);
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
