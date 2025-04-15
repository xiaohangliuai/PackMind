import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';
import 'firebase/compat/firestore';
import 'firebase/compat/functions';

// Import modular version for v9 API
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDBoN1zja2soS5miM40a1sigJ9i9OwfgGc",
  authDomain: "packmind-568eb.firebaseapp.com",
  projectId: "packmind-568eb",
  storageBucket: "packmind-568eb.firebasestorage.app",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "1:850172508224:ios:d9cb7cb5b1c49318cd47a5",
};

// Initialize Firebase (compat version)
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
  
  // Configure Firestore
  const firestoreCompat = firebase.firestore();
  
  // Set cache size to minimum with merge option
  firestoreCompat.settings({
    cacheSizeBytes: 1048576,  // 1MB minimum
    merge: true
  });
  
  console.log("Firebase compat initialized successfully");
  
  // Enable Apple Sign In provider
  try {
    const appleProvider = new firebase.auth.OAuthProvider('apple.com');
    appleProvider.addScope('email');
    appleProvider.addScope('name');
    
    console.log("Apple Sign In provider configured successfully");
  } catch (error) {
    console.error("Error configuring Apple Sign In provider:", error);
  }
  
  // Enable anonymous authentication for testing
  firebase.auth().onAuthStateChanged((user) => {
    console.log("Auth state changed:", user ? "User logged in" : "No user");
  });
}

// Initialize Firebase (modular v9 version)
const firebaseApp = initializeApp(firebaseConfig);
const db = getFirestore(firebaseApp);
const functions = getFunctions(firebaseApp);

// Helper for anonymous sign in (for testing)
export const signInAnonymously = async () => {
  try {
    const result = await firebase.auth().signInAnonymously();
    console.log("Anonymous login successful:", result.user.uid);
    return result.user;
  } catch (error) {
    console.error("Anonymous login failed:", error.message);
    throw error;
  }
};

// Helper for checking email verification via Cloud Function
export const checkEmailVerificationForAction = async () => {
  try {
    const checkEmailVerification = httpsCallable(functions, 'checkEmailVerification');
    const result = await checkEmailVerification();
    return result.data;
  } catch (error) {
    console.error("Error checking email verification:", error);
    throw error;
  }
};

// Helper for resending verification email via Cloud Function
export const resendVerificationEmail = async (email) => {
  try {
    const resendVerificationEmailFn = httpsCallable(functions, 'resendVerificationEmail');
    const result = await resendVerificationEmailFn({ email });
    return result.data;
  } catch (error) {
    console.error("Error resending verification email:", error);
    throw error;
  }
};

// Export both the compat and modular versions
export { db, functions };
export default firebase; 