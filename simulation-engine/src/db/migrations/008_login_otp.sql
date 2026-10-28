-- Mandatory email one-time-password (2FA) on login, for both admins and employees.
-- A row is a pending login challenge: password was correct, awaiting the emailed code.
CREATE TABLE IF NOT EXISTS login_otps (
  id              SERIAL PRIMARY KEY,
  challenge_id    UUID NOT NULL UNIQUE,
  user_id         INTEGER NOT NULL,
  user_role       TEXT NOT NULL CHECK (user_role IN ('admin', 'employee')),
  organization_id INTEGER NOT NULL,
  email           TEXT NOT NULL,
  code_hash       TEXT NOT NULL,      -- bcrypt of the 6-digit code; the code itself is never stored
  expires_at      TIMESTAMPTZ NOT NULL,
  attempts        INTEGER NOT NULL DEFAULT 0,
  consumed_at     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_login_otps_challenge ON login_otps (challenge_id);
CREATE INDEX IF NOT EXISTS idx_login_otps_expires ON login_otps (expires_at);
