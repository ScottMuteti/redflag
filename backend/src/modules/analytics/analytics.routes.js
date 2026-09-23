const express = require('express');
const { authenticate, authorize } = require('../../middleware/auth');
const db = require('../../config/db');

const router = express.Router();
router.use(authenticate);

function bucket(score) {
  if (score === null || score === undefined) return null;
  if (score < 0.33) return 'low';
  if (score < 0.66) return 'medium';
  return 'high';
}

router.get('/organization', authorize('admin'), async (req, res, next) => {
  try {
    const orgId = req.user.organizationId;

    const [
      riskResult,
      departmentResult,
      campaignResult,
      trainingResult,
      riskTrendResult,
      clickTrendResult,
    ] = await Promise.all([
      // Weighted by simulation exposure: an employee's latest score counts once per
      // simulation they received (min 1), so scores backed by more evidence weigh more.
      db.query(
        `SELECT SUM(latest.score * latest.weight) / NULLIF(SUM(latest.weight), 0) AS "riskScore"
         FROM (
           SELECT DISTINCT ON (susceptibility_scores.employee_id) susceptibility_scores.score,
             GREATEST(
               (SELECT COUNT(*) FROM simulation_attempts WHERE simulation_attempts.employee_id = employees.id),
               1
             ) AS weight
           FROM susceptibility_scores
           JOIN employees ON employees.id = susceptibility_scores.employee_id
           WHERE employees.organization_id = $1
           ORDER BY susceptibility_scores.employee_id, susceptibility_scores.computed_at DESC
         ) latest`,
        [orgId],
      ),
      db.query(
        `SELECT departments.name AS department, AVG(latest.score) AS "avgScore", COUNT(*) AS "employeeCount"
         FROM (
           SELECT DISTINCT ON (susceptibility_scores.employee_id)
             susceptibility_scores.employee_id, susceptibility_scores.score, employees.department_id
           FROM susceptibility_scores
           JOIN employees ON employees.id = susceptibility_scores.employee_id
           WHERE employees.organization_id = $1
           ORDER BY susceptibility_scores.employee_id, susceptibility_scores.computed_at DESC
         ) latest
         LEFT JOIN departments ON departments.id = latest.department_id
         GROUP BY departments.name`,
        [orgId],
      ),
      db.query(
        `SELECT simulation_campaigns.id, simulation_campaigns.name,
           COUNT(simulation_attempts.id) AS "totalAttempts",
           COUNT(simulation_attempts.opened_at) AS opened,
           COUNT(simulation_attempts.clicked_at) AS clicked,
           COUNT(simulation_attempts.submitted_credentials_at) AS submitted,
           COUNT(simulation_attempts.reported_at) AS reported
         FROM simulation_campaigns
         LEFT JOIN simulation_attempts ON simulation_attempts.campaign_id = simulation_campaigns.id
         WHERE simulation_campaigns.organization_id = $1
         GROUP BY simulation_campaigns.id, simulation_campaigns.name
         ORDER BY simulation_campaigns.id DESC`,
        [orgId],
      ),
      db.query(
        `SELECT COUNT(*) AS total, COUNT(*) FILTER (WHERE status = 'completed') AS completed
         FROM training_assignments
         JOIN employees ON employees.id = training_assignments.employee_id
         WHERE employees.organization_id = $1`,
        [orgId],
      ),
      db.query(
        `SELECT date_trunc('week', susceptibility_scores.computed_at) AS week, AVG(susceptibility_scores.score) AS value
         FROM susceptibility_scores
         JOIN employees ON employees.id = susceptibility_scores.employee_id
         WHERE employees.organization_id = $1
         GROUP BY week ORDER BY week`,
        [orgId],
      ),
      db.query(
        `SELECT date_trunc('week', simulation_attempts.sent_at) AS week,
           COUNT(simulation_attempts.clicked_at)::float / COUNT(*) AS value
         FROM simulation_attempts
         JOIN simulation_campaigns ON simulation_campaigns.id = simulation_attempts.campaign_id
         WHERE simulation_campaigns.organization_id = $1 AND simulation_attempts.sent_at IS NOT NULL
         GROUP BY week ORDER BY week`,
        [orgId],
      ),
    ]);

    const riskScore =
      riskResult.rows[0].riskScore !== null ? Number(riskResult.rows[0].riskScore) : null;
    const training = trainingResult.rows[0];
    const totalAssignments = Number(training.total);
    const completedAssignments = Number(training.completed);

    // Weekly risk and click-rate series merged on week.
    const trendByWeek = new Map();
    const addToTrend = (rows, field) =>
      rows.forEach((row) => {
        const week = new Date(row.week).toISOString().slice(0, 10);
        trendByWeek.set(week, {
          week,
          avgRisk: null,
          clickRate: null,
          ...trendByWeek.get(week),
          [field]: Number(row.value),
        });
      });
    addToTrend(riskTrendResult.rows, 'avgRisk');
    addToTrend(clickTrendResult.rows, 'clickRate');

    return res.json({
      riskScore,
      riskLevel: bucket(riskScore),
      trend: [...trendByWeek.values()].sort((a, b) => a.week.localeCompare(b.week)),
      departments: departmentResult.rows.map((row) => ({
        department: row.department || 'Unassigned',
        avgScore: Number(row.avgScore),
        employeeCount: Number(row.employeeCount),
      })),
      campaigns: campaignResult.rows.map((row) => ({
        id: row.id,
        name: row.name,
        totalAttempts: Number(row.totalAttempts),
        opened: Number(row.opened),
        clicked: Number(row.clicked),
        submitted: Number(row.submitted),
        reported: Number(row.reported),
      })),
      training: {
        totalAssignments,
        completedAssignments,
        completionRate: totalAssignments > 0 ? completedAssignments / totalAssignments : null,
      },
    });
  } catch (err) {
    return next(err);
  }
});

router.get('/employee/:id', async (req, res, next) => {
  const employeeId = Number(req.params.id);
  if (req.user.role === 'employee' && req.user.sub !== employeeId) {
    return res.status(403).json({ message: 'Forbidden' });
  }

  try {
    const [scoreResult, attemptsResult, assignmentsResult] = await Promise.all([
      db.query(
        `SELECT score, risk_level AS "riskLevel", computed_at AS "computedAt"
         FROM susceptibility_scores
         JOIN employees ON employees.id = susceptibility_scores.employee_id
         WHERE susceptibility_scores.employee_id = $1 AND employees.organization_id = $2
         ORDER BY computed_at DESC LIMIT 1`,
        [employeeId, req.user.organizationId],
      ),
      db.query(
        `SELECT COUNT(*) AS total, COUNT(clicked_at) AS clicked, COUNT(submitted_credentials_at) AS submitted
         FROM simulation_attempts
         JOIN employees ON employees.id = simulation_attempts.employee_id
         WHERE simulation_attempts.employee_id = $1 AND employees.organization_id = $2`,
        [employeeId, req.user.organizationId],
      ),
      db.query(
        `SELECT COUNT(*) AS total, COUNT(*) FILTER (WHERE status = 'completed') AS completed
         FROM training_assignments
         JOIN employees ON employees.id = training_assignments.employee_id
         WHERE training_assignments.employee_id = $1 AND employees.organization_id = $2`,
        [employeeId, req.user.organizationId],
      ),
    ]);

    return res.json({
      latestScore: scoreResult.rows[0] || null,
      attempts: {
        total: Number(attemptsResult.rows[0].total),
        clicked: Number(attemptsResult.rows[0].clicked),
        submitted: Number(attemptsResult.rows[0].submitted),
      },
      training: {
        totalAssignments: Number(assignmentsResult.rows[0].total),
        completedAssignments: Number(assignmentsResult.rows[0].completed),
      },
    });
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
