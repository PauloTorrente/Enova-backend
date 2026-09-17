-- Schema changes for:
--   1. Filtro Preliminar (registration) — new columns on accounts_db
--   2. Perfilación Quirúrgica — new surgical_profiles table
--
-- This project has no migration runner (no sequelize-cli, no sync()) — see
-- Enova-backend/api/users/users.model.js and api/profiling/profiling.model.js
-- for the Sequelize definitions these columns/table must match exactly.
-- Run this once, manually, against the database before deploying the code
-- that references these columns. Every statement is idempotent (IF NOT
-- EXISTS / CREATE TABLE IF NOT EXISTS), so it's safe to re-run.

-- 1) Filtro Preliminar additions to accounts_db
ALTER TABLE accounts_db ADD COLUMN IF NOT EXISTS country VARCHAR(255);
ALTER TABLE accounts_db ADD COLUMN IF NOT EXISTS postal_code VARCHAR(255);
ALTER TABLE accounts_db ADD COLUMN IF NOT EXISTS birth_year INTEGER;
ALTER TABLE accounts_db ADD COLUMN IF NOT EXISTS education_code INTEGER;
ALTER TABLE accounts_db ADD COLUMN IF NOT EXISTS occupation VARCHAR(255);
ALTER TABLE accounts_db ADD COLUMN IF NOT EXISTS has_children BOOLEAN;
ALTER TABLE accounts_db ADD COLUMN IF NOT EXISTS consent_accepted BOOLEAN DEFAULT false;
ALTER TABLE accounts_db ADD COLUMN IF NOT EXISTS consent_date TIMESTAMP;
ALTER TABLE accounts_db ADD COLUMN IF NOT EXISTS consent_version VARCHAR(255);
ALTER TABLE accounts_db ADD COLUMN IF NOT EXISTS whatsapp_verified BOOLEAN DEFAULT false;
ALTER TABLE accounts_db ADD COLUMN IF NOT EXISTS whatsapp_otp_code VARCHAR(255);
ALTER TABLE accounts_db ADD COLUMN IF NOT EXISTS whatsapp_otp_expires TIMESTAMP;

-- 2) Perfilación Quirúrgica
CREATE TABLE IF NOT EXISTS surgical_profiles (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES accounts_db(id),

  sosten_quien VARCHAR(255),
  ocupacion_sosten INTEGER NOT NULL,
  educacion_sosten INTEGER NOT NULL,
  fuente_ingreso INTEGER NOT NULL,
  tenencia VARCHAR(255) NOT NULL,
  banos INTEGER NOT NULL,
  personas INTEGER NOT NULL,
  posesiones JSON,
  cp_zona VARCHAR(255),

  num_hijos VARCHAR(255),
  estado_pareja VARCHAR(255),
  decisor_compras VARCHAR(255),

  categorias JSON,
  canales JSON,
  digital JSON,
  sector VARCHAR(255),

  actitud_compra VARCHAR(255),
  actitud_innovador INTEGER,

  control_atencion VARCHAR(255),
  flag_atencion BOOLEAN DEFAULT false,

  vivienda_score INTEGER NOT NULL,
  graffar INTEGER NOT NULL,
  estrato INTEGER NOT NULL,
  estrato_label VARCHAR(10) NOT NULL,
  indice_posesiones INTEGER NOT NULL,
  banda_objetiva INTEGER NOT NULL,
  banda_objetiva_label VARCHAR(10) NOT NULL,
  flag_revisar BOOLEAN DEFAULT false,
  etiqueta_local VARCHAR(255),
  pais VARCHAR(255),

  raw_answers JSON NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_surgical_profiles_user_id ON surgical_profiles(user_id);
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
