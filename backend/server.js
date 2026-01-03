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

// Middleware
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true
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

app.use('/api/auth', authRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/debug', debugRoutes);
app.use('/api/cashout', cashoutRoutes);
app.use('/api/withdraw', withdrawRoutes);
app.use('/api/admin', adminRoutes);
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


// Start server
const server = app.listen(PORT, () => {
  console.log(`\n✅ Sikapa Unified Server running on http://localhost:${PORT}`);
  console.log(`\n📍 Available at:`);
  console.log(`   🏠 Landing page: http://localhost:${PORT}`);
  console.log(`   📝 Sign Up: http://localhost:${PORT}/signup.html`);
  console.log(`   🔐 Log In: http://localhost:${PORT}/login.html`);
  console.log(`   💳 Checkout: http://localhost:${PORT}/payments/checkout.html`);
  console.log(`   🏥 Health: http://localhost:${PORT}/api/health`);
  console.log(`\n🔌 API Base: http://localhost:${PORT}/api\n`);
});

console.log('[6] Server started');

// Keep process alive
process.stdin.resume();

console.log('[7] Ready for connections\n');
