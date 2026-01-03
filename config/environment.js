// Environment Configuration File
// Store your API keys and configuration here (keep sensitive data secure)

const ENVIRONMENT = {
  // Firebase Configuration
  FIREBASE: {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_PROJECT_ID.appspot.com",
    messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
    appId: "YOUR_APP_ID"
  },

  // Stripe Configuration
  STRIPE: {
    publicKey: "pk_test_YOUR_STRIPE_PUBLIC_KEY",
    // Private key should NEVER be exposed in frontend code
    // Use backend API endpoints instead
  },

  // PayPal Configuration (if using PayPal)
  PAYPAL: {
    clientId: "YOUR_PAYPAL_CLIENT_ID",
    currency: "USD"
  },

  // API Endpoints
  API: {
    baseUrl: "https://your-api-domain.com/api",
    paymentEndpoint: "/create-payment-intent",
    verifyPaymentEndpoint: "/verify-payment"
  },

  // Application Settings
  APP: {
    name: "Sikapa",
    version: "1.0.0",
    environment: "development" // Change to 'production' for production
  }
};

export default ENVIRONMENT;
