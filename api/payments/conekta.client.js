import {
  CONEKTA_PRIVATE_KEY,
  CONEKTA_API_VERSION,
  CONEKTA_API_BASE,
  CONEKTA_SUCCESS_URL,
  CONEKTA_FAILURE_URL,
  isConektaConfigured,
} from '../../config/conektaConfig.js';

const authHeader = () => `Basic ${Buffer.from(`${CONEKTA_PRIVATE_KEY}:`).toString('base64')}`;

// NOT verified against Conekta's live API — written from their published
// Orders / Hosted Checkout docs without a sandbox key to test against.
// Everything Conekta-shaped is isolated here on purpose: if the field
// names below don't match their current API once there's a real key to
// test with, this is the only file that should need fixing.
export const createHostedCheckoutOrder = async ({ client, amountMXN, reference }) => {
  if (!isConektaConfigured()) {
    throw new Error('Conekta is not configured yet (missing CONEKTA_PRIVATE_KEY in .env)');
  }

  const response = await fetch(`${CONEKTA_API_BASE}/orders`, {
    method: 'POST',
    headers: {
      Authorization: authHeader(),
      Accept: `application/vnd.conekta-v${CONEKTA_API_VERSION}+json`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      currency: 'MXN',
      customer_info: {
        name: client.contactName,
        email: client.contactEmail,
        phone: client.phoneNumber || undefined,
      },
      line_items: [
        {
          name: `Recarga de saldo Enova — ${reference}`,
          unit_price: Math.round(amountMXN * 100), // Conekta amounts are in centavos
          quantity: 1,
        },
      ],
      checkout: {
        type: 'HostedPayment',
        success_url: CONEKTA_SUCCESS_URL,
        failure_url: CONEKTA_FAILURE_URL,
      },
    }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(`Conekta order creation failed: ${data?.details?.[0]?.message || data?.message || response.statusText}`);
  }

  const checkoutUrl = data.checkout?.url;
  if (!checkoutUrl) {
    throw new Error('Conekta responded without a checkout URL — the response shape may not match what this code expects, check the raw response body');
  }

  return { orderId: data.id, checkoutUrl };
};
