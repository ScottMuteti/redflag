-- Additions made after the first schema, before migrations were tracked.
-- Statements stay idempotent so legacy databases can apply them safely.

ALTER TABLE campaign_templates
  ADD COLUMN IF NOT EXISTS difficulty_level VARCHAR(10) NOT NULL DEFAULT 'medium';

UPDATE campaign_templates SET difficulty_level = 'hard'
  WHERE organization_id IS NULL AND key IN ('kra-notice', 'invoice-fraud') AND difficulty_level = 'medium';
UPDATE campaign_templates SET difficulty_level = 'easy'
  WHERE organization_id IS NULL AND key = 'safaricom-impersonation' AND difficulty_level = 'medium';

ALTER TABLE simulation_campaigns
  ADD COLUMN IF NOT EXISTS department_id INTEGER REFERENCES departments (id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS launched_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;

ALTER TABLE training_assignments
  ADD COLUMN IF NOT EXISTS quiz_attempts INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_score NUMERIC(5, 4),
  ADD COLUMN IF NOT EXISTS last_attempt_at TIMESTAMPTZ;

-- Suspicious messages employees flag. attempt_id is set when the report
-- matches a simulation they were sent.
CREATE TABLE IF NOT EXISTS phishing_reports (
  id SERIAL PRIMARY KEY,
  organization_id INTEGER NOT NULL REFERENCES organizations (id) ON DELETE CASCADE,
  employee_id INTEGER NOT NULL REFERENCES employees (id) ON DELETE CASCADE,
  attempt_id INTEGER REFERENCES simulation_attempts (id) ON DELETE SET NULL,
  channel VARCHAR(10) NOT NULL CHECK (channel IN ('email', 'sms', 'call', 'other')),
  sender VARCHAR(255),
  subject VARCHAR(255),
  details TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_reports_org ON phishing_reports (organization_id);
CREATE INDEX IF NOT EXISTS idx_reports_employee ON phishing_reports (employee_id);

-- Interactive lessons shown before a module's quiz, and how far each employee got.
ALTER TABLE training_modules
  ADD COLUMN IF NOT EXISTS lessons JSONB,
  ADD COLUMN IF NOT EXISTS estimated_minutes INTEGER;

ALTER TABLE training_assignments
  ADD COLUMN IF NOT EXISTS lesson_progress INTEGER NOT NULL DEFAULT 0;

ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;
