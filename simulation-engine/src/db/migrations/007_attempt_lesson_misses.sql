-- Lesson misses now count toward the training score, so each attempt keeps the
-- misses made in the lessons before it. score is lessons and quiz combined.
ALTER TABLE training_quiz_attempts
  ADD COLUMN IF NOT EXISTS lesson_items INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS lesson_misses INTEGER NOT NULL DEFAULT 0;
