import { initializeApp } from 'firebase/app';
import { initializeAuth, getReactNativePersistence } from 'firebase/auth';
import { getFirestore, enableIndexedDbPersistence, setLogLevel } from 'firebase/firestore';
import { getDatabase } from 'firebase/database';
import { getStorage } from 'firebase/storage';
import AsyncStorage from '@react-native-async-storage/async-storage';

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

// Initialize Firebase
console.log('Initializing Firebase app...');
const app = initializeApp(firebaseConfig);

// Initialize Firebase services with AsyncStorage persistence
console.log('Initializing Firebase Auth...');
const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage)
});

// Enable Firestore debug logging
if (__DEV__) {
  setLogLevel('debug');
  console.log('Firestore debug logging enabled');
}

console.log('Initializing Firestore...');
const firestore = getFirestore(app);

// Enable offline persistence if possible
try {
  console.log('Attempting to enable Firestore offline persistence...');
  enableIndexedDbPersistence(firestore)
    .then(() => {
      console.log('Firestore offline persistence enabled');
    })
    .catch((err) => {
      console.error('Error enabling Firestore offline persistence:', err.code, err.message);
      if (err.code === 'failed-precondition') {
        // Multiple tabs open, persistence can only be enabled in one tab at a time
        console.warn('Multiple tabs open, persistence only enabled in one tab');
      } else if (err.code === 'unimplemented') {
        // The current browser does not support all of the features required
        console.warn('Current environment does not support persistence');
      }
    });
} catch (error) {
  console.error('Exception when enabling persistence:', error);
}

console.log('Initializing Realtime Database and Storage...');
const database = getDatabase(app);
const storage = getStorage(app);

// Export initialized services
export { auth, firestore, database, storage };