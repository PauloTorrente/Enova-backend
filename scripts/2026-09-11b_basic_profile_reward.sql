-- "Completa tu registro y vas a ganar X" — one-time reward paid the
-- instant a respondent's basic profile (phone + gender) is complete.
-- See api/payments/payments.service.js#payBasicProfileCompletionReward.
-- Idempotent, safe to re-run.

ALTER TABLE accounts_db ADD COLUMN IF NOT EXISTS basic_profile_reward_paid BOOLEAN DEFAULT false;
