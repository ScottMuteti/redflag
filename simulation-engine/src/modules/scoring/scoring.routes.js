const express = require('express');
const axios = require('axios');
const { authenticate, authorize } = require('../../middleware/auth');
const db = require('../../config/db');
const env = require('../../config/env');

const router = express.Router();
router.use(authenticate);

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

router.post('/compute', authorize('admin'), async (req, res, next) => {
  const { employeeId } = req.body;
  if (!employeeId) return res.status(400).json({ message: 'employeeId is required' });

  try {
    const features = await loadEmployeeFeatures(employeeId, req.user.organizationId);
    if (!features) return res.status(404).json({ message: 'Employee not found' });

    const { data } = await axios.post(`${env.mlServiceUrl}/predict`, features);

    const { rows } = await db.query(
      `INSERT INTO susceptibility_scores (employee_id, score, risk_level, model_version)
       VALUES ($1, $2, $3, $4)
       RETURNING id, employee_id AS "employeeId", score, risk_level AS "riskLevel",
         model_version AS "modelVersion", computed_at AS "computedAt"`,
      [employeeId, data.score, data.risk_level, data.model_version],
    );

    return res.status(201).json(rows[0]);
  } catch (err) {
    if (err.response?.status === 503) {
      return res.status(503).json({ message: 'Scoring model is not trained yet' });
    }
    return next(err);
  }
});

router.get('/employee/:employeeId', async (req, res, next) => {
  const employeeId = Number(req.params.employeeId);
  if (req.user.role === 'employee' && req.user.sub !== employeeId) {
    return res.status(403).json({ message: 'Forbidden' });
  }

  try {
    const { rows } = await db.query(
      `SELECT susceptibility_scores.id, susceptibility_scores.employee_id AS "employeeId",
         susceptibility_scores.score, susceptibility_scores.risk_level AS "riskLevel",
         susceptibility_scores.model_version AS "modelVersion",
         susceptibility_scores.computed_at AS "computedAt"
       FROM susceptibility_scores
       JOIN employees ON employees.id = susceptibility_scores.employee_id
       WHERE susceptibility_scores.employee_id = $1 AND employees.organization_id = $2
       ORDER BY susceptibility_scores.computed_at DESC
       LIMIT 1`,
      [employeeId, req.user.organizationId],
    );
    if (rows.length === 0) return res.status(404).json({ message: 'No score computed yet' });
    return res.json(rows[0]);
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
