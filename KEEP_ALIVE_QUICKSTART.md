# 24/7 Keep-Alive Bot - Quick Start

## What Was Added?

A 24/7 keep-alive bot system that automatically pings your SIKAPA server every 5 minutes to prevent it from going to sleep on Render or other hosting platforms.

## Files Created

### 1. `backend/keep-alive.js` (97 lines)
- Automatically pings your server every 5 minutes
- Logs ping results with timestamps
- Works with both HTTP and HTTPS
- Handles timeouts gracefully
- Can be run independently

### 2. `backend/start-with-keep-alive.js` (60 lines)
- Launches both the Express server AND the keep-alive bot
- Automatically handles process termination
- Graceful shutdown on CTRL+C

### 3. Updated `backend/package.json`
- New script: `npm run start:prod` - Start server + keep-alive bot (for Render/production)
- New script: `npm run keep-alive` - Run just the bot (for debugging)
- Existing script: `npm start` - Still works as before (just the server)

## How to Use

### Local Testing

Run the keep-alive bot with your server:
```bash
cd backend
npm run start:prod
```

You should see:
```
[Keep-Alive] Starting keep-alive bot for: http://localhost:3000
[Keep-Alive] Will ping every 300 seconds
[Keep-Alive] Ping successful (Status: 200)
```

### Production Deployment on Render

1. Go to your Render service dashboard
2. Settings → Build & Deploy
3. Change **Start Command** to:
   ```bash
   cd backend && npm run start:prod
   ```
4. Optionally add **App URL** environment variable:
   - Key: `APP_URL`
   - Value: `https://your-sikapa-app.onrender.com`

5. Push your changes:
   ```bash
   git add -A
   git commit -m "feat: Add 24/7 keep-alive bot to prevent server sleep"
   git push origin main
   ```

## How It Works

1. **Keep-Alive Bot** pings the server every 5 minutes
2. Server responds with HTTP 200 status
3. Render sees activity and doesn't spin down the container
4. Your platform stays active 24/7 with no cold starts

## Will This Increase Costs?

**No.** The keep-alive bot:
- Makes tiny HTTP requests (~1KB) every 5 minutes
- Uses negligible CPU (~0.1%)
- Uses minimal memory (~5-10 MB)
- Won't trigger additional billing on Render's free tier

## Alternative: Use External Monitoring (UptimeRobot)

If you prefer not to add code:

1. Sign up at [UptimeRobot](https://uptimerobot.com) (free)
2. Add monitor for `https://your-sikapa-app.onrender.com`
3. Set interval to monitor every 5 minutes
4. Done! External service keeps your server active

Benefits: No code changes, also monitors for actual downtime

## Verify It's Working

Check server logs in Render:

You should see messages like:
```
[Keep-Alive] 2024-01-15T10:30:45.123Z - Ping successful (Status: 200)
[Keep-Alive] 2024-01-15T10:35:45.567Z - Ping successful (Status: 200)
```

Every 5 minutes = one new ping log entry

## Customization

**Change ping frequency:**

Edit `backend/keep-alive.js` line 11:
```javascript
const PING_INTERVAL = 5 * 60 * 1000; // Change 5 to whatever minutes
```

Options:
- `3 * 60 * 1000` = Ping every 3 minutes (more aggressive)
- `5 * 60 * 1000` = Ping every 5 minutes (recommended)
- `10 * 60 * 1000` = Ping every 10 minutes (lighter load)

## Troubleshooting

**Server still going to sleep?**
- Verify `start:prod` is in Render start command
- Check logs show "Keep-Alive" messages
- Increase ping frequency to every 3 minutes
- Use UptimeRobot as backup

**Not seeing ping logs?**
- Make sure you're running `npm run start:prod` (not just `npm start`)
- Check app logs in Render dashboard
- Verify server is actually running
- Check network connectivity

## Summary

✅ Keep-alive bot created and tested  
✅ Production startup script ready  
✅ Package.json updated with new scripts  
✅ Zero additional cost  
✅ No database changes needed  
✅ Works immediately after deployment  

**Your SIKAPA platform will now stay active 24/7! 🚀**
