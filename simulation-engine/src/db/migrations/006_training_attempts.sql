-- Training honesty: a failed quiz is recorded as failed, every attempt is
-- logged, and wrong taps/picks during lessons are counted.

ALTER TABLE training_assignments DROP CONSTRAINT IF EXISTS training_assignments_status_check;
ALTER TABLE training_assignments
  ADD CONSTRAINT training_assignments_status_check
  CHECK (status IN ('assigned', 'in_progress', 'completed', 'failed', 'overdue'));

-- lesson_misses: wrong taps in spot lessons, wrong picks in choice lessons and
-- flags left unfound after "Show me". quiz_served: the questions (bank indexes
-- and option order) drawn for the attempt in progress; NULL between attempts.
ALTER TABLE training_assignments
  ADD COLUMN IF NOT EXISTS lesson_misses INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS quiz_served JSONB;

CREATE TABLE IF NOT EXISTS training_quiz_attempts (
  id SERIAL PRIMARY KEY,
  assignment_id INTEGER NOT NULL REFERENCES training_assignments (id) ON DELETE CASCADE,
  questions INTEGER[] NOT NULL,
  answers JSONB,
  wrong INTEGER NOT NULL,
  score NUMERIC(5, 4) NOT NULL,
  passed BOOLEAN NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_quiz_attempts_assignment ON training_quiz_attempts (assignment_id);
