const express = require('express');
const path = require('path');

const app = express();
const PORT = 3000;

// Serve static files from the parent directory (SIKAPA folder)
app.use(express.static(path.join(__dirname, '..')));

// Serve index.html by default
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`🌐 Website running at http://localhost:${PORT}`);
  console.log(`📄 Landing page: http://localhost:${PORT}`);
  console.log(`💳 Checkout page: http://localhost:${PORT}/payments/checkout.html`);
  console.log(`✅ API test: http://localhost:${PORT}/test-api.html`);
});
