// Firebase Admin Configuration
const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');

console.log('[Firebase] Starting initialization...');

// Initialize Firebase Admin with service account key
const serviceAccountPath = path.join(__dirname, '../backendserviceAccountKey.json');

if (!fs.existsSync(serviceAccountPath)) {
  console.error('❌ Service account key file not found at:', serviceAccountPath);
  console.error('Current directory:', process.cwd());
  process.exit(1);
}

let serviceAccount;
try {
  serviceAccount = require(serviceAccountPath);
  console.log('✓ Service account loaded from:', serviceAccountPath);
  console.log('[Firebase] Service account project_id:', serviceAccount.project_id);
} catch (err) {
  console.error('❌ Failed to load service account:', err.message);
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
