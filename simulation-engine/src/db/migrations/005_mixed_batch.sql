-- Mixed-batch sending: a campaign can draw from a pool of templates and give
-- each recipient a different one, so a department/org drill does not land as the
-- same message to everyone.

-- Which template variant each recipient actually received (for attribution).
ALTER TABLE simulation_attempts
  ADD COLUMN IF NOT EXISTS template_key VARCHAR(100);

-- The pool of template keys for a mixed-batch campaign. When NULL/empty the
-- campaign behaves as before, sending its single template_key to everyone.
ALTER TABLE simulation_campaigns
  ADD COLUMN IF NOT EXISTS template_pool TEXT[];

-- An email mixed batch needs one Gophish campaign per distinct template (Gophish
-- sends a single template per campaign), so a campaign may map to several Gophish
-- campaign ids. SMS sends per-recipient from the engine and needs no rows here.
CREATE TABLE IF NOT EXISTS campaign_gophish_sends (
  id SERIAL PRIMARY KEY,
  campaign_id INTEGER NOT NULL REFERENCES simulation_campaigns(id) ON DELETE CASCADE,
  gophish_campaign_id INTEGER NOT NULL,
  template_key VARCHAR(100) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_campaign_gophish_sends_gophish
  ON campaign_gophish_sends(gophish_campaign_id);
