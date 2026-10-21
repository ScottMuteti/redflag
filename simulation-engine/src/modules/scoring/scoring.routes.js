const express = require('express');
const { authenticate, authorize } = require('../../middleware/auth');
const db = require('../../config/db');
const { ScoringUnavailableError } = require('../../integrations/scoring/scoringClient');
const { scoreEmployee } = require('./scoring.service');

const router = express.Router();
router.use(authenticate);

router.post('/compute', authorize('admin'), async (req, res, next) => {
  const { employeeId } = req.body;
  if (!employeeId) return res.status(400).json({ message: 'employeeId is required' });

  try {
    const score = await scoreEmployee(employeeId, req.user.organizationId);
    if (!score) return res.status(404).json({ message: 'Employee not found' });
    return res.status(201).json(score);
  } catch (err) {
    if (err instanceof ScoringUnavailableError) {
      return res.status(503).json({ message: `Score unavailable: ${err.message}` });
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
         susceptibility_scores.model_version AS "modelVersion", susceptibility_scores.low_data AS "lowData",
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

// Scores every employee in the org; failures for individual employees are counted, not fatal.
router.post('/compute-all', authorize('admin'), async (req, res, next) => {
  try {
    const { rows: employees } = await db.query(
      'SELECT id FROM employees WHERE organization_id = $1',
      [req.user.organizationId],
    );
    let scored = 0;
    for (const { id } of employees) {
      try {
        await scoreEmployee(id, req.user.organizationId);
        scored += 1;
      } catch (err) {
        // The service is down for everyone, so stop rather than fail N times.
        if (err instanceof ScoringUnavailableError) {
          return res
            .status(503)
            .json({ message: `Score unavailable: ${err.message}`, scored });
        }
        throw err;
      }
    }
    return res.json({ scored, failed: 0 });
  } catch (err) {
    return next(err);
  }
});

router.get('/employee/:employeeId/history', async (req, res, next) => {
  const employeeId = Number(req.params.employeeId);
  if (req.user.role === 'employee' && req.user.sub !== employeeId) {
    return res.status(403).json({ message: 'Forbidden' });
  }

  try {
    const { rows } = await db.query(
      `SELECT susceptibility_scores.score, susceptibility_scores.risk_level AS "riskLevel", susceptibility_scores.model_version AS "modelVersion",
         susceptibility_scores.low_data AS "lowData",
         susceptibility_scores.computed_at AS "computedAt"
       FROM susceptibility_scores
       JOIN employees ON employees.id = susceptibility_scores.employee_id
       WHERE susceptibility_scores.employee_id = $1 AND employees.organization_id = $2
       ORDER BY susceptibility_scores.computed_at DESC
       LIMIT 20`,
      [employeeId, req.user.organizationId],
    );
    return res.json(rows.reverse());
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
