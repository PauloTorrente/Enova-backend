-- Perfilación Quirúrgica is now driven by an actual survey response
-- (surveyType: 'surgical_profiling'), not a hand-typed JSON body — see
-- api/profiling/profiling.survey-mapper.js. This needs two new columns:
--
--   results.question_id — so an answer can be traced back to which
--   question it answered by a stable ID, not by matching display text.
--
--   surveys.survey_type — marks a survey as the real Perfilación
--   Quirúrgica (or, later, other special types) vs. a normal survey.
--
-- Same rules as the other scripts in this folder: no migration runner in
-- this project, run once by hand, idempotent (safe to re-run).

ALTER TABLE results ADD COLUMN IF NOT EXISTS question_id VARCHAR(255);
ALTER TABLE surveys ADD COLUMN IF NOT EXISTS survey_type VARCHAR(50) NOT NULL DEFAULT 'standard';
