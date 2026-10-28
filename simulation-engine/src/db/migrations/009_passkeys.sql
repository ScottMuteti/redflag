-- Passkey (WebAuthn) sign-in. Only signed-in, existing accounts can register a
-- passkey, so every passkey belongs to a pre-approved admin or employee.
CREATE TABLE IF NOT EXISTS passkeys (
  id            SERIAL PRIMARY KEY,
  user_id       INTEGER NOT NULL,
  user_role     TEXT NOT NULL CHECK (user_role IN ('admin', 'employee')),
  credential_id TEXT NOT NULL UNIQUE, -- base64url
  public_key    BYTEA NOT NULL,
  counter       BIGINT NOT NULL DEFAULT 0,
  transports    TEXT[],
  name          TEXT NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_used_at  TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_passkeys_user ON passkeys (user_role, user_id);

-- One-time WebAuthn challenges for passkey registration and login.
CREATE TABLE IF NOT EXISTS webauthn_challenges (
  id           SERIAL PRIMARY KEY,
  challenge_id UUID NOT NULL UNIQUE,
  purpose      TEXT NOT NULL CHECK (purpose IN ('register', 'login')),
  challenge    TEXT NOT NULL,
  user_id      INTEGER,               -- set for 'register' only
  user_role    TEXT,
  expires_at   TIMESTAMPTZ NOT NULL,
  consumed_at  TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
