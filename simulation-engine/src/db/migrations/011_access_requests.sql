-- Self sign-up is closed: organisations ask for access and a platform admin
-- approves (which onboards the org and invites its admin) or declines.
CREATE TABLE IF NOT EXISTS access_requests (
  id                SERIAL PRIMARY KEY,
  organization_name VARCHAR(255) NOT NULL,
  industry          VARCHAR(100),
  county            VARCHAR(100),
  contact_name      VARCHAR(255) NOT NULL,
  contact_email     VARCHAR(255) NOT NULL,
  phone_number      VARCHAR(20),
  employee_count    INTEGER,
  message           TEXT,
  status            TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'declined')),
  organization_id   INTEGER REFERENCES organizations (id) ON DELETE SET NULL, -- set on approval
  reviewed_by       INTEGER REFERENCES system_admins (id) ON DELETE SET NULL,
  reviewed_at       TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_access_requests_status ON access_requests (status, created_at);
