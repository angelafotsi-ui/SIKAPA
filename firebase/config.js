// Firebase Configuration
// Replace these values with your Firebase project credentials from the Firebase Console

const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID",
  measurementId: "YOUR_MEASUREMENT_ID"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Initialize Firebase Analytics (optional)
const analytics = firebase.analytics();

// Initialize Firebase Authentication
const auth = firebase.auth();

// Initialize Firestore Database
const db = firebase.firestore();

// Export for use in other modules
export { auth, db, analytics };
