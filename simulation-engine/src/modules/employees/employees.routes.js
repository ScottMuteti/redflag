const express = require('express');
const bcrypt = require('bcrypt');
const { authenticate, authorize } = require('../../middleware/auth');
const db = require('../../config/db');

const router = express.Router();
const SALT_ROUNDS = 10;

const EMPLOYEE_COLUMNS = `
  employees.id, employees.full_name AS "fullName", employees.email,
  employees.phone_number AS "phoneNumber", employees.job_title AS "jobTitle",
  employees.hire_date AS "hireDate", employees.department_id AS "departmentId",
  departments.name AS "departmentName", employees.created_at AS "createdAt"
`;

router.use(authenticate);

async function upsertDepartment(organizationId, departmentName) {
  if (!departmentName) return null;
  const { rows } = await db.query(
    `INSERT INTO departments (organization_id, name) VALUES ($1, $2)
     ON CONFLICT (organization_id, name) DO UPDATE SET name = EXCLUDED.name
     RETURNING id`,
    [organizationId, departmentName],
  );
  return rows[0].id;
}

router.get('/departments', authorize('admin'), async (req, res, next) => {
  try {
    const { rows } = await db.query(
      'SELECT id, name FROM departments WHERE organization_id = $1 ORDER BY name',
      [req.user.organizationId],
    );
    return res.json(rows);
  } catch (err) {
    return next(err);
  }
});

router.get('/', authorize('admin'), async (req, res, next) => {
  try {
    const { departmentId } = req.query;
    const params = [req.user.organizationId];
    let filter = '';
    if (departmentId) {
      params.push(departmentId);
      filter = 'AND employees.department_id = $2';
    }
    const { rows } = await db.query(
      `SELECT ${EMPLOYEE_COLUMNS}
       FROM employees
       LEFT JOIN departments ON departments.id = employees.department_id
       WHERE employees.organization_id = $1 ${filter}
       ORDER BY employees.full_name`,
      params,
    );
    return res.json(rows);
  } catch (err) {
    return next(err);
  }
});

router.post('/', authorize('admin'), async (req, res, next) => {
  const { fullName, email, phoneNumber, jobTitle, hireDate, departmentName, initialPassword } = req.body;

  if (!fullName || !email || !initialPassword) {
    return res.status(400).json({ message: 'fullName, email and initialPassword are required' });
  }
  if (initialPassword.length < 8) {
    return res.status(400).json({ message: 'initialPassword must be at least 8 characters' });
  }

  try {
    const departmentId = await upsertDepartment(req.user.organizationId, departmentName);
    const passwordHash = await bcrypt.hash(initialPassword, SALT_ROUNDS);

    const { rows } = await db.query(
      `INSERT INTO employees
         (organization_id, department_id, full_name, email, phone_number, job_title, hire_date, password_hash)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id, full_name AS "fullName", email, phone_number AS "phoneNumber",
         job_title AS "jobTitle", hire_date AS "hireDate", department_id AS "departmentId",
         created_at AS "createdAt"`,
      [req.user.organizationId, departmentId, fullName, email, phoneNumber || null, jobTitle || null, hireDate || null, passwordHash],
    );

    return res.status(201).json(rows[0]);
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ message: 'email is already in use' });
    }
    return next(err);
  }
});

router.get('/:id', async (req, res, next) => {
  const employeeId = Number(req.params.id);
  if (req.user.role === 'employee' && req.user.sub !== employeeId) {
    return res.status(403).json({ message: 'Forbidden' });
  }

  try {
    const { rows } = await db.query(
      `SELECT ${EMPLOYEE_COLUMNS}
       FROM employees
       LEFT JOIN departments ON departments.id = employees.department_id
       WHERE employees.id = $1 AND employees.organization_id = $2`,
      [employeeId, req.user.organizationId],
    );
    if (rows.length === 0) return res.status(404).json({ message: 'Employee not found' });
    return res.json(rows[0]);
  } catch (err) {
    return next(err);
  }
});

router.put('/:id', authorize('admin'), async (req, res, next) => {
  const employeeId = Number(req.params.id);
  const { fullName, phoneNumber, jobTitle, hireDate, departmentName } = req.body;

  try {
    const departmentId = departmentName !== undefined ? await upsertDepartment(req.user.organizationId, departmentName) : undefined;

    const fields = [];
    const params = [];
    let i = 1;
    const set = (column, value) => {
      fields.push(`${column} = $${i}`);
      params.push(value);
      i += 1;
    };
    if (fullName !== undefined) set('full_name', fullName);
    if (phoneNumber !== undefined) set('phone_number', phoneNumber);
    if (jobTitle !== undefined) set('job_title', jobTitle);
    if (hireDate !== undefined) set('hire_date', hireDate);
    if (departmentId !== undefined) set('department_id', departmentId);

    if (fields.length === 0) {
      return res.status(400).json({ message: 'No updatable fields provided' });
    }

    params.push(employeeId, req.user.organizationId);
    const { rows } = await db.query(
      `UPDATE employees SET ${fields.join(', ')}
       WHERE id = $${i} AND organization_id = $${i + 1}
       RETURNING id, full_name AS "fullName", email, phone_number AS "phoneNumber",
         job_title AS "jobTitle", hire_date AS "hireDate", department_id AS "departmentId"`,
      params,
    );
    if (rows.length === 0) return res.status(404).json({ message: 'Employee not found' });
    return res.json(rows[0]);
  } catch (err) {
    return next(err);
  }
});

router.put('/:id/password', authorize('admin'), async (req, res, next) => {
  const { newPassword } = req.body;
  if (!newPassword || newPassword.length < 8) {
    return res.status(400).json({ message: 'newPassword must be at least 8 characters' });
  }

  try {
    const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
    const { rowCount } = await db.query(
      'UPDATE employees SET password_hash = $1 WHERE id = $2 AND organization_id = $3',
      [passwordHash, req.params.id, req.user.organizationId],
    );
    if (rowCount === 0) return res.status(404).json({ message: 'Employee not found' });
    return res.status(204).send();
  } catch (err) {
    return next(err);
  }
});

router.delete('/:id', authorize('admin'), async (req, res, next) => {
  try {
    const { rowCount } = await db.query(
      'DELETE FROM employees WHERE id = $1 AND organization_id = $2',
      [req.params.id, req.user.organizationId],
    );
    if (rowCount === 0) return res.status(404).json({ message: 'Employee not found' });
    return res.status(204).send();
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
