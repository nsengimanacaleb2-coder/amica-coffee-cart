// Online payment integrations.
//
// STRIPE is fully implemented below — it's the most standardized SDK and works
// the same way regardless of your country, provided Stripe supports it.
//
// PAYPAL / FLUTTERWAVE / MTN MOMO / AIRTEL MONEY are stubbed with the shape
// your route needs to return, plus comments on what each provider requires.
// They differ a lot (sandbox setup, business verification, local currency
// accounts), so wiring them up is intentionally left to you once you have
// accounts with each provider — copy the Stripe pattern below as a guide.

require('dotenv').config();

const stripeEnabled = !!process.env.STRIPE_SECRET_KEY;
const stripe = stripeEnabled ? require('stripe')(process.env.STRIPE_SECRET_KEY) : null;

// Creates a Stripe Checkout session for a given booking and returns the URL to redirect to.
async function createStripeCheckoutSession({ bookingId, amount, description, successUrl, cancelUrl }) {
  if (!stripeEnabled) {
    throw new Error('Stripe is not configured. Add STRIPE_SECRET_KEY to your .env to enable online card payments.');
  }
  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    payment_method_types: ['card'],
    line_items: [
      {
        price_data: {
          currency: 'usd',
          product_data: { name: description || `Amica House booking #${bookingId}` },
          unit_amount: Math.round(Number(amount) * 100), // Stripe expects cents
        },
        quantity: 1,
      },
    ],
    metadata: { booking_id: String(bookingId) },
    success_url: successUrl,
    cancel_url: cancelUrl,
  });
  return session.url;
}

// ---- Stubs: implement these once you have accounts with each provider ----

// PayPal: use the @paypal/checkout-server-sdk package. You'll need a PAYPAL_CLIENT_ID
// and PAYPAL_CLIENT_SECRET from a PayPal Developer app, then create an Order and
// return its `approve` link the same way createStripeCheckoutSession returns a URL.
async function createPaypalOrder(/* { bookingId, amount } */) {
  throw new Error('PayPal is not wired up yet. Add PAYPAL_CLIENT_ID/SECRET and implement this using @paypal/checkout-server-sdk.');
}

// Flutterwave: use the flutterwave-node-v3 package with a FLW_SECRET_KEY from your
// Flutterwave dashboard. Their "Standard" flow returns a hosted payment link, similar
// to Stripe Checkout.
async function createFlutterwavePayment(/* { bookingId, amount, email } */) {
  throw new Error('Flutterwave is not wired up yet. Add FLW_SECRET_KEY and implement this using flutterwave-node-v3.');
}

// MTN Mobile Money: requires a Momo API user via the MTN Momo Developer Portal
// (subscription key + API user/key), then a "request to pay" call that triggers
// a USSD prompt on the customer's phone.
async function requestMtnMomoPayment(/* { bookingId, amount, phone } */) {
  throw new Error('MTN MoMo is not wired up yet. Register at momodeveloper.mtn.com and implement the "request to pay" API here.');
}

// Airtel Money: similar shape to MTN MoMo, via the Airtel Money Developer Portal.
async function requestAirtelMoneyPayment(/* { bookingId, amount, phone } */) {
  throw new Error('Airtel Money is not wired up yet. Register at developers.airtel.africa and implement the collections API here.');
}

module.exports = {
  stripeEnabled,
  createStripeCheckoutSession,
  createPaypalOrder,
  createFlutterwavePayment,
  requestMtnMomoPayment,
  requestAirtelMoneyPayment,
};
