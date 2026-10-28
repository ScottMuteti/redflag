-- Who confirmed the campaign targets only authorised, enrolled employees, and when.
ALTER TABLE simulation_campaigns
  ADD COLUMN authorised_by INTEGER REFERENCES admin_users (id) ON DELETE SET NULL,
  ADD COLUMN authorised_at TIMESTAMPTZ,
  ADD COLUMN failure_reason TEXT;

-- A launch that could not reach Gophish / Africa's Talking is shown as failed.
ALTER TABLE simulation_campaigns DROP CONSTRAINT IF EXISTS simulation_campaigns_status_check;
ALTER TABLE simulation_campaigns ADD CONSTRAINT simulation_campaigns_status_check
  CHECK (status IN ('draft', 'scheduled', 'launching', 'running', 'completed', 'failed'));

-- Cold-start scores (little simulation history) are flagged, not hidden.
ALTER TABLE susceptibility_scores
  ADD COLUMN low_data BOOLEAN NOT NULL DEFAULT false;
