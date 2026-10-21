const express = require('express');
const { authenticate, authorize } = require('../../middleware/auth');
const db = require('../../config/db');
const starterModules = require('./training.starter');

const router = express.Router();
router.use(authenticate);

const PASS_THRESHOLD = 0.8;

const MODULE_COLUMNS = `
  training_modules.id, training_modules.title, training_modules.description,
  training_modules.content_url AS "contentUrl", training_modules.category, training_modules.quiz,
  training_modules.lessons, training_modules.estimated_minutes AS "estimatedMinutes",
  training_modules.created_at AS "createdAt"
`;

const ASSIGNMENT_COLUMNS = `
  training_assignments.id, training_assignments.status, training_assignments.assigned_at AS "assignedAt",
  training_assignments.due_at AS "dueAt", training_assignments.completed_at AS "completedAt",
  training_assignments.lesson_progress AS "lessonProgress",
  training_assignments.quiz_attempts AS "quizAttempts", training_assignments.last_score AS "lastScore",
  training_assignments.last_attempt_at AS "lastAttemptAt"
`;

const json = (value) => (value === undefined || value === null ? null : JSON.stringify(value));

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
      `SELECT ${MODULE_COLUMNS},
         COUNT(training_assignments.id)::int AS "assignedCount",
         COUNT(training_assignments.completed_at)::int AS "completedCount"
       FROM training_modules
       LEFT JOIN training_assignments ON training_assignments.training_module_id = training_modules.id
       WHERE training_modules.organization_id = $1
       GROUP BY training_modules.id
       ORDER BY training_modules.created_at DESC`,
      [req.user.organizationId],
    );
    return res.json(rows);
  } catch (err) {
    return next(err);
  }
});

router.post('/modules', authorize('admin'), async (req, res, next) => {
  const { title, description, contentUrl, category, quiz, lessons, estimatedMinutes } = req.body;
  if (!title) return res.status(400).json({ message: 'title is required' });

  try {
    const { rows } = await db.query(
      `INSERT INTO training_modules
         (organization_id, title, description, content_url, category, quiz, lessons, estimated_minutes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING ${MODULE_COLUMNS}`,
      [
        req.user.organizationId,
        title,
        description || null,
        contentUrl || null,
        category || null,
        json(quiz),
        json(lessons),
        estimatedMinutes || null,
      ],
    );
    return res.status(201).json(rows[0]);
  } catch (err) {
    return next(err);
  }
});

// Adds the built-in interactive modules the org doesn't have yet (matched by category).
router.post('/modules/starter', authorize('admin'), async (req, res, next) => {
  try {
    const { rows: existing } = await db.query(
      'SELECT category FROM training_modules WHERE organization_id = $1',
      [req.user.organizationId],
    );
    const have = new Set(existing.map((r) => r.category));
    const toAdd = starterModules.filter((m) => !have.has(m.category));
    for (const m of toAdd) {
      await db.query(
        `INSERT INTO training_modules
           (organization_id, title, description, category, quiz, lessons, estimated_minutes)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          req.user.organizationId,
          m.title,
          m.description,
          m.category,
          json(m.quiz),
          json(m.lessons),
          m.estimatedMinutes,
        ],
      );
    }
    return res.status(201).json({ added: toAdd.length });
  } catch (err) {
    return next(err);
  }
});

router.put('/modules/:id', authorize('admin'), async (req, res, next) => {
  const { title, description, contentUrl, category, quiz, lessons, estimatedMinutes } = req.body;
  if (!title) return res.status(400).json({ message: 'title is required' });

  try {
    const { rows } = await db.query(
      `UPDATE training_modules SET title = $1, description = $2, content_url = $3, category = $4,
         quiz = $5, lessons = $6, estimated_minutes = $7
       WHERE id = $8 AND organization_id = $9
       RETURNING ${MODULE_COLUMNS}`,
      [
        title,
        description || null,
        contentUrl || null,
        category || null,
        json(quiz),
        json(lessons),
        estimatedMinutes || null,
        req.params.id,
        req.user.organizationId,
      ],
    );
    if (rows.length === 0) return res.status(404).json({ message: 'Module not found' });
    return res.json(rows[0]);
  } catch (err) {
    return next(err);
  }
});

router.delete('/modules/:id', authorize('admin'), async (req, res, next) => {
  try {
    const { rowCount } = await db.query(
      'DELETE FROM training_modules WHERE id = $1 AND organization_id = $2',
      [req.params.id, req.user.organizationId],
    );
    if (rowCount === 0) return res.status(404).json({ message: 'Module not found' });
    return res.status(204).send();
  } catch (err) {
    return next(err);
  }
});

router.get('/assignments', async (req, res, next) => {
  try {
    if (req.user.role === 'employee') {
      const { rows } = await db.query(
        `SELECT ${ASSIGNMENT_COLUMNS},
           training_modules.id AS "trainingModuleId", training_modules.title, training_modules.description,
           training_modules.content_url AS "contentUrl", training_modules.quiz,
           training_modules.lessons, training_modules.category,
           training_modules.estimated_minutes AS "estimatedMinutes"
         FROM training_assignments
         JOIN training_modules ON training_modules.id = training_assignments.training_module_id
         WHERE training_assignments.employee_id = $1
         ORDER BY training_assignments.assigned_at DESC`,
        [req.user.sub],
      );
      return res.json(rows);
    }

    const { rows } = await db.query(
      `SELECT ${ASSIGNMENT_COLUMNS},
         training_modules.id AS "trainingModuleId", training_modules.title,
         employees.id AS "employeeId", employees.full_name AS "employeeName",
         departments.name AS "departmentName"
       FROM training_assignments
       JOIN training_modules ON training_modules.id = training_assignments.training_module_id
       JOIN employees ON employees.id = training_assignments.employee_id
       LEFT JOIN departments ON departments.id = employees.department_id
       WHERE employees.organization_id = $1
       ORDER BY training_assignments.assigned_at DESC`,
      [req.user.organizationId],
    );
    return res.json(rows);
  } catch (err) {
    return next(err);
  }
});

// Assign one module to one employee, a list of employees, or a whole department.
router.post('/assign', authorize('admin'), async (req, res, next) => {
  const { employeeId, employeeIds, departmentId, trainingModuleId, dueAt } = req.body;
  if (!trainingModuleId || (!employeeId && !employeeIds?.length && !departmentId)) {
    return res
      .status(400)
      .json({ message: 'trainingModuleId and employeeId, employeeIds or departmentId are required' });
  }

  try {
    const { rows: moduleRows } = await db.query(
      'SELECT id FROM training_modules WHERE id = $1 AND organization_id = $2',
      [trainingModuleId, req.user.organizationId],
    );
    if (moduleRows.length === 0) return res.status(404).json({ message: 'Module not found' });

    let ids = employeeIds?.length ? employeeIds : employeeId ? [employeeId] : [];
    if (departmentId) {
      const { rows } = await db.query(
        'SELECT id FROM employees WHERE organization_id = $1 AND department_id = $2',
        [req.user.organizationId, departmentId],
      );
      ids = rows.map((r) => r.id);
    }
    const { rows: valid } = await db.query(
      'SELECT id FROM employees WHERE organization_id = $1 AND id = ANY($2::int[])',
      [req.user.organizationId, ids],
    );
    if (valid.length === 0) return res.status(400).json({ message: 'No employees to assign' });

    const assigned = [];
    for (const { id } of valid) {
      const { rows } = await db.query(
        `INSERT INTO training_assignments (training_module_id, employee_id, assigned_by, due_at)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (training_module_id, employee_id) DO UPDATE SET due_at = EXCLUDED.due_at
         RETURNING id, status, assigned_at AS "assignedAt", due_at AS "dueAt"`,
        [trainingModuleId, id, req.user.sub, dueAt || null],
      );
      assigned.push(rows[0]);
    }
    return res.status(201).json(employeeId && !employeeIds && !departmentId ? assigned[0] : { assigned: assigned.length });
  } catch (err) {
    return next(err);
  }
});

async function loadOwnAssignment(req, res) {
  const { rows } = await db.query(
    `SELECT training_assignments.id, training_assignments.employee_id AS "employeeId",
       training_assignments.status, training_modules.quiz, training_modules.lessons
     FROM training_assignments
     JOIN employees ON employees.id = training_assignments.employee_id
     JOIN training_modules ON training_modules.id = training_assignments.training_module_id
     WHERE training_assignments.id = $1 AND employees.organization_id = $2`,
    [req.params.id, req.user.organizationId],
  );
  if (rows.length === 0) {
    res.status(404).json({ message: 'Assignment not found' });
    return null;
  }
  if (req.user.role === 'employee' && req.user.sub !== rows[0].employeeId) {
    res.status(403).json({ message: 'Forbidden' });
    return null;
  }
  return rows[0];
}

// Saves how many lessons the employee has finished; starting a lesson marks the assignment in progress.
router.post('/assignments/:id/progress', async (req, res, next) => {
  const step = Number(req.body.lessonProgress);
  if (!Number.isInteger(step) || step < 0) {
    return res.status(400).json({ message: 'lessonProgress must be a whole number' });
  }

  try {
    const assignment = await loadOwnAssignment(req, res);
    if (!assignment) return undefined;
    const total = (assignment.lessons || []).length;

    const { rows } = await db.query(
      `UPDATE training_assignments
       SET lesson_progress = GREATEST(lesson_progress, LEAST($1::int, $2::int)),
         status = CASE WHEN status = 'assigned' THEN 'in_progress' ELSE status END
       WHERE id = $3
       RETURNING ${ASSIGNMENT_COLUMNS}`,
      [step, total, assignment.id],
    );
    return res.json(rows[0]);
  } catch (err) {
    return next(err);
  }
});

router.post('/assignments/:id/complete', async (req, res, next) => {
  const { answers } = req.body;

  try {
    const assignment = await loadOwnAssignment(req, res);
    if (!assignment) return undefined;

    const quiz = assignment.quiz || [];
    const review = quiz.map((question, i) => ({
      correctIndex: question.correctIndex,
      chosen: Array.isArray(answers) ? answers[i] : undefined,
      correct: Array.isArray(answers) && answers[i] === question.correctIndex,
    }));
    const correct = review.filter((r) => r.correct).length;
    const score = quiz.length > 0 ? correct / quiz.length : 1;
    const passed = score >= PASS_THRESHOLD;

    // Two separate query strings (not a CASE keyed off the same $1) — Postgres's
    // parameter type inference chokes on reusing $1 as both an assigned value
    // and a comparison operand in one statement ("inconsistent types deduced").
    const status = passed ? 'completed' : 'in_progress';
    const updateQuery = passed
      ? `UPDATE training_assignments SET status = $1, completed_at = now(),
           quiz_attempts = quiz_attempts + 1, last_score = $3, last_attempt_at = now()
         WHERE id = $2
         RETURNING id, status, completed_at AS "completedAt"`
      : `UPDATE training_assignments SET status = $1,
           quiz_attempts = quiz_attempts + 1, last_score = $3, last_attempt_at = now()
         WHERE id = $2
         RETURNING id, status, completed_at AS "completedAt"`;
    const { rows: updated } = await db.query(updateQuery, [status, assignment.id, score]);

    return res.json({ ...updated[0], score, passed, review });
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
module.exports.maybeAssignTraining = maybeAssignTraining;
