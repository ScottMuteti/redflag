-- Platform (system) administrators: run RedFlag itself, not an organisation.
-- Created from the CLI (`npm run create:system-admin`), never by sign-up.
CREATE TABLE IF NOT EXISTS system_admins (
  id            SERIAL PRIMARY KEY,
  full_name     VARCHAR(255) NOT NULL,
  email         VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role          VARCHAR(20) NOT NULL DEFAULT 'system_admin' CHECK (role = 'system_admin'),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Login challenges and passkeys can now belong to a system admin (no organisation).
ALTER TABLE login_otps ALTER COLUMN organization_id DROP NOT NULL;
ALTER TABLE login_otps DROP CONSTRAINT IF EXISTS login_otps_user_role_check;
ALTER TABLE login_otps ADD CONSTRAINT login_otps_user_role_check
  CHECK (user_role IN ('admin', 'employee', 'system_admin'));
ALTER TABLE passkeys DROP CONSTRAINT IF EXISTS passkeys_user_role_check;
ALTER TABLE passkeys ADD CONSTRAINT passkeys_user_role_check
  CHECK (user_role IN ('admin', 'employee', 'system_admin'));

-- A suspended organisation's admins and employees cannot log in.
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS suspended_at TIMESTAMPTZ;

-- Self-service password reset, also used to invite a newly onboarded admin.
CREATE TABLE IF NOT EXISTS password_resets (
  id          SERIAL PRIMARY KEY,
  token_hash  TEXT NOT NULL UNIQUE, -- sha256 of the emailed token; the token itself is never stored
  user_id     INTEGER NOT NULL,
  user_role   TEXT NOT NULL CHECK (user_role IN ('admin', 'employee', 'system_admin')),
  expires_at  TIMESTAMPTZ NOT NULL,
  consumed_at TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Send-time jitter: spread a campaign's messages over a window instead of
-- sending every one at the same moment.
ALTER TABLE simulation_campaigns
  ADD COLUMN IF NOT EXISTS send_window_minutes INTEGER NOT NULL DEFAULT 0
    CHECK (send_window_minutes BETWEEN 0 AND 1440);
ALTER TABLE simulation_attempts
  ADD COLUMN IF NOT EXISTS send_after TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS send_failed_at TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS idx_attempts_pending_send
  ON simulation_attempts (send_after) WHERE sent_at IS NULL AND send_failed_at IS NULL;
