# Keep-Alive Bot Setup Guide

## Overview

The keep-alive bot automatically pings your SIKAPA server every 5 minutes to prevent it from going to sleep on Render or other hosting platforms. This ensures your platform stays active 24/7 without cold start delays.

## How It Works

1. **keep-alive.js** - A simple HTTP client that pings your server every 5 minutes
2. **start-with-keep-alive.js** - Launches both the Express server and the keep-alive bot simultaneously
3. Updates to **package.json** - New npm scripts to run the server with the bot

## Local Development

### Option 1: Run Server Only (Development)
```bash
cd backend
npm start
```

### Option 2: Run Server with Keep-Alive Bot (Local Testing)
```bash
cd backend
npm run keep-alive  # In one terminal
npm start           # In another terminal
```

Or start both simultaneously:
```bash
cd backend
npm run start:prod
```

### Option 3: Run Just the Keep-Alive Bot
```bash
cd backend
npm run keep-alive
```

## Production Deployment on Render

### Step 1: Update Your Render Start Command

1. Go to your Render service dashboard
2. Navigate to **Settings** → **Build & Deploy**
3. Update the **Start Command** to:
   ```bash
   cd backend && npm run start:prod
   ```

### Step 2: Set Environment Variable (Optional)

If your app URL is different from localhost, set the environment variable:

1. Go to **Settings** → **Environment**
2. Add a new variable:
   - **Key**: `APP_URL`
   - **Value**: `https://your-sikapa-app.onrender.com` (your actual Render URL)

Or the bot will automatically use `RENDER_EXTERNAL_URL` if available.

### Step 3: Deploy

Push your changes to trigger a new deployment:
```bash
git add -A
git commit -m "feat: Add 24/7 keep-alive bot to prevent server sleep"
git push origin main
```

## How to Verify It's Working

### Check Server Logs

Once deployed, you should see logs like:
```
[Keep-Alive] Starting keep-alive bot for: https://your-app.onrender.com
[Keep-Alive] Will ping every 300 seconds
[Keep-Alive] 2024-01-15T10:30:45.123Z - Ping successful (Status: 200)
[Keep-Alive] 2024-01-15T10:35:45.567Z - Ping successful (Status: 200)
```

### Manual Test

```bash
# Test the bot locally
curl http://localhost:3000
```

## Alternative: UptimeRobot (Free External Service)

If you prefer an external solution that doesn't require code changes:

### Steps:

1. **Sign Up**: Create a free account at [uptimerobot.com](https://uptimerobot.com)

2. **Add Monitor**:
   - Click "Add New Monitor"
   - **Monitor Type**: HTTP(s)
   - **Friendly Name**: SIKAPA Server Keep-Alive
   - **URL to Monitor**: `https://your-sikapa-app.onrender.com`
   - **Monitoring Interval**: Every 5 minutes

3. **Configure Alert** (Optional):
   - Add email notifications if server goes down
   - Set up webhook for integrations

4. **Done!** UptimeRobot will ping your server every 5 minutes, keeping it active

**Pros of UptimeRobot:**
- No code changes needed
- External monitoring (detects real outages)
- Free tier: 50 monitors
- Nice dashboard and status page
- Email alerts

**Pros of Built-in Bot:**
- No external dependency
- Logs within your app
- Lighter weight
- Complete control

## File Changes Summary

### New Files Created:
- `backend/keep-alive.js` - The keep-alive bot script
- `backend/start-with-keep-alive.js` - Startup launcher for both server and bot

### Modified Files:
- `backend/package.json` - Added two new npm scripts:
  - `npm run start:prod` - Start server with keep-alive bot
  - `npm run keep-alive` - Run just the keep-alive bot

## Customization

### Change Ping Interval

Edit `backend/keep-alive.js`:
```javascript
const PING_INTERVAL = 5 * 60 * 1000; // 5 minutes - change this number
```

Options:
- `3 * 60 * 1000` = 3 minutes
- `5 * 60 * 1000` = 5 minutes (recommended)
- `10 * 60 * 1000` = 10 minutes

### Change Server URL

The bot automatically detects the URL from environment variables:
1. `RENDER_EXTERNAL_URL` (set automatically by Render)
2. `APP_URL` (set manually if needed)
3. `http://localhost:3000` (default for local testing)

## Troubleshooting

### Bot Not Pinging?

1. Check the server is running
2. Verify the APP_URL environment variable is set correctly
3. Check server logs for error messages
4. Ensure firewall allows outgoing HTTP requests

### Server Still Going to Sleep?

- Increase ping frequency by reducing `PING_INTERVAL`
- Use UptimeRobot as a backup
- Check Render subscription level (higher tiers have longer active times)

### Memory Usage?

The keep-alive bot uses minimal resources:
- RAM: ~5-10 MB
- CPU: Negligible (brief HTTP request every 5 minutes)
- Network: ~1KB per ping request

## Monitoring

You can create a simple dashboard to monitor keep-alive activity:

```bash
# View last 20 lines of logs (shows recent pings)
tail -20 server.log

# Filter for keep-alive logs
cat server.log | grep "Keep-Alive"

# Count successful pings in last hour
cat server.log | grep "Ping successful" | wc -l
```

## Production Checklist

Before deploying to production:

- [ ] Test locally with `npm run start:prod`
- [ ] Verify logs show "Keep-Alive" bot starting
- [ ] Confirm ping intervals in logs (every 300 seconds)
- [ ] Update Render start command to `cd backend && npm run start:prod`
- [ ] Set `APP_URL` environment variable if needed
- [ ] Deploy to Render
- [ ] Monitor logs for 30 minutes to ensure pings are working
- [ ] Test platform functionality works as expected
- [ ] Set up monitoring alerts (email from UptimeRobot)

## Support

If you have issues:

1. Check server logs for error messages
2. Verify app URL is correct
3. Test manual ping: `curl https://your-app.onrender.com`
4. Restart the service from Render dashboard
5. Check that port 3000 is not blocked

---

**Your SIKAPA platform will now stay active 24/7! ✨**
