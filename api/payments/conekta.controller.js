import Client from '../client/client.model.js';
import PaymentTransaction from './payments.model.js';
import { createHostedCheckoutOrder } from './conekta.client.js';
import { isConektaConfigured } from '../../config/conektaConfig.js';

// POST /api/payments/client/topup — the client picks an amount, we open a
// Conekta hosted-checkout order for it and hand back the URL to redirect
// them to. No card data ever touches this backend — Conekta's page
// handles that. The balance is NOT credited here; it's only credited once
// the webhook below confirms the payment actually went through.
export const createTopupCheckout = async (req, res) => {
  const { amountMXN } = req.body;

  if (!isConektaConfigured()) {
    return res.status(503).json({ success: false, message: 'Conekta is not configured yet (missing CONEKTA_PRIVATE_KEY).' });
  }
  if (!amountMXN || typeof amountMXN !== 'number' || amountMXN <= 0) {
    return res.status(400).json({ success: false, message: 'amountMXN must be a positive number' });
  }

  try {
    const client = await Client.findByPk(req.client.id);
    if (!client) return res.status(404).json({ success: false, message: 'Client not found' });

    const { orderId, checkoutUrl } = await createHostedCheckoutOrder({
      client,
      amountMXN,
      reference: `client-${client.id}-${Date.now()}`,
    });

    await PaymentTransaction.create({
      kind: 'credit_topup',
      direction: 'credit',
      amount: amountMXN,
      currency: 'MXN',
      clientId: client.id,
      status: 'pending',
      conektaOrderId: orderId,
    });

    res.status(201).json({ success: true, checkoutUrl, orderId });
  } catch (error) {
    console.error(`[conekta] createTopupCheckout failed (clientId=${req.client?.id}):`, error.message);
    res.status(502).json({ success: false, message: error.message });
  }
};

// POST /api/payments/conekta/webhook/:secret — Conekta calls this when an
// order's status changes. Verification here is a shared secret in the
// URL path (checked against CONEKTA_WEBHOOK_SECRET), not Conekta's own
// request-signing scheme — that wasn't implemented because it couldn't be
// tested without a live webhook to inspect. Tighten this to their actual
// signature check before relying on it for real money.
export const handleConektaWebhook = async (req, res) => {
  const { secret } = req.params;
  const expectedSecret = process.env.CONEKTA_WEBHOOK_SECRET;

  if (!expectedSecret || secret !== expectedSecret) {
    return res.status(403).json({ message: 'Invalid webhook secret' });
  }

  const event = req.body;
  const order = event?.data?.object;

  // Ack anything that isn't the event we care about — that's the expected
  // webhook contract (Conekta shouldn't keep retrying events we ignore on purpose).
  if (event?.type !== 'order.paid' || !order?.id) {
    return res.status(200).json({ received: true });
  }

  try {
    const transaction = await PaymentTransaction.findOne({
      where: { conektaOrderId: order.id, status: 'pending' },
    });
    // Already processed (webhook retry) or an order we didn't create — ack either way.
    if (!transaction) return res.status(200).json({ received: true });

    const client = await Client.findByPk(transaction.clientId);
    if (client) {
      await client.update({ creditBalance: (client.creditBalance || 0) + transaction.amount });
    }
    await transaction.update({ status: 'paid' });

    res.status(200).json({ received: true });
  } catch (error) {
    console.error('[conekta] webhook processing failed:', error.message);
    // Non-2xx tells Conekta to retry — appropriate here since we didn't
    // actually finish crediting the client.
    res.status(500).json({ received: false });
  }
};
