import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';
import 'firebase/compat/firestore';

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDBoN1zja2soS5miM40a1sigJ9i9OwfgGc",
  authDomain: "packmind-568eb.firebaseapp.com",
  projectId: "packmind-568eb",
  storageBucket: "packmind-568eb.firebasestorage.app",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "1:850172508224:ios:d9cb7cb5b1c49318cd47a5",
};

// Initialize Firebase
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
  
  // Configure Firestore
  const db = firebase.firestore();
  
  // Set cache size to minimum
  db.settings({
    cacheSizeBytes: 1048576  // 1MB minimum
  });
  
  console.log("Firebase initialized successfully");
  
  // Enable anonymous authentication for testing
  firebase.auth().onAuthStateChanged((user) => {
    console.log("Auth state changed:", user ? "User logged in" : "No user");
  });
}

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

export default firebase; 