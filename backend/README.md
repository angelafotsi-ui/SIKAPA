# Backend Setup Guide

## Installation

1. Install dependencies:
```bash
cd backend
npm install
```

2. Create a `.env` file with your credentials (see Backend Configuration section)

3. Download Firebase Service Account Key:
   - Go to Firebase Console → Project Settings → Service Accounts
   - Click "Generate New Private Key"
   - Save the JSON file to the backend folder
   - Update the path in `config/firebase.js`

## Configuration

### Backend .env Variables

```
NODE_ENV=development
PORT=5000
CORS_ORIGIN=http://localhost:3000

STRIPE_PUBLIC_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

FIREBASE_PROJECT_ID=your-project
FIREBASE_PRIVATE_KEY=your-private-key
FIREBASE_CLIENT_EMAIL=your-service-account@...
FIREBASE_DATABASE_URL=https://...
```

## Running the Server

### Development (with auto-reload):
```bash
npm run dev
```

### Production:
```bash
npm start
```

The server will run on `http://localhost:5000`

## API Endpoints

### Health Check
- **GET** `/api/health` - Check if API is running

### Payments
- **POST** `/api/payments/create-intent` - Create Stripe Payment Intent
  - Body: `{ amount, email, name, metadata }`
  - Returns: `{ clientSecret, paymentIntentId }`

- **POST** `/api/payments/verify` - Verify payment
  - Body: `{ paymentIntentId }`
  - Returns: `{ status, message }`

- **GET** `/api/payments/history/:email` - Get user payment history
  - Returns: `{ payments: [] }`

- **POST** `/api/payments/webhook` - Stripe webhook handler
  - Handles payment events from Stripe

## Folder Structure

```
backend/
├── server.js                    # Main server file
├── package.json                 # Dependencies
├── .env                        # Environment variables
│
├── config/
│   ├── firebase.js             # Firebase Admin setup
│   └── stripe.js               # Stripe configuration
│
├── routes/
│   ├── payments.js             # Payment routes
│   └── health.js               # Health check routes
│
├── controllers/
│   └── paymentController.js    # Payment logic
│
└── middleware/
    └── validation.js           # Request validation
```

## Security Notes

⚠️ **Important:**
- Never commit `.env` file
- Keep Firebase service account key private
- Use HTTPS in production
- Validate all requests on backend
- Store webhook secrets securely
- Enable Firebase security rules
- Use proper CORS configuration

## Testing

### Test Payment Intent Creation:
```bash
curl -X POST http://localhost:5000/api/payments/create-intent \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 99.99,
    "email": "test@example.com",
    "name": "Test User"
  }'
```

### Test Health Endpoint:
```bash
curl http://localhost:5000/api/health
```

## Stripe Test Cards

- **Success:** 4242 4242 4242 4242
- **Decline:** 4000 0000 0000 0002
- **3D Secure:** 4000 0025 0000 3155

Exp: Any future date | CVC: Any 3 digits

## Next Steps

1. Update `.env` with actual credentials
2. Download Firebase service account key
3. Set up Stripe webhook endpoint
4. Connect frontend to backend API
5. Test payment flow
6. Deploy to production
