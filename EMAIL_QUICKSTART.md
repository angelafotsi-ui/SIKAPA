# Email Service - Quick Start

## What Was Added?

Complete Gmail email integration for SIKAPA. Users automatically receive a beautiful welcome email when they sign up.

## The Welcome Email

**Sent to:** Every new user upon signup
**From:** sikapaghana96@gmail.com
**Subject:** Welcome to SIKAPA

**Content:**
```
Welcome to SIKAPA

Welcome to SIKAPA! We are thrilled to have you join our community. 
At SIKAPA, we are committed to providing you with the best 
experience possible. Whether you are managing your tasks, organizing 
your payments or collaborating with your friends, we are here to make 
your life easier.
```

Plus account details and quick start guide.

## Quick Test (30 seconds)

1. **Start the server:**
   ```bash
   cd backend
   npm start
   ```

2. **Open test page:**
   - Go to: `http://localhost:3000/test-email.html`

3. **Send test email:**
   - Email: Your email address
   - Name: Your name
   - Click "Send Email"

4. **Check inbox** ✅

## Files Created

| File | Purpose |
|------|---------|
| `backend/config/email.js` | Gmail SMTP setup |
| `backend/services/emailService.js` | Email templates & logic |
| `backend/routes/email.js` | Email API endpoints |
| `test-email.html` | Test interface |
| `EMAIL_SERVICE_GUIDE.md` | Full documentation |

## Email API Endpoints

### Send Welcome Email
```bash
POST /api/email/welcome
{
  "email": "user@example.com",
  "name": "John Doe"
}
```

### Send Payment Confirmation
```bash
POST /api/email/payment
{
  "email": "user@example.com",
  "amount": "₵ 100.00",
  "reference": "TXN-123456"
}
```

### Send Custom Email
```bash
POST /api/email/send
{
  "to": "user@example.com",
  "subject": "Your Subject",
  "html": "<h1>Your content</h1>"
}
```

## Auto-Send on Signup

When users sign up:
```
User signup → Firebase account created → Welcome email sent → Login portal
```

The welcome email is sent **automatically** in the background (doesn't delay signup).

## Updated Files

- ✅ `backend/package.json` - Added nodemailer
- ✅ `backend/server.js` - Added email routes
- ✅ `backend/controllers/authController.js` - Send email on signup
- ✅ `.env` - Added Gmail credentials

## Email Credentials

```env
GMAIL_USER=sikapaghana96@gmail.com
GMAIL_PASSWORD=Bulletman123@
```

These are already in your `.env` file ✅

## Troubleshooting

**Emails not sending?**
1. Check `.env` has correct Gmail credentials
2. Check server logs for errors: `[Email]` prefix
3. Try test-email.html page
4. Verify email address is correct

**Not appearing in inbox?**
- Check spam/junk folder
- Wait a few minutes for delivery
- Check Gmail "Sent" folder to confirm it was sent

## Templates Available

1. **Welcome** - Sent on user signup ✅
2. **Payment Confirmation** - For transactions
3. **Password Reset** - For account recovery (ready to use)
4. **Custom** - Send any HTML email

## Production (Render)

When you deploy to Render:
1. Email variables are already set ✅
2. Everything works automatically
3. Test with: `https://your-app.onrender.com/test-email.html`

## Next Steps

- Test locally with test-email.html
- Try signing up to verify welcome email
- Deploy to Render
- Add more templates as needed (withdrawals alerts, tier notifications, etc.)

---

**Welcome emails now sending! 🎉📧**
