import { initializeApp } from 'firebase/app';
import { initializeAuth, getReactNativePersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
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
const app = initializeApp(firebaseConfig);

// Initialize Firebase services with AsyncStorage persistence
const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage)
});
const firestore = getFirestore(app);
const database = getDatabase(app);
const storage = getStorage(app);

export { auth, firestore, database, storage };