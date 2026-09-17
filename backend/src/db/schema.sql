-- RedFlag core schema (3NF), multi-tenant at the organization level.
-- Every tenant-scoped table carries organization_id (directly or via a
-- foreign key chain) so row-level access can be filtered per organization.

CREATE TABLE organizations (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
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
  status VARCHAR(20) NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'scheduled', 'running', 'completed')),
  scheduled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE simulation_attempts (
  id SERIAL PRIMARY KEY,
  campaign_id INTEGER NOT NULL REFERENCES simulation_campaigns (id) ON DELETE CASCADE,
  employee_id INTEGER NOT NULL REFERENCES employees (id) ON DELETE CASCADE,
  sent_at TIMESTAMPTZ,
  opened_at TIMESTAMPTZ,
  clicked_at TIMESTAMPTZ,
  submitted_credentials_at TIMESTAMPTZ,
  reported_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (campaign_id, employee_id)
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

CREATE INDEX idx_admin_users_org ON admin_users (organization_id);
CREATE INDEX idx_departments_org ON departments (organization_id);
CREATE INDEX idx_employees_org ON employees (organization_id);
CREATE INDEX idx_campaigns_org ON simulation_campaigns (organization_id);
CREATE INDEX idx_attempts_campaign ON simulation_attempts (campaign_id);
CREATE INDEX idx_attempts_employee ON simulation_attempts (employee_id);
CREATE INDEX idx_scores_employee ON susceptibility_scores (employee_id);
