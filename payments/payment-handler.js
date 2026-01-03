// Payment Handler Module
// Handles payment processing through Stripe

class PaymentHandler {
  constructor() {
    this.stripe = null;
    this.elements = null;
    this.cardElement = null;
  }

  // Initialize Stripe (you'll need to add your Stripe public key)
  initializeStripe(stripePublicKey) {
    this.stripe = Stripe(stripePublicKey);
    this.elements = this.stripe.elements();
    this.cardElement = this.elements.create('card');
  }

  // Mount card element to the DOM
  mountCardElement(elementId) {
    if (this.cardElement) {
      this.cardElement.mount(`#${elementId}`);
    }
  }

  // Process payment with Stripe using client secret from backend
  async processStripePaymentWithSecret(clientSecret, email, name) {
    if (!this.stripe) {
      console.error('Stripe not initialized');
      return;
    }

    try {
      const result = await this.stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card: this.cardElement,
          billing_details: {
            email: email,
            name: name
          }
        }
      });

      if (result.error) {
        console.error('Payment failed:', result.error.message);
        return { success: false, error: result.error.message };
      } else {
        console.log('Payment successful:', result.paymentIntent);
        return { success: true, paymentIntent: result.paymentIntent };
      }
    } catch (error) {
      console.error('Error processing payment:', error);
      return { success: false, error: error.message };
    }
  }

  // Handle real-time card validation
  setupCardValidation() {
    if (this.cardElement) {
      this.cardElement.addEventListener('change', (event) => {
        const displayError = document.getElementById('card-errors');
        if (event.error) {
          displayError.textContent = event.error.message;
          displayError.style.color = '#fa755a';
        } else {
          displayError.textContent = '';
        }
      });
    }
  }

  // Dispose of Stripe elements
  dispose() {
    if (this.cardElement) {
      this.cardElement.unmount();
    }
  }
}

// Export for use in other modules
export { PaymentHandler };
