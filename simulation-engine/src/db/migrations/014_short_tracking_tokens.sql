-- Short, hyphenated click tokens so the whole link fits in an SMS bubble.
-- 48 random bits; links already sent keep their existing token.
CREATE OR REPLACE FUNCTION new_tracking_token() RETURNS text
LANGUAGE sql VOLATILE AS $$
  SELECT substr(t, 1, 4) || '-' || substr(t, 5, 4) || '-' || substr(t, 9, 4)
  FROM (SELECT replace(gen_random_uuid()::text, '-', '')) AS x(t)
$$;

ALTER TABLE simulation_attempts ALTER COLUMN tracking_token DROP DEFAULT;
ALTER TABLE simulation_attempts ALTER COLUMN tracking_token TYPE text USING tracking_token::text;
ALTER TABLE simulation_attempts ALTER COLUMN tracking_token SET DEFAULT new_tracking_token();
