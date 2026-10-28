const express = require('express');
const { authenticate, authorize } = require('../../middleware/auth');
const db = require('../../config/db');
const starterModules = require('./training.starter');

const router = express.Router();
router.use(authenticate);

const PASS_THRESHOLD = 0.8;
// Questions drawn per attempt. Modules with a bigger bank get a different set on a retake.
const QUIZ_SIZE = 3;

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

// Scored lesson items: each red flag in a spot lesson, and each choice scenario.
// Read lessons are not scored.
const lessonItems = (lessons) =>
  (Array.isArray(lessons) ? lessons : []).reduce((sum, lesson) => {
    if (lesson.type === 'choice') return sum + 1;
    if (lesson.type === 'spot') {
      const flags = (lesson.message?.parts || []).filter((p) => p.flag).length;
      return sum + flags + (lesson.senderFlag ? 1 : 0);
    }
    return sum;
  }, 0);

// Lessons and quiz pooled into one score: each lesson item is worth what a quiz
// question is, and each miss counts against the lesson items.
function trainingScore({ quizCorrect, quizTotal, items, misses }) {
  const lessonScore = items > 0 ? items / (items + misses) : 1;
  const total = quizTotal + items;
  const score = total > 0 ? (quizCorrect + items * lessonScore) / total : 1;
  return { score, lessonScore, quizScore: quizTotal > 0 ? quizCorrect / quizTotal : 1 };
}

const quizLength = (quiz) => Math.min(QUIZ_SIZE, Array.isArray(quiz) ? quiz.length : 0);

function shuffle(items) {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Picks QUIZ_SIZE questions from the bank, avoiding the last attempt's questions
// where the bank allows, and shuffles each question's options. Each entry is
// { q: bank index, order: original option index for each displayed option }.
function drawQuiz(quiz, lastQuestions = []) {
  const indexes = shuffle(quiz.map((_, i) => i));
  const fresh = indexes.filter((i) => !lastQuestions.includes(i));
  const repeats = indexes.filter((i) => lastQuestions.includes(i));
  return [...fresh, ...repeats].slice(0, QUIZ_SIZE).map((q) => ({
    q,
    order: shuffle(quiz[q].options.map((_, i) => i)),
  }));
}

const servedIsValid = (served, quiz) =>
  Array.isArray(served) &&
  served.length > 0 &&
  served.every(({ q, order }) => quiz[q] && order.length === quiz[q].options.length);

// Employees get questions and options only; the answer key stays on the server.
const presentQuiz = (served, quiz) =>
  served.map(({ q, order }) => ({
    question: quiz[q].question,
    options: order.map((o) => quiz[q].options[o]),
  }));

// Auto-assigns the module for the lure the employee fell for (template
// category, e.g. 'mpesa'). Called from campaigns.routes.js event handling,
// optionally inside its transaction via `client`.
async function maybeAssignTraining(organizationId, employeeId, category, client = db) {
  if (!category) return;
  const { rows: moduleRows } = await client.query(
    'SELECT id FROM training_modules WHERE organization_id = $1 AND category = $2 LIMIT 1',
    [organizationId, category],
  );
  if (moduleRows.length === 0) {
    console.warn(`No '${category}' training module in org ${organizationId}; nothing assigned`);
    return;
  }

  await client.query(
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

// Adds the built-in interactive modules the org doesn't have yet (matched by
// category). Also run when an organisation registers. Starter modules added
// before their question bank grew get the extra questions, unless an admin
// has edited the quiz (any question not in the starter bank).
async function installStarterModules(organizationId, client = db) {
  const { rows: existing } = await client.query(
    'SELECT id, title, category, quiz FROM training_modules WHERE organization_id = $1',
    [organizationId],
  );
  for (const row of existing) {
    const starter = starterModules.find((m) => m.category === row.category && m.title === row.title);
    const quiz = Array.isArray(row.quiz) ? row.quiz : [];
    const bank = new Set(starter?.quiz.map((q) => q.question));
    if (starter && quiz.length < starter.quiz.length && quiz.every((q) => bank.has(q.question))) {
      await client.query('UPDATE training_modules SET quiz = $1 WHERE id = $2', [json(starter.quiz), row.id]);
    }
  }
  const have = new Set(existing.map((r) => r.category));
  const toAdd = starterModules.filter((m) => !have.has(m.category));
  for (const m of toAdd) {
    await client.query(
      `INSERT INTO training_modules
         (organization_id, title, description, category, quiz, lessons, estimated_minutes)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [organizationId, m.title, m.description, m.category, json(m.quiz), json(m.lessons), m.estimatedMinutes],
    );
  }
  return toAdd.length;
}

router.post('/modules/starter', authorize('admin'), async (req, res, next) => {
  try {
    const added = await installStarterModules(req.user.organizationId);
    return res.status(201).json({ added });
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
           training_modules.estimated_minutes AS "estimatedMinutes",
         training_assignments.lesson_misses AS "lessonMisses"
         FROM training_assignments
         JOIN training_modules ON training_modules.id = training_assignments.training_module_id
         WHERE training_assignments.employee_id = $1
         ORDER BY training_assignments.assigned_at DESC`,
        [req.user.sub],
      );
      return res.json(rows.map(({ quiz, ...row }) => ({ ...row, quizLength: quizLength(quiz) })));
    }

    const { rows } = await db.query(
      `SELECT ${ASSIGNMENT_COLUMNS},
         training_modules.id AS "trainingModuleId", training_modules.title,
         employees.id AS "employeeId", employees.full_name AS "employeeName",
         departments.name AS "departmentName",
         (SELECT COUNT(*)::int FROM training_quiz_attempts
           WHERE training_quiz_attempts.assignment_id = training_assignments.id
             AND NOT training_quiz_attempts.passed) AS "failedAttempts",
         training_assignments.lesson_misses + (SELECT COALESCE(SUM(lesson_misses), 0)::int
           FROM training_quiz_attempts
           WHERE training_quiz_attempts.assignment_id = training_assignments.id) AS "lessonMisses"
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
       training_assignments.status, training_assignments.quiz_served AS "quizServed",
       training_assignments.lesson_progress AS "lessonProgress",
       training_assignments.lesson_misses AS "lessonMisses",
       training_modules.quiz, training_modules.lessons
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

// Saves how many lessons the employee has finished, plus any misses made on the
// way; starting a lesson marks the assignment in progress.
router.post('/assignments/:id/progress', async (req, res, next) => {
  const step = Number(req.body.lessonProgress);
  const misses = Number(req.body.misses ?? 0);
  if (!Number.isInteger(step) || step < 0) {
    return res.status(400).json({ message: 'lessonProgress must be a whole number' });
  }
  if (!Number.isInteger(misses) || misses < 0 || misses > 100) {
    return res.status(400).json({ message: 'misses must be a whole number from 0 to 100' });
  }

  try {
    const assignment = await loadOwnAssignment(req, res);
    if (!assignment) return undefined;
    const total = (assignment.lessons || []).length;

    const { rows } = await db.query(
      `UPDATE training_assignments
       SET lesson_progress = GREATEST(lesson_progress, LEAST($1::int, $2::int)),
         lesson_misses = lesson_misses + $3::int,
         status = CASE WHEN status = 'assigned' THEN 'in_progress' ELSE status END
       WHERE id = $4
       RETURNING ${ASSIGNMENT_COLUMNS}`,
      [step, total, misses, assignment.id],
    );
    return res.json(rows[0]);
  } catch (err) {
    return next(err);
  }
});

// Starts (or resumes) a quiz attempt once the lessons are done. A fresh attempt
// draws questions that avoid the previous attempt's, so a retake is a new test
// rather than a replay.
router.post('/assignments/:id/quiz', async (req, res, next) => {
  try {
    const assignment = await loadOwnAssignment(req, res);
    if (!assignment) return undefined;
    if (assignment.status === 'completed') {
      return res.status(400).json({ message: 'Module already completed' });
    }

    if (assignment.lessonProgress < (assignment.lessons || []).length) {
      return res.status(409).json({ message: 'Finish the lessons first' });
    }

    const quiz = assignment.quiz || [];
    if (quiz.length === 0) return res.json({ questions: [] });
    if (servedIsValid(assignment.quizServed, quiz)) {
      return res.json({ questions: presentQuiz(assignment.quizServed, quiz) });
    }

    const { rows: last } = await db.query(
      `SELECT questions FROM training_quiz_attempts
       WHERE assignment_id = $1 ORDER BY id DESC LIMIT 1`,
      [assignment.id],
    );
    const served = drawQuiz(quiz, last[0]?.questions || []);
    await db.query(
      `UPDATE training_assignments SET quiz_served = $1,
         status = CASE WHEN status = 'assigned' THEN 'in_progress' ELSE status END
       WHERE id = $2`,
      [json(served), assignment.id],
    );
    return res.json({ questions: presentQuiz(served, quiz) });
  } catch (err) {
    return next(err);
  }
});

// Grades the attempt in progress: lesson misses and quiz answers together. Every
// attempt is logged with its misses. A fail marks the assignment 'failed' and
// sends the employee back through the lessons, with misses counted afresh.
router.post('/assignments/:id/complete', async (req, res, next) => {
  const { answers } = req.body;

  try {
    const assignment = await loadOwnAssignment(req, res);
    if (!assignment) return undefined;
    if (assignment.status === 'completed') {
      return res.status(400).json({ message: 'Module already completed' });
    }

    const quiz = assignment.quiz || [];
    const served = quiz.length > 0 ? assignment.quizServed : [];
    if (quiz.length > 0 && !servedIsValid(served, quiz)) {
      return res.status(409).json({ message: 'Start the quiz first' });
    }

    const review = served.map(({ q, order }, i) => {
      const chosen = Array.isArray(answers) ? answers[i] : undefined;
      return {
        question: quiz[q].question,
        options: order.map((o) => quiz[q].options[o]),
        chosen,
        correctIndex: order.indexOf(quiz[q].correctIndex),
        correct: Number.isInteger(chosen) && order[chosen] === quiz[q].correctIndex,
      };
    });
    const correct = review.filter((r) => r.correct).length;
    const items = lessonItems(assignment.lessons);
    const misses = assignment.lessonMisses || 0;
    const { score, lessonScore, quizScore } = trainingScore({
      quizCorrect: correct,
      quizTotal: review.length,
      items,
      misses,
    });
    const passed = score >= PASS_THRESHOLD;
    // Reveal correct answers only once passed, so a retake still tests knowledge.
    if (!passed) review.forEach((r) => delete r.correctIndex);

    // Two separate query strings (not a CASE keyed off the same $1) — Postgres's
    // parameter type inference chokes on reusing $1 as both an assigned value
    // and a comparison operand in one statement ("inconsistent types deduced").
    const status = passed ? 'completed' : 'failed';
    const updateQuery = passed
      ? `UPDATE training_assignments SET status = $1, completed_at = now(), quiz_served = NULL,
           lesson_misses = 0, quiz_attempts = quiz_attempts + 1, last_score = $3, last_attempt_at = now()
         WHERE id = $2
         RETURNING id, status, completed_at AS "completedAt"`
      : `UPDATE training_assignments SET status = $1, quiz_served = NULL,
           lesson_misses = 0, lesson_progress = 0, quiz_attempts = quiz_attempts + 1, last_score = $3, last_attempt_at = now()
         WHERE id = $2
         RETURNING id, status, completed_at AS "completedAt"`;
    const { rows: updated } = await db.query(updateQuery, [status, assignment.id, score]);
    await db.query(
      `INSERT INTO training_quiz_attempts
         (assignment_id, questions, answers, wrong, score, passed, lesson_items, lesson_misses)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        assignment.id,
        served.map(({ q }) => q),
        json(Array.isArray(answers) ? answers : null),
        review.length - correct,
        score,
        passed,
        items,
        misses,
      ],
    );

    return res.json({
      ...updated[0],
      score,
      passed,
      quizScore,
      lessonScore,
      lessonItems: items,
      lessonMisses: misses,
      review,
    });
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
module.exports.maybeAssignTraining = maybeAssignTraining;
module.exports.installStarterModules = installStarterModules;
