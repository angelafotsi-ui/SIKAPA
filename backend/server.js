require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fileUpload = require('express-fileupload');

console.log('[0] Starting unified Sikapa server...\n');

// Initialize Firebase first
const { auth, db } = require('./config/firebase');

const app = express();
const PORT = process.env.PORT || 3000;

console.log('[1] Firebase initialized');

// Middleware - Enhanced CORS configuration
app.use(cors({
  origin: function(origin, callback) {
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:5000',
      'http://127.0.0.1:3000',
      'http://127.0.0.1:5000'
    ];
    
    // Allow requests with no origin (mobile apps, Postman, curl requests)
    if (!origin) {
      return callback(null, true);
    }
    
    if (allowedOrigins.includes(origin) || process.env.CORS_ORIGIN === '*') {
      callback(null, true);
    } else {
      console.log('[CORS] Blocked request from origin:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  optionsSuccessStatus: 200
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(fileUpload({
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  useTempFiles: true,
  tempFileDir: path.join(__dirname, '../temp'),
  parseNested: true,
  safeFileNames: true,
  preserveExtension: true
}));

// Middleware to extract multipart/form-data fields and add them to req.body
app.use((req, res, next) => {
  if (req.method === 'POST' && req.headers['content-type']?.includes('multipart/form-data')) {
    // Log all available properties
    console.log('[FormData Parser] Content-Type:', req.headers['content-type']);
    console.log('[FormData Parser] req.body keys:', Object.keys(req.body));
    console.log('[FormData Parser] req.body:', req.body);
    console.log('[FormData Parser] req.fields:', req.fields);
    
    // Merge any fields from express-fileupload into req.body
    if (req.fields) {
      req.body = { ...req.body, ...req.fields };
      console.log('[FormData Parser] Merged fields, new req.body:', req.body);
    }
  }
  next();
});

console.log('[2] Middleware configured');

// API Routes
const healthRoutes = require('./routes/health');
const authRoutes = require('./routes/auth');
const paymentRoutes = require('./routes/payments');
const debugRoutes = require('./routes/debug');
const cashoutRoutes = require('./routes/cashout');
const withdrawRoutes = require('./routes/withdraw');
const adminRoutes = require('./routes/admin');
const transactionRoutes = require('./routes/transactions');
const balanceRoutes = require('./routes/balance');

app.use('/api/auth', authRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/debug', debugRoutes);
app.use('/api/cashout', cashoutRoutes);
app.use('/api/withdraw', withdrawRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/balance', balanceRoutes);
app.use('/api', healthRoutes);

console.log('[3] API routes mounted');

// Serve static files from uploads directory
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Serve static files from parent directory (SIKAPA folder)
app.use(express.static(path.join(__dirname, '..')));

console.log('[4] Static files configured');

// Serve auth.html for root path (authentication gateway)
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'auth.html'));
});

console.log('[5] Routes configured');

// Handle 404 for API routes
app.use('/api/', (req, res) => {
  res.status(404).json({
    success: false,
    message: `API endpoint not found: ${req.method} ${req.path}`,
    method: req.method,
    path: req.path
  });
});

// Start server
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n✅ Sikapa Unified Server running on http://localhost:${PORT}`);
  console.log(`\n📍 Available at:`);
  console.log(`   🏠 Landing page: http://localhost:${PORT}`);
  console.log(`   📝 Sign Up: http://localhost:${PORT}/signup.html`);
  console.log(`   🔐 Log In: http://localhost:${PORT}/login.html`);
  console.log(`   💳 Checkout: http://localhost:${PORT}/payments/checkout.html`);
  console.log(`   🏥 Health: http://localhost:${PORT}/api/health`);
  console.log(`\n🔌 API Base: http://localhost:${PORT}/api\n`);
});

server.on('error', (err) => {
  console.error('[ERROR] Server failed to start:', err.message);
  console.error('[ERROR] Stack:', err.stack);
});

console.log('[6] Server started');

console.log('[7] Ready for connections\n');

// Test route to confirm server is responding  
setTimeout(() => {
  console.log('[TEST] Server is accepting connections');
  
  // Also verify port is actually listening
  const net = require('net');
  const socket = new net.Socket();
  socket.setTimeout(2000);
  socket.on('error', (err) => {
    console.error('[TEST] Cannot connect to localhost:3000 -', err.message);
  });
  socket.on('connect', () => {
    console.log('[TEST] ✓ Server successfully bound to port 3000');
    socket.destroy();
  });
  socket.connect(PORT, '127.0.0.1');
}, 500);
