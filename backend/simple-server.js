const express = require('express');
const cors = require('cors');
const path = require('path');
const fileUpload = require('express-fileupload');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(fileUpload({
    limits: { fileSize: 50 * 1024 * 1024 }, // 50MB max file size
    useTempFiles: true,
    tempFileDir: path.join(__dirname, '../temp/')
}));

// Serve static files from parent directory
app.use(express.static(path.join(__dirname, '..')));

// Import routes
try {
  const authRoutes = require('./routes/auth');
  const paymentRoutes = require('./routes/payments');
  const withdrawRoutes = require('./routes/withdraw');
  const cashoutRoutes = require('./routes/cashout');
  const adminRoutes = require('./routes/admin');
  const healthRoutes = require('./routes/health');

  // Use routes
  app.use('/api/auth', authRoutes);
  app.use('/api/payments', paymentRoutes);
  app.use('/api/withdraw', withdrawRoutes);
  app.use('/api/cashout', cashoutRoutes);
  app.use('/api/admin', adminRoutes);
  app.use('/api/health', healthRoutes);
} catch (e) {
  console.error('Error loading routes:', e.message);
}

// Root endpoint - serve index.html
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'index.html'));
});

// Fallback 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not found',
    message: `${req.method} ${req.path} not found`
  });
});

console.log('Starting server...');
const server = app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});

console.log('Server started');

// Prevent Node from exiting
setInterval(() => {}, 1000);
