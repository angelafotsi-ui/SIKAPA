// Firebase Admin Configuration
const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');

console.log('[Firebase] Starting initialization...');

// Initialize Firebase Admin with service account key
const serviceAccountPath = path.join(__dirname, '../backendserviceAccountKey.json');

let serviceAccount;

// Check if we should use Base64 encoded key from environment
if (process.env.FIREBASE_PRIVATE_KEY_BASE64 && process.env.FIREBASE_PROJECT_ID) {
  console.log('[Firebase] Using Base64 encoded private key from environment');
  try {
    const privateKeyDecoded = Buffer.from(process.env.FIREBASE_PRIVATE_KEY_BASE64, 'base64').toString('utf8');
    serviceAccount = {
      type: 'service_account',
      project_id: process.env.FIREBASE_PROJECT_ID,
      private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID || 'key-id',
      private_key: privateKeyDecoded,
      client_email: process.env.FIREBASE_CLIENT_EMAIL,
      client_id: process.env.FIREBASE_CLIENT_ID || 'client-id',
      auth_uri: 'https://accounts.google.com/o/oauth2/auth',
      token_uri: 'https://oauth2.googleapis.com/token',
      auth_provider_x509_cert_url: 'https://www.googleapis.com/oauth2/v1/certs',
      client_x509_cert_url: `https://www.googleapis.com/robot/v1/metadata/x509/${process.env.FIREBASE_CLIENT_EMAIL}`
    };
    console.log('✓ Service account created from Base64 encoded key');
    console.log('[Firebase] Service account project_id:', serviceAccount.project_id);
  } catch (err) {
    console.error('❌ Failed to decode Base64 key:', err.message);
    process.exit(1);
  }
} else if (fs.existsSync(serviceAccountPath)) {
  console.log('[Firebase] Using service account key file');
  if (!fs.existsSync(serviceAccountPath)) {
    console.error('❌ Service account key file not found at:', serviceAccountPath);
    console.error('Current directory:', process.cwd());
    process.exit(1);
  }

  try {
    serviceAccount = require(serviceAccountPath);
    console.log('✓ Service account loaded from:', serviceAccountPath);
    console.log('[Firebase] Service account project_id:', serviceAccount.project_id);
  } catch (err) {
    console.error('❌ Failed to load service account:', err.message);
    process.exit(1);
  }
} else {
  console.error('❌ No Firebase credentials found (no Base64 key in env and no service account file)');
  process.exit(1);
}

try {
  // Check if Firebase is already initialized
  const apps = admin.apps;
  if (apps.length === 0) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      databaseURL: 'https://sikapa-13065.firebaseio.com',
      projectId: 'sikapa-13065'
    });
    console.log('✓ Firebase App initialized');
  } else {
    console.log('✓ Firebase App already initialized');
  }
} catch (error) {
  console.error('❌ Firebase initialization error:', error.message);
  process.exit(1);
}

let db, auth;
try {
  db = admin.firestore();
  auth = admin.auth();
  
  if (!auth) {
    throw new Error('Firebase Auth service is undefined');
  }
  
  console.log('✓ Firebase services loaded (Firestore + Auth)');
  console.log('[Firebase] Auth service initialized:', typeof auth);
  console.log('[Firebase] Auth service methods available:', typeof auth.createUser === 'function' ? 'YES' : 'NO');
} catch (error) {
  console.error('❌ Error loading Firebase services:', error.message);
  throw error;
}

module.exports = { admin, db, auth };
