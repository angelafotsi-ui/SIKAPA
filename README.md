# Sikapa - Payment Website

A modern fintech website built with Firebase and payment processing capabilities.

## Project Structure

```
SIKAPA/
├── index.html                 # Main landing page
├── css/                       # Stylesheets
│   ├── styles.css            # Main styles
│   └── checkout.css          # Checkout page styles
├── js/                        # JavaScript files
│   ├── script.js             # Main script
│   └── checkout.js           # Checkout logic
├── firebase/                  # Firebase configuration
│   └── config.js             # Firebase setup
├── payments/                  # Payment processing
│   ├── payment-handler.js    # Payment handler class
│   └── checkout.html         # Checkout page
├── config/                    # Configuration files
│   └── environment.js        # Environment variables
├── images/                    # Image assets
└── assets/                    # Other assets

```

## Setup Instructions

### 1. Firebase Setup

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project or select existing one
3. Copy your Firebase config values
4. Update `firebase/config.js` with your credentials:

```javascript
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};
```

### 2. Stripe Setup (for Payment Processing)

1. Go to [Stripe Dashboard](https://dashboard.stripe.com/)
2. Get your Publishable Key (public key)
3. Update `config/environment.js` with your Stripe public key
4. Update `js/checkout.js` with your Stripe public key:

```javascript
const stripePublicKey = 'pk_test_YOUR_STRIPE_PUBLIC_KEY';
```

### 3. Backend Setup (Required for Payments)

You need a backend server to:
- Create Stripe Payment Intents
- Verify payments
- Store payment data securely

Create an endpoint at `/api/create-payment-intent` that handles payment requests.

## Features

✅ Landing page with hero section
✅ Feature showcase
✅ Community and merchant solutions
✅ Waitlist signup
✅ Secure checkout page
✅ Firebase integration
✅ Stripe payment processing
✅ Responsive design
✅ Smooth animations

## Files Overview

### HTML Files
- **index.html** - Main landing page with all sections
- **payments/checkout.html** - Secure payment checkout page

### CSS Files
- **css/styles.css** - Main stylesheet for landing page
- **css/checkout.css** - Checkout page styling

### JavaScript Files
- **js/script.js** - Main page interactivity (scrolling, animations)
- **js/checkout.js** - Checkout form handling and payment processing
- **payments/payment-handler.js** - Stripe payment handling class

### Configuration Files
- **firebase/config.js** - Firebase initialization
- **config/environment.js** - Environment variables and API keys

## Installation

1. Clone or download this project
2. Update Firebase config in `firebase/config.js`
3. Update Stripe keys in `js/checkout.js`
4. Host the files on a web server or Firebase Hosting
5. Set up backend endpoints for payment processing

## Firebase Firestore Database

Set up these collections in Firestore:

### Payments Collection
```
payments/
├── email (string)
├── name (string)
├── amount (number)
├── paymentIntentId (string)
├── status (string)
├── timestamp (timestamp)
└── currency (string)
```

### Users Collection (optional)
```
users/
├── email (string)
├── name (string)
├── createdAt (timestamp)
└── subscription (string)
```

## Security Notes

⚠️ **IMPORTANT:**
- Never expose your Firebase private keys or Stripe secret keys in frontend code
- Always validate payments on your backend
- Use environment variables for sensitive data in production
- Enable Firebase security rules appropriately
- Use HTTPS in production
- Keep dependencies updated

## Testing

### Stripe Test Cards
- **Success:** 4242 4242 4242 4242
- **Decline:** 4000 0000 0000 0002
- Any future expiration date
- Any 3-digit CVC

## Next Steps

1. Set up backend API endpoints
2. Configure Firebase security rules
3. Add email notifications
4. Implement user authentication
5. Add admin dashboard
6. Deploy to production

## Support

For questions about:
- **Firebase:** [Firebase Documentation](https://firebase.google.com/docs)
- **Stripe:** [Stripe Documentation](https://stripe.com/docs)

## License

This project is open source and available under the MIT License.
