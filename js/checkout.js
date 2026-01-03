// Checkout Page Script
let paymentHandler = null;

document.addEventListener('DOMContentLoaded', () => {
  // Initialize payment handler
  paymentHandler = new PaymentHandler();

  // Initialize Stripe with your public key
  // Replace with your actual Stripe public key
  const stripePublicKey = 'pk_test_YOUR_STRIPE_PUBLIC_KEY';
  paymentHandler.initializeStripe(stripePublicKey);
  paymentHandler.mountCardElement('card-element');
  paymentHandler.setupCardValidation();

  // Handle form submission
  const form = document.getElementById('payment-form');
  form.addEventListener('submit', handlePaymentSubmit);
});

async function handlePaymentSubmit(event) {
  event.preventDefault();

  const email = document.getElementById('email').value;
  const name = document.getElementById('name').value;
  const amount = 99.00;
  const submitButton = document.getElementById('submit-button');
  const statusDiv = document.getElementById('payment-status');

  // Disable submit button during processing
  submitButton.disabled = true;
  submitButton.textContent = 'Processing...';

  try {
    // Create payment intent via backend
    const intentResponse = await fetch(`${API_BASE_URL}/payments/create-intent`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: amount,
        email: email,
        name: name
      })
    });

    const intentData = await intentResponse.json();

    if (!intentData.success) {
      throw new Error(intentData.message || 'Failed to create payment intent');
    }

    // Process payment with Stripe
    const result = await paymentHandler.processStripePaymentWithSecret(
      intentData.clientSecret,
      email,
      name
    );

    if (result.success) {
      statusDiv.innerHTML = '<div class="success-message">✓ Payment successful! Thank you for your purchase.</div>';
      statusDiv.style.color = '#4caf50';

      // Verify payment with backend
      const verifyResponse = await fetch(`${API_BASE_URL}/payments/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          paymentIntentId: result.paymentIntent.id
        })
      });

      const verifyData = await verifyResponse.json();
      console.log('Payment verified:', verifyData);

      // Redirect after 2 seconds
      setTimeout(() => {
        window.location.href = '/success.html';
      }, 2000);
    } else {
      statusDiv.innerHTML = `<div class="error-message">✗ ${result.error}</div>`;
      statusDiv.style.color = '#fa755a';
      submitButton.disabled = false;
// API Base URL
const API_BASE_URL = window.location.hostname === 'localhost' 
  ? 'http://localhost:3000/api'
  : 'https://sikapa-bwxu.onrender.com/api';     amount: amount,
      paymentIntentId: paymentIntent.id,
      status: paymentIntent.status,
      timestamp: new Date(),
      currency: 'usd'
    });

    console.log('Payment saved to Firebase');
  } catch (error) {
    console.error('Error saving payment to Firebase:', error);
  }
}
