-- RedFlag core schema (3NF), multi-tenant at the organization level.
-- Every tenant-scoped table carries organization_id (directly or via a
-- foreign key chain) so row-level access can be filtered per organization.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE organizations (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL UNIQUE,
  industry VARCHAR(100),
  county VARCHAR(100),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE admin_users (
  id SERIAL PRIMARY KEY,
  organization_id INTEGER NOT NULL REFERENCES organizations (id) ON DELETE CASCADE,
  full_name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(20) NOT NULL DEFAULT 'admin' CHECK (role = 'admin'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE departments (
  id SERIAL PRIMARY KEY,
  organization_id INTEGER NOT NULL REFERENCES organizations (id) ON DELETE CASCADE,
  name VARCHAR(150) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, name)
);

CREATE TABLE employees (
  id SERIAL PRIMARY KEY,
  organization_id INTEGER NOT NULL REFERENCES organizations (id) ON DELETE CASCADE,
  department_id INTEGER REFERENCES departments (id) ON DELETE SET NULL,
  full_name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  phone_number VARCHAR(20),
  job_title VARCHAR(150),
  hire_date DATE,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(20) NOT NULL DEFAULT 'employee' CHECK (role = 'employee'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE simulation_campaigns (
  id SERIAL PRIMARY KEY,
  organization_id INTEGER NOT NULL REFERENCES organizations (id) ON DELETE CASCADE,
  created_by INTEGER NOT NULL REFERENCES admin_users (id),
  name VARCHAR(255) NOT NULL,
  type VARCHAR(10) NOT NULL CHECK (type IN ('email', 'sms')),
  template_key VARCHAR(100),
  difficulty_level VARCHAR(10) NOT NULL DEFAULT 'medium'
    CHECK (difficulty_level IN ('easy', 'medium', 'hard')),
  gophish_campaign_id INTEGER,
  status VARCHAR(20) NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'scheduled', 'running', 'completed')),
  scheduled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE simulation_attempts (
  id SERIAL PRIMARY KEY,
  campaign_id INTEGER NOT NULL REFERENCES simulation_campaigns (id) ON DELETE CASCADE,
  employee_id INTEGER NOT NULL REFERENCES employees (id) ON DELETE CASCADE,
  tracking_token UUID NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  sent_at TIMESTAMPTZ,
  opened_at TIMESTAMPTZ,
  clicked_at TIMESTAMPTZ,
  submitted_credentials_at TIMESTAMPTZ,
  reported_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (campaign_id, employee_id)
);

CREATE TABLE campaign_templates (
  id SERIAL PRIMARY KEY,
  organization_id INTEGER REFERENCES organizations (id) ON DELETE CASCADE,
  type VARCHAR(10) NOT NULL CHECK (type IN ('email', 'sms')),
  key VARCHAR(100) NOT NULL,
  name VARCHAR(255) NOT NULL,
  subject VARCHAR(255),
  body TEXT NOT NULL,
  category VARCHAR(100),
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, key)
);

CREATE TABLE susceptibility_scores (
  id SERIAL PRIMARY KEY,
  employee_id INTEGER NOT NULL REFERENCES employees (id) ON DELETE CASCADE,
  campaign_id INTEGER REFERENCES simulation_campaigns (id) ON DELETE SET NULL,
  score NUMERIC(5, 4) NOT NULL CHECK (score >= 0 AND score <= 1),
  risk_level VARCHAR(10) NOT NULL CHECK (risk_level IN ('low', 'medium', 'high')),
  model_version VARCHAR(50) NOT NULL,
  computed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE training_modules (
  id SERIAL PRIMARY KEY,
  organization_id INTEGER NOT NULL REFERENCES organizations (id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  content_url VARCHAR(500),
  category VARCHAR(100),
  quiz JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE training_assignments (
  id SERIAL PRIMARY KEY,
  training_module_id INTEGER NOT NULL REFERENCES training_modules (id) ON DELETE CASCADE,
  employee_id INTEGER NOT NULL REFERENCES employees (id) ON DELETE CASCADE,
  assigned_by INTEGER REFERENCES admin_users (id) ON DELETE SET NULL,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  due_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  status VARCHAR(20) NOT NULL DEFAULT 'assigned'
    CHECK (status IN ('assigned', 'in_progress', 'completed', 'overdue')),
  UNIQUE (training_module_id, employee_id)
);

CREATE INDEX idx_admin_users_org ON admin_users (organization_id);
CREATE INDEX idx_departments_org ON departments (organization_id);
CREATE INDEX idx_employees_org ON employees (organization_id);
CREATE INDEX idx_campaigns_org ON simulation_campaigns (organization_id);
CREATE INDEX idx_attempts_campaign ON simulation_attempts (campaign_id);
CREATE INDEX idx_attempts_employee ON simulation_attempts (employee_id);
CREATE INDEX idx_scores_employee ON susceptibility_scores (employee_id);
CREATE INDEX idx_training_modules_org ON training_modules (organization_id);
CREATE INDEX idx_training_assignments_module ON training_assignments (training_module_id);
CREATE INDEX idx_training_assignments_employee ON training_assignments (employee_id);
CREATE INDEX idx_campaign_templates_org ON campaign_templates (organization_id);

-- Default Kenya-specific simulation templates, shared across all organizations
-- (organization_id IS NULL). Admins can add org-specific templates alongside these.
--
-- SMS templates use our own {{link}} placeholder, substituted manually in
-- campaigns.routes.js with each employee's tracking URL (Africa's Talking is
-- a plain SMS gateway with no template engine of its own). Email templates
-- use Gophish's own {{.URL}} merge field instead — Gophish substitutes it
-- per-recipient itself when the campaign is sent, and its template parser
-- rejects a bare, undotted {{link}} as invalid Go template syntax.
INSERT INTO campaign_templates (organization_id, type, key, name, subject, body, category, is_default) VALUES
  (NULL, 'sms', 'mpesa-alert', 'M-Pesa Account Alert',
   NULL,
   'M-PESA: Your account has been temporarily suspended due to unusual activity. Verify now to avoid deactivation: {{link}}',
   'mpesa', true),
  (NULL, 'email', 'safaricom-impersonation', 'Safaricom Account Verification',
   'Action Required: Verify Your Safaricom Account',
   '<p>Dear Customer,</p><p>We have detected unusual activity on your Safaricom account. To avoid suspension, please verify your details immediately by clicking the link below.</p><p><a href="{{.URL}}">Verify My Account</a></p><p>Safaricom Customer Care</p>',
   'safaricom', true),
  (NULL, 'email', 'kra-notice', 'KRA Tax Compliance Notice',
   'URGENT: KRA Tax Compliance Notice',
   '<p>Dear Taxpayer,</p><p>Kenya Revenue Authority records indicate an outstanding compliance issue on your PIN. Failure to resolve this within 48 hours may result in penalties.</p><p><a href="{{.URL}}">Resolve Now</a></p><p>Kenya Revenue Authority</p>',
   'kra', true),
  (NULL, 'email', 'invoice-fraud', 'Overdue Invoice Notice',
   'Overdue Invoice - Immediate Payment Required',
   '<p>Dear Accounts Team,</p><p>Please find attached the overdue invoice for services rendered. Kindly review and process payment via the link below to avoid service interruption.</p><p><a href="{{.URL}}">Review Invoice</a></p>',
   'invoice', true);
