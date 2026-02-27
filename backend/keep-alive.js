/**
 * Keep-Alive Bot for SIKAPA
 * Pings the server every 5 minutes to prevent Render from spinning down
 * Run this in the background or as a separate service
 */

const http = require('http');
const https = require('https');

// Get the app URL from environment or use default
const APP_URL = process.env.RENDER_EXTERNAL_URL || process.env.APP_URL || 'http://localhost:3000';
const PING_INTERVAL = 5 * 60 * 1000; // 5 minutes

console.log(`[Keep-Alive] Starting keep-alive bot for: ${APP_URL}`);
console.log(`[Keep-Alive] Will ping every ${PING_INTERVAL / 1000} seconds`);

/**
 * Ping the server to keep it active
 */
function pingServer() {
    const isHttps = APP_URL.startsWith('https');
    const client = isHttps ? https : http;
    
    const req = client.get(APP_URL, (res) => {
        const timestamp = new Date().toISOString();
        console.log(`[Keep-Alive] ${timestamp} - Ping successful (Status: ${res.statusCode})`);
    });

    req.on('error', (error) => {
        const timestamp = new Date().toISOString();
        console.error(`[Keep-Alive] ${timestamp} - Ping failed:`, error.message);
    });

    req.setTimeout(10000, () => {
        req.destroy();
        console.error(`[Keep-Alive] ${new Date().toISOString()} - Ping timeout`);
    });
}

// Initial ping
pingServer();

// Set up interval to ping every 5 minutes
setInterval(() => {
    pingServer();
}, PING_INTERVAL);

console.log(`[Keep-Alive] Bot is now running and will keep the server active 24/7`);
