import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';
import 'firebase/compat/firestore';
import 'firebase/compat/database';
import 'firebase/compat/storage';
import { Platform } from 'react-native';

// Your web app's Firebase configuration
// Replace with your own Firebase config details
const firebaseConfig = {
  apiKey: "AIzaSyDBoN1zja2soS5miM40a1sigJ9i9OwfgGc",
  authDomain: "packmind-568eb.firebaseapp.com",
  projectId: "packmind-568eb",
  storageBucket: "packmind-568eb.firebasestorage.app",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "1:850172508224:ios:d9cb7cb5b1c49318cd47a5",
  // databaseURL: "https://packmind-568eb.firebaseio.com",
};

// Initialize Firebase if not already initialized
console.log('Checking Firebase initialization status...');
if (!firebase.apps.length) {
  console.log('Initializing Firebase app...');
  firebase.initializeApp(firebaseConfig);
  
  // Configure Firestore
  console.log('Initializing Firestore...');
  const db = firebase.firestore();
  
  // Set cache size to minimum
  db.settings({
    cacheSizeBytes: 1048576  // 1MB minimum
  });
  
  console.log('Firebase initialized successfully');
}

// Get services
const auth = firebase.auth();
const firestore = firebase.firestore();
const database = firebase.database();
const storage = firebase.storage();

// Export initialized services
export { auth, firestore, database, storage };
export default firebase;