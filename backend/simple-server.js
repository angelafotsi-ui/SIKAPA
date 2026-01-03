const express = require('express');
const cors = require('cors');

const app = express();
const PORT = 5000;

app.use(cors());
app.use(express.json());

app.get('/api/health', (req, res) => {
  console.log('Health endpoint hit');
  res.json({
    status: 'ok',
    message: 'Sikapa API is running',
    timestamp: new Date().toISOString()
  });
});

console.log('Starting server...');
const server = app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});

console.log('Server started');

// Prevent Node from exiting
setInterval(() => {}, 1000);
