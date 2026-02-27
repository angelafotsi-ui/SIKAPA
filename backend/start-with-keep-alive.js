#!/usr/bin/env node

/**
 * Start Server with Keep-Alive Bot
 * This starts both the Express server and the keep-alive bot simultaneously
 */

const { spawn } = require('child_process');
const path = require('path');

console.log('[Startup] Starting SIKAPA server with keep-alive bot...\n');

// Start the main server
console.log('[Startup] Launching Express server...');
const server = spawn('node', ['server.js'], {
    cwd: __dirname,
    stdio: 'inherit',
    detached: false
});

// Wait a moment for server to start, then start the keep-alive bot
setTimeout(() => {
    console.log('[Startup] Launching keep-alive bot...');
    const keepAlive = spawn('node', ['keep-alive.js'], {
        cwd: __dirname,
        stdio: 'inherit',
        detached: false
    });

    // Handle keep-alive bot errors
    keepAlive.on('error', (error) => {
        console.error('[Startup] Failed to start keep-alive bot:', error);
    });

    keepAlive.on('exit', (code) => {
        console.warn('[Startup] Keep-alive bot stopped with code:', code);
    });
}, 2000); // 2 second delay for server to initialize

// Handle server errors
server.on('error', (error) => {
    console.error('[Startup] Failed to start server:', error);
    process.exit(1);
});

server.on('exit', (code) => {
    console.log('[Startup] Server stopped with code:', code);
    process.exit(code);
});

// Handle process termination
process.on('SIGINT', () => {
    console.log('\n[Startup] Shutting down gracefully...');
    server.kill();
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('\n[Startup] Shutting down gracefully...');
    server.kill();
    process.exit(0);
});
