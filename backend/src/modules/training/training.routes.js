const express = require('express');
const { authenticate, authorize } = require('../../middleware/auth');
const db = require('../../config/db');

const router = express.Router();
router.use(authenticate);

const PASS_THRESHOLD = 0.8;

// Auto-assigns training when an employee falls for a simulated attack.
// Called from campaigns.routes.js's Gophish webhook and SMS tracking
// handlers — not a route, exported alongside the router.
async function maybeAssignTraining(organizationId, employeeId, category) {
  if (!category) return;
  const { rows: moduleRows } = await db.query(
    'SELECT id FROM training_modules WHERE organization_id = $1 AND category = $2 LIMIT 1',
    [organizationId, category],
  );
  if (moduleRows.length === 0) return;

  await db.query(
    `INSERT INTO training_assignments (training_module_id, employee_id)
     VALUES ($1, $2)
     ON CONFLICT (training_module_id, employee_id) DO NOTHING`,
    [moduleRows[0].id, employeeId],
  );
}

router.get('/modules', authorize('admin'), async (req, res, next) => {
  try {
    const { rows } = await db.query(
      `SELECT id, title, description, content_url AS "contentUrl", category, quiz, created_at AS "createdAt"
       FROM training_modules WHERE organization_id = $1 ORDER BY created_at DESC`,
      [req.user.organizationId],
    );
    return res.json(rows);
  } catch (err) {
    return next(err);
  }
});

router.post('/modules', authorize('admin'), async (req, res, next) => {
  const { title, description, contentUrl, category, quiz } = req.body;
  if (!title) return res.status(400).json({ message: 'title is required' });

  try {
    const { rows } = await db.query(
      `INSERT INTO training_modules (organization_id, title, description, content_url, category, quiz)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, title, description, content_url AS "contentUrl", category, quiz, created_at AS "createdAt"`,
      [req.user.organizationId, title, description || null, contentUrl || null, category || null, quiz ? JSON.stringify(quiz) : null],
    );
    return res.status(201).json(rows[0]);
  } catch (err) {
    return next(err);
  }
});

router.get('/assignments', async (req, res, next) => {
  try {
    if (req.user.role === 'employee') {
      const { rows } = await db.query(
        `SELECT training_assignments.id, training_assignments.status, training_assignments.assigned_at AS "assignedAt",
           training_assignments.due_at AS "dueAt", training_assignments.completed_at AS "completedAt",
           training_modules.id AS "trainingModuleId", training_modules.title, training_modules.description,
           training_modules.content_url AS "contentUrl", training_modules.quiz
         FROM training_assignments
         JOIN training_modules ON training_modules.id = training_assignments.training_module_id
         WHERE training_assignments.employee_id = $1
         ORDER BY training_assignments.assigned_at DESC`,
        [req.user.sub],
      );
      return res.json(rows);
    }

    const { rows } = await db.query(
      `SELECT training_assignments.id, training_assignments.status, training_assignments.assigned_at AS "assignedAt",
         training_assignments.due_at AS "dueAt", training_assignments.completed_at AS "completedAt",
         training_modules.title, employees.full_name AS "employeeName"
       FROM training_assignments
       JOIN training_modules ON training_modules.id = training_assignments.training_module_id
       JOIN employees ON employees.id = training_assignments.employee_id
       WHERE employees.organization_id = $1
       ORDER BY training_assignments.assigned_at DESC`,
      [req.user.organizationId],
    );
    return res.json(rows);
  } catch (err) {
    return next(err);
  }
});

router.post('/assign', authorize('admin'), async (req, res, next) => {
  const { employeeId, trainingModuleId, dueAt } = req.body;
  if (!employeeId || !trainingModuleId) {
    return res.status(400).json({ message: 'employeeId and trainingModuleId are required' });
  }

  try {
    const { rows } = await db.query(
      `INSERT INTO training_assignments (training_module_id, employee_id, assigned_by, due_at)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (training_module_id, employee_id) DO UPDATE SET due_at = EXCLUDED.due_at
       RETURNING id, status, assigned_at AS "assignedAt", due_at AS "dueAt"`,
      [trainingModuleId, employeeId, req.user.sub, dueAt || null],
    );
    return res.status(201).json(rows[0]);
  } catch (err) {
    return next(err);
  }
});

router.post('/assignments/:id/complete', async (req, res, next) => {
  const { answers } = req.body;

  try {
    const { rows } = await db.query(
      `SELECT training_assignments.id, training_assignments.employee_id AS "employeeId",
         training_modules.quiz
       FROM training_assignments
       JOIN employees ON employees.id = training_assignments.employee_id
       JOIN training_modules ON training_modules.id = training_assignments.training_module_id
       WHERE training_assignments.id = $1 AND employees.organization_id = $2`,
      [req.params.id, req.user.organizationId],
    );
    if (rows.length === 0) return res.status(404).json({ message: 'Assignment not found' });

    const assignment = rows[0];
    if (req.user.role === 'employee' && req.user.sub !== assignment.employeeId) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    const quiz = assignment.quiz || [];
    let correct = 0;
    quiz.forEach((question, i) => {
      if (Array.isArray(answers) && answers[i] === question.correctIndex) correct += 1;
    });
    const score = quiz.length > 0 ? correct / quiz.length : 1;
    const passed = score >= PASS_THRESHOLD;

    // Two separate query strings (not a CASE keyed off the same $1) — Postgres's
    // parameter type inference chokes on reusing $1 as both an assigned value
    // and a comparison operand in one statement ("inconsistent types deduced").
    const status = passed ? 'completed' : 'in_progress';
    const updateQuery = passed
      ? `UPDATE training_assignments SET status = $1, completed_at = now() WHERE id = $2
         RETURNING id, status, completed_at AS "completedAt"`
      : `UPDATE training_assignments SET status = $1 WHERE id = $2
         RETURNING id, status, completed_at AS "completedAt"`;
    const { rows: updated } = await db.query(updateQuery, [status, req.params.id]);

    return res.json({ ...updated[0], score, passed });
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
module.exports.maybeAssignTraining = maybeAssignTraining;
