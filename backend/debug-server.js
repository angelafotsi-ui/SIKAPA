const express = require('express');
const cors = require('cors');

console.log('[0] Starting server initialization...');

// Initialize Firebase first
const { auth, db } = require('./config/firebase');

console.log('[1] Firebase initialized');

const authRoutes = require('./routes/auth');
const paymentRoutes = require('./routes/payments');
const healthRoutes = require('./routes/health');

const app = express();
const PORT = 5000;

console.log('[2] Loading modules');

app.use(cors());
app.use(express.json());

console.log('[3] Middleware added');

// Mount routes
app.use('/api/auth', authRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api', healthRoutes);

console.log('[4] Routes mounted');

const server = app.listen(PORT, () => {
  console.log(`[5] Server listening on port ${PORT}`);
});

console.log('[6] Listen called');

// Keep process alive
process.stdin.resume();

console.log('[7] Stdin resumed - ready');
