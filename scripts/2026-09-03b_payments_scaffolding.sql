-- Techdemo payment scaffolding: lets a survey pay its respondents and
-- charges its creating client, both tracked in a simple ledger table.
-- See Enova-backend/api/payments/ and the "Sistema de Pagos" section in
-- docs/thunderclient-filtro-preliminar-y-perfilacion.txt.
--
-- Same rules as the other manual SQL script in this folder: no migration
-- runner in this project, run this once by hand, idempotent (safe to re-run).

ALTER TABLE surveys ADD COLUMN IF NOT EXISTS reward_per_response FLOAT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS credit_balance FLOAT DEFAULT 0;

CREATE TABLE IF NOT EXISTS payment_transactions (
  id SERIAL PRIMARY KEY,
  kind VARCHAR(255) NOT NULL,
  direction VARCHAR(255) NOT NULL,
  amount FLOAT NOT NULL,
  currency VARCHAR(10) NOT NULL DEFAULT 'MXN',
  user_id INTEGER REFERENCES accounts_db(id),
  client_id INTEGER REFERENCES clients(id),
  survey_id INTEGER REFERENCES surveys(id),
  status VARCHAR(50) NOT NULL DEFAULT 'recorded',
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payment_transactions_user_id ON payment_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_client_id ON payment_transactions(client_id);
