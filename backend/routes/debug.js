const express = require('express');
const router = express.Router();

/**
 * Debug endpoint to check Firebase status
 */
router.get('/firebase-status', (req, res) => {
  try {
    const { auth } = require('../config/firebase');
    
    const status = {
      firebase_loaded: !!auth,
      auth_type: typeof auth,
      auth_methods: auth ? Object.getOwnPropertyNames(Object.getPrototypeOf(auth)).slice(0, 10) : [],
      has_createUser: auth && typeof auth.createUser === 'function',
      timestamp: new Date().toISOString()
    };
    
    console.log('[Debug] Firebase Status:', status);
    res.json(status);
  } catch (error) {
    console.error('[Debug] Error checking Firebase:', error.message);
    res.status(500).json({
      error: error.message,
      stack: error.stack
    });
  }
});

module.exports = router;
