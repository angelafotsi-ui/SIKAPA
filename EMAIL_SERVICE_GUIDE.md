# Email Service Setup - SIKAPA

## Overview

Complete email functionality has been integrated into SIKAPA using Gmail SMTP and Nodemailer. The system automatically sends welcome emails to new users upon signup and provides APIs for sending various email types.

## What Was Installed & Created

### New Files:
1. **`backend/config/email.js`** - Gmail SMTP configuration
2. **`backend/services/emailService.js`** - Email templates and sending logic
3. **`backend/routes/email.js`** - Email API endpoints
4. **`test-email.html`** - Interactive email testing interface
5. **`.env` updates** - Gmail credentials added

### Modified Files:
1. **`backend/package.json`** - Added nodemailer dependency
2. **`backend/server.js`** - Added email routes
3. **`backend/controllers/authController.js`** - Send welcome email on signup

## Email Templates Included

### 1. Welcome Email
Automatically sent when a user signs up.

**Template:**
- Subject: "Welcome to SIKAPA"
- Content: Welcome message with account details and quick start guide
- Sender: sikapaghana96@gmail.com

### 2. Payment Confirmation Email
Sent when a payment is processed.

**Fields:**
- Amount
- Reference Number
- Transaction Date

### 3. Password Reset Email
For password recovery (template included, endpoint can be created).

**Fields:**
- Reset Link
- Expiration Time (1 hour)

## Email API Endpoints

### 1. Send Welcome Email
**POST** `/api/email/welcome`

```json
{
  "email": "user@example.com",
  "name": "John Doe"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Welcome email sent",
  "messageId": "..."
}
```

### 2. Send Payment Confirmation
**POST** `/api/email/payment`

```json
{
  "email": "user@example.com",
  "amount": "₵ 100.00",
  "reference": "TXN-123456"
}
```

### 3. Send Custom Email
**POST** `/api/email/send`

```json
{
  "to": "user@example.com",
  "subject": "Your Subject",
  "html": "<h1>Your HTML Content</h1>"
}
```

### 4. Test Email (Debug)
**POST** `/api/email/test`

```json
{
  "email": "test@example.com",
  "name": "Test User"
}
```

## Testing Emails

### Method 1: Using Test Page (Recommended)
1. Start the server:
   ```bash
   cd backend
   npm start
   ```

2. Open browser: `http://localhost:3000/test-email.html`

3. Fill in the form with:
   - Email: Your test email address
   - Name: Test name (for welcome email)

4. Click "Send Email"

5. Check your inbox for the welcome email ✅

### Method 2: Using cURL
```bash
# Send test email
curl -X POST http://localhost:3000/api/email/test \
  -H "Content-Type: application/json" \
  -d '{
    "email": "your-email@example.com",
    "name": "Test User"
  }'

# Send welcome email
curl -X POST http://localhost:3000/api/email/welcome \
  -H "Content-Type: application/json" \
  -d '{
    "email": "your-email@example.com",
    "name": "John Doe"
  }'

# Send payment confirmation
curl -X POST http://localhost:3000/api/email/payment \
  -H "Content-Type: application/json" \
  -d '{
    "email": "your-email@example.com",
    "amount": "₵ 100.00",
    "reference": "TXN-123456"
  }'
```

### Method 3: JavaScript/Fetch
```javascript
// Send welcome email
const response = await fetch('/api/email/welcome', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    email: 'user@example.com',
    name: 'John Doe'
  })
});

const data = await response.json();
console.log(data);
```

## Gmail Configuration

### Gmail Account
- **Email:** sikapaghana96@gmail.com
- **Password:** (Stored in `.env` as `GMAIL_PASSWORD`)
- **App Password:** Bulletman123@

### Environment Variables
Add to `.env`:
```env
GMAIL_USER=sikapaghana96@gmail.com
GMAIL_PASSWORD=Bulletman123@
```

### Important: Gmail App Password

Google doesn't allow ordinary passwords for SMTP access for security reasons. The password used is an **App-Specific Password**.

**If you need to create a new app password:**
1. Go to [Google Account Security](https://myaccount.google.com/security)
2. Enable "2-Step Verification" if not already enabled
3. Go to "App passwords"
4. Select "Mail" and "Windows Computer"
5. Google will generate a 16-character password
6. Use this password in `.env` file

## Integration with Signup

When a user signs up via `/api/auth/signup`, a welcome email is automatically sent:

1. User submits signup form with email, password, and name
2. User account is created in Firebase
3. Welcome email is sent asynchronously (doesn't block signup)
4. Success response is returned to user

**Example Flow:**
```javascript
// Frontend signup
await auth.createUserWithEmailAndPassword(email, password);
// ↓
// Backend creates user in Firebase
// ↓
// Backend sends welcome email automatically
// ↓
// User receives email in inbox
```

## Email Features

✅ **HTML Email Templates** - Beautiful branded emails
✅ **Async Sending** - Doesn't block user requests
✅ **Error Handling** - Fails gracefully, logs errors
✅ **Multiple Templates** - Welcome, Payment, Custom
✅ **Logging** - All email actions logged to console
✅ **Customizable** - Easy to modify templates

## Customizing Templates

Edit `backend/services/emailService.js` to customize email templates:

```javascript
// Example: Change welcome email message
const emailTemplates = {
  welcome: (userName, userEmail) => ({
    subject: 'Welcome to SIKAPA',
    html: `
      <h1>Welcome ${userName}!</h1>
      <p>Your custom message here...</p>
    `
  })
}
```

## Troubleshooting

### Emails not sending?

1. **Check Gmail credentials** in `.env`
   ```bash
   # Verify Gmail password
   echo $env:GMAIL_PASSWORD  # PowerShell
   echo $GMAIL_PASSWORD      # Bash
   ```

2. **Check server logs** for email errors
   ```
   [Email] Gmail SMTP connection is ready
   [Email] Welcome email sent to user@example.com
   ```

3. **Test with test-email.html** page
   - Open `http://localhost:3000/test-email.html`
   - Try sending a test email
   - Check browser console for errors

4. **Check Gmail security settings**
   - Gmail might block "less secure apps"
   - Ensure App Password is being used (not regular password)
   - Check Gmail account for security alerts

5. **Check firewall**
   - Email sending requires outgoing port 587 (Gmail SMTP)
   - Verify network/firewall allows this

### "Gmail SMTP connection failed"

This could mean:
- Gmail credentials are wrong (in `.env`)
- Network issue (firewall blocking)
- Gmail has a security issue (check account)

**Solution:**
1. Re-check `.env` file for typos
2. Try sending from a different network
3. Visit [Gmail Security](https://myaccount.google.com/security) to check for alerts
4. Check if 2FA is enabled and using correct app password

### Email sent but not received?

1. Check spam/junk folder
2. Verify recipient email address is correct
3. Check Gmail account for "Sent" folder (message should appear there)
4. Wait a few minutes (email delivery can take time)

## Production Deployment

### For Render Deployment:

1. Add environment variables to Render:
   ```
   GMAIL_USER=sikapaghana96@gmail.com
   GMAIL_PASSWORD=Bulletman123@
   ```

2. Redeploy your application:
   - Go to Render dashboard
   - Click your service
   - Click "Manual Deploy"
   - Wait for deployment

3. Test emails in production:
   - Access `https://your-app.onrender.com/test-email.html`
   - Send a test email
   - Verify receipt

## Additional Notes

- **Email Rate Limiting:** Gmail free tier: ~500 emails/day
- **Batch Sending:** For mass emails, use a bulk email service
- **Templates:** All templates are HTML and fully customizable
- **Logging:** All email activities are logged for debugging

## Next Steps

1. ✅ Test emails locally
2. ✅ Deploy to Render
3. ✅ Monitor email sending in production
4. Consider adding more email templates as needed
5. Set up email template for password reset
6. Add email notifications for other events (withdrawals, tier claims, etc.)

## Support

If you encounter issues:
1. Check server logs for error messages
2. Test with the test-email.html page
3. Verify `.env` has correct Gmail credentials
4. Check Gmail account security settings
5. Verify network allows port 587 (SMTP)

---

**Gmail email service is now live on SIKAPA! 🚀📧**
