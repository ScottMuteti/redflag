// Demo organisation with history, for local previews. Run: npm run seed:demo
// Skips if the demo org already exists.
require('dotenv').config();
const bcrypt = require('bcrypt');
const db = require('../config/db');
const { migrate } = require('./migrate');
const starterModules = require('../modules/training/training.starter');

const ORG = 'Demo Sacco Ltd';
const ADMIN = { name: 'Demo Admin', email: 'admin@demo.redflag', password: 'Demo1234!' };
const EMPLOYEE_PASSWORD = 'Employee123!';
const SYSTEM_ADMIN = { name: 'Platform Admin', email: 'system@demo.redflag', password: 'Demo1234!' };

const PEOPLE = [
  ['Jane Wanjiku', 'Finance', 'Accountant', '+254700000101', 2019],
  ['Peter Mwangi', 'Finance', 'Payments Officer', '+254700000102', 2023],
  ['Amina Odhiambo', 'Operations', 'Branch Manager', '+254700000103', 2016],
  ['Brian Otieno', 'Operations', 'Teller', '+254700000104', 2024],
  ['Grace Achieng', 'HR', 'HR Officer', '+254700000105', 2021],
  ['Kevin Kiprop', 'IT', 'Systems Admin', '+254700000106', 2018],
  ['Mary Njeri', 'Customer Care', 'Agent', '+254700000107', 2025],
  ['Samuel Kamau', 'Customer Care', 'Team Lead', '+254700000108', 2020],
  ['Faith Chebet', 'Finance', 'Credit Analyst', '+254700000109', 2022],
  ['David Mutua', 'Operations', 'Loans Officer', '+254700000110', 2017],
];

const CAMPAIGNS = [
  ['KRA notice drill', 'email', 'kra-notice', 'hard', 70],
  ['M-Pesa alert drill', 'sms', 'mpesa-alert', 'medium', 49],
  ['Safaricom verification', 'email', 'safaricom-impersonation', 'easy', 28],
  ['Invoice fraud test', 'email', 'invoice-fraud', 'hard', 14],
];

const daysAgo = (d, hours = 0) => new Date(Date.now() - d * 86400000 + hours * 3600000);
// Deterministic pseudo-random so reruns on a fresh DB look the same.
let seed = 7;
const rand = () => {
  seed = (seed * 9301 + 49297) % 233280;
  return seed / 233280;
};

async function run() {
  await migrate();
  // Demo platform admin, created even when the demo org already exists.
  const { rowCount } = await db.query(
    `INSERT INTO system_admins (full_name, email, password_hash) VALUES ($1, $2, $3)
     ON CONFLICT (email) DO NOTHING`,
    [SYSTEM_ADMIN.name, SYSTEM_ADMIN.email, await bcrypt.hash(SYSTEM_ADMIN.password, 10)],
  );
  if (rowCount) console.log(`  System admin: ${SYSTEM_ADMIN.email} / ${SYSTEM_ADMIN.password}`);
  const { rows: existing } = await db.query('SELECT id FROM organizations WHERE name = $1', [ORG]);
  if (existing.length) {
    console.log(`"${ORG}" already exists, nothing to do.`);
    return;
  }

  const client = await db.getClient();
  try {
    await client.query('BEGIN');
    const q = (text, params) => client.query(text, params);

    const orgId = (
      await q(
        "INSERT INTO organizations (name, industry, county) VALUES ($1, 'Financial services', 'Nairobi') RETURNING id",
        [ORG],
      )
    ).rows[0].id;
    const adminId = (
      await q(
        'INSERT INTO admin_users (organization_id, full_name, email, password_hash) VALUES ($1, $2, $3, $4) RETURNING id',
        [orgId, ADMIN.name, ADMIN.email, await bcrypt.hash(ADMIN.password, 10)],
      )
    ).rows[0].id;

    const employeeHash = await bcrypt.hash(EMPLOYEE_PASSWORD, 10);
    const departments = {};
    const employees = [];
    for (const [name, dept, title, phone, year] of PEOPLE) {
      if (!departments[dept]) {
        departments[dept] = (
          await q('INSERT INTO departments (organization_id, name) VALUES ($1, $2) RETURNING id', [
            orgId,
            dept,
          ])
        ).rows[0].id;
      }
      const email = `${name.split(' ')[0].toLowerCase()}@demo.redflag`;
      const { rows } = await q(
        `INSERT INTO employees (organization_id, department_id, full_name, email, phone_number, job_title, hire_date, password_hash)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
        [orgId, departments[dept], name, email, phone, title, `${year}-03-01`, employeeHash],
      );
      // Newer staff are more susceptible in the demo data.
      employees.push({ id: rows[0].id, email, risk: 0.25 + (year - 2016) * 0.06 });
    }

    const modules = {};
    for (const m of starterModules) {
      modules[m.category] = (
        await q(
          `INSERT INTO training_modules (organization_id, title, description, category, quiz, lessons, estimated_minutes)
           VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
          [orgId, m.title, m.description, m.category, JSON.stringify(m.quiz), JSON.stringify(m.lessons), m.estimatedMinutes],
        )
      ).rows[0].id;
    }
    const CATEGORY = { 'kra-notice': 'kra', 'mpesa-alert': 'mpesa', 'safaricom-impersonation': 'safaricom', 'invoice-fraud': 'invoice' };

    let wave = 0;
    for (const [name, type, templateKey, difficulty, ago] of CAMPAIGNS) {
      const launched = daysAgo(ago);
      const campaignId = (
        await q(
          `INSERT INTO simulation_campaigns (organization_id, created_by, name, type, template_key, difficulty_level,
             status, launched_at, completed_at, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, 'completed', $7, $8, $9) RETURNING id`,
          [orgId, adminId, name, type, templateKey, difficulty, launched, daysAgo(ago - 5), daysAgo(ago + 1)],
        )
      ).rows[0].id;

      for (const emp of employees) {
        // Susceptibility falls with each wave as training takes effect.
        const p = Math.max(0.05, emp.risk - wave * 0.08);
        const opened = rand() < 0.85;
        const clicked = opened && rand() < p;
        const submitted = clicked && rand() < 0.5;
        const reported = !clicked && rand() < 0.3 + wave * 0.1;
        const attemptId = (
          await q(
            `INSERT INTO simulation_attempts (campaign_id, employee_id, sent_at, opened_at, clicked_at,
               submitted_credentials_at, reported_at, created_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $3) RETURNING id`,
            [
              campaignId,
              emp.id,
              launched,
              opened ? daysAgo(ago, 2) : null,
              clicked ? daysAgo(ago, 3) : null,
              submitted ? daysAgo(ago, 3.2) : null,
              reported ? daysAgo(ago, 4) : null,
            ],
          )
        ).rows[0].id;

        if (reported) {
          await q(
            `INSERT INTO phishing_reports (organization_id, employee_id, attempt_id, channel, sender, subject, created_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [orgId, emp.id, attemptId, type, type === 'sms' ? 'Unknown number' : 'Suspicious sender', name, daysAgo(ago, 4)],
          );
        }
        if (clicked) {
          const done = ago > 30 && rand() < 0.7;
          await q(
            `INSERT INTO training_assignments (training_module_id, employee_id, assigned_at, due_at, status,
               completed_at, lesson_progress, quiz_attempts, last_score, last_attempt_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $6)
             ON CONFLICT (training_module_id, employee_id) DO NOTHING`,
            [
              modules[CATEGORY[templateKey]],
              emp.id,
              daysAgo(ago, 3),
              daysAgo(ago - 14),
              done ? 'completed' : 'assigned',
              done ? daysAgo(ago - 3) : null,
              done ? 3 : 0,
              done ? 1 : 0,
              done ? 1 : null,
            ],
          );
        }
      }

      // A score per employee after each wave, so trends have history.
      for (const emp of employees) {
        const score = Math.min(0.95, Math.max(0.05, emp.risk - wave * 0.07 + (rand() - 0.5) * 0.1));
        const level = score < 0.33 ? 'low' : score < 0.66 ? 'medium' : 'high';
        await q(
          `INSERT INTO susceptibility_scores (employee_id, campaign_id, score, risk_level, model_version, computed_at)
           VALUES ($1, $2, $3, $4, 'demo-seed', $5)`,
          [emp.id, campaignId, score.toFixed(4), level, daysAgo(ago - 6)],
        );
      }
      wave += 1;
    }

    await q(
      `INSERT INTO simulation_campaigns (organization_id, created_by, name, type, template_key, difficulty_level, status)
       VALUES ($1, $2, 'Q4 M-Pesa follow-up', 'sms', 'mpesa-alert', 'medium', 'draft')`,
      [orgId, adminId],
    );

    await client.query('COMMIT');
    console.log(`Seeded "${ORG}".`);
    console.log(`  Admin:    ${ADMIN.email} / ${ADMIN.password}`);
    console.log(`  Employee: brian@demo.redflag / ${EMPLOYEE_PASSWORD} (any *@demo.redflag)`);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

run()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Seed failed:', err.message);
    process.exit(1);
  });
