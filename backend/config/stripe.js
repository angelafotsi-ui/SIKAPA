// Stripe Configuration
const stripeKey = process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder';
const stripe = require('stripe')(stripeKey);

if (!process.env.STRIPE_SECRET_KEY) {
  console.warn('⚠ STRIPE_SECRET_KEY not set in .env - using placeholder');
}

module.exports = stripe;
