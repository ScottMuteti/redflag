-- Phishing-report triage: a status workflow so admins can work through real
-- threats employees report (simulation matches are auto-credited, not triaged).
ALTER TABLE phishing_reports
  ADD COLUMN IF NOT EXISTS status VARCHAR(12) NOT NULL DEFAULT 'new'
    CHECK (status IN ('new', 'reviewed', 'resolved')),
  ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS reviewed_by INTEGER;

CREATE INDEX IF NOT EXISTS idx_reports_status ON phishing_reports (organization_id, status);
