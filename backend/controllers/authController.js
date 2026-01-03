let { auth } = require('../config/firebase');

/**
 * Sign up user
 */
exports.signup = async (req, res, next) => {
  try {
    // Re-require auth in case it wasn't initialized
    if (!auth) {
      auth = require('../config/firebase').auth;
    }
    
    if (!auth) {
      console.error('[Signup] CRITICAL: Firebase auth is undefined');
      return res.status(500).json({
        success: false,
        message: 'Firebase authentication service not initialized. Server error.'
      });
    }

    const { email, password, name } = req.body;

    console.log('[Signup] Received signup request:', { email, name });

    if (!email || !password || !name) {
      return res.status(400).json({
        success: false,
        message: 'Email, password, and name are required'
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters'
      });
    }

    // Create user with Firebase Auth
    const userRecord = await auth.createUser({
      email: email,
      password: password,
      displayName: name
    });

    console.log('[Signup] User created successfully:', userRecord.uid);

    // Create custom token for immediate login
    const customToken = await auth.createCustomToken(userRecord.uid);

    res.json({
      success: true,
      message: 'User created successfully',
      uid: userRecord.uid,
      email: userRecord.email,
      displayName: name,
      customToken: customToken
    });
  } catch (error) {
    console.error('[Signup] Error:', error.message);
    console.error('[Signup] Error code:', error.code);
    console.error('[Signup] Full error:', JSON.stringify(error, null, 2));
    
    let message = error.message;
    if (error.code === 'auth/email-already-exists') {
      message = 'Email already registered';
    } else if (error.code === 'auth/invalid-email') {
      message = 'Invalid email address';
    } else if (error.code === 'auth/weak-password') {
      message = 'Password is too weak';
    } else if (error.message && error.message.includes('configuration')) {
      message = 'Firebase not properly configured. Check server logs.';
    }

    res.status(400).json({
      success: false,
      message: message,
      error: error.code || error.message
    });
  }
};

/**
 * Login user (return custom token)
 */
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    console.log('[Login] Received login request:', { email });

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required'
      });
    }

    // Verify user exists in Firebase
    let userRecord;
    try {
      userRecord = await auth.getUserByEmail(email);
      console.log('[Login] User found:', userRecord.uid);
    } catch (error) {
      console.log('[Login] User not found:', email);
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // For admin login, verify password is correct (hardcoded for now)
    // In production, use Firebase REST API with proper API key
    const ADMIN_EMAIL = 'fotsiemmanuel397@gmail.com';
    const ADMIN_PASSWORD = 'Bulletman1234567890@';
    
    if (email === ADMIN_EMAIL) {
      if (password !== ADMIN_PASSWORD) {
        console.log('[Login] Invalid admin password');
        return res.status(401).json({
          success: false,
          message: 'Invalid email or password'
        });
      }
    }

    // Create custom token for the user
    const customToken = await auth.createCustomToken(userRecord.uid);

    console.log('[Login] Login successful for:', email);

    res.json({
      success: true,
      message: 'Login successful',
      uid: userRecord.uid,
      email: userRecord.email,
      displayName: userRecord.displayName,
      token: customToken
    });
  } catch (error) {
    console.error('[Login] Error:', error);
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Get user by UID
 */
exports.getUser = async (req, res, next) => {
  try {
    const { uid } = req.params;

    if (!uid) {
      return res.status(400).json({
        error: true,
        message: 'UID is required'
      });
    }

    const userRecord = await auth.getUser(uid);

    res.json({
      success: true,
      user: {
        uid: userRecord.uid,
        email: userRecord.email,
        displayName: userRecord.displayName,
        createdAt: userRecord.metadata.creationTime
      }
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(404).json({
      error: true,
      message: 'User not found'
    });
  }
};

/**
 * Logout (client-side operation, but we can provide endpoint for clearing tokens)
 */
exports.logout = (req, res) => {
  res.json({
    success: true,
    message: 'Logged out successfully',
    note: 'Clear token on client side'
  });
};
