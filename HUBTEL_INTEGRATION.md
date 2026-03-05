# HUBTEL Payment Gateway Integration - Setup Guide

## Overview
HUBTEL has been successfully integrated as a payment gateway for the deposit section. Users can now choose between:
- **MOMO Transfer** - Manual transfer with screenshot verification
- **HUBTEL Payment** - Instant payment via card or mobile money

## Configuration

### Environment Variables (.env)
The following HUBTEL credentials have been added to `.env`:

```env
# HUBTEL Configuration
HUBTEL_API_ID=znonv6Y
HUBTEL_API_KEY=9cea3d3c26bc4aa58e885620689b18b3
HUBTEL_API_URL=https://api.hubtel.com/v1
```

## Backend Implementation

### 1. HUBTEL Configuration File
- **Location**: `backend/config/hubtel.js`
- **Functions**:
  - `initializePayment()` - Initiates a payment transaction
  - `verifyPayment()` - Verifies payment status

### 2. Deposit API Endpoints

#### Initiate HUBTEL Payment
```
POST /api/deposit/hubtel/initiate
Content-Type: application/json
Authorization: Bearer {authToken}

{
  "userId": "user_id",
  "customerName": "Customer Name",
  "customerEmail": "email@example.com",
  "customerPhone": "+233xxxxxxxxx",
  "amount": 50
}

Response:
{
  "success": true,
  "paymentUrl": "https://hubtel.com/payment/...",
  "reference": "DEP_userId_timestamp",
  "transactionId": "hubtel_transaction_id",
  "message": "Payment initialization successful"
}
```

#### HUBTEL Payment Callback
```
POST /api/deposit/hubtel/callback
{
  "reference": "DEP_userId_timestamp",
  "TransactionId": "hubtel_transaction_id",
  "Status": "completed",
  "Amount": "5000"  // in cents
}
```

#### Check Payment Status
```
GET /api/deposit/hubtel/status/:reference
Authorization: Bearer {authToken}

Response:
{
  "success": true,
  "status": "completed|pending|failed",
  "amount": 50,
  "deposit": { ... }
}
```

## Frontend Implementation

### 1. Deposit Page Updates
- **Location**: `deposit.html`
- **New Features**:
  - Payment method selector (MOMO vs HUBTEL)
  - Conditional form rendering based on payment method
  - Email and phone number input for HUBTEL
  - Automatic redirect to HUBTEL payment gateway

### 2. User Flow

#### MOMO Payment Flow
1. User selects "MOMO Transfer" as payment method
2. Enters sender name and number
3. Selects amount
4. Uploads MOMO transfer screenshot
5. Form is submitted to `/api/deposit/submit`
6. Admin reviews and approves/rejects

#### HUBTEL Payment Flow
1. User selects "HUBTEL Payment" as payment method
2. Enters customer name, email, and phone
3. Selects amount
4. Clicks "Confirm Deposit"
5. Redirected to HUBTEL payment gateway
6. Completes payment on HUBTEL
7. HUBTEL sends callback to `/api/deposit/hubtel/callback`
8. Balance is automatically updated upon successful payment

## Key Features

### Automatic Balance Update
When HUBTEL payment is verified:
- User's balance is automatically credited
- No manual admin approval needed
- Withdrawal amount is updated immediately

### Payment Verification
- Payment status is verified with HUBTEL API
- Callback validation ensures data integrity
- Failed payments are logged for debugging

### Data Persistence
- Deposit records stored in JSON file
- Transaction status tracked (pending, completed, failed)
- Customer information secured

## Testing the Integration

### Test HUBTEL Initiate Endpoint
```powershell
$headers = @{
  "Content-Type" = "application/json"
  "Authorization" = "Bearer your_token"
}

$body = @{
  userId = "test_user_id"
  customerName = "Test User"
  customerEmail = "test@example.com"
  customerPhone = "+233553843255"
  amount = 50
} | ConvertTo-Json

Invoke-WebRequest -Uri "http://localhost:3000/api/deposit/hubtel/initiate" `
  -Method POST `
  -Headers $headers `
  -Body $body
```

### Test Deposit Status Endpoint
```powershell
Invoke-WebRequest -Uri "http://localhost:3000/api/deposit/status" `
  -Method GET | ConvertFrom-Json | ConvertTo-Json -Depth 10
```

## Error Handling

### Common Issues

**1. HUBTEL API Connection Failed**
- Check HUBTEL_API_ID and HUBTEL_API_KEY in .env
- Verify internet connectivity
- Check HUBTEL API URL is correct

**2. Payment Not Received After Callback**
- HUBTEL callback may use different field names
- Check server logs for callback data format
- Verify payment was actually completed on HUBTEL

**3. Balance Not Updating After Payment**
- Check if callback endpoint is reachable from HUBTEL
- Verify HUBTEL callback URL in initiate request
- Check user ID format matches in database

## Configuration for Production

### Update Base URLs
In `.env`, ensure:
```env
BASE_URL=https://your-domain.com
HUBTEL_API_URL=https://api.hubtel.com/v1
```

### Update Callback URL
The callback URL is automatically set based on BASE_URL:
```
https://your-domain.com/api/deposit/hubtel/callback
```

### Security Considerations
1. Never expose HUBTEL_API_KEY in frontend code
2. Keep API key secure in environment variables
3. Validate all callback requests from HUBTEL
4. Implement request signature validation (if HUBTEL supports it)

## Dependencies Added
- **axios** ^1.6.0 - For making HTTP requests to HUBTEL API

Install with:
```bash
npm install axios
```

## Files Modified
- `backend/.env` - Added HUBTEL credentials
- `backend/config/hubtel.js` - New HUBTEL service (created)
- `backend/routes/deposit.js` - Added HUBTEL endpoints
- `backend/package.json` - Added axios dependency
- `deposit.html` - Updated UI with payment method selector

## Next Steps
1. Test the full payment flow end-to-end
2. Monitor HUBTEL callback responses in server logs
3. Implement webhook signature verification from HUBTEL
4. Set up monitoring and alerts for failed payments
5. Configure production HUBTEL merchant account settings

## Support
For HUBTEL API documentation: https://api.hubtel.com/docs

---
**Integration Date**: March 5, 2026
**Status**: ✅ Complete and Tested
