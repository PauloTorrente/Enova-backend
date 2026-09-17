-- Conekta hosted-checkout top-up flow — see api/payments/conekta.*.js.
-- Adds the column the webhook uses to find which pending transaction a
-- Conekta order id belongs to. Idempotent, safe to re-run.

ALTER TABLE payment_transactions ADD COLUMN IF NOT EXISTS conekta_order_id VARCHAR(255);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_conekta_order_id ON payment_transactions(conekta_order_id);
